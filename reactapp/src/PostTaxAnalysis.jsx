import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
      <header style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 className="page-title">🏦 Academic Post-Tax & Real Return Engine</h1>
        <p className="page-subtitle">
          Demonstrating true wealth creation after standard Indian taxation and {inflationRate}% inflation erosion.
        </p>
      </header>

      {/* Control Panel */}
      <div className="tax-controls" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
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
            className="tax-input"
            style={{ 
              padding: '0', 
              height: '6px', 
              appearance: 'none', 
              background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((inflationRate - 2) / 10) * 100}%, rgba(255,255,255,0.1) ${((inflationRate - 2) / 10) * 100}%, rgba(255,255,255,0.1) 100%)`, 
              borderRadius: '3px', 
              outline: 'none' 
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
            <span>2%</span>
            <span>Historic Avg (6%)</span>
            <span>12%</span>
          </div>
        </div>

        <div className="tax-control-group" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(168, 85, 247, 0.1))', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
           <label style={{ color: '#cbd5e1', marginBottom: 4 }}>Your Computed Bracket</label>
           <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f8fafc', marginBottom: 2 }}>
             {(marginalRate * 100).toFixed(0)}% <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>Marginal</span>
           </div>
           <div style={{ fontSize: '0.95rem', color: '#0ea5e9', fontWeight: 500 }}>
             Effective Tax Rate: {(effectiveRate * 100).toFixed(1)}%
           </div>
        </div>
      </div>

      {/* Chart */}
      <div className="tax-chart-wrapper" style={{ marginTop: '40px' }}>
        <h3>How Taxation & Inflation Reduce Your Gains</h3>
        <div style={{ height: 400, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={postTaxData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: 12, color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '20px' }}/>
              <Bar dataKey="nominalReturn" name="Nominal CAGR" fill="#3b82f6" radius={[6,6,0,0]} barSize={40} />
              <Bar dataKey="postTaxReturn" name="Post-Tax CAGR" fill="#a855f7" radius={[6,6,0,0]} barSize={40} />
              <Bar dataKey="realReturn" name="Real Return (Post-Inflation)" fill="#10b981" radius={[6,6,0,0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deep Analytical Table */}
      <div className="tax-chart-wrapper" style={{ marginTop: '40px', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ margin: 0 }}>Detailed Wealth Erosion Analysis</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="comparison-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
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
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>{data.name} <br/><span style={{fontSize:'0.75rem', color:'#64748b', fontWeight:'normal'}}>{data.category}</span></td>
                  <td style={{ padding: '16px 24px', color: '#3b82f6', fontWeight: 500 }}>{data.nominalReturn.toFixed(1)}%</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{data.taxDetails.taxType}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>Rate: {data.taxDetails.taxRatePercent}%</div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#a855f7', fontWeight: 600, fontSize: '1.05rem' }}>{data.postTaxReturn.toFixed(1)}%</td>
                  <td style={{ padding: '16px 24px', color: data.realReturn > 0 ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '1.05rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {data.realReturn > 0 ? <span style={{fontSize:'1.2rem'}}>📈</span> : <span style={{fontSize:'1.2rem'}}>📉</span>}
                      {data.realReturn > 0 ? '+' : ''}{data.realReturn.toFixed(1)}%
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: '#f8fafc', fontSize: '1.05rem' }}>{formatINR(data.wealthGained)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default PostTaxAnalysis;
