/**
 * Shared confidence label utility — used by both
 * ExplainabilityPanel and RecommendationDashboard cards.
 * Single source of truth for confidence thresholds.
 */

export function getConfidenceLabel(confidence) {
  if (confidence >= 0.75) {
    return {
      label: 'High Confidence',
      colour: '#22c55e',
      note: null,
    };
  }
  if (confidence >= 0.55) {
    return {
      label: 'Moderate Confidence',
      colour: '#f59e0b',
      note: null,
    };
  }
  return {
    label: 'Exploratory Recommendation',
    colour: '#94a3b8',
    note: 'Multiple instruments suit your profile. Review all options below.',
  };
}
