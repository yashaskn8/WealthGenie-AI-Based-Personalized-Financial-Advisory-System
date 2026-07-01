import test from 'node:test';
import assert from 'node:assert/strict';
import { runMonteCarloWithGoal, reverseSIP } from '../services/monteCarloEngine.js';

test('Monte Carlo output has ordered percentiles and bounded goal probability', () => {
  const result = runMonteCarloWithGoal({
    monthlyInvestment: 10_000,
    postTaxAnnualReturn: 0.08,
    annualVolatility: 0.12,
    years: 5,
    simulations: 500,
    targetAmount: 800_000,
  });

  assert.equal(result.years_array.length, 5);
  assert.equal(result.p10.length, 5);
  assert.equal(result.p50.length, 5);
  assert.equal(result.p90.length, 5);
  assert.ok(result.simulations_run >= 500);
  assert.ok(result.goal_probability >= 0 && result.goal_probability <= 1);

  for (let i = 0; i < result.p50.length; i += 1) {
    assert.ok(result.p10[i] <= result.p50[i], `p10 <= p50 at ${i}`);
    assert.ok(result.p50[i] <= result.p90[i], `p50 <= p90 at ${i}`);
  }
});

test('reverseSIP returns a finite monthly SIP for reachable targets', () => {
  const sip = reverseSIP(1_000_000, 0.10, 10, 100_000);
  assert.ok(Number.isFinite(sip));
  assert.ok(sip > 0);
});
