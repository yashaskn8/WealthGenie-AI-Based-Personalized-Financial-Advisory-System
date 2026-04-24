/**
 * postTaxEngine.js — Display Formatter for Post-Tax API Responses
 * ───────────────────────────────────────────────────────────────
 * ARCHITECTURE NOTE:
 * All post-tax return computation is performed EXCLUSIVELY by
 * server/services/postTaxCalculator.js. This module contains
 * ZERO slab-rate arrays and ZERO independent tax computation.
 *
 * The recommendation engine (recommendationEngine.js) provides
 * computePostTaxReturn() for client-side display using the same
 * tax-type logic as the backend. This module only formats those
 * results for the PostTaxAnalysis UI.
 */

/**
 * Formats a post-tax computation result for display.
 * @param {Object} apiResult - From postTaxCalculator or recommendationEngine
 */
export function formatPostTaxResult(apiResult) {
  const nominal = apiResult.nominalRate || apiResult.nominalReturnRate || 0;
  const postTax = apiResult.postTaxReturn || apiResult.postTaxReturnRate || 0;
  return {
    displayReturn: `${(postTax).toFixed(2)}%`,
    displayNominal: `${(nominal).toFixed(2)}%`,
    taxTypeLabel: apiResult.taxType || 'N/A',
    taxImpact: nominal - postTax,
    taxImpactDisplay: `-${((nominal - postTax)).toFixed(2)}%`,
    notes: apiResult.notes || null,
  };
}

/**
 * Compute real (inflation-adjusted) return using Fisher equation.
 * This is a pure mathematical identity, not a tax computation.
 * @param {number} nominalRatePercent - e.g. 7.5
 * @param {number} inflationRate - e.g. 0.06
 * @returns {number} real return as percentage
 */
export function computeRealReturn(nominalRatePercent, inflationRate = 0.06) {
  return (((1 + nominalRatePercent / 100) / (1 + inflationRate)) - 1) * 100;
}
