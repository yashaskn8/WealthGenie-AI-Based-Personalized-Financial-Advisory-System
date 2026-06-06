import { Router } from 'express';
import { verifyJWT, isOwner, isValidObjectId } from '../middleware/authMiddleware.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validate, recommendSchema, updateWeightsSchema } from '../validation/schemas.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Recommendation from '../models/Recommendation.js';
import { getMLPrediction } from '../services/mlClient.js';
import { calculatePostTaxReturnSafe } from '../services/postTaxCalculator.js';
import { getTaxSlab } from '../services/taxEngine.js';
import { generateAdvisory } from '../services/geminiService.js';
import crypto from 'crypto';
import { getCache, setCache, delCache } from '../config/redis.js';
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

function buildProfileHash(profile) {
  return crypto.createHash('sha256').update(JSON.stringify({
    age: profile.age,
    income: profile.annualIncome,
    savings: profile.savings,
    risk: profile.riskCategory,
    regime: profile.taxRegime,
    horizon: profile.investmentHorizon,
  })).digest('hex').substring(0, 16);
}

export function buildRecommendationCacheKey(userId, profileId, profile) {
  return `recommendation:${userId}:${profileId}:${buildProfileHash(profile)}`;
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
  const cacheKey = buildRecommendationCacheKey(req.user.userId, profile._id, profile);

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

  // ── DEMOGRAPHIC & TAX-BASED OVERRIDES ──────────────────────────────
  // Override ML picks for specific investor segments to ensure regulatory
  // alignment and fiduciary responsibility.
  //
  // These overrides take precedence over ML predictions because certain
  // instrument-investor pairings are either:
  //   (a) Unsuitable per SEBI suitability guidelines
  //   (b) Tax-inefficient given the investor's marginal rate
  //   (c) Inappropriate for the investor's time horizon

  const HIGH_RISK_INSTRUMENTS = new Set(['Smallcap_MF', 'Midcap_MF', 'ELSS', 'Equity_MF']);
  const LOW_YIELD_DEBT = new Set(['FD', 'Debt_MF', 'Liquid_MF']);

  // Override 1: Age >= 60 — redirect aggressive picks to safe instruments
  if (profile.age >= 60) {
    for (let i = 0; i < picks.length; i++) {
      if (HIGH_RISK_INSTRUMENTS.has(picks[i])) {
        const replacement = i === 0 ? 'SCSS' : (i === 1 ? 'RBI_Bond' : 'FD');
        console.warn(`[Recommend Override] Age ${profile.age}: replacing ${picks[i]} with ${replacement}`);
        picks[i] = replacement;
      }
    }
  }

  // Override 2: Age < 25 — force at least 70% equity allocation
  // Young investors have the longest compounding horizon; fixed income
  // allocations above 30% are suboptimal over 30+ year horizons.
  if (profile.age < 25) {
    const equityTypes = new Set(['Equity_MF', 'ETF', 'Index_MF', 'ELSS', 'Midcap_MF', 'Smallcap_MF', 'Hybrid_MF']);
    const equityCount = picks.filter(p => equityTypes.has(p)).length;
    if (equityCount === 0 && picks.length > 0) {
      console.warn(`[Recommend Override] Age ${profile.age}: forcing primary to Index_MF`);
      picks[0] = 'Index_MF';
    }
  }

  // Override 3: 30% tax slab — prefer Arbitrage_MF over FD/Debt_MF
  // At 30% marginal rate, FD post-tax yield (~4.55%) is inferior to
  // Arbitrage_MF (~6.56% post LTCG at 12.5%), making FD tax-inefficient.
  if (marginalRate >= 0.30) {
    for (let i = 0; i < picks.length; i++) {
      if (LOW_YIELD_DEBT.has(picks[i])) {
        console.warn(`[Recommend Override] 30% slab: replacing ${picks[i]} with Arbitrage_MF`);
        picks[i] = 'Arbitrage_MF';
        break; // Only replace the first occurrence to maintain diversification
      }
    }
  }

  // Deduplicate picks after overrides
  const seen = new Set();
  const deduped = [];
  for (const p of picks) {
    if (!seen.has(p)) { seen.add(p); deduped.push(p); }
  }

  // Define suitability check for backfill filler instruments
  const isSuitableFiller = (inst) => {
    if (profile.age >= 60 && HIGH_RISK_INSTRUMENTS.has(inst)) return false;
    if (marginalRate >= 0.30 && LOW_YIELD_DEBT.has(inst)) return false;
    return true;
  };

  // If overrides created duplicates and we lost instruments, backfill safely
  const allInstruments = Object.keys(INSTRUMENT_PARAMS);
  while (deduped.length < 3) {
    const filler = allInstruments.find(k => !seen.has(k) && isSuitableFiller(k));
    if (filler) {
      seen.add(filler);
      deduped.push(filler);
    } else {
      break;
    }
  }
  picks.length = 0;
  picks.push(...deduped);

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
    // Note: postTaxDecimal already accounts for expense ratio (TER) since nominalRate is net of TER.
    // Therefore, this is the net risk-adjusted Sharpe ratio.
    const vol = INSTRUMENT_PARAMS[safeMeta.type]?.volatility || 0.10;
    const expenseRatio = INSTRUMENT_PARAMS[safeMeta.type]?.expenseRatio || 0.0;
    const postTaxDecimal = (postTax.effectiveYield || 0) / 100;
    const sharpeRatio = vol > 0.001
      ? parseFloat(((postTaxDecimal - RISK_FREE_RATE) / vol).toFixed(2))
      : 0;

    // Allocation weight: based on ML confidence + position priority
    const confScores = normaliseConfidenceScores(mlResult.confidence_scores);
    const rawWeight = confScores[key] || (idx === 0 ? 0.40 : idx === 1 ? 0.35 : 0.25);

    return {
      ...safeMeta,
      nominalReturn: safeMeta.nominalRate,
      postTaxReturn: postTax.effectiveYield,
      effectiveYield: postTax.effectiveYield,
      taxNotes: postTax.notes,
      sharpeRatio,
      expenseRatio,
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

/**
 * POST /api/recommend/weights [Protected]
 * Updates allocation weights of a recommendation.
 */
router.post('/weights', verifyJWT, validate(updateWeightsSchema), asyncHandler(async (req, res) => {
  const { profileId, weights } = req.body;

  const profile = await FinancialProfile.findById(profileId).lean();
  if (!profile) {
    throw createError(404, `Profile not found: ${profileId}`, 'Profile not found.');
  }

  if (!isOwner(profile, req.user.userId)) {
    throw createError(403, `Access denied`, 'Access denied.');
  }

  // Find the latest recommendation for this profile
  const recommendation = await Recommendation.findOne({ profileId }).sort({ generatedAt: -1 });
  if (!recommendation) {
    throw createError(404, 'No recommendation found to update', 'No recommendation found.');
  }

  // Update weights on instruments
  const parsedWeights = {};
  let totalWeight = 0;
  for (const [k, v] of Object.entries(weights || {})) {
    const val = Number(v) || 0;
    if (val < 0) continue;
    parsedWeights[k] = val;
    totalWeight += val;
  }

  if (totalWeight <= 0) {
    throw createError(400, 'Invalid weights', 'Total weights must be greater than zero.');
  }

  // Map of weights normalized to sum to exactly 1.0
  const normWeights = {};
  for (const [k, v] of Object.entries(parsedWeights)) {
    normWeights[k.toUpperCase()] = v / totalWeight;
  }

  // Update the recommendation instruments
  recommendation.instruments.forEach(inst => {
    const weight = normWeights[inst.type.toUpperCase()] ?? 0;
    inst.allocationWeight = parseFloat(weight.toFixed(4));
  });

  // Re-normalize instruments weights to sum to EXACTLY 1.0 (to avoid rounding issues)
  const instWeightSum = recommendation.instruments.reduce((s, i) => s + i.allocationWeight, 0);
  if (instWeightSum > 0 && Math.abs(instWeightSum - 1.0) > 0.0001) {
    const maxIdx = recommendation.instruments.reduce((mi, w, i, arr) => w.allocationWeight > arr[mi].allocationWeight ? i : mi, 0);
    recommendation.instruments[maxIdx].allocationWeight = parseFloat((recommendation.instruments[maxIdx].allocationWeight + (1.0 - instWeightSum)).toFixed(4));
  }

  await recommendation.save();

  // Invalidate Redis cache for this recommendation
  const cacheKey = buildRecommendationCacheKey(req.user.userId, profile._id, profile);
  await delCache(cacheKey);

  res.json({
    status: 'success',
    message: 'Recommendation weights updated successfully.',
    instruments: recommendation.instruments,
  });
}));

export default router;
