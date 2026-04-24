import { computeTax, compareTaxRegimes, getTaxSlab }
  from '../services/taxEngine.js';

describe('Tax Engine FY2025-26', () => {

  // Case 1: Income below standard deduction — zero tax
  test('income below SD: zero tax', () => {
    expect(computeTax(70000, 'new').taxAmount).toBe(0);
  });

  // Case 2: 87A rebate — gross ₹12.75L maps to taxable ₹12L exactly
  test('87A rebate boundary: ₹12.75L gross = zero tax', () => {
    const r = computeTax(1275000, 'new');
    expect(r.taxAmount).toBe(0);
    expect(r.rebateApplied).toBe(true);
  });

  // Case 3: One rupee above rebate boundary — tax must apply
  test('one rupee above 87A boundary: tax applies', () => {
    const r = computeTax(1276000, 'new');
    expect(r.taxAmount).toBeGreaterThan(0);
    expect(r.rebateApplied).toBe(false);
  });

  // Case 4: 25% slab — ₹22L income, no surcharge
  test('25% slab: ₹22L income', () => {
    const r = computeTax(2200000, 'new');
    expect(r.surchargeApplied).toBe(false);
    // taxableIncome = 22L - 0.75L = 21.25L
    // 0-4L: 0, 4-8L: 20K, 8-12L: 40K, 12-16L: 60K, 16-20L: 80K, 20-21.25L: 31.25K
    // Total: 231,250. Cess: 9,250. Total: 240,500
    expect(r.taxAmount).toBeCloseTo(240500, -2);
  });

  // Case 5: 10% surcharge — ₹75L income
  test('10% surcharge: ₹75L income', () => {
    const r = computeTax(7500000, 'new');
    expect(r.surchargeApplied).toBe(true);
    expect(r.surchargeAmount).toBeGreaterThan(0);
    // Verify surcharge rate: surchargeAmount / taxBeforeCess ≈ 0.10
    const impliedRate = r.surchargeAmount / r.taxBeforeCess;
    expect(impliedRate).toBeCloseTo(0.10, 1);
  });

  // Case 6: Old regime 87A rebate
  test('old regime 87A: ₹5.5L gross = zero tax', () => {
    const r = computeTax(550000, 'old');
    expect(r.taxAmount).toBe(0);
    expect(r.rebateApplied).toBe(true);
  });

  // Case 7: Old regime 37% surcharge
  test('old regime 37% surcharge: ₹5.5Cr income', () => {
    const r = computeTax(55000000, 'old');
    expect(r.surchargeApplied).toBe(true);
    const impliedRate = r.surchargeAmount / r.taxBeforeCess;
    expect(impliedRate).toBeCloseTo(0.37, 1);
  });

  // Case 8: Regime comparison recommends the lower-tax option
  test('compareTaxRegimes returns lower-tax regime', () => {
    const c = compareTaxRegimes(1000000);
    const winner = c.recommended === 'new'
      ? c.newRegime.taxAmount : c.oldRegime.taxAmount;
    const other = c.recommended === 'new'
      ? c.oldRegime.taxAmount : c.newRegime.taxAmount;
    expect(winner).toBeLessThanOrEqual(other);
  });

  // Case 9: getTaxSlab returns correct marginal rate
  test('getTaxSlab: ₹15L income new regime = 15% marginal', () => {
    // taxableIncome = 15L - 75K = 14.25L → falls in 12L-16L bracket = 15%
    expect(getTaxSlab(1500000, 'new')).toBe(0.15);
  });
});
