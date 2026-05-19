import { Router } from 'express';
import { verifyJWT, isOwner, isValidObjectId } from '../middleware/authMiddleware.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validate, projectionSchema } from '../validation/schemas.js';
import FinancialProfile from '../models/FinancialProfile.js';
import { generateProjections } from '../services/projectionEngine.js';
import { calculatePostTaxReturnSafe } from '../services/postTaxCalculator.js';

const router = Router();

const RATE_LOOKUP = {
  FD: 7.25, ELSS: 13.5, Equity_MF: 12.5, ETF: 12.5,
  Debt_MF: 7.5, RBI_Bond: 8.05, 'G-Sec': 7.2,
  PPF: 7.1, NPS: 10, Gold: 9, SGB: 10.5,
  Liquid_MF: 7.0, Arbitrage_MF: 7.5,
};

/**
 * POST /api/projection [Protected]
 * Generate wealth projections for multiple instruments over time.
 */
router.post('/', verifyJWT, validate(projectionSchema), asyncHandler(async (req, res) => {
  const { profileId, instruments, monthly_investment, years } = req.body;

  if (!isValidObjectId(profileId)) {
    throw createError(400, 'Invalid profileId', 'Invalid profile ID.');
  }

  const profile = await FinancialProfile.findById(profileId).lean();
  if (!profile) {
    throw createError(404, `Profile not found: ${profileId}`, 'Profile not found.');
  }

  // Authorization: verify the profile belongs to the requesting user
  if (!isOwner(profile, req.user.userId)) {
    throw createError(403, `Unauthorized profile access: ${profileId}`, 'Access denied.');
  }

  const investAmount = monthly_investment || profile.savings;
  const projYears = years || [5, 10, 15, 20];

  // Guard: reject zero or negative investment amounts instead of producing misleading flat-line projections
  if (!Number.isFinite(investAmount) || investAmount <= 0) {
    throw createError(400,
      `Invalid investment amount: ${investAmount} (monthly_investment: ${monthly_investment}, profile.savings: ${profile.savings})`,
      'Monthly investment amount must be greater than zero.'
    );
  }

  // Build instrument list with post-tax rates
  const instKeys = instruments || ['FD', 'ELSS', 'Equity_MF', 'Debt_MF'];
  const instList = instKeys.map(key => {
    const nominalRate = RATE_LOOKUP[key];
    if (nominalRate === undefined) {
      console.warn(`[Projection] Unknown instrument key: '${key}'. Using 7.0% default. Add this key to RATE_LOOKUP.`);
    }
    const safeRate = nominalRate ?? 7.0;
    const ptResult = calculatePostTaxReturnSafe(
      key,
      safeRate / 100,
      profile.annualIncome,
      profile.investmentHorizon || 15,
      profile.taxRegime || 'new'
    );

    // Invariant check: post-tax rate should not exceed nominal rate
    if (ptResult.effectiveYield > safeRate + 0.01) {
      console.error(`[Projection INVARIANT] ${key}: effectiveYield ${ptResult.effectiveYield}% exceeds nominal ${safeRate}%. Clamping.`);
      ptResult.effectiveYield = safeRate;
    }

    return { name: key, type: key, postTaxRate: ptResult.effectiveYield };
  });

  const postTaxRates = {};
  instList.forEach(i => { postTaxRates[i.name] = i.postTaxRate; });

  const projections = generateProjections(investAmount, instList, postTaxRates, projYears);

  res.json(projections);
}));

export default router;
