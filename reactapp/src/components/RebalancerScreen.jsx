import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Sliders, Activity, IndianRupee, TrendingUp, ShieldAlert } from 'lucide-react';
import { formatINR } from '../utils/indianNumberFormat';
import './RebalancerScreen.css';

const RISK_WEIGHTS = {
  'Very Low': 5, 'Low': 20, 'Medium-Low': 35, 'Medium': 50, 'High': 80, 'Very High': 95
};

const RISK_COLORS = {
  'Very Low': '#10b981', 'Low': '#34d399', 'Medium-Low': '#fbbf24', 
  'Medium': '#f59e0b', 'High': '#ef4444', 'Very High': '#dc2626'
};

const RebalancerScreen = ({ profile, recommendations, onSave }) => {
  const totalSavings = profile?.monthly_savings || 12000;

  const [allocations, setAllocations] = useState(() => {
    const allocs = {};
    let sum = 0;
    recommendations.forEach(inv => {
      const pct = (inv.monthly_allocation / totalSavings) * 100;
      allocs[inv.id] = pct;
      sum += pct;
    });
    
    // Auto-normalize initial state to 100% to prevent jump on first interaction
    if (sum > 0 && Math.abs(sum - 100) > 0.01) {
      Object.keys(allocs).forEach(k => {
        allocs[k] = (allocs[k] / sum) * 100;
      });
    }
    return allocs;
  });

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
    if (score < 25) return '#10b981'; // Emerald
    if (score < 50) return '#84cc16'; // Lime
    if (score < 75) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
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

      <motion.div
        className="page-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
      >
        <h1 className="page-title">
          <Sliders size={32} className="title-icon" color="#0ea5e9" /> Portfolio Rebalancer
        </h1>
        <p className="page-subtitle">
          Fine-tune your asset allocations. The engine automatically keeps your total balanced at 100%.
        </p>
      </motion.div>

      {/* Risk & Return Indicators */}
      <div className="rebal-indicators">
        {/* Risk Score Card */}
        <motion.div 
          className="rebal-indicator-card premium-glass risk-card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring' }}
          style={{ '--risk-color': currentRiskColor }}
        >
          <div className="indicator-header">
            <Activity size={18} color="#94a3b8" />
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
          <div className="indicator-header">
            <TrendingUp size={18} color="#94a3b8" />
            <span className="rebal-ind-label">Blended Return</span>
          </div>
          <span className="rebal-return-value text-gradient-primary">
            {blendedReturn.toFixed(1)}% <span className="rebal-return-suffix">p.a.</span>
          </span>
          <div className="card-glow-bg purple-glow"></div>
        </motion.div>

        {/* Monthly Investment Card */}
        <motion.div 
          className="rebal-indicator-card premium-glass"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring' }}
        >
          <div className="indicator-header">
            <IndianRupee size={18} color="#94a3b8" />
            <span className="rebal-ind-label">Total Monthly</span>
          </div>
          <span className="rebal-return-value" style={{ color: '#fff' }}>
            {formatINR(totalSavings)}
          </span>
          <div className="card-glow-bg cyan-glow"></div>
        </motion.div>
      </div>

      {/* Allocation Sliders */}
      <div className="rebal-sliders">
        <AnimatePresence>
          {recommendations.map((inv, index) => {
            const pct = allocations[inv.id] || 0;
            const amount = Math.round((pct / 100) * totalSavings / 100) * 100;
            const badgeColor = RISK_COLORS[inv.risk_level] || '#0ea5e9';

            return (
              <motion.div 
                key={inv.id} 
                className="rebal-slider-row premium-glass"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (index * 0.05), type: 'spring' }}
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                style={{ '--row-color': badgeColor }}
              >
                <div className="row-glow-bar" style={{ background: badgeColor }}></div>
                
                <div className="rebal-slider-info">
                  <span className="rebal-slider-name">{inv.name}</span>
                  <div className="rebal-slider-meta">
                    <span 
                      className="rebal-slider-badge" 
                      style={{ 
                        color: badgeColor, 
                        borderColor: `${badgeColor}40`,
                        background: `${badgeColor}15`
                      }}
                    >
                      <ShieldAlert size={10} style={{ marginRight: 4 }} />
                      {inv.risk_level} Risk
                    </span>
                    <span className="rebal-slider-return">{inv.expected_return_min}% - {inv.expected_return_max}% p.a.</span>
                  </div>
                </div>

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
