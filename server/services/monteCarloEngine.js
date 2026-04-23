/**
 * WealthGenie Monte Carlo Simulation Engine
 * Runs N simulations with normally distributed annual returns
 * to produce probabilistic wealth projections (percentile bands).
 *
 * Uses Box-Muller transform for random normal generation (no external deps).
 */

// ─── INSTRUMENT VOLATILITY CONSTANTS ─────────────────────────────────
const INSTRUMENT_PARAMS = {
  ELSS:       { mean: 0.12,  stdDev: 0.18  },
  Equity_MF:  { mean: 0.12,  stdDev: 0.18  },
  ETF:        { mean: 0.11,  stdDev: 0.16  },
  Debt_MF:    { mean: 0.07,  stdDev: 0.03  },
  FD:         { mean: 0.065, stdDev: 0.005 },
  RBI_Bond:   { mean: 0.08,  stdDev: 0.002 },
  'G-Sec':    { mean: 0.075, stdDev: 0.01  },
  PPF:        { mean: 0.071, stdDev: 0.003 },
  NPS:        { mean: 0.10,  stdDev: 0.12  },
  Gold:       { mean: 0.09,  stdDev: 0.15  },
};

/**
 * Box-Muller transform — generates a normally distributed random number.
 * Uses two uniform random numbers to produce one standard normal variate.
 *
 * @returns {number} A standard normal random variable (mean=0, stdDev=1)
 */
function boxMuller() {
  let u1 = 0, u2 = 0;
  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Generate a normally distributed random number with given mean and stdDev.
 *
 * @param {number} mean
 * @param {number} stdDev
 * @returns {number}
 */
function randomNormal(mean, stdDev) {
  return mean + stdDev * boxMuller();
}

/**
 * Compute percentile from a sorted array.
 *
 * @param {number[]} sortedArr - Sorted array of numbers
 * @param {number} p - Percentile (0–100)
 * @returns {number}
 */
function percentile(sortedArr, p) {
  const idx = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (idx - lower);
}

/**
 * Run Monte Carlo simulation for SIP investment.
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
  const yearsArray = [];
  for (let y = 1; y <= years; y++) yearsArray.push(y);

  // finalValues[year_index] = array of terminal values across all simulations
  const allSimResults = yearsArray.map(() => []);
  const finalValues = []; // terminal balances for goal probability

  for (let sim = 0; sim < simulations; sim++) {
    let balance = 0;

    for (let y = 0; y < years; y++) {
      // Draw annual return from Normal(mean, stdDev) for this year
      const annualReturn = randomNormal(postTaxAnnualReturn, annualVolatility);
      const monthlyReturn = annualReturn / 12;

      // Simulate 12 months of SIP contributions
      for (let m = 0; m < 12; m++) {
        balance = (balance + monthlyInvestment) * (1 + monthlyReturn);
      }

      // Record balance at end of each year
      allSimResults[y].push(Math.max(0, balance));
    }

    // Collect final-year balance for goal probability computation
    finalValues.push(Math.max(0, balance));
  }

  // Sort each year's results ONCE, then extract all percentiles
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [], mean = [];

  for (let y = 0; y < years; y++) {
    const sorted = [...allSimResults[y]].sort((a, b) => a - b);
    p10.push(Math.round(percentile(sorted, 10)));
    p25.push(Math.round(percentile(sorted, 25)));
    p50.push(Math.round(percentile(sorted, 50)));
    p75.push(Math.round(percentile(sorted, 75)));
    p90.push(Math.round(percentile(sorted, 90)));
    mean.push(Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length));
  }

  return {
    years_array: yearsArray,
    p10, p25, p50, p75, p90, mean,
    finalValues, // expose for goal probability reuse
    simulations_run: simulations,
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
  if (!terminalValues || terminalValues.length === 0) return 0;
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
  const defaults = INSTRUMENT_PARAMS[instrumentType] || { mean: 0.08, stdDev: 0.05 };
  return {
    mean: overrideMean !== undefined ? overrideMean : defaults.mean,
    stdDev: defaults.stdDev,
  };
}

/**
 * Reverse SIP formula — compute monthly SIP required to reach a target.
 * P = FV × (r/12) / [((1 + r/12)^(12×n) - 1) × (1 + r/12)]
 *
 * @param {number} targetAmount - Future value target in ₹
 * @param {number} annualRate - Expected annual return (decimal)
 * @param {number} years - Time horizon
 * @param {number} [currentSavings=0] - Existing corpus that will compound
 * @returns {number} Required monthly SIP in ₹
 */
export function reverseSIP(targetAmount, annualRate, years, currentSavings = 0) {
  const r = annualRate / 12;
  const n = years * 12;

  // Subtract future value of existing corpus
  const fvCurrent = currentSavings * Math.pow(1 + annualRate, years);
  const remaining = Math.max(0, targetAmount - fvCurrent);

  if (r === 0) return remaining / n;
  return remaining * r / ((Math.pow(1 + r, n) - 1) * (1 + r));
}
