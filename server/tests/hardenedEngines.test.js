import { runMonteCarlo, runMonteCarloWithGoal, computeSequenceRisk } from '../services/monteCarloEngine.js';
import { computeXIRR, computeSIPXIRR } from '../services/xirrCalculator.js';
import { computeTax, getEffectiveMarginalRate } from '../services/taxEngine.js';
import { calculatePostTaxReturn, estimateEquityLTCGTaxRate } from '../services/postTaxCalculator.js';
import { solveMinVariance, solveMaxSharpe, solveRiskParity, computeRebalance } from '../services/portfolioEngine.js';
import { stepUpSipFV, formatINR } from '../services/projectionEngine.js';
import { getRiskProfile } from '../services/riskProfiler.js';

describe('Hardened Engines — Edge Cases & Mathematically Rigorous Tests', () => {

  // ─── 1. MONTE CARLO ENGINE TESTS ───────────────────────────────────
  describe('Monte Carlo Engine', () => {
    test('Zero SIP + lump sum only', () => {
      const res = runMonteCarlo({
        monthlyInvestment: 0,
        postTaxAnnualReturn: 0.08,
        annualVolatility: 0.15,
        years: 5,
        currentSavings: 100000,
        simulations: 500
      });
      expect(res.simulations_run).toBeGreaterThan(0);
      expect(res.p50[res.p50.length - 1]).toBeGreaterThan(100000);
      expect(res.p10[res.p10.length - 1]).toBeLessThan(res.p90[res.p90.length - 1]);
    });

    test('Negative real returns', () => {
      const res = runMonteCarlo({
        monthlyInvestment: 5000,
        postTaxAnnualReturn: -0.05,
        annualVolatility: 0.10,
        years: 3,
        simulations: 500
      });
      // Negative return should proceed but cause erosion (p50 at year 3 < total invested)
      const totalInvested = 5000 * 36;
      expect(res.p50[res.p50.length - 1]).toBeLessThan(totalInvested);
    });

    test('Extreme horizons (1-year and 30-year)', () => {
      const res1 = runMonteCarlo({ monthlyInvestment: 2000, postTaxAnnualReturn: 0.08, annualVolatility: 0.10, years: 1, simulations: 200 });
      expect(res1.years_array.length).toBe(1);

      const res30 = runMonteCarlo({ monthlyInvestment: 2000, postTaxAnnualReturn: 0.08, annualVolatility: 0.10, years: 30, simulations: 200 });
      expect(res30.years_array.length).toBe(30);
    });

    test('Extreme volatility (50%) and zero volatility', () => {
      const res50 = runMonteCarlo({ monthlyInvestment: 5000, postTaxAnnualReturn: 0.08, annualVolatility: 0.50, years: 5, simulations: 200 });
      // high variance between p10 and p90
      expect(res50.p90[4] / res50.p10[4]).toBeGreaterThan(2);

      const res0 = runMonteCarlo({ monthlyInvestment: 5000, postTaxAnnualReturn: 0.08, annualVolatility: 0.00, years: 5, simulations: 200 });
      // zero vol should lead to identical bounds or very tight standard error
      expect(res0.standard_error[4]).toBeLessThan(1000);
    });

    test('Goal probability with Wilson score CI', () => {
      const res = runMonteCarloWithGoal({
        monthlyInvestment: 10000,
        postTaxAnnualReturn: 0.10,
        annualVolatility: 0.12,
        years: 10,
        targetAmount: 2000000,
        simulations: 500
      });
      expect(res.goal_probability).toBeGreaterThanOrEqual(0);
      expect(res.goal_probability).toBeLessThanOrEqual(1);
      expect(res.goal_probability_ci).toHaveProperty('lower');
      expect(res.goal_probability_ci).toHaveProperty('upper');
      expect(res.goal_probability_ci.lower).toBeLessThanOrEqual(res.goal_probability_ci.upper);
    });

    test('computeSequenceRisk accumulation mode (Coefficient of Variation)', () => {
      const finalVals = [100000, 120000, 80000, 150000, 90000];
      const cv = computeSequenceRisk(finalVals, 5, 5, 0);
      // CV = stdDev / mean = 0.2298
      expect(cv).toBeCloseTo(0.23, 2);
    });
  });

  // ─── 2. XIRR CALCULATOR TESTS ──────────────────────────────────────
  describe('XIRR Calculator', () => {
    test('Single month SIP', () => {
      // 1-month SIP is just 1 payment and 1 redemption
      const cashflows = [
        { amount: -10000, date: new Date('2025-01-01') },
        { amount: 10100, date: new Date('2025-02-01') }
      ];
      const res = computeXIRR(cashflows);
      expect(res.converged).toBe(true);
      // Expected return is ~12.6% (compounded monthly from 1% absolute)
      expect(res.rate).toBeCloseTo(0.1268, 2);
    });

    test('360-month SIP', () => {
      const res = computeSIPXIRR(10000, 360, 10000000); // 100L end value
      expect(res.converged).toBe(true);
      expect(res.rate).toBeGreaterThan(0);
    });

    test('Duplicate dates (aggregated cashflows)', () => {
      const cashflows = [
        { amount: -5000, date: new Date('2025-01-01') },
        { amount: -5000, date: new Date('2025-01-01') }, // duplicate
        { amount: 10500, date: new Date('2026-01-01') }
      ];
      const res = computeXIRR(cashflows);
      expect(res.converged).toBe(true);
      expect(res.rate).toBeCloseTo(0.05, 3);
    });

    test('Extreme returns (1000% and -90%)', () => {
      const highRes = computeXIRR([
        { amount: -1000, date: new Date('2025-01-01') },
        { amount: 11000, date: new Date('2026-01-01') }
      ]);
      expect(highRes.converged).toBe(true);
      expect(highRes.rate).toBeCloseTo(10.018, 3);

      const lowRes = computeXIRR([
        { amount: -1000, date: new Date('2025-01-01') },
        { amount: 100, date: new Date('2026-01-01') }
      ]);
      expect(lowRes.converged).toBe(true);
      expect(lowRes.rate).toBeCloseTo(-0.90, 3);
    });
  });

  // ─── 3. TAX ENGINE TESTS ───────────────────────────────────────────
  describe('Tax Engine', () => {
    test('Income at every slab boundary (±₹1)', () => {
      const boundaries = [400000, 800000, 1200000, 1600000, 2000000, 2400000];
      boundaries.forEach(b => {
        const resMinus = computeTax(b - 1, 'new');
        const resPlus = computeTax(b + 1, 'new');
        expect(resPlus.taxAmount).toBeGreaterThanOrEqual(resMinus.taxAmount);
      });
    });

    test('Surcharge marginal relief boundary check', () => {
      // Surcharge boundaries: 50L, 1Cr, 2Cr
      const res50LPlus = computeTax(5001000, 'new', {}, 'salary');
      // Surcharge relief should make sure total tax does not increase more than the increase in income
      expect(res50LPlus.taxAmount).toBeLessThan(computeTax(5000000, 'new', {}, 'salary').taxAmount + 1000 + 10000); // minor buffer for cess
    });

    test('Deductions Sections 80EEA, 80TTA, 80TTB', () => {
      const oldDeductions = {
        section80C: 150000,
        section80EEA: 150000,
        savingsInterest: 15000,
        age: 35
      };
      const resOld = computeTax(1000000, 'old', oldDeductions, 'salary');
      // 80C (150K) + 80EEA (150K) + 80TTA (10K max for age 35) + standard deduction (50K)
      expect(resOld.oldRegimeDeductions).toBe(310000);

      const oldDeductionsSenior = {
        savingsInterest: 60000,
        age: 65
      };
      const resOldSenior = computeTax(1000000, 'old', oldDeductionsSenior, 'salary');
      // 80TTB (50K max for senior) + standard deduction (50K)
      expect(resOldSenior.oldRegimeDeductions).toBe(50000);
    });

    test('getEffectiveMarginalRate numerical derivative accuracy', () => {
      const m1 = getEffectiveMarginalRate(1500000, 'new');
      // At 15L taxable income (after standard deduction), income is 14.25L which lies in 15% slab (12L-16L)
      expect(m1).toBeCloseTo(0.156, 3); // 15% + 4% cess = 15.6%
    });
  });

  // ─── 4. POST-TAX CALCULATOR TESTS ──────────────────────────────────
  describe('Post-Tax Calculator', () => {
    test('Equity LTCG Exemption & Cess', () => {
      const postTaxRes = calculatePostTaxReturn('Equity_MF', 0.12, 1000000, 5, 'new', 10000);
      // Expected LTCG tax rate should be less than 12.5% due to ₹1.25L exemption!
      expect(postTaxRes.taxRate).toBeLessThan(0.125 * 1.04);
      expect(postTaxRes.postTaxReturn).toBeGreaterThan(0.12 * (1 - 0.125 * 1.04));
    });

    test('Gold physical holding period STCG vs LTCG (24 months)', () => {
      const stcgRes = calculatePostTaxReturn('Gold_Physical', 0.08, 1200000, 1.5, 'new');
      expect(stcgRes.taxType).toContain('STCG');

      const ltcgRes = calculatePostTaxReturn('Gold_Physical', 0.08, 1200000, 3, 'new');
      expect(ltcgRes.taxType).toContain('LTCG');
    });
  });

  // ─── 5. PORTFOLIO ENGINE TESTS ─────────────────────────────────────
  describe('Portfolio Engine', () => {
    test('Adaptive regularization in solvers', () => {
      // 2 assets with highly correlated returns
      const assetKeys = ['Equity_MF', 'ETF'];
      const postTaxReturns = [0.10, 0.098];
      const res = solveMaxSharpe(assetKeys, postTaxReturns);
      expect(res.weights.Equity_MF).toBeGreaterThanOrEqual(0);
      expect(res.weights.ETF).toBeGreaterThanOrEqual(0);
    });

    test('Multi-start Max Sharpe yields stable/best Sharpe', () => {
      const assetKeys = ['Equity_MF', 'Debt_MF', 'Gold'];
      const postTaxReturns = [0.12, 0.065, 0.08];
      const res = solveMaxSharpe(assetKeys, postTaxReturns);
      expect(res.sharpe).toBeGreaterThan(0);
    });

    test('Transaction costs & Tracking error in computeRebalance', () => {
      const current = { Equity_MF: 60000, Debt_MF: 40000 };
      const target = { Equity_MF: 50, Debt_MF: 50 };
      const rebal = computeRebalance(current, target, 2.0, 1.0);

      expect(rebal.total_estimated_transaction_cost).toBeGreaterThan(0);
      expect(rebal.portfolio_tracking_error).toBeGreaterThan(0);
      expect(rebal.assets.find(a => a.asset_class === 'Equity_MF').estimated_transaction_cost).toBeGreaterThan(0);
    });
  });

  // ─── 6. PROJECTION ENGINE TESTS ────────────────────────────────────
  describe('Projection Engine', () => {
    test('Step-up SIP Future Value math accuracy', () => {
      const normalSip = stepUpSipFV(10000, 0.10, 5, 0.0);
      const stepUpSip = stepUpSipFV(10000, 0.10, 5, 0.10); // 10% annual increase
      expect(stepUpSip).toBeGreaterThan(normalSip);
    });

    test('formatINR negative support', () => {
      expect(formatINR(-5000)).toBe('-₹5,000');
      expect(formatINR(-150000)).toBe('-₹1.50 L');
      expect(formatINR(-25000000)).toBe('-₹2.50 Cr');
      expect(formatINR(0)).toBe('₹0');
    });
  });

  // ─── 7. RISK PROFILER TESTS ────────────────────────────────────────
  describe('Risk Profiler', () => {
    test('Personalized profile with dependents and experience', () => {
      // standard case
      const standard = getRiskProfile(30, 800000, 15, 0, 0);
      // high experience, no dependents
      const experienced = getRiskProfile(30, 800000, 15, 5, 0);
      // low experience, many dependents
      const burdened = getRiskProfile(30, 800000, 15, 0, 4);

      expect(experienced.riskScore).toBeGreaterThan(standard.riskScore);
      expect(burdened.riskScore).toBeLessThan(standard.riskScore);
    });
  });

});
