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

const router = Router();

const INSTRUMENT_META = {
  ELSS:      { name: 'ELSS Mutual Fund',    type: 'ELSS',      nominalRate: 13.5,  riskLevel: 'High',       lockIn: 3, tags: ['Tax Saving', '80C'] },
  Equity_MF: { name: 'Equity Mutual Fund',   type: 'Equity_MF', nominalRate: 12.5,  riskLevel: 'High',       lockIn: 0, tags: ['Wealth Growth'] },
  ETF:       { name: 'Nifty 50 ETF',         type: 'ETF',       nominalRate: 12.5,  riskLevel: 'Medium',     lockIn: 0, tags: ['Passive', 'Low Cost'] },
  FD:        { name: 'Bank Fixed Deposit',    type: 'FD',        nominalRate: 7.25,  riskLevel: 'Low',        lockIn: 0, tags: ['Guaranteed', 'DICGC Insured'] },
  RBI_Bond:  { name: 'RBI Savings Bond',      type: 'RBI_Bond',  nominalRate: 8.05,  riskLevel: 'Very Low',   lockIn: 7, tags: ['Sovereign'] },
  Debt_MF:   { name: 'Debt Mutual Fund',      type: 'Debt_MF',   nominalRate: 7.5,   riskLevel: 'Low-Medium', lockIn: 0, tags: ['Liquid'] },
  PPF:       { name: 'Public Provident Fund', type: 'PPF',       nominalRate: 7.1,   riskLevel: 'Very Low',   lockIn: 15, tags: ['EEE', 'Tax Free', '80C'] },
  NPS:       { name: 'National Pension System',type: 'NPS',      nominalRate: 10.0,  riskLevel: 'Medium',     lockIn: 60, tags: ['Retirement', '80CCD'] },
  Gold:      { name: 'Gold ETF',              type: 'Gold',      nominalRate: 9.0,   riskLevel: 'Medium',     lockIn: 0, tags: ['Hedge', 'Inflation'] },
  SGB:       { name: 'Sovereign Gold Bond',   type: 'SGB',       nominalRate: 10.5,  riskLevel: 'Low-Medium', lockIn: 8, tags: ['Gold', 'Tax Exempt'] },
  'G-Sec':   { name: 'Government Security',   type: 'G-Sec',     nominalRate: 7.2,   riskLevel: 'Very Low',   lockIn: 0, tags: ['Sovereign', 'Gilt'] },
  Liquid_MF: { name: 'Liquid Mutual Fund',    type: 'Liquid_MF', nominalRate: 7.0,   riskLevel: 'Low',        lockIn: 0, tags: ['Emergency Fund', 'T+1'] },
  Arbitrage_MF: { name: 'Arbitrage Mutual Fund', type: 'Arbitrage_MF', nominalRate: 7.5, riskLevel: 'Low', lockIn: 0, tags: ['Low Volatility', 'Equity Taxed'] },
};

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

const DISCLAIMER = 'WealthGenie provides AI-generated investment analysis for educational and informational purposes only. It does not constitute registered investment advice under SEBI (Investment Advisers) Regulations, 2013. Past returns are not indicative of future performance. Please consult a SEBI-registered investment adviser before making investment decisions. Mutual fund investments are subject to market risks.';

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
  const instruments = picks.map(key => {
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
    return {
      ...safeMeta,
      nominalReturn: safeMeta.nominalRate,
      postTaxReturn: postTax.effectiveYield,
      effectiveYield: postTax.effectiveYield,
      taxNotes: postTax.notes,
    };
  });

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
    disclaimer: DISCLAIMER,
  };

  // Cache for 24 hours
  await setCache(cacheKey, result, 86400);

  res.json(result);
}));

export default router;
