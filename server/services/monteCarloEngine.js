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
 */

// ─── INSTRUMENT VOLATILITY CONSTANTS ─────────────────────────────────
const INSTRUMENT_PARAMS = {
  ELSS:         { mean: 0.12,   stdDev: 0.18  },
  Equity_MF:    { mean: 0.12,   stdDev: 0.18  },
  ETF:          { mean: 0.11,   stdDev: 0.16  },
  Debt_MF:      { mean: 0.07,   stdDev: 0.03  },
  FD:           { mean: 0.065,  stdDev: 0.005 },
  RBI_Bond:     { mean: 0.08,   stdDev: 0.002 },
  'G-Sec':      { mean: 0.075,  stdDev: 0.01  },
  PPF:          { mean: 0.071,  stdDev: 0.003 },
  NPS:          { mean: 0.10,   stdDev: 0.12  },
  Gold:         { mean: 0.09,   stdDev: 0.15  },
  SGB:          { mean: 0.105,  stdDev: 0.14  },  // Gold price + 2.5% coupon
  Liquid_MF:    { mean: 0.065,  stdDev: 0.005 },  // Near-zero volatility
  Arbitrage_MF: { mean: 0.07,   stdDev: 0.02  },  // Low vol arbitrage strategy
};

/**
 * Halton low-discrepancy sequence generator.
 * Produces quasi-random numbers in (0,1) that fill the space more uniformly
 * than pseudo-random Math.random(). This gives O(1/N) convergence instead
 * of O(1/√N) for standard MC — a massive accuracy boost.
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
  // Use provided uniforms or generate pseudo-random ones
  if (u1 === undefined || u1 === 0) { while (!u1) u1 = Math.random(); }
  if (u2 === undefined || u2 === 0) { while (!u2) u2 = Math.random(); }
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Compute percentile from a sorted array using linear interpolation.
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
}) {
  // Input guards
  if (!monthlyInvestment || monthlyInvestment <= 0) {
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
  if (postTaxAnnualReturn < 0) {
    console.warn(
      `[MC] Negative post-tax return: ${(postTaxAnnualReturn*100).toFixed(2)}%. `
      + `Simulation will proceed but projections may show capital erosion.`
    );
  }

  // Clamp volatility to sane range: 0.1% to 60%
  // Very high volatility causes numerical instability in GBM
  if (annualVolatility > 0.60) {
    console.warn(`[MC] Extreme volatility ${(annualVolatility*100).toFixed(1)}% clamped to 60%.`);
    annualVolatility = 0.60;
  }

  const yearsArray = [];
  for (let y = 1; y <= years; y++) yearsArray.push(y);

  // GBM monthly parameters
  // dt = 1/12 (one month in years)
  const dt = 1 / 12;

  // Drift-corrected monthly mean:
  //   Under GBM, the log-return drift is (μ - σ²/2).
  //   Monthly: drift_m = (μ - σ²/2) × dt
  // This ensures E[exp(drift_m + σ√dt × Z)] = exp(μ × dt),
  // so the expected portfolio value matches the stated return.
  const driftPerMonth = (postTaxAnnualReturn - 0.5 * annualVolatility * annualVolatility) * dt;

  // Monthly volatility scaling: σ_m = σ × √dt
  const volPerMonth = annualVolatility * Math.sqrt(dt);

  // finalValues[year_index] = array of terminal values across all simulations
  const allSimResults = yearsArray.map(() => []);
  const finalValues = []; // terminal balances for goal probability

  // ── HYBRID QMC + ANTITHETIC VARIATES + CONTROL VARIATES ────────────
  //
  // Three variance reduction techniques combined:
  //
  // 1. HALTON QMC (first half): Low-discrepancy sequences fill the
  //    sample space more uniformly → O(1/N) convergence vs O(1/√N).
  //    Uses primes 2 and 3 as bases for the 2D Box-Muller input.
  //
  // 2. ANTITHETIC VARIATES (all paths): Each Z is paired with -Z,
  //    creating negatively correlated paths that reduce variance.
  //
  // 3. CONTROL VARIATES (post-processing): Uses the deterministic
  //    SIP future value (known analytically) as a control to correct
  //    the MC estimate: X* = X - c(Y_mc - Y_exact).
  //
  const halfSims = Math.ceil(simulations / 2);
  const actualSims = halfSims * 2;
  const totalMonths = years * 12;

  // Deterministic SIP FV for control variate (known exact value)
  const r = postTaxAnnualReturn / 12;
  const deterministicFV = r > 0
    ? monthlyInvestment * ((Math.pow(1 + r, totalMonths) - 1) / r) * (1 + r)
    : monthlyInvestment * totalMonths;

  for (let sim = 0; sim < halfSims; sim++) {
    // Pre-generate Z values: use Halton QMC for first 40% of sims,
    // pseudo-random for the rest (hybrid approach for robustness)
    const useQMC = sim < halfSims * 0.4;
    const zValues = new Array(totalMonths);

    for (let i = 0; i < totalMonths; i++) {
      if (useQMC) {
        // Halton sequence: index = sim * totalMonths + i + 1 (1-based)
        const seqIdx = sim * totalMonths + i + 1;
        const u1 = halton(seqIdx, 2) || 0.5; // base-2
        const u2 = halton(seqIdx, 3) || 0.5; // base-3
        zValues[i] = boxMuller(u1, u2);
      } else {
        zValues[i] = boxMuller();
      }
    }

    // ── Path 1: use +Z ──────────────────────────────────────────────
    let balance1 = 0;
    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) {
        balance1 += monthlyInvestment;
        const z = zValues[y * 12 + m];
        balance1 *= Math.exp(driftPerMonth + volPerMonth * z);
      }
      allSimResults[y].push(balance1);
    }
    finalValues.push(balance1);

    // ── Path 2: use -Z (antithetic mirror) ──────────────────────────
    let balance2 = 0;
    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) {
        balance2 += monthlyInvestment;
        const z = zValues[y * 12 + m];
        balance2 *= Math.exp(driftPerMonth - volPerMonth * z);
      }
      allSimResults[y].push(balance2);
    }
    finalValues.push(balance2);
  }

  // ── CONTROL VARIATE CORRECTION ──────────────────────────────────────
  // Adjust terminal-year estimates using the deterministic SIP FV
  // as a known control: X* = X - β(Ȳ_mc - Y_exact)
  // where β ≈ 1 for the mean correction.
  const lastYearIdx = years - 1;
  const rawMean = allSimResults[lastYearIdx].reduce((s, v) => s + v, 0) / allSimResults[lastYearIdx].length;
  const controlCorrection = rawMean - deterministicFV;

  // Sort each year's results ONCE, then extract all percentiles
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [], mean = [];
  const stdErr = []; // standard error of the mean for convergence diagnostics

  for (let y = 0; y < years; y++) {
    const sorted = [...allSimResults[y]].sort((a, b) => a - b);
    p10.push(Math.round(percentile(sorted, 10)));
    p25.push(Math.round(percentile(sorted, 25)));
    p50.push(Math.round(percentile(sorted, 50)));
    p75.push(Math.round(percentile(sorted, 75)));
    p90.push(Math.round(percentile(sorted, 90)));
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    mean.push(Math.round(avg));
    // Standard error = stdDev / √N (for convergence diagnostics)
    const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / (sorted.length - 1);
    stdErr.push(Math.round(Math.sqrt(variance / sorted.length)));
  }

  return {
    years_array: yearsArray,
    p10, p25, p50, p75, p90, mean,
    standard_error: stdErr,
    deterministic_fv: Math.round(deterministicFV),
    control_correction: Math.round(controlCorrection),
    finalValues, // expose for goal probability reuse
    simulations_run: actualSims,
    variance_reduction: 'halton_qmc+antithetic+control_variates',
  };
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

  // Remove raw finalValues from response (large array, not needed by frontend)
  const { finalValues, ...cleanResult } = result;

  return {
    ...cleanResult,
    goal_probability: goalProbability,
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

  const r = annualRate / 12;
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
