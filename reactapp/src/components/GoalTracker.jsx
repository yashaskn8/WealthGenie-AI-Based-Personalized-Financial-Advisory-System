import React, { useState, useMemo } from 'react';
import { formatINR } from '../utils/indianNumberFormat';
import { calculateSIPFutureValue } from '../utils/sipCalculator';
import './GoalTracker.css';

const GOAL_DEFAULTS = {
  'Retirement': { target: 20000000, icon: '🏖️' },
  'Wealth Growth': { target: 10000000, icon: '💎' },
  'Tax Saving': { target: 150000, icon: '🧾' },
  'Emergency Fund': { target: 600000, icon: '🛡️' },
};

// Reasonable caps to prevent overflow
const MAX_TARGET = 1000000000;  // ₹100 Cr
const MAX_SAVED  = 500000000;   // ₹50 Cr

function clampValue(val, min = 0, max = MAX_TARGET) {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

const GoalCard = ({ goal, currentSaved, target, onTargetChange, onCurrentChange, monthlyAllocation, horizon, returnRate }) => {
  const projectedValue = calculateSIPFutureValue(monthlyAllocation, returnRate, horizon) + currentSaved;
  const progressPercent = Math.min((currentSaved / target) * 100, 100);
  const projectedPercent = Math.min((projectedValue / target) * 100, 100);

  let status = 'On Track';
  let statusClass = 'status--ontrack';
  if (projectedValue >= target * 1.1) { status = 'Ahead of Schedule'; statusClass = 'status--ahead'; }
  else if (projectedValue < target * 0.8) { status = 'Behind Schedule'; statusClass = 'status--behind'; }

  const gap = target - projectedValue;
  const info = GOAL_DEFAULTS[goal] || { icon: '🎯' };

  return (
    <div className="goal-card-item">
      <div className="goal-card-header">
        <span className="goal-card-icon">{info.icon}</span>
        <h3 className="goal-card-title">{goal}</h3>
        <span className={`goal-status-badge ${statusClass}`}>{status}</span>
      </div>

      <div className="goal-inputs-row">
        <div className="goal-input-group">
          <label>Target Amount</label>
          <input
            type="number"
            value={target}
            min={0}
            max={MAX_TARGET}
            onChange={e => onTargetChange(clampValue(e.target.value, 0, MAX_TARGET))}
            className="goal-amount-input"
          />
        </div>
        <div className="goal-input-group">
          <label>Current Saved</label>
          <input
            type="number"
            value={currentSaved}
            min={0}
            max={MAX_SAVED}
            onChange={e => onCurrentChange(clampValue(e.target.value, 0, MAX_SAVED))}
            className="goal-amount-input"
          />
        </div>
      </div>

      {/* Progress bars */}
      <div className="goal-progress-section">
        <div className="goal-progress-labels">
          <span>Current: {formatINR(currentSaved)}</span>
          <span>Target: {formatINR(target)}</span>
        </div>
        <div className="goal-progress-track">
          <div className="goal-progress-fill goal-progress-fill--current" style={{ width: `${progressPercent}%` }} />
          <div className="goal-progress-fill goal-progress-fill--projected" style={{ width: `${projectedPercent}%` }} />
        </div>
        <div className="goal-progress-legend">
          <span><span className="legend-dot legend-dot--current"></span>Current</span>
          <span><span className="legend-dot legend-dot--projected"></span>Projected</span>
        </div>
      </div>

      <div className="goal-card-footer">
        <div className="goal-metric">
          <span className="goal-metric-label">Monthly SIP towards this</span>
          <span className="goal-metric-value">{formatINR(monthlyAllocation)}</span>
        </div>
        <div className="goal-metric">
          <span className="goal-metric-label">Projected Value</span>
          <span className="goal-metric-value" style={{ color: '#8b5cf6' }}>{formatINR(projectedValue)}</span>
        </div>
        <div className="goal-metric">
          <span className="goal-metric-label">{gap > 0 ? 'Gap' : 'Surplus'}</span>
          <span className="goal-metric-value" style={{ color: gap > 0 ? '#ef4444' : '#22c55e' }}>
            {formatINR(Math.abs(gap))}
          </span>
        </div>
      </div>
    </div>
  );
};

const GoalTracker = ({ profile, recommendations }) => {
  const goals = profile?.investment_goals || ['Retirement', 'Wealth Growth'];
  const horizon = profile?.investment_horizon || 15;

  const [targets, setTargets] = useState(() => {
    const t = {};
    goals.forEach(g => { t[g] = GOAL_DEFAULTS[g]?.target || 1000000; });
    return t;
  });

  const [currentSaved, setCurrentSaved] = useState(() => {
    const c = {};
    goals.forEach(g => { c[g] = 0; });
    return c;
  });

  // Distribute monthly allocations to goals
  const goalAllocations = useMemo(() => {
    const allocs = {};
    goals.forEach(g => { allocs[g] = 0; });
    (recommendations || []).forEach(inv => {
      (inv.suitable_for_goals || []).forEach(g => {
        if (allocs[g] !== undefined) {
          allocs[g] += (inv.monthly_allocation || 0) / inv.suitable_for_goals.length;
        }
      });
    });
    return allocs;
  }, [goals, recommendations]);

  // Overall stats
  const totalTarget = Object.values(targets).reduce((a, b) => a + b, 0);
  const totalCurrent = Object.values(currentSaved).reduce((a, b) => a + b, 0);
  const totalProjected = goals.reduce((sum, g) => {
    return sum + calculateSIPFutureValue(goalAllocations[g] || 0, 10, horizon) + (currentSaved[g] || 0);
  }, 0);

  return (
    <div className="goal-tracker-page">
      <h1 className="page-title">🎯 My Financial Goals</h1>
      <p className="page-subtitle">Track progress toward your life goals with real-time projections</p>

      {/* Overview Card */}
      <div className="goal-overview-card">
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Total Target Corpus</span>
          <span className="goal-overview-value">{formatINR(totalTarget)}</span>
        </div>
        <div className="goal-overview-divider"></div>
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Total Projected Corpus</span>
          <span className="goal-overview-value" style={{ color: '#8b5cf6' }}>{formatINR(totalProjected)}</span>
        </div>
        <div className="goal-overview-divider"></div>
        <div className="goal-overview-stat">
          <span className="goal-overview-label">{totalProjected >= totalTarget ? 'Surplus' : 'Gap Amount'}</span>
          <span className="goal-overview-value" style={{ color: totalProjected >= totalTarget ? '#22c55e' : '#ef4444' }}>
            {formatINR(Math.abs(totalTarget - totalProjected))}
          </span>
        </div>
      </div>

      {/* Goal Cards */}
      <div className="goal-cards-grid">
        {goals.map(g => (
          <GoalCard
            key={g}
            goal={g}
            target={targets[g]}
            currentSaved={currentSaved[g] || 0}
            onTargetChange={(val) => setTargets(prev => ({ ...prev, [g]: val }))}
            onCurrentChange={(val) => setCurrentSaved(prev => ({ ...prev, [g]: val }))}
            monthlyAllocation={goalAllocations[g] || 0}
            horizon={horizon}
            returnRate={10}
          />
        ))}
      </div>
    </div>
  );
};

export default GoalTracker;
