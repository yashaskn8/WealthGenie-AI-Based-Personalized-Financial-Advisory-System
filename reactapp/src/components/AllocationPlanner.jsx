import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Target, PieChart as PieChartIcon, TrendingUp, Landmark, Briefcase, Wallet } from 'lucide-react';
import { computeAllocation } from '../recommendationEngine';
import { getEligibleInvestments } from '../recommendationEngine';
import { CONCENTRATION_CAPS, RISK_COLORS } from '../investmentDatabase';
import JargonTooltip from './JargonTooltip';
import './AllocationPlanner.css';

const getCategoryIcon = (cat) => {
  if (!cat) return <Wallet size={20} />;
  if (cat.includes('Equity') || cat.includes('MF') || cat.includes('ETF')) return <TrendingUp size={20} />;
  if (cat.includes('Debt') || cat.includes('Govt') || cat.includes('Bond') || cat.includes('NPS')) return <Landmark size={20} />;
  if (cat.includes('Gold') || cat.includes('Commodity')) return <Briefcase size={20} />;
  return <Wallet size={20} />;
};

const RISK_PRESETS = ['Safe & Stable', 'Balanced Growth', 'Aggressive Growth'];

const CATEGORY_EXPLANATIONS = {
  'Equity': 'Company Shares (High Growth, High Risk)',
  'Debt': 'Fixed Income & FD (Steady Yield, Medium Risk)',
  'Government': 'Government-Backed Savings (Highest Safety, Steady Return)',
  'Equity-Debt': 'Hybrid Mix (Balanced Safety & Growth)',
  'Commodity': 'Gold & Precious Metals (Inflation Shield, Stable)',
  'Alternative': 'Alternative Investments (High Diversification)',
  'Gold': 'Gold & Precious Metals (Inflation Shield, Stable)'
};

const AllocationPlanner = ({ profile }) => {
  const savings = Number(profile?.monthly_savings) || 12000;
  const eligible = useMemo(() => getEligibleInvestments(profile || {}), [profile]);

  // Risk view toggle state
  const [riskView, setRiskView] = useState(
    profile?.risk_appetite === 'High' ? 'Aggressive Growth' : 
    profile?.risk_appetite === 'Low' ? 'Safe & Stable' : 'Balanced Growth'
  );

  // Compute allocation for the selected risk view
  const baseAllocation = useMemo(() => {
    const overrideRisk = riskView === 'Aggressive Growth' ? 'High' : riskView === 'Safe & Stable' ? 'Low' : 'Medium';
    return computeAllocation({ ...profile, risk_appetite: overrideRisk }, eligible);
  }, [profile, eligible, riskView]);

  const [overrides, setOverrides] = useState(null);
  const [warning, setWarning] = useState(null);
  const [showManualAdjust, setShowManualAdjust] = useState(false);

  const allocation = overrides || baseAllocation;

  // Compute blended return
  const blendedReturn = useMemo(() => {
    return allocation.reduce((sum, a) => sum + (a.allocationPct / 100) * a.postTaxRate, 0);
  }, [allocation]);

  // KPI exposures
  const equityExposure = useMemo(() =>
    allocation.filter(a => a.cat === "Equity").reduce((s, a) => s + a.allocationPct, 0), [allocation]);
  const debtGovtExposure = useMemo(() =>
    allocation.filter(a => a.cat === "Government" || a.cat === "Debt" || a.cat === "Equity-Debt").reduce((s, a) => s + a.allocationPct, 0), [allocation]);
  const altExposure = useMemo(() =>
    allocation.filter(a => a.cat === "Commodity" || a.cat === "Alternative").reduce((s, a) => s + a.allocationPct, 0), [allocation]);
  
  const rationaleText = useMemo(() => {
    if (riskView === 'Aggressive Growth') return "Focuses on growing your money as much as possible over the long term. This uses high company shares (equity) concentration to beat inflation, with more short-term ups and downs.";
    if (riskView === 'Safe & Stable') return "Prioritizes keeping your money safe and getting steady returns. This relies heavily on government-backed and safer debt savings, with minimal exposure to company shares.";
    return "Combines safety and growth. This spreads your money across different categories to capture stock market growth while protecting your capital with safe assets.";
  }, [riskView]);

  const handleSliderChange = (id, newPct) => {
    setWarning(null);
    const current = [...(overrides || baseAllocation)];
    const idx = current.findIndex(a => a.id === id);
    if (idx < 0) return;

    const item = current[idx];
    const capped = Math.min(newPct, item.maxPct || 40);
    const floored = Math.max(capped, 5);
    const diff = floored - item.allocationPct;

    if (Math.abs(diff) < 0.5) return;

    // Check if redistribution is possible
    const others = current.filter((_, i) => i !== idx);
    const totalOtherFree = others.reduce((s, a) => {
      if (diff > 0) return s + (a.allocationPct - 5); // can shrink
      return s + ((a.maxPct || 40) - a.allocationPct); // can grow
    }, 0);

    if (diff > 0 && totalOtherFree < diff) {
      setWarning(`Cannot increase ${item.abbr || item.name} further without violating concentration limits.`);
      return;
    }

    // Redistribute proportionally
    const otherTotal = others.reduce((s, a) => s + a.allocationPct, 0);
    const updated = current.map(a => {
      if (a.id === id) return { ...a, allocationPct: floored, monthlyAmount: Math.round((floored / 100) * savings / 100) * 100 };
      const proportion = otherTotal > 0 ? a.allocationPct / otherTotal : 1 / others.length;
      let newVal = a.allocationPct - diff * proportion;
      newVal = Math.max(5, Math.min(newVal, a.maxPct || 40));
      return { ...a, allocationPct: parseFloat(newVal.toFixed(1)), monthlyAmount: Math.round((newVal / 100) * savings / 100) * 100 };
    });

    // Renormalize
    const totalPct = updated.reduce((s, a) => s + a.allocationPct, 0);
    if (totalPct > 0) updated.forEach(a => {
      a.allocationPct = parseFloat(((a.allocationPct / totalPct) * 100).toFixed(1));
      a.monthlyAmount = Math.round((a.allocationPct / 100) * savings / 100) * 100;
    });

    setOverrides(updated);
  };

  const resetOverrides = () => { setOverrides(null); setWarning(null); };

  const [hoveredSlice, setHoveredSlice] = useState(null);

  if (!allocation || allocation.length === 0) {
    return (
      <motion.div className="ap-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Target size={28} color="#f43f5e" /> Portfolio Allocation Planner
        </h1>
        <div className="ap-empty">
          <div style={{ fontSize: '3rem', color: '#0ea5e9' }}><PieChartIcon size={64} /></div>
          <h3>Nothing to show here</h3>
          <p>Adjust your profile settings to unlock investment options.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="ap-page">
      <motion.div
        style={{ textAlign: 'center', marginBottom: 8 }}
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="ap-page-badge">
          <PieChartIcon size={11} />
          AI-Optimized <JargonTooltip term="Asset Allocation">Asset Mix</JargonTooltip>
        </div>
        <h1 className="ap-page-title">Decide Your Investment Mix (<JargonTooltip term="Asset Allocation">Allocation Planner</JargonTooltip>)</h1>
        <p className="ap-page-subtitle">
          Strategic distribution for your ₹{savings.toLocaleString("en-IN")}/month <JargonTooltip term="SIP">SIP</JargonTooltip> to maximize returns while managing risk.
        </p>

        {/* Risk Presets Segmented Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <div className="risk-presets-segmented" style={{ 
            display: 'inline-flex', 
            background: 'rgba(15, 23, 42, 0.6)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: 4, 
            borderRadius: 14,
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)'
          }}>
            {RISK_PRESETS.map(preset => {
              const isActive = riskView === preset;
              return (
                <button
                  key={preset}
                  onClick={() => { setRiskView(preset); setOverrides(null); }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: isActive ? 'linear-gradient(135deg, #0ea5e9, #38bdf8)' : 'transparent',
                    color: isActive ? '#fff' : '#94a3b8',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isActive ? '0 4px 15px rgba(14, 165, 233, 0.4)' : 'none'
                  }}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ 
          maxWidth: 600, margin: '14px auto 0', fontSize: '0.85rem', color: '#cbd5e1', 
          background: 'rgba(15,23,42,0.6)', padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <strong>Rationale:</strong> {rationaleText}
        </div>
      </motion.div>
      <div className="ap-header-divider" />

      <div className="ap-main-grid">
        {/* LEFT: Donut */}
        <motion.div 
          className="ap-donut-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ width: '100%', height: 380, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={allocation} 
                  dataKey="allocationPct" 
                  cx="50%" cy="50%"
                  innerRadius={115} outerRadius={165} 
                  paddingAngle={3} 
                  stroke="rgba(15, 23, 42, 0.8)" 
                  strokeWidth={3}
                  onMouseEnter={(_, index) => setHoveredSlice(allocation[index])}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  {allocation.map((a, i) => <Cell key={i} fill={a.color} style={{ filter: `drop-shadow(0px 0px 8px ${a.color}80)`, cursor: 'pointer', transition: 'all 0.3s ease' }} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="ap-donut-center" style={{ pointerEvents: 'none' }}>
              {hoveredSlice ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4, color: '#fff', fontSize: '1.1rem', textAlign: 'center' }}>
                    {hoveredSlice.name}
                  </div>
                  <div style={{ color: hoveredSlice.color, fontSize: '1.8rem', fontWeight: 900, textAlign: 'center', textShadow: `0 0 15px ${hoveredSlice.color}80` }}>
                    {hoveredSlice.allocationPct.toFixed(1)}%
                  </div>
                  <div style={{ color: '#94a3b8', marginTop: 4, textAlign: 'center', fontWeight: 600 }}>
                    ₹{hoveredSlice.monthlyAmount?.toLocaleString("en-IN")}/mo
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  <div className="donut-value-text">
                    ₹{savings.toLocaleString("en-IN")}
                  </div>
                  <div className="donut-sub-text">PER MONTH</div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Allocation Cards */}
        <div className="ap-cards-panel">
          {allocation.map((a, index) => (
            <motion.div 
              key={a.id} 
              className="ap-alloc-card" 
              style={{ borderLeftColor: a.color, '--hover-color': a.color }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (index * 0.1) }}
            >
              <div className="ap-card-top">
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ 
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${a.color}20, ${a.color}05)`,
                    color: a.color, border: `1px solid ${a.color}30`,
                    boxShadow: `inset 0 0 10px ${a.color}10`
                  }}>
                    {getCategoryIcon(a.cat || a.name)}
                  </div>
                  <div>
                    <div className="ap-card-name" style={{ textShadow: `0 0 10px ${a.color}40` }}>{a.abbr || a.name}</div>
                    <div className="ap-card-fullname">{a.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                      {CATEGORY_EXPLANATIONS[a.cat] || CATEGORY_EXPLANATIONS[a.name] || a.cat || ''}
                    </div>
                  </div>
                </div>
                <div className="ap-card-pct" style={{ color: a.color, textShadow: `0 0 15px ${a.color}60` }}>
                  {a.allocationPct.toFixed(1)}%
                </div>
              </div>
              <div className="ap-card-details">
                <span>₹{a.monthlyAmount?.toLocaleString("en-IN")}/mo</span>
                <span>After Tax: {a.postTaxRate}%</span>
                <span className="ap-risk-badge" style={{ color: RISK_COLORS[a.riskLabel] || '#f59e0b' }}>
                  {a.riskLabel}
                </span>
              </div>
              {a.concentrationBadge && (
                <div className="ap-conc-badge">{a.concentrationBadge}</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Blended Return */}
      <motion.div 
        className="ap-blended-bar"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="ap-blended-label">Your Combined Return (After-Tax)</div>
        <div className="ap-blended-value">{blendedReturn.toFixed(1)}%</div>
        <div className="ap-blended-sub">The estimated average return of your combined investments after accounting for taxes.</div>
      </motion.div>

      {/* KPI Cards */}
      <div className="ap-kpi-row">
        <div className="ap-kpi-card">
          <div className="ap-kpi-label">Stock Market (<JargonTooltip term="ELSS">Equity</JargonTooltip>) Exposure</div>
          <div className="ap-kpi-value" style={{ color: '#a855f7' }}>{equityExposure.toFixed(0)}%</div>
        </div>
        <div className="ap-kpi-card">
          <div className="ap-kpi-label">Safer / Govt (<JargonTooltip term="Debt Fund">Debt</JargonTooltip>) Exposure</div>
          <div className="ap-kpi-value" style={{ color: '#3b82f6' }}>{debtGovtExposure.toFixed(0)}%</div>
        </div>
        <div className="ap-kpi-card">
          <div className="ap-kpi-label">Gold & Other (Alternative) Exposure</div>
          <div className="ap-kpi-value" style={{ color: '#eab308' }}>{altExposure.toFixed(0)}%</div>
        </div>
      </div>

      {/* Toggle Manual Override */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <button
          onClick={() => setShowManualAdjust(!showManualAdjust)}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 20px',
            color: '#0ea5e9',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showManualAdjust ? 'Hide Manual Tuning Sliders' : 'Adjust Investment Mix Manually (Advanced)'}
        </button>
      </div>

      {/* Manual Override Sliders */}
      {showManualAdjust && (
        <div className="ap-slider-section">
          <div className="ap-slider-header">
            <h3>Adjust Investment Mix Manually</h3>
            {overrides && (
              <button className="ap-reset-btn" onClick={resetOverrides}>Reset to Recommended Mix</button>
            )}
          </div>

          {warning && (
            <div className="ap-warning">{warning}</div>
          )}

          {allocation.map(a => {
            const rawPct = ((a.allocationPct - 5) / ((a.maxPct || 40) - 5));
            const pctDecimal = Math.max(0, Math.min(1, rawPct));
            const pctVal = pctDecimal * 100;
            return (
              <div key={a.id} className="ap-slider-row">
                <div className="ap-slider-label">
                  <div style={{ 
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(135deg, ${a.color}20, ${a.color}05)`,
                      color: a.color, border: `1px solid ${a.color}30`,
                      boxShadow: `inset 0 0 10px ${a.color}10`
                    }}>
                      {getCategoryIcon(a.cat || a.name)}
                  </div>
                  <span style={{ textShadow: `0 0 10px ${a.color}40`, fontWeight: 800 }}>{a.abbr || a.name}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max={a.maxPct || 40}
                  step="1"
                  value={Math.round(a.allocationPct)}
                  onChange={e => handleSliderChange(a.id, Number(e.target.value))}
                  className="ap-range"
                  style={{ 
                    '--ap-pct': `${pctVal}%`,
                    '--ap-pct-decimal': pctDecimal,
                    '--ap-track-color': a.color || '#0ea5e9'
                  }}
                />
                <div className="ap-slider-values">
                  <div className="ap-slider-badge-pct" style={{ backgroundColor: `${a.color}20`, color: a.color, border: `1px solid ${a.color}40` }}>
                    {a.allocationPct.toFixed(0)}%
                  </div>
                  <div className="ap-slider-badge-amt">
                    ₹{a.monthlyAmount?.toLocaleString("en-IN")}/mo
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllocationPlanner;
