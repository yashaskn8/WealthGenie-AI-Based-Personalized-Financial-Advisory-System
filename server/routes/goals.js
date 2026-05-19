import { Router } from 'express';
import { verifyJWT, isOwner, isValidObjectId } from '../middleware/authMiddleware.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validate, goalSchema } from '../validation/schemas.js';
import Goal from '../models/Goal.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Recommendation from '../models/Recommendation.js';
import { reverseSIP, runMonteCarloWithGoal, getInstrumentVolatility } from '../services/monteCarloEngine.js';
import { chatWithGemini } from '../services/geminiService.js';

const router = Router();

/**
 * Detect stale/error advice that should be regenerated.
 */
const STALE_ADVICE_PATTERNS = [
  'temporarily unavailable',
  'could not process',
  'API key not configured',
];

function isStaleAdvice(advice) {
  if (!advice || typeof advice !== 'string' || advice.trim().length === 0) return true;
  return STALE_ADVICE_PATTERNS.some(p => advice.toLowerCase().includes(p));
}

/**
 * Generate AI advice for a goal. Handles errors gracefully with a fallback.
 */
async function generateGoalAdvice(goal, profile, userMonthlySavings) {
  const now = new Date();
  const yearsRemaining = Math.max(1, Math.round(
    (new Date(goal.target_date) - now) / (365.25 * 24 * 60 * 60 * 1000)
  ));

  const profileContext = {
    age: profile?.age || 30,
    annualIncome: profile?.annualIncome || 600000,
    riskCategory: profile?.riskCategory || 'Moderate',
  };

  const prompt = `User is ${goal.status.replace(/_/g, ' ')} for goal "${goal.goal_name}" `
    + `worth ₹${goal.target_amount.toLocaleString('en-IN')} in ${yearsRemaining} years. `
    + `Required SIP: ₹${(goal.recommended_sip || 0).toLocaleString('en-IN')}/month. `
    + `Their current savings capacity: ₹${(userMonthlySavings || 10000).toLocaleString('en-IN')}/month. `
    + `Suggest one specific actionable financial adjustment in 2 sentences.`;

  try {
    const advice = await chatWithGemini(prompt, profileContext);
    return advice;
  } catch (_) {
    const instrument = (goal.recommended_instrument || 'Equity MF').replace(/_/g, ' ');
    return `To stay on track for your "${goal.goal_name}" goal, maintain a monthly SIP of `
      + `₹${(goal.recommended_sip || 5000).toLocaleString('en-IN')} in ${instrument}.`;
  }
}

/**
 * POST /api/goals/create [Protected]
 * Create a new financial goal with automated SIP computation and Monte Carlo analysis.
 */
router.post('/create', verifyJWT, validate(goalSchema), asyncHandler(async (req, res) => {
  const { goal_name, target_amount, target_date, current_savings, profileId } = req.body;

  // Validate profileId ownership if provided
  let profile = null;
  if (profileId) {
    if (!isValidObjectId(profileId)) {
      throw createError(400, 'Invalid profileId in goal create', 'Invalid profile ID.');
    }
    profile = await FinancialProfile.findById(profileId).lean();
    if (profile && !isOwner(profile, req.user.userId)) {
      throw createError(403, `Unauthorized goal-profile access: ${profileId}`, 'Access denied.');
    }
  }

  // Fall back to latest profile
  if (!profile) {
    profile = await FinancialProfile.findOne({ userId: req.user.userId })
      .sort({ createdAt: -1 }).lean();
  }

  // Calculate years remaining with invariant checks
  const targetDateObj = new Date(target_date);
  const now = new Date();

  // Invariant: target_date must be at least 6 months in the future
  // (shorter horizons produce statistically meaningless Monte Carlo results)
  // IMPORTANT: This check must use the SAME logic as goalSchema's target_date validator
  // (setMonth + 6) to prevent dates that pass schema but fail here, or vice versa.
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  if (targetDateObj < sixMonthsFromNow) {
    throw createError(400,
      `Goal target_date too close: ${target_date} (minimum: ${sixMonthsFromNow.toISOString()})`,
      'Target date must be at least 6 months from today for meaningful projections.'
    );
  }

  // Duplicate goal name check — prevent data confusion
  const existingGoal = await Goal.findOne({
    userId: req.user.userId,
    goal_name: { $regex: new RegExp(`^${goal_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  }).lean();
  if (existingGoal) {
    throw createError(409,
      `Duplicate goal name: "${goal_name}" for user ${req.user.userId}`,
      `A goal named "${goal_name}" already exists. Use a different name.`
    );
  }

  const msRemaining = targetDateObj - now;
  // Use FRACTIONAL years for MC/SIP precision (not Math.round which has ±6 month error).
  // Floor to 0.5 resolution: 7 months → 0.5, 18 months → 1.5, 30 months → 2.5
  const rawYears = msRemaining / (365.25 * 24 * 60 * 60 * 1000);
  const yearsRemaining = Math.max(0.5, Math.floor(rawYears * 2) / 2);

  // Guard: if yearsRemaining is somehow NaN (invalid date), reject
  if (!Number.isFinite(yearsRemaining)) {
    throw createError(400, `Invalid target_date produced NaN years: ${target_date}`, 'Invalid target date.');
  }

  // Find the user's latest recommendation
  const latestRec = await Recommendation.findOne({ userId: req.user.userId })
    .sort({ generatedAt: -1 }).lean();
  const recommendedInstrument = latestRec?.instruments?.[0]?.type || 'Equity_MF';

  // Get volatility params for the recommended instrument
  const vol = getInstrumentVolatility(recommendedInstrument);

  // Compute post-tax adjusted rate if profile is available
  let postTaxRate = vol.mean;
  if (profile) {
    try {
      const { calculatePostTaxReturn } = await import('../services/postTaxCalculator.js');
      const ptResult = calculatePostTaxReturn(
        recommendedInstrument, vol.mean,
        profile.annualIncome || (profile.income * 12),
        yearsRemaining, profile.taxRegime || 'new'
      );
      postTaxRate = ptResult.postTaxReturn;
    } catch (_) {
      // Fallback to pre-tax if post-tax calc fails
    }
  }

  // Compute required monthly SIP using reverse formula with POST-TAX rate
  const rawSIP = reverseSIP(target_amount, postTaxRate, yearsRemaining, current_savings || 0);
  const requiredSIP = Math.max(500, Math.round(Number.isFinite(rawSIP) ? rawSIP : 5000));

  // Run Monte Carlo with the required SIP and POST-TAX rate
  const mcResult = runMonteCarloWithGoal({
    monthlyInvestment: requiredSIP,
    postTaxAnnualReturn: postTaxRate,
    annualVolatility: vol.stdDev,
    years: yearsRemaining,
    simulations: 5000,
    targetAmount: target_amount,
  });

  // ── Self-check invariants on Monte Carlo output ──
  if (mcResult.goal_probability !== null) {
    if (!Number.isFinite(mcResult.goal_probability) || mcResult.goal_probability < 0 || mcResult.goal_probability > 1) {
      console.error(`[Goals INVARIANT] goal_probability out of bounds: ${mcResult.goal_probability}. Clamping.`);
      mcResult.goal_probability = Math.max(0, Math.min(1, mcResult.goal_probability || 0));
    }
  }
  const lastIdx = mcResult.p50.length - 1;
  if (lastIdx >= 0 && mcResult.p10[lastIdx] > mcResult.p90[lastIdx]) {
    console.error('[Goals INVARIANT] p10 > p90 — Monte Carlo band inversion detected.');
  }

  // Determine status using PROBABILITY-BASED classification (more accurate than SIP gap)
  const userMonthlySavings = profile?.savings || 10000;
  const gap = requiredSIP - userMonthlySavings;

  let status;
  const prob = mcResult.goal_probability;
  if (prob !== null && prob !== undefined) {
    // Probability-based: most accurate since it accounts for volatility
    if (prob >= 0.65) status = 'on_track';
    else if (prob >= 0.35) status = 'at_risk';
    else status = 'off_track';
  } else {
    // Fallback to SIP gap analysis
    if (gap <= 0) status = 'on_track';
    else if (gap <= userMonthlySavings * 0.25) status = 'at_risk';
    else status = 'off_track';
  }

  // Generate Gemini advice for this goal
  const goalForAdvice = {
    goal_name,
    target_amount,
    target_date: targetDateObj,
    recommended_sip: requiredSIP,
    recommended_instrument: recommendedInstrument,
    status,
  };
  const geminiAdvice = await generateGoalAdvice(goalForAdvice, profile, userMonthlySavings);

  // Terminal percentiles (lastIdx already computed above)
  // Save goal to MongoDB
  const goal = await Goal.create({
    userId: req.user.userId,
    profileId: profile?._id,
    goal_name,
    target_amount,
    target_date: targetDateObj,
    current_savings: current_savings || 0,
    recommended_sip: requiredSIP,
    recommended_instrument: recommendedInstrument,
    probability_of_success: mcResult.goal_probability,
    gap_amount: Math.max(0, gap),
    status,
    monte_carlo_summary: {
      p10: mcResult.p10[lastIdx],
      p25: mcResult.p25[lastIdx],
      p50: mcResult.p50[lastIdx],
      p75: mcResult.p75[lastIdx],
      p90: mcResult.p90[lastIdx],
      simulations_run: mcResult.simulations_run,
    },
    gemini_advice: geminiAdvice,
  });

  // Build Recharts chart data
  const chartData = mcResult.years_array.map((yr, i) => ({
    year: yr,
    p10: mcResult.p10[i],
    p25: mcResult.p25[i],
    p50: mcResult.p50[i],
    p75: mcResult.p75[i],
    p90: mcResult.p90[i],
  }));

  res.status(201).json({
    goalId: goal._id,
    ...goal.toObject(),
    chartData,
    years_remaining: yearsRemaining,
  });
}));

/**
 * GET /api/goals [Protected]
 * List all goals for the current user.
 * Automatically regenerates AI advice if it contains stale/error text.
 */
router.get('/', verifyJWT, asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user.userId }).sort({ target_date: 1 });

  const goalsArr = goals.map(g => g.toObject());
  const staleGoals = goals.filter(g => isStaleAdvice(g.gemini_advice));

  if (staleGoals.length > 0) {
    // Regenerate advice with a timeout — don't block the response for too long
    const regenerationPromises = staleGoals.map(async (g) => {
      try {
        const profile = await FinancialProfile.findById(g.profileId).lean();
        const userMonthlySavings = profile?.savings || 10000;
        const newAdvice = await generateGoalAdvice(g, profile, userMonthlySavings);

        if (!isStaleAdvice(newAdvice)) {
          await Goal.findByIdAndUpdate(g._id, { gemini_advice: newAdvice });
          // Update the in-memory response array
          const idx = goalsArr.findIndex(go => go._id.toString() === g._id.toString());
          if (idx !== -1) goalsArr[idx].gemini_advice = newAdvice;
        }
      } catch (e) {
        console.warn('[Goals] Advice regeneration failed for', g.goal_name, ':', e.message);
      }
    });

    // Wait up to 8 seconds for regeneration, then respond with whatever we have
    await Promise.race([
      Promise.allSettled(regenerationPromises),
      new Promise(resolve => setTimeout(resolve, 8000)),
    ]);
  }

  res.json({ goals: goalsArr });
}));

/**
 * PATCH /api/goals/:goalId/refresh-advice [Protected]
 * Manually refresh AI advice for a specific goal.
 */
router.patch('/:goalId/refresh-advice', verifyJWT, asyncHandler(async (req, res) => {
  const { goalId } = req.params;

  if (!isValidObjectId(goalId)) {
    throw createError(400, 'Invalid goalId', 'Invalid goal ID.');
  }

  const goal = await Goal.findOne({ _id: goalId, userId: req.user.userId });
  if (!goal) {
    throw createError(404, `Goal not found: ${goalId}`, 'Goal not found.');
  }

  const profile = await FinancialProfile.findById(goal.profileId).lean();
  const userMonthlySavings = profile?.savings || 10000;
  const newAdvice = await generateGoalAdvice(goal, profile, userMonthlySavings);

  goal.gemini_advice = newAdvice;
  await goal.save();

  res.json({ goalId: goal._id, gemini_advice: newAdvice });
}));

/**
 * DELETE /api/goals/:goalId [Protected]
 * Delete a financial goal.
 */
router.delete('/:goalId', verifyJWT, asyncHandler(async (req, res) => {
  const { goalId } = req.params;

  if (!isValidObjectId(goalId)) {
    throw createError(400, 'Invalid goalId', 'Invalid goal ID.');
  }

  const goal = await Goal.findOneAndDelete({ _id: goalId, userId: req.user.userId });
  if (!goal) {
    throw createError(404, `Goal not found for delete: ${goalId}`, 'Goal not found.');
  }

  res.json({ deleted: true, goalId });
}));

export default router;
