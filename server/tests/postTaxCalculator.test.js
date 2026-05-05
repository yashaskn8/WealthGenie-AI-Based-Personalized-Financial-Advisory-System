import { calculatePostTaxReturn, calculatePostTaxReturnSafe, validatePostTaxResult } from '../services/postTaxCalculator.js';

describe('Post-Tax Return Calculator — FY2025-26', () => {

  describe('FD (Fixed Deposit)', () => {
    test('FD taxed at marginal slab rate', () => {
      const result = calculatePostTaxReturn('FD', 0.072, 1200000, 3, 'new');
      expect(result.postTaxReturn).toBeLessThan(0.072);
      expect(result.taxType).toContain('Slab Rate');
    });

    test('FD for low income (zero tax slab) retains full return', () => {
      const result = calculatePostTaxReturn('FD', 0.072, 300000, 1, 'new');
      expect(result.postTaxReturn).toBe(0.072);
      expect(result.taxRate).toBe(0);
    });

    test('FD: post-tax = nominal × (1 - marginalRate)', () => {
      // ₹8L income new regime: taxableIncome = 7.25L → 5% slab
      const r = calculatePostTaxReturn('FD', 0.072, 800000, 1, 'new');
      expect(r.postTaxReturn).toBeCloseTo(0.072 * (1 - 0.05), 3);
    });
  });

  describe('ELSS', () => {
    test('ELSS taxed at LTCG 12.5%', () => {
      const result = calculatePostTaxReturn('ELSS', 0.125, 800000, 3, 'new');
      expect(result.taxRate).toBe(0.125);
      expect(result.postTaxReturn).toBeCloseTo(0.125 * 0.875, 3);
    });
  });

  describe('Equity MF & ETF', () => {
    test('STCG at 20% if held < 1 year', () => {
      const result = calculatePostTaxReturn('Equity_MF', 0.12, 1000000, 0.5, 'new');
      expect(result.taxRate).toBe(0.20);
      expect(result.taxType).toContain('STCG');
    });

    test('LTCG at 12.5% if held >= 1 year', () => {
      const result = calculatePostTaxReturn('ETF', 0.11, 1000000, 3, 'new');
      expect(result.taxRate).toBe(0.125);
      expect(result.taxType).toContain('LTCG');
    });

    test('Equity MF held > 1yr: LTCG at 12.5%', () => {
      const r = calculatePostTaxReturn('Equity_MF', 0.12, 1500000, 3, 'new');
      expect(r.taxRate).toBe(0.125);
      expect(r.taxType).toContain('LTCG');
    });

    test('Equity MF held < 1yr: STCG at 20%', () => {
      const r = calculatePostTaxReturn('Equity_MF', 0.12, 1500000, 0.5, 'new');
      expect(r.taxRate).toBe(0.20);
      expect(r.taxType).toContain('STCG');
    });
  });

  describe('Debt MF', () => {
    test('Debt MF taxed at slab rate (no indexation)', () => {
      const result = calculatePostTaxReturn('Debt_MF', 0.07, 1500000, 5, 'new');
      expect(result.taxType).toContain('no indexation');
      expect(result.postTaxReturn).toBeLessThan(0.07);
    });

    test('Debt MF: taxed at slab regardless of holding', () => {
      // ₹15L income new regime: taxableIncome = 14.25L → 15% slab
      const r = calculatePostTaxReturn('Debt_MF', 0.07, 1500000, 5, 'new');
      expect(r.taxRate).toBe(0.15);
    });
  });

  describe('PPF', () => {
    test('PPF is EEE — zero tax', () => {
      const result = calculatePostTaxReturn('PPF', 0.071, 2000000, 15, 'new');
      expect(result.postTaxReturn).toBe(0.071);
      expect(result.taxRate).toBe(0);
      expect(result.taxType).toContain('Exempt');
    });

    test('PPF: always zero tax (EEE)', () => {
      const r = calculatePostTaxReturn('PPF', 0.071, 800000, 15, 'new');
      expect(r.taxRate).toBe(0);
      expect(r.postTaxReturn).toBe(0.071);
    });
  });

  describe('NPS', () => {
    test('NPS has partial EET taxation', () => {
      const result = calculatePostTaxReturn('NPS', 0.10, 1200000, 25, 'new');
      expect(result.taxType).toContain('EET');
      expect(result.postTaxReturn).toBeLessThan(0.10);
      expect(result.postTaxReturn).toBeGreaterThan(0);
    });
  });

  describe('Gold', () => {
    test('Gold ETF LTCG at 12.5% if held > 1 year', () => {
      const result = calculatePostTaxReturn('Gold', 0.09, 800000, 3, 'new');
      expect(result.taxRate).toBe(0.125);
    });

    test('Gold ETF STCG at slab rate if held < 1 year', () => {
      const result = calculatePostTaxReturn('Gold', 0.09, 1500000, 0.5, 'new');
      expect(result.taxType).toContain('STCG');
    });
  });

  describe('Edge Cases', () => {
    test('unknown instrument type throws error', () => {
      expect(() => {
        calculatePostTaxReturn('Bitcoin', 0.50, 1000000, 1, 'new');
      }).toThrow('Unknown instrument type');
    });

    test('old regime produces different marginal rate', () => {
      const newResult = calculatePostTaxReturn('FD', 0.072, 1500000, 1, 'new');
      const oldResult = calculatePostTaxReturn('FD', 0.072, 1500000, 1, 'old');
      // At ₹15L, new regime marginal=15%, old regime marginal=30%
      expect(newResult.taxRate).not.toBe(oldResult.taxRate);
    });
  });

  describe('Comprehensive Validations (FY2025-26)', () => {
    const PROFILE = { income: 780000, regime: 'new', horizon: 15 };

    test('PPF: post-tax equals nominal (EEE)', () => {
      const r = calculatePostTaxReturnSafe(
        'PPF', 0.071, PROFILE.income, PROFILE.horizon, PROFILE.regime
      );
      expect(r.postTaxReturn).toBe(0.071);
      expect(r.taxRate).toBe(0);
      expect(r.postTaxReturn).not.toBeGreaterThan(0.071);
    });

    test('NPS: post-tax is less than nominal', () => {
      const r = calculatePostTaxReturnSafe(
        'NPS', 0.105, PROFILE.income, PROFILE.horizon, PROFILE.regime
      );
      expect(r.postTaxReturn).toBeLessThan(0.105);
      expect(r.postTaxReturn).toBeCloseTo(0.1029, 3);
    });

    test('SGB: post-tax is less than nominal', () => {
      const r = calculatePostTaxReturnSafe(
        'SGB', 0.105, PROFILE.income, 8, PROFILE.regime
      );
      expect(r.postTaxReturn).toBeLessThan(0.105);
    });

    test('Index MF held 15yr: LTCG 12.5% applied', () => {
      const r = calculatePostTaxReturnSafe(
        'Equity_MF', 0.125, PROFILE.income, 15, PROFILE.regime
      );
      expect(r.postTaxReturn).toBeCloseTo(0.125 * 0.875, 3);
      expect(r.taxRate).toBe(0.125);
    });

    test('Gold ETF held 15yr: LTCG 12.5% applied', () => {
      const r = calculatePostTaxReturnSafe(
        'Gold', 0.085, PROFILE.income, 15, PROFILE.regime
      );
      expect(r.postTaxReturn).toBeCloseTo(0.085 * 0.875, 3);
    });

    test('FD: post-tax at 5% marginal slab', () => {
      const r = calculatePostTaxReturnSafe(
        'FD', 0.0725, PROFILE.income, 1, PROFILE.regime
      );
      expect(r.postTaxReturn).toBeCloseTo(0.068875, 4);
      expect(r.taxRate).toBe(0.05);
    });

    test('validation: throws on post-tax exceeding nominal', () => {
      // Simulate the PPF bug
      const badResult = { postTaxReturn: 0.171, taxRate: -1 };
      process.env.NODE_ENV = 'production';
      const validated = validatePostTaxResult(
        badResult, 0.071, 'PPF'
      );
      // In production mode, must return safe fallback
      expect(validated.postTaxReturn).toBeLessThanOrEqual(0.071);
      process.env.NODE_ENV = 'test';
    });

    test('no instrument has post-tax return exceeding nominal', () => {
      const instruments = [
        ['PPF', 0.071], ['NPS', 0.105], ['SGB', 0.105],
        ['FD', 0.0725], ['RBI_Bond', 0.0805],
        ['Equity_MF', 0.125], ['Gold', 0.085],
      ];
      instruments.forEach(([type, nominal]) => {
        const r = calculatePostTaxReturnSafe(
          type, nominal, 780000, 15, 'new'
        );
        expect(r.postTaxReturn).toBeLessThanOrEqual(nominal + 0.001);
      });
    });

    test('Liquid MF: 7.0% nominal at 5% slab = 6.65% post-tax', () => {
      const r = calculatePostTaxReturnSafe(
        'Liquid_MF', 0.07, 780000, 1, 'new'
      );
      expect(r.postTaxReturn).toBeCloseTo(0.0665, 3);
      expect(r.taxRate).toBe(0.05);
      expect(r.postTaxReturn).toBeLessThan(0.07);
    });

    test('Debt MF: 7.5% nominal at 5% slab = 7.125% post-tax', () => {
      const r = calculatePostTaxReturnSafe(
        'Debt_MF', 0.075, 780000, 1, 'new'
      );
      expect(r.postTaxReturn).toBeCloseTo(0.07125, 3);
    });
  });
});
