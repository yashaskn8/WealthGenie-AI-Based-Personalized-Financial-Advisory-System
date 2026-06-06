import { taxComputeSchema, taxCompareSchema } from '../validation/schemas.js';
import { buildRecommendationCacheKey } from '../routes/recommend.js';
import { computeXIRR } from '../services/xirrCalculator.js';

describe('Backend hardening regressions', () => {
  test('tax query schemas preserve self_senior for Section 80D calculations', () => {
    const computeResult = taxComputeSchema.validate({
      income: 1200000,
      self_senior: 'true',
    });
    const compareResult = taxCompareSchema.validate({
      income: 1200000,
      self_senior: 'true',
    });

    expect(computeResult.error).toBeUndefined();
    expect(compareResult.error).toBeUndefined();
    expect(computeResult.value.self_senior).toBe(true);
    expect(compareResult.value.self_senior).toBe(true);
  });

  test('recommendation cache keys are isolated by profile id', () => {
    const profile = {
      age: 35,
      annualIncome: 1200000,
      savings: 25000,
      riskCategory: 'Moderate',
      taxRegime: 'new',
      investmentHorizon: 15,
    };

    const keyA = buildRecommendationCacheKey('user1', 'aaaaaaaaaaaaaaaaaaaaaaaa', profile);
    const keyB = buildRecommendationCacheKey('user1', 'bbbbbbbbbbbbbbbbbbbbbbbb', profile);

    expect(keyA).not.toBe(keyB);
    expect(keyA).toContain('aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(keyB).toContain('bbbbbbbbbbbbbbbbbbbbbbbb');
  });

  test('invalid XIRR dates return a validation error instead of a numeric estimate', () => {
    const result = computeXIRR([
      { amount: -100000, date: 'not-a-date' },
      { amount: 115000, date: '2026-01-01' },
    ]);

    expect(result.converged).toBe(false);
    expect(result.error).toContain('Invalid cashflow date');
    expect(result.rate).toBe(0);
  });

  test('invalid XIRR initial guess falls back to a safe finite default', () => {
    const result = computeXIRR([
      { amount: -100000, date: '2025-01-01' },
      { amount: 110000, date: '2026-01-01' },
    ], Number.NaN);

    expect(result.converged).toBe(true);
    expect(result.rate).toBeCloseTo(0.10, 2);
  });
});
