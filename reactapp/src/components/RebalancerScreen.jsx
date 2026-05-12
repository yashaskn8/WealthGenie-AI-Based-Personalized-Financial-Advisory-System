import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Sliders, Activity, IndianRupee, TrendingUp, ShieldAlert, Layers } from 'lucide-react';
import { formatINR } from '../utils/indianNumberFormat';
import './RebalancerScreen.css';

const RISK_WEIGHTS = {
  'Very Low': 5, 'Low': 20, 'Low-Medium': 30, 'Medium-Low': 35, 'Medium': 50, 'High': 80, 'Very High': 95
};

const RISK_COLORS = {
  'Very Low': '#10b981', 'Low': '#34d399', 'Low-Medium': '#a3e635', 'Medium-Low': '#fbbf24', 
  'Medium': '#f59e0b', 'High': '#ef4444', 'Very High': '#dc2626'
};

const INSTRUMENT_ICONS = {
  'ppf': 'PP', 'scss': 'SC', 'sukanya': 'SS', 'rbi_bonds': 'RB',
  'fd': 'FD', 'debt_mf': 'DM', 'nps': 'NP', 'hybrid_mf': 'HM',
  'index_mf': 'IX', 'gold_etf': 'AU', 'elss': 'EL', 'nifty_etf': 'NF',
  'midcap_mf': 'MC', 'smallcap_mf': 'SM', 'direct_equity': 'EQ',
  'liquid_mf': 'LQ', 'sgb': 'SG', 'pmvvy': 'PM'
};

const buildAllocations = (recs, savings) => {
  const allocs = {};
  let sum = 0;
  recs.forEach(inv => {
    const pct = (inv.monthly_allocation / savings) * 100;
    allocs[inv.id] = pct;
    sum += pct;
  });
  if (sum > 0 && Math.abs(sum - 100) > 0.01) {
    Object.keys(allocs).forEach(k => {
      allocs[k] = (allocs[k] / sum) * 100;
    });
  }
  return allocs;
};

const RebalancerScreen = ({ profile, recommendations, onSave }) => {
  const totalSavings = profile?.monthly_savings || 12000;

  const [allocations, setAllocations] = useState(() => buildAllocations(recommendations, totalSavings));

  // Sync allocations when recommendations or savings change
  useEffect(() => {
    setAllocations(buildAllocations(recommendations, totalSavings));
  }, [recommendations, totalSavings]);

  const handleSliderChange = (id, newPct) => {
    const oldPct = allocations[id] || 0;
    const diff = newPct - oldPct;
    const otherIds = Object.keys(allocations).filter(k => k !== String(id));
    const otherTotal = otherIds.reduce((s, k) => s + allocations[k], 0);

    const newAllocs = { ...allocations, [id]: newPct };
    
    if (otherTotal > 0) {
      otherIds.forEach(k => {
        const proportion = allocations[k] / otherTotal;
        newAllocs[k] = Math.max(0, allocations[k] - diff * proportion);
      });
    } else if (diff < 0 && otherIds.length > 0) {
      const split = Math.abs(diff) / otherIds.length;
      otherIds.forEach(k => {
        newAllocs[k] = split;
      });
    }

    // Normalize strictly to 100% to avoid float drift explosion
    const total = Object.values(newAllocs).reduce((a, b) => a + b, 0);
    if (total > 0 && Math.abs(total - 100) > 0.01) {
      Object.keys(newAllocs).forEach(k => {
        newAllocs[k] = (newAllocs[k] / total) * 100;
      });
    }

    setAllocations(newAllocs);
  };

  // Portfolio risk score (0-100)
  const portfolioRiskScore = useMemo(() => {
    let weightedScore = 0;
    let totalPct = 0;
    recommendations.forEach(inv => {
      const pct = allocations[inv.id] || 0;
      weightedScore += pct * (RISK_WEIGHTS[inv.risk_level] || 50);
      totalPct += pct;
    });
    return totalPct > 0 ? (weightedScore / totalPct) : 50;
  }, [allocations, recommendations]);

  // Blended return
  const blendedReturn = useMemo(() => {
    let weightedReturn = 0;
    let totalPct = 0;
    recommendations.forEach(inv => {
      const pct = allocations[inv.id] || 0;
      const avgReturn = (inv.expected_return_min + inv.expected_return_max) / 2;
      weightedReturn += pct * avgReturn;
      totalPct += pct;
    });
    return totalPct > 0 ? (weightedReturn / totalPct) : 0;
  }, [allocations, recommendations]);

  const handleSave = () => {
    const updated = recommendations.map(inv => ({
      ...inv,
      monthly_allocation: Math.round((allocations[inv.id] / 100) * totalSavings / 100) * 100
    }));
    if (onSave) onSave(updated);
  };

  const getRiskColor = (score) => {
    if (score < 25) return '#10b981';
    if (score < 50) return '#84cc16';
    if (score < 75) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskLabel = (score) => {
    if (score < 20) return 'Very Conservative';
    if (score < 35) return 'Conservative';
    if (score < 50) return 'Moderate';
    if (score < 70) return 'Growth';
    return 'Aggressive';
  };

  const currentRiskColor = getRiskColor(portfolioRiskScore);

  return (
    <motion.div 
      className="rebalancer-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="ambient-background">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
      </div>

      {/* ── Header ──────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
      >
        <div className="page-header-badge">
          <Sliders size={12} />
          Asset Allocation Engine
        </div>
        <h1 className="page-title">
          Portfolio Rebalancer
        </h1>
        <p className="page-subtitle">
          Fine-tune your asset allocations. The engine automatically keeps your total balanced at 100%.
        </p>
      </motion.div>

      <div className="header-divider" />

      {/* ── KPI Cards ───────────────────────── */}
      <div className="rebal-indicators">
        {/* Risk Score Card */}
        <motion.div 
          className="rebal-indicator-card premium-glass risk-card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring' }}
          style={{ '--risk-color': currentRiskColor }}
        >
          <div className="card-accent-line" style={{ background: `linear-gradient(90deg, transparent, ${currentRiskColor}, transparent)` }} />
          <div className="indicator-header">
            <Activity size={16} color={currentRiskColor} />
            <span className="rebal-ind-label">Portfolio Risk Score</span>
          </div>
          
          <div className="rebal-risk-meter">
            <div className="rebal-risk-track">
              <div 
                className="rebal-risk-fill" 
                style={{ 
                  width: `${portfolioRiskScore}%`, 
                  background: `linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)`,
                  backgroundSize: `${portfolioRiskScore > 0 ? (100 / portfolioRiskScore) * 100 : 100}% 100%`,
                  transition: 'width 0.4s ease'
                }} 
              />
              <div className="rebal-risk-thumb" style={{ left: `${portfolioRiskScore}%`, background: currentRiskColor }}></div>
            </div>
            <span className="rebal-risk-value" style={{ color: currentRiskColor }}>
              {portfolioRiskScore.toFixed(0)} <span className="risk-max">/ 100</span>
            </span>
          </div>
          <div className="rebal-risk-labels">
            <span>Conservative</span>
            <span>Balanced</span>
            <span>Aggressive</span>
          </div>
        </motion.div>

        {/* Expected Return Card */}
        <motion.div 
          className="rebal-indicator-card premium-glass"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <div className="card-accent-line" style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)' }} />
          <div className="indicator-header">
            <TrendingUp size={16} color="#8b5cf6" />
            <span className="rebal-ind-label">Blended Return</span>
          </div>
          <span className="rebal-return-value text-gradient-primary">
            {blendedReturn.toFixed(1)}% <span className="rebal-return-suffix">p.a.</span>
          </span>
          <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 6, fontWeight: 600, position: 'relative', zIndex: 2 }}>
            Weighted avg. across all instruments
          </div>
          <div className="card-glow-bg purple-glow"></div>
        </motion.div>

        {/* Monthly Investment Card */}
        <motion.div 
          className="rebal-indicator-card premium-glass"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring' }}
        >
          <div className="card-accent-line" style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)' }} />
          <div className="indicator-header">
            <IndianRupee size={16} color="#38bdf8" />
            <span className="rebal-ind-label">Total Monthly</span>
          </div>
          <span className="rebal-return-value" style={{ color: '#fff' }}>
            {formatINR(totalSavings)}
          </span>
          <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 6, fontWeight: 600, position: 'relative', zIndex: 2 }}>
            Based on monthly savings
          </div>
          <div className="card-glow-bg cyan-glow"></div>
        </motion.div>
      </div>

      {/* ── Visual Allocation Bar ───────────── */}
      <div className="allocation-summary-bar">
        {recommendations.map((inv) => {
          const pct = allocations[inv.id] || 0;
          const color = RISK_COLORS[inv.risk_level] || '#38bdf8';
          return (
            <div
              key={inv.id}
              className="bar-segment"
              style={{ width: `${pct}%`, background: color }}
              title={`${inv.name}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* ── Section Header ──────────────────── */}
      <div className="section-header">
        <div className="section-header-icon">
          <Layers size={16} color="#38bdf8" />
        </div>
        <div className="section-header-text">
          <h3>Instrument Allocations</h3>
          <span>Drag sliders to rebalance · {recommendations.length} instruments</span>
        </div>
      </div>

      {/* ── Allocation Sliders ──────────────── */}
      <div className="rebal-sliders">
        <AnimatePresence>
          {recommendations.map((inv, index) => {
            const pct = allocations[inv.id] || 0;
            const amount = Math.round((pct / 100) * totalSavings / 100) * 100;
            const badgeColor = RISK_COLORS[inv.risk_level] || '#0ea5e9';
            const icon = INSTRUMENT_ICONS[inv.id] || inv.name?.substring(0,2).toUpperCase() || 'IN';

            return (
              <motion.div 
                key={inv.id} 
                className="rebal-slider-row premium-glass"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (index * 0.04), type: 'spring' }}
                whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
                style={{ '--row-color': badgeColor }}
              >
                <div className="row-glow-bar" style={{ background: badgeColor }}></div>
                
                {/* Left: Instrument Info */}
                <div className="rebal-slider-info">
                  <div 
                    className="instrument-icon-wrap"
                    style={{ 
                      background: `linear-gradient(135deg, ${badgeColor}18, ${badgeColor}08)`,
                      borderColor: `${badgeColor}30`,
                      boxShadow: `0 4px 14px ${badgeColor}18, inset 0 1px 2px rgba(255,255,255,0.06)`
                    }}
                  >
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px',
                      color: badgeColor, fontFamily: 'Inter, monospace'
                    }}>{icon}</span>
                  </div>
                  <div className="instrument-text">
                    <span className="rebal-slider-name">{inv.name}</span>
                    <div className="rebal-slider-meta">
                      <span 
                        className="rebal-slider-badge" 
                        style={{ 
                          color: badgeColor, 
                          borderColor: `${badgeColor}35`,
                          background: `${badgeColor}10`
                        }}
                      >
                        <ShieldAlert size={9} style={{ marginRight: 4 }} />
                        {inv.risk_level}
                      </span>
                      <span className="rebal-slider-return">{inv.expected_return_min}% – {inv.expected_return_max}% p.a.</span>
                    </div>
                  </div>
                </div>

                {/* Right: Slider Control */}
                <div className="rebal-slider-control">
                  <div className="rebal-slider-values-top">
                    <span className="pct-value" style={{ color: badgeColor }}>{pct.toFixed(1)}%</span>
                    <span className="amount-value">{formatINR(amount)}<span className="mo-suffix">/mo</span></span>
                  </div>
                  
                  <div className="range-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={pct}
                      onChange={e => handleSliderChange(inv.id, Number(e.target.value))}
                      className="rebal-range"
                      style={{ 
                        '--rebal-pct': `${pct}%`,
                        '--thumb-color': badgeColor 
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── CTA ─────────────────────────────── */}
      <motion.div 
        className="rebal-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button className="btn-primary-glow" onClick={handleSave}>
          Confirm & Save Portfolio
        </button>
      </motion.div>
    </motion.div>
  );
};

export default RebalancerScreen;
