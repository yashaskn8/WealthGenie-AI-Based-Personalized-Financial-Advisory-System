/**
 * WealthGenie Post-Tax Return Calculator
 * Applies Indian taxation rules per instrument type for FY2025-26.
 * All rates sourced from Finance Act 2023 and Budget 2024 amendments.
 *
 * IMPORTANT: This module uses getTaxSlab() from taxEngine.js as the
 * single source of truth for marginal rate computation. There is NO
 * duplicate slab logic in this file.
 */

import { computeTax, getTaxSlab } from './taxEngine.js';

function round4(n) { return parseFloat(n.toFixed(4)); }

/**
 * VALIDATION FUNCTION — ABSOLUTE SAFETY NET
 * Post-tax return can NEVER exceed nominal return under any scenario.
 * This wraps every return path in calculatePostTaxReturn.
 */
export function validatePostTaxResult(result, nominalRate, instrumentType) {
  // Guard: NaN or non-finite inputs → return nominal as safe fallback
  if (!Number.isFinite(result.postTaxReturn)) {
    console.error(
      `[PostTax CRITICAL] ${instrumentType}: postTaxReturn is NaN/Infinity. `
      + `Returning nominal ${nominalRate} as safe fallback.`
    );
    return {
      ...result,
      postTaxReturn: Number.isFinite(nominalRate) ? nominalRate : 0,
      taxRate: 0,
      validationFailed: true,
      validationError: 'non_finite_post_tax',
    };
  }

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
 *                                   'RBI_Bond','G-Sec','PPF','NPS','Gold','SGB',
 *                                   'Liquid_MF','Arbitrage_MF'
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
  // Input guards
  if (!Number.isFinite(nominalRate) || nominalRate < 0) nominalRate = 0;
  if (!Number.isFinite(annualIncome) || annualIncome < 0) annualIncome = 0;
  if (!Number.isFinite(holdingYears) || holdingYears < 0) holdingYears = 1;

  // Use getTaxSlab from taxEngine.js — the single source of truth
  // getTaxSlab takes gross annualIncome and applies standard deduction internally
  const marginalRate = getTaxSlab(annualIncome, regime);

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

    case 'Liquid_MF': {
      // Debt-category taxation post Finance Act 2023.
      // All gains taxed at marginal slab rate regardless of holding period.
      const postTax = nominalRate * (1 - marginalRate);
      return validatePostTaxResult({
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: `Slab Rate (${(marginalRate*100).toFixed(0)}%, debt category)`,
        taxRate: marginalRate,
        notes: 'Gains taxed at marginal slab rate. '
             + 'T+1 redemption. No exit load after 7 days. '
             + 'Ideal for emergency fund core holding.',
      }, nominalRate, 'Liquid_MF');
    }

    case 'Arbitrage_MF': {
      // Arbitrage funds are classified as EQUITY by SEBI (≥65% equity derivatives).
      // Tax treatment follows equity mutual fund rules, NOT debt.
      // STCG (<1yr): 20% flat | LTCG (≥1yr): 12.5% on gains above ₹1.25L
      if (holdingYears < 1) {
        const stcgRate = 0.20;
        const postTax = nominalRate * (1 - stcgRate);
        return validatePostTaxResult({
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'STCG (20% flat, equity-classified arbitrage)',
          taxRate: stcgRate,
          notes: 'Arbitrage MFs are SEBI-classified equity. '
               + 'STCG at 20% for holdings under 1 year.',
        }, nominalRate, 'Arbitrage_MF');
      } else {
        const ltcgRate = 0.125;
        const postTax = nominalRate * (1 - ltcgRate);
        return validatePostTaxResult({
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'LTCG (12.5%, equity-classified arbitrage)',
          taxRate: ltcgRate,
          notes: 'Arbitrage MFs are SEBI-classified equity (≥65% equity derivatives). '
               + 'LTCG at 12.5% on gains above ₹1.25L/year. '
               + 'Lower effective tax than debt MFs for most investors.',
        }, nominalRate, 'Arbitrage_MF');
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
      // G-Sec taxation depends on whether held to maturity:
      //
      // If HELD TO MATURITY (bought at par):
      //   100% of return is coupon income → taxed at slab rate.
      //   No capital gains component.
      //
      // If TRADED before maturity:
      //   Coupon: taxed at slab rate
      //   Capital gains: STCG (slab) if < 1yr, LTCG (10% w/o indexation) if > 1yr
      //
      // Default assumption: held to maturity (most retail investors on RBI Retail Direct).
      // For short-term traders, the STCG rate applies on any price appreciation.
      if (holdingYears < 1) {
        // Short-term trader: all returns taxed at slab rate
        const postTax = nominalRate * (1 - marginalRate);
        const result = {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: `STCG at Slab Rate (${(marginalRate*100).toFixed(0)}%)`,
          taxRate: marginalRate,
          notes: 'Short-term holding: all gains taxed at slab rate.'
        };
        return validatePostTaxResult(result, nominalRate, 'G-Sec');
      } else {
        // Held to maturity: coupon income taxed at slab rate.
        // No capital gains for par-bought held-to-maturity G-Secs.
        const postTax = nominalRate * (1 - marginalRate);
        const result = {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: `Coupon at Slab Rate (${(marginalRate*100).toFixed(0)}%)`,
          taxRate: marginalRate,
          notes: 'Held to maturity: coupon taxed at slab. '
               + 'No capital gains on par-bought G-Secs. '
               + 'If sold early, LTCG at 10% without indexation on price gains.',
        };
        return validatePostTaxResult(result, nominalRate, 'G-Sec');
      }
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
      // NPS partial EET: 60% corpus tax-free at age 60, 40% annuitised
      // Annuity income taxed at marginal slab rate in retirement
      // Simplified: blended tax drag = 40% × marginal rate applied to nominal
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
      // Gold ETF: same as Equity ETF post Budget 2024.
      // STCG (<1yr): 20% flat
      // LTCG (≥1yr): 12.5%
      if (holdingYears < 1) {
        const stcgRate = 0.20;
        const postTax = nominalRate * (1 - stcgRate);
        const result = {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'STCG (20% flat)',
          taxRate: stcgRate,
          notes: 'Gold ETF held < 1 year: STCG at 20%.'
        };
        return validatePostTaxResult(result, nominalRate, 'Gold');
      } else {
        const ltcgRate = 0.125;
        const postTax = nominalRate * (1 - ltcgRate);
        const result = {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'LTCG (12.5%)',
          taxRate: ltcgRate,
          notes: 'Gold ETF taxation. For Sovereign Gold Bonds held to maturity '
               + '(8 years), capital gains are fully exempt.'
        };
        return validatePostTaxResult(result, nominalRate, 'Gold');
      }
    }

    case 'SGB': {
      // Sovereign Gold Bond:
      //   Interest: 2.5% p.a. on face value, taxable at slab rate
      //   Capital gains at maturity (8 years): FULLY EXEMPT under Section 47(viic)
      //   Capital gains before maturity: LTCG at 12.5%
      const interestComponent = 0.025;  // 2.5% statutory annual interest
      // Guard: if nominal rate < interest component, cap it
      const safeInterest = Math.min(interestComponent, nominalRate);

      // Interest: taxable at marginal slab rate
      const taxOnInterest = safeInterest * marginalRate;
      // Capital gains at maturity: fully exempt (Section 47(viic))
      const taxOnGains = 0;

      const totalTaxDrag = taxOnInterest + taxOnGains;
      const postTax = nominalRate - totalTaxDrag;
      const effectiveTaxRate = nominalRate > 0 ? round4(totalTaxDrag / nominalRate) : 0;

      const result = {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Interest taxable at slab; maturity gains exempt (47(viic))',
        taxRate: effectiveTaxRate,
        notes: '2.5% annual interest taxable at slab rate. '
             + 'Capital appreciation fully exempt if held to maturity (8yr). '
             + 'LTCG at 12.5% applies on redemption before maturity.',
      };
      return validatePostTaxResult(result, nominalRate, 'SGB');
    }

    default:
      // Unknown instrument: apply slab rate as conservative default
      console.warn(`[PostTax] Unknown instrument type: ${instrumentType}. Applying slab rate.`);
      const postTax = nominalRate * (1 - marginalRate);
      return validatePostTaxResult({
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: `Slab Rate (${(marginalRate*100).toFixed(0)}% — default)`,
        taxRate: marginalRate,
        notes: `Unknown instrument type "${instrumentType}". Defaulting to slab taxation.`,
      }, nominalRate, instrumentType);
  }
}

export function calculatePostTaxReturnSafe(...args) {
  const result = calculatePostTaxReturn(...args);
  // validatePostTaxResult is already called inside each case block,
  // but we do a second pass here for defense-in-depth
  const [instrumentType, nominalRate] = args;
  return validatePostTaxResult(result, nominalRate, instrumentType);
}
