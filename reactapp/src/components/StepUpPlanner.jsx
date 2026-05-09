import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Rocket, PiggyBank, ArrowUpRight, Wallet, Calendar, Target, BarChart3 } from 'lucide-react';
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
            <p key={i} style={{ color: p.color, fontWeight: 700, margin: '3px 0', fontSize: '0.85rem' }}>
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

      {/* ── Header ──────────────────────────── */}
      <motion.div
        style={{ textAlign: 'center', marginBottom: 8 }}
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="sup-page-badge">
          <TrendingUp size={11} />
          Compounding Simulator
        </div>
        <h1 className="sup-page-title">SIP Step-Up Planner</h1>
        <p className="sup-page-subtitle">
          See the exponential power of increasing your SIP by a small percentage annually
        </p>
      </motion.div>

      <div className="sup-header-divider" />

      {/* ── Controls ────────────────────────── */}
      <motion.div
        className="sup-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="sup-control-card" style={{'--card-accent': '#0ea5e9', '--card-accent-rgb': '14, 165, 233'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top">
            <div className="sup-control-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8' }}><Wallet size={15} /></div>
            <label>Base Monthly SIP</label>
          </div>
          <div className="sup-hero-value" style={{ color: '#38bdf8' }}>₹{baseSIP.toLocaleString('en-IN')}</div>
          <input
            type="range" value={baseSIP} onChange={e => setBaseSIP(Number(e.target.value))}
            min="1000" max="100000" step="1000" className="sup-slider"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((baseSIP - 1000) / 99000) * 100}%, rgba(255,255,255,0.06) ${((baseSIP - 1000) / 99000) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>₹1K</span><span>₹1L</span></div>
        </div>
        <div className="sup-control-card" style={{'--card-accent': '#a78bfa', '--card-accent-rgb': '167, 139, 250'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top">
            <div className="sup-control-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}><TrendingUp size={15} /></div>
            <label>Annual Step-Up</label>
          </div>
          <div className="sup-hero-value" style={{ color: '#a78bfa' }}>{stepUpPercent}%</div>
          <input
            type="range" value={stepUpPercent} onChange={e => setStepUpPercent(Number(e.target.value))}
            min="0" max="50" step="1" className="sup-slider sup-slider-purple"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #a78bfa 0%, #a78bfa ${(stepUpPercent / 50) * 100}%, rgba(255,255,255,0.06) ${(stepUpPercent / 50) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>0%</span><span>50%</span></div>
        </div>
        <div className="sup-control-card" style={{'--card-accent': '#0ea5e9', '--card-accent-rgb': '14, 165, 233'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top">
            <div className="sup-control-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8' }}><Calendar size={15} /></div>
            <label>Investment Horizon</label>
          </div>
          <div className="sup-hero-value" style={{ color: '#38bdf8' }}>{years} <span className="sup-hero-unit">Yrs</span></div>
          <input
            type="range" value={years} onChange={e => setYears(Number(e.target.value))}
            min="1" max="40" step="1" className="sup-slider"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((years - 1) / 39) * 100}%, rgba(255,255,255,0.06) ${((years - 1) / 39) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>1 yr</span><span>40 yrs</span></div>
        </div>
        <div className="sup-control-card" style={{'--card-accent': '#a78bfa', '--card-accent-rgb': '167, 139, 250'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top">
            <div className="sup-control-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}><Target size={15} /></div>
            <label>Expected Return</label>
          </div>
          <div className="sup-hero-value" style={{ color: '#a78bfa' }}>{returnRate}% <span className="sup-hero-unit">p.a.</span></div>
          <input
            type="range" value={returnRate} onChange={e => setReturnRate(Number(e.target.value))}
            min="1" max="30" step="0.5" className="sup-slider sup-slider-purple"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #a78bfa 0%, #a78bfa ${((returnRate - 1) / 29) * 100}%, rgba(255,255,255,0.06) ${((returnRate - 1) / 29) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>1%</span><span>30%</span></div>
        </div>
      </motion.div>

      {/* ── Key Metrics ─────────────────────── */}
      <div className="sup-metrics">
        <motion.div className="sup-metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8' }}><PiggyBank size={22} /></div>
          <span className="sup-metric-label">Flat SIP Corpus</span>
          <span className="sup-metric-value" style={{ color: '#e2e8f0' }}>{formatCompactINR(flatFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatCompactINR(flatInvested)}</span>
        </motion.div>

        <motion.div className="sup-metric-card sup-metric-card--highlight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(167, 139, 250, 0.08)', color: '#a78bfa' }}><Rocket size={22} /></div>
          <span className="sup-metric-label">Step-Up SIP Corpus</span>
          <span className="sup-metric-value" style={{ color: '#a78bfa', textShadow: '0 0 12px rgba(139,92,246,0.4)' }}>{formatCompactINR(stepUpFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatCompactINR(stepUpInvested)}</span>
        </motion.div>

        <motion.div className="sup-metric-card sup-metric-card--success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(74, 222, 128, 0.08)', color: '#4ade80' }}><ArrowUpRight size={22} /></div>
          <span className="sup-metric-label">Additional Corpus Gained</span>
          <span className="sup-metric-value" style={{ color: '#4ade80', textShadow: '0 0 12px rgba(74,222,128,0.35)' }}>+ {formatCompactINR(additionalCorpus)}</span>
          <span className="sup-metric-sub" style={{ color: '#22c55e', fontWeight: 700 }}>{additionalPercent}% more wealth</span>
        </motion.div>
      </div>

      {/* ── Chart ───────────────────────────── */}
      <motion.div
        className="sup-chart-wrapper"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <h3>Flat SIP vs Step-Up SIP Growth</h3>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 16, bottom: 16 }}>
              <defs>
                <linearGradient id="flatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="year" stroke="#94a3b8" tick={{ fill: '#546178', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tickFormatter={formatCompactINR} stroke="#94a3b8" tick={{ fill: '#546178', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontWeight: 600, fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey="flatSIP" name="Flat SIP" stroke="#0ea5e9" fill="url(#flatGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="stepUpSIP" name="Step-Up SIP" stroke="#a78bfa" fill="url(#stepGrad)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default StepUpPlanner;
