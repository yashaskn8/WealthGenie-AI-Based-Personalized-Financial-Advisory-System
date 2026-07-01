import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTaxableIncome, computeTax } from '../services/taxEngine.js';

test('new regime Section 87A rebate zeros tax at the FY2025-26 threshold', () => {
  const result = computeTax(1_275_000, 'new');
  assert.equal(result.taxableIncome, 1_200_000);
  assert.equal(result.taxAmount, 0);
  assert.equal(result.rebateApplied, true);
});

test('new regime marginal relief caps the rebate cliff immediately above threshold', () => {
  const result = computeTax(1_276_000, 'new');
  assert.equal(result.taxableIncome, 1_201_000);
  assert.equal(result.taxBeforeCess, 1_000);
  assert.equal(result.taxAmount, 1_040);
  assert.equal(result.marginalReliefApplied, true);
});

test('old regime applies granular Section 80D self and parent caps', () => {
  const result = calculateTaxableIncome(1_000_000, 'old', {
    section80D_self: 30_000,
    section80D_parents: 60_000,
    parents_senior: true,
    age: 35,
  });

  assert.equal(result.allowed80D, 75_000);
  assert.ok(result.oldRegimeDeductions >= 75_000);
});
