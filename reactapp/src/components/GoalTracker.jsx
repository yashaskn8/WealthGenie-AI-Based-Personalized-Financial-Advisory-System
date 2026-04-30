import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Palmtree, Diamond, FileText, Shield } from 'lucide-react';
import { formatINR } from '../utils/indianNumberFormat';
import { calculateSIPFutureValue } from '../utils/sipCalculator';
import './GoalTracker.css';

const GOAL_DEFAULTS = {
  'Retirement': { target: 20000000, icon: <Palmtree size={18} color="#06b6d4" /> },
  'Wealth Growth': { target: 10000000, icon: <Diamond size={18} color="#a855f7" /> },
  'Tax Saving': { target: 150000, icon: <FileText size={18} color="#8b5cf6" /> },
  'Emergency Fund': { target: 600000, icon: <Shield size={18} color="#22c55e" /> },
};

// Reasonable caps to prevent overflow
const MAX_TARGET = 1000000000;  // ₹100 Cr
const MAX_SAVED  = 500000000;   // ₹50 Cr

function clampValue(val, min = 0, max = MAX_TARGET) {
  if (val === '') return '';
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

const GoalCard = ({ goal, currentSaved, target, onTargetChange, onCurrentChange, monthlyAllocation, horizon, returnRate, index }) => {
  const actualTarget = Number(target) || 0;
  const actualSaved = Number(currentSaved) || 0;
  const projectedValue = calculateSIPFutureValue(monthlyAllocation, returnRate, horizon) + actualSaved;
  const progressPercent = Math.min((actualSaved / (actualTarget || 1)) * 100, 100);
  const projectedPercent = Math.min((projectedValue / (actualTarget || 1)) * 100, 100);

  let status = 'On Track';
  let statusClass = 'status--ontrack';
  if (projectedValue >= actualTarget * 1.1) { status = 'Ahead of Schedule'; statusClass = 'status--ahead'; }
  else if (projectedValue < actualTarget * 0.8) { status = 'Behind Schedule'; statusClass = 'status--behind'; }

  const gap = actualTarget - projectedValue;
  const info = GOAL_DEFAULTS[goal] || { icon: <Target size={18} /> };

  return (
    <motion.div 
      className="goal-card-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + (index * 0.1), type: 'spring', stiffness: 200, damping: 20 }}
    >
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
            placeholder="0"
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
            placeholder="0"
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
          <span>Current: {formatINR(actualSaved)}</span>
          <span>Target: {formatINR(actualTarget)}</span>
        </div>
        <div className="goal-progress-track">
          <div className="goal-progress-fill goal-progress-fill--projected" style={{ width: `${projectedPercent}%` }} />
          <div className="goal-progress-fill goal-progress-fill--current" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="goal-progress-legend">
          <span style={{ display: 'flex', alignItems: 'center' }}><span className="legend-dot legend-dot--current"></span>Current</span>
          <span style={{ display: 'flex', alignItems: 'center' }}><span className="legend-dot legend-dot--projected"></span>Projected</span>
        </div>
      </div>

      <div className="goal-card-footer">
        <div className="goal-metric">
          <span className="goal-metric-label">Monthly SIP towards this</span>
          <span className="goal-metric-value">{formatINR(monthlyAllocation)}</span>
        </div>
        <div className="goal-metric">
          <span className="goal-metric-label">Projected Value</span>
          <span className="goal-metric-value" style={{ color: '#c084fc' }}>{formatINR(projectedValue)}</span>
        </div>
        <div className="goal-metric">
          <span className="goal-metric-label">{gap > 0 ? 'Gap' : 'Surplus'}</span>
          <span className="goal-metric-value" style={{ color: gap > 0 ? '#f87171' : '#4ade80' }}>
            {formatINR(Math.abs(gap))}
          </span>
        </div>
      </div>
    </motion.div>
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
    goals.forEach(g => { c[g] = ''; }); // Use empty string instead of 0
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
  const totalTarget = Object.values(targets).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalCurrent = Object.values(currentSaved).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalProjected = goals.reduce((sum, g) => {
    return sum + calculateSIPFutureValue(goalAllocations[g] || 0, 10, horizon) + (Number(currentSaved[g]) || 0);
  }, 0);

  return (
    <motion.div 
      className="goal-tracker-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Target size={28} color="#f43f5e" /> My Financial Goals
        </h1>
        <p className="page-subtitle">Track progress toward your life goals with real-time projections</p>
      </motion.div>

      {/* Overview Card */}
      <motion.div 
        className="goal-overview-card"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 150 }}
      >
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Total Target Corpus</span>
          <span className="goal-overview-value">{formatINR(totalTarget)}</span>
        </div>
        <div className="goal-overview-divider"></div>
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Total Projected Corpus</span>
          <span className="goal-overview-value" style={{ color: '#c084fc' }}>{formatINR(totalProjected)}</span>
        </div>
        <div className="goal-overview-divider"></div>
        <div className="goal-overview-stat">
          <span className="goal-overview-label">{totalProjected >= totalTarget ? 'Surplus' : 'Gap Amount'}</span>
          <span className="goal-overview-value" style={{ color: totalProjected >= totalTarget ? '#4ade80' : '#f87171' }}>
            {formatINR(Math.abs(totalTarget - totalProjected))}
          </span>
        </div>
      </motion.div>

      {/* Goal Cards */}
      <div className="goal-cards-grid">
        <AnimatePresence>
          {goals.map((g, index) => (
            <GoalCard
              key={g}
              index={index}
              goal={g}
              target={targets[g]}
              currentSaved={currentSaved[g]}
              onTargetChange={(val) => setTargets(prev => ({ ...prev, [g]: val }))}
              onCurrentChange={(val) => setCurrentSaved(prev => ({ ...prev, [g]: val }))}
              monthlyAllocation={goalAllocations[g] || 0}
              horizon={horizon}
              returnRate={10}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GoalTracker;
