import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatINR } from '../utils/indianNumberFormat';
import { fetchTaxComputation, getTaxSavingRecommendations, SECTION_80C_LIMIT, SECTION_80CCD_1B_LIMIT } from '../utils/taxCalculator';
import { investmentDatabase } from '../investmentDatabase';
import { ShieldCheck } from 'lucide-react';
import './TaxScreen.css';

const TaxScreen = ({ profile }) => {
  const annualIncome = (profile?.monthly_income || 65000) * 12;
  const [regime, setRegime] = useState(profile?.taxRegime || 'new');
  const [existing80C, setExisting80C] = useState(0);
  const [existing80CCD, setExisting80CCD] = useState(0);

  // Fetch tax from backend API (authoritative source)
  const [baseTax, setBaseTax] = useState(null);
  const [oldRegimeTax, setOldRegimeTax] = useState(null);
  const [newRegimeTax, setNewRegimeTax] = useState(null);

  useEffect(() => {
    fetchTaxComputation(annualIncome, regime)
      .then(setBaseTax)
      .catch(() => setBaseTax({ taxAmount: 0, effectiveRate: 0, rebateApplied: false, taxableIncome: annualIncome, taxBeforeCess: 0 }));
    fetchTaxComputation(annualIncome, 'old')
      .then(setOldRegimeTax)
      .catch(() => {});
    fetchTaxComputation(annualIncome, 'new')
      .then(setNewRegimeTax)
      .catch(() => {});
  }, [annualIncome, regime]);

  // Compute remaining 80C/80CCD limits (simple arithmetic, not tax computation)
  const remaining80C = Math.max(0, SECTION_80C_LIMIT - existing80C);
  const remaining80CCD = Math.max(0, SECTION_80CCD_1B_LIMIT - existing80CCD);

  const taxSavingRecs = useMemo(() => {
    return getTaxSavingRecommendations(remaining80C, remaining80CCD, investmentDatabase);
  }, [remaining80C, remaining80CCD]);

  // Use backend-computed values
  const totalTax = baseTax?.taxAmount || 0;
  const effectiveRate = baseTax?.effectiveRate || 0;
  const taxableIncome = baseTax?.taxableIncome || 0;

  // Estimate optimization savings using marginal rate (not slab recomputation)
  const marginalRate = baseTax?.taxBeforeCess > 0 ? (baseTax.taxBeforeCess / taxableIncome) : 0;
  const potentialSaving = regime === 'old' ? Math.round((remaining80C + remaining80CCD) * marginalRate * 1.04) : 0;

  const betterRegime = (newRegimeTax && oldRegimeTax)
    ? (newRegimeTax.taxAmount < oldRegimeTax.taxAmount ? 'New' : (oldRegimeTax.taxAmount < newRegimeTax.taxAmount ? 'Old' : 'Either'))
    : 'Either';
  const betterRegimeSavings = (newRegimeTax && oldRegimeTax)
    ? Math.abs(oldRegimeTax.taxAmount - newRegimeTax.taxAmount) : 0;

  // Regime comparison chart — always has meaningful data
  const regimeChartData = [
    { label: 'Old Regime', value: Math.round(oldRegimeTax?.taxAmount || 0), fill: '#f97316' },
    { label: 'New Regime', value: Math.round(newRegimeTax?.taxAmount || 0), fill: '#3b82f6' },
  ];

  const optimizationChartData = [
    { label: 'Current Tax', value: Math.round(totalTax), fill: '#ef4444' },
    { label: 'After Optimization', value: Math.round(Math.max(0, totalTax - potentialSaving)), fill: '#22c55e' },
  ];

  return (
    <div className="tax-page">
      <h1 className="page-title">🧮 Tax Saving Optimizer</h1>
      <p className="page-subtitle">Maximize your deductions and minimize tax liability under Indian IT laws</p>

      {/* Regime Toggle + Inputs */}
      <div className="tax-controls">
        <div className="tax-control-group">
          <label>Annual Income</label>
          <div className="tax-income-display">{formatINR(annualIncome)}</div>
        </div>
        <div className="tax-control-group">
          <label>Tax Regime</label>
          <div className="tax-regime-toggle">
            <button className={`regime-btn ${regime === 'old' ? 'regime-btn--active' : ''}`} onClick={() => setRegime('old')}>Old Regime</button>
            <button className={`regime-btn ${regime === 'new' ? 'regime-btn--active' : ''}`} onClick={() => setRegime('new')}>New Regime</button>
          </div>
          {betterRegime !== 'Either' && (
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px 12px', borderRadius: '6px', display: 'inline-block', border: '1px solid rgba(16,185,129,0.2)' }}>
              <strong>Better for you:</strong> {betterRegime} Regime (Saves {formatINR(betterRegimeSavings)})
            </div>
          )}
        </div>
        {regime === 'old' && (
          <>
            <div className="tax-control-group">
              <label>Existing 80C Investments (₹)</label>
              <input type="number" value={existing80C} onChange={e => setExisting80C(Number(e.target.value))} max={SECTION_80C_LIMIT} className="tax-input" />
            </div>
            <div className="tax-control-group">
              <label>Existing 80CCD(1B) — NPS (₹)</label>
              <input type="number" value={existing80CCD} onChange={e => setExisting80CCD(Number(e.target.value))} max={SECTION_80CCD_1B_LIMIT} className="tax-input" />
            </div>
          </>
        )}
      </div>

      {/* Tax Summary Cards */}
      <div className="tax-summary-grid">
        <div className="tax-summary-card">
          <span className="tax-sum-label">Taxable Income</span>
          <span className="tax-sum-value">{formatINR(taxableIncome)}</span>
        </div>
        <div className="tax-summary-card">
          <span className="tax-sum-label">Total Tax Payable</span>
          <span className="tax-sum-value" style={{ color: '#ef4444' }}>{formatINR(totalTax)}</span>
        </div>
        <div className="tax-summary-card">
          <span className="tax-sum-label">Effective Tax Rate</span>
          <span className="tax-sum-value">{effectiveRate}%</span>
        </div>
        <div className="tax-summary-card">
          <span className="tax-sum-label">Potential Tax Saving</span>
          <span className="tax-sum-value" style={{ color: '#22c55e' }}>{formatINR(potentialSaving)}</span>
        </div>
      </div>

      {/* Zero-Tax Celebration */}
      {totalTax === 0 && baseTax && (
        <div className="tax-zero-banner">
          <div className="tax-zero-icon">
            <ShieldCheck size={38} color="#34d399" strokeWidth={2.5} />
          </div>
          <div>
            <strong>Zero Tax Liability!</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#a7f3d0' }}>
              {baseTax.rebateApplied 
                ? `Section 87A rebate applied — your taxable income of ${formatINR(taxableIncome)} qualifies for full rebate under the ${regime === 'new' ? 'New' : 'Old'} Regime.`
                : 'Your income falls below the taxable threshold.'}
            </p>
          </div>
        </div>
      )}

      {/* Old vs New Regime Comparison Chart — always shows data */}
      <div className="tax-chart-wrapper">
        <h3>Old Regime vs New Regime Comparison</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={regimeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} />
              <YAxis tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', color: '#f8fafc' }} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={80}>
                {regimeChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {betterRegime !== 'Either' && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.95rem', color: '#10b981', fontWeight: 600 }}>
            ✅ {betterRegime} Regime saves you {formatINR(betterRegimeSavings)}
          </div>
        )}
      </div>

      {/* Optimization Chart — only when there's actual tax */}
      {totalTax > 0 && regime === 'old' && potentialSaving > 0 && (
        <div className="tax-chart-wrapper">
          <h3>Tax Before vs After Optimization</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={optimizationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} />
                <YAxis tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#0f172a', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '12px', color: '#f8fafc' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={80}>
                  {optimizationChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Remaining Limits */}
      {regime === 'old' && (
        <div className="tax-limits-row">
          <div className="tax-limit-card">
            <div className="tax-limit-header">Section 80C</div>
            <div className="tax-limit-bar-track">
              <div className="tax-limit-bar-fill" style={{ width: `${((SECTION_80C_LIMIT - remaining80C) / SECTION_80C_LIMIT) * 100}%` }} />
            </div>
            <div className="tax-limit-info">
              Used: {formatINR(SECTION_80C_LIMIT - remaining80C)} / {formatINR(SECTION_80C_LIMIT)}
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>Remaining: {formatINR(remaining80C)}</span>
            </div>
          </div>
          <div className="tax-limit-card">
            <div className="tax-limit-header">Section 80CCD(1B) — NPS</div>
            <div className="tax-limit-bar-track">
              <div className="tax-limit-bar-fill tax-limit-bar-fill--purple" style={{ width: `${((SECTION_80CCD_1B_LIMIT - remaining80CCD) / SECTION_80CCD_1B_LIMIT) * 100}%` }} />
            </div>
            <div className="tax-limit-info">
              Used: {formatINR(SECTION_80CCD_1B_LIMIT - remaining80CCD)} / {formatINR(SECTION_80CCD_1B_LIMIT)}
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>Remaining: {formatINR(remaining80CCD)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {regime === 'old' && taxSavingRecs.length > 0 && (
        <div className="tax-recs-section">
          <h3>Recommended Tax-Saving Investments</h3>
          <div className="tax-recs-grid">
            {taxSavingRecs.map(rec => (
              <div key={rec.id + rec.section} className="tax-rec-card">
                <div className="tax-rec-name">{rec.name}</div>
                <div className="tax-rec-section">Section {rec.section}</div>
                <div className="tax-rec-amount">Invest up to {formatINR(rec.suggestedAmount)}</div>
                <div className="tax-rec-return">{Number(rec.expected_return_min).toFixed(2)}% – {Number(rec.expected_return_max).toFixed(2)}% returns</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxScreen;
