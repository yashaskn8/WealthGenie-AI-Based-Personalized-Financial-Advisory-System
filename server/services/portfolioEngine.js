/**
 * WealthGenie Portfolio Optimisation Engine
 * ──────────────────────────────────────────
 * Mean-variance portfolio optimisation for Indian asset classes.
 *
 * Solvers implemented (all long-only, fully-invested):
 *   1. Minimum Variance Portfolio   — minimise w'Σw
 *   2. Maximum Sharpe (Tangency)    — maximise (w'μ − r_f) / √(w'Σw)
 *   3. Risk Parity                  — equalise risk contributions
 *
 * No external optimiser dependency — uses iterative gradient projection
 * onto the probability simplex (Σw_i = 1, w_i ≥ 0).
 *
 * All volatility (σ) and return (μ) data sourced from instrumentConstants.js.
 *
 * @module portfolioEngine
 * 
 * =══════════════════════════════════════════════════════════════════════════
 * 📘 BEGINNER NOTE: DIVERSIFICATION, CORRELATION & COVARIANCE
 * =========================================================================
 * 1. Diversification ("Don't put all your eggs in one basket"):
 *    If you invest 100% of your money in a single small-cap stock, and it crashes,
 *    you lose everything. By spreading your money across Equities, Gold, Government Bonds,
 *    and Fixed Deposits, you protect yourself. When one asset falls, another often rises,
 *    resulting in a smoother overall journey.
 * 
 * 2. Correlation Matrix ("How much do two investments move together?"):
 *    We represent correlation on a scale from -1.0 to +1.0:
 *    - Correlation of +1.0: Perfect alignment. If Stock MF rises, Index MF rises.
 *    - Correlation of 0.0: No relationship. Stock MF and Gold don't care about each other.
 *    - Correlation of -1.0: Opposite movement. If one goes up, the other goes down.
 *    A good portfolio combines assets with low or negative correlations to cushion shocks.
 * 
 * 3. Covariance:
 *    While correlation tells us *direction*, Covariance combines direction with *magnitude*
 *    (the volatility of the assets). It measures how much the absolute prices of two assets
 *    move in relation to each other.
 */

import { INSTRUMENT_PARAMS, RISK_FREE_RATE } from './instrumentConstants.js';

/* ═══════════════════════════════════════════════════════════════════════════
 *  ASSET KEY UNIVERSE — canonical ordering for correlation matrix
 * ═══════════════════════════════════════════════════════════════════════════ */

/** @type {string[]} Canonical ordering of asset classes in the correlation matrix */
const ASSET_KEYS = [
  'Equity_MF', 'ELSS', 'ETF', 'Debt_MF', 'FD', 'Gold', 'NPS', 'PPF',
  'RBI_Bond', 'G-Sec', 'SGB', 'Liquid_MF', 'Arbitrage_MF', 'Hybrid_MF',
  'Index_MF', 'Midcap_MF', 'Smallcap_MF',
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  CORRELATION MATRIX — Indian market empirical estimates
 * ─────────────────────────────────────────────────────────────────────────
 *  Sources: NSE historical data, CRISIL indices, AMFI factsheets.
 *  Equity types: 0.85–0.95 inter-correlated
 *  Equity–Debt:  0.10–0.20
 *  Equity–Gold:  0.05–0.15
 *  Debt types:   0.70–0.90 inter-correlated
 *  Gold–Debt:    0.15–0.25
 *  Matrix is symmetric with 1.0 on diagonal.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Lower-triangular correlation values (row-major, including diagonal = 1).
 * Full symmetric matrix is built from this at module load time.
 *
 * Row order follows ASSET_KEYS.
 */
// prettier-ignore
const CORR_LOWER = [
  /* Equity_MF   */ [1.00],
  /* ELSS        */ [0.93, 1.00],
  /* ETF         */ [0.95, 0.91, 1.00],
  /* Debt_MF     */ [0.12, 0.11, 0.13, 1.00],
  /* FD          */ [0.05, 0.05, 0.06, 0.80, 1.00],
  /* Gold        */ [0.08, 0.07, 0.09, 0.18, 0.10, 1.00],
  /* NPS         */ [0.82, 0.80, 0.83, 0.30, 0.15, 0.12, 1.00],
  /* PPF         */ [0.04, 0.04, 0.05, 0.75, 0.88, 0.08, 0.14, 1.00],
  /* RBI_Bond    */ [0.06, 0.06, 0.07, 0.82, 0.90, 0.12, 0.16, 0.85, 1.00],
  /* G-Sec       */ [0.10, 0.09, 0.11, 0.85, 0.78, 0.15, 0.20, 0.80, 0.88, 1.00],
  /* SGB         */ [0.10, 0.09, 0.11, 0.20, 0.12, 0.97, 0.14, 0.10, 0.14, 0.18, 1.00],
  /* Liquid_MF   */ [0.03, 0.03, 0.04, 0.72, 0.85, 0.08, 0.10, 0.82, 0.84, 0.70, 0.09, 1.00],
  /* Arbitrage_MF*/ [0.15, 0.14, 0.16, 0.55, 0.45, 0.10, 0.18, 0.40, 0.42, 0.50, 0.12, 0.48, 1.00],
  /* Hybrid_MF   */ [0.78, 0.76, 0.79, 0.35, 0.18, 0.15, 0.72, 0.16, 0.18, 0.25, 0.17, 0.12, 0.28, 1.00],
  /* Index_MF    */ [0.95, 0.90, 0.98, 0.13, 0.06, 0.09, 0.83, 0.05, 0.07, 0.11, 0.11, 0.04, 0.16, 0.79, 1.00],
  /* Midcap_MF   */ [0.88, 0.86, 0.85, 0.10, 0.04, 0.06, 0.78, 0.03, 0.05, 0.08, 0.08, 0.02, 0.12, 0.74, 0.86, 1.00],
  /* Smallcap_MF */ [0.82, 0.80, 0.78, 0.08, 0.03, 0.05, 0.72, 0.02, 0.04, 0.06, 0.06, 0.01, 0.10, 0.68, 0.80, 0.92, 1.00],
];

/**
 * Build the full symmetric N×N correlation matrix from the lower-triangular input.
 * @returns {number[][]}
 */
function buildFullCorrelation() {
  const n = ASSET_KEYS.length;
  const C = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const val = CORR_LOWER[i][j];
      C[i][j] = val;
      C[j][i] = val;
    }
  }
  return C;
}

/**
 * Validate if a symmetric matrix is Positive Semi-Definite (PSD) via Cholesky decomposition.
 */
function checkCholeskyPSD(matrix) {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        const val = matrix[i][i] - sum;
        if (val < -1e-9) return false;
        L[i][j] = Math.sqrt(Math.max(0, val));
      } else {
        if (L[j][j] > 1e-12) {
          L[i][j] = (matrix[i][j] - sum) / L[j][j];
        } else {
          L[i][j] = 0;
        }
      }
    }
  }
  return true;
}

/** Full correlation matrix (loaded once at module init) */
const FULL_CORR = buildFullCorrelation();

// Validate that FULL_CORR is positive semi-definite (PSD)
if (!checkCholeskyPSD(FULL_CORR)) {
  console.warn('[portfolioEngine] Warning: Master correlation matrix is not Positive Semi-Definite (PSD)! Numerical solvers may experience instability.');
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  LINEAR ALGEBRA HELPERS (pure JS, no deps)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Matrix-vector multiply: y = A·x
 * @param {number[][]|Float64Array[]} A - n×n matrix
 * @param {number[]|Float64Array} x - length-n vector
 * @returns {Float64Array}
 */
function matvec(A, x) {
  const n = x.length;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * x[j];
    y[i] = s;
  }
  return y;
}

/**
 * Dot product: x·y
 * @param {number[]|Float64Array} a
 * @param {number[]|Float64Array} b
 * @returns {number}
 */
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Portfolio variance: w'Σw
 * @param {number[][]|Float64Array[]} cov
 * @param {number[]|Float64Array} w
 * @returns {number}
 */
function portfolioVariance(cov, w) {
  return dot(w, matvec(cov, w));
}

/**
 * Portfolio volatility: √(w'Σw)
 * @param {number[][]|Float64Array[]} cov
 * @param {number[]|Float64Array} w
 * @returns {number}
 */
function portfolioVol(cov, w) {
  return Math.sqrt(Math.max(0, portfolioVariance(cov, w)));
}

/**
 * Portfolio expected return: w'μ
 * @param {number[]|Float64Array} w
 * @param {number[]|Float64Array} mu
 * @returns {number}
 */
function portfolioReturn(w, mu) {
  return dot(w, mu);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  SIMPLEX PROJECTION — Duchi et al. (2008)
 * ─────────────────────────────────────────────────────────────────────────
 *  Project a vector onto the probability simplex {x ≥ 0, Σx = 1}.
 *  O(n log n) via sorting. Essential for enforcing long-only + fully-invested.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Project vector v onto the unit simplex (Σv_i = 1, v_i ≥ 0).
 * Algorithm: Duchi, Shalev-Shwartz, Singer, Chandra (2008).
 *
 * =========================================================================
 * 📘 BEGINNER NOTE: WHAT IS SIMPLEX PROJECTION?
 * =========================================================================
 * When our optimization algorithm adjusts portfolio weights to find the best mix,
 * it might temporarily suggest impossible configurations (e.g. allocation weights
 * like 120% in Gold and -20% in Cash).
 * - "Long-only" constraint: You cannot have negative weights (no short-selling).
 * - "Fully-invested" constraint: All asset percentages must add up to exactly 100% (or 1.0).
 * Simplex Projection is a mathematical "clamping" algorithm. It takes any random set
 * of numbers and projects them onto a "probability simplex", ensuring they are all
 * positive and sum to exactly 1.0, while altering the values as little as possible.
 *
 * @param {number[]|Float64Array} v - input vector
 * @returns {Float64Array} projected vector on simplex
 */
function projectSimplex(v) {
  const n = v.length;
  const u = Array.from(v).sort((a, b) => b - a); // descending
  let cumSum = 0;
  let rho = 0;
  for (let j = 0; j < n; j++) {
    cumSum += u[j];
    if (u[j] + (1 - cumSum) / (j + 1) > 0) {
      rho = j;
    }
  }
  let cumSumRho = 0;
  for (let j = 0; j <= rho; j++) cumSumRho += u[j];
  const theta = (cumSumRho - 1) / (rho + 1);

  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = Math.max(v[i] - theta, 0);
  return w;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  COVARIANCE MATRIX BUILDER
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build the covariance matrix for a subset of asset classes.
 *
 * Formula: Σ_{ij} = ρ_{ij} × σ_i × σ_j
 *
 * Volatilities (σ) are sourced from INSTRUMENT_PARAMS in instrumentConstants.js.
 * Correlations (ρ) are from the hardcoded Indian-market correlation matrix.
 *
 * @param {string[]} assetKeys - subset of ASSET_KEYS to include
 * @returns {{ matrix: Float64Array[], assetKeys: string[] }}
 * @throws {Error} if an asset key is unknown
 */
export function buildCovarianceMatrix(assetKeys) {
  const n = assetKeys.length;
  if (n === 0) throw new Error('assetKeys must be non-empty');

  // Map each requested key to its index in the master ASSET_KEYS array
  const indices = assetKeys.map((key) => {
    let lookupKey = key;
    if (key === 'SCSS') lookupKey = 'FD';
    if (key === 'SSY') lookupKey = 'PPF';
    const idx = ASSET_KEYS.indexOf(lookupKey);
    if (idx === -1) {
      throw new Error(
        `Unknown asset key "${key}". Valid keys: ${ASSET_KEYS.join(', ')}`
      );
    }
    return idx;
  });

  // Look up volatilities
  const sigmas = assetKeys.map((key) => {
    const params = INSTRUMENT_PARAMS[key];
    if (!params) {
      throw new Error(`No INSTRUMENT_PARAMS entry for "${key}".`);
    }
    return params.volatility; // already decimal (e.g. 0.18)
  });

  // Build sub-matrix
  const cov = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cov[i][j] = FULL_CORR[indices[i]][indices[j]] * sigmas[i] * sigmas[j];
    }
  }

  return { matrix: cov, assetKeys: [...assetKeys] };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  SOLVER 1: MINIMUM VARIANCE PORTFOLIO
 * ─────────────────────────────────────────────────────────────────────────
 *  Minimise:  w'Σw
 *  Subject to: Σw_i = 1,  w_i ≥ 0
 *
 *  Method: Projected gradient descent on the simplex.
 *  Gradient of w'Σw w.r.t. w is 2Σw.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Solve for the minimum-variance portfolio (long-only, fully-invested).
 *
 * @param {string[]} assetKeys - asset classes to include
 * @param {number[]} postTaxReturns - annualised post-tax returns (decimal) per asset
 * @returns {{ weights: Object.<string,number>, expectedReturn: number,
 *             volatility: number, sharpe: number }}
 */
export function solveMinVariance(assetKeys, postTaxReturns) {
  const n = assetKeys.length;
  if (n === 0) throw new Error('assetKeys must be non-empty');
  if (postTaxReturns.length !== n) {
    throw new Error(`postTaxReturns length (${postTaxReturns.length}) must match assetKeys length (${n})`);
  }

  const { matrix: cov } = buildCovarianceMatrix(assetKeys);

  // Add adaptive diagonal regularization for numerical stability
  let maxDiag = 0;
  for (let i = 0; i < n; i++) {
    maxDiag = Math.max(maxDiag, cov[i][i]);
  }
  const regularization = 1e-6 * (maxDiag > 0 ? maxDiag : 1.0);
  for (let i = 0; i < n; i++) {
    cov[i][i] += regularization;
  }

  // Initialise with equal weights
  let w = new Float64Array(n).fill(1 / n);

  const maxIter = 5000;
  const tol = 1e-10;
  let lr = 0.5; // learning rate (adaptive)

  for (let iter = 0; iter < maxIter; iter++) {
    // Gradient: ∇(w'Σw) = 2Σw
    const grad = matvec(cov, w);
    for (let i = 0; i < n; i++) grad[i] *= 2;

    // Gradient step
    const wNew = new Float64Array(n);
    for (let i = 0; i < n; i++) wNew[i] = w[i] - lr * grad[i];

    // Project back onto simplex
    const wProj = projectSimplex(wNew);

    // Check convergence (max weight change)
    let maxDelta = 0;
    for (let i = 0; i < n; i++) maxDelta = Math.max(maxDelta, Math.abs(wProj[i] - w[i]));

    w = wProj;

    if (maxDelta < tol) break;

    // Adaptive learning rate — reduce if oscillating
    if (iter > 0 && iter % 500 === 0) lr *= 0.8;
  }

  const vol = portfolioVol(cov, w);
  const ret = portfolioReturn(w, postTaxReturns);
  const sharpe = vol > 0 ? (ret - RISK_FREE_RATE) / vol : 0;

  return {
    weights: _weightsToMap(assetKeys, w),
    expectedReturn: _round6(ret),
    volatility: _round6(vol),
    sharpe: _round4(sharpe),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  SOLVER 2: MAXIMUM SHARPE (TANGENCY) PORTFOLIO
 * ─────────────────────────────────────────────────────────────────────────
 *  Maximise:  (w'μ − r_f) / √(w'Σw)
 *  Subject to: Σw_i = 1,  w_i ≥ 0
 *
 *  Method: Projected gradient ascent on Sharpe ratio.
 *  Uses the analytical gradient of the Sharpe ratio:
 *    ∂S/∂w_i = [μ_i·σ_p − (μ_p − r_f)·(Σw)_i / σ_p] / σ_p²
 * 
 * =========================================================================
 * 📘 BEGINNER NOTE: WHAT IS THE SHARPE RATIO?
 * =========================================================================
 * Think of the Sharpe Ratio as "Return per unit of stress" (or miles per gallon for
 * your investment portfolio). 
 * 
 * If Portfolio A earns 12% return but undergoes wild 20% volatility swings, and
 * Portfolio B earns 10% return with an ultra-smooth 5% volatility, which is better?
 * The Sharpe Ratio answers this:
 * - It subtracts the Risk-Free Rate (what you could earn with zero risk, e.g. in a govt bond)
 *   from the portfolio return to find the "excess return".
 *   Excess Return = Portfolio Return - Risk-Free Rate
 * - It divides this excess return by the Portfolio Volatility.
 *   Sharpe Ratio = Excess Return / Volatility
 * 
 * A higher Sharpe ratio means you are getting more return for the risk you are taking.
 * The solver below runs gradient ascent to search for the exact weights that maximize
 * this ratio.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Solve for the maximum Sharpe ratio (tangency) portfolio.
 *
 * @param {string[]} assetKeys - asset classes to include
 * @param {number[]} postTaxReturns - annualised post-tax returns (decimal) per asset
 * @returns {{ weights: Object.<string,number>, expectedReturn: number,
 *             volatility: number, sharpe: number }}
 */
/**
 * Helper to run the projected gradient ascent for the Max Sharpe solver.
 */
function _runMaxSharpePGD(cov, mu, rf, wInit, maxIter = 8000, tol = 1e-10) {
  const n = wInit.length;
  let w = new Float64Array(wInit);
  let lr = 0.02;

  for (let iter = 0; iter < maxIter; iter++) {
    const sigmaW = matvec(cov, w);
    const portVar = dot(w, sigmaW);
    const portVol = Math.sqrt(Math.max(portVar, 1e-18));
    const portRet = dot(w, mu);
    const excessRet = portRet - rf;

    // Gradient of Sharpe ratio w.r.t. w
    const grad = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      grad[i] = (mu[i] * portVol - excessRet * sigmaW[i] / portVol) / (portVol * portVol);
    }

    // Gradient ascent (maximise)
    const wNew = new Float64Array(n);
    for (let i = 0; i < n; i++) wNew[i] = w[i] + lr * grad[i];

    const wProj = projectSimplex(wNew);

    // Convergence check
    let maxDelta = 0;
    for (let i = 0; i < n; i++) maxDelta = Math.max(maxDelta, Math.abs(wProj[i] - w[i]));

    w = wProj;
    if (maxDelta < tol) break;

    // Adaptive learning rate schedule
    if (iter > 0 && iter % 1000 === 0) lr *= 0.75;
  }

  const vol = portfolioVol(cov, w);
  const ret = portfolioReturn(w, mu);
  const sharpe = vol > 0 ? (ret - rf) / vol : 0;

  return { w, sharpe, vol, ret };
}

/**
 * Solve for the maximum Sharpe ratio (tangency) portfolio.
 * Uses a multi-start framework to ensure global optimality.
 *
 * @param {string[]} assetKeys - asset classes to include
 * @param {number[]} postTaxReturns - annualised post-tax returns (decimal) per asset
 * @returns {{ weights: Object.<string,number>, expectedReturn: number,
 *             volatility: number, sharpe: number }}
 */
export function solveMaxSharpe(assetKeys, postTaxReturns) {
  const n = assetKeys.length;
  if (n === 0) throw new Error('assetKeys must be non-empty');
  if (postTaxReturns.length !== n) {
    throw new Error(`postTaxReturns length (${postTaxReturns.length}) must match assetKeys length (${n})`);
  }

  const { matrix: cov } = buildCovarianceMatrix(assetKeys);

  // Add adaptive diagonal regularization for numerical stability
  let maxDiag = 0;
  for (let i = 0; i < n; i++) {
    maxDiag = Math.max(maxDiag, cov[i][i]);
  }
  const regularization = 1e-6 * (maxDiag > 0 ? maxDiag : 1.0);
  for (let i = 0; i < n; i++) {
    cov[i][i] += regularization;
  }

  const mu = Float64Array.from(postTaxReturns);
  const rf = RISK_FREE_RATE;

  // Excess returns
  const excessMu = new Float64Array(n);
  for (let i = 0; i < n; i++) excessMu[i] = mu[i] - rf;

  // Initialise: if all excess returns are ≤ 0, fall back to min-variance
  const anyPositive = excessMu.some((e) => e > 0);
  if (!anyPositive) {
    return solveMinVariance(assetKeys, postTaxReturns);
  }

  const candidates = [];

  // Candidate 1: Start with weights proportional to excess returns (clamped ≥ 0)
  let wExcess = new Float64Array(n);
  let sumW = 0;
  for (let i = 0; i < n; i++) {
    wExcess[i] = Math.max(excessMu[i], 0);
    sumW += wExcess[i];
  }
  if (sumW > 0) {
    for (let i = 0; i < n; i++) wExcess[i] /= sumW;
  } else {
    wExcess.fill(1 / n);
  }
  candidates.push(_runMaxSharpePGD(cov, mu, rf, wExcess));

  // Candidate 2: Equal weights starting point
  const wEqual = new Float64Array(n).fill(1 / n);
  candidates.push(_runMaxSharpePGD(cov, mu, rf, wEqual));

  // Candidate 3: Deterministic pseudo-random weights projected onto simplex
  const wRand = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    wRand[i] = Math.abs(Math.sin(i + 1));
  }
  candidates.push(_runMaxSharpePGD(cov, mu, rf, projectSimplex(wRand)));

  // Select the candidate with the highest Sharpe ratio
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].sharpe > best.sharpe) {
      best = candidates[i];
    }
  }

  const w = best.w;
  const vol = best.vol;
  const ret = best.ret;
  const sharpe = best.sharpe;

  return {
    weights: _weightsToMap(assetKeys, w),
    expectedReturn: _round6(ret),
    volatility: _round6(vol),
    sharpe: _round4(sharpe),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  SOLVER 3: RISK PARITY PORTFOLIO
 * ─────────────────────────────────────────────────────────────────────────
 *  Equalise risk contributions:  RC_i = w_i × MRC_i  ∀i
 *
 *  Where MRC_i = (Σw)_i / √(w'Σw)  (marginal risk contribution)
 *
 *  Method: iterative rescaling (Maillard, Roncalli, Teïletche 2010).
 *  w_i ← 1 / (σ_p × MRC_i), then normalise Σw_i = 1.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Solve for the risk parity portfolio (equal risk contribution).
 *
 * @param {string[]} assetKeys - asset classes to include
 * @returns {{ weights: Object.<string,number>,
 *             riskContributions: Object.<string,number>,
 *             volatility: number }}
 */
export function solveRiskParity(assetKeys) {
  const n = assetKeys.length;
  if (n === 0) throw new Error('assetKeys must be non-empty');

  const { matrix: cov } = buildCovarianceMatrix(assetKeys);

  // Initialise with equal weights
  let w = new Float64Array(n).fill(1 / n);

  const maxIter = 5000;
  const tol = 1e-10;

  for (let iter = 0; iter < maxIter; iter++) {
    const sigmaW = matvec(cov, w);
    const portVol = Math.sqrt(Math.max(dot(w, sigmaW), 1e-18));

    // Marginal risk contributions
    const mrc = new Float64Array(n);
    for (let i = 0; i < n; i++) mrc[i] = sigmaW[i] / portVol;

    // Risk contributions: RC_i = w_i × MRC_i
    const rc = new Float64Array(n);
    for (let i = 0; i < n; i++) rc[i] = w[i] * mrc[i];

    // Target: each RC_i = portVol / n (equal contribution)
    // Update: w_i ← 1 / MRC_i, then normalise
    const wNew = new Float64Array(n);
    let sumW = 0;
    for (let i = 0; i < n; i++) {
      wNew[i] = mrc[i] > 1e-18 ? 1 / mrc[i] : 1;
      sumW += wNew[i];
    }
    for (let i = 0; i < n; i++) wNew[i] /= sumW;

    // Convergence: check max change in weights
    let maxDelta = 0;
    for (let i = 0; i < n; i++) maxDelta = Math.max(maxDelta, Math.abs(wNew[i] - w[i]));

    w = wNew;
    if (maxDelta < tol) break;
  }

  // Compute final risk contributions
  const sigmaW = matvec(cov, w);
  const finalVol = Math.sqrt(Math.max(dot(w, sigmaW), 1e-18));
  const riskContributions = {};
  for (let i = 0; i < n; i++) {
    const mrc_i = sigmaW[i] / finalVol;
    riskContributions[assetKeys[i]] = _round6(w[i] * mrc_i);
  }

  return {
    weights: _weightsToMap(assetKeys, w),
    riskContributions,
    volatility: _round6(finalVol),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  DISPATCHER
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Unified dispatcher — select optimisation strategy by name.
 *
 * @param {string[]} assetKeys - asset classes to include
 * @param {number[]} postTaxReturns - annualised post-tax returns (decimal) per asset
 * @param {'min_variance'|'max_sharpe'|'risk_parity'} strategy
 * @returns {Object} optimisation result (varies by strategy)
 * @throws {Error} for unknown strategy
 */
export function optimisePortfolio(assetKeys, postTaxReturns, strategy = 'max_sharpe') {
  switch (strategy) {
    case 'min_variance':
      return { strategy, ...solveMinVariance(assetKeys, postTaxReturns) };

    case 'max_sharpe':
      return { strategy, ...solveMaxSharpe(assetKeys, postTaxReturns) };

    case 'risk_parity':
      return { strategy, ...solveRiskParity(assetKeys) };

    default:
      throw new Error(
        `Unknown optimisation strategy "${strategy}". ` +
        `Valid values: min_variance, max_sharpe, risk_parity`
      );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  INTERNAL HELPERS
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Convert a weight vector to a labelled map { assetKey: weight }.
 * Zeros out negligible weights (< 0.0001) for cleanliness.
 * @param {string[]} keys
 * @param {Float64Array} w
 * @returns {Object.<string, number>}
 */
function _weightsToMap(keys, w) {
  const n = keys.length;
  let temp = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    temp[i] = w[i] < 1e-4 ? 0 : w[i];
  }

  const MIN_ALLOCATION_FLOOR = 0.02; // 2% minimum allocation floor
  
  for (let iter = 0; iter < 10; iter++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (temp[i] < MIN_ALLOCATION_FLOOR) {
        temp[i] = 0;
      }
      sum += temp[i];
    }
    
    if (sum <= 0) {
      // Fallback: allocate 100% to the asset with the largest original weight
      let maxIdx = 0;
      let maxVal = -1;
      for (let i = 0; i < n; i++) {
        if (w[i] > maxVal) {
          maxVal = w[i];
          maxIdx = i;
        }
      }
      temp = new Float64Array(n);
      temp[maxIdx] = 1.0;
      break;
    }
    
    let belowFloor = false;
    for (let i = 0; i < n; i++) {
      if (temp[i] > 0) {
        temp[i] /= sum;
        if (temp[i] < MIN_ALLOCATION_FLOOR) {
          belowFloor = true;
        }
      }
    }
    
    if (!belowFloor) {
      break;
    }
  }

  const map = {};
  for (let i = 0; i < n; i++) {
    map[keys[i]] = _round6(temp[i]);
  }
  return map;
}

/** Round to 6 decimal places */
function _round6(x) { return Math.round(x * 1e6) / 1e6; }

/** Round to 4 decimal places */
function _round4(x) { return Math.round(x * 1e4) / 1e4; }

/**
 * Resolves standard asset key synonyms to canonical keys in INSTRUMENT_PARAMS.
 */
const CANONICAL_MAP = {
  'ppf': 'PPF',
  'fd': 'FD',
  'debt_mf': 'Debt_MF',
  'nps': 'NPS',
  'hybrid_mf': 'Hybrid_MF',
  'index_mf': 'Index_MF',
  'gold_etf': 'Gold',
  'gold': 'Gold',
  'elss': 'ELSS',
  'nifty_etf': 'ETF',
  'etf': 'ETF',
  'midcap_mf': 'Midcap_MF',
  'smallcap_mf': 'Smallcap_MF',
  'liquid_mf': 'Liquid_MF',
  'sgb': 'SGB',
  'scss': 'SCSS',
  'ssy': 'SSY',
  'equity_mf': 'Equity_MF',
  'g-sec': 'G-Sec',
  'rbi_bond': 'RBI_Bond',
  'rbi_bonds': 'RBI_Bond',
};

function resolveAssetKey(key) {
  const norm = key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (CANONICAL_MAP[norm]) return CANONICAL_MAP[norm];
  const match = Object.keys(INSTRUMENT_PARAMS).find(k => k.toLowerCase() === key.toLowerCase());
  return match || key;
}

const RISK_SCORE_MAP = {
  'Very Low': 5, 'Low': 20, 'Low-Medium': 30, 'Medium-Low': 35, 'Medium': 50, 'High': 80, 'Very High': 95
};

/**
 * Rebalancing Drift & Action Engine
 */
/**
 * Return Indian transaction cost rate (stamp duty, brokerage, exit loads, STT).
 *
 * ACCURACY NOTE: Equity MF exit loads are 1% if redeemed within 12 months
 * (SEBI mandate). ELSS has a 3-year lock-in, so exit loads don't apply to
 * compliant redemptions. We model this via the holdingMonths parameter.
 *
 * @param {string} key           - Asset class key
 * @param {boolean} isSell       - Whether this is a sell/redemption
 * @param {number} [holdingMonths=24] - How long the asset has been held (for exit load calc)
 * @returns {number} Transaction cost as a decimal fraction of trade value
 */
function getTransactionCostRate(key, isSell, holdingMonths = 24) {
  if (['Equity_MF', 'Index_MF', 'Midcap_MF', 'Smallcap_MF', 'Hybrid_MF', 'Balanced_Advantage'].includes(key)) {
    if (isSell) {
      const STT = 0.001;          // 0.1% Securities Transaction Tax on equity MF sell
      const STAMP_DUTY = 0.00005; // 0.005% stamp duty
      // SEBI mandates: exit load is typically 1% if redeemed within 12 months, 0 after
      const exitLoad = holdingMonths < 12 ? 0.01 : 0;
      return STT + STAMP_DUTY + exitLoad;
    }
    return 0.00005; // Stamp duty on buy (0.005%)
  }
  if (key === 'ELSS') {
    // ELSS has mandatory 3-year lock-in; exit load doesn't apply to compliant redemptions
    if (isSell) {
      const STT = 0.001;
      return STT; // Only STT, no exit load (lock-in enforced by AMC)
    }
    return 0.00005;
  }
  if (['ETF', 'Gold_ETF', 'Gold', 'Arbitrage_MF'].includes(key)) {
    const brokerage = 0.0005;    // 0.05% typical discount broker
    if (isSell) {
      const STT = 0.001;
      // Arbitrage MFs: exit load ~0.25% within 15-30 days, 0 after
      const exitLoad = (key === 'Arbitrage_MF' && holdingMonths < 1) ? 0.0025 : 0;
      return STT + brokerage + exitLoad;
    }
    return 0.00005 + brokerage;  // Stamp duty + brokerage on buy
  }
  if (['Debt_MF', 'Liquid_MF'].includes(key)) {
    if (isSell) {
      // Liquid MFs: graded exit load within 7 days (0.007% to 0.065%), 0 after
      // Debt MFs: typically 0.5-1% within 3-12 months
      if (key === 'Liquid_MF') {
        return holdingMonths < 1 ? 0.005 : 0; // ~0.5% average for very short holds
      }
      const exitLoad = holdingMonths < 12 ? 0.005 : 0; // 0.5% within 1 year
      return exitLoad;
    }
    return 0.00005; // Stamp duty on buy
  }
  if (['Gold_Physical'].includes(key)) {
    return isSell ? 0.005 : 0.03; // spreads/GST/making charges
  }
  if (['FD', 'SCSS'].includes(key)) {
    // FD premature withdrawal: typically 0.5-1% penalty
    if (isSell && holdingMonths < 12) return 0.01; // 1% penalty for early break
    return isSell ? 0.005 : 0.0;
  }
  return 0.0; // PPF, NPS, SGB, RBI_Bond, G-Sec: no transaction costs
}

export function computeRebalance(currentAllocation, targetAllocation, threshold = 2.0, partialRatio = 1.0, holdingMonths = 24) {
  const resolvedCurrent = {};
  let totalValue = 0;
  for (const [k, v] of Object.entries(currentAllocation || {})) {
    const val = Number(v) || 0;
    if (val < 0) continue;
    const resolved = resolveAssetKey(k);
    resolvedCurrent[resolved] = (resolvedCurrent[resolved] || 0) + val;
    totalValue += val;
  }

  if (totalValue <= 0) {
    return {
      total_portfolio_value: 0,
      drift_index: 0,
      drift_severity: 'Low',
      rebalance_recommended: false,
      before_stats: { cagr: 0, risk_score: 0 },
      after_stats: { cagr: 0, risk_score: 0 },
      assets: [],
    };
  }

  // Normalize target weights to 100%
  const targetVals = Object.values(targetAllocation || {}).map(v => Number(v) || 0);
  const maxVal = Math.max(...targetVals, 0);
  const targetSum = targetVals.reduce((s, v) => s + v, 0);

  const isDecimal = maxVal <= 1.0 && targetSum <= 1.05;
  const scale = isDecimal ? 100 : 1.0;
  const normalizedSum = targetSum * scale;

  const resolvedTarget = {};
  for (const [k, v] of Object.entries(targetAllocation || {})) {
    const val = Number(v) || 0;
    if (val < 0) continue;
    const resolved = resolveAssetKey(k);
    resolvedTarget[resolved] = (resolvedTarget[resolved] || 0) + (normalizedSum > 0 ? (val * scale / normalizedSum) * 100 : 0);
  }

  // Union of all asset keys
  const allKeys = Array.from(new Set([
    ...Object.keys(resolvedCurrent),
    ...Object.keys(resolvedTarget),
  ]));

  const assets = [];
  let sumDiff = 0;
  let beforeWeightedCAGR = 0;
  let afterWeightedCAGR = 0;
  let beforeWeightedRisk = 0;
  let afterWeightedRisk = 0;
  let totalEstimatedTransactionCost = 0;

  for (const key of allKeys) {
    const currentVal = resolvedCurrent[key] || 0;
    const targetPct = resolvedTarget[key] || 0;
    const currentPct = (currentVal / totalValue) * 100;
    const driftPct = currentPct - targetPct; // positive overweight, negative underweight

    const targetVal = (targetPct / 100) * totalValue;
    const rawCorrection = targetVal - currentVal; // positive BUY, negative SELL
    const suggestedCorrection = rawCorrection * partialRatio;

    const driftExceedsThreshold = Math.abs(driftPct) >= threshold;
    sumDiff += Math.abs(driftPct);

    // Get asset return & risk level
    const params = INSTRUMENT_PARAMS[key] || { nominalRate: 7.0, riskLevel: 'Medium', name: key };
    const nominalRate = params.nominalRate;
    const riskLevel = params.riskLevel;
    const riskWeight = RISK_SCORE_MAP[riskLevel] || 50;

    beforeWeightedCAGR += (currentPct / 100) * nominalRate;
    afterWeightedCAGR += (targetPct / 100) * nominalRate;
    beforeWeightedRisk += (currentPct / 100) * riskWeight;
    afterWeightedRisk += (targetPct / 100) * riskWeight;

    // Transaction cost modeling
    const isSell = rawCorrection < 0;
    const absCorrection = Math.abs(rawCorrection);
    const txCostRate = getTransactionCostRate(key, isSell, holdingMonths);
    const estimatedTxCost = absCorrection * txCostRate;
    totalEstimatedTransactionCost += estimatedTxCost;

    assets.push({
      asset_class: key,
      name: params.name,
      risk_level: riskLevel,
      nominal_return: nominalRate,
      current_value: _round4(currentVal),
      current_pct: _round4(currentPct),
      target_pct: _round4(targetPct),
      target_value: _round4(targetVal),
      drift_pct: _round4(driftPct),
      raw_correction: _round4(rawCorrection),
      suggested_correction: _round4(suggestedCorrection),
      action_type: Math.abs(rawCorrection) < 1.0 ? 'hold' : rawCorrection > 0 ? 'buy' : 'sell',
      rebalance_recommended: driftExceedsThreshold,
      estimated_transaction_cost: _round4(estimatedTxCost),
      transaction_cost_rate: txCostRate,
    });
  }

  const driftIndex = sumDiff / 2;
  const driftSeverity = driftIndex > 12 ? 'High' : driftIndex > 5 ? 'Moderate' : 'Low';
  const rebalanceRecommended = assets.some(a => a.rebalance_recommended);

  // Compute tracking error relative to target allocation
  let portfolioTrackingError = 0;
  try {
    const { matrix: covActive } = buildCovarianceMatrix(allKeys);
    const wDiff = new Float64Array(allKeys.length);
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i];
      const currentPct = (resolvedCurrent[key] || 0) / totalValue;
      const targetPct = (resolvedTarget[key] || 0) / 100;
      wDiff[i] = currentPct - targetPct;
    }
    const diffVar = portfolioVariance(covActive, wDiff);
    portfolioTrackingError = Math.sqrt(Math.max(0, diffVar));
  } catch (e) {
    console.error('[portfolioEngine] Tracking error calculation failed:', e);
  }

  return {
    total_portfolio_value: _round4(totalValue),
    drift_index: _round4(driftIndex),
    drift_severity: driftSeverity,
    rebalance_recommended: rebalanceRecommended,
    total_estimated_transaction_cost: _round4(totalEstimatedTransactionCost),
    portfolio_tracking_error: _round6(portfolioTrackingError),
    before_stats: {
      cagr: _round4(beforeWeightedCAGR),
      risk_score: _round4(beforeWeightedRisk),
    },
    after_stats: {
      cagr: _round4(afterWeightedCAGR),
      risk_score: _round4(afterWeightedRisk),
    },
    assets: assets.sort((a, b) => b.drift_pct - a.drift_pct), // Sort by drift descending
  };
}
