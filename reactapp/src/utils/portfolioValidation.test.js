import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePortfolio } from './portfolioValidation.js';

describe('portfolioValidation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid with concentration warnings for internally consistent portfolios', () => {
    const result = validatePortfolio([
      { name: 'Equity', monthly_allocation: 7000 },
      { name: 'Debt', monthly_allocation: 3000 },
    ], 10000);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('highly concentrated');
  });

  it('returns null for impossible negative SIPs', () => {
    const result = validatePortfolio([
      { name: 'Equity', monthly_allocation: -1000 },
      { name: 'Debt', monthly_allocation: 11000 },
    ], 10000);

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
