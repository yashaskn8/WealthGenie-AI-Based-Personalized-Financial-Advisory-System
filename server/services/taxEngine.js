import { CESS_RATE } from './instrumentConstants.js';

/**
 * WealthGenie Tax Engine — FY2025-26 Indian Income Tax Calculator
 * Supports both New Tax Regime (default) and Old Tax Regime.
 * Includes 4% Health & Education Cess and Section 87A rebate.
 *
 * =========================================================================
 * 📘 BEGINNER NOTE: INDIA'S PROGRESSIVE INCOME TAX SYSTEM
 * =========================================================================
 * India uses a "progressive" tax system. This means you do not pay a single flat
 * tax rate on your entire income. Instead, your income is taxed in "layers" or "slabs".
 * 
 * For example, in the New Regime:
 * - Your first ₹4,000,000 (0 to 4L) is taxed at 0%.
 * - Your next ₹4,000,000 (4L to 8L) is taxed at 5%.
 * - Your next ₹4,000,000 (8L to 12L) is taxed at 10%, and so on.
 * 
 * If you earn ₹1,000,000, your tax is NOT 10% of 10L (₹100,000). 
 * It is calculated as:
 * - 0% on first 4L = ₹0
 * - 5% on next 4L (4L to 8L) = ₹20,000
 * - 10% on remaining 2L (8L to 10L) = ₹20,000
 * - Total Base Tax = ₹40,000 (plus rebate/cess adjustments).
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

// CESS_RATE imported from instrumentConstants.js (single source of truth)

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
 * Compute surcharge on base tax for high-income individuals.
 * Surcharge applies to base tax (before cess), based on taxable income.
 *
 * New regime surcharge rates (Finance Act 2023 onwards):
 *   ₹50L – ₹1Cr:    10%
 *   ₹1Cr – ₹2Cr:    15%
 *   Above ₹2Cr:     25% (capped at 25% for new regime)
 *
 * Old regime surcharge rates:
 *   ₹50L – ₹1Cr:    10%
 *   ₹1Cr – ₹2Cr:    15%
 *   ₹2Cr – ₹5Cr:    25%
 *   Above ₹5Cr:     37%
 *
 * @param {number} taxBeforeSurcharge - Base tax amount
 * @param {number} taxableIncome - Taxable income after deductions
 * @param {string} regime - 'new' or 'old'
 * @returns {number} surcharge amount
 */
function computeSurcharge(taxBeforeSurcharge, taxableIncome, regime) {
  if (taxableIncome <= 5000000) return 0; // Below ₹50L: no surcharge

  let surchargeRate = 0;

  if (regime === 'new') {
    if (taxableIncome <= 10000000)       surchargeRate = 0.10;
    else if (taxableIncome <= 20000000)  surchargeRate = 0.15;
    else                                 surchargeRate = 0.25;
  } else {
    // Old regime
    if (taxableIncome <= 10000000)       surchargeRate = 0.10;
    else if (taxableIncome <= 20000000)  surchargeRate = 0.15;
    else if (taxableIncome <= 50000000)  surchargeRate = 0.25;
    else                                 surchargeRate = 0.37;
  }

  return taxBeforeSurcharge * surchargeRate;
}

/**
 * Compute surcharge WITH marginal relief.
 *
 * =========================================================================
 * 📘 BEGINNER NOTE: WHAT IS SURCHARGE MARGINAL RELIEF & THE CLIFF EFFECT?
 * =========================================================================
 * A Surcharge is an "extra tax on tax" applied to high-income earners (over ₹50L).
 * Think of it as a penalty: "If you pay ₹10L in tax, and have a 10% surcharge,
 * you pay an extra ₹1L to the government."
 * 
 * Surcharges apply abruptly at thresholds (like ₹50L, ₹1Cr, ₹2Cr). Without "Marginal
 * Relief", earning ₹1 above a threshold could cost you thousands in extra taxes.
 * 
 * For example:
 * - Suppose at ₹50,00,000 income, your tax is ₹13,12,500. No surcharge is due.
 * - Suppose you earn ₹50,00,001 (₹1 more). This triggers a 10% surcharge on your tax!
 *   Your tax + surcharge becomes ₹13,12,500 + ₹1,31,250 = ₹14,43,750.
 *   Earning ₹1 more just cost you ₹1,31,250 in extra tax!
 * 
 * "Marginal Relief" fixes this absurdity by capping the tax increase. It ensures that 
 * the increase in your tax (tax + surcharge) can never be greater than the increase in
 * your income above the threshold.
 *
 * @param {number} taxBeforeSurcharge
 * @param {number} taxableIncome
 * @param {string} regime
 * @param {Array} slabs - Tax slab structure for the regime
 * @returns {number} surcharge amount (with marginal relief applied if needed)
 */
function computeMarginalRelief(baseTax, surcharge, taxableIncome, regime) {
  if (taxableIncome <= 5000000) return 0;

  const SURCHARGE_THRESHOLDS = regime === 'new'
    ? [5000000, 10000000, 20000000]
    : [5000000, 10000000, 20000000, 50000000];

  // Find the highest active threshold strictly below the taxable income
  let threshold = 5000000;
  for (const t of SURCHARGE_THRESHOLDS) {
    if (taxableIncome > t) {
      threshold = t;
    }
  }

  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const baseTaxAtThreshold = calculateFromSlabs(threshold, slabs);

  // Surcharge rate AT exactly the threshold limit
  let thresholdSurchargeRate = 0;
  if (threshold === 10000000) {
    thresholdSurchargeRate = 0.10;
  } else if (threshold === 20000000) {
    thresholdSurchargeRate = 0.15;
  } else if (threshold === 50000000 && regime === 'old') {
    thresholdSurchargeRate = 0.25;
  }

  const taxAtThreshold = baseTaxAtThreshold * (1 + thresholdSurchargeRate);

  // Total tax at actual income
  const totalActual = baseTax + surcharge;

  // Income gain above threshold
  const incomeGain = taxableIncome - threshold;

  // Relief: tax should not exceed tax-at-threshold + income-gain
  const maxAllowedTax = taxAtThreshold + incomeGain;
  const marginalRelief = totalActual > maxAllowedTax ? totalActual - maxAllowedTax : 0;

  return Math.round(marginalRelief);
}

/**
 * Helper to compute allowed standard and section-wise deductions and taxable income.
 *
 * @param {number} annualIncome
 * @param {string} regime
 * @param {Object} deductions
 * @param {string} incomeSource
 * @returns {{ standardDeduction, oldRegimeDeductions, taxableIncome }}
 */
export function calculateTaxableIncome(annualIncome, regime = 'new', deductions = {}, incomeSource = 'salary') {
  let standardDeduction = 0;
  if (incomeSource === 'salary' || incomeSource === 'pension') {
    standardDeduction = regime === 'new' ? 75000 : 50000;
  } else if (incomeSource === 'family_pension') {
    standardDeduction = Math.min(annualIncome / 3, 15000);
  }

  // Section 80CCD(2) - Employer NPS Contribution (available under both regimes)
  const basicSalary = deductions.basicSalary || (annualIncome * 0.5);
  const isGovtEmployee = deductions.isGovtEmployee === true;
  const nps80CCD2LimitPercent = isGovtEmployee ? 0.14 : 0.10;
  const max80CCD2 = basicSalary * nps80CCD2LimitPercent;
  const nps80CCD2 = Math.min(deductions.nps80CCD2 || 0, max80CCD2);

  const section80C = Math.min(deductions.section80C || 0, 150000);
  const nps80CCD1B = Math.min(deductions.nps80CCD1B || deductions.section80CCD || 0, 50000);

  // Section 80D Granular Self vs. Parents
  const age = deductions.age || 30;
  const selfSenior = age >= 60 || deductions.self_senior === true;
  const parentsSenior = deductions.parents_senior === true;
  const max80D_self = selfSenior ? 50000 : 25000;
  const max80D_parents = parentsSenior ? 50000 : 25000;

  let allowed80D = 0;
  if (deductions.section80D_self !== undefined || deductions.section80D_parents !== undefined) {
    const allowed80D_self = Math.min(deductions.section80D_self || 0, max80D_self);
    const allowed80D_parents = Math.min(deductions.section80D_parents || 0, max80D_parents);
    allowed80D = allowed80D_self + allowed80D_parents;
  } else {
    allowed80D = Math.min(deductions.section80D || 0, 100000);
  }

  const hra = deductions.hra || 0;
  const homeLoanInterest = Math.min(deductions.homeLoanInterest || 0, 200000);
  const section80EEA = Math.min(deductions.section80EEA || 0, 150000);
  const otherDeductions = deductions.other || 0;

  const savingsInterest = deductions.savingsInterest || 0;
  let section80TTA = deductions.section80TTA || 0;
  let section80TTB = deductions.section80TTB || 0;

  if (savingsInterest > 0) {
    if (age >= 60) {
      section80TTB = Math.max(section80TTB, savingsInterest);
    } else {
      section80TTA = Math.max(section80TTA, savingsInterest);
    }
  }

  const allowed80TTA = age < 60 ? Math.min(section80TTA, 10000) : 0;
  const allowed80TTB = age >= 60 ? Math.min(section80TTB, 50000) : 0;

  const oldRegimeDeductions = regime === 'old'
    ? (section80C + nps80CCD1B + allowed80D + hra + homeLoanInterest + section80EEA + allowed80TTA + allowed80TTB + otherDeductions)
    : 0;

  const taxableIncome = Math.max(0, annualIncome - standardDeduction - nps80CCD2 - oldRegimeDeductions);

  return { standardDeduction, oldRegimeDeductions, taxableIncome, nps80CCD2, allowed80D };
}

/**
 * Compute full tax breakdown for a given annual income.
 *
 * @param {number} annualIncome - Gross annual income in ₹
 * @param {string} regime - 'new' (default) or 'old'
 * @param {Object} deductions - Optional Old Regime deductions (80C, nps80CCD1B, homeLoanInterest, hra, other)
 * @param {string} incomeSource - 'salary', 'business', 'pension', etc. (standard deduction applies only to salary/pension)
 * @returns {{ taxAmount, effectiveRate, regime, rebateApplied, surchargeApplied, surchargeAmount, cess, taxBeforeCess, taxableIncome }}
 */
export function computeTax(annualIncome, regime = 'new', deductions = {}, incomeSource = 'salary') {
  // Input guard: reject non-finite or negative income using local variable
  let safeIncome = annualIncome;
  if (!Number.isFinite(safeIncome) || safeIncome < 0) {
    console.warn(`[TaxEngine] Invalid annualIncome: ${safeIncome}. Treating as 0.`);
    safeIncome = 0;
  }
  if (regime !== 'new' && regime !== 'old') regime = 'new';

  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

  const { standardDeduction, oldRegimeDeductions, taxableIncome, nps80CCD2, allowed80D } = calculateTaxableIncome(
    safeIncome,
    regime,
    deductions,
    incomeSource
  );

  let taxBeforeCess = calculateFromSlabs(taxableIncome, slabs);

  // ── Section 87A Rebate with MARGINAL RELIEF ────────────────────────
  // BEGINNER NOTE: SECTION 87A REBATE & MARGINAL RELIEF
  // 1. Section 87A Rebate: Under the New Regime, if your taxable income is ₹1,200,000 or less,
  //    the government gives you a 100% tax rebate (effectively, you pay ₹0 tax).
  // 2. 87A Marginal Relief: If your taxable income goes even ₹1 over ₹1,200,000 (e.g. ₹12,00,005),
  //    you suddenly lose the full rebate, and your base tax jumps from ₹0 to ₹80,000!
  //    To prevent this cliff, 87A Marginal Relief restricts your tax to ONLY the excess income
  //    above the limit (e.g., you only pay ₹5 tax instead of ₹80,000).
  let rebateApplied = false;
  let marginalReliefApplied = false;
  let marginalReliefAmount87A = 0;

  const rebateLimit = regime === 'new' ? 1200000 : 500000;

  if (taxableIncome <= rebateLimit) {
    taxBeforeCess = 0;
    rebateApplied = true;
  } else {
    // Marginal relief for 87A: tax cannot exceed the excess over rebate limit
    const excessOverLimit = taxableIncome - rebateLimit;
    if (taxBeforeCess > excessOverLimit) {
      marginalReliefAmount87A = taxBeforeCess - excessOverLimit;
      taxBeforeCess = excessOverLimit;
      marginalReliefApplied = true;
    }
  }

  // ── Surcharge and Surcharge Marginal Relief ─────────────────────────
  // LEGAL NOTE: Under Indian Income Tax law, surcharge is computed on the net base tax
  // AFTER applying any Section 87A rebate or 87A marginal relief. Hence, we pass
  // the already-reduced `taxBeforeCess` here. Surcharge marginal relief is then
  // computed using the same reduced base.
  const surcharge = computeSurcharge(taxBeforeCess, taxableIncome, regime);
  const relief = computeMarginalRelief(taxBeforeCess, surcharge, taxableIncome, regime);
  const taxAfterSurcharge = taxBeforeCess + surcharge - relief;

  // 4% Health & Education Cess (applied on tax + surcharge)
  const cess = taxAfterSurcharge * CESS_RATE;
  const taxAmount = taxAfterSurcharge + cess;
  const effectiveRate = annualIncome > 0
    ? parseFloat(((taxAmount / annualIncome) * 100).toFixed(2))
    : 0;

  return {
    taxAmount: Math.round(taxAmount),
    effectiveRate,
    regime,
    rebateApplied,
    marginalReliefApplied: marginalReliefApplied || relief > 0,
    marginalReliefAmount: Math.round(relief + marginalReliefAmount87A),
    surchargeApplied: surcharge > 0,
    surchargeAmount: Math.round(surcharge),
    cess: Math.round(cess),
    taxBeforeCess: Math.round(taxBeforeCess),
    taxableIncome,
    annualIncome: safeIncome,
    standardDeduction,
    oldRegimeDeductions,
    nps80CCD2,
    allowed80D,
  };
}

/**
 * Compute tax with deductions (convenience wrapper/alias).
 */
export function computeTaxWithDeductions(annualIncome, regime, deductions = {}, incomeSource = 'salary') {
  return computeTax(annualIncome, regime, deductions, incomeSource);
}

/**
 * Get the marginal (highest applicable) tax slab percentage.
 *
 * @param {number} annualIncome - Gross annual income in ₹
 * @param {string} regime - 'new' or 'old'
 * @param {Object} deductions - Optional Old Regime deductions
 * @param {string} incomeSource - 'salary', 'business', etc.
 * @returns {number} marginal tax rate as decimal (e.g. 0.30 for 30%)
 */
export function getTaxSlab(annualIncome, regime = 'new', deductions = {}, incomeSource = 'salary') {
  // Input guard
  let safeIncome = annualIncome;
  if (!Number.isFinite(safeIncome) || safeIncome < 0) safeIncome = 0;
  if (regime !== 'new' && regime !== 'old') regime = 'new';

  const { taxableIncome } = calculateTaxableIncome(safeIncome, regime, deductions, incomeSource);
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

  let marginalRate = 0;
  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      marginalRate = slab.rate;
    }
  }

  return marginalRate;
}

/**
 * Compare both regimes and return the better one.
 *
 * @param {number} annualIncome
 * @param {Object} deductions
 * @param {string} incomeSource
 * @returns {{ newRegime, oldRegime, recommended }}
 */
export function compareTaxRegimes(annualIncome, deductions = {}, incomeSource = 'salary') {
  // Input guard
  if (!Number.isFinite(annualIncome) || annualIncome < 0) annualIncome = 0;

  const newRegime = computeTax(annualIncome, 'new', deductions, incomeSource);
  const oldRegime = computeTax(annualIncome, 'old', deductions, incomeSource);
  const recommended = newRegime.taxAmount <= oldRegime.taxAmount ? 'new' : 'old';
  return { newRegime, oldRegime, recommended };
}

/**
 * Get the effective marginal tax rate (slab + surcharge + cess) for a given income level.
 * Useful for post-tax drag adjustments on future returns.
 */
export function getEffectiveMarginalRate(annualIncome, regime = 'new', deductions = {}, incomeSource = 'salary') {
  // Use centered finite difference for higher numerical accuracy at slab boundaries:
  // (tax(income + delta) - tax(income - delta)) / (2 * delta)
  const delta = 10000;
  
  const highIncome = annualIncome + delta;
  const lowIncome = Math.max(0, annualIncome - delta);
  
  const highRes = computeTax(highIncome, regime, deductions, incomeSource);
  const lowRes = computeTax(lowIncome, regime, deductions, incomeSource);
  
  const deltaIncome = highIncome - lowIncome;
  if (deltaIncome <= 0) return 0;
  
  const deltaTax = highRes.taxAmount - lowRes.taxAmount;
  const effectiveMarginal = deltaTax / deltaIncome;
  
  return parseFloat(Math.max(0, Math.min(effectiveMarginal, 0.45)).toFixed(4));
}
