import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle, Calendar, DollarSign, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div 
      style={{ padding: '0 0 40px 0' }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ 
              display: 'inline-flex', width: 38, height: 38, 
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', 
              borderRadius: 10, alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' 
            }}>
              <Target size={22} color="#fff" />
            </span>
            Goal-Based Planner
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginTop: 8 }}>
            Set financial goals and see your probability of reaching them
          </p>
        </div>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', border: 'none',
            borderRadius: 12, padding: '12px 24px', color: '#fff', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
          }}
        >
          <Plus size={18} /> New Goal
        </motion.button>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: showForm || selectedGoal ? '1fr 1fr' : '1fr', gap: 24, transition: 'all 0.4s ease' }}>
        {/* Left Panel — Goal List + Form */}
        <div>
          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.form 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
                onSubmit={handleSubmit} 
                style={{
                  background: 'rgba(11, 19, 30, 0.5)', backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderRadius: 24, padding: 32, marginBottom: 24,
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.5)',
                  overflow: 'hidden'
                }}
              >
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 20 }}>Create New Goal</h3>

                {/* Goal presets */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {GOAL_PRESETS.map(preset => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={preset.label} type="button"
                      onClick={() => setGoalName(preset.label)}
                      style={{
                        background: goalName === preset.label ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${goalName === preset.label ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: 12, padding: '12px 8px', color: goalName === preset.label ? '#fff' : '#94a3b8', 
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: goalName === preset.label ? 600 : 400,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, boxShadow: goalName === preset.label ? 'inset 0 2px 4px rgba(255,255,255,0.1)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{preset.icon}</span> {preset.label}
                    </motion.button>
                  ))}
                </div>

                {goalName === 'Custom' && (
                  <motion.input
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    type="text" placeholder="Enter custom goal name" value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    style={inputStyle} required
                  />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
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

                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Current Savings Toward This Goal (₹)</label>
                  <input
                    type="number" placeholder="e.g. 100000" value={currentSavings}
                    onChange={e => setCurrentSavings(e.target.value)}
                    style={inputStyle} min="0"
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                  <motion.button 
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    type="submit" disabled={loading} style={{
                    flex: 1, background: loading ? '#334155' : 'linear-gradient(135deg, #06b6d4, #10b981)',
                    border: 'none', borderRadius: 12, padding: '14px', color: '#fff',
                    fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem',
                    boxShadow: loading ? 'none' : '0 4px 15px rgba(6, 182, 212, 0.4)',
                  }}>
                    {loading ? 'Running AI Simulations...' : 'Create Goal & Run Simulation'}
                  </motion.button>
                  <motion.button 
                    whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                    type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: '14px 24px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
                  }}>Cancel</motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Goal Cards */}
          {goals.length === 0 && !showForm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.2) 100%)', 
                borderRadius: 24, padding: '60px 20px',
                textAlign: 'center', border: '1px solid rgba(6, 182, 212, 0.15)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 20px 40px rgba(0,0,0,0.4)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-50%', left: '20%', width: '60%', height: '100%', background: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.15), transparent 70%)', pointerEvents: 'none' }} />
              
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6, 182, 212, 0.2)' }}
              >
                <Rocket size={40} color="#06b6d4" />
              </motion.div>
              
              <h3 style={{ color: '#f8fafc', fontWeight: 800, fontSize: '1.4rem', marginBottom: 8, letterSpacing: '0.5px' }}>No Goals Active</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: 300, margin: '0 auto 24px', lineHeight: 1.5 }}>Deploy your capital with intention. Create a goal to let the AI calculate your required SIP.</p>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowForm(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: 20, padding: '10px 24px', color: '#06b6d4', fontWeight: 600,
                  cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                Create First Goal
              </motion.button>
            </motion.div>
          )}

          <AnimatePresence>
            {goals.map((goal, i) => {
              const cfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.on_track;
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={goal._id || goal.goalId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setSelectedGoal(goal)}
                  style={{
                    background: selectedGoal?._id === goal._id ? 'rgba(6, 182, 212, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${selectedGoal?._id === goal._id ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 20, padding: 24, marginBottom: 16, cursor: 'pointer',
                    boxShadow: selectedGoal?._id === goal._id ? '0 10px 30px rgba(6, 182, 212, 0.15)' : '0 4px 20px rgba(0,0,0,0.2)',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  {selectedGoal?._id === goal._id && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: '#06b6d4', boxShadow: '0 0 10px #06b6d4' }} />
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.5px' }}>{goal.goal_name}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>
                        Target: {formatINR(goal.target_amount)} • SIP: {formatINR(goal.recommended_sip)}/mo
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: cfg.bg, color: cfg.color, fontSize: '0.75rem',
                        padding: '6px 12px', borderRadius: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${cfg.color}30`
                      }}>
                        <StatusIcon size={14} /> {cfg.label}
                      </span>
                      <motion.button 
                        whileHover={{ scale: 1.1, color: '#ef4444' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(goal._id || goal.goalId); }} style={{
                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4,
                      }}>
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Probability bar */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Success Probability</span>
                      <span style={{ fontSize: '0.8rem', color: cfg.color, fontWeight: 800 }}>
                        {Math.round((goal.probability_of_success || 0) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (goal.probability_of_success || 0) * 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`, borderRadius: 3,
                        boxShadow: `0 0 10px ${cfg.color}80`
                      }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Right Panel — Goal Details & Monte Carlo */}
        <AnimatePresence mode="wait">
          {selectedGoal && (
            <motion.div
              key={selectedGoal._id || selectedGoal.goalId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Goal Summary Card */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.4))', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(6, 182, 212, 0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                borderRadius: 24, padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none' }} />

                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={24} color="#06b6d4" />
                  {selectedGoal.goal_name} Overview
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <MetricCard label="Target" value={formatINR(selectedGoal.target_amount)} icon={<Target size={16} />} />
                  <MetricCard label="Required SIP" value={`${formatINR(selectedGoal.recommended_sip)}/mo`} icon={<TrendingUp size={16} />} />
                  <MetricCard label="Deadline" value={new Date(selectedGoal.target_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })} icon={<Calendar size={16} />} />
                  <MetricCard label="Instrument" value={(selectedGoal.recommended_instrument || '').replace('_', ' ')} icon={<DollarSign size={16} />} />
                </div>

                {/* Gap warning */}
                {selectedGoal.gap_amount > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{
                    marginTop: 20, padding: '16px 20px', borderRadius: 16,
                    background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.1), rgba(244, 63, 94, 0.05))', border: '1px solid rgba(244, 63, 94, 0.2)',
                    fontSize: '0.9rem', color: '#fda4af', display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <AlertTriangle size={20} color="#f43f5e" />
                    <div>
                      You need <strong style={{ color: '#fff' }}>{formatINR(selectedGoal.gap_amount)}</strong> more per month. Consider increasing your SIP.
                    </div>
                  </motion.div>
                )}

                {/* Gemini advice */}
                {selectedGoal.gemini_advice && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    style={{
                    marginTop: 20, padding: '16px 20px', borderRadius: 16,
                    background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.05))', border: '1px solid rgba(6, 182, 212, 0.2)',
                    fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic',
                  }}>
                    <span style={{ fontSize: '1.2rem', marginRight: 8, verticalAlign: 'middle' }}>💡</span> 
                    {selectedGoal.gemini_advice}
                  </motion.div>
                )}
              </div>

              {/* Monte Carlo Chart */}
              {selectedGoal.chartData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                  <ProjectionBand
                    chartData={selectedGoal.chartData}
                    targetAmount={selectedGoal.target_amount}
                    goalProbability={selectedGoal.probability_of_success}
                    instrumentName={(selectedGoal.recommended_instrument || '').replace('_', ' ')}
                    simulationsRun={selectedGoal.monte_carlo_summary?.simulations_run}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SebiDisclaimer />
    </motion.div>
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
