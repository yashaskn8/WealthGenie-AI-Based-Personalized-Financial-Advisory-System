import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Palmtree, Diamond, FileText, Shield, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap, IndianRupee, ArrowRight } from 'lucide-react';
import { formatINR } from '../utils/indianNumberFormat';
import { calculateSIPFutureValue } from '../utils/sipCalculator';
import './GoalTracker.css';

/* ─── Smart defaults computed from actual profile ────────────────── */
function computeSmartDefaults(profile) {
  const income = Number(profile?.monthly_income) || 50000;
  const savings = Number(profile?.monthly_savings) || 10000;
  const age = Number(profile?.age) || 30;
  const horizon = Number(profile?.investment_horizon) || 15;
  const annualIncome = income * 12;
  const monthlyExpenses = income - savings;
  const retirementAge = 60;
  const yearsToRetire = Math.max(5, retirementAge - age);

  return {
    'Retirement': {
      target: Math.round(monthlyExpenses * 12 * 25 * Math.pow(1.06, yearsToRetire) / 100000) * 100000,
      currentSaved: Math.round(savings * 6), 
      icon: Palmtree,
      themeColor: '#0ea5e9', // Cyan
      themeColorRGB: '14, 165, 233',
      returnRate: 12,
      yearsToGoal: yearsToRetire,
      description: `Build ${Math.round(monthlyExpenses * 12 * 25 / 100000)}L+ corpus (25× annual expenses) by age ${retirementAge}`,
      tip: `Based on your ₹${monthlyExpenses.toLocaleString('en-IN')}/mo expenses, you need ~25× annual expenses at retirement.`,
    },
    'Wealth Growth': {
      target: Math.round(annualIncome * 5 / 100000) * 100000,
      currentSaved: Math.round(savings * 3),
      icon: Diamond,
      themeColor: '#a855f7', // Purple
      themeColorRGB: '168, 85, 247',
      returnRate: 11,
      yearsToGoal: Math.min(horizon, 10),
      description: `Accumulate 5× annual income (₹${(annualIncome * 5 / 100000).toFixed(0)}L) in ${Math.min(horizon, 10)} years`,
      tip: 'A common wealth milestone is 5× your annual income in liquid investments.',
    },
    'Tax Saving': {
      target: 150000,
      currentSaved: 0,
      icon: FileText,
      themeColor: '#f43f5e', // Rose
      themeColorRGB: '244, 63, 94',
      returnRate: 10,
      yearsToGoal: 1,
      description: 'Maximize ₹1.5L Section 80C deduction this financial year',
      tip: 'ELSS has the shortest 3-year lock-in among all 80C options.',
    },
    'Emergency Fund': {
      target: Math.round(monthlyExpenses * 6 / 10000) * 10000,
      currentSaved: 0,
      icon: Shield,
      themeColor: '#10b981', // Emerald
      themeColorRGB: '16, 185, 129',
      returnRate: 7,
      yearsToGoal: 1.5,
      description: `Build a ₹${(monthlyExpenses * 6 / 100000).toFixed(1)}L safety net (6× monthly expenses)`,
      tip: 'Keep in liquid MFs or savings account. Must be accessible within 24 hours.',
    },
  };
}

function formatShort(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val}`;
}

const MAX_TARGET = 1000000000;
const MAX_SAVED = 500000000;

function clampValue(val, min = 0, max = MAX_TARGET) {
  if (val === '') return '';
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/* ─── Goal Card ───────────────────────────────────────────────────── */
const GoalCard = ({ goal, defaults, currentSaved, target, onTargetChange, onCurrentChange, monthlyAllocation, horizon, returnRate, index, totalSavings }) => {
  const actualTarget = Number(target) || 0;
  const actualSaved = Number(currentSaved) || 0;
  const projectedValue = calculateSIPFutureValue(monthlyAllocation, returnRate, horizon) + actualSaved;
  const progressPercent = Math.min((actualSaved / (actualTarget || 1)) * 100, 100);
  const projectedPercent = Math.min((projectedValue / (actualTarget || 1)) * 100, 100);

  const gap = actualTarget - projectedValue;
  const gapPositive = gap > 0;

  const requiredExtraSIP = useMemo(() => {
    if (gap <= 0 || horizon <= 0) return 0;
    const r = (returnRate / 100) / 12;
    const n = horizon * 12;
    if (r === 0) return Math.ceil(gap / n);
    const fvFactor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    return Math.ceil(gap / fvFactor / 100) * 100;
  }, [gap, horizon, returnRate]);

  const completionPct = Math.min(Math.round((projectedValue / (actualTarget || 1)) * 100), 999);

  let status, statusClass, StatusIcon;
  if (completionPct >= 100) {
    status = 'On Track'; statusClass = 'status--ontrack'; StatusIcon = CheckCircle;
  } else if (completionPct >= 70) {
    status = 'Almost There'; statusClass = 'status--almost'; StatusIcon = TrendingUp;
  } else if (completionPct >= 40) {
    status = 'Needs Attention'; statusClass = 'status--attention'; StatusIcon = AlertTriangle;
  } else {
    status = 'Behind Schedule'; statusClass = 'status--behind'; StatusIcon = AlertTriangle;
  }

  const IconComponent = defaults.icon;

  return (
    <motion.div
      className="goal-card-item premium-glass"
      style={{
        '--theme-color': defaults.themeColor,
        '--theme-color-rgb': defaults.themeColorRGB
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + (index * 0.1), type: 'spring', stiffness: 100, damping: 20 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
    >
      <div className="card-glow-bg"></div>

      {/* Header */}
      <div className="goal-card-header">
        <div className="goal-card-icon-wrapper" style={{ boxShadow: `0 0 20px rgba(${defaults.themeColorRGB}, 0.2)` }}>
          <IconComponent size={20} color={defaults.themeColor} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="goal-card-title">{goal}</h3>
          <p className="goal-card-desc">{defaults.description}</p>
        </div>
        <span className={`goal-status-badge ${statusClass}`}>
          <StatusIcon size={12} style={{ marginRight: 4 }} /> {status}
        </span>
      </div>

      {/* Inputs */}
      <div className="goal-inputs-row">
        <div className="goal-input-group">
          <div className="goal-input-label-row">
            <label>🎯 Target Amount</label>
            <span className="goal-input-hint-badge">{formatShort(actualTarget)}</span>
          </div>
          <div className="goal-input-wrapper">
            <span className="goal-input-prefix">₹</span>
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
          <div className="goal-presets">
            {goal === 'Retirement' && [5000000, 10000000, 20000000, 50000000].map(v => (
              <button key={v} className={`preset-btn ${actualTarget === v ? 'preset-active' : ''}`} onClick={() => onTargetChange(v)}>
                {formatShort(v)}
              </button>
            ))}
            {goal === 'Wealth Growth' && [2000000, 5000000, 10000000, 25000000].map(v => (
              <button key={v} className={`preset-btn ${actualTarget === v ? 'preset-active' : ''}`} onClick={() => onTargetChange(v)}>
                {formatShort(v)}
              </button>
            ))}
            {goal === 'Tax Saving' && [50000, 100000, 150000].map(v => (
              <button key={v} className={`preset-btn ${actualTarget === v ? 'preset-active' : ''}`} onClick={() => onTargetChange(v)}>
                {formatShort(v)}
              </button>
            ))}
            {goal === 'Emergency Fund' && [100000, 300000, 500000, 1000000].map(v => (
              <button key={v} className={`preset-btn ${actualTarget === v ? 'preset-active' : ''}`} onClick={() => onTargetChange(v)}>
                {formatShort(v)}
              </button>
            ))}
          </div>
        </div>
        <div className="goal-input-group">
          <div className="goal-input-label-row">
            <label>💰 Already Saved</label>
            <span className="goal-input-hint-badge">{formatShort(actualSaved)}</span>
          </div>
          <div className="goal-input-wrapper">
            <span className="goal-input-prefix">₹</span>
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
      </div>

      {/* Visual Progress */}
      <div className="goal-progress-section">
        <div className="goal-progress-labels">
          <div className="progress-label-left">
            <span className="label-title">Saved</span>
            <span className="label-value">{formatShort(actualSaved)}</span>
          </div>
          <div className="progress-label-right">
            <span className="label-title">Target</span>
            <span className="label-value" style={{ color: defaults.themeColor }}>{formatShort(actualTarget)}</span>
          </div>
        </div>
        
        <div className="goal-progress-track">
          <div 
            className="goal-progress-fill goal-progress-fill--projected" 
            style={{ 
              width: `${Math.min(projectedPercent, 100)}%`,
              background: `linear-gradient(90deg, rgba(${defaults.themeColorRGB}, 0.2), rgba(${defaults.themeColorRGB}, 0.5))`
            }} 
          />
          <div 
            className="goal-progress-fill goal-progress-fill--current" 
            style={{ 
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${defaults.themeColor}, #fff)`,
              boxShadow: `0 0 10px rgba(${defaults.themeColorRGB}, 0.5)`
            }} 
          />
        </div>
        
        <div className="goal-progress-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: defaults.themeColor, boxShadow: `0 0 6px rgba(${defaults.themeColorRGB}, 0.8)` }}></span>
            Saved <span className="legend-pct">({progressPercent.toFixed(0)}%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: defaults.themeColor, opacity: 0.5 }}></span>
            Projected <span className="legend-pct">({completionPct}%)</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="goal-card-footer">
        <div className="goal-metric">
          <span className="goal-metric-label"><IndianRupee size={12} /> SIP</span>
          <span className="goal-metric-value">{formatINR(monthlyAllocation)}</span>
          <span className="goal-metric-sub">{totalSavings > 0 ? `${Math.round((monthlyAllocation / totalSavings) * 100)}% of total` : '--'}</span>
        </div>
        <div className="goal-metric">
          <span className="goal-metric-label"><Clock size={12} /> Time</span>
          <span className="goal-metric-value">{defaults.yearsToGoal}y</span>
          <span className="goal-metric-sub">@ {returnRate}% CAGR</span>
        </div>
        <div className="goal-metric">
          <span className="goal-metric-label"><TrendingUp size={12} /> Projected</span>
          <span className="goal-metric-value" style={{ color: defaults.themeColor }}>{formatShort(projectedValue)}</span>
          <span className="goal-metric-sub">{completionPct >= 100 ? '✅ Met' : `${completionPct}%`}</span>
        </div>
        <div className="goal-metric">
          <span className="goal-metric-label">{gapPositive ? '⚠️ Shortfall' : '✅ Surplus'}</span>
          <span className="goal-metric-value" style={{ color: gapPositive ? '#f43f5e' : '#10b981' }}>
            {formatShort(Math.abs(gap))}
          </span>
          <span className="goal-metric-sub">{gapPositive ? 'Action req.' : 'On Track'}</span>
        </div>
      </div>

      {/* Actionable Insight */}
      <div className="goal-action-container">
        {gapPositive && requiredExtraSIP > 0 ? (
          <motion.div 
            className="goal-action-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="action-card-highlight"></div>
            <Zap size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2, zIndex: 1 }} />
            <div style={{ zIndex: 1 }}>
              <strong>To close gap:</strong> Increase SIP by <span className="highlight-text">₹{requiredExtraSIP.toLocaleString('en-IN')}/mo</span>,
              or wait <span className="highlight-text">{Math.ceil(gap / (monthlyAllocation * 12 || 1))}y</span> more.
            </div>
          </motion.div>
        ) : completionPct >= 100 ? (
          <motion.div className="goal-action-card goal-action-card--success">
            <div className="action-card-highlight"></div>
            <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2, zIndex: 1 }} />
            <div style={{ zIndex: 1 }}>
              <strong>Target Secured!</strong> At ₹{monthlyAllocation.toLocaleString('en-IN')}/mo,
              you will easily meet this goal.
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Contextual Tips */}
      <div className="goal-tip" style={{ borderLeftColor: defaults.themeColor }}>
        <span className="tip-icon">💡</span> {defaults.tip}
      </div>
    </motion.div>
  );
};

/* ─── Main Component ──────────────────────────────────────────────── */
const GoalTracker = ({ profile, recommendations }) => {
  const goals = profile?.investment_goals || ['Retirement', 'Wealth Growth'];
  const horizon = profile?.investment_horizon || 15;
  const totalSavings = Number(profile?.monthly_savings) || 0;

  const smartDefaults = useMemo(() => computeSmartDefaults(profile), [profile]);

  const [targets, setTargets] = useState(() => {
    const t = {};
    goals.forEach(g => { t[g] = smartDefaults[g]?.target || 1000000; });
    return t;
  });

  const [currentSaved, setCurrentSaved] = useState(() => {
    const c = {};
    goals.forEach(g => { c[g] = smartDefaults[g]?.currentSaved || 0; });
    return c;
  });

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
    const totalAllocated = Object.values(allocs).reduce((a, b) => a + b, 0);
    if (totalAllocated === 0 && totalSavings > 0) {
      goals.forEach(g => { allocs[g] = totalSavings / goals.length; });
    }
    return allocs;
  }, [goals, recommendations, totalSavings]);

  const totalTarget = Object.values(targets).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalCurrent = Object.values(currentSaved).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalProjected = goals.reduce((sum, g) => {
    const yr = smartDefaults[g]?.yearsToGoal || horizon;
    const rate = smartDefaults[g]?.returnRate || 10;
    return sum + calculateSIPFutureValue(goalAllocations[g] || 0, rate, yr) + (Number(currentSaved[g]) || 0);
  }, 0);
  const totalMonthlySIP = Object.values(goalAllocations).reduce((a, b) => a + b, 0);
  const overallHealth = totalTarget > 0 ? Math.min(Math.round((totalProjected / totalTarget) * 100), 100) : 0;

  return (
    <motion.div
      className="goal-tracker-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="ambient-background">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
      </div>

      <motion.div
        className="page-header"
        style={{ textAlign: 'center', marginBottom: 8 }}
        initial={{ y: -15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="gt-page-badge">
          <Target size={11} />
          Personalized Financial Goals
        </div>
        <h1 className="gt-page-title">My Financial Goals</h1>
        <p className="gt-page-subtitle">
          Personalized targets based on ₹{(Number(profile?.monthly_income) || 0).toLocaleString('en-IN')}/mo income & Age {profile?.age || 30}
        </p>
        <div className="gt-header-divider" />
      </motion.div>

      {/* ── Overview Card ────────────────────────────────── */}
      <motion.div
        className="goal-overview-card premium-glass"
        initial={{ scale: 0.98, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
      >
        <div className="overview-glow-line"></div>
        
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Total Target</span>
          <span className="goal-overview-value text-gradient-primary">{formatShort(totalTarget)}</span>
          <span className="goal-overview-sub">Across {goals.length} goals</span>
        </div>
        
        <div className="goal-overview-divider"></div>
        
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Currently Saved</span>
          <span className="goal-overview-value">{formatShort(totalCurrent)}</span>
          <span className="goal-overview-sub">{totalTarget > 0 ? `${Math.round((totalCurrent / totalTarget) * 100)}% of target` : ''}</span>
        </div>
        
        <div className="goal-overview-divider"></div>
        
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Projected Corpus</span>
          <span className="goal-overview-value">{formatShort(totalProjected)}</span>
          <span className="goal-overview-sub">At ₹{Math.round(totalMonthlySIP).toLocaleString('en-IN')}/mo SIP</span>
        </div>
        
        <div className="goal-overview-divider"></div>
        
        <div className="goal-overview-stat">
          <span className="goal-overview-label">Goal Health</span>
          <span className="goal-overview-value health-value" style={{
            color: overallHealth >= 80 ? '#10b981' : overallHealth >= 50 ? '#f59e0b' : '#ef4444',
            textShadow: `0 0 20px ${overallHealth >= 80 ? 'rgba(16,185,129,0.4)' : overallHealth >= 50 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`
          }}>
            {overallHealth}%
          </span>
          <span className="goal-overview-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="health-dot" style={{ 
              backgroundColor: overallHealth >= 80 ? '#10b981' : overallHealth >= 50 ? '#f59e0b' : '#ef4444',
              boxShadow: `0 0 10px ${overallHealth >= 80 ? '#10b981' : overallHealth >= 50 ? '#f59e0b' : '#ef4444'}`
            }} />
            {overallHealth >= 80 ? 'Healthy' : overallHealth >= 50 ? 'Needs Boost' : 'Action Needed'}
          </span>
        </div>
      </motion.div>

      {/* ── Goal Cards ────────────────────────────────────── */}
      <div className="goal-cards-grid">
        <AnimatePresence>
          {goals.map((g, index) => (
            <GoalCard
              key={g}
              index={index}
              goal={g}
              defaults={smartDefaults[g] || { icon: Target, themeColor: '#6366f1', themeColorRGB: '99, 102, 241', description: '', tip: '', yearsToGoal: horizon, returnRate: 10 }}
              target={targets[g]}
              currentSaved={currentSaved[g]}
              onTargetChange={(val) => setTargets(prev => ({ ...prev, [g]: val }))}
              onCurrentChange={(val) => setCurrentSaved(prev => ({ ...prev, [g]: val }))}
              monthlyAllocation={goalAllocations[g] || 0}
              horizon={smartDefaults[g]?.yearsToGoal || (g === 'Emergency Fund' ? Math.min(2, horizon) : horizon)}
              returnRate={smartDefaults[g]?.returnRate || 10}
              totalSavings={totalSavings}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GoalTracker;
