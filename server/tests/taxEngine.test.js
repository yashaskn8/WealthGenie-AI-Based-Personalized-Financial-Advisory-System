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

  // Case 10: Standard deduction conditions (salary/pension vs business/others)
  test('standard deduction applies only to salary/pension', () => {
    // If salary, standard deduction is 75K under new regime
    const salaryRes = computeTax(1000000, 'new', {}, 'salary');
    expect(salaryRes.standardDeduction).toBe(75000);
    expect(salaryRes.taxableIncome).toBe(925000);

    // If business, standard deduction is 0
    const businessRes = computeTax(1000000, 'new', {}, 'business');
    expect(businessRes.standardDeduction).toBe(0);
    expect(businessRes.taxableIncome).toBe(1000000);
  });

  // Case 11: Old Regime Deductions (80C, 80CCD, Home Loan, HRA)
  test('old regime deductions: 80C, 80CCD, home loan interest, HRA', () => {
    // gross income = 15L. Deductions: 1.8L for 80C (should be capped at 1.5L), 60k for 80CCD (capped at 50k), 2.5L home loan (capped at 2L), HRA 1L.
    // Total deductions = 1.5L + 50k + 2L + 1L = 5L.
    // Standard deduction for salary under Old regime = 50k.
    // Taxable income = 15L - 5.5L = 9.5L.
    const deductions = {
      section80C: 180000,
      section80CCD: 60000,
      homeLoanInterest: 250000,
      hra: 100000,
    };
    const res = computeTax(1500000, 'old', deductions, 'salary');
    expect(res.standardDeduction).toBe(50000);
    expect(res.oldRegimeDeductions).toBe(500000);
    expect(res.taxableIncome).toBe(950000);
  });

  // Case 12: compareTaxRegimes with custom deductions
  test('compareTaxRegimes with custom deductions', () => {
    const deductions = {
      section80C: 150000,
      nps80CCD1B: 50000,
      hra: 100000,
    };
    const res = compareTaxRegimes(1500000, deductions, 'salary');
    expect(res.oldRegime.standardDeduction).toBe(50000);
    expect(res.oldRegime.oldRegimeDeductions).toBe(300000);
    expect(res.oldRegime.taxableIncome).toBe(1150000);
    expect(res.newRegime.taxableIncome).toBe(1425000);
  });

  // Case 13: Family pension standard deduction (1/3rd of income up to ₹15,000)
  test('family pension standard deduction caps at ₹15,000', () => {
    // gross income = ₹30,000. 1/3rd = ₹10,000 (< 15,000)
    const lowRes = computeTax(30000, 'new', {}, 'family_pension');
    expect(lowRes.standardDeduction).toBe(10000);

    // gross income = ₹150,000. 1/3rd = ₹50,000 (capped at ₹15,000)
    const highRes = computeTax(150000, 'new', {}, 'family_pension');
    expect(highRes.standardDeduction).toBe(15000);
  });

  // Case 14: Section 80CCD(2) employer NPS deduction
  test('employer NPS deduction section 80CCD(2) limits', () => {
    // gross income = 10L. basic = default 5L (50%).
    // Corporate/private employee limit = 10% of basic = 50k.
    const corporateRes = computeTax(1000000, 'new', { nps80CCD2: 60000 });
    expect(corporateRes.nps80CCD2).toBe(50000); // capped at 50k
    expect(corporateRes.taxableIncome).toBe(1000000 - 75000 - 50000);

    // Govt employee limit = 14% of basic = 70k.
    const govtRes = computeTax(1000000, 'new', { nps80CCD2: 80000, isGovtEmployee: true });
    expect(govtRes.nps80CCD2).toBe(70000); // capped at 70k
    expect(govtRes.taxableIncome).toBe(1000000 - 75000 - 70000);
  });

  // Case 15: Granular Section 80D
  test('granular Section 80D self vs parents limits', () => {
    // Non-senior self (limit 25k) + senior parents (limit 50k). Deductions: self 30k, parents 60k.
    // Total allowed should be 25k + 50k = 75k.
    const oldRes = computeTax(1000000, 'old', {
      section80D_self: 30000,
      section80D_parents: 60000,
      parents_senior: true,
      age: 30, // non-senior self
    }, 'salary');
    expect(oldRes.allowed80D).toBe(75000);
  });
});
