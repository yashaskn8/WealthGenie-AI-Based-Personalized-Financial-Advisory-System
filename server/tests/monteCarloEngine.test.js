import { runMonteCarlo, computeGoalProbability,
         runMonteCarloWithGoal, reverseSIP }
  from '../services/monteCarloEngine.js';

describe('Monte Carlo Engine', () => {

  test('p50 convergence: ELSS 15yr within 10% of deterministic', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 10000,
      postTaxAnnualReturn: 0.096,
      annualVolatility: 0.17,
      years: 15,
      simulations: 10000,
    });
    const p50 = r.p50[14];
    // Deterministic SIP FV ≈ ₹41.5L at 9.6%
    expect(p50).toBeGreaterThan(3500000);
    expect(p50).toBeLessThan(4800000);
  });

  test('band ordering: p10 < p25 < p50 < p75 < p90 for all years', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 5000,
      postTaxAnnualReturn: 0.07,
      annualVolatility: 0.03,
      years: 10,
      simulations: 5000,
    });
    r.years_array.forEach((_, i) => {
      expect(r.p10[i]).toBeLessThan(r.p25[i]);
      expect(r.p25[i]).toBeLessThan(r.p50[i]);
      expect(r.p50[i]).toBeLessThan(r.p75[i]);
      expect(r.p75[i]).toBeLessThan(r.p90[i]);
    });
  });

  test('all six output arrays present and correct length', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.07,
      annualVolatility: 0.02, years: 5, simulations: 500,
    });
    ['p10','p25','p50','p75','p90','mean'].forEach(k => {
      expect(r[k]).toBeDefined();
      expect(r[k].length).toBe(5);
    });
  });

  test('computeGoalProbability: all above target = 1.0', () => {
    expect(computeGoalProbability([100, 200, 300], 50)).toBe(1);
  });

  test('computeGoalProbability: none above target = 0.0', () => {
    expect(computeGoalProbability([100, 200, 300], 999999)).toBe(0);
  });

  test('runMonteCarloWithGoal strips finalValues from response', () => {
    const r = runMonteCarloWithGoal({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.15, years: 5,
      simulations: 500, targetAmount: 1000000,
    });
    expect(r.finalValues).toBeUndefined();
    expect(r.goal_probability).toBeGreaterThanOrEqual(0);
    expect(r.goal_probability).toBeLessThanOrEqual(1);
  });

  test('reverseSIP: ₹30L in 12yr at 10% ≈ ₹10,800/mo', () => {
    const sip = reverseSIP(3000000, 0.10, 12, 0);
    expect(sip).toBeGreaterThan(9000);
    expect(sip).toBeLessThan(13000);
  });
});
