import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRebalance, optimisePortfolio } from '../services/portfolioEngine.js';

const ASSETS = ['Equity_MF', 'Debt_MF', 'Gold'];
const RETURNS = [0.10, 0.06, 0.08];

function assertWeights(result) {
  const weights = Object.values(result.weights);
  const sum = weights.reduce((acc, value) => acc + value, 0);
  assert.ok(Math.abs(sum - 1) < 0.00001, `weights sum=${sum}`);
  assert.ok(weights.every(value => value >= 0));
  assert.ok(Number.isFinite(result.expectedReturn));
  assert.ok(Number.isFinite(result.volatility));
  assert.ok(Number.isFinite(result.sharpe));
}

test('portfolio optimizer returns complete metrics for every exposed strategy', () => {
  for (const strategy of ['min_variance', 'max_sharpe', 'risk_parity']) {
    const result = optimisePortfolio(ASSETS, RETURNS, strategy);
    assert.equal(result.strategy, strategy);
    assertWeights(result);
  }
});

test('rebalance engine returns deterministic drift directives', () => {
  const result = computeRebalance(
    { Equity_MF: 80_000, Debt_MF: 20_000 },
    { Equity_MF: 50_000, Debt_MF: 50_000 },
    2,
    1,
    24
  );

  assert.equal(result.total_portfolio_value, 100_000);
  assert.ok(result.drift_index > 0);
  assert.ok(result.assets.some(asset => asset.action_type === 'sell'));
  assert.ok(result.assets.some(asset => asset.action_type === 'buy'));
});
