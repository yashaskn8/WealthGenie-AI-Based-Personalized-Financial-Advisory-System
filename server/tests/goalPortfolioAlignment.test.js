/**
 * Goal–Portfolio Alignment Tests
 * ────────────────────────────────
 * Validates that the goal-aware filtering and safety-net scoring
 * produce consistent, non-contradictory outputs across screens.
 */

// ── Goal Profiles (mirrored from client recommendationEngine) ──
const GOAL_PROFILES = {
  'Emergency Fund': {
    max_lock_in_years: 0,
    excluded_ids: ['elss', 'nps', 'ppf', 'scss', 'rbi_bonds', 'sgb', 'sukanya',
                   'smallcap_mf', 'midcap_mf', 'direct_equity', 'index_mf',
                   'nifty_etf', 'gold_etf'],
  },
  'Tax Saving': {
    max_lock_in_years: 3,
    excluded_ids: [],
    prioritised_ids: ['elss', 'nps', 'ppf'],
  },
};

function filterInstrumentsForGoal(instruments, goalType) {
  const profile = GOAL_PROFILES[goalType];
  if (!profile) return instruments;
  return instruments.filter(inst => {
    if (profile.excluded_ids?.includes(inst.id || inst.type)) return false;
    if (profile.max_lock_in_years === 0 && (inst.lockIn > 0 || inst.lock_in_years > 0)) return false;
    return true;
  });
}

function computeEmergencySafetyScore(goals, monthlyIncome) {
  const emergencyGoal = goals.find(g => g.goal_name === 'Emergency Fund');
  if (!emergencyGoal) return { score: 10, label: 'No emergency fund goal set.', alert: true };

  const targetAmount = emergencyGoal.target_amount;
  const currentSaved = emergencyGoal.current_savings || 0;
  const projectedValue = emergencyGoal.projected_value || 0;

  const coverageRatio = Math.min((currentSaved + projectedValue) / targetAmount, 1);
  const score = Math.round(coverageRatio * 100);

  const label = coverageRatio >= 0.8 && projectedValue > 0
    ? 'Safety Net Secure'
    : coverageRatio > 0
    ? `${Math.round(coverageRatio * 100)}% funded`
    : 'Alert: No funds allocated to emergency goal.';

  return { score, label, alert: score < 50 };
}

function computeGoalAlignmentScore(goals, portfolio) {
  if (!goals || goals.length === 0) return { alignmentScore: 0, planStatus: 'Off-Track' };

  const allocatedGoals = goals.filter(g => (g.monthly_sip_allocated || 0) > 0);
  const alignmentScore = Math.round((allocatedGoals.length / goals.length) * 100);

  const planStatus = alignmentScore >= 70 ? 'On-Track'
    : alignmentScore >= 40 ? 'At Risk'
    : 'Off-Track';

  return { alignmentScore, planStatus };
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════

describe('Goal-Aware Instrument Filtering', () => {

  test('Emergency Fund: ELSS excluded due to lock-in', () => {
    const instruments = [
      { id: 'elss', type: 'ELSS', lockIn: 3 },
      { id: 'fd', type: 'FD', lockIn: 0 },
      { id: 'liquid_mf', type: 'Liquid_MF', lockIn: 0 },
    ];
    const filtered = filterInstrumentsForGoal(instruments, 'Emergency Fund');
    expect(filtered.find(i => i.id === 'elss')).toBeUndefined();
    expect(filtered.find(i => i.id === 'fd')).toBeDefined();
    expect(filtered.find(i => i.id === 'liquid_mf')).toBeDefined();
  });

  test('Emergency Fund: NPS excluded due to lock-in', () => {
    const instruments = [
      { id: 'nps', type: 'NPS', lock_in_years: 28 },
      { id: 'liquid_mf', type: 'Liquid_MF', lockIn: 0 },
    ];
    const filtered = filterInstrumentsForGoal(instruments, 'Emergency Fund');
    expect(filtered.find(i => i.id === 'nps')).toBeUndefined();
    expect(filtered.find(i => i.id === 'liquid_mf')).toBeDefined();
  });

  test('Emergency Fund: PPF excluded', () => {
    const instruments = [
      { id: 'ppf', lockIn: 15 },
      { id: 'fd', lockIn: 0 },
    ];
    const filtered = filterInstrumentsForGoal(instruments, 'Emergency Fund');
    expect(filtered.find(i => i.id === 'ppf')).toBeUndefined();
  });

  test('Emergency Fund: SGB excluded', () => {
    const instruments = [
      { id: 'sgb', lockIn: 8 },
      { id: 'debt_mf', lockIn: 0 },
    ];
    const filtered = filterInstrumentsForGoal(instruments, 'Emergency Fund');
    expect(filtered.find(i => i.id === 'sgb')).toBeUndefined();
    expect(filtered.find(i => i.id === 'debt_mf')).toBeDefined();
  });

  test('Emergency Fund: Mid-Cap MF excluded', () => {
    const instruments = [
      { id: 'midcap_mf', lockIn: 0 },
      { id: 'fd', lockIn: 0 },
    ];
    const filtered = filterInstrumentsForGoal(instruments, 'Emergency Fund');
    expect(filtered.find(i => i.id === 'midcap_mf')).toBeUndefined();
  });

  test('Tax Saving: ELSS is NOT excluded', () => {
    const instruments = [
      { id: 'elss', lockIn: 3 },
      { id: 'fd', lockIn: 0 },
    ];
    const filtered = filterInstrumentsForGoal(instruments, 'Tax Saving');
    expect(filtered.find(i => i.id === 'elss')).toBeDefined();
  });

  test('Unknown goal: returns all instruments unchanged', () => {
    const instruments = [
      { id: 'elss', lockIn: 3 },
      { id: 'ppf', lockIn: 15 },
    ];
    const filtered = filterInstrumentsForGoal(instruments, 'Buy a House');
    expect(filtered.length).toBe(2);
  });
});

describe('Emergency Safety Net Score — Contradiction 2', () => {

  test('Declared but no SIP → score < 50, NOT "Safety Net Secure"', () => {
    const goals = [{
      goal_name: 'Emergency Fund',
      target_amount: 600000,
      current_savings: 0,
      projected_value: 0,
      monthly_sip_allocated: 0,
    }];
    const result = computeEmergencySafetyScore(goals, 65000);
    expect(result.score).toBeLessThan(50);
    expect(result.label).not.toBe('Safety Net Secure');
    expect(result.alert).toBe(true);
  });

  test('No emergency goal declared → score = 10', () => {
    const goals = [{ goal_name: 'Retirement', target_amount: 20000000 }];
    const result = computeEmergencySafetyScore(goals, 65000);
    expect(result.score).toBe(10);
  });

  test('Fully funded → score = 100, label "Safety Net Secure"', () => {
    const goals = [{
      goal_name: 'Emergency Fund',
      target_amount: 600000,
      current_savings: 600000,
      projected_value: 50000,
    }];
    const result = computeEmergencySafetyScore(goals, 65000);
    expect(result.score).toBe(100);
    expect(result.label).toBe('Safety Net Secure');
  });

  test('Partially funded → score reflects coverage', () => {
    const goals = [{
      goal_name: 'Emergency Fund',
      target_amount: 600000,
      current_savings: 120000,
      projected_value: 0,
    }];
    const result = computeEmergencySafetyScore(goals, 65000);
    expect(result.score).toBe(20);
    expect(result.label).toContain('20%');
  });
});

describe('Goal Alignment & Plan Status — Contradiction 3', () => {

  test('No SIP allocated → Off-Track, NOT On-Track', () => {
    const goals = [{
      goal_name: 'Emergency Fund',
      monthly_sip_allocated: 0,
    }];
    const { alignmentScore, planStatus } = computeGoalAlignmentScore(goals, {});
    expect(alignmentScore).toBe(0);
    expect(planStatus).toBe('Off-Track');
    expect(planStatus).not.toBe('On-Track');
  });

  test('All goals funded → On-Track', () => {
    const goals = [
      { goal_name: 'Emergency Fund', monthly_sip_allocated: 12000 },
      { goal_name: 'Retirement', monthly_sip_allocated: 5000 },
    ];
    const { alignmentScore, planStatus } = computeGoalAlignmentScore(goals, {});
    expect(alignmentScore).toBe(100);
    expect(planStatus).toBe('On-Track');
  });

  test('Partial funding → At Risk', () => {
    const goals = [
      { goal_name: 'Emergency Fund', monthly_sip_allocated: 12000 },
      { goal_name: 'Retirement', monthly_sip_allocated: 0 },
    ];
    const { alignmentScore, planStatus } = computeGoalAlignmentScore(goals, {});
    expect(alignmentScore).toBe(50);
    expect(planStatus).toBe('At Risk');
  });

  test('Empty goals → Off-Track', () => {
    const { alignmentScore, planStatus } = computeGoalAlignmentScore([], {});
    expect(alignmentScore).toBe(0);
    expect(planStatus).toBe('Off-Track');
  });
});
