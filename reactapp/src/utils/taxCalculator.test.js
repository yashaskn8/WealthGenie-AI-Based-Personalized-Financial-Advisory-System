import { describe, expect, it } from 'vitest';
import { formatTaxBreakdown, getTaxSavingRecommendations, SECTION_80C_LIMIT, SECTION_80CCD_1B_LIMIT } from './taxCalculator.js';

describe('taxCalculator display helpers', () => {
  it('formats backend tax responses without recomputing slabs', () => {
    const formatted = formatTaxBreakdown({
      taxAmount: 0,
      effectiveRate: 0,
      rebateApplied: true,
      surchargeApplied: false,
      regime: 'new',
    });

    expect(formatted.taxAmount).toContain('0');
    expect(formatted.effectiveRate).toBe('0%');
    expect(formatted.rebateNote).toContain('87A');
    expect(formatted.surchargeNote).toBeNull();
    expect(formatted.regime).toContain('FY2025-26');
  });

  it('returns eligible tax-saving recommendations for 80C and NPS gaps', () => {
    const investments = [
      { id: 'elss', name: 'ELSS', taxType: 'elss', rate: 12 },
      { id: 'nps', name: 'NPS', taxType: 'nps', rate: 10 },
      { id: 'fd', name: 'FD', taxType: 'taxable', rate: 7 },
    ];

    const recs = getTaxSavingRecommendations(SECTION_80C_LIMIT, SECTION_80CCD_1B_LIMIT, investments);

    expect(recs.map(r => r.id)).toEqual(['elss', 'nps']);
    expect(recs[0]).toMatchObject({ section: '80C', maxDeduction: SECTION_80C_LIMIT, suggestedAmount: SECTION_80C_LIMIT });
    expect(recs[1]).toMatchObject({ section: '80CCD(1B)', maxDeduction: SECTION_80CCD_1B_LIMIT, suggestedAmount: SECTION_80CCD_1B_LIMIT });
  });
});
