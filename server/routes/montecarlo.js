import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { runMonteCarloWithGoal, getInstrumentVolatility } from '../services/monteCarloEngine.js';
import { getLiveInstrumentParams } from '../services/marketDataService.js';
import { calculatePostTaxReturn } from '../services/postTaxCalculator.js';
import FinancialProfile from '../models/FinancialProfile.js';
import { getCache, setCache } from '../config/redis.js';
import { validate, monteCarloSchema } from '../validation/schemas.js';

const router = Router();

/**
 * POST /api/projection/montecarlo
 * Run Monte Carlo simulation for a specific instrument.
 *
 * When a profileId is provided, the simulation uses:
 *   1. Live Nifty-derived volatility params (from AMFI/Yahoo Finance)
 *   2. Post-tax adjusted returns (from the user's marginal slab)
 * This replaces the static INSTRUMENT_PARAMS in monteCarloEngine.js
 * at the route layer, keeping the engine as a pure math module.
 *
 * Body: { instrument, monthly_investment, years, target_amount?, profileId? }
 */
router.post('/montecarlo', verifyJWT, validate(monteCarloSchema), async (req, res) => {
  try {
    const { instrument, monthly_investment, years, target_amount, profileId } = req.body;

    // ── Step 1: Fetch live instrument parameters (Nifty-derived for equity) ──
    const liveResult = await getLiveInstrumentParams();
    const liveParams = liveResult.params[instrument]
      || getInstrumentVolatility(instrument);

    let effectiveRate = liveParams.mean;
    let effectiveVolatility = liveParams.stdDev;
    let dataSource = liveParams.source || 'static';
    let postTaxInfo = null;

    // ── Step 2: If profileId provided, compute post-tax adjusted rate ──
    if (profileId) {
      try {
        const profile = await FinancialProfile.findById(profileId).lean();
        if (profile) {
          const annualIncome = profile.annualIncome || (profile.income * 12);
          const regime = profile.taxRegime || 'new';

          const postTaxResult = calculatePostTaxReturn(
            instrument,
            liveParams.mean,   // Use live nominal rate (not null)
            annualIncome,
            years,
            regime
          );

          effectiveRate = postTaxResult.postTaxReturn;
          postTaxInfo = {
            nominal_rate: liveParams.mean,
            post_tax_rate: postTaxResult.postTaxReturn,
            tax_type: postTaxResult.taxType,
            tax_rate: postTaxResult.taxRate,
            regime,
          };
        }
      } catch (profileErr) {
        // Profile lookup failed — proceed with pre-tax live rate
        console.warn('[MonteCarlo] Profile lookup failed, using pre-tax rate:', profileErr.message);
      }
    }

    // ── Step 3: Check Redis cache ──
    const cacheKey = `mc:${req.user.userId}:${instrument}:${years}:${monthly_investment}:${effectiveRate}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    // ── Step 4: Run Monte Carlo simulation with live + post-tax params ──
    const result = runMonteCarloWithGoal({
      monthlyInvestment: monthly_investment,
      postTaxAnnualReturn: effectiveRate,
      annualVolatility: effectiveVolatility,
      years,
      simulations: 10000,
      targetAmount: target_amount || null,
    });

    // ── Step 5: Build Recharts-friendly chart data ──
    const chartData = result.years_array.map((yr, i) => ({
      year: yr,
      p10: result.p10[i],
      p25: result.p25[i],
      p50: result.p50[i],
      p75: result.p75[i],
      p90: result.p90[i],
      mean: result.mean[i],
    }));

    const response = {
      instrument,
      years,
      monthly_investment,
      chartData,
      goal_probability: result.goal_probability,
      target_amount: result.target_amount,
      simulations_run: result.simulations_run,
      percentile_summary: {
        p10: result.p10[result.p10.length - 1],
        p25: result.p25[result.p25.length - 1],
        p50: result.p50[result.p50.length - 1],
        p75: result.p75[result.p75.length - 1],
        p90: result.p90[result.p90.length - 1],
      },
      // ── Data source transparency ──
      data_source: dataSource,
      post_tax_rate_used: effectiveRate,
      volatility_used: effectiveVolatility,
      nifty_derived: dataSource === 'live',
      post_tax_info: postTaxInfo,
      cached: false,
    };

    // Cache for 30 minutes
    await setCache(cacheKey, response, 1800);
    res.json(response);
  } catch (err) {
    console.error('[MonteCarlo]', err);
    res.status(500).json({ error: 'Simulation failed.' });
  }
});

export default router;
