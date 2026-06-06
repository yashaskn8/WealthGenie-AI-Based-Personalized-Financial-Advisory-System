import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Rocket, PiggyBank, ArrowUpRight, Wallet, Calendar, Target, HelpCircle, Sparkles } from 'lucide-react';
import { formatINR, formatCompactINR } from '../utils/indianNumberFormat';
import { getStepUpProjectionData } from '../utils/sipCalculator';
import JargonTooltip from './JargonTooltip';
import './StepUpPlanner.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="sup-tooltip" style={{
        background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: 14, padding: 14,
        boxShadow: '0 12px 28px rgba(0,0,0,0.6)'
      }}>
        <p className="sup-tooltip-label" style={{ fontWeight: 800, margin: '0 0 6px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          {label}
        </p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 700, margin: '4px 0', fontSize: '0.85rem' }}>
            {p.name}: {formatINR(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


const StepUpPlanner = ({ profile }) => {
  const [baseSIP, setBaseSIP] = useState(profile?.monthly_savings || 12000);
  const [stepUpPercent, setStepUpPercent] = useState(10);
  const [years, setYears] = useState(profile?.investment_horizon || 15);
  const [returnRate, setReturnRate] = useState(12);
  const [inflationAdjusted, setInflationAdjusted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [prevMonthlySavings, setPrevMonthlySavings] = useState(profile?.monthly_savings);
  const [prevHorizon, setPrevHorizon] = useState(profile?.investment_horizon);

  if (profile?.monthly_savings !== prevMonthlySavings || profile?.investment_horizon !== prevHorizon) {
    setPrevMonthlySavings(profile?.monthly_savings);
    setPrevHorizon(profile?.investment_horizon);
    setBaseSIP(profile?.monthly_savings || 12000);
    setYears(profile?.investment_horizon || 15);
  }

  // Safe numerical fallback during manual typing states
  const safeBaseSIP = Number(baseSIP) || 0;
  const safeReturnRate = Number(returnRate) || 0;
  const safeYears = Number(years) || 0;
  const safeStepUpPercent = Number(stepUpPercent) || 0;

  const effectiveReturnRate = inflationAdjusted ? Math.max(0, safeReturnRate - 6) : safeReturnRate;

  const projections = useMemo(() => {
    return getStepUpProjectionData(safeBaseSIP, effectiveReturnRate, safeYears, safeStepUpPercent);
  }, [safeBaseSIP, effectiveReturnRate, safeYears, safeStepUpPercent]);

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

  // Extract milestones
  const milestones = useMemo(() => {
    const arr = [];
    for (let i = 4; i < chartData.length; i += 5) {
      arr.push({ ...chartData[i], label: `End of Year ${i + 1}` });
    }
    if (chartData.length % 5 !== 0 && chartData.length > 0) {
      arr.push({ ...chartData[chartData.length - 1], label: `Final (Year ${chartData.length})` });
    }
    return arr;
  }, [chartData]);

  return (
    <div className="stepup-page" style={{ position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .sup-slider {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 100% !important;
          height: 20px !important;
          background: transparent !important;
          outline: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-sizing: border-box !important;
          cursor: pointer !important;
        }
        .sup-slider::-webkit-slider-runnable-track {
          width: 100% !important;
          height: 4px !important;
          border-radius: 100px !important;
          background: var(--sup-track-gradient, rgba(255,255,255,0.06)) !important;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.5) !important;
          border: none !important;
          box-sizing: border-box !important;
        }
        .sup-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 16px !important;
          height: 16px !important;
          margin-top: -6px !important;
          box-sizing: border-box !important;
          border-radius: 50% !important;
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 60%, #94a3b8 100%) !important;
          border: 3px solid #0ea5e9 !important;
          cursor: pointer !important;
          box-shadow: 0 0 10px rgba(14, 165, 233, 0.5), 0 1px 4px rgba(0,0,0,0.4) !important;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease !important;
        }
        .sup-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 0 18px rgba(14, 165, 233, 0.7), 0 0 5px rgba(14, 165, 233, 0.4), 0 2px 6px rgba(0,0,0,0.5) !important;
        }
        .sup-slider-purple::-webkit-slider-thumb {
          border-color: #a78bfa !important;
          box-shadow: 0 0 10px rgba(167, 139, 250, 0.5), 0 1px 4px rgba(0,0,0,0.4) !important;
        }
        .sup-slider-purple::-webkit-slider-thumb:hover {
          box-shadow: 0 0 18px rgba(167, 139, 250, 0.7), 0 0 5px rgba(167, 139, 250, 0.4), 0 2px 6px rgba(0,0,0,0.5) !important;
        }
        .sup-hero-input {
          background: transparent;
          border: none;
          font-size: 1.8rem;
          font-weight: 900;
          outline: none;
          padding: 0;
          font-family: inherit;
          width: 100%;
          transition: color 0.2s ease;
        }
        .sup-hero-input::-webkit-outer-spin-button,
        .sup-hero-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .sup-hero-input-container {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          border-bottom: 1px dashed rgba(255,255,255,0.1);
          padding-bottom: 2px;
          transition: border-color 0.2s ease;
        }
        .sup-hero-input-container:focus-within {
          border-bottom-color: var(--focus-color, #0ea5e9);
        }
      `}</style>

      {/* Floating Ambient Orbs */}
      <div className="sup-bg-orb sup-bg-orb--1"></div>
      <div className="sup-bg-orb sup-bg-orb--2"></div>

      <motion.div
        style={{ textAlign: 'center', marginBottom: 8 }}
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="sup-page-badge">
          <TrendingUp size={11} style={{ marginRight: 6 }} />
          Growth Planner
        </div>
        <h1 className="sup-page-title">Grow Your Monthly Savings (Step-Up <JargonTooltip term="SIP">SIP</JargonTooltip>)</h1>
        <p className="sup-page-subtitle">
          See how a simple yearly increase in your savings can secure your financial freedom.
        </p>
      </motion.div>

      <div className="sup-header-divider" />

      {/* Onboarding block */}
      <motion.div 
        className="sup-onboarding-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.07) 0%, rgba(14, 165, 233, 0.03) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
          borderRadius: '20px',
          padding: '20px 24px',
          marginBottom: '32px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          backdropFilter: 'blur(20px)',
          textAlign: 'left'
        }}
      >
        <div style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', padding: '12px', borderRadius: '14px' }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>What is a Step-Up <JargonTooltip term="SIP">SIP</JargonTooltip>?</h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Instead of investing the same amount forever, a <strong>Step-Up <JargonTooltip term="SIP">SIP</JargonTooltip></strong> increases your monthly savings slightly (e.g., 10%) each year as your income grows. This small, gradual adjustment supercharges your wealth over the long run!
          </p>
        </div>
      </motion.div>

      {/* Interactive Controls & Forms */}
      <motion.div
        className="sup-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* SIP Base Input Card */}
        <div className="sup-control-card" style={{'--card-accent': '#0ea5e9', '--card-accent-rgb': '14, 165, 233'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top" style={{ marginBottom: 4 }}>
            <div className="sup-control-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8' }}><Wallet size={15} /></div>
            <label>Starting Monthly Savings (<JargonTooltip term="SIP">SIP</JargonTooltip>)</label>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 8, lineHeight: 1.3 }}>
            The initial amount you want to save every month.
          </div>
          
          <div className="sup-hero-input-container" style={{ '--focus-color': '#0ea5e9' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8' }}>₹</span>
            <input 
              type="number"
              value={baseSIP}
              onChange={e => {
                const val = e.target.value === '' ? '' : Math.min(1000000, Number(e.target.value));
                setBaseSIP(val);
              }}
              onBlur={() => {
                if (baseSIP === '' || Number(baseSIP) < 500) setBaseSIP(500);
              }}
              className="sup-hero-input"
              style={{ color: '#38bdf8' }}
            />
          </div>

          <input
            type="range" 
            value={Number(baseSIP) || 0} 
            onChange={e => setBaseSIP(Number(e.target.value))}
            min="1000" 
            max="100000" 
            step="1000" 
            className="sup-slider"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((Math.min(100000, Number(baseSIP)) - 1000) / 99000) * 100}%, rgba(255,255,255,0.06) ${((Math.min(100000, Number(baseSIP)) - 1000) / 99000) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>₹1K</span><span>₹100K</span></div>
        </div>

        {/* Step Up Annual Input Card */}
        <div className="sup-control-card" style={{'--card-accent': '#a78bfa', '--card-accent-rgb': '167, 139, 250'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top" style={{ marginBottom: 4 }}>
            <div className="sup-control-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}><TrendingUp size={15} /></div>
            <label>Annual Increase (Step-Up %)</label>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 8, lineHeight: 1.3 }}>
            Increase your monthly savings by this percentage every year.
          </div>
          
          <div className="sup-hero-input-container" style={{ '--focus-color': '#a78bfa' }}>
            <input 
              type="number"
              value={stepUpPercent}
              onChange={e => {
                const val = e.target.value === '' ? '' : Math.min(100, Number(e.target.value));
                setStepUpPercent(val);
              }}
              onBlur={() => {
                if (stepUpPercent === '' || Number(stepUpPercent) < 0) setStepUpPercent(0);
              }}
              className="sup-hero-input"
              style={{ color: '#a78bfa' }}
            />
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#a78bfa' }}>%</span>
          </div>

          <input
            type="range" 
            value={Number(stepUpPercent) || 0} 
            onChange={e => setStepUpPercent(Number(e.target.value))}
            min="0" 
            max="50" 
            step="1" 
            className="sup-slider sup-slider-purple"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #a78bfa 0%, #a78bfa ${(Math.min(50, Number(stepUpPercent)) / 50) * 100}%, rgba(255,255,255,0.06) ${(Math.min(50, Number(stepUpPercent)) / 50) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>0%</span><span>50%</span></div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            {[
              { label: 'Flat (0%)', val: 0 },
              { label: '5% Plan', val: 5 },
              { label: 'Rec: 10%', val: 10 }
            ].map(preset => (
              <button
                key={preset.val}
                type="button"
                onClick={() => setStepUpPercent(preset.val)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: stepUpPercent === preset.val ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.05)',
                  background: stepUpPercent === preset.val ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255,255,255,0.02)',
                  color: stepUpPercent === preset.val ? '#c084fc' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Investment Horizon Input Card */}
        <div className="sup-control-card" style={{'--card-accent': '#0ea5e9', '--card-accent-rgb': '14, 165, 233'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top" style={{ marginBottom: 4 }}>
            <div className="sup-control-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8' }}><Calendar size={15} /></div>
            <label>Investing Period (Horizon)</label>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 8, lineHeight: 1.3 }}>
            How long you plan to keep your money invested.
          </div>
          
          <div className="sup-hero-input-container" style={{ '--focus-color': '#0ea5e9' }}>
            <input 
              type="number"
              value={years}
              onChange={e => {
                const val = e.target.value === '' ? '' : Math.min(50, Number(e.target.value));
                setYears(val);
              }}
              onBlur={() => {
                if (years === '' || Number(years) < 1) setYears(1);
              }}
              className="sup-hero-input"
              style={{ color: '#38bdf8' }}
            />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>Yrs</span>
          </div>

          <input
            type="range" 
            value={Number(years) || 0} 
            onChange={e => setYears(Number(e.target.value))}
            min="1" 
            max="40" 
            step="1" 
            className="sup-slider"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((Math.min(40, Number(years)) - 1) / 39) * 100}%, rgba(255,255,255,0.06) ${((Math.min(40, Number(years)) - 1) / 39) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>1 yr</span><span>40 yrs</span></div>
        </div>

        {/* Expected CAGR Input Card */}
        <div className="sup-control-card" style={{'--card-accent': '#a78bfa', '--card-accent-rgb': '167, 139, 250'}}>
          <div className="sup-card-accent-bar" />
          <div className="sup-control-top" style={{ marginBottom: 4 }}>
            <div className="sup-control-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}><Target size={15} /></div>
            <label>Expected Growth Rate (<JargonTooltip term="CAGR">CAGR</JargonTooltip>)</label>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 8, lineHeight: 1.3 }}>
            The estimated yearly return rate of your investments.
          </div>
          
          <div className="sup-hero-input-container" style={{ '--focus-color': '#a78bfa' }}>
            <input 
              type="number"
              step="0.1"
              value={returnRate}
              onChange={e => {
                const val = e.target.value === '' ? '' : Math.min(50, Number(e.target.value));
                setReturnRate(val);
              }}
              onBlur={() => {
                if (returnRate === '' || Number(returnRate) < 1) setReturnRate(1);
              }}
              className="sup-hero-input"
              style={{ color: '#a78bfa' }}
            />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa' }}>% p.a.</span>
          </div>

          <input
            type="range" 
            value={Number(returnRate) || 0} 
            onChange={e => setReturnRate(Number(e.target.value))}
            min="1" 
            max="30" 
            step="0.5" 
            className="sup-slider sup-slider-purple"
            style={{ '--sup-track-gradient': `linear-gradient(to right, #a78bfa 0%, #a78bfa ${((Math.min(30, Number(returnRate)) - 1) / 29) * 100}%, rgba(255,255,255,0.06) ${((Math.min(30, Number(returnRate)) - 1) / 29) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="sup-range-labels"><span>1%</span><span>30%</span></div>
        </div>
      </motion.div>

      {/* Settings & Inflation Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(15,23,42,0.6)', padding: '10px 20px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Adjust for <JargonTooltip term="Inflation">Inflation</JargonTooltip> (6% p.a.)</span>
          <div className="switch" style={{ margin: 0 }}>
            <input type="checkbox" checked={inflationAdjusted} onChange={e => setInflationAdjusted(e.target.checked)} />
            <span className="slider"></span>
          </div>
        </label>
      </div>

      {/* Key Compounding Metrics */}
      <div className="sup-metrics">
        <motion.div className="sup-metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8' }}><PiggyBank size={20} /></div>
          <span className="sup-metric-label">Regular Savings (Flat <JargonTooltip term="SIP">SIP</JargonTooltip>)</span>
          <span className="sup-metric-value" style={{ color: '#e2e8f0' }}>{formatCompactINR(flatFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatCompactINR(flatInvested)}</span>
        </motion.div>

        <motion.div className="sup-metric-card sup-metric-card--highlight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(167, 139, 250, 0.08)', color: '#a78bfa' }}><Rocket size={20} /></div>
          <span className="sup-metric-label">Booster Savings (Step-Up <JargonTooltip term="SIP">SIP</JargonTooltip>)</span>
          <span className="sup-metric-value" style={{ color: '#a78bfa', textShadow: '0 0 12px rgba(139,92,246,0.4)' }}>{formatCompactINR(stepUpFinal)}</span>
          <span className="sup-metric-sub">Invested: {formatCompactINR(stepUpInvested)}</span>
        </motion.div>

        <motion.div className="sup-metric-card sup-metric-card--success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="sup-metric-icon" style={{ background: 'rgba(74, 222, 128, 0.08)', color: '#4ade80' }}><ArrowUpRight size={20} /></div>
          <span className="sup-metric-label">Extra Wealth Gained</span>
          <span className="sup-metric-value" style={{ color: '#4ade80', textShadow: '0 0 12px rgba(74,222,128,0.35)' }}>+ {formatCompactINR(additionalCorpus)}</span>
          <span className="sup-metric-sub" style={{ color: '#22c55e', fontWeight: 700 }}>{additionalPercent}% more wealth</span>
        </motion.div>
      </div>

      {/* Details Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', marginBottom: '24px' }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 20px',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          {showDetails ? 'Hide Growth Chart & Milestones' : 'Show Growth Chart & Milestones'}
        </button>
      </div>

      {showDetails && (
        <>
          {/* Projections Area Chart */}
          <motion.div
            className="sup-chart-wrapper"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h3>Savings without boost vs Booster <JargonTooltip term="SIP">SIP</JargonTooltip> growth projections</h3>
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
                  <Area type="monotone" dataKey="flatSIP" name="Regular Savings (Flat SIP)" stroke="#0ea5e9" fill="url(#flatGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="stepUpSIP" name="Booster Savings (Step-Up SIP)" stroke="#a78bfa" fill="url(#stepGrad)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Milestone progression list */}
          <motion.div
            style={{ marginTop: 32, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 24 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{ margin: '0 0 20px', color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>Yearly Growth Tracker</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>Milestone</th>
                    <th style={{ padding: '12px 16px', color: '#0ea5e9', fontWeight: 600, fontSize: '0.85rem' }}>Regular Savings Total</th>
                    <th style={{ padding: '12px 16px', color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem' }}>Booster Savings Total</th>
                    <th style={{ padding: '12px 16px', color: '#4ade80', fontWeight: 600, fontSize: '0.85rem' }}>Extra Wealth Gained</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, idx) => {
                    const diff = m.stepUpSIP - m.flatSIP;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 700 }}>{m.label}</td>
                        <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{formatINR(m.flatSIP)}</td>
                        <td style={{ padding: '14px 16px', color: '#e2e8f0', fontWeight: 600 }}>{formatINR(m.stepUpSIP)}</td>
                        <td style={{ padding: '14px 16px', color: '#4ade80', fontWeight: 700 }}>+{formatINR(diff)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default StepUpPlanner;
