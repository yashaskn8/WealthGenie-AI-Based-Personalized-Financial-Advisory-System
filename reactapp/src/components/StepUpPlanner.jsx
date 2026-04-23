import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatINR, formatCompactINR } from '../utils/indianNumberFormat';
import { calculateSIPFutureValue, calculateStepUpSIPValue, getStepUpProjectionData } from '../utils/sipCalculator';
import './StepUpPlanner.css';

const StepUpPlanner = ({ profile }) => {
  const [baseSIP, setBaseSIP] = useState(profile?.monthly_savings || 12000);
  const [stepUpPercent, setStepUpPercent] = useState(10);
  const [years, setYears] = useState(profile?.investment_horizon || 15);
  const [returnRate, setReturnRate] = useState(12);

  const projections = useMemo(() => {
    return getStepUpProjectionData(baseSIP, returnRate, years, stepUpPercent);
  }, [baseSIP, returnRate, years, stepUpPercent]);

  const flatFinal = projections.flatData[projections.flatData.length - 1]?.value || 0;
  const stepUpFinal = projections.stepUpData[projections.stepUpData.length - 1]?.value || 0;
  const flatInvested = projections.flatData[projections.flatData.length - 1]?.invested || 0;
  const stepUpInvested = projections.stepUpData[projections.stepUpData.length - 1]?.invested || 0;
  const additionalCorpus = stepUpFinal - flatFinal;

  // Combined chart data
  const chartData = useMemo(() => {
    return projections.flatData.map((item, i) => ({
      year: item.year,
      flatSIP: Math.round(item.value),
      stepUpSIP: Math.round(projections.stepUpData[i].value),
    }));
  }, [projections]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="sup-tooltip">
          <p className="sup-tooltip-label">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, fontWeight: 600 }}>
              {p.name}: {formatINR(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="stepup-page">
      <h1 className="page-title">📈 SIP Step-Up Planner</h1>
      <p className="page-subtitle">See the power of increasing your SIP by a small percentage annually</p>

      {/* Controls */}
      <div className="sup-controls">
        <div className="sup-control-group">
          <label>Base Monthly SIP</label>
          <input type="number" value={baseSIP} onChange={e => setBaseSIP(Number(e.target.value))} className="sup-input" />
        </div>
        <div className="sup-control-group">
          <label>Annual Step-Up (%)</label>
          <input type="number" value={stepUpPercent} onChange={e => setStepUpPercent(Number(e.target.value))} min="0" max="50" className="sup-input" />
        </div>
        <div className="sup-control-group">
          <label>Investment Horizon (Years)</label>
          <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min="1" max="40" className="sup-input" />
        </div>
        <div className="sup-control-group">
          <label>Expected Return (%)</label>
          <input type="number" value={returnRate} onChange={e => setReturnRate(Number(e.target.value))} min="1" max="30" className="sup-input" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="sup-metrics">
        <div className="sup-metric-card">
          <span className="sup-metric-label">Flat SIP Corpus</span>
          <span className="sup-metric-value">{formatINR(flatFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatINR(flatInvested)}</span>
        </div>
        <div className="sup-metric-card sup-metric-card--highlight">
          <span className="sup-metric-label">Step-Up SIP Corpus</span>
          <span className="sup-metric-value" style={{ color: '#8b5cf6' }}>{formatINR(stepUpFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatINR(stepUpInvested)}</span>
        </div>
        <div className="sup-metric-card">
          <span className="sup-metric-label">Additional Corpus Gained</span>
          <span className="sup-metric-value" style={{ color: '#22c55e' }}>+ {formatINR(additionalCorpus)}</span>
          <span className="sup-metric-sub">{((additionalCorpus / flatFinal) * 100).toFixed(0)}% more wealth</span>
        </div>
      </div>

      {/* Chart */}
      <div className="sup-chart-wrapper">
        <h3 style={{ marginBottom: 16 }}>Flat SIP vs Step-Up SIP Growth</h3>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <defs>
                <linearGradient id="flatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tickFormatter={formatCompactINR} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="flatSIP" name="Flat SIP" stroke="#06b6d4" fill="url(#flatGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="stepUpSIP" name="Step-Up SIP" stroke="#8b5cf6" fill="url(#stepGrad)" strokeWidth={3} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StepUpPlanner;
