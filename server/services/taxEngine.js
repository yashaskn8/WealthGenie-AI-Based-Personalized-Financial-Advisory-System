/**
 * WealthGenie Tax Engine — FY2025-26 Indian Income Tax Calculator
 * Supports both New Tax Regime (default) and Old Tax Regime.
 * Includes 4% Health & Education Cess and Section 87A rebate.
 */

// ─── FY2025-26 NEW TAX REGIME SLABS ───────────────────────────────
const NEW_REGIME_SLABS = [
  { min: 0,        max: 400000,   rate: 0    },
  { min: 400000,   max: 800000,   rate: 0.05 },
  { min: 800000,   max: 1200000,  rate: 0.10 },
  { min: 1200000,  max: 1600000,  rate: 0.15 },
  { min: 1600000,  max: 2000000,  rate: 0.20 },
  { min: 2000000,  max: 2400000,  rate: 0.25 },
  { min: 2400000,  max: Infinity, rate: 0.30 },
];

// ─── OLD TAX REGIME SLABS ─────────────────────────────────────────
const OLD_REGIME_SLABS = [
  { min: 0,        max: 250000,   rate: 0    },
  { min: 250000,   max: 500000,   rate: 0.05 },
  { min: 500000,   max: 1000000,  rate: 0.20 },
  { min: 1000000,  max: Infinity, rate: 0.30 },
];

const CESS_RATE = 0.04; // 4% Health & Education Cess

/**
 * Calculate tax from slab structure.
 * @param {number} taxableIncome
 * @param {Array} slabs
 * @returns {number} tax before cess
 */
function calculateFromSlabs(taxableIncome, slabs) {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.min) break;
    const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
    tax += taxableInSlab * slab.rate;
  }
  return tax;
}

/**
 * Compute full tax breakdown for a given annual income.
 *
 * @param {number} annualIncome - Gross annual income in ₹
 * @param {string} regime - 'new' (default) or 'old'
 * @returns {{ taxAmount, effectiveRate, regime, rebateApplied, cess, taxBeforeCess, taxableIncome }}
 */
export function computeTax(annualIncome, regime = 'new') {
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

  // Standard deduction
  const standardDeduction = regime === 'new' ? 75000 : 50000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);

  let taxBeforeCess = calculateFromSlabs(taxableIncome, slabs);

  // Section 87A rebate
  let rebateApplied = false;
  if (regime === 'new' && taxableIncome <= 1200000) {
    taxBeforeCess = 0;
    rebateApplied = true;
  } else if (regime === 'old' && taxableIncome <= 500000) {
    taxBeforeCess = 0;
    rebateApplied = true;
  }

  // 4% Health & Education Cess
  const cess = taxBeforeCess * CESS_RATE;
  const taxAmount = taxBeforeCess + cess;
  const effectiveRate = annualIncome > 0
    ? parseFloat(((taxAmount / annualIncome) * 100).toFixed(2))
    : 0;

  return {
    taxAmount: Math.round(taxAmount),
    effectiveRate,
    regime,
    rebateApplied,
    cess: Math.round(cess),
    taxBeforeCess: Math.round(taxBeforeCess),
    taxableIncome,
    annualIncome,
    standardDeduction,
  };
}

/**
 * Get the marginal (highest applicable) tax slab percentage.
 *
 * @param {number} annualIncome - Gross annual income in ₹
 * @param {string} regime - 'new' or 'old'
 * @returns {number} marginal tax rate as decimal (e.g. 0.30 for 30%)
 */
export function getTaxSlab(annualIncome, regime = 'new') {
  const standardDeduction = regime === 'new' ? 75000 : 50000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

  let marginalRate = 0;
  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      marginalRate = slab.rate;
    }
  }

  // If rebate applies, effective marginal rate is 0 for FD-interest-type calculations
  // But we return the *statutory* marginal rate for post-tax calculations on *incremental* income
  return marginalRate;
}

/**
 * Compare both regimes and return the better one.
 *
 * @param {number} annualIncome
 * @returns {{ newRegime, oldRegime, recommended }}
 */
export function compareTaxRegimes(annualIncome) {
  const newRegime = computeTax(annualIncome, 'new');
  const oldRegime = computeTax(annualIncome, 'old');
  const recommended = newRegime.taxAmount <= oldRegime.taxAmount ? 'new' : 'old';
  return { newRegime, oldRegime, recommended };
}
