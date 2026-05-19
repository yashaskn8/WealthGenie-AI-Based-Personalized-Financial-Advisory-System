/**
 * WealthGenie Projection Engine
 * Generates wealth projections using Lump Sum (compound interest) and SIP formulas.
 * Output is structured for direct consumption by Recharts multi-line charts.
 *
 * Mathematical basis:
 *   SIP FV (annuity-due) = P × [((1+r)^n - 1) / r] × (1+r)
 *   Lump Sum FV = PV × (1+r)^n
 * Where r = annualRate/12 (monthly compounding), n = years × 12.
 */

/**
 * Lump Sum (Compound Interest) Future Value.
 * FV = P × (1 + r)^n
 *
 * @param {number} principal - One-time investment amount (₹)
 * @param {number} annualRate - Post-tax annual return rate (decimal, e.g. 0.07)
 * @param {number} years - Number of years
 * @returns {number} Future value (non-negative)
 */
export function lumpSumFV(principal, annualRate, years) {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRate)) return 0;
  // Clamp rate to prevent absurd values (max 50% p.a.)
  const safeRate = Math.max(-0.5, Math.min(annualRate, 0.50));
  return Math.max(0, principal * Math.pow(1 + safeRate, years));
}

/**
 * SIP (Systematic Investment Plan) Future Value — Annuity Due.
 * FV = P × [((1 + r)^n - 1) / r] × (1 + r)
 *
 * Investment made at the START of each month (annuity-due),
 * so the first SIP earns a full month of returns.
 *
 * @param {number} monthlyInvestment - Monthly SIP amount (₹)
 * @param {number} annualRate - Post-tax annual return rate (decimal, e.g. 0.07)
 * @param {number} years - Number of years
 * @returns {number} Future value (non-negative)
 */
export function sipFV(monthlyInvestment, annualRate, years) {
  if (!Number.isFinite(monthlyInvestment) || monthlyInvestment <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRate)) return 0;

  // Clamp rate to prevent absurd values
  const safeRate = Math.max(-0.5, Math.min(annualRate, 0.50));
  const r = safeRate / 12;
  const n = years * 12;

  // Edge case: zero rate → simple sum
  if (Math.abs(r) < 1e-10) return monthlyInvestment * n;

  return Math.max(0, monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

/**
 * Reverse SIP — compute the monthly SIP required to accumulate a target FV.
 * P = FV / [((1 + r)^n - 1) / r × (1 + r)]
 *
 * @param {number} targetFV - Target future value (₹)
 * @param {number} annualRate - Post-tax annual return rate (decimal)
 * @param {number} years - Time horizon
 * @returns {number} Required monthly SIP (₹)
 */
export function reverseSIPFromFV(targetFV, annualRate, years) {
  if (!Number.isFinite(targetFV) || targetFV <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRate)) return 0;

  const r = annualRate / 12;
  const n = years * 12;

  if (Math.abs(r) < 1e-10) return targetFV / n;
  return targetFV * r / ((Math.pow(1 + r, n) - 1) * (1 + r));
}

/**
 * Compute CAGR (Compound Annual Growth Rate) from initial and final values.
 * CAGR = (FV/PV)^(1/n) - 1
 *
 * @param {number} initialValue - Starting value
 * @param {number} finalValue - Ending value
 * @param {number} years - Number of years
 * @returns {number} CAGR as decimal (e.g. 0.12 for 12%)
 */
export function computeCAGR(initialValue, finalValue, years) {
  if (!Number.isFinite(initialValue) || initialValue <= 0) return 0;
  if (!Number.isFinite(finalValue) || finalValue <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  return Math.pow(finalValue / initialValue, 1 / years) - 1;
}

/**
 * Compute inflation-adjusted (real) return.
 * real_rate = ((1 + nominal) / (1 + inflation)) - 1
 *
 * @param {number} nominalRate - Nominal annual return (decimal)
 * @param {number} inflationRate - Annual inflation rate (decimal, default 6%)
 * @returns {number} Real return as decimal
 */
export function realReturn(nominalRate, inflationRate = 0.06) {
  if (!Number.isFinite(nominalRate)) return 0;
  if (!Number.isFinite(inflationRate) || inflationRate <= -1) return nominalRate;
  return ((1 + nominalRate) / (1 + inflationRate)) - 1;
}

/**
 * Generate multi-instrument projections for Recharts consumption.
 *
 * @param {number} monthlyInvestment - Monthly SIP amount per instrument (₹)
 * @param {Array<{name: string, type: string}>} instruments - Array of instrument objects
 * @param {Object} postTaxRates - Map of instrument name → post-tax annual rate (decimal)
 * @param {number[]} years - Projection years (default: [5, 10, 15, 20])
 * @returns {{ labels, series, totalInvested, chartData }}
 */
export function generateProjections(
  monthlyInvestment,
  instruments,
  postTaxRates,
  years = [5, 10, 15, 20]
) {
  // Input guards
  if (!Number.isFinite(monthlyInvestment) || monthlyInvestment <= 0) {
    return { labels: years, series: [], totalInvested: {}, chartData: [] };
  }
  if (!instruments || instruments.length === 0) {
    return { labels: years, series: [], totalInvested: {}, chartData: [] };
  }

  const labels = [...years].filter(y => Number.isFinite(y) && y > 0);

  // Total invested at each year mark
  const totalInvested = {};
  labels.forEach(y => {
    totalInvested[y] = monthlyInvestment * 12 * y;
  });

  // Build series for each instrument
  const series = instruments.map(inst => {
    let rate = postTaxRates[inst.name] || postTaxRates[inst.type] || 0;

    // Guard: NaN or Infinity rates default to 0
    if (!Number.isFinite(rate)) {
      console.warn(`[Projection] Non-finite rate for ${inst.name}: ${rate}, defaulting to 0`);
      rate = 0;
    }

    // CRITICAL: postTaxRates values come from effectiveYield which is in PERCENTAGE (e.g. 6.5 for 6.5%).
    // sipFV expects a DECIMAL rate (e.g. 0.065). Convert here.
    const decimalRate = rate > 1 ? rate / 100 : rate;

    if (decimalRate === 0) {
      console.warn(`[Projection] Zero effective rate for ${inst.name}. Chart will show flat-line (no growth).`);
    }

    const data = labels.map(y => Math.round(sipFV(monthlyInvestment, decimalRate, y)));

    return {
      name: inst.name,
      type: inst.type || 'Unknown',
      postTaxRate: parseFloat((decimalRate * 100).toFixed(2)),
      data,
    };
  });

  // Recharts-friendly dataset (array of objects per year)
  const chartData = labels.map((year, idx) => {
    const point = { year, invested: totalInvested[year] };
    series.forEach(s => {
      point[s.name] = s.data[idx];
    });
    return point;
  });

  return {
    labels,
    series,
    totalInvested,
    chartData,
  };
}

/**
 * Format large INR values in Lakhs/Crores for chart display.
 *
 * @param {number} value
 * @returns {string}
 */
export function formatINR(value) {
  if (!Number.isFinite(value)) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}
