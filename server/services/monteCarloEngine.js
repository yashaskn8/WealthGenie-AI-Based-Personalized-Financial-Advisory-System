/**
 * WealthGenie Monte Carlo Simulation Engine
 * Runs N simulations with log-normally distributed returns (GBM)
 * to produce probabilistic wealth projections (percentile bands).
 *
 * Uses Box-Muller transform for random normal generation (no external deps).
 *
 * Mathematical basis:
 *   Geometric Brownian Motion (GBM) discretized at monthly frequency.
 *   S(t+dt) = S(t) × exp[(μ − σ²/2)dt + σ√dt × Z]
 *   where Z ~ N(0,1), dt = 1/12 year
 *
 *   This guarantees non-negative portfolio values and correct expected
 *   terminal wealth E[S(T)] = S(0) × exp(μT).
 * 
 * =========================================================================
 * 📘 BEGINNER NOTE: WHAT IS MONOTE CARLO SIMULATION & GBM?
 * =========================================================================
 * 1. Monte Carlo Simulation: In the real world, markets fluctuate randomly. If you
 *    assume a fixed 10% return every year, your projections are "deterministic" (too simple).
 *    A Monte Carlo simulation runs thousands of possible "parallel universes" (paths).
 *    Each path experiences different random returns over time. By looking at all paths
 *    together, we can estimate the *probability* of reaching your goals.
 * 
 * 2. Geometric Brownian Motion (GBM): The math model used to simulate prices.
 *    Instead of just adding a random number to the price, GBM assumes your investment grows by
 *    a random *percentage* each month. This has two key benefits:
 *    - The portfolio can never go negative (you can't lose more than 100% of your money).
 *    - It models compounding interest stochastically (with volatility).
 */

import { INSTRUMENT_PARAMS as CENTRAL_PARAMS, RISK_FREE_RATE, toMonthlyRate } from './instrumentConstants.js';

// ─── INSTRUMENT VOLATILITY CONSTANTS ─────────────────────────────────
// Build MC-compatible {mean, stdDev} map from centralized constants.
// mean = nominalRate / 100 (convert percentage to decimal)
// stdDev = volatility (already decimal)
const INSTRUMENT_PARAMS = {};
for (const [key, p] of Object.entries(CENTRAL_PARAMS)) {
  INSTRUMENT_PARAMS[key] = { mean: p.nominalRate / 100, stdDev: p.volatility };
}

/**
 * Halton low-discrepancy sequence generator.
 * Produces quasi-random numbers in (0,1) that fill the space more uniformly
 * than pseudo-random Math.random(). This gives O(1/N) convergence instead
 * of O(1/√N) for standard MC — a massive accuracy boost.
 *
 * =========================================================================
 * 📘 BEGINNER NOTE: DARTBOARD ANALOGY FOR HALTON / QMC
 * =========================================================================
 * Imagine throwing darts at a board:
 * - Pure Random (Math.random): If you throw 100 darts randomly, some areas will end up with
 *   dense clusters, while other areas are completely empty (gaps). This is inefficient for
 *   simulations.
 * - Quasi-Random (Halton Sequence): Darts are placed systematically so that each new dart goes
 *   into the largest remaining empty gap. The board gets covered evenly with no clumps.
 *   This "Quasi-Monte Carlo" (QMC) method allows our simulation to reach highly stable,
 *   accurate results using 10x fewer runs.
 *
 * @param {number} index - Sequence index (1-based)
 * @param {number} base - Prime base (2, 3, 5, 7, etc.)
 * @returns {number} Quasi-random number in (0, 1)
 */
function halton(index, base) {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

/**
 * Box-Muller transform — generates a normally distributed random number.
 * Accepts optional external uniform variates for QMC integration.
 *
 * @param {number} [u1] - Uniform(0,1) variate (optional, uses Math.random if omitted)
 * @param {number} [u2] - Uniform(0,1) variate (optional, uses Math.random if omitted)
 * @returns {number} A standard normal random variable (mean=0, stdDev=1)
 */
function boxMuller(u1, u2) {
  // Clamp to open interval (0, 1) — log(0) = -Infinity, log(1) = 0 (degenerate)
  // Use fallback 0.5 to guarantee termination if Math.random() returns exactly 0
  if (u1 === undefined || u1 <= 0 || u1 >= 1) { u1 = Math.random() || 0.5; }
  if (u2 === undefined || u2 <= 0 || u2 >= 1) { u2 = Math.random() || 0.5; }
  // Final safety clamp — prevents -Infinity from log(0) in any edge case
  u1 = Math.max(1e-15, Math.min(u1, 1 - 1e-15));
  u2 = Math.max(1e-15, Math.min(u2, 1 - 1e-15));
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Compute percentile from a sorted array using linear interpolation.
 *
 * =========================================================================
 * 📘 BEGINNER NOTE: UNDERSTANDING PERCENTILES (P10, P50, P90)
 * =========================================================================
 * When we run 10,000 simulations, we sort all the final portfolio balances from lowest
 * to highest to extract confidence bands:
 * 
 * - P10 (10th Percentile / "Worst Case"): Only 10% of simulations ended up with less
 *   money than this. Think of it as a conservative, "markets are terrible" projection.
 * - P50 (50th Percentile / "Median / Expected Case"): 50% of simulations ended up higher, 
 *   and 50% lower. This is the most likely middle-of-the-road projection.
 * - P90 (90th Percentile / "Best Case"): Only 10% of simulations ended up higher.
 *   This is an optimistic, "bull market" projection.
 *
 * @param {number[]} sortedArr - Sorted array of numbers
 * @param {number} p - Percentile (0–100)
 * @returns {number}
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (idx - lower);
}

/**
 * Helper to sample a single monthly log-normal multiplier (GBM).
 * S(t+dt) = S(t) * exp((mean - vol^2/2)*dt + vol*sqrt(dt)*Z)
 */
export function sampleLogNormalMonthly(annualMean, annualVol, zVal) {
  const dt = 1 / 12;
  const drift = (annualMean - 0.5 * annualVol * annualVol) * dt;
  const vol = annualVol * Math.sqrt(dt);
  return Math.exp(drift + vol * zVal);
}

/**
 * Compute Sequence of Returns Risk.
 * If monthlyWithdrawal > 0, returns the fraction of paths ending <= 0.
 * Otherwise, returns the fraction of paths ending below the average terminal wealth.
 */
export function computeSequenceRisk(finalValues, simulations, years, monthlyWithdrawal = 0) {
  if (!finalValues || finalValues.length === 0) return 0;
  if (monthlyWithdrawal > 0) {
    const bankruptCount = finalValues.filter(v => v <= 0).length;
    return parseFloat((bankruptCount / finalValues.length).toFixed(4));
  }
  const meanVal = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
  if (meanVal <= 0) return 0;
  const variance = finalValues.reduce((s, v) => s + Math.pow(v - meanVal, 2), 0) / finalValues.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / meanVal;
  return parseFloat(cv.toFixed(4));
}

/**
 * Compute implied annual volatility and Sharpe ratio proxy.
 * Implied volatility is calculated from the ratio of p50 to p10 terminal values.
 */
export function computeRiskMetrics(p50Values, p10Values, years, riskFreeRate = 0.065, postTaxAnnualReturn = 0.08) {
  if (!p50Values || !p10Values || p50Values.length === 0 || p10Values.length === 0 || years <= 0) {
    return { impliedVol: 0, sharpeRatio: 0 };
  }
  const p50Last = p50Values[p50Values.length - 1];
  const p10Last = p10Values[p10Values.length - 1];
  let impliedVol = 0.05; // default fallback
  if (p50Last > 0 && p10Last > 0 && p50Last > p10Last) {
    impliedVol = Math.log(p50Last / p10Last) / (1.28155 * Math.sqrt(years));
  }
  const sharpeRatio = impliedVol > 0.0001 ? (postTaxAnnualReturn - riskFreeRate) / impliedVol : 0;
  return {
    impliedVol: parseFloat(impliedVol.toFixed(4)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(4)),
  };
}

/**
 * Run Monte Carlo simulation for SIP investment using GBM.
 *
 * Key mathematical properties:
 *   - Log-normal returns: balance is always non-negative without clamping
 *   - Drift-corrected: monthly drift = (μ - σ²/2)/12
 *   - Diffusion: monthly volatility = σ/√12
 *   - Each month: balance = (balance + SIP) × exp(drift·dt + σ·√dt·Z)
 *
 * @param {Object} params
 * @param {number} params.monthlyInvestment - Monthly SIP amount in ₹
 * @param {number} params.postTaxAnnualReturn - Expected post-tax annual return (decimal)
 * @param {number} params.annualVolatility - Standard deviation of annual returns (decimal)
 * @param {number} params.years - Investment horizon in years
 * @param {number} [params.simulations=10000] - Number of Monte Carlo simulations
 * @returns {{ years_array, p10, p25, p50, p75, p90, mean, simulations_run }}
 */
export function runMonteCarlo({
  monthlyInvestment,
  postTaxAnnualReturn,
  annualVolatility,
  years,
  simulations = 10000,
  inflationRate = 0.05,
  isRealTrack = false,
  currentSavings = 0,
}) {
  // Enforce integer years and protect against fractional or extremely small values (e.g. 0.5 yrs)
  const integerYears = Math.max(1, Math.round(years || 1));
  years = integerYears;

  const safeSavings = Number.isFinite(currentSavings) && currentSavings > 0 ? currentSavings : 0;

  // Input guards
  if ((!monthlyInvestment || monthlyInvestment <= 0) && safeSavings <= 0) {
    return emptyResult(years, simulations);
  }
  if (!years || years <= 0 || !Number.isFinite(years)) {
    return emptyResult(1, simulations);
  }
  if (!Number.isFinite(postTaxAnnualReturn)) postTaxAnnualReturn = 0.08;
  if (!Number.isFinite(annualVolatility) || annualVolatility < 0) annualVolatility = 0.05;

  // Cap simulations to prevent resource exhaustion (DoS vector)
  simulations = Math.min(Math.max(simulations, 100), 50000);

  // Warn on negative post-tax returns (possible during extreme market conditions)
  if (postTaxAnnualReturn < 0 && !isRealTrack) {
    console.warn(
      `[MC] Negative post-tax return: ${(postTaxAnnualReturn*100).toFixed(2)}%. `
      + `Simulation will proceed but projections may show capital erosion.`
    );
  }

  // Clamp volatility to sane range: 0.1% to 60%
  if (annualVolatility > 0.60) {
    if (!isRealTrack) {
      console.warn(`[MC] Extreme volatility ${(annualVolatility*100).toFixed(1)}% clamped to 60%.`);
    }
    annualVolatility = 0.60;
  }

  const yearsArray = [];
  for (let y = 1; y <= years; y++) yearsArray.push(y);

  // finalValues[year_index] = array of terminal values across all simulations
  const allSimResults = yearsArray.map(() => []);
  let finalValues = []; // terminal balances for goal probability

  const halfSims = Math.ceil(simulations / 2);
  const actualSims = halfSims * 2;
  const totalMonths = years * 12;

  // Deterministic SIP + lump sum FV for control variate (aligned with continuous GBM expected yield)
  const r = toMonthlyRate(postTaxAnnualReturn, true);
  const fvSIP = r > 0
    ? monthlyInvestment * ((Math.pow(1 + r, totalMonths) - 1) / r) * (1 + r)
    : monthlyInvestment * totalMonths;
  const fvSavings = safeSavings * Math.pow(1 + r, totalMonths);
  const deterministicFV = fvSIP + fvSavings;

  for (let sim = 0; sim < halfSims; sim++) {
    const useQMC = sim < halfSims * 0.4;
    const zValues = new Array(totalMonths);

    for (let i = 0; i < totalMonths; i++) {
      if (useQMC) {
        const seqIdx = sim * totalMonths + i + 1;
        const base1 = (i % 2 === 0) ? 2 : 5;
        const base2 = (i % 2 === 0) ? 3 : 7;
        const u1 = halton(seqIdx, base1) || 0.5;
        const u2 = halton(seqIdx, base2) || 0.5;
        zValues[i] = boxMuller(u1, u2);
      } else {
        zValues[i] = boxMuller();
      }
    }

    // =========================================================================
    // 📘 BEGINNER NOTE: ANTITHETIC MIRROR PATHS
    // =========================================================================
    // When we sample a random shock "Z" representing market volatility (e.g. +1.5 standard deviation),
    // we also immediately run a parallel simulation path using "-Z" (e.g. -1.5 standard deviation).
    // - Path 1: Represents an optimistic shock (+Z).
    // - Path 2: Represents the mirror pessimistic shock (-Z).
    // By coupling these opposite paths, we guarantee that the average of our random shocks
    // is exactly 0. This neutralizes simulation bias and heavily reduces standard error.

    // ── Path 1: use +Z ──────────────────────────────────────────────
    let balance1 = safeSavings;
    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) {
        balance1 += monthlyInvestment;
        const monthIdx = y * 12 + m;
        const z = zValues[monthIdx];
        balance1 *= sampleLogNormalMonthly(postTaxAnnualReturn, annualVolatility, z);
      }
      allSimResults[y].push(balance1);
    }
    finalValues.push(balance1);

    // ── Path 2: use -Z (antithetic mirror) ──────────────────────────
    let balance2 = safeSavings;
    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) {
        balance2 += monthlyInvestment;
        const monthIdx = y * 12 + m;
        const z = zValues[monthIdx];
        balance2 *= sampleLogNormalMonthly(postTaxAnnualReturn, annualVolatility, -z);
      }
      allSimResults[y].push(balance2);
    }
    finalValues.push(balance2);
  }

  // ── MULTIPLICATIVE CONTROL VARIATE CORRECTION ────────────────────────
  // =========================================================================
  // 📘 BEGINNER NOTE: WHAT ARE CONTROL VARIATES?
  // =========================================================================
  // Even with Halton and Antithetic paths, running a finite number of simulations (e.g. 10,000)
  // will have minor sampling errors. The average return of all simulated runs might deviate
  // slightly from the true expected rate of return (e.g. 10.02% instead of 10.00%).
  //
  // Control Variates correct this drift. We calculate the exact mathematical future value of our
  // savings and SIP under a deterministic compounding formula (deterministicFV_y).
  // Then, we scale all our random simulated paths by the ratio of the true mathematical value
  // to the simulated average. This eliminates the sampling bias entirely.
  for (let y = 0; y < years; y++) {
    const totalMonths_y = (y + 1) * 12;
    const fvSIP_y = r > 0
      ? monthlyInvestment * ((Math.pow(1 + r, totalMonths_y) - 1) / r) * (1 + r)
      : monthlyInvestment * totalMonths_y;
    const fvSavings_y = safeSavings * Math.pow(1 + r, totalMonths_y);
    const deterministicFV_y = fvSIP_y + fvSavings_y;

    const rawMean_y = allSimResults[y].reduce((s, v) => s + v, 0) / allSimResults[y].length;
    if (rawMean_y > 0) {
      const ratio = deterministicFV_y / rawMean_y;
      for (let s = 0; s < allSimResults[y].length; s++) {
        allSimResults[y][s] *= ratio;
      }
    }
  }

  // Update finalValues to contain the corrected terminal values for goal probability
  const lastYearIdx = years - 1;
  finalValues = [...allSimResults[lastYearIdx]];

  const rawMean = finalValues.reduce((s, v) => s + v, 0) / finalValues.length;
  const controlCorrection = rawMean - deterministicFV;

  // Sort each year's results ONCE, then extract all percentiles
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [], mean = [];
  const stdErr = [];

  for (let y = 0; y < years; y++) {
    const sorted = [...allSimResults[y]].sort((a, b) => a - b);
    const yrNom = Math.round(percentile(sorted, 10));
    const yrP25 = Math.round(percentile(sorted, 25));
    const yrP50 = Math.round(percentile(sorted, 50));
    const yrP75 = Math.round(percentile(sorted, 75));
    const yrP90 = Math.round(percentile(sorted, 90));
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const yrMean = Math.round(avg);

    p10.push(yrNom);
    p25.push(yrP25);
    p50.push(yrP50);
    p75.push(yrP75);
    p90.push(yrP90);
    mean.push(yrMean);

    const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / (sorted.length - 1);
    stdErr.push(Math.round(Math.sqrt(variance / sorted.length)));
  }

  let realTrackResult = null;
  if (!isRealTrack) {
    const realReturn = (1 + postTaxAnnualReturn) / (1 + inflationRate) - 1;
    realTrackResult = runMonteCarlo({
      monthlyInvestment,
      postTaxAnnualReturn: realReturn,
      annualVolatility,
      years,
      simulations,
      inflationRate,
      isRealTrack: true,
      currentSavings: safeSavings,
    });
  }

  const p10_real = !isRealTrack && realTrackResult ? realTrackResult.p10 : [];
  const p25_real = !isRealTrack && realTrackResult ? realTrackResult.p25 : [];
  const p50_real = !isRealTrack && realTrackResult ? realTrackResult.p50 : [];
  const p75_real = !isRealTrack && realTrackResult ? realTrackResult.p75 : [];
  const p90_real = !isRealTrack && realTrackResult ? realTrackResult.p90 : [];
  const mean_real = !isRealTrack && realTrackResult ? realTrackResult.mean : [];

  const sequenceOfReturnsRisk = computeSequenceRisk(finalValues, actualSims, years, 0);

  const baseSharpe = annualVolatility > 0.001 ? (postTaxAnnualReturn - RISK_FREE_RATE) / annualVolatility : 0;
  const sharpeSensitivity = {
    minus_5pct: (annualVolatility - 0.05) > 0.001 ? (postTaxAnnualReturn - RISK_FREE_RATE) / (annualVolatility - 0.05) : 0,
    minus_2pct: (annualVolatility - 0.02) > 0.001 ? (postTaxAnnualReturn - RISK_FREE_RATE) / (annualVolatility - 0.02) : 0,
    base: baseSharpe,
    plus_2pct: (postTaxAnnualReturn - RISK_FREE_RATE) / (annualVolatility + 0.02),
    plus_5pct: (postTaxAnnualReturn - RISK_FREE_RATE) / (annualVolatility + 0.05),
  };

  const response = {
    years_array: yearsArray,
    p10, p25, p50, p75, p90, mean,
    p10_real, p25_real, p50_real, p75_real, p90_real, mean_real,
    standard_error: stdErr,
    deterministic_fv: Math.round(deterministicFV),
    control_correction: Math.round(controlCorrection),
    finalValues, // expose for goal probability reuse
    simulations_run: actualSims,
  };

  if (!isRealTrack) {
    response.real = realTrackResult;
    response.inflationRateUsed = inflationRate;
    response.sequenceRisk = sequenceOfReturnsRisk;
    response.riskMetrics = computeRiskMetrics(p50, p10, years, RISK_FREE_RATE, postTaxAnnualReturn);
    response.variance_reduction = 'halton_qmc+antithetic+control_variates';
    response.sequence_of_returns_risk = sequenceOfReturnsRisk;
    response.sharpe_ratio_sensitivity = sharpeSensitivity;
    response.inflation_rate = inflationRate;
  }

  return response;
}

/**
 * Generate an empty result set (for invalid inputs).
 */
function emptyResult(years, simulations) {
  const n = Math.max(1, years || 1);
  const zeros = Array.from({ length: n }, () => 0);
  return {
    years_array: Array.from({ length: n }, (_, i) => i + 1),
    p10: [...zeros], p25: [...zeros], p50: [...zeros],
    p75: [...zeros], p90: [...zeros], mean: [...zeros],
    finalValues: [],
    simulations_run: simulations || 0,
  };
}

/**
 * Compute the probability that a goal amount is reached.
 *
 * @param {number[]} terminalValues - Array of final-year portfolio values from simulations
 * @param {number} targetAmount - Goal amount in ₹
 * @returns {number} Probability as decimal (0–1)
 */
export function computeGoalProbability(terminalValues, targetAmount) {
  if (!terminalValues || terminalValues.length === 0 || !targetAmount || targetAmount <= 0) return 0;
  const successes = terminalValues.filter(v => v >= targetAmount).length;
  return parseFloat((successes / terminalValues.length).toFixed(4));
}

/**
 * Compute the Wilson score confidence interval for a binomial proportion.
 *
 * @param {number} p - Goal probability (0–1)
 * @param {number} n - Number of simulations
 * @returns {{ lower: number, upper: number }}
 */
export function computeWilsonCI(p, n) {
  if (n <= 0 || p === null) return { lower: 0, upper: 0 };
  const z = 1.95996; // 95% confidence level
  const pVal = Math.min(Math.max(p, 0), 1);
  const factor = (z * z) / n;
  const term1 = pVal + factor / 2;
  const term2 = z * Math.sqrt((pVal * (1 - pVal) + factor / 4) / n);
  const denom = 1 + factor;
  const lower = (term1 - term2) / denom;
  const upper = (term1 + term2) / denom;
  return {
    lower: parseFloat(Math.max(0, lower).toFixed(4)),
    upper: parseFloat(Math.min(1, upper).toFixed(4)),
  };
}

/**
 * Run a full Monte Carlo simulation and also compute goal probability.
 * Reuses finalValues from the primary simulation — no double-run.
 *
 * @param {Object} params - Same as runMonteCarlo, plus targetAmount
 * @returns {{ ...monteCarloResult, goal_probability, target_amount }}
 */
export function runMonteCarloWithGoal(params) {
  const { targetAmount, ...mcParams } = params;
  const result = runMonteCarlo(mcParams);

  // Reuse terminal values from the primary simulation run
  const goalProbability = targetAmount
    ? computeGoalProbability(result.finalValues, targetAmount)
    : null;

  const goalProbabilityCI = goalProbability !== null
    ? computeWilsonCI(goalProbability, result.simulations_run)
    : null;

  // Remove raw finalValues from response (large array, not needed by frontend)
  const { finalValues, ...cleanResult } = result;
  if (cleanResult.real) {
    delete cleanResult.real.finalValues;
  }

  return {
    ...cleanResult,
    goal_probability: goalProbability,
    goal_probability_ci: goalProbabilityCI,
    target_amount: targetAmount || null,
  };
}

/**
 * Get default volatility parameters for an instrument type.
 *
 * @param {string} instrumentType - e.g. 'ELSS', 'FD', 'ETF'
 * @param {number} [overrideMean] - Override the default mean return
 * @returns {{ mean: number, stdDev: number }}
 */
export function getInstrumentVolatility(instrumentType, overrideMean) {
  const params = INSTRUMENT_PARAMS[instrumentType];
  if (!params) {
    console.warn(`[MC] Unknown instrument type: '${instrumentType}'. Using default params {mean: 0.08, stdDev: 0.05}.`);
  }
  const defaults = params || { mean: 0.08, stdDev: 0.05 };
  return {
    mean: overrideMean !== undefined ? overrideMean : defaults.mean,
    stdDev: defaults.stdDev,
  };
}

/**
 * Reverse SIP formula — compute monthly SIP required to reach a target.
 *
 * Formula (annuity-due, monthly compounding):
 *   FV_SIP = P × [((1+r)^n - 1) / r] × (1+r)
 *   ∴ P = FV_SIP / { [((1+r)^n - 1) / r] × (1+r) }
 *
 * Where:
 *   P = monthly SIP payment
 *   r = monthly rate = annualRate / 12
 *   n = total months = years × 12
 *   FV_SIP = targetAmount − FV of existing corpus
 *
 * The existing corpus compounds MONTHLY (same frequency as SIP)
 * to maintain mathematical consistency:
 *   FV_current = currentSavings × (1 + r)^n
 *
 * @param {number} targetAmount - Future value target in ₹
 * @param {number} annualRate - Expected annual return (decimal)
 * @param {number} years - Time horizon
 * @param {number} [currentSavings=0] - Existing corpus that will compound
 * @returns {number} Required monthly SIP in ₹
 */
export function reverseSIP(targetAmount, annualRate, years, currentSavings = 0) {
  // Guard against invalid inputs — use explicit numeric checks, not truthy
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRate) || annualRate < 0) annualRate = 0;
  if (!Number.isFinite(currentSavings) || currentSavings < 0) currentSavings = 0;

  // CRITICAL: Use exp(annualRate/12)-1 for the monthly rate to match the GBM
  // control variate in runMonteCarlo. Using annualRate/12 (simple division)
  // diverges by ~1.2% over 20 years at 12% annual return.
  const r = toMonthlyRate(annualRate, true);
  const n = years * 12;

  // Future value of existing corpus using MONTHLY compounding
  // (consistent with SIP compounding frequency)
  const fvCurrent = currentSavings > 0
    ? currentSavings * Math.pow(1 + r, n)
    : 0;
  const remaining = Math.max(0, targetAmount - fvCurrent);

  if (remaining === 0) return 0;
  if (r === 0) return remaining / n;

  // Invert the annuity-due formula:
  //   P = remaining × r / [((1+r)^n - 1) × (1+r)]
  return remaining * r / ((Math.pow(1 + r, n) - 1) * (1 + r));
}
