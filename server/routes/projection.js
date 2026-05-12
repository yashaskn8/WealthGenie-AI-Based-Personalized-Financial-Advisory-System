import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import FinancialProfile from '../models/FinancialProfile.js';
import { generateProjections } from '../services/projectionEngine.js';
import { calculatePostTaxReturn } from '../services/postTaxCalculator.js';
import { getTaxSlab } from '../services/taxEngine.js';

const router = Router();

const RATE_LOOKUP = {
  FD: 7.25, ELSS: 13.5, Equity_MF: 12.5, ETF: 12.5,
  Debt_MF: 7.5, RBI_Bond: 8.05, G_Sec: 7.2,
};

// POST /api/projection [Protected]
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { profileId, instruments, monthly_investment, years } = req.body;
    if (!profileId) return res.status(400).json({ error: 'profileId is required.' });

    const profile = await FinancialProfile.findById(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const marginalRate = getTaxSlab(profile.annualIncome, profile.taxRegime);
    const investAmount = monthly_investment || profile.savings;
    const projYears = years || [5, 10, 15, 20];

    // Build instrument list with post-tax rates
    const instList = (instruments || ['FD', 'ELSS', 'Equity_MF', 'Debt_MF']).map(key => {
      const nominalRate = RATE_LOOKUP[key] || 7.0;
      const ptResult = calculatePostTaxReturn(key, nominalRate / 100, profile.annualIncome, profile.investmentHorizon || 15, profile.taxRegime || 'new');
      return { name: key, type: key, postTaxRate: ptResult.postTaxReturn };
    });

    const postTaxRates = {};
    instList.forEach(i => { postTaxRates[i.name] = i.postTaxRate; });

    const projections = generateProjections(investAmount, instList, postTaxRates, projYears);

    res.json(projections);
  } catch (err) {
    res.status(500).json({ error: 'Projection failed: ' + err.message });
  }
});

export default router;
