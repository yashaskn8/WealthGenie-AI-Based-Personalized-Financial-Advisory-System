import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Recommendation from '../models/Recommendation.js';
import { getMLPrediction } from '../services/mlClient.js';
import { calculatePostTaxReturn } from '../services/postTaxCalculator.js';
import { getTaxSlab } from '../services/taxEngine.js';
import { generateAdvisory } from '../services/geminiService.js';

const router = Router();

const INSTRUMENT_META = {
  ELSS: { name: 'ELSS Mutual Fund', type: 'ELSS', nominalRate: 13.5, riskLevel: 'High', lockIn: 3, tags: ['Tax Saving', '80C'] },
  Equity_MF: { name: 'Equity Mutual Fund', type: 'Equity_MF', nominalRate: 12.5, riskLevel: 'High', lockIn: 0, tags: ['Wealth Growth'] },
  ETF: { name: 'Nifty 50 ETF', type: 'ETF', nominalRate: 12.5, riskLevel: 'Medium', lockIn: 0, tags: ['Passive', 'Low Cost'] },
  FD: { name: 'Bank Fixed Deposit', type: 'FD', nominalRate: 7.25, riskLevel: 'Low', lockIn: 0, tags: ['Guaranteed', 'DICGC Insured'] },
  RBI_Bond: { name: 'RBI Savings Bond', type: 'RBI_Bond', nominalRate: 8.05, riskLevel: 'Very Low', lockIn: 7, tags: ['Sovereign'] },
  Debt_MF: { name: 'Debt Mutual Fund', type: 'Debt_MF', nominalRate: 7.5, riskLevel: 'Low-Medium', lockIn: 0, tags: ['Liquid'] },
};

// POST /api/recommend [Protected]
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId) return res.status(400).json({ error: 'profileId is required.' });

    const profile = await FinancialProfile.findById(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // Call ML microservice
    const mlResult = await getMLPrediction({
      age: profile.age,
      annual_income: profile.annualIncome,
      monthly_savings: profile.savings,
      risk_category: profile.riskCategory,
    });

    const marginalRate = getTaxSlab(profile.annualIncome, profile.taxRegime);
    const picks = [mlResult.primary, mlResult.secondary, mlResult.tertiary];

    // Calculate post-tax returns for each recommended instrument
    const instruments = picks.map(key => {
      const meta = INSTRUMENT_META[key] || INSTRUMENT_META['FD'];
      // nominalRate in INSTRUMENT_META is percentage; convert to decimal for calculator
      const postTax = calculatePostTaxReturn(meta.type, meta.nominalRate / 100, profile.annualIncome, 5, profile.taxRegime || 'new');
      return { ...meta, nominalReturn: meta.nominalRate, postTaxReturn: postTax.effectiveYield, effectiveYield: postTax.effectiveYield, taxNotes: postTax.notes };
    });

    // Call Gemini for advisory (now with SHAP context)
    const advisory = await generateAdvisory({
      age: profile.age,
      annualIncome: profile.annualIncome,
      monthlySavings: profile.savings,
      taxSlab: marginalRate,
      riskCategory: profile.riskCategory,
      instruments: instruments.map(i => ({ name: i.name, type: i.type, postTaxReturn: i.postTaxReturn })),
      horizon: 10,
      shapExplanation: mlResult.explanation || null,
    });

    // Save recommendation
    const rec = await Recommendation.create({
      userId: req.user.userId,
      profileId: profile._id,
      instruments,
      advisoryText: advisory.text,
      confidenceScores: mlResult.confidence_scores,
      mlFallback: mlResult.fallback || false,
    });

    res.json({
      recommendationId: rec._id,
      instruments,
      ranked: true,
      advisory_text: advisory.text,
      confidence_scores: mlResult.confidence_scores,
      decision_path: mlResult.decision_path,
      explanation: mlResult.explanation || null,
      ml_fallback: mlResult.fallback || false,
      disclaimer: 'WealthGenie provides AI-generated investment analysis for educational and informational purposes only. It does not constitute registered investment advice under SEBI (Investment Advisers) Regulations, 2013. Past returns are not indicative of future performance. Please consult a SEBI-registered investment adviser before making investment decisions. Mutual fund investments are subject to market risks.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Recommendation failed: ' + err.message });
  }
});

export default router;
