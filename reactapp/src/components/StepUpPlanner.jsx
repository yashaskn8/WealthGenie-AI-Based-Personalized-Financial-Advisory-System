import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Rocket, PiggyBank, ArrowUpRight, Wallet, Calendar, Target } from 'lucide-react';
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

  const flatFinal = Math.round(projections.flatData[projections.flatData.length - 1]?.value || 0);
  const stepUpFinal = Math.round(projections.stepUpData[projections.stepUpData.length - 1]?.value || 0);
  const flatInvested = Math.round(projections.flatData[projections.flatData.length - 1]?.invested || 0);
  const stepUpInvested = Math.round(projections.stepUpData[projections.stepUpData.length - 1]?.invested || 0);
  const additionalCorpus = stepUpFinal - flatFinal;
  const additionalPercent = flatFinal > 0 ? ((additionalCorpus / flatFinal) * 100).toFixed(0) : '0';

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
            <p key={i} style={{ color: p.color, fontWeight: 700, margin: '4px 0' }}>
              {p.name}: {formatINR(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="stepup-page" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Floating Ambient Orbs */}
      <div className="sup-bg-orb sup-bg-orb--1"></div>
      <div className="sup-bg-orb sup-bg-orb--2"></div>

      <motion.h1 
        className="page-title" 
        style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '2.4rem' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <span style={{ 
          display: 'inline-flex', 
          width: 32, height: 32, 
          background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', 
          borderRadius: 8, 
          boxShadow: '0 0 15px rgba(14, 165, 233, 0.6)' 
        }}></span> 
        SIP Step-Up Planner
      </motion.h1>
      <motion.p 
        className="page-subtitle" 
        style={{ fontSize: '1.1rem', marginBottom: '32px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        See the exponential power of increasing your SIP by a small percentage annually
      </motion.p>

      {/* Controls */}
      <motion.div 
        className="sup-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="sup-control-card">
          <div className="sup-control-header">
            <div className="sup-control-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}><Wallet size={18} /></div>
            <label>Base Monthly SIP</label>
            <div className="sup-val-box">₹{baseSIP.toLocaleString('en-IN')}</div>
          </div>
          <input 
            type="range" value={baseSIP} onChange={e => setBaseSIP(Number(e.target.value))} 
            min="1000" max="100000" step="1000" className="sup-slider" 
            style={{ background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((baseSIP - 1000) / 99000) * 100}%, rgba(255,255,255,0.08) ${((baseSIP - 1000) / 99000) * 100}%, rgba(255,255,255,0.08) 100%)` }}
          />
        </div>
        <div className="sup-control-card">
          <div className="sup-control-header">
            <div className="sup-control-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}><TrendingUp size={18} /></div>
            <label>Annual Step-Up</label>
            <div className="sup-val-box">{stepUpPercent}%</div>
          </div>
          <input 
            type="range" value={stepUpPercent} onChange={e => setStepUpPercent(Number(e.target.value))} 
            min="0" max="50" step="1" className="sup-slider sup-slider-purple" 
            style={{ background: `linear-gradient(to right, #a78bfa 0%, #a78bfa ${(stepUpPercent / 50) * 100}%, rgba(255,255,255,0.08) ${(stepUpPercent / 50) * 100}%, rgba(255,255,255,0.08) 100%)` }}
          />
        </div>
        <div className="sup-control-card">
          <div className="sup-control-header">
            <div className="sup-control-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}><Calendar size={18} /></div>
            <label>Investment Horizon</label>
            <div className="sup-val-box">{years} Years</div>
          </div>
          <input 
            type="range" value={years} onChange={e => setYears(Number(e.target.value))} 
            min="1" max="40" step="1" className="sup-slider" 
            style={{ background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((years - 1) / 39) * 100}%, rgba(255,255,255,0.08) ${((years - 1) / 39) * 100}%, rgba(255,255,255,0.08) 100%)` }}
          />
        </div>
        <div className="sup-control-card">
          <div className="sup-control-header">
            <div className="sup-control-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}><Target size={18} /></div>
            <label>Expected Return</label>
            <div className="sup-val-box">{returnRate}%</div>
          </div>
          <input 
            type="range" value={returnRate} onChange={e => setReturnRate(Number(e.target.value))} 
            min="1" max="30" step="0.5" className="sup-slider sup-slider-purple" 
            style={{ background: `linear-gradient(to right, #a78bfa 0%, #a78bfa ${((returnRate - 1) / 29) * 100}%, rgba(255,255,255,0.08) ${((returnRate - 1) / 29) * 100}%, rgba(255,255,255,0.08) 100%)` }}
          />
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="sup-metrics">
        <motion.div className="sup-metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}><PiggyBank size={24} /></div>
          <span className="sup-metric-label">Flat SIP Corpus</span>
          <span className="sup-metric-value">{formatCompactINR(flatFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatCompactINR(flatInvested)}</span>
        </motion.div>
        
        <motion.div className="sup-metric-card sup-metric-card--highlight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}><Rocket size={24} /></div>
          <span className="sup-metric-label">Step-Up SIP Corpus</span>
          <span className="sup-metric-value" style={{ color: '#a78bfa', textShadow: '0 0 15px rgba(139,92,246,0.6)' }}>{formatCompactINR(stepUpFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatCompactINR(stepUpInvested)}</span>
        </motion.div>
        
        <motion.div className="sup-metric-card sup-metric-card--success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}><ArrowUpRight size={24} /></div>
          <span className="sup-metric-label">Additional Corpus Gained</span>
          <span className="sup-metric-value" style={{ color: '#4ade80', textShadow: '0 0 15px rgba(74,222,128,0.5)' }}>+ {formatCompactINR(additionalCorpus)}</span>
          <span className="sup-metric-sub" style={{ color: '#22c55e', fontWeight: 600 }}>{additionalPercent}% more wealth</span>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div 
        className="sup-chart-wrapper"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3>Flat SIP vs Step-Up SIP Growth</h3>
        <div style={{ width: '100%', height: 450 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="flatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tickFormatter={formatCompactINR} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 20, fontWeight: 600 }} />
              <Area type="monotone" dataKey="flatSIP" name="Flat SIP" stroke="#0ea5e9" fill="url(#flatGrad)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="stepUpSIP" name="Step-Up SIP" stroke="#a78bfa" fill="url(#stepGrad)" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2, filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.8))' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default StepUpPlanner;
