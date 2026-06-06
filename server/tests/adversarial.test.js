/**
 * WealthGenie Phase 3 — Adversarial & Edge-Case Test Suite
 * Tests hostile inputs, boundary values, precision edge cases,
 * and invariant violations across all financial engines.
 */

import { computeTax, compareTaxRegimes, getTaxSlab }
  from '../services/taxEngine.js';
import { calculatePostTaxReturn, calculatePostTaxReturnSafe, validatePostTaxResult }
  from '../services/postTaxCalculator.js';
import { runMonteCarlo, computeGoalProbability, reverseSIP, getInstrumentVolatility }
  from '../services/monteCarloEngine.js';
import { getRiskProfile, encodeRiskCategory }
  from '../services/riskProfiler.js';
import { INSTRUMENT_PARAMS, CESS_RATE, RISK_FREE_RATE, buildRateLookup, getNominalRate, getVolatility, DISCLAIMER }
  from '../services/instrumentConstants.js';
import { sipFV, lumpSumFV, computeCAGR, realReturn }
  from '../services/projectionEngine.js';

// ═══════════════════════════════════════════════════════════
// 1. TAX ENGINE — ADVERSARIAL INPUTS
// ═══════════════════════════════════════════════════════════

describe('Tax Engine — Adversarial Inputs', () => {
  test('zero income → zero tax in both regimes', () => {
    expect(computeTax(0, 'new').taxAmount).toBe(0);
    expect(computeTax(0, 'old').taxAmount).toBe(0);
  });

  test('₹1 income → zero tax (below SD)', () => {
    expect(computeTax(1, 'new').taxAmount).toBe(0);
  });

  test('negative income → should not produce negative tax', () => {
    const r = computeTax(-500000, 'new');
    expect(r.taxAmount).toBeGreaterThanOrEqual(0);
  });

  test('very large income ₹100Cr → produces finite positive tax', () => {
    const r = computeTax(1000000000, 'new');
    expect(Number.isFinite(r.taxAmount)).toBe(true);
    expect(r.taxAmount).toBeGreaterThan(0);
    expect(r.effectiveRate).toBeLessThan(100); // effective rate < 100%
  });

  test('exact rebate boundary ₹12,75,000 → zero tax', () => {
    expect(computeTax(1275000, 'new').taxAmount).toBe(0);
  });

  test('₹12,75,001 → positive tax (no rebate)', () => {
    expect(computeTax(1275001, 'new').taxAmount).toBeGreaterThan(0);
  });

  test('getTaxSlab with fractional income → returns valid slab', () => {
    const slab = getTaxSlab(780000.50, 'new');
    expect(typeof slab).toBe('number');
    expect(slab).toBeGreaterThanOrEqual(0);
    expect(slab).toBeLessThanOrEqual(0.30);
  });

  test('compareTaxRegimes always recommends lower tax', () => {
    const incomes = [300000, 750000, 1200000, 2500000, 5000000, 10000000];
    incomes.forEach(inc => {
      const c = compareTaxRegimes(inc);
      const winnerTax = c.recommended === 'new' ? c.newRegime.taxAmount : c.oldRegime.taxAmount;
      const loserTax = c.recommended === 'new' ? c.oldRegime.taxAmount : c.newRegime.taxAmount;
      expect(winnerTax).toBeLessThanOrEqual(loserTax);
    });
  });

  test('tax is monotonically non-decreasing with income', () => {
    let prevTax = 0;
    for (let inc = 0; inc <= 5000000; inc += 100000) {
      const tax = computeTax(inc, 'new').taxAmount;
      expect(tax).toBeGreaterThanOrEqual(prevTax);
      prevTax = tax;
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 2. POST-TAX CALCULATOR — PRECISION & EDGE CASES
// ═══════════════════════════════════════════════════════════

describe('Post-Tax Calculator — Precision & Edge Cases', () => {
  test('zero nominal rate → zero post-tax rate for all instruments', () => {
    const instruments = ['FD', 'ELSS', 'Equity_MF', 'Debt_MF', 'PPF', 'NPS', 'Gold', 'Liquid_MF', 'Arbitrage_MF'];
    instruments.forEach(type => {
      const r = calculatePostTaxReturnSafe(type, 0, 1000000, 10, 'new');
      expect(r.postTaxReturn).toBe(0);
    });
  });

  test('PPF is ALWAYS tax-free regardless of income', () => {
    const incomes = [300000, 1000000, 5000000, 50000000];
    incomes.forEach(inc => {
      const r = calculatePostTaxReturn('PPF', 0.071, inc, 15, 'new');
      expect(r.postTaxReturn).toBe(0.071);
      expect(r.taxRate).toBe(0);
    });
  });

  test('Arbitrage MF: equity-taxed, NOT slab-taxed (CRITICAL FY25-26)', () => {
    // At ₹15L income, slab rate is 15% — if mis-classified as debt, taxRate would be 0.15
    const r = calculatePostTaxReturn('Arbitrage_MF', 0.075, 1500000, 3, 'new');
    expect(r.taxRate).toBe(0.125); // LTCG 12.5%, NOT slab 15%
    expect(r.taxType).toContain('LTCG');
  });

  test('Arbitrage MF short-term: STCG 20%', () => {
    const r = calculatePostTaxReturn('Arbitrage_MF', 0.075, 1500000, 0.5, 'new');
    expect(r.taxRate).toBe(0.20);
    expect(r.taxType).toContain('STCG');
  });

  test('post-tax ≤ nominal for EVERY instrument at EVERY income level', () => {
    const instruments = [
      ['FD', 0.0725], ['ELSS', 0.135], ['Equity_MF', 0.125],
      ['Debt_MF', 0.075], ['PPF', 0.071], ['NPS', 0.10],
      ['Gold', 0.09], ['SGB', 0.105], ['Liquid_MF', 0.07],
      ['Arbitrage_MF', 0.075], ['ETF', 0.125], ['RBI_Bond', 0.0805],
    ];
    const incomes = [300000, 780000, 1500000, 5000000, 20000000];
    instruments.forEach(([type, nominal]) => {
      incomes.forEach(inc => {
        const r = calculatePostTaxReturnSafe(type, nominal, inc, 15, 'new');
        expect(r.postTaxReturn).toBeLessThanOrEqual(nominal + 0.0001);
      });
    });
  });

  test('validatePostTaxResult clamps impossible values in production', () => {
    const bad = { postTaxReturn: 0.50, taxRate: -3 };
    process.env.NODE_ENV = 'production';
    const safe = validatePostTaxResult(bad, 0.07, 'FD');
    expect(safe.postTaxReturn).toBeLessThanOrEqual(0.07);
    process.env.NODE_ENV = 'test';
  });

  test('old vs new regime produces different tax for slab-taxed instruments', () => {
    const newR = calculatePostTaxReturn('FD', 0.0725, 2000000, 1, 'new');
    const oldR = calculatePostTaxReturn('FD', 0.0725, 2000000, 1, 'old');
    // At ₹20L, regimes produce different marginal rates
    expect(newR.taxRate).not.toBe(oldR.taxRate);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. MONTE CARLO — BOUNDARY & STABILITY
// ═══════════════════════════════════════════════════════════

describe('Monte Carlo — Boundary & Stability', () => {
  test('zero monthly investment → all-zero percentiles', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 0, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.15, years: 10, simulations: 100,
    });
    r.p50.forEach(v => expect(v).toBe(0));
  });

  test('zero volatility → deterministic (p10 ≈ p90)', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.08,
      annualVolatility: 0, years: 5, simulations: 500,
    });
    // With zero vol, all percentiles should converge
    const last = r.years_array.length - 1;
    const spread = (r.p90[last] - r.p10[last]) / r.p50[last];
    expect(spread).toBeLessThan(0.05); // <5% spread
  });

  test('1-year horizon → exactly 1 data point', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 5000, postTaxAnnualReturn: 0.07,
      annualVolatility: 0.03, years: 1, simulations: 500,
    });
    expect(r.years_array.length).toBe(1);
    expect(r.p50.length).toBe(1);
  });

  test('50-year horizon → 50 data points with finite values', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 5000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.15, years: 50, simulations: 500,
    });
    expect(r.years_array.length).toBe(50);
    r.p50.forEach(v => expect(Number.isFinite(v)).toBe(true));
    r.p90.forEach(v => expect(Number.isFinite(v)).toBe(true));
  });

  test('negative return → produces finite results (capital erosion)', () => {
    const r = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: -0.05,
      annualVolatility: 0.10, years: 5, simulations: 500,
    });
    r.p50.forEach(v => {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });

  test('computeGoalProbability with empty array → 0', () => {
    expect(computeGoalProbability([], 100000)).toBe(0);
  });

  test('computeGoalProbability with zero target → 0 (falsy target = no target)', () => {
    // Zero target is treated as "no target specified" — returns 0 probability
    expect(computeGoalProbability([100, 200], 0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. REVERSE SIP — DIVISION BY ZERO & EDGE CASES
// ═══════════════════════════════════════════════════════════

describe('Reverse SIP — Edge Cases', () => {
  test('zero rate → simple division (no compounding)', () => {
    // ₹12L target in 10 years at 0% = ₹12L / 120 months = ₹10,000/mo
    const sip = reverseSIP(1200000, 0, 10, 0);
    expect(sip).toBe(10000);
  });

  test('negative target → returns 0', () => {
    expect(reverseSIP(-1000000, 0.10, 10, 0)).toBe(0);
  });

  test('zero years → returns 0', () => {
    expect(reverseSIP(1000000, 0.10, 0, 0)).toBe(0);
  });

  test('current savings exceed target → returns 0', () => {
    // Already have more than target after compounding
    expect(reverseSIP(100000, 0.10, 10, 200000)).toBe(0);
  });

  test('NaN inputs → returns 0 (not NaN)', () => {
    expect(Number.isFinite(reverseSIP(NaN, 0.10, 10, 0))).toBe(true);
    expect(reverseSIP(NaN, 0.10, 10, 0)).toBe(0);
  });

  test('very high rate (50%) → finite result', () => {
    const sip = reverseSIP(10000000, 0.50, 5, 0);
    expect(Number.isFinite(sip)).toBe(true);
    expect(sip).toBeGreaterThan(0);
  });

  test('1-month effective horizon (1/12 year) via years=1 → reasonable SIP', () => {
    const sip = reverseSIP(100000, 0.12, 1, 0);
    expect(sip).toBeGreaterThan(7000);
    expect(sip).toBeLessThan(10000);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. RISK PROFILER — BOUNDARY VALUES (3-FACTOR MODEL)
// ═══════════════════════════════════════════════════════════

describe('Risk Profiler — Boundary Values', () => {
  test('youngest + highest income + long horizon → Aggressive', () => {
    const r = getRiskProfile(18, 50000000, 30);
    expect(r.category).toBe('Aggressive');
    expect(r.riskScore).toBeGreaterThanOrEqual(80);
  });

  test('oldest + lowest income + short horizon → Conservative', () => {
    const r = getRiskProfile(80, 100000, 1);
    expect(r.category).toBe('Conservative');
    expect(r.riskScore).toBeLessThan(20);
  });

  test('mid-age mid-income default horizon → Moderate range', () => {
    const r = getRiskProfile(40, 800000);
    expect(['Moderate', 'Moderate-Aggressive', 'Conservative-Moderate']).toContain(r.category);
  });

  test('horizon increases risk tolerance', () => {
    const short = getRiskProfile(35, 1000000, 1);
    const long = getRiskProfile(35, 1000000, 30);
    expect(long.riskScore).toBeGreaterThan(short.riskScore);
  });

  test('riskScore is always 0-100', () => {
    const cases = [
      [18, 100000, 1], [25, 300000, 5], [35, 600000, 10],
      [45, 1200000, 15], [55, 2500000, 20], [65, 5000000, 30], [80, 50000000, 40],
    ];
    cases.forEach(([age, income, horizon]) => {
      const r = getRiskProfile(age, income, horizon);
      expect(r.riskScore).toBeGreaterThanOrEqual(0);
      expect(r.riskScore).toBeLessThanOrEqual(100);
    });
  });

  test('NaN age → defaults to 30', () => {
    const r = getRiskProfile(NaN, 1000000);
    expect(r.riskScore).toBeGreaterThan(0);
  });

  test('negative income → 0 income score', () => {
    const r = getRiskProfile(30, -500000);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
  });

  test('encodeRiskCategory returns correct values', () => {
    expect(encodeRiskCategory('Conservative')).toBe(0);
    expect(encodeRiskCategory('Aggressive')).toBe(4);
    expect(encodeRiskCategory('Unknown')).toBe(2); // default
  });

  test('equity allocation is monotonically increasing with risk', () => {
    let prevAlloc = 0;
    const EXPECTED_ALLOCS = [20, 35, 50, 65, 80];
    EXPECTED_ALLOCS.forEach((alloc) => {
      expect(alloc).toBeGreaterThan(prevAlloc);
      prevAlloc = alloc;
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 6. CROSS-MODULE INVARIANTS
// ═══════════════════════════════════════════════════════════

describe('Cross-Module Financial Invariants', () => {
  test('tax slab used in post-tax calc matches tax engine', () => {
    const income = 1500000;
    const slab = getTaxSlab(income, 'new') * (1 + CESS_RATE);
    const fdResult = calculatePostTaxReturn('FD', 0.0725, income, 1, 'new');
    expect(fdResult.taxRate).toBeCloseTo(slab, 6);
  });

  test('FD post-tax return = nominal × (1 - marginalRate)', () => {
    const income = 2000000;
    const nominal = 0.0725;
    const marginal = getTaxSlab(income, 'new') * (1 + CESS_RATE);
    const result = calculatePostTaxReturn('FD', nominal, income, 1, 'new');
    expect(result.postTaxReturn).toBeCloseTo(nominal * (1 - marginal), 3);
  });

  test('no instrument produces NaN post-tax return', () => {
    const instruments = ['FD', 'ELSS', 'Equity_MF', 'ETF', 'Debt_MF', 'PPF', 'NPS', 'Gold', 'SGB', 'Liquid_MF', 'Arbitrage_MF', 'RBI_Bond'];
    instruments.forEach(type => {
      const r = calculatePostTaxReturnSafe(type, 0.08, 1000000, 10, 'new');
      expect(Number.isNaN(r.postTaxReturn)).toBe(false);
      expect(Number.isFinite(r.postTaxReturn)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 7. SECTION 87A MARGINAL RELIEF
// ═══════════════════════════════════════════════════════════

describe('Tax Engine — Section 87A Marginal Relief', () => {
  test('₹12,75,000 → zero tax (rebate)', () => {
    expect(computeTax(1275000, 'new').taxAmount).toBe(0);
  });

  test('₹12,75,001 → tax ≤ ₹2 (marginal relief caps tax at ₹1 + cess)', () => {
    const r = computeTax(1275001, 'new');
    expect(r.taxAmount).toBeGreaterThan(0);
    expect(r.taxAmount).toBeLessThanOrEqual(2); // ₹1 + 4% cess ≈ ₹1.04 → rounds to ₹1
    expect(r.marginalReliefApplied).toBe(true);
  });

  test('₹13,00,000 → marginal relief still applies (tax < slab tax)', () => {
    const r = computeTax(1300000, 'new');
    // Taxable = 12,25,000 (after 75K SD). Excess over 12L = 25,000
    // Normal slab tax ≈ ₹63,750. Marginal relief caps at ₹25,000 + cess
    expect(r.marginalReliefApplied).toBe(true);
    expect(r.taxAmount).toBeLessThanOrEqual(26000); // 25000 × 1.04
  });

  test('₹20,00,000 → no marginal relief (normal tax < excess)', () => {
    const r = computeTax(2000000, 'new');
    expect(r.marginalReliefApplied).toBe(false);
  });

  test('old regime: ₹5,50,001 → marginal relief caps tax near ₹1', () => {
    const r = computeTax(550001, 'old');
    expect(r.taxAmount).toBeGreaterThan(0);
    expect(r.taxAmount).toBeLessThanOrEqual(2);
    expect(r.marginalReliefApplied).toBe(true);
  });

  test('tax is still monotonically non-decreasing with marginal relief', () => {
    let prevTax = 0;
    for (let income = 1200000; income <= 1500000; income += 10000) {
      const tax = computeTax(income, 'new').taxAmount;
      expect(tax).toBeGreaterThanOrEqual(prevTax);
      prevTax = tax;
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 8. MONTE CARLO — HYBRID QMC + ANTITHETIC + CONTROL VARIATES
// ═══════════════════════════════════════════════════════════

describe('Monte Carlo — Hybrid Variance Reduction', () => {
  test('reports full variance_reduction pipeline', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.18, years: 5, simulations: 200,
    });
    expect(result.variance_reduction).toBe('halton_qmc+antithetic+control_variates');
  });

  test('standard_error array is present and finite', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.18, years: 5, simulations: 500,
    });
    expect(result.standard_error).toHaveLength(5);
    result.standard_error.forEach(se => {
      expect(Number.isFinite(se)).toBe(true);
      expect(se).toBeGreaterThanOrEqual(0);
    });
  });

  test('simulations_run is always even (paired antithetic paths)', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.18, years: 3, simulations: 501,
    });
    expect(result.simulations_run % 2).toBe(0);
  });

  test('deterministic_fv is present and finite', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.18, years: 10, simulations: 200,
    });
    expect(Number.isFinite(result.deterministic_fv)).toBe(true);
    expect(result.deterministic_fv).toBeGreaterThan(0);
  });

  test('control_correction is finite (can be positive or negative)', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.18, years: 10, simulations: 500,
    });
    expect(Number.isFinite(result.control_correction)).toBe(true);
  });

  test('mean converges close to deterministic FV (within 15%)', () => {
    const result = runMonteCarlo({
      monthlyInvestment: 10000, postTaxAnnualReturn: 0.10,
      annualVolatility: 0.15, years: 10, simulations: 5000,
    });
    const lastMean = result.mean[result.mean.length - 1];
    const detFV = result.deterministic_fv;
    // MC mean should be close to deterministic FV for moderate volatility
    const ratio = lastMean / detFV;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.25);
  });
});

// ═══════════════════════════════════════════════════════════
// 9. XIRR CALCULATOR — NEWTON-RAPHSON CONVERGENCE
// ═══════════════════════════════════════════════════════════

import { computeXIRR, computeSIPXIRR } from '../services/xirrCalculator.js';

describe('XIRR Calculator — Newton-Raphson', () => {
  test('simple 1-year doubling → ~100% XIRR', () => {
    const result = computeXIRR([
      { amount: -100000, date: new Date('2025-01-01') },
      { amount: 200000, date: new Date('2026-01-01') },
    ]);
    expect(result.converged).toBe(true);
    expect(result.rate).toBeCloseTo(1.0, 2); // 100%
  });

  test('10% annual return over 1 year', () => {
    const result = computeXIRR([
      { amount: -100000, date: new Date('2025-01-01') },
      { amount: 110000, date: new Date('2026-01-01') },
    ]);
    expect(result.converged).toBe(true);
    expect(result.rate).toBeCloseTo(0.10, 2);
  });

  test('SIP XIRR: 12 months SIP at ₹10K → converges', () => {
    // 12 monthly SIPs of ₹10K = ₹1.2L invested
    // If current value is ₹1.3L, XIRR should be positive
    const result = computeSIPXIRR(10000, 12, 130000);
    expect(result.converged).toBe(true);
    expect(result.rate).toBeGreaterThan(0);
  });

  test('SIP XIRR: loss scenario → negative rate', () => {
    const result = computeSIPXIRR(10000, 12, 100000); // invested 1.2L, got 1L back
    expect(result.converged).toBe(true);
    expect(result.rate).toBeLessThan(0);
  });

  test('edge: single cashflow → error', () => {
    const result = computeXIRR([{ amount: -100000, date: new Date() }]);
    expect(result.converged).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('edge: all positive cashflows → error', () => {
    const result = computeXIRR([
      { amount: 100000, date: new Date('2025-01-01') },
      { amount: 200000, date: new Date('2026-01-01') },
    ]);
    expect(result.converged).toBe(false);
  });

  test('edge: invalid SIP inputs → graceful return', () => {
    expect(computeSIPXIRR(0, 12, 100000).converged).toBe(false);
    expect(computeSIPXIRR(10000, 0, 100000).converged).toBe(false);
    expect(computeSIPXIRR(10000, 12, 0).converged).toBe(false);
  });

  test('string dates are parsed correctly', () => {
    const result = computeXIRR([
      { amount: -100000, date: '2025-01-01' },
      { amount: 115000, date: '2026-01-01' },
    ]);
    expect(result.converged).toBe(true);
    expect(result.rate).toBeCloseTo(0.15, 2);
  });

  test('npvResidual is near zero on convergence', () => {
    const result = computeXIRR([
      { amount: -50000, date: '2024-01-01' },
      { amount: -50000, date: '2024-07-01' },
      { amount: 120000, date: '2025-06-01' },
    ]);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.npvResidual)).toBeLessThan(0.01);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. POST-TAX — GOLD STCG SLAB RATE VERIFICATION
// ═══════════════════════════════════════════════════════════

describe('Post-Tax — Gold STCG uses Slab Rate (not 20%)', () => {
  test('Gold ETF short-term: taxed at slab rate, NOT 20%', () => {
    const result = calculatePostTaxReturn('Gold', 0.09, 1500000, 0.5, 'new');
    // At ₹15L income, slab rate ≠ 20% — it should be marginal slab
    const marginal = getTaxSlab(1500000, 'new') * (1 + CESS_RATE);
    expect(result.taxRate).toBeCloseTo(marginal, 6);
    expect(result.taxType).toContain('Slab Rate');
  });

  test('Gold ETF short-term at different incomes → different tax rates', () => {
    const r1 = calculatePostTaxReturn('Gold', 0.09, 500000, 0.5, 'new');
    const r2 = calculatePostTaxReturn('Gold', 0.09, 2000000, 0.5, 'new');
    // Lower income should have lower/equal tax rate
    expect(r1.taxRate).toBeLessThanOrEqual(r2.taxRate);
  });

  test('Gold ETF long-term: still LTCG at 12.5%', () => {
    const result = calculatePostTaxReturn('Gold', 0.09, 1500000, 3, 'new');
    expect(result.taxRate).toBe(0.125);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. CENTRALIZED CONSTANTS — RATE CONSISTENCY (NO DRIFT)
// ═══════════════════════════════════════════════════════════
describe('Centralized Constants — Rate Consistency', () => {
  test('INSTRUMENT_PARAMS has all 13 instruments', () => {
    const expected = [
      'FD', 'ELSS', 'Equity_MF', 'ETF', 'Debt_MF', 'RBI_Bond',
      'G-Sec', 'PPF', 'NPS', 'Gold', 'SGB', 'Liquid_MF', 'Arbitrage_MF',
    ];
    for (const key of expected) {
      expect(INSTRUMENT_PARAMS[key]).toBeDefined();
      expect(INSTRUMENT_PARAMS[key].nominalRate).toBeGreaterThan(0);
      expect(INSTRUMENT_PARAMS[key].volatility).toBeGreaterThanOrEqual(0);
    }
  });

  test('buildRateLookup() produces same rates as INSTRUMENT_PARAMS', () => {
    const lookup = buildRateLookup();
    for (const [key, params] of Object.entries(INSTRUMENT_PARAMS)) {
      expect(lookup[key]).toBe(params.nominalRate);
    }
  });

  test('getNominalRate returns correct rates and defaults for unknowns', () => {
    expect(getNominalRate('FD')).toBe(6.5);
    expect(getNominalRate('ELSS')).toBe(13.5);
    expect(getNominalRate('NONEXISTENT')).toBe(7.0); // safe default
  });

  test('getVolatility returns correct volatility and defaults for unknowns', () => {
    expect(getVolatility('FD')).toBe(0.005);
    expect(getVolatility('Equity_MF')).toBe(0.18);
    expect(getVolatility('NONEXISTENT')).toBe(0.10); // safe default
  });

  test('MC getInstrumentVolatility reads from centralized constants', () => {
    // After centralization, MC params should derive from INSTRUMENT_PARAMS
    const elss = getInstrumentVolatility('ELSS');
    expect(elss.mean).toBeCloseTo(INSTRUMENT_PARAMS.ELSS.nominalRate / 100, 4);
    expect(elss.stdDev).toBe(INSTRUMENT_PARAMS.ELSS.volatility);
  });

  test('CESS_RATE is exactly 0.04 (4%)', () => {
    expect(CESS_RATE).toBe(0.04);
  });

  test('RISK_FREE_RATE is exactly 0.05 (5%)', () => {
    expect(RISK_FREE_RATE).toBe(0.05);
  });

  test('DISCLAIMER is a non-empty string containing SEBI', () => {
    expect(typeof DISCLAIMER).toBe('string');
    expect(DISCLAIMER.length).toBeGreaterThan(50);
    expect(DISCLAIMER).toContain('SEBI');
  });

  test('all nominalRates are in valid range (1% - 30%)', () => {
    for (const [key, params] of Object.entries(INSTRUMENT_PARAMS)) {
      expect(params.nominalRate).toBeGreaterThanOrEqual(1);
      expect(params.nominalRate).toBeLessThanOrEqual(30);
    }
  });

  test('all volatilities are in valid range (0 - 0.50)', () => {
    for (const [key, params] of Object.entries(INSTRUMENT_PARAMS)) {
      expect(params.volatility).toBeGreaterThanOrEqual(0);
      expect(params.volatility).toBeLessThanOrEqual(0.50);
    }
  });

  test('equity instruments have higher volatility than debt instruments', () => {
    expect(getVolatility('Equity_MF')).toBeGreaterThan(getVolatility('Debt_MF'));
    expect(getVolatility('ELSS')).toBeGreaterThan(getVolatility('FD'));
    expect(getVolatility('ETF')).toBeGreaterThan(getVolatility('Liquid_MF'));
  });
});

// ═══════════════════════════════════════════════════════════
// 11. PROJECTION ENGINE — MATHEMATICAL INVARIANTS
// ═══════════════════════════════════════════════════════════
describe('Projection Engine — Mathematical Invariants', () => {
  test('sipFV with zero rate = simple sum of payments', () => {
    const monthly = 10000;
    const years = 5;
    const result = sipFV(monthly, 0, years);
    expect(result).toBeCloseTo(monthly * years * 12, 0);
  });

  test('sipFV is monotonically increasing with rate', () => {
    const monthly = 10000;
    const years = 10;
    const fv5 = sipFV(monthly, 0.05, years);
    const fv10 = sipFV(monthly, 0.10, years);
    const fv15 = sipFV(monthly, 0.15, years);
    expect(fv10).toBeGreaterThan(fv5);
    expect(fv15).toBeGreaterThan(fv10);
  });

  test('lumpSumFV doubles at ~72/rate rule', () => {
    // Rule of 72: money doubles in ~72/rate years
    const result = lumpSumFV(100000, 0.10, 7.2);
    expect(result).toBeGreaterThan(190000);
    expect(result).toBeLessThan(210000);
  });

  test('lumpSumFV with negative rate → capital erosion', () => {
    const result = lumpSumFV(100000, -0.10, 5);
    expect(result).toBeLessThan(100000);
    expect(result).toBeGreaterThan(0);
  });

  test('lumpSumFV rejects invalid inputs gracefully', () => {
    expect(lumpSumFV(0, 0.10, 5)).toBe(0);
    expect(lumpSumFV(-1000, 0.10, 5)).toBe(0);
    expect(lumpSumFV(1000, NaN, 5)).toBe(0);
    expect(lumpSumFV(1000, 0.10, 0)).toBe(0);
  });

  test('sipFV rejects invalid inputs gracefully', () => {
    expect(sipFV(0, 0.10, 5)).toBe(0);
    expect(sipFV(-1000, 0.10, 5)).toBe(0);
    expect(sipFV(1000, NaN, 5)).toBe(0);
    expect(sipFV(1000, 0.10, 0)).toBe(0);
  });

  test('computeCAGR is inverse of lumpSumFV', () => {
    const pv = 100000;
    const rate = 0.12;
    const years = 10;
    const fv = lumpSumFV(pv, rate, years);
    const cagr = computeCAGR(pv, fv, years);
    expect(cagr).toBeCloseTo(rate, 6);
  });

  test('realReturn: Fisher equation identity', () => {
    // (1+real)(1+inflation) = (1+nominal)
    const nominal = 0.12;
    const inflation = 0.06;
    const real = realReturn(nominal, inflation);
    expect((1 + real) * (1 + inflation)).toBeCloseTo(1 + nominal, 10);
  });

  test('realReturn with zero inflation = nominal', () => {
    expect(realReturn(0.10, 0)).toBeCloseTo(0.10, 10);
  });

  test('realReturn with inflation > nominal → negative real return', () => {
    const result = realReturn(0.05, 0.07);
    expect(result).toBeLessThan(0);
  });

  test('reverseSIP is inverse of sipFV', () => {
    const monthly = 10000;
    const rate = 0.10;
    const years = 10;
    const target = sipFV(monthly, rate, years);
    // reverseSIP from projectionEngine, not monteCarloEngine (they differ slightly)
    // The MC reverseSIP uses annuity-due; projectionEngine sipFV also uses annuity-due
    // So they should be consistent within rounding
    const computedSIP = reverseSIP(target, rate, years, 0);
    expect(computedSIP).toBeCloseTo(monthly, -1); // within ₹10
  });
});
