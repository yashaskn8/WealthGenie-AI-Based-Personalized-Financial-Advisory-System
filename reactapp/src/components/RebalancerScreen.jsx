import React, { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatINR } from '../utils/indianNumberFormat';
import './RebalancerScreen.css';

const RISK_WEIGHTS = {
  'Very Low': 5, 'Low': 20, 'Medium-Low': 35, 'Medium': 50, 'High': 80, 'Very High': 95
};

const RebalancerScreen = ({ profile, recommendations, onSave }) => {
  const totalSavings = profile?.monthly_savings || 12000;

  const [allocations, setAllocations] = useState(() => {
    const allocs = {};
    recommendations.forEach(inv => {
      allocs[inv.id] = ((inv.monthly_allocation / totalSavings) * 100);
    });
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
      // If otherTotal is 0 but we are decreasing the current slider, distribute evenly
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
    if (score < 25) return '#22c55e';
    if (score < 50) return '#84cc16';
    if (score < 75) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="rebalancer-page">
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BarChart3 size={28} color="#0ea5e9" /> Portfolio Rebalancer
      </h1>
      <p className="page-subtitle">Drag sliders to adjust allocations. Total automatically stays at 100%.</p>

      {/* Risk & Return Indicators */}
      <div className="rebal-indicators">
        <div className="rebal-indicator-card">
          <span className="rebal-ind-label">Portfolio Risk Score</span>
          <div className="rebal-risk-meter">
            <div className="rebal-risk-track">
              <div className="rebal-risk-fill" style={{ width: `${portfolioRiskScore}%`, background: getRiskColor(portfolioRiskScore) }} />
            </div>
            <span className="rebal-risk-value" style={{ color: getRiskColor(portfolioRiskScore) }}>
              {portfolioRiskScore.toFixed(0)} / 100
            </span>
          </div>
          <div className="rebal-risk-labels">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>
        <div className="rebal-indicator-card">
          <span className="rebal-ind-label">Blended Expected Return</span>
          <span className="rebal-return-value">{blendedReturn.toFixed(1)}% p.a.</span>
        </div>
        <div className="rebal-indicator-card">
          <span className="rebal-ind-label">Monthly Investment</span>
          <span className="rebal-return-value">{formatINR(totalSavings)}</span>
        </div>
      </div>

      {/* Allocation Sliders */}
      <div className="rebal-sliders">
        {recommendations.map(inv => {
          const pct = allocations[inv.id] || 0;
          const amount = Math.round((pct / 100) * totalSavings / 100) * 100;
          return (
            <div key={inv.id} className="rebal-slider-row">
              <div className="rebal-slider-info">
                <span className="rebal-slider-name">{inv.name}</span>
                <span className="rebal-slider-badge">{inv.risk_level}</span>
              </div>
              <div className="rebal-slider-control">
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={pct}
                  onChange={e => handleSliderChange(inv.id, Number(e.target.value))}
                  className="rebal-range"
                  style={{ '--rebal-pct': `${(pct / 60) * 100}%` }}
                />
                <div className="rebal-slider-values">
                  <span>{pct.toFixed(0)}%</span>
                  <span style={{ color: '#0ea5e9' }}>{formatINR(amount)}/mo</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rebal-actions">
        <button className="btn-primary" onClick={handleSave}>Save Rebalanced Plan</button>
      </div>
    </div>
  );
};

export default RebalancerScreen;
