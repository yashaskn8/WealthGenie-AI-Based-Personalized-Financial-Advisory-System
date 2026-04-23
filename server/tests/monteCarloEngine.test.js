import { runMonteCarlo, computeGoalProbability,
         runMonteCarloWithGoal } from '../services/monteCarloEngine.js';

describe('Monte Carlo Engine', () => {

  test('p50 converges to deterministic SIP value within 10%', () => {
    // ELSS: 9.6% mean (12% * 0.8), 17% stdDev, ₹10,000/mo, 15 years
    const result = runMonteCarlo({
      monthlyInvestment: 10000,
      postTaxAnnualReturn: 0.096,
      annualVolatility: 0.17,
      years: 15,
      simulations: 10000,
    });
    const p50_15yr = result.p50[14]; // index 14 = year 15
    // Deterministic SIP FV at 9.6%: approx ₹41.5L
    expect(p50_15yr).toBeGreaterThan(3500000);
    expect(p50_15yr).toBeLessThan(5000000);
  });

  test('p90 > p50 > p10 for all years', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 5000,
      postTaxAnnualReturn: 0.07,
      annualVolatility: 0.03,
      years: 10,
      simulations: 5000,
    });
    result.years_array.forEach((_, i) => {
      expect(result.p90[i]).toBeGreaterThan(result.p50[i]);
      expect(result.p50[i]).toBeGreaterThan(result.p10[i]);
    });
  });

  test('all five percentile bands are returned', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 10000,
      postTaxAnnualReturn: 0.072,
      annualVolatility: 0.01,
      years: 5,
      simulations: 1000,
    });
    expect(result.p10).toBeDefined();
    expect(result.p25).toBeDefined();
    expect(result.p50).toBeDefined();
    expect(result.p75).toBeDefined();
    expect(result.p90).toBeDefined();
    expect(result.p10.length).toBe(5);
  });

  test('computeGoalProbability: 100% chance when target is zero', () => {
    const fakeValues = [100000, 200000, 300000];
    expect(computeGoalProbability(fakeValues, 0)).toBe(1);
  });

  test('computeGoalProbability: 0% chance when target exceeds all', () => {
    const fakeValues = [100000, 200000, 300000];
    expect(computeGoalProbability(fakeValues, 999999999)).toBe(0);
  });

  test('computeGoalProbability: partial success rate', () => {
    const fakeValues = [100000, 200000, 300000, 400000, 500000];
    // 3 out of 5 meet 250000 target
    expect(computeGoalProbability(fakeValues, 250000)).toBeCloseTo(0.6, 1);
  });

  test('runMonteCarloWithGoal does not expose finalValues in response', () => {
    const result = runMonteCarloWithGoal({
      monthlyInvestment: 10000,
      postTaxAnnualReturn: 0.10,
      annualVolatility: 0.15,
      years: 10,
      simulations: 1000,
      targetAmount: 2000000,
    });
    expect(result.finalValues).toBeUndefined();
    expect(result.goal_probability).toBeGreaterThanOrEqual(0);
    expect(result.goal_probability).toBeLessThanOrEqual(1);
  });

  test('runMonteCarloWithGoal returns null probability when no target', () => {
    const result = runMonteCarloWithGoal({
      monthlyInvestment: 10000,
      postTaxAnnualReturn: 0.10,
      annualVolatility: 0.15,
      years: 10,
      simulations: 1000,
    });
    expect(result.goal_probability).toBeNull();
  });

  test('years_array length matches requested years', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 5000,
      postTaxAnnualReturn: 0.08,
      annualVolatility: 0.10,
      years: 20,
      simulations: 500,
    });
    expect(result.years_array.length).toBe(20);
    expect(result.years_array[0]).toBe(1);
    expect(result.years_array[19]).toBe(20);
  });
});
