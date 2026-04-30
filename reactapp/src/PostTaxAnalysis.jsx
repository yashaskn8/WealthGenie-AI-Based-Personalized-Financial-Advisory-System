import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { computeRealReturn } from './utils/postTaxEngine';
import { formatINR, getMarginalRate, computePostTaxReturn } from './recommendationEngine';

import './components/TaxScreen.css';

const PostTaxAnalysis = ({ profile, recommendations }) => {
  const [regime, setRegime] = useState('new');
  const [inflationRate, setInflationRate] = useState(6.0);

  // 1. Calculate Marginal Tax Rate using the recommendation engine's getMarginalRate
  const { marginalRate, effectiveRate } = useMemo(() => {
    const annualIncome = profile.monthly_income * 12;
    const mr = getMarginalRate(annualIncome, regime);
    return { marginalRate: mr, effectiveRate: mr };
  }, [profile.monthly_income, regime]);

  // 2. Map recommendations to Post-Tax Metrics
  const postTaxData = useMemo(() => {
    const annualIncome = profile.monthly_income * 12;
    const annualSavings = (profile.monthly_savings || 0) * 12;

    return recommendations.map(inv => {
      const holdingMonths = profile.investment_horizon * 12;
      const totalInvested = inv.monthly_allocation * holdingMonths;
      const projectedValue = inv.projected_value;
      const gainAmount = Math.max(0, projectedValue - totalInvested);

      // Use recommendation engine's post-tax computation (consistent with backend logic)
      const ptResult = computePostTaxReturn(inv, annualSavings, annualIncome, profile);
      const nominalReturn = inv.expected_return_max || inv.rate || 0;
      const postTaxReturn = ptResult.postTaxRate || nominalReturn;
      const realReturn = computeRealReturn(postTaxReturn, inflationRate / 100);
      const taxRatePercent = marginalRate * 100;

      // Determine tax type label from instrument
      const taxTypeLabels = {
        eee: 'Exempt (EEE Status)', slab: 'Added to Income Slab',
        ltcg: 'LTCG (12.5%)', elss: 'ELSS LTCG (12.5%)',
        nps: 'NPS (Partial EET)', sgb: 'SGB (Interest at Slab)',
      };
      const taxType = taxTypeLabels[inv.taxType] || 'Capital Gains';

      return {
        ...inv,
        taxDetails: { taxType, taxRatePercent, postTaxGain: gainAmount * (postTaxReturn / nominalReturn) },
        totalInvested,
        wealthGained: gainAmount * (postTaxReturn / nominalReturn),
        nominalReturn,
        postTaxReturn,
        realReturn,
      };
    });
  }, [recommendations, profile, marginalRate, inflationRate]);

  return (
    <div className="tax-page">
      <motion.header 
        style={{ marginBottom: 40, textAlign: 'center' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <span style={{ 
            display: 'inline-flex', 
            width: 36, height: 36, 
            background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', 
            borderRadius: 8, 
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.7)' 
          }}></span>
          Academic Post-Tax & Real Return Engine
        </h1>
        <p className="page-subtitle">
          Demonstrating true wealth creation after standard Indian taxation and {inflationRate}% inflation erosion.
        </p>
      </motion.header>

      {/* Control Panel */}
      <motion.div 
        className="tax-controls" 
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="tax-control-group">
          <label>Tax Regime Analysis</label>
          <div className="tax-regime-toggle">
            <button className={`regime-btn ${regime === 'old' ? 'regime-btn--active' : ''}`} onClick={() => setRegime('old')}>Old Regime</button>
            <button className={`regime-btn ${regime === 'new' ? 'regime-btn--active' : ''}`} onClick={() => setRegime('new')}>New Regime</button>
          </div>
        </div>

        <div className="tax-control-group">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Inflation Rate Assumption</span>
            <span style={{ color: '#0ea5e9', fontWeight: 600 }}>{inflationRate.toFixed(1)}%</span>
          </label>
          <input 
            type="range" 
            min="2" max="12" step="0.5" 
            value={inflationRate} 
            onChange={(e) => setInflationRate(parseFloat(e.target.value))}
            className="tax-slider"
            style={{ '--val': `${((inflationRate - 2) / 10) * 100}%` }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '12px' }}>
            <span>2%</span>
            <span>Historic Avg (6%)</span>
            <span>12%</span>
          </div>
        </div>

        <div className="tax-control-group tax-bracket-box">
           <label style={{ color: '#cbd5e1', marginBottom: 4 }}>Your Computed Bracket</label>
           <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', marginBottom: 2 }}>
             {(marginalRate * 100).toFixed(0)}% <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>Marginal</span>
           </div>
           <div style={{ fontSize: '0.95rem', color: '#0ea5e9', fontWeight: 600 }}>
             Effective Tax Rate: {(effectiveRate * 100).toFixed(1)}%
           </div>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div 
        className="tax-chart-wrapper" 
        style={{ marginTop: '40px' }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.5px' }}>How Taxation & Inflation Reduce Your Gains</h3>
        <div style={{ height: 400, marginTop: '20px' }} className="tax-bar-chart-glow">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={postTaxData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
              <defs>
                <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#0369a1" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="colorPostTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: 12, color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '20px', fontWeight: 600 }}/>
              <Bar dataKey="nominalReturn" name="Nominal CAGR" fill="url(#colorNominal)" radius={[6,6,0,0]} barSize={36} />
              <Bar dataKey="postTaxReturn" name="Post-Tax CAGR" fill="url(#colorPostTax)" radius={[6,6,0,0]} barSize={36} />
              <Bar dataKey="realReturn" name="Real Return (Post-Inflation)" fill="url(#colorReal)" radius={[6,6,0,0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Deep Analytical Table */}
      <motion.div 
        className="tax-chart-wrapper" 
        style={{ marginTop: '40px', padding: '0', overflow: 'hidden' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem' }}>Detailed Wealth Erosion Analysis</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="comparison-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)' }}>
              <tr>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Investment Vector</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Nominal Return</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Tax Treatment</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Post-Tax CAGR</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Real Return</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Final Wealth Gained</th>
              </tr>
            </thead>
            <tbody>
              {postTaxData.map((data, i) => (
                <motion.tr 
                  key={i} 
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  whileHover={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)', 
                    scale: 1.01,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    borderLeft: '4px solid #0ea5e9'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>{data.name} <br/><span style={{fontSize:'0.75rem', color:'#64748b', fontWeight:'normal'}}>{data.category}</span></td>
                  <td style={{ padding: '16px 24px', color: '#3b82f6', fontWeight: 500 }}>{data.nominalReturn.toFixed(1)}%</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{data.taxDetails.taxType}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>Rate: {data.taxDetails.taxRatePercent}%</div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#a855f7', fontWeight: 600, fontSize: '1.05rem' }}>{data.postTaxReturn.toFixed(1)}%</td>
                  <td style={{ padding: '16px 24px', color: data.realReturn > 0 ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '1.05rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {data.realReturn > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      {data.realReturn > 0 ? '+' : ''}{data.realReturn.toFixed(1)}%
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: '#f8fafc', fontSize: '1.05rem' }}>{formatINR(data.wealthGained)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>
  );
};

export default PostTaxAnalysis;
