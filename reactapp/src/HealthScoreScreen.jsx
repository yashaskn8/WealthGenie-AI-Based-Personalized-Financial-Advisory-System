import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Share, FileText, Link as LinkIcon, Upload } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import './HealthScoreScreen.css';
import headerLogo from './assets/logo.png';

// Mini visual sparkline generator for decorative phone
const generatePath = (color) => {
  return (
    <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none">
      <path d={`M0,10 Q10,20 20,10 T40,10 T60,15 T80,5 T100,10`} fill="none" stroke={color} strokeWidth="2" filter="drop-shadow(0 0 4px ${color})" />
    </svg>
  );
};

const HealthScoreScreen = ({ profile, recommendations }) => {
  const { score, subScores, grade, color } = useMemo(() => {
    const savingsRatio = (profile?.monthly_savings || 0) / (profile?.monthly_income || 1);
    const savingsScore = Math.min(100, savingsRatio * 500); 

    const emergencyScore = profile?.investment_goals?.includes('Emergency Fund') ? 80 : 20;

    const categories = new Set((recommendations || []).map(r => r.category));
    const divScore = (categories.size / 5) * 100 || 50;

    const taxSavingRecs = (recommendations || []).filter(r => r.tax_benefit).length;
    const taxScore = recommendations?.length > 0 ? (taxSavingRecs / recommendations.length) * 100 : 0;

    const coverages = (recommendations || []).flatMap(r => r.suitable_for_goals);
    const coveredCount = (profile?.investment_goals || []).filter(g => coverages.includes(g)).length;
    const goalScore = profile?.investment_goals?.length > 0 ? (coveredCount / profile.investment_goals.length) * 100 : 100;

    let riskScore = 100;
    if (profile?.risk_appetite === 'High' && profile?.investment_horizon < 5) riskScore = 20;
    if (profile?.risk_appetite === 'Low' && profile?.investment_horizon > 15) riskScore = 60;

    const total = (savingsScore * 0.25) + (emergencyScore * 0.20) + (divScore * 0.20) + (taxScore * 0.15) + (goalScore * 0.10) + (riskScore * 0.10);
    
    let g = 'Poor Fitness', c = '#ef4444';
    if (total >= 40) { g = 'Average Fitness'; c = '#f59e0b'; }
    if (total >= 60) { g = 'Good Fitness'; c = '#eab308'; } // Matching the golden 76 in image
    if (total >= 80) { g = 'Excellent Fitness'; c = '#10b981'; }

    return { 
      score: Math.round(total), 
      grade: g, 
      color: c,
      subScores: [
        { label: 'Savings Rate Capacity', val: savingsScore, weight: 25, extra: 'Automatic Transfer Active', alert: false },
        { label: 'Emergency Safety Net', val: emergencyScore, weight: 20, extra: emergencyScore < 50 ? 'Alert: Target shortfall detected.\nRecommendation: Increase contribution.' : 'Safety Net Secure', alert: emergencyScore < 50 },
        { label: 'Portfolio Diversification', val: divScore, weight: 20, extra: 'View Allocation Breakdown', alert: false },
        { label: 'Tax Shield Efficiency', val: taxScore, weight: 15, extra: 'Optimizer active', alert: false },
        { label: 'Goal Alignment', val: goalScore, weight: 10, extra: 'Calender view | Milestone mrkers', alert: false },
        { label: 'Time-Horizon Risk Match', val: riskScore, weight: 10, extra: 'Volatility synchronized', alert: false }
      ]
    };
  }, [profile, recommendations]);

  return (
    <div className="health-screen-wrapper">
      
      {/* Background Neon Grid Wave simulated via CSS properties already set */}
      
      {/* Top Header */}
      <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 5 }}>
        <h1 style={{ margin: 0, fontSize: '2.2rem', letterSpacing: '-0.5px', fontWeight: 800 }}>Financial Health Grading</h1>
        <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '1rem' }}>A holistic analysis of your financial foundation and strategy.</p>
      </div>

      <div style={{ position: 'absolute', top: 40, right: 40, textAlign: 'right', zIndex: 5 }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>WealthGenie Intelligence</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>Automated Portfolio Grading</p>
      </div>

      <div className="health-grid">
        
        {/* Left Column: Overall Score Card */}
        <div className="glass-panel score-card">
          {/* Advanced Reactor HUD Animation */}
          <div style={{ position: 'relative', width: 280, height: 280, marginBottom: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg viewBox="0 0 200 200" style={{ position: 'absolute', width: '100%', height: '100%', filter: `drop-shadow(0 0 25px ${color}60)` }}>
              {/* Outer Slow Rotating Dashed Ring */}
              <motion.circle 
                cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="10 15"
                animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '100px 100px' }}
              />
              {/* Inner Fast Rotating Dotted Ring */}
              <motion.circle 
                cx="100" cy="100" r="65" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 8" strokeOpacity="0.6"
                animate={{ rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '100px 100px' }}
              />
              {/* Main Score Track */}
              <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              {/* Main Score Progress (Animated) */}
              <motion.circle 
                cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="14"
                strokeDasharray="502"
                initial={{ strokeDashoffset: 502 }}
                animate={{ strokeDashoffset: 502 - (502 * score) / 100 }}
                transition={{ duration: 2.5, ease: "easeOut", delay: 0.5 }}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px' }}
              />
            </svg>
            
            {/* Center Score Text */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.span 
                initial={{ scale: 0.5, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ type: 'spring', bounce: 0.5, duration: 1, delay: 0.2 }} 
                style={{ fontSize: '5.5rem', fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 40px ${color}` }}
              >
                {score}
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 8, letterSpacing: '2px', fontWeight: 700 }}
              >
                OUT OF 100
              </motion.span>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.8 }}
            style={{ fontSize: '1.8rem', fontWeight: 800, color, marginBottom: 30, textShadow: `0 0 20px ${color}90`, letterSpacing: '-0.5px' }}
          >
            {grade}
          </motion.div>
          
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5 }}
            className="btn-glass" 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, 
              padding: '16px 0', fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.15)' 
            }}
          >
            <Share size={18} /> Export Scorecard
          </motion.button>
        </div>

        {/* Right Column: Breakdown Panel Stack & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="glass-panel" style={{ padding: '24px 30px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#e2e8f0', letterSpacing: '0.5px' }}>METRIC BREAKDOWN</h3>
            {subScores.map((sub, i) => {
               const barColor = sub.val >= 80 ? '#4ade80' : sub.val >= 50 ? '#eab308' : '#ef4444';
               return (
                <motion.div 
                  key={i} 
                  className={`breakdown-row ${sub.alert ? 'alert' : ''}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.15 + 0.6 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {sub.alert ? <span style={{color:'#ef4444'}}>⚠</span> : <span style={{color:'#4ade80'}}>↗</span>}
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>{sub.label}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({sub.weight}% weight)</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: barColor, fontSize: '1rem' }}>
                      {Math.round(sub.val)}/100
                    </span>
                  </div>
                  
                  <div className="progress-track" style={{ background: sub.alert ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', height: 8 }}>
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${sub.val}%` }} transition={{ duration: 1.5, delay: i * 0.15 + 1 }}
                      className="progress-fill" style={{ background: barColor, color: barColor }}
                    />
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 10, whiteSpace: 'pre-line' }}>
                     {sub.alert ? <strong style={{color: '#ef4444'}}>{sub.extra}</strong> : sub.extra}
                  </div>
                </motion.div>
               );
            })}
          </motion.div>

          {/* Actionable Insights conditionally appended if there are alerts */}
          {subScores.some(s => s.alert) && (
            <div className="glass-panel" style={{ padding: '24px 30px', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="widget-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠</span> CRITICAL ACTION REQUIRED
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {subScores.filter(s => s.alert).map((alertItem, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: 8 }}>
                      <strong style={{ color: '#ef4444' }}>{alertItem.label} Shortfall</strong>
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Score: {Math.round(alertItem.val)}/100</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 12 }}>{alertItem.extra}</div>
                    <button className="btn-glass" style={{ fontSize: '0.8rem', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)', width: 'auto' }}>View Resolution Steps →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default HealthScoreScreen;
