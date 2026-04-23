import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatINR } from '../utils/indianNumberFormat';
import { calculateTax, getTaxSavingRecommendations, SECTION_80C_LIMIT, SECTION_80CCD_1B_LIMIT } from '../utils/taxCalculator';
import { investmentDatabase } from '../investmentDatabase';
import './TaxScreen.css';

const TaxScreen = ({ profile }) => {
  const annualIncome = (profile?.monthly_income || 65000) * 12;
  const [regime, setRegime] = useState(profile?.taxRegime || 'new');
  const [existing80C, setExisting80C] = useState(0);
  const [existing80CCD, setExisting80CCD] = useState(0);

  const taxResult = useMemo(() => {
    return calculateTax(annualIncome, regime, existing80C, existing80CCD);
  }, [annualIncome, regime, existing80C, existing80CCD]);

  const maxedTaxResult = useMemo(() => {
    return calculateTax(annualIncome, regime, SECTION_80C_LIMIT, SECTION_80CCD_1B_LIMIT);
  }, [annualIncome, regime]);

  const taxSavingRecs = useMemo(() => {
    return getTaxSavingRecommendations(taxResult.remaining80C, taxResult.remaining80CCD, investmentDatabase);
  }, [taxResult]);

  const potentialSaving = taxResult.totalTax - maxedTaxResult.totalTax;

  // Better for you logic
  const oldRegimeTax = useMemo(() => calculateTax(annualIncome, 'old', existing80C, existing80CCD).totalTax, [annualIncome, existing80C, existing80CCD]);
  const newRegimeTax = useMemo(() => calculateTax(annualIncome, 'new', 0, 0).totalTax, [annualIncome]); // New regime has no 80C/80CCD

  const betterRegime = newRegimeTax < oldRegimeTax ? 'New' : (oldRegimeTax < newRegimeTax ? 'Old' : 'Either');
  const betterRegimeSavings = Math.abs(oldRegimeTax - newRegimeTax);

  const chartData = [
    { label: 'Current Tax', value: Math.round(taxResult.totalTax), fill: '#ef4444' },
    { label: 'After Optimization', value: Math.round(maxedTaxResult.totalTax), fill: '#22c55e' },
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
          <span className="tax-sum-value">{formatINR(taxResult.taxableIncome)}</span>
        </div>
        <div className="tax-summary-card">
          <span className="tax-sum-label">Total Tax Payable</span>
          <span className="tax-sum-value" style={{ color: '#ef4444' }}>{formatINR(taxResult.totalTax)}</span>
        </div>
        <div className="tax-summary-card">
          <span className="tax-sum-label">Effective Tax Rate</span>
          <span className="tax-sum-value">{taxResult.effectiveRate}%</span>
        </div>
        <div className="tax-summary-card">
          <span className="tax-sum-label">Potential Tax Saving</span>
          <span className="tax-sum-value" style={{ color: '#22c55e' }}>{formatINR(potentialSaving)}</span>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="tax-chart-wrapper">
        <h3>Tax Before vs After Optimization</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} />
              <YAxis tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#0B131E', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '10px' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Remaining Limits */}
      {regime === 'old' && (
        <div className="tax-limits-row">
          <div className="tax-limit-card">
            <div className="tax-limit-header">Section 80C</div>
            <div className="tax-limit-bar-track">
              <div className="tax-limit-bar-fill" style={{ width: `${((SECTION_80C_LIMIT - taxResult.remaining80C) / SECTION_80C_LIMIT) * 100}%` }} />
            </div>
            <div className="tax-limit-info">
              Used: {formatINR(SECTION_80C_LIMIT - taxResult.remaining80C)} / {formatINR(SECTION_80C_LIMIT)}
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>Remaining: {formatINR(taxResult.remaining80C)}</span>
            </div>
          </div>
          <div className="tax-limit-card">
            <div className="tax-limit-header">Section 80CCD(1B) — NPS</div>
            <div className="tax-limit-bar-track">
              <div className="tax-limit-bar-fill tax-limit-bar-fill--purple" style={{ width: `${((SECTION_80CCD_1B_LIMIT - taxResult.remaining80CCD) / SECTION_80CCD_1B_LIMIT) * 100}%` }} />
            </div>
            <div className="tax-limit-info">
              Used: {formatINR(SECTION_80CCD_1B_LIMIT - taxResult.remaining80CCD)} / {formatINR(SECTION_80CCD_1B_LIMIT)}
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>Remaining: {formatINR(taxResult.remaining80CCD)}</span>
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
                <div className="tax-rec-return">{rec.expected_return_min}% – {rec.expected_return_max}% returns</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxScreen;
