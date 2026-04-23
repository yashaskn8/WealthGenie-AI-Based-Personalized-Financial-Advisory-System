import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { computeAllocation } from '../recommendationEngine';
import { getEligibleInvestments } from '../recommendationEngine';
import { CONCENTRATION_CAPS, RISK_COLORS } from '../investmentDatabase';
import { formatINR } from '../utils/indianNumberFormat';
import './AllocationPlanner.css';

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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="ap-tooltip">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
          <div>{d.allocationPct.toFixed(1)}%</div>
          <div>₹{d.monthlyAmount?.toLocaleString("en-IN")}/mo</div>
        </div>
      );
    }
    return null;
  };

  if (!allocation || allocation.length === 0) {
    return (
      <div className="ap-page">
        <h1 className="page-title">🎯 Portfolio Allocation Planner</h1>
        <div className="ap-empty">
          <div style={{ fontSize: '3rem' }}>📊</div>
          <h3>Nothing to show here</h3>
          <p>Adjust your profile settings to unlock investment options.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-page">
      <h1 className="page-title">🎯 Portfolio Allocation Planner</h1>
      <p className="page-subtitle">
        Suggested split for ₹{savings.toLocaleString("en-IN")}/month across your top-ranked eligible instruments.
      </p>

      <div className="ap-main-grid">
        {/* LEFT: Donut */}
        <div className="ap-donut-panel">
          <div style={{ width: '100%', height: 320, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={allocation} dataKey="allocationPct" cx="50%" cy="50%"
                  innerRadius={75} outerRadius={130} paddingAngle={2} stroke="#0a0e17" strokeWidth={2}>
                  {allocation.map((a, i) => <Cell key={i} fill={a.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="ap-donut-center">
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                ₹{savings.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>per month</div>
            </div>
          </div>
        </div>

        {/* RIGHT: Allocation Cards */}
        <div className="ap-cards-panel">
          {allocation.map(a => (
            <div key={a.id} className="ap-alloc-card" style={{ borderLeftColor: a.color }}>
              <div className="ap-card-top">
                <div>
                  <div className="ap-card-name">{a.abbr || a.name}</div>
                  <div className="ap-card-fullname">{a.name}</div>
                </div>
                <div className="ap-card-pct">{a.allocationPct.toFixed(1)}%</div>
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
            </div>
          ))}
        </div>
      </div>

      {/* Blended Return */}
      <div className="ap-blended-bar">
        <div className="ap-blended-label">Blended Portfolio Post-Tax Return</div>
        <div className="ap-blended-value">{blendedReturn.toFixed(1)}%</div>
        <div className="ap-blended-sub">Estimated blended post-tax return across your portfolio</div>
      </div>

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

        {allocation.map(a => (
          <div key={a.id} className="ap-slider-row">
            <div className="ap-slider-label">
              <span style={{ color: a.color, fontWeight: 700 }}>●</span>
              <span>{a.abbr || a.name}</span>
            </div>
            <input
              type="range"
              min="5"
              max={a.maxPct || 40}
              step="1"
              value={Math.round(a.allocationPct)}
              onChange={e => handleSliderChange(a.id, Number(e.target.value))}
              className="ap-range"
              style={{ '--ap-pct': `${((a.allocationPct - 5) / ((a.maxPct || 40) - 5)) * 100}%` }}
            />
            <div className="ap-slider-values">
              <span>{a.allocationPct.toFixed(0)}%</span>
              <span style={{ color: '#0ea5e9' }}>₹{a.monthlyAmount?.toLocaleString("en-IN")}/mo</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllocationPlanner;
