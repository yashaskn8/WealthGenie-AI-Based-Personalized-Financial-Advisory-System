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
      return {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Slab Rate (TDS applicable)',
        taxRate: marginalRate,
        notes: `Interest taxed at ${(marginalRate * 100).toFixed(0)}% slab. `
             + `TDS applies if interest > ₹40,000/year.`
      };
    }

    case 'ELSS': {
      // ELSS is taxed as LTCG (mandatory 3-year lock-in).
      // LTCG rate: 12.5% on gains above ₹1,25,000/year (post Budget 2024).
      // 80C deduction up to ₹1,50,000 (old regime only).
      const ltcgRate = 0.125;
      const postTax = nominalRate * (1 - ltcgRate);
      return {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'LTCG (12.5% post ₹1.25L exemption)',
        taxRate: ltcgRate,
        notes: 'Lock-in: 3 years. Gains above ₹1.25L taxed at 12.5%. '
             + '80C benefit of up to ₹1.5L available under old regime.'
      };
    }

    case 'Equity_MF':
    case 'ETF': {
      if (holdingYears < 1) {
        // STCG: 20% flat on all gains (Finance Act 2024 amendment)
        const postTax = nominalRate * (1 - 0.20);
        return {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'STCG (20% flat)',
          taxRate: 0.20,
          notes: 'Held < 1 year. STCG at 20% applies on full gains.'
        };
      } else {
        // LTCG: 12.5% on gains above ₹1,25,000/year (Budget 2024)
        const ltcgRate = 0.125;
        const postTax = nominalRate * (1 - ltcgRate);
        return {
          postTaxReturn: round4(postTax),
          effectiveYield: round4(postTax * 100),
          taxType: 'LTCG (12.5% post ₹1.25L exemption)',
          taxRate: ltcgRate,
          notes: 'Held > 1 year. Gains above ₹1.25L/year taxed at 12.5%.'
        };
      }
    }

    case 'Debt_MF': {
      // Debt MF: all gains taxed at slab rate regardless of holding period.
      // Indexation benefit removed (Finance Act 2023, effective April 2023).
      const postTax = nominalRate * (1 - marginalRate);
      return {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Slab Rate (no indexation)',
        taxRate: marginalRate,
        notes: 'Indexation benefit removed from April 2023. '
             + `Gains taxed at ${(marginalRate * 100).toFixed(0)}% slab rate.`
      };
    }

    case 'RBI_Bond': {
      // 8% Floating Rate Savings Bond (Taxable), 2020.
      // Interest paid semi-annually. Fully taxable at slab. No TDS.
      const postTax = nominalRate * (1 - marginalRate);
      return {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Slab Rate (no TDS, declare in ITR)',
        taxRate: marginalRate,
        notes: 'No TDS deducted. Interest must be declared in ITR. '
             + 'Non-tradeable — zero capital gains applicable.'
      };
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
      return {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: 'Blended (coupon at slab, LTCG at 10%)',
        taxRate: round4(blendedTaxRate),
        notes: 'Coupon taxed at slab. Capital gains at 10% if held > 1 year.'
      };
    }

    case 'PPF': {
      // EEE instrument: contribution, interest, and maturity — all tax-exempt.
      // 15-year lock-in. Current rate: 7.1% (notified quarterly by RBI).
      return {
        postTaxReturn: nominalRate,   // No tax at any stage
        effectiveYield: round4(nominalRate * 100),
        taxType: 'EEE — Fully Exempt',
        taxRate: 0,
        notes: 'Exempt-Exempt-Exempt. 15-year lock-in. '
             + 'Max ₹1.5L/year contribution. 80C eligible (old regime).'
      };
    }

    case 'NPS': {
      // Partial EET: contributions tax-deductible (80C + 80CCD(1B)),
      // 60% of corpus tax-exempt on maturity, 40% must be annuitised (taxable).
      const effectiveTaxOnMaturity = 0.40 * marginalRate;
      const annualisedTaxDrag = Math.pow(1 - effectiveTaxOnMaturity, 1 / holdingYears) - 1;
      const postTax = nominalRate + annualisedTaxDrag;
      return {
        postTaxReturn: round4(Math.max(0, postTax)),
        effectiveYield: round4(Math.max(0, postTax) * 100),
        taxType: 'Partial EET (40% annuity taxable at maturity)',
        taxRate: round4(effectiveTaxOnMaturity),
        notes: '60% maturity corpus tax-free. 40% must be annuitised. '
             + 'Exit before 60 triggers higher tax. 80CCD(1B) allows ₹50K extra deduction.'
      };
    }

    case 'Gold': {
      // Gold ETF: same as Equity ETF (LTCG 12.5% if held > 1yr).
      // SGB: capital gains fully exempt if held to maturity (8 years).
      // Default to Gold ETF taxation.
      const ltcgRate = holdingYears >= 1 ? 0.125 : marginalRate;
      const postTax = nominalRate * (1 - ltcgRate);
      return {
        postTaxReturn: round4(postTax),
        effectiveYield: round4(postTax * 100),
        taxType: holdingYears >= 1
          ? 'LTCG (12.5%)' : 'STCG (slab rate)',
        taxRate: ltcgRate,
        notes: 'Gold ETF taxation. For Sovereign Gold Bonds held to maturity '
             + '(8 years), capital gains are fully exempt.'
      };
    }

    default:
      throw new Error(`Unknown instrument type: ${instrumentType}`);
  }
}
