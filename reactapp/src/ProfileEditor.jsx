import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Banknote, Wallet, Scale, Target, Telescope, Save, Pencil, X, Check } from 'lucide-react';
import * as api from './services/api';

const GOALS_OPTIONS = ['Retirement', 'Wealth Growth', 'Tax Saving', 'Emergency Fund'];
const RISK_OPTIONS = ['Low', 'Medium', 'High'];

const ProfileEditor = ({ userProfile, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Editable draft state
  const [draft, setDraft] = useState({ ...userProfile });

  const savingsRate = Number(draft.monthly_income) > 0
    ? ((Number(draft.monthly_savings) / Number(draft.monthly_income)) * 100).toFixed(0)
    : 0;

  const profileFields = [
    { key: 'age', label: 'Age', icon: <Clock size={20} color="#94a3b8" />, type: 'number', min: 18, max: 80 },
    { key: 'monthly_income', label: 'Monthly Income', icon: <Banknote size={20} color="#34d399" />, type: 'currency' },
    { key: 'monthly_savings', label: 'Monthly Savings', icon: <Wallet size={20} color="#38bdf8" />, type: 'currency' },
    { key: 'risk_appetite', label: 'Risk Appetite', icon: <Scale size={20} color="#fbbf24" />, type: 'risk' },
    { key: 'investment_goals', label: 'Investment Goals', icon: <Target size={20} color="#fb7185" />, type: 'goals' },
    { key: 'investment_horizon', label: 'Investment Horizon', icon: <Telescope size={20} color="#a78bfa" />, type: 'slider', min: 1, max: 30, suffix: ' years' },
  ];

  const handleEdit = () => {
    setDraft({ ...userProfile });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft({ ...userProfile });
    setIsEditing(false);
  };

  const handleSave = async () => {
    const numIncome = Number(draft.monthly_income);
    const numSavings = Number(draft.monthly_savings);
    const numAge = Number(draft.age);

    if (!numAge || numAge < 18 || numAge > 80) {
      alert('Age must be between 18 and 80.');
      return;
    }
    if (!numIncome || numIncome <= 0) {
      alert('Please enter a valid monthly income.');
      return;
    }
    if (!numSavings || numSavings < 500) {
      alert('Monthly savings must be at least ₹500.');
      return;
    }
    if (numSavings >= numIncome) {
      alert('Monthly savings must be less than monthly income.');
      return;
    }

    setIsSaving(true);
    try {
      await api.buildProfile(numIncome, numAge, numSavings, draft.taxRegime || 'new', draft.investment_horizon || 15);
      onProfileUpdate(draft);
      setIsEditing(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } catch (err) {
      alert("Error updating profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGoal = (goal) => {
    setDraft(prev => ({
      ...prev,
      investment_goals: prev.investment_goals.includes(goal)
        ? prev.investment_goals.filter(g => g !== goal)
        : [...prev.investment_goals, goal]
    }));
  };

  const renderValue = (field) => {
    const val = draft[field.key];
    if (field.type === 'currency') return `₹${Number(val).toLocaleString('en-IN')}`;
    if (field.type === 'goals') return Array.isArray(val) ? val.join(', ') : val;
    if (field.type === 'slider') return `${val}${field.suffix || ''}`;
    return val;
  };

  const renderEditField = (field) => {
    const val = draft[field.key];

    if (field.type === 'number' || field.type === 'currency') {
      return (
        <input
          type="number"
          value={val}
          min={field.min}
          max={field.max}
          onChange={e => {
            let raw = e.target.value;
            // Strip leading zeros (prevents "088")
            if (raw.length > 1 && raw.startsWith('0')) raw = raw.replace(/^0+/, '') || '0';
            let num = Number(raw);
            // Clamp to min/max if defined
            if (field.max !== undefined && num > field.max) num = field.max;
            if (field.min !== undefined && num < field.min && raw !== '') num = Math.max(0, num);
            setDraft(prev => ({ ...prev, [field.key]: num }));
          }}
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#f8fafc',
            fontSize: '1.05rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#38bdf8'}
          onBlur={e => e.target.style.borderColor = 'rgba(56, 189, 248, 0.3)'}
        />
      );
    }

    if (field.type === 'risk') {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          {RISK_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setDraft(prev => ({ ...prev, risk_appetite: r }))}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 10,
                border: val === r ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                background: val === r ? 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(139,92,246,0.1))' : 'rgba(15,23,42,0.4)',
                color: val === r ? '#38bdf8' : '#94a3b8',
                fontWeight: val === r ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      );
    }

    if (field.type === 'goals') {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GOALS_OPTIONS.map(g => {
            const active = val.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGoal(g)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 10,
                  border: active ? '1.5px solid #fb7185' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(251,113,133,0.12)' : 'rgba(15,23,42,0.4)',
                  color: active ? '#fb7185' : '#94a3b8',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {active && <Check size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                {g}
              </button>
            );
          })}
        </div>
      );
    }

    if (field.type === 'slider') {
      const pct = ((val - field.min) / (field.max - field.min)) * 100;
      const unitLabel = field.suffix ? (val === 1 ? field.suffix.replace(/s$/, '') : field.suffix) : '';
      return (
        <div>
          <input
            type="range"
            min={field.min}
            max={field.max}
            value={val}
            onChange={e => setDraft(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
            style={{
              width: '100%',
              accentColor: '#38bdf8',
              background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
              borderRadius: 6,
              height: 6,
            }}
            className="tax-slider"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: 6 }}>
            <span>{field.min}</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{val}{unitLabel}</span>
            <span>{field.max}</span>
          </div>
        </div>
      );
    }

    return <span style={{ color: '#f8fafc', fontWeight: 600 }}>{val}</span>;
  };

  return (
    <div style={{ padding: '40px 28px', maxWidth: 960, margin: '0 auto', color: '#fff', position: 'relative' }}>
      <div className="profile-mesh-bg" />

      {/* Header */}
      <motion.div
        style={{ position: 'relative', zIndex: 2, marginBottom: 12 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#38bdf8', marginBottom: 8, opacity: 0.9 }}>
          FINANCIAL COMMAND CENTER
        </div>
        <h1 className="page-title" style={{ fontSize: '2.4rem', marginBottom: 6 }}>
          My <span style={{
            background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Profile</span>
        </h1>
        <p className="page-title-sub" style={{ marginBottom: 0, fontSize: '0.95rem' }}>
          Your personalized wealth parameters driving AI recommendations
        </p>
      </motion.div>

      {/* Summary Stats Bar */}
      <motion.div
        className="profile-summary-bar"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="profile-summary-item">
          <div className="summary-number" style={{ color: '#34d399' }}>{savingsRate}%</div>
          <div className="summary-label">Savings Rate</div>
        </div>
        <div className="profile-summary-item">
          <div className="summary-number" style={{ color: '#38bdf8' }}>₹{Number(draft.monthly_savings).toLocaleString('en-IN')}</div>
          <div className="summary-label">Monthly SIP Budget</div>
        </div>
        <div className="profile-summary-item">
          <div className="summary-number" style={{ color: '#a78bfa' }}>{draft.investment_horizon}Y</div>
          <div className="summary-label">Horizon</div>
        </div>
      </motion.div>

      {/* Saved toast */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'relative', zIndex: 10, marginBottom: 16,
              background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
              color: '#34d399', fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            <Check size={18} /> Profile updated successfully! Recommendations will recalculate.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Card */}
      <motion.div
        className="hud-profile-card"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 100 }}
        style={{ maxWidth: '100%' }}
      >
        <div className="hud-profile-grid">
          {profileFields.map((field, index) => (
            <motion.div
              key={field.key}
              className="hud-stat-box"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + (index * 0.08) }}
              style={isEditing ? { padding: '18px 20px' } : {}}
            >
              <div className="hud-stat-icon">{field.icon}</div>
              <div className="hud-stat-content" style={{ flex: 1, minWidth: 0 }}>
                <span className="hud-stat-label">{field.label}</span>
                {isEditing ? (
                  renderEditField(field)
                ) : (
                  <span className="hud-stat-value">{renderValue(field)}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <motion.div
          style={{ display: 'flex', gap: 12, marginTop: 8 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          {isEditing ? (
            <>
              <button
                className="hud-profile-btn"
                onClick={handleSave}
                disabled={isSaving}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="hud-profile-btn"
                onClick={handleCancel}
                style={{
                  flex: 0.5,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <X size={16} /> Cancel
              </button>
            </>
          ) : (
            <button
              className="hud-profile-btn"
              onClick={handleEdit}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Pencil size={16} /> Edit Profile
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProfileEditor;
