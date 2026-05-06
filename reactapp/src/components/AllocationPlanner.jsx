import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Target, PieChart as PieChartIcon, TrendingUp, Landmark, Briefcase, Wallet } from 'lucide-react';
import { computeAllocation } from '../recommendationEngine';
import { getEligibleInvestments } from '../recommendationEngine';
import { CONCENTRATION_CAPS, RISK_COLORS } from '../investmentDatabase';
import { formatINR } from '../utils/indianNumberFormat';
import './AllocationPlanner.css';

const getCategoryIcon = (cat) => {
  if (!cat) return <Wallet size={20} />;
  if (cat.includes('Equity') || cat.includes('MF') || cat.includes('ETF')) return <TrendingUp size={20} />;
  if (cat.includes('Debt') || cat.includes('Govt') || cat.includes('Bond') || cat.includes('NPS')) return <Landmark size={20} />;
  if (cat.includes('Gold') || cat.includes('Commodity')) return <Briefcase size={20} />;
  return <Wallet size={20} />;
};

const AllocationPlanner = ({ profile }) => {
  const savings = Number(profile?.monthly_savings) || 12000;
  const eligible = useMemo(() => getEligibleInvestments(profile || {}), [profile]);
  const baseAllocation = useMemo(() => computeAllocation(profile || {}, eligible), [profile, eligible]);

  const [overrides, setOverrides] = useState(null);
  const [warning, setWarning] = useState(null);

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
    allocation.filter(a => a.cat === "Commodity").reduce((s, a) => s + a.allocationPct, 0), [allocation]);

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
          AI-Optimized Allocation
        </div>
        <h1 className="ap-page-title">Portfolio Allocation Planner</h1>
        <p className="ap-page-subtitle">
          Suggested split for ₹{savings.toLocaleString("en-IN")}/month across your top-ranked eligible instruments.
        </p>
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
                  </div>
                </div>
                <div className="ap-card-pct" style={{ color: a.color, textShadow: `0 0 15px ${a.color}60` }}>
                  {a.allocationPct.toFixed(1)}%
                </div>
              </div>
              <div className="ap-card-details">
                <span>₹{a.monthlyAmount?.toLocaleString("en-IN")}/mo</span>
                <span>Post-tax: {a.postTaxRate}%</span>
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
        <div className="ap-blended-label">Blended Portfolio Post-Tax Return</div>
        <div className="ap-blended-value">{blendedReturn.toFixed(1)}%</div>
        <div className="ap-blended-sub">Estimated blended post-tax return across your portfolio</div>
      </motion.div>

      {/* KPI Cards */}
      <div className="ap-kpi-row">
        <div className="ap-kpi-card">
          <div className="ap-kpi-label">Equity Exposure</div>
          <div className="ap-kpi-value" style={{ color: '#a855f7' }}>{equityExposure.toFixed(0)}%</div>
        </div>
        <div className="ap-kpi-card">
          <div className="ap-kpi-label">Debt/Govt Exposure</div>
          <div className="ap-kpi-value" style={{ color: '#3b82f6' }}>{debtGovtExposure.toFixed(0)}%</div>
        </div>
        <div className="ap-kpi-card">
          <div className="ap-kpi-label">Alternative Exposure</div>
          <div className="ap-kpi-value" style={{ color: '#eab308' }}>{altExposure.toFixed(0)}%</div>
        </div>
      </div>

      {/* Manual Override Sliders */}
      <div className="ap-slider-section">
        <div className="ap-slider-header">
          <h3>Adjust Allocation Manually</h3>
          {overrides && (
            <button className="ap-reset-btn" onClick={resetOverrides}>Reset to AI Suggestion</button>
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
    </div>
  );
};

export default AllocationPlanner;
