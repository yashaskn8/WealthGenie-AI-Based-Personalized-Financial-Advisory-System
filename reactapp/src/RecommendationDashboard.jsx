import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChevronRight, ChevronDown, Filter, Info, Shield, TrendingUp, Zap } from 'lucide-react';
import { investmentDatabase, RISK_COLORS, CHART_COLORS } from './investmentDatabase';
import { getEligibleInvestments, getWhy, computePostTaxReturn } from './recommendationEngine';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import SebiDisclaimer from './components/SebiDisclaimer';
import './Dashboard.css';

const CATEGORY_COLORS = {
  'Equity': '#a855f7',
  'Debt': '#3b82f6',
  'Commodity': '#eab308',
  'Government': '#60a5fa',
  'Equity-Debt': '#8b5cf6',
  'Alternative': '#dfbd69',
  'Hybrid': '#f43f5e'
};
const DEFAULT_COLORS = ['#06b6d4', '#10b981', '#dfbd69', '#8b5cf6', '#f43f5e', '#0ea5e9', '#f97316', '#ec4899'];

const RecommendationDashboard = ({ userProfile, recommendations, onExploreAll, onRebalance, isLoading: isLoadingProp, explanation }) => {
  const defaultHorizon = userProfile?.investment_horizon || 15;
  const [horizon, setHorizon] = useState(defaultHorizon);
  const [inflationAdjusted, setInflationAdjusted] = useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (isLoadingProp !== undefined) {
      setIsLoading(isLoadingProp);
    } else {
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingProp]);
  
  const [riskValue, setRiskValue] = useState(userProfile?.risk_appetite === 'High' ? 8 : userProfile?.risk_appetite === 'Medium' ? 6 : 3);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedWhyCards, setExpandedWhyCards] = useState({});
  const [riskGroupOpen, setRiskGroupOpen] = useState({
    low: (userProfile?.risk_appetite || 'Medium').toLowerCase() === 'low',
    medium: (userProfile?.risk_appetite || 'Medium').toLowerCase() === 'medium',
    high: (userProfile?.risk_appetite || 'Medium').toLowerCase() === 'high',
  });

  // Eligibility stats
  const eligibleCount = useMemo(() => {
    if (!userProfile) return 0;
    return getEligibleInvestments(userProfile).length;
  }, [userProfile]);

  const excludedCount = 15 - eligibleCount;

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWhyCard = (id) => {
    setExpandedWhyCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Dynamic Data Calculation based on recommendations
  const { allocationDataOuter, allocationDataInner, tableData, performanceData, currentMonthly, totalProjected } = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return {
      allocationDataOuter: [], allocationDataInner: [], tableData: [], performanceData: [], currentMonthly: 0, totalProjected: 0
    };

    let totalMonthly = 0;
    let proj = 0;
    const catMap = {};
    const innerMap = [];
    const tableGroupMap = {};

    let colorIndex = 0;

    recommendations.forEach((rec) => {
      totalMonthly += rec.monthly_allocation;
      
      // Calculate a standard projection for the dynamic selected horizon
      const months = horizon * 12;
      let rate = rec.rate || rec.expected_return_max || 10;
      let rateMin = rec.expected_return_min || (rate * 0.8);
      
      if (inflationAdjusted) {
        rate = Math.max(0, rate - 6.0);
        rateMin = Math.max(0, rateMin - 6.0);
      }
      
      const rateMonth = (rate / 100) / 12;
      const futureValue = rateMonth > 0 ? rec.monthly_allocation * ((Math.pow(1 + rateMonth, months) - 1) / rateMonth) * (1 + rateMonth) : rec.monthly_allocation * months;
      proj += futureValue;

      // Outer Donut Aggregation
      const cat = rec.cat || rec.category || 'Other';
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat] += rec.monthly_allocation;

      // Inner Donut
      innerMap.push({
        name: rec.abbr || rec.name,
        value: rec.monthly_allocation,
        color: rec.color || CATEGORY_COLORS[cat] || DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length]
      });
      colorIndex++;

      // Table Data grouping
      if (!tableGroupMap[cat]) tableGroupMap[cat] = [];
      tableGroupMap[cat].push({
        name: rec.abbr || rec.name,
        fullName: rec.name,
        weight: 0, // calculated later
        ret: `${rateMin.toFixed(1)}-${rate.toFixed(1)}%`,
        risk: rec.riskLabel || rec.risk_level || 'Medium',
        alloc: rec.monthly_allocation,
        current: (rec.monthly_allocation * 12).toLocaleString(),
        proj: (futureValue / 100000).toFixed(2) + 'L',
        taxBadge: rec.taxType === "eee" || rec.taxType === "elss" || rec.taxType === "nps" || rec.tax_benefit,
        taxLabel: rec.taxType === "eee" ? "EEE" : rec.taxType === "elss" ? "80C" : rec.taxType === "nps" ? "80CCD" : rec.tax_section || null
      });
    });

    const outerData = Object.keys(catMap).map(k => ({
      name: k,
      value: catMap[k],
      color: CATEGORY_COLORS[k] || '#888'
    }));

    // Calculate weights and format table
    const formattedTable = Object.keys(tableGroupMap).map((cat, i) => {
      const children = tableGroupMap[cat].map(c => {
         c.weight = (c.alloc / totalMonthly) * 100;
         return c;
      });
      return {
        id: i.toString(),
        class: cat,
        hasTax: children.some(c => c.taxBadge),
        children
      }
    });

    // Generate performance trajectory points (0, 1/3, 2/3, horizon)
    const points = [0, Math.floor(horizon / 3), Math.floor((horizon * 2) / 3), horizon];
    const perfData = points.map(yr => {
      const m = yr * 12;
      let worst = 0, avg = 0, best = 0;
      if (yr === 0) {
        return { year: yr.toString(), worst: totalMonthly, average: totalMonthly, best: totalMonthly };
      }
      recommendations.forEach(r => {
         let rate = r.rate || r.expected_return_max || 10;
         let minRate = r.expected_return_min || (rate * 0.8);
         
         if (inflationAdjusted) {
             rate = Math.max(0, rate - 6.0);
             minRate = Math.max(0, minRate - 6.0);
         }
         
         const minR = (minRate / 100) / 12;
         const maxR = (rate / 100) / 12;
         const midR = ((minR + maxR) / 2);
         worst += minR > 0 ? r.monthly_allocation * ((Math.pow(1 + minR, m) - 1) / minR) * (1 + minR) : r.monthly_allocation * m;
         best += maxR > 0 ? r.monthly_allocation * ((Math.pow(1 + maxR, m) - 1) / maxR) * (1 + maxR) : r.monthly_allocation * m;
         avg += midR > 0 ? r.monthly_allocation * ((Math.pow(1 + midR, m) - 1) / midR) * (1 + midR) : r.monthly_allocation * m;
      });
      return { year: yr.toString(), worst, average: avg, best };
    });

    // Expand all table rows by default on computed map
    const initialExpanded = {};
    formattedTable.forEach(t => initialExpanded[t.id] = true);
    setExpandedRows(initialExpanded);

    return {
      allocationDataOuter: outerData,
      allocationDataInner: innerMap,
      tableData: formattedTable,
      performanceData: perfData,
      currentMonthly: totalMonthly,
      totalProjected: proj
    };
  }, [recommendations, horizon, inflationAdjusted]);

  // Risk-grouped eligible instruments for "Browse by Risk Level"
  const riskGroups = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return { low: [], medium: [], high: [] };
    
    const annualIncome = (Number(userProfile?.monthly_income) || 0) * 12;
    const annualSavings = (Number(userProfile?.monthly_savings) || 0) * 12;
    
    return {
      low: recommendations.filter(r => (r.risk || 0) <= 2).map(r => {
        const { postTaxRate } = computePostTaxReturn(r.rate, r.taxType, annualSavings, annualIncome);
        return { ...r, postTaxRate };
      }),
      medium: recommendations.filter(r => (r.risk || 0) === 3).map(r => {
        const { postTaxRate } = computePostTaxReturn(r.rate, r.taxType, annualSavings, annualIncome);
        return { ...r, postTaxRate };
      }),
      high: recommendations.filter(r => (r.risk || 0) >= 4).map(r => {
        const { postTaxRate } = computePostTaxReturn(r.rate, r.taxType, annualSavings, annualIncome);
        return { ...r, postTaxRate };
      }),
    };
  }, [recommendations, userProfile]);

  const benchMarkData = [
    { name: 'Global 60/40 Portfolio', value: 7.2, fill: '#38b2ac' },
    { name: 'S&P 500', value: 10.5, fill: '#9f7aea' },
    { name: 'Nifty 50', value: 12.1, fill: '#ecc94b' }
  ];

  // Scroll to recommendation card
  const scrollToCard = (name) => {
    const el = document.getElementById(`rec-card-${name}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container" style={{maxWidth: 1600, margin: '0 auto'}}>
        
        <div className="advisor-header">
           <h1 className="advisor-title">
             WealthGenie Portfolio Strategy Engine {userProfile ? `(Age: ${userProfile.age || '--'}, ${userProfile.risk_appetite || 'Medium'}-Risk)` : ''}
           </h1>
        </div>

        {/* ─── ELIGIBILITY NOTICE (Section 5) ─── */}
        {excludedCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.15)',
            borderRadius: 12, marginBottom: 16, fontSize: '0.88rem', color: '#94a3b8'
          }}>
            <Info size={18} color="#06b6d4" style={{ flexShrink: 0 }} />
            <span>
              Showing <strong style={{ color: '#fff' }}>{eligibleCount} of 15</strong> instruments.{' '}
              <strong style={{ color: '#fff' }}>{excludedCount}</strong> option{excludedCount > 1 ? 's' : ''} excluded based on your profile (age, income, savings, and risk tolerance).
            </span>
          </div>
        )}

        <div className="status-bar">
          <div className="status-item">Next Review: <span>15 Oct</span></div>
          <div className="status-item">Primary Goal: <span>Retirement</span></div>
          <div className="status-item">Plan Status: <span style={{color: '#4ade80'}}>On-Track</span></div>
          <div className="status-item">Monthly Engine Value: <span>₹{currentMonthly.toLocaleString()}</span></div>
        </div>

        {/* Top Grid (3 columns) */}
        <div className="top-row-grid">
           
          {/* Panel 1: Portfolio Parameters */}
          <div className="panel-card">
            <div className="panel-header">
               <span className="panel-title">Portfolio Parameters</span>
            </div>
            
            {/* Inflation Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.85rem' }}>Inflation-Adjusted Projections</span>
              <div className="tax-regime-toggle" style={{ display: 'flex' }}>
                <button 
                  className={`regime-btn ${!inflationAdjusted ? 'active' : ''}`} 
                  onClick={() => setInflationAdjusted(false)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', background: !inflationAdjusted ? '#0ea5e9' : 'transparent', color: !inflationAdjusted ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                >Nominal</button>
                <button 
                  className={`regime-btn ${inflationAdjusted ? 'active' : ''}`} 
                  onClick={() => setInflationAdjusted(true)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', background: inflationAdjusted ? '#f59e0b' : 'transparent', color: inflationAdjusted ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                >6% Real</button>
              </div>
            </div>

            <div className="param-row">
              <span>Investment Horizon</span>
              <span>{horizon} Years</span>
            </div>
            <input type="range" min="1" max="30" value={horizon} onChange={e => setHorizon(Number(e.target.value))} style={{'--value': `${(horizon/30)*100}%`, marginBottom: 20}} />

            <div className="param-row">
              <span>Initial Capital</span>
              <div className="param-input-group">
                <span>₹</span><input type="text" readOnly value="0" />
              </div>
            </div>

            <div className="param-row" style={{ marginTop: 12 }}>
              <span>Monthly Contribution: <strong>₹{currentMonthly.toLocaleString()}</strong></span>
              <span style={{color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6}}>
                SIP Step-Up <div className="param-input-group" style={{padding: '2px 4px'}}><input type="text" defaultValue="10%" style={{width: 30}} /></div>
              </span>
            </div>

            <div className="param-row" style={{ marginTop: 24 }}>
              <span>Risk Profile</span>
              <span style={{background: '#dfbd69', color: '#111', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold', fontSize: '0.75rem'}}>{userProfile?.risk_appetite || 'Medium'}</span>
            </div>
            <input type="range" min="1" max="10" value={riskValue} onChange={e => setRiskValue(e.target.value)} style={{'--value': `${(riskValue/10)*100}%`}} />
            <div className="risk-scale">
               {[1,2,3,4,5,6,7,8,9,10].map(v => <span key={v}>{v}</span>)}
            </div>
          </div>

          {/* Panel 2: Multi-Layered Asset Allocation */}
          <div className="panel-card" style={{ position: 'relative' }}>
            <div className="panel-header">
               <span className="panel-title">Multi-Layered Asset Allocation</span>
               <div style={{display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.72rem', background: 'rgba(6,182,212,0.08)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8'}}>
                 Tree Map <span style={{width: 28, height: 14, background: 'rgba(6,182,212,0.2)', borderRadius: 7, display: 'inline-block'}}></span>
               </div>
            </div>
            <div style={{ height: 220, position: 'relative' }}>
              {isLoading ? (
                 <div className="skeleton-box" style={{ width: '180px', height: '180px', borderRadius: '50%', margin: '20px auto' }} />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationDataInner} dataKey="value" cx="50%" cy="50%" outerRadius={60} stroke="none">
                        {allocationDataInner.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Pie data={allocationDataOuter} dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={95} stroke="#0a0e17" strokeWidth={2}>
                        {allocationDataOuter.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val) => `₹${val.toLocaleString()}`} contentStyle={{background: 'rgba(10,14,23,0.95)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, backdropFilter: 'blur(12px)'}} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center projected value */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>₹{(totalProjected/100000).toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.5px' }}>Lakhs Projected</div>
                  </div>
                </>
              )}
            </div>
            <div style={{ position: 'absolute', right: 16, top: 80, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.72rem' }}>
               {allocationDataOuter.map((item, i) => (
                 <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                   <span style={{width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}40`}}></span>
                   <span style={{color: '#cbd5e1'}}>{item.name}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Panel 3: Wealth Trajectory */}
          <div className="panel-card">
             <div className="panel-header">
               <span className="panel-title">Wealth Trajectory</span>
            </div>
            <div style={{ height: 200, fontSize: '0.7rem' }}>
              {isLoading ? (
                 <div style={{ display: 'flex', gap: 10, height: '100%', alignItems: 'flex-end', paddingBottom: 20 }}>
                    <div className="skeleton-box" style={{ width: '25%', height: '30%' }} />
                    <div className="skeleton-box" style={{ width: '25%', height: '50%' }} />
                    <div className="skeleton-box" style={{ width: '25%', height: '70%' }} />
                    <div className="skeleton-box" style={{ width: '25%', height: '100%' }} />
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{top: 10, right: 30, left: -20, bottom: 0}}>
                    <defs>
                      <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dfbd69" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#dfbd69" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorWorst" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="year" tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} yrs`} />
                    <YAxis tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${(val/100000).toFixed(1)}L`} />
                    <RechartsTooltip formatter={(val) => `₹${Math.round(val).toLocaleString()}`} contentStyle={{background: 'rgba(10,14,23,0.95)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10}} />
                    <Area type="monotone" dataKey="best" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorBest)" />
                    <Area type="monotone" dataKey="average" stroke="#dfbd69" strokeWidth={2} fillOpacity={1} fill="url(#colorAvg)" />
                    <Area type="monotone" dataKey="worst" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorWorst)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Grid (70/30) */}
        <div className="bottom-row-grid">
          
          {/* Table Panel */}
          <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-header" style={{ padding: '16px 16px 0' }}>
               <span className="panel-title">Unified Portfolio Construction</span>
               <div style={{display: 'flex', gap: 8}}>
                 <div className="param-input-group"><Filter size={14} style={{marginRight: 4, color:'#94a3b8'}}/> <input type="text" placeholder="Filters..." style={{width: 80}} /></div>
                 <select style={{background: '#11151c', color: '#fff', border: '1px solid #2d3748', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem'}}>
                   <option>Sort sortable</option>
                 </select>
               </div>
            </div>

            <div className="data-table-wrapper" style={{ marginTop: 16 }}>
              <table className="dense-table">
                <thead>
                  <tr>
                    <th>Asset Class</th>
                    <th>Security Name</th>
                    <th>Weight %</th>
                    <th>Exp. Return</th>
                    <th>Risk Level</th>
                    <th>Monthly SIP</th>
                    <th>Current/Yearly</th>
                    <th>Projections (in {horizon} Yrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td colSpan="8" style={{ padding: '12px' }}><div className="skeleton-box" style={{ height: 24, width: '100%' }} /></td>
                      </tr>
                    ))
                  ) : tableData.length === 0 ? (
                    <tr>
                       <td colSpan="8" style={{textAlign:'center', padding: 48}}>
                         <Info size={48} color="#94a3b8" style={{opacity: 0.5, margin: '0 auto 16px auto', display: 'block'}} />
                         <div style={{fontSize: '1rem', color: '#94a3b8'}}>No recommendations matches your criteria.</div>
                       </td>
                    </tr>
                  ) : (
                   tableData.map((group) => (
                    <React.Fragment key={group.id}>
                      <tr style={{ background: expandedRows[group.id] ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td colSpan="8" style={{ padding: 0, borderBottom: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }} onClick={() => toggleRow(group.id)}>
                            {expandedRows[group.id] ? <ChevronDown size={14} className="toggle-icon"/> : <ChevronRight size={14} className="toggle-icon"/>}
                            {group.class} {group.hasTax && <span className="tax-badge" style={{marginLeft: 12}}>Contains Tax Savings</span>}
                          </div>
                        </td>
                      </tr>
                      {expandedRows[group.id] && group.children.map((child, idx) => {
                        return (
                          <tr key={`${group.id}-${idx}`}>
                            <td style={{ paddingLeft: 44 }}>
                               {child.taxBadge && <span className="tax-badge">{child.taxLabel || 'Tax'}</span>}
                            </td>
                            <td>{child.fullName || child.name}</td>
                            <td>{child.weight.toFixed(1)}%</td>
                            <td>{child.ret}</td>
                            <td style={{textTransform:'capitalize'}}>{child.risk}</td>
                            <td>₹{child.alloc.toLocaleString()}</td>
                            <td>₹{child.current}</td>
                            <td style={{color: '#4ade80'}}>₹{child.proj}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  )))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <div className="panel-card">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
                <div>
                  <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>Projected Portfolio Value</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#fff'}}>₹{(totalProjected/100000).toFixed(2)} Lakhs</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>Goal Progress</div>
                  <div style={{fontSize: '0.85rem', fontWeight: 600}}>Horizon Coverage: <span style={{float:'right', marginLeft: 16}}>Actively Funding</span></div>
                  <div style={{width: 150, height: 4, background: '#2d3748', borderRadius: 2, marginTop: 4, float: 'right'}}>
                    <div style={{width: '60%', height: '100%', background: '#dfbd69', borderRadius: 2}}></div>
                  </div>
                </div>
              </div>

              <div className="stats-grid" style={{marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #2d3748'}}>
                <div className="mini-stat">
                  Current Monthly SIP <strong className="stat-green">₹{currentMonthly.toLocaleString()}</strong>
                </div>
                <div className="mini-stat" style={{textAlign: 'right'}}>
                  Horizon <strong>{horizon} Yrs</strong>
                </div>
                <div className="mini-stat">
                  Diversification <strong>{allocationDataOuter.length} Categories</strong>
                </div>
                <div className="mini-stat" style={{textAlign: 'right'}}>
                  Risk Bias <strong className="stat-green">{userProfile?.risk_appetite}</strong>
                </div>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-title" style={{marginBottom: 16}}>Benchmarking</div>
              <div style={{height: 120, marginLeft: -20}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchMarkData} layout="vertical" margin={{top: 0, right: 20, left: 20, bottom: 0}}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#e2e8f0', fontSize: 11}} width={100} />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background:'#11151c', border:'1px solid #333'}}/>
                    <Bar dataKey="value" barSize={8} radius={[0,4,4,0]}>
                      {benchMarkData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="buttons-stack">
              <button className="btn-portal btn-portal-primary" onClick={onRebalance}>Rebalance Now</button>
              <button className="btn-portal" onClick={onExploreAll}>Compare Scenarios</button>
              <button className="btn-portal" onClick={() => window.print()}>Generate PDF Proposal</button>
            </div>

          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 8: RANKED RECOMMENDATION CARDS WITH "Why recommended?"
            ═══════════════════════════════════════════════════════════ */}
        {recommendations && recommendations.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 20, color: '#fff' }}>
              🏆 AI Top Picks — Ranked Recommendations
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {recommendations.map((rec, idx) => {
                const whyReasons = getWhy(rec, userProfile);
                const isExpanded = expandedWhyCards[rec.id];
                return (
                  <div key={rec.id} id={`rec-card-${rec.id}`} className="rec-card" style={{
                    background: 'linear-gradient(145deg, #0d141e, #090b12)',
                    border: `1px solid ${rec.color || 'rgba(255,255,255,0.06)'}30`,
                    borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
                    transition: 'border-color 0.3s ease'
                  }}>
                    {/* Rank badge */}
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                      color: idx === 0 ? '#000' : '#94a3b8',
                      width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.8rem'
                    }}>#{idx + 1}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 8, height: 32, borderRadius: 4, background: rec.color || '#06b6d4' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{rec.abbr || rec.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rec.name}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Return <strong style={{ color: '#4ade80' }}>{rec.rate}%</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Risk <span style={{
                          color: RISK_COLORS[rec.riskLabel] || '#f59e0b',
                          fontWeight: 600
                        }}>{rec.riskLabel}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        SIP <strong style={{ color: '#fff' }}>₹{rec.monthly_allocation?.toLocaleString()}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Lock-in <strong style={{ color: '#fff' }}>{rec.lockIn ? `${rec.lockIn}Y` : 'None'}</strong>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ML Confidence</span>
                      <span style={{ fontSize: '0.7rem', color: rec.color || '#06b6d4' }}>{Math.round((rec.ml_confidence || 0) * 100)}%</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 12 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (rec.ml_confidence || 0) * 100)}%`, background: rec.color || '#06b6d4', borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>

                    {/* Why recommended */}
                    <button
                      onClick={() => toggleWhyCard(rec.id)}
                      style={{
                        background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer',
                        fontSize: '0.82rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      Why recommended?
                    </button>
                    {isExpanded && (
                      <div style={{
                        marginTop: 10, padding: 12,
                        background: 'rgba(6, 182, 212, 0.04)',
                        border: '1px solid rgba(6, 182, 212, 0.1)',
                        borderRadius: 10, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6
                      }}>
                        {whyReasons.map((reason, i) => (
                          <div key={i} style={{ marginBottom: 6, display: 'flex', gap: 6 }}>
                            <span style={{ color: '#06b6d4' }}>•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 9.5: SHAP EXPLAINABILITY PANEL
            ═══════════════════════════════════════════════════════════ */}
        {explanation && (
          <ExplainabilityPanel
            explanation={explanation}
            instrumentName={recommendations?.[0]?.name || recommendations?.[0]?.id}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 10: AI ADVISORY CARD — Gemini-generated text
            ═══════════════════════════════════════════════════════════ */}
        {recommendations && recommendations[0]?.advisory_text && (
          <div style={{
            marginTop: 40, padding: 24,
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1))',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 20, position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 100, height: 100,
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
              filter: 'blur(20px)'
            }}></div>
            
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: '#06b6d4',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
              }}>
                <Zap size={24} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: '#fff' }}>
                  Genie's Personal Advisory Summary
                </h3>
                <div style={{
                  fontSize: '1rem', color: '#cbd5e1', lineHeight: 1.7, 
                  whiteSpace: 'pre-line', fontStyle: 'italic'
                }}>
                  {recommendations[0].advisory_text}
                </div>
                <div style={{
                  marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: '0.75rem', color: '#94a3b8'
                }}>
                  <Shield size={14} />
                  Powered by Gemini 1.5 Flash • Analysis based on Indian Tax Code FY 2025-26
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 9: BROWSE BY RISK LEVEL — Collapsible groups
            ═══════════════════════════════════════════════════════════ */}
        {recommendations && recommendations.length > 0 && (
          <div style={{ marginTop: 40, marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20, color: '#fff' }}>
              📊 Browse by Risk Level
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {/* Low Risk Group */}
              <div style={{
                background: '#0d141e', border: '1px solid rgba(20, 184, 166, 0.2)',
                borderRadius: 16, overflow: 'hidden'
              }}>
                <button
                  onClick={() => setRiskGroupOpen(prev => ({ ...prev, low: !prev.low }))}
                  style={{
                    width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: '0.95rem', fontWeight: 600
                  }}
                >
                  <Shield size={18} color="#14b8a6" />
                  Low Risk
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {riskGroups.low.length} instruments
                  </span>
                  {riskGroupOpen.low ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {riskGroupOpen.low && (
                  <div style={{ padding: '0 18px 16px' }}>
                    {riskGroups.low.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>No eligible low-risk instruments for your profile.</div>
                    ) : riskGroups.low.map(inv => (
                      <div key={inv.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{inv.abbr || inv.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Post-tax: {inv.postTaxRate?.toFixed(1)}% · <span style={{ color: RISK_COLORS[inv.riskLabel] }}>{inv.riskLabel}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => scrollToCard(inv.id)}
                          style={{
                            background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)',
                            color: '#14b8a6', borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >View Details</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medium Risk Group */}
              <div style={{
                background: '#0d141e', border: '1px solid rgba(249, 115, 22, 0.2)',
                borderRadius: 16, overflow: 'hidden'
              }}>
                <button
                  onClick={() => setRiskGroupOpen(prev => ({ ...prev, medium: !prev.medium }))}
                  style={{
                    width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: '0.95rem', fontWeight: 600
                  }}
                >
                  <TrendingUp size={18} color="#f97316" />
                  Medium Risk
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {riskGroups.medium.length} instruments
                  </span>
                  {riskGroupOpen.medium ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {riskGroupOpen.medium && (
                  <div style={{ padding: '0 18px 16px' }}>
                    {riskGroups.medium.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>No eligible medium-risk instruments for your profile.</div>
                    ) : riskGroups.medium.map(inv => (
                      <div key={inv.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{inv.abbr || inv.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Post-tax: {inv.postTaxRate?.toFixed(1)}% · <span style={{ color: RISK_COLORS[inv.riskLabel] }}>{inv.riskLabel}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => scrollToCard(inv.id)}
                          style={{
                            background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)',
                            color: '#f97316', borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >View Details</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* High Risk Group */}
              <div style={{
                background: '#0d141e', border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 16, overflow: 'hidden'
              }}>
                <button
                  onClick={() => setRiskGroupOpen(prev => ({ ...prev, high: !prev.high }))}
                  style={{
                    width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: '0.95rem', fontWeight: 600
                  }}
                >
                  <Zap size={18} color="#ef4444" />
                  High Risk
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {riskGroups.high.length} instruments
                  </span>
                  {riskGroupOpen.high ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {riskGroupOpen.high && (
                  <div style={{ padding: '0 18px 16px' }}>
                    {riskGroups.high.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>No eligible high-risk instruments for your profile.</div>
                    ) : riskGroups.high.map(inv => (
                      <div key={inv.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{inv.abbr || inv.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Post-tax: {inv.postTaxRate?.toFixed(1)}% · <span style={{ color: RISK_COLORS[inv.riskLabel] }}>{inv.riskLabel}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => scrollToCard(inv.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444', borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >View Details</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <SebiDisclaimer />
      </div>
    </div>
  );
};

export default RecommendationDashboard;
