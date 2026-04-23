import { computeTax, compareTaxRegimes } from '../services/taxEngine.js';

describe('Tax Engine — FY2025-26', () => {

  describe('New Regime', () => {
    test('income below standard deduction: zero tax', () => {
      expect(computeTax(70000, 'new').taxAmount).toBe(0);
    });

    test('87A rebate: ₹12L taxable income, zero tax', () => {
      // grossIncome = 12L + 75K standard deduction = 12.75L
      const result = computeTax(1275000, 'new');
      expect(result.taxAmount).toBe(0);
      expect(result.rebateApplied).toBe(true);
    });

    test('just above rebate threshold: tax applies', () => {
      // taxable = 12.76L - 0.75L = 12.01L > 12L threshold
      const result = computeTax(1276000, 'new');
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.rebateApplied).toBe(false);
    });

    test('25% slab: ₹22L income', () => {
      const result = computeTax(2200000, 'new');
      // taxableIncome = 21.25L, no surcharge, no rebate
      expect(result.taxAmount).toBeCloseTo(240500, -2);
      expect(result.surchargeApplied).toBe(false);
    });

    test('surcharge at 10%: ₹75L income', () => {
      const result = computeTax(7500000, 'new');
      expect(result.surchargeApplied).toBe(true);
      expect(result.surchargeAmount).toBeGreaterThan(0);
      // Total should be approximately ₹20.68L
      expect(result.taxAmount).toBeCloseTo(2067780, -2);
    });

    test('surcharge at 25%: ₹2.5Cr income (new regime cap)', () => {
      const result = computeTax(25000000, 'new');
      expect(result.surchargeApplied).toBe(true);
      // New regime caps surcharge at 25%
    });
  });

  describe('Old Regime', () => {
    test('87A rebate: ₹5L taxable income', () => {
      // gross = 5L + 50K = 5.5L
      const result = computeTax(550000, 'old');
      expect(result.taxAmount).toBe(0);
      expect(result.rebateApplied).toBe(true);
    });

    test('37% surcharge: ₹5.5Cr income', () => {
      const result = computeTax(55000000, 'old');
      expect(result.surchargeApplied).toBe(true);
      // Verify surcharge is applied (rate should be 37%)
      expect(result.surchargeAmount).toBeGreaterThan(0);
    });
  });

  describe('Regime comparison', () => {
    test('recommended regime is the lower-tax option', () => {
      const comparison = compareTaxRegimes(1000000);
      const lowerTax = Math.min(
        comparison.newRegime.taxAmount,
        comparison.oldRegime.taxAmount
      );
      expect(comparison.recommended === 'new'
        ? comparison.newRegime.taxAmount
        : comparison.oldRegime.taxAmount
      ).toBe(lowerTax);
    });

    test('both regimes return valid tax breakdowns', () => {
      const comparison = compareTaxRegimes(800000);
      expect(comparison.newRegime).toHaveProperty('taxAmount');
      expect(comparison.oldRegime).toHaveProperty('taxAmount');
      expect(comparison.recommended).toMatch(/^(new|old)$/);
    });
  });
});
