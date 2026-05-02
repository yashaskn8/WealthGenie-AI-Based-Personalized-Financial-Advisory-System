/**
 * WealthGenie Post-Tax Return Calculator
 * Applies Indian taxation rules per instrument type for FY2025-26.
 * All rates sourced from Finance Act 2023 and Budget 2024 amendments.
 */

import { computeTax } from './taxEngine.js';

// ── Helper: extract marginal rate from taxable income ─────────────
function getMarginalRate(taxableIncome, regime) {
  if (regime === 'new') {
    if (taxableIncome <= 400000)  return 0;
    if (taxableIncome <= 800000)  return 0.05;
    if (taxableIncome <= 1200000) return 0.10;
    if (taxableIncome <= 1600000) return 0.15;
    if (taxableIncome <= 2000000) return 0.20;
    if (taxableIncome <= 2400000) return 0.25;
    return 0.30;
  } else {
    if (taxableIncome <= 250000)  return 0;
    if (taxableIncome <= 500000)  return 0.05;
    if (taxableIncome <= 1000000) return 0.20;
    return 0.30;
  }
}

function round4(n) { return parseFloat(n.toFixed(4)); }

/**
 * VALIDATION FUNCTION — ABSOLUTE SAFETY NET
 * Post-tax return can NEVER exceed nominal return under any scenario.
 * This wraps every return path in calculatePostTaxReturn.
 */
export function validatePostTaxResult(result, nominalRate, instrumentType) {
  // ABSOLUTE RULE: post-tax return cannot exceed nominal return
  if (result.postTaxReturn > nominalRate + 0.0001) {
    console.error(
      `[PostTax CRITICAL] ${instrumentType}: postTaxReturn `
      + `${result.postTaxReturn} exceeds nominalRate ${nominalRate}. `
      + `This is impossible. Returning nominal as safe fallback.`
    );
    return {
      ...result,
      postTaxReturn: nominalRate,
      taxRate: 0,
      validationFailed: true,
      validationError: 'post_tax_exceeded_nominal',
    };
  }

  if (result.postTaxReturn < 0) {
    console.error(
      `[PostTax CRITICAL] ${instrumentType}: postTaxReturn is negative `
      + `(${result.postTaxReturn}). Clamping to 0.`
    );
    return { ...result, postTaxReturn: 0, validationFailed: true };
  }

  // Tax rate must be between 0 and 1
  if (result.taxRate < 0 || result.taxRate > 1) {
    console.error(
      `[PostTax WARN] ${instrumentType}: taxRate (${result.taxRate}) is outside `
      + `valid range [0, 1].`
    );
  }

  // EEE instruments must have taxRate = 0
  if (['PPF', 'SSY'].includes(instrumentType) && result.taxRate !== 0) {
    console.error(
      `[PostTax WARN] ${instrumentType}: EEE instrument must have taxRate = 0, `
      + `got ${result.taxRate}.`
    );
  }

  return result;
}

/**
 * Computes the effective post-tax annual return for a given instrument.
 *
 * @param {string} instrumentType  - 'FD','ELSS','Equity_MF','ETF','Debt_MF',
 *                                   'RBI_Bond','G-Sec','PPF','NPS','Gold'
 * @param {number} nominalRate     - Annual nominal return as decimal (e.g., 0.072)
 * @param {number} annualIncome    - User's gross annual income (for slab)
 * @param {number} holdingYears    - Intended holding period in years
 * @param {string} regime          - 'new' | 'old'
 * @returns {object}               - { postTaxReturn, effectiveYield,
 *                                     taxType, taxRate, notes }
 */
export function calculatePostTaxReturn(
  instrumentType, nominalRate, annualIncome, holdingYears = 3, regime = 'new'
) {
  // Derive marginal slab rate for this user
  const taxResult = computeTax(annualIncome, regime);
  const marginalRate = getMarginalRate(taxResult.taxableIncome, regime);

  switch (instrumentType) {

    case 'FD': {
      // FD interest is fully taxable at marginal slab rate.
      // TDS at 10% if annual interest > ₹40,000 (₹50,000 for senior citizens).
      // Post-tax return = nominalRate × (1 - marginalRate)
      const postTax = nominalRate * (1 - marginalRate);
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Slab Rate (TDS applicable)',
        taxRate: marginalRate,
        notes: `Interest taxed at ${(marginalRate * 100).toFixed(0)}% slab. `
             + `TDS applies if interest > ₹40,000/year.`
      };
      return validatePostTaxResult(result, nominalRate, 'FD');
    }

    case 'ELSS': {
      // ELSS is taxed as LTCG (mandatory 3-year lock-in).
      // LTCG rate: 12.5% on gains above ₹1,25,000/year (post Budget 2024).
      // 80C deduction up to ₹1,50,000 (old regime only).
      const ltcgRate = 0.125;
      const postTax = nominalRate * (1 - ltcgRate);
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'LTCG (12.5% post ₹1.25L exemption)',
        taxRate: ltcgRate,
        notes: 'Lock-in: 3 years. Gains above ₹1.25L taxed at 12.5%. '
             + '80C benefit of up to ₹1.5L available under old regime.'
      };
      return validatePostTaxResult(result, nominalRate, 'ELSS');
    }

    case 'Equity_MF':
    case 'ETF': {
      if (holdingYears < 1) {
        // STCG: 20% flat on all gains (Finance Act 2024 amendment)
        const postTax = nominalRate * (1 - 0.20);
        const result = {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'STCG (20% flat, held < 1 year)',
          taxRate: 0.20,
          notes: 'Held < 1 year. STCG at 20% applies on full gains.'
        };
        return validatePostTaxResult(result, nominalRate, instrumentType);
      } else {
        // LTCG: 12.5% on gains above ₹1,25,000/year (Budget 2024)
        const ltcgRate = 0.125;
        const postTax = nominalRate * (1 - ltcgRate);
        const result = {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'LTCG (12.5% on gains above ₹1.25L)',
          taxRate: ltcgRate,
          notes: 'Gains above ₹1.25L/year taxed at 12.5%. '
               + 'For smaller monthly SIPs, effective tax drag '
               + 'may be lower than the headline 12.5%.'
        };
        return validatePostTaxResult(result, nominalRate, instrumentType);
      }
    }

    case 'Debt_MF': {
      // Debt MF: all gains taxed at slab rate regardless of holding period.
      // Indexation benefit removed (Finance Act 2023, effective April 2023).
      const postTax = nominalRate * (1 - marginalRate);
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Slab Rate (no indexation)',
        taxRate: marginalRate,
        notes: 'Indexation benefit removed from April 2023. '
             + `Gains taxed at ${(marginalRate * 100).toFixed(0)}% slab rate.`
      };
      return validatePostTaxResult(result, nominalRate, 'Debt_MF');
    }

    case 'RBI_Bond': {
      // Interest fully taxable at marginal slab rate.
      // No TDS deducted. Must be declared in ITR.
      // Non-tradeable — no capital gains component.
      const postTax = nominalRate * (1 - marginalRate);
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: `Slab Rate (${(marginalRate*100).toFixed(0)}% marginal, no TDS)`,
        taxRate: marginalRate,
        notes: 'Interest paid semi-annually. '
             + 'No TDS deducted — declare in ITR. '
             + 'Non-tradeable (cannot be sold before maturity). '
             + 'Lock-in: 7 years.',
      };
      return validatePostTaxResult(result, nominalRate, 'RBI_Bond');
    }

    case 'G-Sec': {
      // Interest (coupon) taxable at slab rate.
      // Capital gains if sold before maturity:
      //   STCG (< 1yr): slab rate
      //   LTCG (> 1yr): 10% without indexation
      const couponRate = 0.6;  // assumption: 60% of return is coupon income
      const gainRate = 0.4;
      const taxOnCoupon = couponRate * marginalRate;
      const taxOnGains = holdingYears < 1 ? gainRate * marginalRate : gainRate * 0.10;
      const blendedTaxRate = taxOnCoupon + taxOnGains;
      const postTax = nominalRate * (1 - blendedTaxRate);
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Blended (coupon at slab, LTCG at 10%)',
        taxRate: round4(blendedTaxRate),
        notes: 'Coupon taxed at slab. Capital gains at 10% if held > 1 year.'
      };
      return validatePostTaxResult(result, nominalRate, 'G-Sec');
    }

    case 'PPF': {
      // PPF is an EEE (Exempt-Exempt-Exempt) instrument.
      // Under NO circumstances does PPF post-tax return exceed nominal.
      // postTaxReturn = nominalRate (no deduction)
      const result = {
        postTaxReturn: nominalRate,
        effectiveYield: round4(nominalRate * 100),
        taxType: 'EEE — Fully Exempt (Section 10(11))',
        taxRate: 0,
        taxAmount: 0,
        notes: 'Interest and maturity corpus fully exempt from tax. '
             + 'No tax deducted at any stage. '
             + 'Max contribution ₹1.5L/year. Lock-in: 15 years.',
      };
      return validatePostTaxResult(result, nominalRate, 'PPF');
    }

    case 'NPS': {
      // NPS partial EET: 60% corpus tax-free, 40% annuitised
      // Annuity income taxed at marginal slab in retirement
      // Simplified blended tax drag applied to nominal return
      const annuityTaxedFraction = 0.40;
      const blendedTaxDrag = annuityTaxedFraction * marginalRate;
      const postTax = nominalRate * (1 - blendedTaxDrag);
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: `Partial EET (40% annuity taxed at ${(marginalRate*100).toFixed(0)}% slab)`,
        taxRate: round4(blendedTaxDrag),
        notes: '60% of maturity corpus is tax-free. '
             + '40% must be annuitised — pension income taxed at slab. '
             + 'Additional ₹50K deduction under 80CCD(1B) — old regime only. '
             + `Lock-in: matures at age 60.`,
      };
      return validatePostTaxResult(result, nominalRate, 'NPS');
    }

    case 'Gold': {
      // Gold ETF: same as Equity ETF (LTCG 12.5% if held > 1yr).
      // SGB: capital gains fully exempt if held to maturity (8 years).
      // Default to Gold ETF taxation.
      const ltcgRate = holdingYears >= 1 ? 0.125 : marginalRate;
      const postTax = nominalRate * (1 - ltcgRate);
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: holdingYears >= 1
          ? 'LTCG (12.5%)' : 'STCG (slab rate)',
        taxRate: ltcgRate,
        notes: 'Gold ETF taxation. For Sovereign Gold Bonds held to maturity '
             + '(8 years), capital gains are fully exempt.'
      };
      return validatePostTaxResult(result, nominalRate, 'Gold');
    }

    case 'SGB': {
      const interestComponent = 0.025;  // 2.5% statutory annual interest
      const capitalComponent = nominalRate - interestComponent;

      // Interest: taxable at marginal slab rate
      const taxOnInterest = interestComponent * marginalRate;
      // Capital gains at maturity: fully exempt (Section 47(viic))
      const taxOnGains = 0;

      const totalTaxDrag = taxOnInterest + taxOnGains;
      const postTax = nominalRate - totalTaxDrag;
      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Interest taxable at slab; maturity gains exempt (47(viic))',
        taxRate: round4(totalTaxDrag / nominalRate),
        notes: '2.5% annual interest taxable at slab rate. '
             + 'Capital appreciation fully exempt if held to maturity (8yr). '
             + 'LTCG at 12.5% applies on redemption before maturity.',
      };
      return validatePostTaxResult(result, nominalRate, 'SGB');
    }

    default:
      throw new Error(`Unknown instrument type: ${instrumentType}`);
  }
}

export function calculatePostTaxReturnSafe(...args) {
  const result = calculatePostTaxReturn(...args);
  // validatePostTaxResult is already called inside each case block,
  // but we do a second pass here for defense-in-depth
  const [instrumentType, nominalRate] = args;
  return validatePostTaxResult(result, nominalRate, instrumentType);
}
