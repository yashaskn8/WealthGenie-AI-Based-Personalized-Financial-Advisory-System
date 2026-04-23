import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateIncomeTax, calculatePostTaxReturn } from './utils/postTaxEngine';
import { formatINR } from './recommendationEngine';

const PostTaxAnalysis = ({ profile, recommendations }) => {
  const [regime, setRegime] = useState('new');
  const [inflationRate, setInflationRate] = useState(6.0);

  // 1. Calculate Marginal Tax Rate given profile Income
  const { marginalRate, taxPayable, effectiveRate } = useMemo(() => {
    return calculateIncomeTax(profile.monthly_income * 12, regime);
  }, [profile.monthly_income, regime]);

  // 2. Map recommendations to Post-Tax Metrics
  const postTaxData = useMemo(() => {
    return recommendations.map(inv => {
      const holdingMonths = profile.investment_horizon * 12;
      const totalInvested = inv.monthly_allocation * holdingMonths;
      const projectedValue = inv.projected_value;
      const gainAmount = Math.max(0, projectedValue - totalInvested);

      const taxDetails = calculatePostTaxReturn(inv, holdingMonths, gainAmount, marginalRate, inflationRate / 100);

      // Post tax actual wealth gained
      const wealthGained = taxDetails.postTaxGain;

      return {
        ...inv,
        taxDetails,
        totalInvested,
        wealthGained,
        nominalReturn: inv.expected_return_max,
        postTaxReturn: taxDetails.postTaxReturnRate,
        realReturn: taxDetails.realReturnRate
      };
    });
  }, [recommendations, profile.investment_horizon, marginalRate, inflationRate]);

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto', color: '#fff' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 className="page-title">🏦 Academic Post-Tax & Real Return Engine</h1>
        <p className="page-subtitle">
          Demonstrating true wealth creation after standard Indian taxation and {inflationRate}% inflation erosion.
        </p>
      </header>

      {/* Control Panel */}
      <div style={{ background: '#0B131E', borderRadius: 20, padding: 24, marginBottom: 40, border: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8' }}>Tax Regime Analysis</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className={`btn-outline ${regime === 'old' ? 'active' : ''}`} 
              onClick={() => setRegime('old')}
              style={regime === 'old' ? {background: 'rgba(139, 92, 246, 0.2)', borderColor: '#8b5cf6', color: '#fff'} : {}}
            >
              Old Regime
            </button>
            <button 
              className={`btn-outline ${regime === 'new' ? 'active' : ''}`} 
              onClick={() => setRegime('new')}
              style={regime === 'new' ? {background: 'rgba(6, 182, 212, 0.2)', borderColor: '#06b6d4', color: '#fff'} : {}}
            >
              New Regime
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8' }}>Inflation Rate Assumption ({inflationRate}%)</label>
          <input 
            type="range" 
            min="2" max="12" step="0.5" 
            value={inflationRate} 
            onChange={(e) => setInflationRate(parseFloat(e.target.value))}
            style={{ width: 200, accentColor: '#ef4444' }}
          />
        </div>

        <div>
           <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8' }}>Your Computed Bracket</label>
           <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Marginal Rate: {(marginalRate * 100).toFixed(0)}%</div>
           <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Effective Tax: {(effectiveRate * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: 'linear-gradient(145deg, #0d141e, #090b12)', padding: 32, borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 24, paddingLeft: 12 }}>How Taxation & Inflation Reduce Your Gains</h2>
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={postTaxData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `${val}%`} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: '#0B131E', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="nominalReturn" name="Nominal CAGR" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="postTaxReturn" name="Post-Tax CAGR" fill="#8b5cf6" radius={[4,4,0,0]} />
              <Bar dataKey="realReturn" name="Real Return (Post-Inflation)" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deep Analytical Table */}
      <div style={{ background: '#0B131E', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <table className="comparison-table" style={{ width: '100%', margin: 0 }}>
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr>
              <th>Investment Vector</th>
              <th>Nominal Return</th>
              <th>Tax Type Applied</th>
              <th>Post-Tax CAGR</th>
              <th>Real Return (Real Purchasing Power)</th>
              <th style={{ textAlign: 'right' }}>Final Wealth Gained</th>
            </tr>
          </thead>
          <tbody>
            {postTaxData.map((data, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{data.name} <br/><span style={{fontSize:'0.75rem', color:'#64748b', fontWeight:'normal'}}>{data.category}</span></td>
                <td style={{ color: '#3b82f6' }}>{data.nominalReturn.toFixed(1)}%</td>
                <td>
                  {data.taxDetails.taxType} 
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Rate: {data.taxDetails.taxRatePercent}%</div>
                </td>
                <td style={{ color: '#a855f7', fontWeight: 'bold' }}>{data.postTaxReturn.toFixed(1)}%</td>
                <td style={{ color: data.realReturn > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  {data.realReturn > 0 ? '+' : ''}{data.realReturn.toFixed(1)}%
                </td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatINR(data.wealthGained)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default PostTaxAnalysis;
