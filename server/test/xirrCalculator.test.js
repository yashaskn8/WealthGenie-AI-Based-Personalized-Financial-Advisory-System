import test from 'node:test';
import assert from 'node:assert/strict';
import { computeXIRR } from '../services/xirrCalculator.js';

test('computeXIRR converges for a simple annual investment', () => {
  const result = computeXIRR([
    { amount: -100_000, date: '2024-01-01' },
    { amount: 110_000, date: '2025-01-01' },
  ]);

  assert.equal(result.converged, true);
  assert.ok(Math.abs(result.rate - 0.10) < 0.003, `rate=${result.rate}`);
});

test('computeXIRR converges for SIP-style irregular cash flows', () => {
  const cashflows = Array.from({ length: 12 }, (_, index) => ({
    amount: -10_000,
    date: `2024-${String(index + 1).padStart(2, '0')}-01`,
  }));
  cashflows.push({ amount: 130_000, date: '2025-01-01' });

  const result = computeXIRR(cashflows);
  assert.equal(result.converged, true);
  assert.ok(result.rate > 0.10 && result.rate < 0.30, `rate=${result.rate}`);
});

test('computeXIRR rejects cash flows without opposite signs', () => {
  const result = computeXIRR([
    { amount: 1000, date: '2024-01-01' },
    { amount: 1100, date: '2025-01-01' },
  ]);

  assert.equal(result.converged, false);
  assert.match(result.error, /positive and negative/);
});
