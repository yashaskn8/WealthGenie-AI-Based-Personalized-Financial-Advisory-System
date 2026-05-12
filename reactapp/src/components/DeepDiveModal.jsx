import React, { useState, useMemo, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { formatINR } from '../utils/indianNumberFormat';
import { calculateSIPFutureValue, calculateLumpSumFutureValue } from '../utils/sipCalculator';
import './DeepDiveModal.css';

const TABS = ['Overview', 'Calculator', 'Tax', 'History'];

const DeepDiveModal = ({ isOpen, onClose, investment, allRecommendations, horizon }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [calcMode, setCalcMode] = useState('SIP');
  const [calcAmount, setCalcAmount] = useState(investment?.monthly_allocation || 5000);
  const [calcYears, setCalcYears] = useState(horizon || 15);

  // Sync calcYears when profile horizon changes
  useEffect(() => { setCalcYears(horizon || 15); }, [horizon]);
  const [calcReturn, setCalcReturn] = useState(
    investment ? ((investment.expected_return_min + investment.expected_return_max) / 2) : 10
  );
  const [expandedSubtype, setExpandedSubtype] = useState(null);

  if (!isOpen || !investment) return null;

  const inv = investment;

  // Overview: comparison bar chart
  const comparisonData = (allRecommendations || []).map(r => ({
    name: r.name.length > 12 ? r.name.substring(0, 12) + '…' : r.name,
    returnMax: r.expected_return_max,
    isThis: r.id === inv.id
  }));

  // Calculator
  const maturityValue = calcMode === 'SIP'
    ? calculateSIPFutureValue(calcAmount, calcReturn, calcYears)
    : calculateLumpSumFutureValue(calcAmount, calcReturn, calcYears);
  const totalInvested = calcMode === 'SIP' ? calcAmount * 12 * calcYears : calcAmount;
  const estimatedReturns = maturityValue - totalInvested;

  const calcDonutData = [
    { name: 'Invested', value: Math.round(totalInvested) },
    { name: 'Returns', value: Math.round(Math.max(0, estimatedReturns)) }
  ];

  // Historical (illustrative)
  const historicalData = useMemo(() => {
    const avgReturn = (inv.expected_return_min + inv.expected_return_max) / 2;
    const data = [];
    let base = 100;
    let fdBase = 100;
    let infBase = 100;
    for (let y = 1; y <= 10; y++) {
      const variation = (Math.sin(y * 1.5) * 3 + Math.cos(y * 0.8) * 2);
      base = base * (1 + (avgReturn + variation) / 100);
      fdBase = fdBase * (1 + 6.5 / 100);
      infBase = infBase * (1 + 6 / 100);
      data.push({
        year: `Year ${y}`,
        investment: Math.round(base),
        fd: Math.round(fdBase),
        inflation: Math.round(infBase)
      });
    }
    return data;
  }, [inv]);

  // Tax info
  const taxInfo = {
    section: inv.tax_section || 'N/A',
    taxBenefit: inv.tax_benefit,
    taxFreeInterest: inv.tax_free_interest,
    maxDeduction: inv.tax_section?.includes('80C') ? '₹1,50,000' : inv.tax_section?.includes('80CCD') ? '₹50,000' : 'N/A',
    ltcg: inv.category === 'Equity' ? 'Gains above ₹1L taxed at 10% (held >1 year)' : 'Taxed as per income slab after indexation (held >3 years)',
    stcg: inv.category === 'Equity' ? 'Taxed at 15% (held <1 year)' : 'Taxed as per income slab',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ddm-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={24} /></button>

        {/* Header */}
        <div className="ddm-header">
          <h2 className="ddm-title">{inv.name}</h2>
          <span className={`badge ${inv.category.toLowerCase()}`}>{inv.category}</span>
        </div>

        {/* Tabs */}
        <div className="ddm-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`ddm-tab ${activeTab === tab ? 'ddm-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="ddm-body">

          {/* OVERVIEW TAB */}
          {activeTab === 'Overview' && (
            <div>
              <p className="ddm-description">{inv.description}</p>

              <div className="ddm-pros-cons">
                <div className="ddm-pros">
                  <h4>Advantages</h4>
                  <ul>
                    <li>Expected returns: {inv.expected_return_min}% – {inv.expected_return_max}%</li>
                    {inv.tax_benefit && <li>Tax benefits under Section {inv.tax_section}</li>}
                    {inv.tax_free_interest && <li>Completely tax-free interest</li>}
                    {inv.liquidity === 'High' && <li>High liquidity — easy to access</li>}
                  </ul>
                </div>
                <div className="ddm-cons">
                  <h4>Considerations</h4>
                  <ul>
                    {inv.lock_in_years && <li>Lock-in period of {inv.lock_in_years} years</li>}
                    {inv.risk_level === 'High' || inv.risk_level === 'Very High' ? <li>Higher volatility risk</li> : null}
                    {inv.liquidity === 'Low' && <li>Low liquidity — hard to exit early</li>}
                    <li>Returns are not guaranteed and subject to market conditions</li>
                  </ul>
                </div>
              </div>

              {/* Comparison Chart */}
              <h4 style={{ marginTop: 24, marginBottom: 12 }}>Return Comparison with Other Picks</h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0B131E', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="returnMax" name="Max Return %" radius={[4, 4, 0, 0]} barSize={24}>
                      {comparisonData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.isThis ? '#8b5cf6' : 'rgba(139,92,246,0.2)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Subtypes Accordion */}
              {inv.types && inv.types.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4>Sub-types</h4>
                  {inv.types.map((t, i) => (
                    <div key={t} className="ddm-subtype">
                      <button className="ddm-subtype-btn" onClick={() => setExpandedSubtype(expandedSubtype === i ? null : i)}>
                        {t}
                        {expandedSubtype === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSubtype === i && (
                        <div className="ddm-subtype-detail">
                          <span>Return: {inv.expected_return_min}%–{inv.expected_return_max}%</span>
                          <span>Lock-in: {inv.lock_in_years ? `${inv.lock_in_years} yrs` : 'None'}</span>
                          <span>Tax: {inv.tax_benefit ? `Section ${inv.tax_section}` : 'Standard taxation'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALCULATOR TAB */}
          {activeTab === 'Calculator' && (
            <div>
              <div className="calc-mode-toggle">
                <button className={`calc-mode-btn ${calcMode === 'SIP' ? 'calc-mode-btn--active' : ''}`} onClick={() => setCalcMode('SIP')}>SIP (Monthly)</button>
                <button className={`calc-mode-btn ${calcMode === 'Lump' ? 'calc-mode-btn--active' : ''}`} onClick={() => setCalcMode('Lump')}>Lump Sum</button>
              </div>

              <div className="calc-inputs">
                <div className="calc-input-group">
                  <label>{calcMode === 'SIP' ? 'Monthly Investment (₹)' : 'Principal (₹)'}</label>
                  <input type="number" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className="calc-input" />
                </div>
                <div className="calc-input-group">
                  <label>Tenure (Years)</label>
                  <input type="number" value={calcYears} onChange={e => setCalcYears(Number(e.target.value))} min="1" max="40" className="calc-input" />
                </div>
                <div className="calc-input-group">
                  <label>Expected Return (%)</label>
                  <input type="number" value={calcReturn} onChange={e => setCalcReturn(Number(e.target.value))} step="0.1" className="calc-input" />
                </div>
              </div>

              <div className="calc-results">
                <div className="calc-result-item">
                  <span className="calc-result-label">Total Invested</span>
                  <span className="calc-result-value">{formatINR(totalInvested)}</span>
                </div>
                <div className="calc-result-item">
                  <span className="calc-result-label">Estimated Returns</span>
                  <span className="calc-result-value" style={{ color: '#22c55e' }}>{formatINR(estimatedReturns)}</span>
                </div>
                <div className="calc-result-item calc-result-item--main">
                  <span className="calc-result-label">Maturity Value</span>
                  <span className="calc-result-value" style={{ color: '#8b5cf6', fontSize: '1.8rem' }}>{formatINR(maturityValue)}</span>
                </div>
              </div>

              <div className="calc-donut-row">
                <div style={{ width: 180, height: 180 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={calcDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                        <Cell fill="#06b6d4" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="calc-donut-legend">
                  <div><span className="legend-dot" style={{ background: '#06b6d4' }}></span> Invested</div>
                  <div><span className="legend-dot" style={{ background: '#8b5cf6' }}></span> Returns</div>
                </div>
              </div>
            </div>
          )}

          {/* TAX TAB */}
          {activeTab === 'Tax' && (
            <div>
              <div className="tax-detail-grid">
                <div className="tax-detail-card">
                  <span className="tax-detail-label">Tax Benefit Available</span>
                  <span className="tax-detail-value" style={{ color: taxInfo.taxBenefit ? '#22c55e' : '#ef4444' }}>
                    {taxInfo.taxBenefit ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
                <div className="tax-detail-card">
                  <span className="tax-detail-label">Applicable Section</span>
                  <span className="tax-detail-value">{taxInfo.section}</span>
                </div>
                <div className="tax-detail-card">
                  <span className="tax-detail-label">Max Deduction Limit</span>
                  <span className="tax-detail-value">{taxInfo.maxDeduction}</span>
                </div>
                <div className="tax-detail-card">
                  <span className="tax-detail-label">Tax-Free Interest</span>
                  <span className="tax-detail-value" style={{ color: taxInfo.taxFreeInterest ? '#22c55e' : '#f59e0b' }}>
                    {taxInfo.taxFreeInterest ? 'Yes — EEE Status' : 'No — Taxable'}
                  </span>
                </div>
              </div>

              <div className="tax-cg-section">
                <h4>Capital Gains Tax Rules</h4>
                <div className="tax-cg-row">
                  <div className="tax-cg-card">
                    <span className="tax-cg-title">Long-Term (LTCG)</span>
                    <p>{taxInfo.ltcg}</p>
                  </div>
                  <div className="tax-cg-card">
                    <span className="tax-cg-title">Short-Term (STCG)</span>
                    <p>{taxInfo.stcg}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'History' && (
            <div>
              <p style={{ color: '#f59e0b', fontSize: '0.82rem', marginBottom: 16 }}>Illustrative data only. Past performance does not guarantee future results.</p>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={historicalData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0B131E', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="investment" name={inv.name} stroke="#8b5cf6" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="fd" name="FD Benchmark" stroke="#64748b" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="inflation" name="Inflation (6%)" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="history-legend">
                <span><span className="legend-dot" style={{ background: '#8b5cf6' }}></span>{inv.name}</span>
                <span><span className="legend-dot" style={{ background: '#64748b' }}></span>FD Benchmark</span>
                <span><span className="legend-dot" style={{ background: '#ef4444' }}></span>Inflation</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeepDiveModal;
