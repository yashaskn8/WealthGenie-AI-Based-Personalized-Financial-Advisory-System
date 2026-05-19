import { Router } from 'express';
import { verifyJWT, isOwner, isValidObjectId } from '../middleware/authMiddleware.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validate, recommendSchema } from '../validation/schemas.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Recommendation from '../models/Recommendation.js';
import { getMLPrediction } from '../services/mlClient.js';
import { calculatePostTaxReturnSafe } from '../services/postTaxCalculator.js';
import { getTaxSlab } from '../services/taxEngine.js';
import { generateAdvisory } from '../services/geminiService.js';
import crypto from 'crypto';
import { getCache, setCache } from '../config/redis.js';
import { INSTRUMENT_PARAMS, RISK_FREE_RATE, DISCLAIMER } from '../services/instrumentConstants.js';

const router = Router();

// Build INSTRUMENT_META from centralized constants for backward compatibility
const INSTRUMENT_META = {};
for (const [key, params] of Object.entries(INSTRUMENT_PARAMS)) {
  INSTRUMENT_META[key] = {
    name: params.name,
    type: key,
    nominalRate: params.nominalRate,
    riskLevel: params.riskLevel,
    lockIn: params.lockIn,
    tags: params.tags,
  };
}

const INSTRUMENT_KEY_MAP = {
  'Public_Provident_Fund': 'PPF',
  'Bank_FD':               'FD',
  'National_Pension':      'NPS',
  'RBI_Bond':              'RBI_Bond',
  'Sovereign_Gold_Bond':   'SGB',
  'Gold_ETF':              'Gold',
  'Nifty_Index':           'Index_MF',
  'Balanced_Advantage':    'Hybrid_MF',
};

function normaliseConfidenceScores(rawScores) {
  if (!rawScores || typeof rawScores !== 'object') return {};
  const normalised = {};
  for (const [key, value] of Object.entries(rawScores)) {
    if (typeof value !== 'number' || !isFinite(value)) continue;
    const mappedKey = INSTRUMENT_KEY_MAP[key] || key;
    normalised[mappedKey] = value;
  }
  return normalised;
}

// DISCLAIMER and RISK_FREE_RATE imported from instrumentConstants.js

/**
 * POST /api/recommend [Protected]
 * Generate investment recommendations for a financial profile.
 */
router.post('/', verifyJWT, validate(recommendSchema), asyncHandler(async (req, res) => {
  const { profileId } = req.body;

  if (!isValidObjectId(profileId)) {
    throw createError(400, 'Invalid profileId format', 'Invalid profile ID.');
  }

  const profile = await FinancialProfile.findById(profileId).lean();
  if (!profile) {
    throw createError(404, `Profile not found: ${profileId}`, 'Profile not found.');
  }

  // Authorization: verify the profile belongs to the requesting user
  if (!isOwner(profile, req.user.userId)) {
    throw createError(403, `User ${req.user.userId} tried to access profile ${profileId}`, 'Access denied.');
  }

  // Check Redis cache to prevent redundant recalculations
  const profileHash = crypto.createHash('sha256').update(JSON.stringify({
    age: profile.age,
    income: profile.annualIncome,
    savings: profile.savings,
    risk: profile.riskCategory,
    regime: profile.taxRegime,
    horizon: profile.investmentHorizon,
  })).digest('hex').substring(0, 16);
  const cacheKey = `recommendation:${req.user.userId}:${profileHash}`;

  const cachedResult = await getCache(cacheKey);
  if (cachedResult) {
    return res.json(cachedResult);
  }

  // Call ML microservice
  const mlResult = await getMLPrediction({
    age: profile.age,
    annual_income: profile.annualIncome,
    monthly_savings: profile.savings,
    risk_category: profile.riskCategory,
  });

  const marginalRate = getTaxSlab(profile.annualIncome, profile.taxRegime);
  const picks = [mlResult.primary, mlResult.secondary, mlResult.tertiary].filter(Boolean);

  if (picks.length === 0) {
    throw createError(502, 'ML service returned no recommendations', 'Recommendation engine returned empty results.');
  }

  // Calculate post-tax returns for each recommended instrument
  // Also compute portfolio-level analytics (Sharpe ratio, allocation weights)
  // RISK_FREE_RATE imported from instrumentConstants.js

  const instruments = picks.map((key, idx) => {
    const meta = INSTRUMENT_META[key];
    if (!meta) {
      console.warn(`[Recommend] Unknown instrument key from ML: '${key}'. Falling back to FD metadata. Add this to INSTRUMENT_META.`);
    }
    const safeMeta = meta || INSTRUMENT_META['FD'];
    const postTax = calculatePostTaxReturnSafe(
      safeMeta.type,
      safeMeta.nominalRate / 100,
      profile.annualIncome,
      profile.investmentHorizon || 15,
      profile.taxRegime || 'new'
    );

    // Sharpe ratio = (return - risk_free_rate) / volatility
    // Volatility from centralized instrumentConstants.js
    const vol = INSTRUMENT_PARAMS[safeMeta.type]?.volatility || 0.10;
    const postTaxDecimal = (postTax.effectiveYield || 0) / 100;
    const sharpeRatio = vol > 0.001
      ? parseFloat(((postTaxDecimal - RISK_FREE_RATE) / vol).toFixed(2))
      : 0;

    // Allocation weight: based on ML confidence + position priority
    const confScores = normaliseConfidenceScores(mlResult.confidence_scores);
    const rawWeight = confScores[key] || (idx === 0 ? 0.5 : idx === 1 ? 0.3 : 0.2);

    return {
      ...safeMeta,
      nominalReturn: safeMeta.nominalRate,
      postTaxReturn: postTax.effectiveYield,
      effectiveYield: postTax.effectiveYield,
      taxNotes: postTax.notes,
      sharpeRatio,
      allocationWeight: parseFloat(rawWeight.toFixed(2)),
    };
  });

  // Normalise allocation weights to sum to EXACTLY 1.0
  // Individual rounding can cause 0.33+0.33+0.33=0.99 — fix by adjusting largest weight
  const totalWeight = instruments.reduce((s, i) => s + i.allocationWeight, 0);
  if (totalWeight > 0) {
    instruments.forEach(i => {
      i.allocationWeight = parseFloat((i.allocationWeight / totalWeight).toFixed(4));
    });
    // Absorb rounding residual into the largest-weight instrument
    const roundedSum = instruments.reduce((s, i) => s + i.allocationWeight, 0);
    const residual = parseFloat((1.0 - roundedSum).toFixed(4));
    if (residual !== 0 && instruments.length > 0) {
      const maxIdx = instruments.reduce((mi, w, i, arr) => w.allocationWeight > arr[mi].allocationWeight ? i : mi, 0);
      instruments[maxIdx].allocationWeight = parseFloat((instruments[maxIdx].allocationWeight + residual).toFixed(4));
    }
  }

  // Portfolio-level expected yield (weighted average of post-tax returns)
  const portfolioYield = parseFloat(
    instruments.reduce((s, i) => s + (i.effectiveYield * i.allocationWeight), 0).toFixed(2)
  );

  // Call Groq/Gemini for advisory text
  const advisory = await generateAdvisory({
    age: profile.age,
    annualIncome: profile.annualIncome,
    monthlySavings: profile.savings,
    taxSlab: marginalRate,
    riskCategory: profile.riskCategory,
    instruments: instruments.map(i => ({ name: i.name, type: i.type, postTaxReturn: i.postTaxReturn })),
    horizon: profile.investmentHorizon || 15,
    shapExplanation: mlResult.explanation || null,
  });

  // Save recommendation to DB
  const rec = await Recommendation.create({
    userId: req.user.userId,
    profileId: profile._id,
    instruments,
    advisoryText: advisory.text,
    confidenceScores: normaliseConfidenceScores(mlResult.confidence_scores),
    mlFallback: mlResult.fallback || false,
  });

  const result = {
    recommendationId: rec._id,
    instruments,
    ranked: true,
    advisory_text: advisory.text,
    confidence_scores: normaliseConfidenceScores(mlResult.confidence_scores),
    decision_path: mlResult.decision_path,
    explanation: mlResult.explanation || null,
    ml_fallback: mlResult.fallback || false,
    portfolio_yield: portfolioYield,
    risk_free_rate: parseFloat((RISK_FREE_RATE * 100).toFixed(2)),
    disclaimer: DISCLAIMER,
  };

  // Cache for 24 hours
  await setCache(cacheKey, result, 86400);

  res.json(result);
}));

export default router;
