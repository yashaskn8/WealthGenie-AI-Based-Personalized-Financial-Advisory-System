/**
 * WealthGenie XIRR Calculator — Newton-Raphson Implementation
 *
 * XIRR (Extended Internal Rate of Return) computes the annualized return
 * for a series of irregular cash flows. This is the gold standard for
 * evaluating SIP performance since each installment has a different
 * holding period.
 *
 * Mathematical basis:
 *   Solve for r in: Σ C_i / (1 + r)^((D_i - D_0) / 365.25) = 0
 *   Using Newton-Raphson: r_{n+1} = r_n - f(r_n) / f'(r_n)
 *
 * Convergence: typically 5-15 iterations for tolerance = 1e-10.
 * 
 * =========================================================================
 * 📘 BEGINNER NOTE: WHY XIRR & HOW THE SOLVER WORKS
 * =========================================================================
 * 1. Why simple return is wrong: 
 *    If you invest ₹10,000 every month for 12 months (total ₹120,000) and end up
 *    with ₹130,000, your simple return is ₹10,000 / ₹120,000 = 8.33%.
 *    But the first ₹10,000 was invested for a full year, while the last ₹10,000
 *    was only invested for 1 month! The actual annualized rate at which your money
 *    compounded (XIRR) is much higher (~16%). XIRR accounts for *when* each cashflow occurred.
 * 
 * 2. Net Present Value (NPV) in plain terms:
 *    NPV answers: "If I discount all my future transactions back to today using a interest
 *    rate 'r', what is the total sum worth today?"
 *    XIRR is the exact interest rate 'r' that makes the NPV of all cashflows equal to 0.
 * 
 * 3. Newton-Raphson Method: 
 *    There is no algebraic formula to solve the XIRR equation directly. We must guess.
 *    - Newton-Raphson is a calculus technique. It starts with an initial guess (e.g. 10%).
 *    - It evaluates the NPV and uses the derivative (slope) of the NPV curve at that point
 *      to calculate exactly where the curve likely crosses zero.
 *    - It repeats (iterates) this guess-and-correct cycle. Usually, it finds the exact rate 
 *      within 5 to 10 iterations (milliseconds).
 * 
 * 4. Brent's Method Fallback:
 *    If cashflows are highly irregular or opposite in signs, the slope (derivative) might become
 *    flat (zero), causing Newton-Raphson to fail or shoot off to infinity.
 *    In those cases, the calculator falls back to Brent's Method — a robust, bulletproof search
 *    algorithm that is guaranteed to find the rate by trapping it in a narrowing bracket.
 */

/**
 * Compute NPV (Net Present Value) for a given rate.
 *
 * @param {number} rate - Annual rate (decimal)
 * @param {Array<{amount: number, date: Date}>} cashflows - Array of {amount, date}
 * @returns {number} NPV at the given rate
 */
function npv(rate, cashflows) {
  const d0 = cashflows[0].date.getTime();
  let total = 0;
  for (let i = 0; i < cashflows.length; i++) {
    const daysDiff = (cashflows[i].date.getTime() - d0) / 86400000; // ms → days
    const exponent = daysDiff / 365.25;
    total += cashflows[i].amount / Math.pow(1 + rate, exponent);
  }
  return total;
}

/**
 * Compute derivative of NPV with respect to rate (for Newton-Raphson).
 *
 * @param {number} rate - Annual rate (decimal)
 * @param {Array<{amount: number, date: Date}>} cashflows
 * @returns {number} dNPV/dRate
 */
function npvDerivative(rate, cashflows) {
  const d0 = cashflows[0].date.getTime();
  let total = 0;
  for (let i = 0; i < cashflows.length; i++) {
    const daysDiff = (cashflows[i].date.getTime() - d0) / 86400000;
    const exponent = daysDiff / 365.25;
    total -= exponent * cashflows[i].amount / Math.pow(1 + rate, exponent + 1);
  }
  return total;
}

/**
 * Brent's method solver as fallback for robust root finding.
 */
function brentSolve(low, high, cashflows, tolerance = 1e-10, maxIter = 100) {
  let a = low;
  let b = high;
  let fa = npv(a, cashflows);
  let fb = npv(b, cashflows);

  if (fa === 0) {
    return { rate: a, converged: true, iterations: 0 };
  }
  if (fb === 0) {
    return { rate: b, converged: true, iterations: 0 };
  }
  if (fa * fb > 0) {
    return null;
  }

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iter = 0; iter < maxIter; iter++) {
    if (fb === 0 || Math.abs(b - a) < tolerance) {
      return { rate: b, converged: true, iterations: iter };
    }

    if (fa * fb > 0) {
      a = c;
      fa = fc;
      d = b - a;
      e = d;
    }

    if (Math.abs(fa) < Math.abs(fb)) {
      c = b; b = a; a = c;
      fc = fb; fb = fa; fa = fc;
    }

    const tol = 2 * 2.220446049250313e-16 * Math.abs(b) + tolerance / 2;
    const m = (a - b) / 2;

    if (Math.abs(m) <= tol || fb === 0) {
      return { rate: b, converged: true, iterations: iter };
    }

    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      let s = fb / fa;
      let p, q;
      if (a === c) {
        p = 2 * m * s;
        q = 1 - s;
      } else {
        let r = fa / fc;
        let t = fb / fc;
        p = s * (2 * m * r * (r - t) - (b - a) * (t - 1));
        q = (r - 1) * (t - 1) * (s - 1);
      }

      if (p > 0) {
        q = -q;
      } else {
        p = -p;
      }

      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else {
        d = m;
        e = d;
      }
    } else {
      d = m;
      e = d;
    }

    c = b;
    fc = fb;

    if (Math.abs(d) > tol) {
      b += d;
    } else {
      b += m > 0 ? tol : -tol;
    }
    fb = npv(b, cashflows);
  }

  return { rate: b, converged: false, iterations: maxIter };
}

/**
 * Compute XIRR using Newton-Raphson iteration.
 *
 * @param {Array<{amount: number, date: Date|string}>} cashflows
 *   First entry should be negative (investment), last should be positive (redemption/current value).
 * @param {number} [guess=0.1] - Initial guess for rate (10%)
 * @param {number} [tolerance=1e-10] - Convergence threshold
 * @param {number} [maxIterations=100] - Max Newton-Raphson iterations
 * @returns {{
 *   rate: number,
 *   converged: boolean,
 *   iterations: number,
 *   npvResidual: number,
 *   annualizedReturn: string
 * }}
 */
export function computeXIRR(cashflows, guess = 0.1, tolerance = 1e-10, maxIterations = 100) {
  // Input validation
  if (!Array.isArray(cashflows) || cashflows.length < 2) {
    return { rate: 0, converged: false, iterations: 0, npvResidual: NaN, error: 'Need at least 2 cashflows' };
  }

  // Normalize dates to UTC midnight and aggregate cashflows on the same date
  const dateGroups = new Map();
  for (const cf of cashflows) {
    const d = cf.date instanceof Date ? cf.date : new Date(cf.date);
    const utcTime = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const amount = Number(cf.amount);
    if (Number.isFinite(amount)) {
      dateGroups.set(utcTime, (dateGroups.get(utcTime) || 0) + amount);
    }
  }

  const normalized = Array.from(dateGroups.entries()).map(([time, amount]) => ({
    amount,
    date: new Date(time),
  }));

  // Validate: at least one positive and one negative cashflow
  const hasPositive = normalized.some(cf => cf.amount > 0);
  const hasNegative = normalized.some(cf => cf.amount < 0);
  if (!hasPositive || !hasNegative) {
    return { rate: 0, converged: false, iterations: 0, npvResidual: NaN, error: 'Need both positive and negative cashflows' };
  }

  // Sort by date (ascending)
  normalized.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Search bounds for bracket finding
  let lowRate = -0.99;
  let highRate = 50.0;
  
  // Fine grid search to locate the TIGHTEST bracket where NPV changes sign
  // Use 400 evenly spaced points across [-0.99, 10.0] for resolution ~0.027
  let foundBracket = false;
  const gridSteps = 400;
  const gridMin = -0.99;
  const gridMax = 50.0;
  const gridRange = gridMax - gridMin;
  
  let prevR = gridMin;
  let prevV = npv(prevR, normalized);
  
  for (let step = 1; step <= gridSteps; step++) {
    const r = gridMin + (gridRange / gridSteps) * step;
    const v = npv(r, normalized);
    if (prevV * v < 0) {
      // Found a sign change — this is the tightest bracket from the grid
      lowRate = prevR;
      highRate = r;
      foundBracket = true;
      break;
    }
    prevR = r;
    prevV = v;
  }

  // Compute a scale factor for relative NPV tolerance based on cashflow magnitudes
  const cashflowScale = normalized.reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
  const npvTolerance = Math.max(cashflowScale * 1e-9, 1e-6);

  let rate = guess;
  let iterations = 0;
  let converged = false;

  // PHASE 1: If we have a bracket, use bisection to narrow it to a tight interval first
  if (foundBracket) {
    let lo = lowRate, hi = highRate;
    for (let i = 0; i < 100; i++) {
      iterations++;
      const mid = (lo + hi) / 2;
      const valMid = npv(mid, normalized);
      if (Math.abs(valMid) < npvTolerance || (hi - lo) < tolerance) {
        rate = mid;
        converged = true;
        break;
      }
      if (npv(lo, normalized) * valMid < 0) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    if (!converged) {
      // Bisection narrowed the bracket — use midpoint as starting point for Newton
      rate = (lo + hi) / 2;
      lowRate = lo;
      highRate = hi;
    }
  }

  // PHASE 2: Polish with Newton-Raphson (if not already converged)
  if (!converged) {
    for (let i = 0; i < maxIterations; i++) {
      iterations++;
      const val = npv(rate, normalized);

      // Check if we've already converged via NPV
      if (Math.abs(val) < npvTolerance) {
        converged = true;
        break;
      }

      const deriv = npvDerivative(rate, normalized);

      let nextRate;
      if (Math.abs(deriv) > 1e-12) {
        nextRate = rate - val / deriv;
      } else {
        nextRate = foundBracket ? (lowRate + highRate) / 2 : rate + 0.05;
      }

      // Clamp to absolute bounds
      nextRate = Math.max(-0.99, Math.min(nextRate, 50.0));

      // If we have a bracket, keep Newton within it
      if (foundBracket && (nextRate <= lowRate || nextRate >= highRate)) {
        nextRate = (lowRate + highRate) / 2;
      }

      // Update bracket boundaries if applicable
      if (foundBracket) {
        const valNext = npv(nextRate, normalized);
        const valLow = npv(lowRate, normalized);
        if (valNext * valLow < 0) {
          highRate = nextRate;
        } else {
          lowRate = nextRate;
        }
      }

      // Check dual convergence
      if (Math.abs(nextRate - rate) < tolerance && Math.abs(npv(nextRate, normalized)) < npvTolerance) {
        rate = nextRate;
        converged = true;
        break;
      }

      rate = nextRate;
    }
  }

  // PHASE 3: Brent's Method fallback
  if (!converged && foundBracket) {
    const brentResult = brentSolve(lowRate, highRate, normalized, tolerance, maxIterations);
    if (brentResult) {
      rate = brentResult.rate;
      iterations += brentResult.iterations;
      converged = brentResult.converged;
    }
  }

  const finalNpv = npv(rate, normalized);

  if (converged) {
    return {
      rate: parseFloat(rate.toFixed(8)),
      converged: true,
      iterations,
      npvResidual: parseFloat(finalNpv.toFixed(6)),
      annualizedReturn: `${(rate * 100).toFixed(2)}%`,
    };
  }

  // Failed to converge — return best estimate
  return {
    rate: parseFloat(rate.toFixed(8)),
    converged: false,
    iterations,
    npvResidual: parseFloat(finalNpv.toFixed(6)),
    annualizedReturn: `${(rate * 100).toFixed(2)}%`,
    warning: 'Newton-Raphson did not converge within max iterations',
  };
}

/**
 * Add months to a date, clamping the day of the month to prevent rollover issues
 * (e.g. Jan 31st + 1 month clamping to Feb 28th/29th instead of rolling into March).
 */
function addMonthsClamp(date, months) {
  const d = new Date(date.getTime());
  const expectedMonth = (d.getMonth() + months) % 12;
  d.setMonth(d.getMonth() + months);
  if (d.getMonth() !== expectedMonth) {
    d.setDate(0); // set to last day of expected month
  }
  return d;
}

/**
 * Compute XIRR for a SIP investment.
 * Convenience wrapper that generates cashflows from SIP parameters.
 *
 * @param {number} monthlySIP - Monthly SIP amount (₹)
 * @param {number} months - Total months of investment
 * @param {number} currentValue - Current portfolio value (₹)
 * @param {Date} [startDate] - SIP start date (defaults to `months` months ago)
 * @returns {object} XIRR result
 */
export function computeSIPXIRR(monthlySIP, months, currentValue, startDate) {
  if (!Number.isFinite(monthlySIP) || monthlySIP <= 0) return { rate: 0, converged: false, error: 'Invalid SIP amount' };
  if (!Number.isFinite(months) || months < 1) return { rate: 0, converged: false, error: 'Invalid months' };
  if (!Number.isFinite(currentValue) || currentValue <= 0) return { rate: 0, converged: false, error: 'Invalid current value' };

  const now = new Date();
  let start = startDate;
  if (!start) {
    start = new Date(now.getTime());
    start.setMonth(start.getMonth() - months);
  }
  const cashflows = [];

  // Each SIP installment is a negative cashflow (money going out)
  for (let i = 0; i < months; i++) {
    const date = addMonthsClamp(start, i);
    cashflows.push({ amount: -monthlySIP, date });
  }

  // Current value is a positive cashflow (money coming back)
  cashflows.push({ amount: currentValue, date: now });

  return computeXIRR(cashflows);
}
