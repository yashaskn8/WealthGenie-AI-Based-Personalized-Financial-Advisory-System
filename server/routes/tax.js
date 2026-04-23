import { Router } from 'express';
import { computeTax, compareTaxRegimes } from '../services/taxEngine.js';

const router = Router();

/**
 * GET /api/tax/compute?income=1200000&regime=new
 * Compute tax for a specific income and regime.
 */
router.get('/compute', (req, res) => {
  try {
    const income = parseFloat(req.query.income);
    const regime = req.query.regime || 'new';

    if (!income || income <= 0) {
      return res.status(400).json({ error: 'Valid income parameter is required.' });
    }

    const result = computeTax(income, regime);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Tax computation failed: ' + err.message });
  }
});

/**
 * GET /api/tax/compare?income=1200000
 * Compare both tax regimes and return the recommended one.
 *
 * Response:
 * {
 *   income, newRegime: { tax, effectiveRate, rebateApplied },
 *   oldRegime: { tax, effectiveRate, rebateApplied },
 *   recommended_regime, saving
 * }
 */
router.get('/compare', (req, res) => {
  try {
    const income = parseFloat(req.query.income);

    if (!income || income <= 0) {
      return res.status(400).json({ error: 'Valid income parameter is required.' });
    }

    const { newRegime, oldRegime, recommended } = compareTaxRegimes(income);

    res.json({
      income,
      new_regime: {
        tax: newRegime.taxAmount,
        effective_rate: newRegime.effectiveRate,
        rebate_applied: newRegime.rebateApplied,
        taxable_income: newRegime.taxableIncome,
        standard_deduction: newRegime.standardDeduction,
      },
      old_regime: {
        tax: oldRegime.taxAmount,
        effective_rate: oldRegime.effectiveRate,
        rebate_applied: oldRegime.rebateApplied,
        taxable_income: oldRegime.taxableIncome,
        standard_deduction: oldRegime.standardDeduction,
      },
      recommended_regime: recommended,
      saving: Math.abs(newRegime.taxAmount - oldRegime.taxAmount),
      saving_with: recommended,
    });
  } catch (err) {
    res.status(500).json({ error: 'Tax comparison failed: ' + err.message });
  }
});

export default router;
