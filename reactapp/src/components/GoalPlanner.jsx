import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle, Calendar, DollarSign, Rocket, Umbrella, Home, GraduationCap, Shield, Car, Sparkles, Sliders, Save, ShieldAlert } from 'lucide-react';
import JargonTooltip from './JargonTooltip';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectionBand from './ProjectionBand';
import SebiDisclaimer from './SebiDisclaimer';
import api from '../services/api';

const GOAL_PRESETS = [
  { label: 'Retirement', Icon: Umbrella, color: '#f59e0b' },
  { label: 'Home Purchase', Icon: Home, color: '#38bdf8' },
  { label: 'Child Education', Icon: GraduationCap, color: '#8b5cf6' },
  { label: 'Emergency Fund', Icon: Shield, color: '#10b981' },
  { label: 'Vehicle', Icon: Car, color: '#f43f5e' },
  { label: 'Custom', Icon: Sparkles, color: '#94a3b8' },
];

const STATUS_CONFIG = {
  on_track:  { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', label: 'On Track',  icon: CheckCircle },
  at_risk:   { color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)',   label: 'At Risk',   icon: AlertTriangle },
  off_track: { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)',   label: 'Off Track', icon: AlertTriangle },
};

const PRIORITY_CONFIG = {
  Critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
  High:     { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)' },
  Medium:   { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)' },
  Low:      { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.3)' },
};

const formatINR = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

const GoalPlanner = ({ profile }) => {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [simulatedSips, setSimulatedSips] = useState({});

  // Inline editing state for overview panel
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editTarget, setEditTarget] = useState('');
  const [editSavings, setEditSavings] = useState('');

  // Form state
  const [goalName, setGoalName] = useState('');
  const [customName, setCustomName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [priority, setPriority] = useState('Medium');

  // Wizard and advanced visibility states
  const [formStep, setFormStep] = useState(1);
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);

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

  // When selected goal changes, initialize its simulator value and edit fields
  useEffect(() => {
    if (selectedGoal) {
      const gid = selectedGoal._id || selectedGoal.goalId;
      if (!simulatedSips[gid]) {
        setSimulatedSips(prev => ({
          ...prev,
          [gid]: selectedGoal.recommended_sip
        }));
      }
      setEditTarget(selectedGoal.target_amount);
      setEditSavings(selectedGoal.current_savings || 0);
      setIsEditingSettings(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGoal]);

  const getLiveProbability = (goal) => {
    const simSip = simulatedSips[goal._id || goal.goalId] || goal.recommended_sip;
    const ratio = simSip / (goal.recommended_sip || 1);
    let prob = (goal.probability_of_success || 0.5) * ratio;
    return Math.min(0.99, Math.max(0.01, prob));
  };

  const getSimulatedChartData = (goal) => {
    if (!goal || !goal.chartData) return [];
    const simSip = simulatedSips[goal._id || goal.goalId] || goal.recommended_sip;
    if (simSip === goal.recommended_sip) return goal.chartData;
    
    const ratio = simSip / (goal.recommended_sip || 1);
    const initialSaved = goal.current_savings || 0;
    
    let cagr = 0.11;
    const inst = goal.recommended_instrument || '';
    if (inst.includes('FD') || inst.includes('Debt') || inst.includes('Bond') || inst.includes('Liquid')) {
      cagr = 0.07;
    } else if (inst.includes('Gold') || inst.includes('Arbitrage') || inst.includes('SGB')) {
      cagr = 0.09;
    }
    
    return goal.chartData.map(d => {
      const year = d.year;
      const initialGrowth = initialSaved * Math.pow(1 + cagr, year);
      
      const scaleField = (val) => {
        if (val <= initialGrowth) return val;
        const sipPortion = val - initialGrowth;
        return initialGrowth + (sipPortion * ratio);
      };
      
      return {
        year: d.year,
        p10: scaleField(d.p10),
        p25: scaleField(d.p25),
        p50: scaleField(d.p50),
        p75: scaleField(d.p75),
        p90: scaleField(d.p90),
      };
    });
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
        priority: priority,
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
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    try {
      await api.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g._id !== goalId && g.goalId !== goalId));
      if (selectedGoal?._id === goalId || selectedGoal?.goalId === goalId) setSelectedGoal(null);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    const gid = selectedGoal?._id || selectedGoal?.goalId;
    if (!gid) return;
    try {
      const res = await api.updateGoal(gid, { priority: newPriority });
      if (res.success) {
        setGoals(prev => prev.map(g => (g._id === gid || g.goalId === gid) ? { ...g, priority: newPriority } : g));
        setSelectedGoal(prev => ({ ...prev, priority: newPriority }));
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const handleSaveGoalUpdates = async () => {
    const gid = selectedGoal?._id || selectedGoal?.goalId;
    if (!gid) return;
    setLoading(true);
    try {
      const res = await api.updateGoal(gid, {
        target_amount: parseFloat(editTarget),
        current_savings: parseFloat(editSavings),
      });
      if (res.success) {
        const updatedGoal = res.goal;
        // The API returns dynamic chartData when we refetch, but let's make sure it updates locally
        const freshList = await api.getGoals();
        setGoals(freshList.goals || []);
        
        const freshGoal = (freshList.goals || []).find(g => g._id === gid || g.goalId === gid);
        setSelectedGoal(freshGoal || updatedGoal);
        setIsEditingSettings(false);
      }
    } catch (err) {
      alert('Failed to update goal metrics: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGoalName('');
    setCustomName('');
    setTargetAmount('');
    setTargetDate('');
    setCurrentSavings('');
    setPriority('Medium');
    setFormStep(1);
  };

  const minDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // At least 6 months in future

  return (
    <motion.div 
      className="dashboard-page"
      style={{ padding: '32px 40px', boxSizing: 'border-box', maxWidth: 1600, margin: '0 auto', width: '100%', overflowX: 'hidden' }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: 40, flexWrap: 'wrap', gap: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ 
            display: 'flex', width: 64, height: 64, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15))', 
            border: '1px solid rgba(6, 182, 212, 0.4)',
            borderRadius: 18, alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(6, 182, 212, 0.2), inset 0 1px 1px rgba(255,255,255,0.3)'
          }}>
            <Target size={32} color="#38bdf8" />
          </div>
          <div className="dashboard-title-group">
            <span className="dashboard-subtitle">Financial Planning Engine</span>
            <h1 className="dashboard-title">My Goal Planner</h1>
            <p style={{ fontSize: '1.05rem', color: '#94a3b8', marginTop: 8, fontWeight: 500 }}>
              Set your targets, choose your priorities, and see how likely you are to succeed with smart wealth simulations.
            </p>
          </div>
        </div>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(6, 182, 212, 0.4)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', border: 'none',
            borderRadius: 14, padding: '14px 28px', color: '#fff', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            fontSize: '1rem', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3), inset 0 1px 1px rgba(255,255,255,0.3)',
            alignSelf: 'center', flexShrink: 0
          }}
        >
          <Plus size={20} /> New Goal Target
        </motion.button>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: showForm || selectedGoal ? '1fr 1.1fr' : '1fr', gap: 32, transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* Left Panel — Goal List + Form */}
        <div>
          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.form 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
                onSubmit={handleSubmit} 
                style={{
                  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(6, 182, 212, 0.3)', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 24, padding: 32, marginBottom: 24,
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.5)',
                  overflow: 'hidden', position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: '20%', width: '60%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.8), transparent)' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Rocket size={20} color="#38bdf8" /> Set Up Your Goal (Step {formStep} of 3)
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {formStep === 1 ? 'Goal Type' : formStep === 2 ? 'Target Amount & Date' : 'Current Savings & Importance'}
                  </span>
                </div>

                {/* Step 1: Goal presets */}
                {formStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 16 }}>What is your main savings goal?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                      {GOAL_PRESETS.map(preset => (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={preset.label} type="button"
                          onClick={() => {
                            setGoalName(preset.label);
                            if (preset.label !== 'Custom') {
                              setFormStep(2);
                            }
                          }}
                          style={{
                            background: goalName === preset.label ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${goalName === preset.label ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: 12, padding: '16px 8px', color: goalName === preset.label ? '#fff' : '#94a3b8', 
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: goalName === preset.label ? 600 : 400,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 8, boxShadow: goalName === preset.label ? 'inset 0 2px 4px rgba(255,255,255,0.1)' : 'none',
                          }}
                        >
                          <preset.Icon size={22} color={goalName === preset.label ? '#fff' : preset.color} /> {preset.label}
                        </motion.button>
                      ))}
                    </div>

                    {goalName === 'Custom' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Custom Goal Name</label>
                        <input
                          type="text" placeholder="e.g. Euro Trip, Dream Wedding" value={customName}
                          onChange={e => setCustomName(e.target.value)}
                          style={inputStyle} required
                        />
                      </motion.div>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                      <button 
                        type="button" 
                        onClick={() => { setShowForm(false); resetForm(); }}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12, padding: '14px 24px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, flex: 1
                        }}
                      >
                        Cancel
                      </button>
                      {goalName === 'Custom' && (
                        <button 
                          type="button" 
                          onClick={() => {
                            if (customName.trim() === '') {
                              alert('Please enter a custom goal name.');
                              return;
                            }
                            setFormStep(2);
                          }}
                          style={{
                            flex: 1, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                            border: 'none', borderRadius: 12, padding: '14px', color: '#fff',
                            fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)'
                          }}
                        >
                          Next Step
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Amount & Date */}
                {formStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 16 }}>
                      How much do you need for <strong>{goalName === 'Custom' ? customName : goalName}</strong>, and when?
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Target Amount (₹)</label>
                        <input
                          type="number" placeholder="e.g. 3000000" value={targetAmount}
                          onChange={e => setTargetAmount(e.target.value)}
                          style={inputStyle} required min="1000"
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

                    <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                      <button 
                        type="button" 
                        onClick={() => setFormStep(1)}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12, padding: '14px 24px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, flex: 1
                        }}
                      >
                        Back
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (!targetAmount || Number(targetAmount) < 1000) {
                            alert('Please enter a target amount of at least ₹1,000.');
                            return;
                          }
                          if (!targetDate) {
                            alert('Please select a target date.');
                            return;
                          }
                          setFormStep(3);
                        }}
                        style={{
                          flex: 1, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                          border: 'none', borderRadius: 12, padding: '14px', color: '#fff',
                          fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                          boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)'
                        }}
                      >
                        Next Step
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Savings & priority */}
                {formStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 16 }}>
                      How much have you saved so far, and how important is this goal?
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Current Savings (₹)</label>
                        <input
                          type="number" placeholder="e.g. 100000" value={currentSavings}
                          onChange={e => setCurrentSavings(e.target.value)}
                          style={inputStyle} min="0"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Goal Importance (Priority)</label>
                        <select 
                          value={priority} 
                          onChange={e => setPriority(e.target.value)}
                          style={{ ...inputStyle, height: '42px' }}
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                      <button 
                        type="button" 
                        onClick={() => setFormStep(2)}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12, padding: '14px 24px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, flex: 1
                        }}
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        disabled={loading}
                        style={{
                          flex: 2, background: loading ? '#334155' : 'linear-gradient(135deg, #0ea5e9, #10b981)',
                          border: 'none', borderRadius: 12, padding: '14px', color: '#fff',
                          fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem',
                          boxShadow: loading ? 'none' : '0 4px 15px rgba(6, 182, 212, 0.4)',
                        }}
                      >
                        {loading ? 'Running AI Projections...' : 'Save Goal & View Projections'}
                      </button>
                    </div>
                  </motion.div>
                )}
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
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: 300, margin: '0 auto 24px', lineHeight: 1.5 }}>Create a savings goal to let our smart planner calculate how much you need to save each month.</p>
              
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
              const isSelected = selectedGoal?._id === goal._id || selectedGoal?.goalId === goal.goalId;
              return (
                <motion.div
                  key={goal._id || goal.goalId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  onClick={() => setSelectedGoal(goal)}
                  style={{
                    background: isSelected 
                      ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.15), rgba(15, 23, 42, 0.8))' 
                      : 'linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${isSelected ? 'rgba(6, 182, 212, 0.6)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderTop: `1px solid ${isSelected ? 'rgba(6, 182, 212, 0.8)' : 'rgba(255, 255, 255, 0.12)'}`,
                    borderRadius: 20, padding: 24, marginBottom: 16, cursor: 'pointer',
                    boxShadow: isSelected 
                      ? '0 10px 40px rgba(6, 182, 212, 0.2), inset 0 1px 1px rgba(255,255,255,0.1)' 
                      : '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255,255,255,0.05)',
                    position: 'relative', overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: '#06b6d4', boxShadow: '0 0 15px #06b6d4' }} />
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '0.2px' }}>{goal.goal_name}</h4>
                        <span className={`goal-priority-badge badge-glow-${(goal.priority || 'Medium') === 'Critical' ? 'rose' : (goal.priority || 'Medium') === 'High' ? 'amber' : (goal.priority || 'Medium') === 'Medium' ? 'cyan' : 'emerald'}`} style={{
                          fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.6px'
                        }}>
                          {goal.priority || 'Medium'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: 8, fontWeight: 500, display: 'flex', gap: 12 }}>
                        <span><Target size={12} style={{marginRight:4, verticalAlign:'-2px', color:'#06b6d4'}}/>{formatINR(goal.target_amount)}</span>
                        <span style={{color: 'rgba(255,255,255,0.2)'}}>|</span>
                        <span><TrendingUp size={12} style={{marginRight:4, verticalAlign:'-2px', color:'#10b981'}}/>{formatINR(goal.recommended_sip)}/mo (<JargonTooltip term="SIP">SIP</JargonTooltip>)</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: cfg.bg, color: cfg.color, fontSize: '0.75rem',
                        padding: '6px 14px', borderRadius: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${cfg.color}40`,
                        boxShadow: `inset 0 1px 2px rgba(255,255,255,0.05)`
                      }}>
                        <StatusIcon size={14} /> {cfg.label}
                      </span>
                      <motion.button 
                        whileHover={{ scale: 1.1, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(goal._id || goal.goalId); }} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b', cursor: 'pointer', 
                        padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}>
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Probability progress bar */}
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}><JargonTooltip term="Success Probability">Success Probability</JargonTooltip></span>
                      <span style={{ fontSize: '0.85rem', color: cfg.color, fontWeight: 800, textShadow: `0 0 10px ${cfg.color}60` }}>
                        {Math.round(getLiveProbability(goal) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(15, 23, 42, 0.8)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, getLiveProbability(goal) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                          height: '100%',
                          background: `linear-gradient(90deg, ${cfg.color}40, ${cfg.color})`, borderRadius: 4,
                          boxShadow: `0 0 15px ${cfg.color}80, inset 0 1px 1px rgba(255,255,255,0.4)`
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
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.9))', backdropFilter: 'blur(24px)',
                border: '1px solid rgba(6, 182, 212, 0.3)', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 15px 50px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)',
                borderRadius: 24, padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Target size={24} color="#38bdf8" />
                    {selectedGoal.goal_name} Overview
                  </h3>
                  <button 
                    onClick={() => {
                      if (isEditingSettings) {
                        handleSaveGoalUpdates();
                      } else {
                        setIsEditingSettings(true);
                      }
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)',
                      padding: '6px 14px', borderRadius: 10, color: '#38bdf8', fontSize: '0.8rem',
                      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isEditingSettings ? <><Save size={14}/> Save Updates</> : 'Change Goal Details'}
                  </button>
                </div>

                {isEditingSettings ? (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: 'rgba(15,23,42,0.4)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div>
                      <label style={labelStyle}>Target Amount to Save (₹)</label>
                      <input 
                        type="number" 
                        value={editTarget} 
                        onChange={e => setEditTarget(e.target.value)} 
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Current Savings Allocated (₹)</label>
                      <input 
                        type="number" 
                        value={editSavings} 
                        onChange={e => setEditSavings(e.target.value)} 
                        style={inputStyle}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <MetricCard label="Target" value={formatINR(selectedGoal.target_amount)} icon={<Target size={16} />} />
                    <MetricCard label="Required Monthly SIP" value={`${formatINR(selectedGoal.recommended_sip)}/mo`} icon={<TrendingUp size={16} />} />
                    <MetricCard label="Deadline" value={new Date(selectedGoal.target_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })} icon={<Calendar size={16} />} />
                    <MetricCard label="Instrument" value={(selectedGoal.recommended_instrument || '').replace('_', ' ')} icon={<DollarSign size={16} />} />
                  </div>
                )}

                {/* Priority Selector HUD */}
                <div style={{ marginTop: 24, padding: 16, background: 'rgba(15, 23, 42, 0.3)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={labelStyle}>How Important is this Goal?</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                    {['Critical', 'High', 'Medium', 'Low'].map(p => {
                      const isActive = selectedGoal.priority === p;
                      const cfg = PRIORITY_CONFIG[p];
                      return (
                        <button
                          key={p}
                          onClick={() => handlePriorityChange(p)}
                          style={{
                            background: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.05)'}`,
                            color: isActive ? cfg.color : '#94a3b8',
                            borderRadius: 8, padding: '8px 4px', fontSize: '0.78rem',
                            fontWeight: isActive ? 800 : 500, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gap warning */}
                {selectedGoal.gap_amount > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{
                    marginTop: 24, padding: '16px 20px', borderRadius: 16,
                    background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.1), rgba(244, 63, 94, 0.05))', border: '1px solid rgba(244, 63, 94, 0.2)',
                    fontSize: '0.9rem', color: '#fda4af', display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                  }}>
                    <AlertTriangle size={20} color="#f43f5e" />
                    <div style={{ lineHeight: 1.5 }}>
                      You need <strong style={{ color: '#fff' }}>{formatINR(selectedGoal.gap_amount)}</strong> more monthly contribution to achieve this goal on schedule.
                    </div>
                  </motion.div>
                )}

                {/* Real-time SIP Simulator */}
                <div style={{ marginTop: 24, padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 16, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <label style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Sliders size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                      See What Happens If You Save More (<JargonTooltip term="SIP">SIP</JargonTooltip> Simulator)
                    </label>
                    <span style={{ color: '#fff', fontWeight: 800 }}>{formatINR(simulatedSips[selectedGoal._id || selectedGoal.goalId] || selectedGoal.recommended_sip)}/mo</span>
                  </div>
                  <input 
                    type="range" 
                    min={Math.max(1000, selectedGoal.recommended_sip * 0.2)} 
                    max={selectedGoal.recommended_sip * 2.5} 
                    step="500" 
                    value={simulatedSips[selectedGoal._id || selectedGoal.goalId] || selectedGoal.recommended_sip}
                    onChange={(e) => setSimulatedSips(prev => ({ ...prev, [selectedGoal._id || selectedGoal.goalId]: Number(e.target.value) }))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.7rem', color: '#64748b' }}>
                    <span>{formatINR(Math.max(1000, selectedGoal.recommended_sip * 0.2))}</span>
                    <span>{formatINR(selectedGoal.recommended_sip * 2.5)}</span>
                  </div>
                  <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Adjust the slider to see how saving a different amount changes your projected growth and improves your chance of success to <strong style={{ color: STATUS_CONFIG[selectedGoal.status]?.color || '#10b981' }}>{Math.round(getLiveProbability(selectedGoal) * 100)}%</strong>.
                  </div>
                </div>

                {/* Gemini advice */}
                {selectedGoal.gemini_advice && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    style={{
                    marginTop: 20, padding: '20px', borderRadius: 16,
                    background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.08), rgba(139, 92, 246, 0.04))', border: '1px solid rgba(6, 182, 212, 0.15)',
                    fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Sparkles size={18} color="#38bdf8" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.5))' }} />
                      <div>{selectedGoal.gemini_advice}</div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Toggle Monte Carlo Chart */}
              {selectedGoal.chartData && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <button
                    onClick={() => setShowMonteCarlo(!showMonteCarlo)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '12px',
                      padding: '10px 20px',
                      color: '#38bdf8',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {showMonteCarlo ? 'Hide Projections' : 'Simulate Future Growth (Monte Carlo Simulation)'}
                  </button>
                  {showMonteCarlo && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      style={{ marginTop: 16 }}
                    >
                      <ProjectionBand
                        chartData={getSimulatedChartData(selectedGoal)}
                        targetAmount={selectedGoal.target_amount}
                        goalProbability={getLiveProbability(selectedGoal)}
                        instrumentName={(selectedGoal.recommended_instrument || '').replace('_', ' ')}
                        simulationsRun={selectedGoal.monte_carlo_summary?.simulations_run}
                      />
                    </motion.div>
                  )}
                </div>
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
    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))', borderRadius: 16, padding: '16px',
    border: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.2)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{value}</div>
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
