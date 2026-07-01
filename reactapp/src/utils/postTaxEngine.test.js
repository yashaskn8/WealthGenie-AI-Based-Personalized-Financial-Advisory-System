import { describe, expect, it } from 'vitest';
import { computeRealReturn, formatPostTaxResult } from './postTaxEngine.js';

describe('postTaxEngine display helpers', () => {
  it('formats post-tax result values consistently', () => {
    const formatted = formatPostTaxResult({ nominalRate: 12, postTaxReturn: 10.5, taxType: 'LTCG', notes: 'Equity taxation' });

    expect(formatted.displayReturn).toBe('10.50%');
    expect(formatted.displayNominal).toBe('12.00%');
    expect(formatted.taxImpact).toBeCloseTo(1.5, 6);
    expect(formatted.taxImpactDisplay).toBe('-1.50%');
    expect(formatted.notes).toBe('Equity taxation');
  });

  it('computes real returns using the Fisher equation', () => {
    expect(computeRealReturn(12, 0.06)).toBeCloseTo(5.660377, 5);
  });
});
