import { calculatePostTaxReturn } from '../services/postTaxCalculator.js';

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
  });

  describe('Debt MF', () => {
    test('Debt MF taxed at slab rate (no indexation)', () => {
      const result = calculatePostTaxReturn('Debt_MF', 0.07, 1500000, 5, 'new');
      expect(result.taxType).toContain('no indexation');
      expect(result.postTaxReturn).toBeLessThan(0.07);
    });
  });

  describe('PPF', () => {
    test('PPF is EEE — zero tax', () => {
      const result = calculatePostTaxReturn('PPF', 0.071, 2000000, 15, 'new');
      expect(result.postTaxReturn).toBe(0.071);
      expect(result.taxRate).toBe(0);
      expect(result.taxType).toContain('Exempt');
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
});
