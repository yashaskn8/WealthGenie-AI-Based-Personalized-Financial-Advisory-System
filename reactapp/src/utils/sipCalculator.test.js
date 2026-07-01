import { describe, expect, it } from 'vitest';
import { calculateLumpSumFutureValue, calculateSIPFutureValue, calculateStepUpSIPValue, getStepUpProjectionData } from './sipCalculator.js';

describe('sipCalculator', () => {
  it('calculates SIP and lump-sum future values with zero and positive returns', () => {
    expect(calculateSIPFutureValue(10000, 0, 1)).toBe(120000);
    expect(calculateLumpSumFutureValue(100000, 10, 2)).toBeCloseTo(121000, 6);
    expect(calculateSIPFutureValue(10000, 12, 1)).toBeGreaterThan(120000);
  });

  it('calculates step-up SIP values and projection data', () => {
    const flat = calculateSIPFutureValue(10000, 10, 3);
    const stepUp = calculateStepUpSIPValue(10000, 10, 3, 10);
    const projection = getStepUpProjectionData(10000, 10, 3, 10);

    expect(stepUp).toBeGreaterThan(flat);
    expect(projection.flatData).toHaveLength(3);
    expect(projection.stepUpData[2].invested).toBeCloseTo(397200, 6);
  });

  it('returns zero for invalid inputs', () => {
    expect(calculateSIPFutureValue(0, 12, 10)).toBe(0);
    expect(calculateLumpSumFutureValue(1000, 12, 0)).toBe(0);
    expect(calculateStepUpSIPValue(-1, 12, 10, 10)).toBe(0);
  });
});
