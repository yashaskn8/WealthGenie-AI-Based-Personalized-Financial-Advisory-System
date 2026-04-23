import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle, Calendar, DollarSign } from 'lucide-react';
import ProjectionBand from './ProjectionBand';
import SebiDisclaimer from './SebiDisclaimer';
import api from '../services/api';

const GOAL_PRESETS = [
  { label: 'Retirement', icon: '🏖️' },
  { label: 'Home Purchase', icon: '🏠' },
  { label: 'Child Education', icon: '🎓' },
  { label: 'Emergency Fund', icon: '🛡️' },
  { label: 'Vehicle', icon: '🚗' },
  { label: 'Custom', icon: '✨' },
];

const STATUS_CONFIG = {
  on_track:  { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', label: 'On Track',  icon: CheckCircle },
  at_risk:   { color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)',   label: 'At Risk',   icon: AlertTriangle },
  off_track: { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)',   label: 'Off Track', icon: AlertTriangle },
};

const formatINR = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

const GoalPlanner = ({ profile }) => {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Form state
  const [goalName, setGoalName] = useState('');
  const [customName, setCustomName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await api.getGoals();
      setGoals(res.goals || []);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalName || !targetAmount || !targetDate) return;

    setLoading(true);
    try {
      const res = await api.createGoal({
        goal_name: goalName === 'Custom' ? customName : goalName,
        target_amount: parseFloat(targetAmount),
        target_date: targetDate,
        current_savings: parseFloat(currentSavings) || 0,
        profileId: profile?._id || profile?.profileId,
      });
      setGoals(prev => [...prev, res]);
      setSelectedGoal(res);
      setShowForm(false);
      resetForm();
    } catch (err) {
      alert('Failed to create goal: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (goalId) => {
    try {
      await api.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g._id !== goalId && g.goalId !== goalId));
      if (selectedGoal?._id === goalId || selectedGoal?.goalId === goalId) setSelectedGoal(null);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const resetForm = () => {
    setGoalName('');
    setCustomName('');
    setTargetAmount('');
    setTargetDate('');
    setCurrentSavings('');
  };

  const minDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={24} color="#06b6d4" />
            Goal-Based Planner
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            Set financial goals and see your probability of reaching them
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', border: 'none',
            borderRadius: 12, padding: '10px 20px', color: '#fff', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: '0.9rem', transition: 'transform 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={18} /> New Goal
        </button>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: showForm || selectedGoal ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Left Panel — Goal List + Form */}
        <div>
          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: 20, padding: 24, marginBottom: 24,
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>Create New Goal</h3>

              {/* Goal presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {GOAL_PRESETS.map(preset => (
                  <button
                    key={preset.label} type="button"
                    onClick={() => setGoalName(preset.label)}
                    style={{
                      background: goalName === preset.label ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${goalName === preset.label ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10, padding: '10px 8px', color: '#e2e8f0', cursor: 'pointer',
                      fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, transition: 'all 0.2s',
                    }}
                  >
                    <span>{preset.icon}</span> {preset.label}
                  </button>
                ))}
              </div>

              {goalName === 'Custom' && (
                <input
                  type="text" placeholder="Enter goal name" value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={inputStyle} required
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={labelStyle}>Target Amount (₹)</label>
                  <input
                    type="number" placeholder="e.g. 3000000" value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    style={inputStyle} required min="10000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Target Date</label>
                  <input
                    type="date" value={targetDate} min={minDate}
                    onChange={e => setTargetDate(e.target.value)}
                    style={inputStyle} required
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Current Savings Toward This Goal (₹)</label>
                <input
                  type="number" placeholder="e.g. 100000" value={currentSavings}
                  onChange={e => setCurrentSavings(e.target.value)}
                  style={inputStyle} min="0"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="submit" disabled={loading} style={{
                  flex: 1, background: loading ? '#334155' : 'linear-gradient(135deg, #06b6d4, #10b981)',
                  border: 'none', borderRadius: 12, padding: '12px', color: '#fff',
                  fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                }}>
                  {loading ? 'Analyzing...' : 'Create Goal & Run Simulation'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '12px 20px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem',
                }}>Cancel</button>
              </div>
            </form>
          )}

          {/* Goal Cards */}
          {goals.length === 0 && !showForm && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.4)', borderRadius: 20, padding: 48,
              textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)',
            }}>
              <Target size={48} color="#334155" style={{ marginBottom: 16 }} />
              <h3 style={{ color: '#64748b', fontWeight: 600, fontSize: '1rem' }}>No goals yet</h3>
              <p style={{ color: '#475569', fontSize: '0.85rem' }}>Click "New Goal" to start planning</p>
            </div>
          )}

          {goals.map(goal => {
            const cfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.on_track;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={goal._id || goal.goalId}
                onClick={() => setSelectedGoal(goal)}
                style={{
                  background: selectedGoal?._id === goal._id ? 'rgba(6, 182, 212, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                  border: `1px solid ${selectedGoal?._id === goal._id ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 16, padding: 20, marginBottom: 12, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>{goal.goal_name}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                      Target: {formatINR(goal.target_amount)} • SIP: {formatINR(goal.recommended_sip)}/mo
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: cfg.bg, color: cfg.color, fontSize: '0.7rem',
                      padding: '4px 10px', borderRadius: 8, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <StatusIcon size={12} /> {cfg.label}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(goal._id || goal.goalId); }} style={{
                      background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4,
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Probability bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Success Probability</span>
                    <span style={{ fontSize: '0.7rem', color: cfg.color, fontWeight: 600 }}>
                      {Math.round((goal.probability_of_success || 0) * 100)}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', width: `${Math.min(100, (goal.probability_of_success || 0) * 100)}%`,
                      background: cfg.color, borderRadius: 2, transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Panel — Goal Details & Monte Carlo */}
        {selectedGoal && (
          <div>
            {/* Goal Summary Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(6, 182, 212, 0.15)',
              borderRadius: 20, padding: 24, marginBottom: 20,
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>
                {selectedGoal.goal_name}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <MetricCard label="Target" value={formatINR(selectedGoal.target_amount)} icon={<Target size={16} />} />
                <MetricCard label="Required SIP" value={`${formatINR(selectedGoal.recommended_sip)}/mo`} icon={<TrendingUp size={16} />} />
                <MetricCard label="Deadline" value={new Date(selectedGoal.target_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })} icon={<Calendar size={16} />} />
                <MetricCard label="Instrument" value={(selectedGoal.recommended_instrument || '').replace('_', ' ')} icon={<DollarSign size={16} />} />
              </div>

              {/* Gap warning */}
              {selectedGoal.gap_amount > 0 && (
                <div style={{
                  marginTop: 16, padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)',
                  fontSize: '0.85rem', color: '#fda4af',
                }}>
                  <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  You need <strong>{formatINR(selectedGoal.gap_amount)}</strong> more per month. Consider increasing your SIP.
                </div>
              )}

              {/* Gemini advice */}
              {selectedGoal.gemini_advice && (
                <div style={{
                  marginTop: 16, padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.15)',
                  fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, fontStyle: 'italic',
                }}>
                  💡 {selectedGoal.gemini_advice}
                </div>
              )}
            </div>

            {/* Monte Carlo Chart */}
            {selectedGoal.chartData && (
              <ProjectionBand
                chartData={selectedGoal.chartData}
                targetAmount={selectedGoal.target_amount}
                goalProbability={selectedGoal.probability_of_success}
                instrumentName={(selectedGoal.recommended_instrument || '').replace('_', ' ')}
                simulationsRun={selectedGoal.monte_carlo_summary?.simulations_run}
              />
            )}
          </div>
        )}
      </div>
      <SebiDisclaimer />
    </div>
  );
};

// Small metric card sub-component
const MetricCard = ({ label, value, icon }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 14px',
    border: '1px solid rgba(255,255,255,0.06)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ color: '#06b6d4' }}>{icon}</span>
      <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    </div>
    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
  </div>
);

// Shared input styles
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};

export default GoalPlanner;
