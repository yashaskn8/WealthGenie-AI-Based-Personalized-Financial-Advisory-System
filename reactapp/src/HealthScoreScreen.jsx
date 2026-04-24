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

  // Dummy projection data for the right widgets
  const projData1 = [{t:0, v:0},{t:25, v:10},{t:50, v:25},{t:75, v:55},{t:100, v:100}];
  const projData2 = [{t:0, v:0, base:0},{t:25, v:2, base:1},{t:50, v:5, base:3},{t:75, v:12, base:6},{t:100, v:25, base:10}];

  return (
    <div className="health-screen-wrapper">
      
      {/* Background Neon Grid Wave simulated via CSS properties already set */}
      
      {/* Top Header */}
      <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 5 }}>
        <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.5px' }}>Advancial Health Grading</h1>
        <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>A holistic analysis of your financial foundation and strategy.</p>
      </div>

      <div style={{ position: 'absolute', top: 40, right: 40, textAlign: 'right', zIndex: 5 }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Dashboard:</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>Advanced Insights & Controls</p>
      </div>



      <div className="health-grid">
        


        {/* Center Main Card */}
        <div className="glass-panel score-card">
          <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 30 }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 25px ${color})` }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
              <motion.circle 
                cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="12"
                strokeDasharray="264"
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - (264 * score) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '4.5rem', fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 25px ${color}` }}>
                {score}
              </motion.span>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4, letterSpacing: '0.5px' }}>out of 100</span>
            </div>
          </div>
          
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color, marginBottom: 30, textShadow: `0 0 15px ${color}90`, letterSpacing: '-0.5px' }}>
            {grade}
          </div>
          
          <button className="btn-glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <Share size={16} /> Share Scorecard
          </button>
          
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn-glass" style={{ fontSize: '0.8rem', padding: '10px 0' }}>Generate Report</button>
            <button className="btn-glass" style={{ fontSize: '0.8rem', padding: '10px 0' }}>Connect Accounts</button>
          </div>
        </div>

        {/* Breakdown Panel Stack */}
        <div className="glass-panel" style={{ padding: '24px 20px' }}>
          {subScores.map((sub, i) => {
             const barColor = sub.val >= 80 ? '#4ade80' : sub.val >= 50 ? '#eab308' : '#ef4444';
             return (
              <div key={i} className={`breakdown-row ${sub.alert ? 'alert' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sub.alert ? <span style={{color:'#ef4444'}}>⚠</span> : <span style={{color:'#4ade80'}}>↗</span>}
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sub.label}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({sub.weight}% weight)</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: barColor, fontSize: '0.9rem' }}>
                    {Math.round(sub.val)}/100
                  </span>
                </div>
                
                <div className="progress-track" style={{ background: sub.alert ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)' }}>
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: `${sub.val}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                    className="progress-fill" style={{ background: barColor, color: barColor }}
                  />
                </div>
                
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8, whiteSpace: 'pre-line' }}>
                   {sub.alert ? <div style={{color: '#ef4444'}}>{sub.extra}</div> : sub.extra}
                </div>
              </div>
             );
          })}
        </div>

        {/* Right Dashboard Controls */}
        <div className="right-dashboard-col">
           <div className="widget-title">AI INSIGHTS & ACTIONS</div>
           
           <div className="insight-widget" style={{ padding: 12 }}>
             <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Top Actionable Insights</h4>
             {subScores.find(s => s.alert) && (
               <div className="insight-card critical">
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                   <strong style={{ color: '#ef4444' }}>Emergency Fund Critical</strong>
                   <span style={{ color: '#ef4444' }}>({Math.round(subScores.find(s=>s.alert).val)}/100)</span>
                 </div>
                 <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 8 }}>Tap to create a 3-step action plan</div>
                 <button className="btn-glass" style={{ fontSize: '0.7rem', padding: '4px 0' }}>Direct link</button>
               </div>
             )}
             <div className="insight-card">
               <div style={{ fontSize: '0.85rem', marginBottom: 4, color: '#4ade80' }}><strong>Portfolio Optimization Opportunity</strong></div>
               <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tap to view tax-loss harvesting analysis</div>
             </div>
           </div>

           <div className="insight-widget">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
               <h4 style={{ margin: 0, fontSize: '0.85rem' }}>Market Intelligence Feed</h4>
               <span style={{ color: '#64748b' }}>...</span>
             </div>
             <div style={{ fontSize: '0.75rem' }}>
               <span style={{ color: '#4ade80', marginRight: 8 }}>^GSPC +0.31%</span>
               <span style={{ color: '#ef4444', marginRight: 8 }}>^DJI -0.05%</span>
               <span style={{ color: '#4ade80' }}>^GAP</span>
             </div>
             <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 8, lineHeight: 1.4, margin: '8px 0 0 0' }}>
               Headlines: Frontlines submersing index vs mi-voment relevant headlines...
             </p>
           </div>

           <div className="insight-widget" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                 <h4 style={{ margin: 0, fontSize: '0.85rem' }}>Future Projections</h4>
                 <span style={{ color: '#64748b' }}>...</span>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>
                   <span>Retirement Date</span>
                   <span style={{ color: '#4ade80' }}>• Current • 76/100</span>
                </div>
                <div style={{ height: 60, width: '100%' }}>
                  <ResponsiveContainer>
                    <AreaChart data={projData1}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" stopOpacity={0.4}/><stop offset="100%" stopColor="#4ade80" stopOpacity={0}/></linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#4ade80" strokeWidth={2} fill="url(#g1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>
                   <span>Wealth Accumulation</span>
                   <span style={{ color: '#0ea5e9' }}>• Simulated Optimal</span>
                </div>
                <div style={{ height: 60, width: '100%' }}>
                  <ResponsiveContainer>
                    <AreaChart data={projData2}>
                      <defs>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4}/><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="base" stroke="#64748b" strokeDasharray="3 3" fill="none" />
                      <Area type="monotone" dataKey="v" stroke="#0ea5e9" strokeWidth={2} fill="url(#g2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
           </div>

        </div>

      </div>

    </div>
  );
};

export default HealthScoreScreen;
