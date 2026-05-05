import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { formatINR } from '../utils/indianNumberFormat';
import { fetchTaxComputation, getTaxSavingRecommendations, SECTION_80C_LIMIT, SECTION_80CCD_1B_LIMIT } from '../utils/taxCalculator';
import { investmentDatabase } from '../investmentDatabase';
import { ShieldCheck, Calculator, Wallet, Receipt, Percent, PiggyBank, TrendingDown, Info, Sparkles, IndianRupee } from 'lucide-react';
import './TaxScreen.css';

const TaxScreen = ({ profile }) => {
  const annualIncome = (profile?.monthly_income || 65000) * 12;
  const [regime, setRegime] = useState(profile?.taxRegime || 'new');
  const [existing80C, setExisting80C] = useState('');
  const [existing80CCD, setExisting80CCD] = useState('');

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
    { label: 'Old Regime', value: Math.round(oldRegimeTax?.taxAmount || 0), fill: 'url(#colorOld)' },
    { label: 'New Regime', value: Math.round(newRegimeTax?.taxAmount || 0), fill: 'url(#colorNew)' },
  ];

  const optimizationChartData = [
    { label: 'Current Tax', value: Math.round(totalTax), fill: 'url(#colorCurrent)' },
    { label: 'After Optimization', value: Math.round(Math.max(0, totalTax - potentialSaving)), fill: 'url(#colorOpt)' },
  ];

  return (
    <div className="tax-page">
      <motion.header 
        style={{ marginBottom: 40, textAlign: 'center' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(139, 92, 246, 0.1))',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '14px',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(56, 189, 248, 0.1)'
          }}>
            <Calculator size={28} color="#38bdf8" />
          </div>
          Tax Saving Optimizer
        </h1>
        <p className="page-subtitle">Maximize your deductions and minimize tax liability under Indian IT laws</p>
      </motion.header>

      {/* Regime Toggle + Inputs */}
      <motion.div 
        className="tax-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="tax-control-card">
          <div className="tax-control-card-header">
            <div className="tax-control-card-icon" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
              <Wallet size={20} />
            </div>
            <label>Annual Income</label>
          </div>
          <div className="tax-income-display">{formatINR(annualIncome)}</div>
          <div className="tax-income-sub">
            <span>Monthly: {formatINR(Math.round(annualIncome / 12))}</span>
            <span className="tax-income-badge">FY 2025-26</span>
          </div>
        </div>
        <div className="tax-control-card">
          <div className="tax-control-card-header">
            <div className="tax-control-card-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
              <Calculator size={20} />
            </div>
            <label>Tax Regime</label>
          </div>
          <div className="tax-regime-toggle">
            <button className={`regime-btn ${regime === 'old' ? 'regime-btn--active' : ''}`} onClick={() => setRegime('old')}>Old Regime</button>
            <button className={`regime-btn ${regime === 'new' ? 'regime-btn--active' : ''}`} onClick={() => setRegime('new')}>New Regime</button>
          </div>
          {betterRegime !== 'Either' && (
            <div className="tax-better-badge">
              <ShieldCheck size={14} />
              <span><strong>Better for you:</strong> {betterRegime} Regime (Saves {formatINR(betterRegimeSavings)})</span>
            </div>
          )}
        </div>
        {regime === 'old' && (
          <>
            <div className="tax-control-card">
              <div className="tax-control-card-header">
                <div className="tax-control-card-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                  <PiggyBank size={20} />
                </div>
                <label>Existing 80C Investments (₹)</label>
              </div>
              <input 
                type="number" 
                value={existing80C} 
                onChange={e => setExisting80C(e.target.value === '' ? '' : Number(e.target.value))} 
                max={SECTION_80C_LIMIT} 
                className="tax-input" 
                placeholder="0"
              />
              <div className="tax-input-hint">Limit: {formatINR(SECTION_80C_LIMIT)}</div>
            </div>
            <div className="tax-control-card">
              <div className="tax-control-card-header">
                <div className="tax-control-card-icon" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                  <TrendingDown size={20} />
                </div>
                <label>Existing 80CCD(1B) — NPS (₹)</label>
              </div>
              <input 
                type="number" 
                value={existing80CCD} 
                onChange={e => setExisting80CCD(e.target.value === '' ? '' : Number(e.target.value))} 
                max={SECTION_80CCD_1B_LIMIT} 
                className="tax-input" 
                placeholder="0"
              />
              <div className="tax-input-hint">Limit: {formatINR(SECTION_80CCD_1B_LIMIT)}</div>
            </div>
          </>
        )}
      </motion.div>

      {/* Tax Summary Cards with Icons */}
      <motion.div 
        className="tax-summary-grid"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><Wallet size={22} /></div>
          <span className="tax-sum-label">Taxable Income</span>
          <span className="tax-sum-value">{formatINR(taxableIncome)}</span>
        </div>
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><Receipt size={22} /></div>
          <span className="tax-sum-label">Total Tax Payable</span>
          <span className="tax-sum-value">{formatINR(totalTax)}</span>
        </div>
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><Percent size={22} /></div>
          <span className="tax-sum-label">Effective Tax Rate</span>
          <span className="tax-sum-value">{effectiveRate}%</span>
        </div>
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><PiggyBank size={22} /></div>
          <span className="tax-sum-label">Potential Tax Saving</span>
          <span className="tax-sum-value">{formatINR(potentialSaving)}</span>
        </div>
      </motion.div>

      {/* Zero-Tax Celebration */}
      {totalTax === 0 && baseTax && (
        <motion.div 
          className="tax-zero-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
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
        </motion.div>
      )}

      {/* Two-Column Layout: Chart + Insights */}
      <div className="tax-two-col">
        {/* Old vs New Regime Comparison Chart */}
        <motion.div 
          className="tax-chart-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Old Regime vs New Regime Comparison</h3>
          <div style={{ width: '100%', height: 300 }} className="tax-bar-chart-glow">
            <ResponsiveContainer>
              <BarChart data={regimeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorOld" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#0369a1" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} />
                <YAxis tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                <Bar dataKey="value" name="Tax Payable" radius={[10, 10, 0, 0]} barSize={80}>
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
        </motion.div>

        {/* Smart Insights Panel — Always Visible */}
        <motion.div
          className="tax-insights-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h3><Sparkles size={18} style={{ marginRight: 8, color: '#fbbf24' }} />Smart Tax Insights</h3>
          <div className="tax-insight-items">
            <div className="tax-insight-item">
              <div className="tax-insight-icon" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}><IndianRupee size={18} /></div>
              <div>
                <div className="tax-insight-title">Monthly Tax Impact</div>
                <div className="tax-insight-desc">{formatINR(Math.round(totalTax / 12))}/month from your salary</div>
              </div>
            </div>
            <div className="tax-insight-item">
              <div className="tax-insight-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}><TrendingDown size={18} /></div>
              <div>
                <div className="tax-insight-title">Take-Home Pay</div>
                <div className="tax-insight-desc">{formatINR(Math.round((annualIncome - totalTax) / 12))}/month after tax</div>
              </div>
            </div>
            <div className="tax-insight-item">
              <div className="tax-insight-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}><Info size={18} /></div>
              <div>
                <div className="tax-insight-title">Regime Advice</div>
                <div className="tax-insight-desc">
                  {betterRegime === 'New' 
                    ? 'New Regime is optimal — no deductions needed for maximum savings.' 
                    : betterRegime === 'Old'
                    ? 'Old Regime benefits you more if you maximize your 80C & 80CCD(1B) deductions.'
                    : 'Both regimes yield similar tax. Choose based on your investment flexibility.'}
                </div>
              </div>
            </div>
            {regime === 'new' && (
              <div className="tax-insight-item">
                <div className="tax-insight-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}><Sparkles size={18} /></div>
                <div>
                  <div className="tax-insight-title">New Regime Benefits</div>
                  <div className="tax-insight-desc">Standard deduction of ₹75,000 + simplified lower slabs. No need to track deductions.</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Optimization Chart — only when there's actual tax */}
      {totalTax > 0 && regime === 'old' && potentialSaving > 0 && (
        <motion.div 
          className="tax-chart-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3>Tax Before vs After Optimization</h3>
          <div style={{ width: '100%', height: 280 }} className="tax-bar-chart-glow">
            <ResponsiveContainer>
              <BarChart data={optimizationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#15803d" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} />
                <YAxis tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                <Bar dataKey="value" name="Tax Payable" radius={[10, 10, 0, 0]} barSize={80}>
                  {optimizationChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
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
        <motion.div 
          className="tax-recs-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3>Recommended Tax-Saving Investments</h3>
          <div className="tax-recs-grid">
            {taxSavingRecs.map((rec, i) => (
              <motion.div 
                key={rec.id + rec.section} 
                className="tax-rec-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                whileHover={{ y: -6, scale: 1.02, boxShadow: '0 12px 24px rgba(0,0,0,0.4), 0 0 15px rgba(34, 197, 94, 0.2)' }}
              >
                <div className="tax-rec-name">{rec.name}</div>
                <div className="tax-rec-section">Section {rec.section}</div>
                <div className="tax-rec-amount">Invest up to {formatINR(rec.suggestedAmount)}</div>
                <div className="tax-rec-return">{Number(rec.expected_return_min).toFixed(2)}% – {Number(rec.expected_return_max).toFixed(2)}% returns</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Ambient background orbs */}
      <div className="tax-bg-orb tax-bg-orb--1" />
      <div className="tax-bg-orb tax-bg-orb--2" />
    </div>
  );
};

export default TaxScreen;
