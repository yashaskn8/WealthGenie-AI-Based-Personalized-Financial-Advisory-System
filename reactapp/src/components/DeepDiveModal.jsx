import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronUp, ExternalLink, MapPin, Star, TrendingUp, TrendingDown, Building2, Shield, Zap, Info, Wallet, PieChart as PieIcon, Activity, AlertCircle, BarChart3, Lock, Target, History as HistoryIcon, Calculator as CalcIcon, ShieldCheck, Landmark, IndianRupee, ArrowRight, ClipboardCheck, CircleCheck, CircleX, ArrowLeftRight, Flame, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, AreaChart, Area } from 'recharts';
import { formatINR } from '../utils/indianNumberFormat';
import { calculateSIPFutureValue, calculateLumpSumFutureValue } from '../utils/sipCalculator';
import WHERE_TO_INVEST from '../whereToInvest';
import { TRUST_BADGES } from '../investmentDatabase';
import JargonTooltip from './JargonTooltip';
import './DeepDiveModal.css';

const TABS = [
  { id: 'Overview', icon: <Info size={16} /> },
  { id: 'Where to Invest', icon: <MapPin size={16} /> },
  { id: 'Calculator', icon: <CalcIcon size={16} /> },
  { id: 'Tax', icon: <Shield size={16} /> },
  { id: 'History', icon: <HistoryIcon size={16} /> },
  { id: 'Why Invest', icon: <IndianRupee size={16} /> },
  { id: 'Stress Test', icon: <Flame size={16} /> }
];

const DeepDiveModal = ({ isOpen, onClose, investment, allRecommendations, horizon }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const calcMode = 'SIP';
  const [calcAmount, setCalcAmount] = useState(5000);
  const [calcYears, setCalcYears] = useState(15);
  const [calcReturn, setCalcReturn] = useState(10);
  const [stressTestAmount, setStressTestAmount] = useState(100000);

  const [prevInvestmentId, setPrevInvestmentId] = useState(investment?.id);
  const [prevHorizon, setPrevHorizon] = useState(horizon);

  // ─── Instrument-Aware Calculator Bounds ───
  // Clamp sliders to realistic ranges for each investment type
  const calcBounds = useMemo(() => {
    if (!investment) return { returnMin: 1, returnMax: 30, yearMin: 1, yearMax: 40 };
    const retMin = investment.expected_return_min ?? (investment.rate ? investment.rate * 0.85 : 5);
    const retMax = investment.expected_return_max ?? (investment.rate || 12);
    const cat = (investment.category || investment.cat || '').toLowerCase();
    const name = (investment.name || investment.abbr || '').toLowerCase();

    // Instrument-specific year bounds
    let yearMin = 1, yearMax = 30;
    if (name.includes('ppf')) { yearMin = 15; yearMax = 30; }
    else if (name.includes('scss')) { yearMin = 5; yearMax = 8; }
    else if (name.includes('sukanya') || name.includes('ssy')) { yearMin = 15; yearMax = 21; }
    else if (name.includes('nps')) { yearMin = 10; yearMax = 40; }
    else if (name.includes('rbi') && name.includes('bond')) { yearMin = 7; yearMax = 7; }
    else if (name.includes('pmvvy')) { yearMin = 10; yearMax = 10; }
    else if (name.includes('fd') || name.includes('fixed deposit')) { yearMin = 1; yearMax = 10; }
    else if (name.includes('liquid')) { yearMin = 1; yearMax = 3; }
    else if (name.includes('sgb') || name.includes('gold bond')) { yearMin = 5; yearMax = 8; }
    else if (name.includes('elss')) { yearMin = 3; yearMax = 25; }
    else if (cat === 'equity') { yearMin = 3; yearMax = 30; }
    else if (cat === 'hybrid') { yearMin = 3; yearMax = 25; }
    else if (cat === 'debt') { yearMin = 1; yearMax = 10; }

    // Return bounds: ±2% around instrument's actual range, but never below 1% or above 30%
    const sliderRetMin = Math.max(1, Math.floor(retMin - 2));
    const sliderRetMax = Math.min(30, Math.ceil(retMax + 2));

    return { returnMin: sliderRetMin, returnMax: sliderRetMax, yearMin, yearMax };
  }, [investment]);

  if (investment?.id !== prevInvestmentId || horizon !== prevHorizon) {
    setPrevInvestmentId(investment?.id);
    setPrevHorizon(horizon);

    const retMin = investment ? (investment.expected_return_min ?? (investment.rate ? investment.rate * 0.85 : 5)) : 5;
    const retMax = investment ? (investment.expected_return_max ?? (investment.rate || 12)) : 12;
    const cat = investment ? (investment.category || investment.cat || '').toLowerCase() : '';
    const name = investment ? (investment.name || investment.abbr || '').toLowerCase() : '';

    let yearMin = 1, yearMax = 30;
    if (name.includes('ppf')) { yearMin = 15; yearMax = 30; }
    else if (name.includes('scss')) { yearMin = 5; yearMax = 8; }
    else if (name.includes('sukanya') || name.includes('ssy')) { yearMin = 15; yearMax = 21; }
    else if (name.includes('nps')) { yearMin = 10; yearMax = 40; }
    else if (name.includes('rbi') && name.includes('bond')) { yearMin = 7; yearMax = 7; }
    else if (name.includes('pmvvy')) { yearMin = 10; yearMax = 10; }
    else if (name.includes('fd') || name.includes('fixed deposit')) { yearMin = 1; yearMax = 10; }
    else if (name.includes('liquid')) { yearMin = 1; yearMax = 3; }
    else if (name.includes('sgb') || name.includes('gold bond')) { yearMin = 5; yearMax = 8; }
    else if (name.includes('elss')) { yearMin = 3; yearMax = 25; }
    else if (cat === 'equity') { yearMin = 3; yearMax = 30; }
    else if (cat === 'hybrid') { yearMin = 3; yearMax = 25; }
    else if (cat === 'debt') { yearMin = 1; yearMax = 10; }

    const sliderRetMin = Math.max(1, Math.floor(retMin - 2));
    const sliderRetMax = Math.min(30, Math.ceil(retMax + 2));

    const clampedYears = Math.max(yearMin, Math.min(yearMax, horizon || yearMin));
    setCalcYears(clampedYears);

    if (investment && investment.id !== prevInvestmentId) {
      setCalcAmount(investment.monthly_allocation || 5000);
      const avgReturn = (retMin + retMax) / 2;
      const clampedReturn = Math.max(sliderRetMin, Math.min(sliderRetMax, avgReturn));
      setCalcReturn(parseFloat(clampedReturn.toFixed(1)));
      setActiveTab('Overview');
    }
  }

  // Normalize fields
  const inv = useMemo(() => {
    if (!investment) return {};
    return {
      ...investment,
      expected_return_min: investment.expected_return_min ?? (investment.rate ? investment.rate * 0.85 : 8),
      expected_return_max: investment.expected_return_max ?? (investment.rate || 10),
      category: investment.category || investment.cat || 'Other',
      risk_level: investment.risk_level || investment.riskLabel || 'Medium',
      lock_in_years: investment.lock_in_years ?? investment.lockIn ?? 0,
      tax_benefit: investment.tax_benefit ?? false,
      tax_section: investment.tax_section || 'N/A',
      tax_free_interest: investment.tax_free_interest ?? false,
      liquidity: investment.liquidity || 'Medium',
      description: investment.description || investment.desc || 'No description available.',
      name: investment.name || investment.abbr || 'Investment Instrument',
    };
  }, [investment]);

  // Historical data — deterministic simulation using instrument return range
  // Uses seeded pseudo-variation based on return spread (not random)
  const historicalData = useMemo(() => {
    const retMin = inv.expected_return_min || 8;
    const retMax = inv.expected_return_max || 10;
    const avgReturn = (retMin + retMax) / 2;
    const spread = (retMax - retMin) / 2; // half of range for variation
    const data = [];
    let base = 100; let fdBase = 100; let infBase = 100;
    // Year-over-year variation pattern (realistic: boom/correction cycles)
    const cycleFactors = [0.6, 1.2, 0.9, 1.4, -0.3, 1.1, 0.7, 1.3, 0.5, 1.0];
    for (let y = 1; y <= 10; y++) {
      const cycleFactor = cycleFactors[y - 1] || 1.0;
      const yearReturn = avgReturn + (spread * cycleFactor);
      base = base * (1 + yearReturn / 100);
      fdBase = fdBase * (1 + 6.5 / 100);
      infBase = infBase * (1 + 6 / 100);
      data.push({ year: `Year ${y}`, investment: Math.round(base), fd: Math.round(fdBase), inflation: Math.round(infBase) });
    }
    return data;
  }, [inv]);

  if (!isOpen || !investment) return null;

  // Comparison data
  const comparisonData = (allRecommendations || []).slice(0, 8).map(r => ({
    name: (r.name || r.abbr || '').length > 10 ? (r.name || r.abbr || '').substring(0, 10) + '..' : (r.name || r.abbr || ''),
    returnMax: r.expected_return_max || r.rate || 0,
    isThis: r.id === inv.id
  }));

  // Calculator logic
  const maturityValue = calcMode === 'SIP' ? calculateSIPFutureValue(calcAmount, calcReturn, calcYears) : calculateLumpSumFutureValue(calcAmount, calcReturn, calcYears);
  const totalInvested = calcMode === 'SIP' ? calcAmount * 12 * calcYears : calcAmount;
  const estimatedReturns = Math.max(0, maturityValue - totalInvested);
  
  // ─── Inflation-Adjusted Real Value ───
  const INFLATION_RATE = 6; // India CPI long-term avg ~6% (RBI target band: 4±2%, 10yr avg ~5.8%)
  const inflationFactor = Math.pow(1 + INFLATION_RATE / 100, calcYears);
  const realMaturityValue = maturityValue / inflationFactor;
  
  // ─── Post-Tax Estimation ───
  const postTaxValue = (() => {
    const gains = estimatedReturns;
    if (gains <= 0) return maturityValue;
    const cat = (inv.category || '').toLowerCase();
    const isTaxFree = inv.tax_free_interest || false;
    const name = (inv.name || '').toLowerCase();
    
    // PPF, SSY, PMVVY maturity = fully tax-free (EEE)
    if (isTaxFree || name.includes('ppf') || name.includes('sukanya')) return maturityValue;
    
    // Equity: LTCG >₹1.25L at 12.5% (assuming long-term)
    if (cat === 'equity' || cat === 'hybrid') {
      const exemptGains = 125000;
      const taxableGains = Math.max(0, gains - exemptGains);
      return maturityValue - (taxableGains * 0.125);
    }
    
    // Debt / FD / Government slab-taxed: taxed at slab rate (assume 30% for high earners)
    if (cat === 'debt' || cat === 'government' || name.includes('fd') || name.includes('fixed deposit') || name.includes('rbi') || name.includes('scss') || name.includes('pmvvy') || name.includes('vaya vandana')) {
      // PPF/SSY already caught above (EEE); NPS handled separately if needed
      if (name.includes('nps')) {
        // NPS: 60% lump sum tax-free, 40% annuity taxed at slab
        return maturityValue - (gains * 0.40 * 0.30);
      }
      return maturityValue - (gains * 0.30);
    }
    
    // Gold: LTCG at 12.5% without indexation
    if (name.includes('gold') || name.includes('sgb')) {
      // SGB at maturity = tax-free LTCG; on exchange = 12.5%
      if (name.includes('sgb')) return maturityValue; // assume held to maturity
      return maturityValue - (gains * 0.125);
    }
    
    // Default: 20% estimated tax
    return maturityValue - (gains * 0.20);
  })();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{`
        /* Scoped overrides for Deep Dive Modal calculator range sliders */
        .calc-field input[type="range"] {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 100% !important;
          height: 20px !important;
          background: transparent !important;
          outline: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-sizing: border-box !important;
          cursor: pointer !important;
        }

        .calc-field input[type="range"]::-webkit-slider-runnable-track {
          width: 100% !important;
          height: 4px !important;
          border-radius: 3px !important;
          border: none !important;
          box-sizing: border-box !important;
          background: linear-gradient(to right, #38bdf8 0%, #38bdf8 var(--slider-pct, 0%), rgba(255,255,255,0.08) var(--slider-pct, 0%), rgba(255,255,255,0.08) 100%) !important;
        }

        .calc-field input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          height: 16px !important;
          width: 16px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: 3px solid #38bdf8 !important;
          cursor: pointer !important;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4) !important;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
          margin-top: -6px !important;
          box-sizing: border-box !important;
        }

        .calc-field input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.7), 0 2px 8px rgba(0, 0, 0, 0.5) !important;
        }

        .calc-field input[type="range"]::-moz-range-track {
          width: 100% !important;
          height: 4px !important;
          border-radius: 3px !important;
          border: none !important;
          box-sizing: border-box !important;
          background: linear-gradient(to right, #38bdf8 0%, #38bdf8 var(--slider-pct, 0%), rgba(255,255,255,0.08) var(--slider-pct, 0%), rgba(255,255,255,0.08) 100%) !important;
        }

        .calc-field input[type="range"]::-moz-range-thumb {
          height: 16px !important;
          width: 16px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: 3px solid #38bdf8 !important;
          cursor: pointer !important;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4) !important;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
          box-sizing: border-box !important;
        }

        .calc-field input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.7), 0 2px 8px rgba(0, 0, 0, 0.5) !important;
        }
      `}</style>
      <div className="ddm-content" onClick={e => e.stopPropagation()}>
        
        {/* Sticky Header */}
        <div className="ddm-sticky-header">
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          
          <div className="ddm-header-top">
            <span className="premium-badge">{inv.category}</span>
            <h2 className="ddm-title">{inv.name}</h2>
          </div>

          <div className="ddm-quick-metrics">
            <div className="metric-item">
              <span className="metric-label"><JargonTooltip term="Risk Profile">Risk Profile</JargonTooltip></span>
              <span className="metric-value" style={{ color: inv.risk_level.includes('High') ? '#f43f5e' : inv.risk_level.includes('Medium') ? '#f59e0b' : '#22c55e' }}>
                {inv.risk_level}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label"><JargonTooltip term="Return Potential">Return Potential</JargonTooltip></span>
              <span className="metric-value" style={{ color: '#22c55e' }}>
                {parseFloat(inv.expected_return_min).toFixed(1).replace(/\.0$/, '')}% – {parseFloat(inv.expected_return_max).toFixed(1).replace(/\.0$/, '')}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label"><JargonTooltip term="Lock-in Period">Lock-in Period</JargonTooltip></span>
              <span className="metric-value">{inv.lock_in_years > 0 ? `${inv.lock_in_years} Years` : 'None'}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label"><JargonTooltip term="Tax Benefit">Tax Benefit</JargonTooltip></span>
              <span className="metric-value">{inv.tax_benefit ? `Section ${inv.tax_section}` : 'None'}</span>
            </div>
          </div>

          <div className="ddm-tabs-nav">
            {TABS.map(tab => (
              <button key={tab.id} className={`ddm-tab-btn ${activeTab === tab.id ? 'ddm-tab-btn--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{tab.icon} {tab.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="ddm-scroll-container">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="tab-fade-in">
              <div className="ddm-section-header">Asset Intelligence</div>
              <div className="ddm-desc-card">
                <p>{inv.description}</p>
              </div>

              <div className="ddm-pc-grid">
                <div className="pc-card pc-card--pros">
                  <div className="pc-title" style={{ color: '#22c55e' }}><Shield size={20} /> Strategic Advantages</div>
                  <ul className="pc-list">
                    <li className="pc-item"><Zap size={14} className="pc-icon" /> Return potential of {parseFloat(inv.expected_return_min).toFixed(1)}% – {parseFloat(inv.expected_return_max).toFixed(1)}% p.a.</li>
                    {inv.tax_benefit && <li className="pc-item"><Target size={14} className="pc-icon" /> Tax deduction under Section {inv.tax_section}</li>}
                    {inv.tax_free_interest && <li className="pc-item"><Shield size={14} className="pc-icon" /> Sovereign-backed tax-free maturity (EEE)</li>}
                    <li className="pc-item"><Activity size={14} className="pc-icon" /> Portfolio {inv.category.toLowerCase()} diversification</li>
                    {inv.lock_in_years === 0 && <li className="pc-item"><TrendingUp size={14} className="pc-icon" /> No lock-in — full liquidity</li>}
                  </ul>
                </div>
                <div className="pc-card pc-card--cons">
                  <div className="pc-title" style={{ color: '#f59e0b' }}><AlertCircle size={20} /> Risk Considerations</div>
                  <ul className="pc-list">
                    {inv.lock_in_years > 0 && <li className="pc-item"><Lock size={14} className="pc-icon" /> Mandatory capital lock-in of {inv.lock_in_years} years</li>}
                    <li className="pc-item"><BarChart3 size={14} className="pc-icon" /> {inv.risk_level} market sensitivity</li>
                    <li className="pc-item"><Activity size={14} className="pc-icon" /> Volatility relative to benchmark indices</li>
                  </ul>
                </div>
              </div>

              {/* Safety & Regulation Section */}
              {(() => {
                const trustInfo = TRUST_BADGES[inv.id] || null;
                if (!trustInfo) return null;
                const isSovereign = trustInfo.type === 'sovereign' || trustInfo.type === 'rbi';
                const isInsured = trustInfo.type === 'insured';
                const accentColor = isSovereign ? '#38bdf8' : isInsured ? '#10b981' : '#8b5cf6';
                const accentBg = isSovereign ? 'rgba(56, 189, 248, 0.06)' : isInsured ? 'rgba(16, 185, 129, 0.06)' : 'rgba(139, 92, 246, 0.06)';
                return (
                  <>
                    <div className="ddm-section-header">Safety & Regulation</div>
                    <div className="ddm-trust-card" style={{ borderColor: accentColor.replace(')', ', 0.2)').replace('rgb', 'rgba') }}>
                      <div className="ddm-trust-header">
                        <div className="ddm-trust-icon" style={{ background: accentBg, color: accentColor }}>
                          {isSovereign ? <Landmark size={22} /> : <ShieldCheck size={22} />}
                        </div>
                        <div className="ddm-trust-titles">
                          <span className="ddm-trust-label" style={{ color: accentColor }}>{trustInfo.label}</span>
                          <span className="ddm-trust-body">{trustInfo.body}</span>
                        </div>
                      </div>
                      <p className="ddm-trust-desc">{trustInfo.desc}</p>
                      <div className="ddm-trust-footer">
                        <span className="ddm-trust-chip"><Lock size={11} /> 256-bit Encrypted</span>
                        <span className="ddm-trust-chip"><ShieldCheck size={11} /> Audited & Compliant</span>
                        {isSovereign && <span className="ddm-trust-chip"><Landmark size={11} /> Zero Default Risk</span>}
                        {isInsured && <span className="ddm-trust-chip"><Shield size={11} /> DICGC Protected</span>}
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="ddm-section-header">Performance Indexing</div>
              <div className="ddm-chart-container">
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: -10, bottom: 30 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="barGradMuted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#475569" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="cursorGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.1}/>
                        <stop offset="100%" stopColor="transparent" stopOpacity={0}/>
                      </linearGradient>
                      <filter id="barGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} dy={16} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip cursor={{ fill: 'url(#cursorGrad)' }} contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(24px)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 16, boxShadow: '0 16px 32px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.15)', color: '#f8fafc', fontWeight: 600, padding: '16px' }} itemStyle={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.1rem' }} labelStyle={{ color: '#cbd5e1', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }} />
                    <Bar dataKey="returnMax" name="Upside Potential %" radius={[6, 6, 0, 0]} barSize={32}>
                      {comparisonData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.isThis ? 'url(#barGrad)' : 'url(#barGradMuted)'} filter={entry.isThis ? 'url(#barGlow)' : 'none'} style={{ transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB: WHERE TO INVEST */}
          {activeTab === 'Where to Invest' && (() => {
            const wtiData = WHERE_TO_INVEST[inv.id];
            if (!wtiData) return (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <Building2 size={48} color="var(--ddm-text-muted)" />
                <p style={{ color: 'var(--ddm-text-muted)', marginTop: 16, fontSize: '0.9rem' }}>No product data available for this instrument.</p>
              </div>
            );
            return (
              <div className="tab-fade-in">
                <div className="ddm-section-header">Execution Pathway</div>

                {/* Info Note Banner */}
                {wtiData.note && (
                  <div className="wti-note-banner">
                    <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p>{wtiData.note}</p>
                  </div>
                )}

                {/* ─── SEBI Risk-O-Meter (Institutional Grade) ─── */}
                {(() => {
                  const RISK_LEVELS = [
                    { label: 'Low', color: '#22c55e', desc: 'Capital is safe. Government-guaranteed or DICGC-insured. Virtually zero chance of loss.' },
                    { label: 'Low to Moderate', color: '#84cc16', desc: 'Mostly safe with minor NAV fluctuations. Best for 1–3 year parking of surplus.' },
                    { label: 'Moderate', color: '#eab308', desc: 'Price volatility present. Capital may dip temporarily. Suitable for 3+ year horizon.' },
                    { label: 'Moderately High', color: '#f97316', desc: 'Significant short-term volatility. Requires 5+ year commitment for reliable returns.' },
                    { label: 'High', color: '#ef4444', desc: 'Substantial market risk. 20–30% drawdowns possible. Requires 7+ year horizon.' },
                    { label: 'Very High', color: '#dc2626', desc: 'Maximum volatility. 40%+ drawdowns possible. Only for 10+ year aggressive investors.' },
                  ];
                  const level = Math.max(0, Math.min(5, (wtiData.riskLevel || 1) - 1));
                  const risk = RISK_LEVELS[level];

                  const CX = 140, CY = 125, R = 90, r2 = 62;
                  const totalAngle = Math.PI; // 180 degrees
                  const segGap = 0.025;

                  return (
                    <div className="risk-meter-container">
                      <div className="risk-meter-header">
                        <Shield size={14} style={{ color: risk.color }} />
                        <span>SEBI Risk-O-Meter</span>
                        <span className="risk-meter-sebi-tag">SEBI Mandate</span>
                      </div>
                      <div className="risk-meter-gauge">
                        <svg viewBox="0 0 280 155" className="risk-meter-svg">
                          <defs>
                            <filter id="rmGlow">
                              <feGaussianBlur stdDeviation="4" result="blur" />
                              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <filter id="rmNeedleShadow">
                              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor={risk.color} floodOpacity="0.6" />
                            </filter>
                            <linearGradient id="rmNeedleGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f8fafc" />
                              <stop offset="100%" stopColor={risk.color} />
                            </linearGradient>
                            <radialGradient id="rmHubGrad">
                              <stop offset="0%" stopColor="rgba(30,41,59,1)" />
                              <stop offset="100%" stopColor="rgba(15,23,42,1)" />
                            </radialGradient>
                          </defs>

                          {/* Outer decorative ring */}
                          <path
                            d={`M ${CX + (R + 8) * Math.cos(Math.PI)} ${CY - (R + 8) * Math.sin(Math.PI)} A ${R + 8} ${R + 8} 0 0 1 ${CX + (R + 8) * Math.cos(0)} ${CY - (R + 8) * Math.sin(0)}`}
                            fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"
                          />

                          {/* Arc segments */}
                          {RISK_LEVELS.map((r, i) => {
                            const a1 = Math.PI - (i / 6) * totalAngle + segGap;
                            const a2 = Math.PI - ((i + 1) / 6) * totalAngle - segGap;
                            const ox1 = CX + R * Math.cos(a1), oy1 = CY - R * Math.sin(a1);
                            const ox2 = CX + R * Math.cos(a2), oy2 = CY - R * Math.sin(a2);
                            const ix2 = CX + r2 * Math.cos(a2), iy2 = CY - r2 * Math.sin(a2);
                            const ix1 = CX + r2 * Math.cos(a1), iy1 = CY - r2 * Math.sin(a1);
                            const isActive = i === level;
                            return (
                              <path
                                key={i}
                                d={`M ${ox1} ${oy1} A ${R} ${R} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${r2} ${r2} 0 0 0 ${ix1} ${iy1} Z`}
                                fill={r.color}
                                opacity={isActive ? 1 : 0.18}
                                filter={isActive ? 'url(#rmGlow)' : 'none'}
                                style={{ transition: 'opacity 0.6s ease' }}
                              />
                            );
                          })}

                          {/* Labels outside arc */}
                          {RISK_LEVELS.map((r, i) => {
                            const midAngle = Math.PI - ((i + 0.5) / 6) * totalAngle;
                            const labelR = R + 16;
                            const lx = CX + labelR * Math.cos(midAngle);
                            const ly = CY - labelR * Math.sin(midAngle);
                            const isActive = i === level;
                            // Rotation for readability
                            const rotDeg = -((midAngle * 180) / Math.PI - 90);
                            const flip = rotDeg > 90 || rotDeg < -90;
                            const finalRot = flip ? rotDeg + 180 : rotDeg;
                            return (
                              <text
                                key={i}
                                x={lx} y={ly}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={isActive ? '#f1f5f9' : 'rgba(255,255,255,0.3)'}
                                fontSize={isActive ? '7' : '6'}
                                fontWeight={isActive ? '700' : '400'}
                                fontFamily="Inter, system-ui, sans-serif"
                                transform={`rotate(${finalRot}, ${lx}, ${ly})`}
                                style={{ transition: 'all 0.4s ease' }}
                              >
                                {r.label}
                              </text>
                            );
                          })}

                          {/* Tick marks at segment boundaries */}
                          {[0, 1, 2, 3, 4, 5, 6].map(i => {
                            const a = Math.PI - (i / 6) * totalAngle;
                            const t1 = CX + (R + 1) * Math.cos(a), u1 = CY - (R + 1) * Math.sin(a);
                            const t2 = CX + (R + 6) * Math.cos(a), u2 = CY - (R + 6) * Math.sin(a);
                            return <line key={i} x1={t1} y1={u1} x2={t2} y2={u2} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
                          })}

                          {/* Needle — tapered with gradient */}
                          {(() => {
                            const needleAngle = Math.PI - ((level + 0.5) / 6) * totalAngle;
                            const needleLen = r2 - 6;
                            const tipX = CX + needleLen * Math.cos(needleAngle);
                            const tipY = CY - needleLen * Math.sin(needleAngle);
                            const basePerp = Math.PI / 2;
                            const bx1 = CX + 4 * Math.cos(needleAngle + basePerp);
                            const by1 = CY - 4 * Math.sin(needleAngle + basePerp);
                            const bx2 = CX + 4 * Math.cos(needleAngle - basePerp);
                            const by2 = CY - 4 * Math.sin(needleAngle - basePerp);
                            return (
                              <g filter="url(#rmNeedleShadow)">
                                <polygon
                                  points={`${bx1},${by1} ${bx2},${by2} ${tipX},${tipY}`}
                                  fill="url(#rmNeedleGrad)"
                                />
                                <circle cx={tipX} cy={tipY} r="2" fill="#f8fafc" />
                              </g>
                            );
                          })()}

                          {/* Center hub — chrome effect */}
                          <circle cx={CX} cy={CY} r="12" fill="url(#rmHubGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                          <circle cx={CX} cy={CY} r="5" fill={risk.color} opacity="0.9" />
                          <circle cx={CX} cy={CY} r="2.5" fill="#020617" />

                          {/* Base line */}
                          <line x1={CX - R - 4} y1={CY + 1} x2={CX + R + 4} y2={CY + 1} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                        </svg>
                      </div>
                      <div className="risk-meter-result">
                        <div className="risk-meter-pill" style={{ '--risk-color': risk.color, color: 'var(--risk-color)', borderColor: 'var(--risk-color)' }}>
                          {risk.label}
                        </div>
                        <p className="risk-meter-desc">{risk.desc}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="wti-grid">
                  {wtiData.products.map((product, idx) => (
                    <div key={idx} className={`wti-item ${idx === 0 ? 'wti-item--featured' : ''}`}>
                      <div className="wti-rank">{idx + 1}</div>
                      <div className="wti-card-body">
                        <div className="wti-card-top">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <h4 className="wti-name">{product.name}</h4>
                              {product.badge && <span className="wti-badge">{product.badge}</span>}
                            </div>
                            <span className="wti-provider">{product.provider}</span>
                          </div>
                          <div className="wti-rate-chip">{product.rate}</div>
                        </div>
                        <p className="wti-highlights">{product.highlight}</p>
                        <div className="wti-meta-footer">
                          <div className="meta-box"><Building2 size={12} /> {product.platform}</div>
                          <div className="meta-box"><Wallet size={12} /> Min: {product.minInvestment}</div>
                          {product.tenure && <div className="meta-box"><HistoryIcon size={12} /> {product.tenure}</div>}
                          {idx === 0 && <div className="meta-box meta-box--pick"><Star size={12} /> Top Pick</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* How to Start */}
                {wtiData.howToStart && (
                  <div className="wti-howto">
                    <Zap size={14} style={{ flexShrink: 0, color: '#22c55e' }} />
                    <div>
                      <span className="wti-howto-label">How to get started</span>
                      <p>{wtiData.howToStart}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: CALCULATOR */}
          {activeTab === 'Calculator' && (
            <div className="tab-fade-in">
              <div className="ddm-section-header">Wealth Projection Engine</div>

              {/* Range Info Banner */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 12, 
                padding: '14px 20px', borderRadius: '16px', marginBottom: 24,
                background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.1), rgba(56, 189, 248, 0.02))',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderLeft: '4px solid #38bdf8',
                fontSize: '0.85rem', color: '#cbd5e1',
                boxShadow: '0 8px 24px -8px rgba(56,189,248,0.1)'
              }}>
                <Info size={18} style={{ flexShrink: 0, color: '#7dd3fc' }} />
                <span>Sliders are auto-calibrated to <strong style={{ color: '#f8fafc', fontWeight: 800 }}>{inv.name}'s</strong> realistic parameters. Expected Return: <strong style={{ color: '#38bdf8' }}>{calcBounds.returnMin}%–{calcBounds.returnMax}%</strong> | Tenure: <strong style={{ color: '#38bdf8' }}>{calcBounds.yearMin}–{calcBounds.yearMax} yrs</strong></span>
              </div>

              <div className="calc-premium-grid">
                <div className="calc-inputs-vertical">
                  <div className="calc-field">
                    <div className="calc-label-row">
                      <label className="metric-label">Periodic Allocation</label>
                      <span className="calc-value-display">₹{calcAmount.toLocaleString()}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1000" max="500000" step="1000" 
                      value={calcAmount} 
                      onChange={e => setCalcAmount(Number(e.target.value))} 
                      style={{ 
                        '--slider-pct': `${(calcAmount - 1000)/(500000 - 1000) * 100}%`
                      }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
                      <span>₹1,000</span><span>₹5,00,000</span>
                    </div>
                  </div>
                  <div className="calc-field">
                    <div className="calc-label-row">
                      <label className="metric-label">Time Horizon</label>
                      <span className="calc-value-display">{calcYears} {calcYears === 1 ? 'Year' : 'Years'}</span>
                    </div>
                    <input 
                      type="range" 
                      min={calcBounds.yearMin} max={calcBounds.yearMax} 
                      value={calcYears} 
                      onChange={e => setCalcYears(Number(e.target.value))} 
                      style={{ 
                        '--slider-pct': `${(calcYears - calcBounds.yearMin)/Math.max(1, calcBounds.yearMax - calcBounds.yearMin) * 100}%`
                      }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
                      <span>{calcBounds.yearMin} yr</span><span>{calcBounds.yearMax} yrs</span>
                    </div>
                  </div>
                  <div className="calc-field">
                    <div className="calc-label-row">
                      <label className="metric-label">Expected Annual Return</label>
                      <span className="calc-value-display">{calcReturn}%</span>
                    </div>
                    <input 
                      type="range" 
                      min={calcBounds.returnMin} max={calcBounds.returnMax} step="0.5" 
                      value={calcReturn} 
                      onChange={e => setCalcReturn(Number(e.target.value))} 
                      style={{ 
                        '--slider-pct': `${(calcReturn - calcBounds.returnMin)/Math.max(1, calcBounds.returnMax - calcBounds.returnMin) * 100}%`
                      }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
                      <span>{calcBounds.returnMin}%</span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Avg: {((inv.expected_return_min + inv.expected_return_max) / 2).toFixed(1)}%</span>
                      <span>{calcBounds.returnMax}%</span>
                    </div>
                  </div>
                </div>

                <div className="calc-sidebar">
                  <div className="sidebar-stat">
                    <span className="sidebar-label">Total Principal</span>
                    <span className="sidebar-value" style={{ whiteSpace: 'nowrap' }}>{formatINR(totalInvested)}</span>
                  </div>
                  <div className="sidebar-stat">
                    <span className="sidebar-label">Estimated Yield</span>
                    <span className="sidebar-value" style={{ color: '#22c55e', whiteSpace: 'nowrap' }}>+{formatINR(estimatedReturns)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--ddm-border)', paddingTop: 16 }}>
                    <span className="sidebar-label" style={{ color: '#38bdf8' }}>Net Maturity Value</span>
                    <span className="sidebar-value" style={{ fontSize: '2.4rem', color: '#7dd3fc', textShadow: '0 4px 24px rgba(56, 189, 248, 0.4)', whiteSpace: 'nowrap', display: 'block', marginTop: '8px' }}>{formatINR(maturityValue)}</span>
                  </div>

                  {/* Post-Tax & Inflation Section */}
                  <div style={{ borderTop: '1px solid var(--ddm-border)', paddingTop: 14, marginTop: 6 }}>
                    <div className="sidebar-stat" style={{ marginBottom: 10 }}>
                      <span className="sidebar-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Shield size={11} style={{ color: '#f59e0b' }} /> After Tax (est.)
                      </span>
                      <span className="sidebar-value" style={{ color: '#fbbf24', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>{formatINR(postTaxValue)}</span>
                    </div>
                    <div className="sidebar-stat">
                      <span className="sidebar-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={11} style={{ color: '#f97316' }} /> Today's Value ({INFLATION_RATE}% inflation)
                      </span>
                      <span className="sidebar-value" style={{ color: '#fb923c', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>{formatINR(realMaturityValue)}</span>
                    </div>
                  </div>

                  {/* Goal-Mapping Milestones — uses inflation-adjusted (real) value for accuracy */}
                  {realMaturityValue > 0 && (() => {
                    // All amounts in today's (2026) rupees — goals use realMaturityValue
                    const goals = [
                      { min: 20000,     icon: '', label: 'Premium wireless earbuds', amount: '~₹20K' },
                      { min: 50000,     icon: '', label: 'iPhone SE / Samsung S24 FE', amount: '~₹50K' },
                      { min: 85000,     icon: '', label: 'Honda Activa 6G (on-road)', amount: '~₹85K' },
                      { min: 135000,    icon: '', label: 'iPhone 16 Pro', amount: '~₹1.35L' },
                      { min: 250000,    icon: '', label: 'Thailand/Bali trip for 2', amount: '~₹2.5L' },
                      { min: 500000,    icon: '', label: 'MacBook Pro M4', amount: '~₹5L' },
                      { min: 900000,    icon: '', label: 'Maruti Brezza (on-road)', amount: '~₹9L' },
                      { min: 1200000,   icon: '', label: '4-yr engineering (state college)', amount: '~₹12L' },
                      { min: 1800000,   icon: '', label: 'Hyundai Creta (on-road)', amount: '~₹18L' },
                      { min: 2500000,   icon: '', label: 'Middle-class Indian wedding', amount: '~₹25L' },
                      { min: 4000000,   icon: '', label: 'MBA from IIM (2-yr total)', amount: '~₹40L' },
                      { min: 6000000,   icon: '', label: 'Fortuner / XUV700 (top-end)', amount: '~₹60L' },
                      { min: 8000000,   icon: '', label: '2BHK in Bangalore/Pune', amount: '~₹80L' },
                      { min: 12000000,  icon: '', label: '3BHK in Mumbai suburb', amount: '~₹1.2Cr' },
                      { min: 25000000,  icon: '', label: '3BHK premium metro flat', amount: '~₹2.5Cr' },
                      { min: 50000000,  icon: '', label: 'Financial independence (25x rule)', amount: '~₹5Cr' },
                      { min: 100000000, icon: '', label: 'Early retirement corpus', amount: '~₹10Cr' },
                    ];
                    const matched = goals.filter(g => realMaturityValue >= g.min);
                    const topGoals = matched.slice(-3).reverse();
                    if (topGoals.length === 0) return null;
                    return (
                      <div className="goal-map-section">
                        <div className="goal-map-title">What this money could buy (today's prices)</div>
                        {topGoals.map((g, i) => (
                          <div key={i} className="goal-map-item">
                            <span className="goal-map-icon">{g.icon}</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                              <span className="goal-map-label">{g.label}</span>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, flexShrink: 0 }}>{g.amount}</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
                          * Compared using inflation-adjusted value ({INFLATION_RATE}% CPI)
                        </div>
                      </div>
                    );
                  })()}

                  {/* ─── 5th Feature: Save / Export Goal ─── */}
                  <div className="goal-export-section">
                    <button
                      className="goal-export-btn goal-export-btn--pdf"
                      onClick={() => {
                        const report = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>WealthGenie – ${inv.name} Goal Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',system-ui,sans-serif;background:#0f172a;color:#f1f5f9;padding:40px}
  .header{text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #1e293b}
  .header h1{font-size:1.8rem;font-weight:800;background:linear-gradient(135deg,#8b5cf6,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .header p{color:#94a3b8;font-size:0.85rem;margin-top:6px}
  .badge{display:inline-block;font-size:0.65rem;font-weight:700;padding:3px 10px;border-radius:6px;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);margin-top:8px;text-transform:uppercase;letter-spacing:1px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .card{background:rgba(30,41,59,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px}
  .card .label{font-size:0.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600}
  .card .value{font-size:1.4rem;font-weight:800;margin-top:6px}
  .card .value.green{color:#22c55e}
  .card .value.cyan{color:#38bdf8}
  .card .value.yellow{color:#fbbf24}
  .card .value.orange{color:#fb923c}
  .goals{margin-top:24px}
  .goals h3{font-size:0.8rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
  .goal-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(30,41,59,0.4);border-radius:10px;margin-bottom:6px;border:1px solid rgba(255,255,255,0.04)}
  .goal-row span:first-child{font-size:1.2rem}
  .goal-row .gl{flex:1;font-size:0.85rem;color:#cbd5e1}
  .goal-row .ga{font-size:0.75rem;color:#64748b;font-weight:600}
  .disclaimer{margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;font-size:0.65rem;color:#475569;text-align:center;line-height:1.6}
  @media print{body{background:#fff;color:#0f172a} .card{border:1px solid #e2e8f0} .card .label{color:#64748b} .card .value{color:#0f172a} .card .value.green{color:#16a34a} .card .value.cyan{color:#0284c7} .goal-row{background:#f8fafc;border:1px solid #e2e8f0} .goal-row .gl{color:#334155} .header h1{-webkit-text-fill-color:#7c3aed}}
</style></head><body>
<div class="header">
  <h1>WealthGenie</h1>
  <p>Wealth Projection Report for <strong>${inv.name}</strong></p>
  <div class="badge">${inv.category} • ${calcYears} Year Horizon</div>
</div>
<div class="grid">
  <div class="card"><div class="label">Monthly Investment</div><div class="value cyan">₹${calcAmount.toLocaleString('en-IN')}</div></div>
  <div class="card"><div class="label">Expected Return</div><div class="value cyan">${calcReturn}% p.a.</div></div>
  <div class="card"><div class="label">Total Principal</div><div class="value">${formatINR(totalInvested)}</div></div>
  <div class="card"><div class="label">Estimated Yield</div><div class="value green">+${formatINR(estimatedReturns)}</div></div>
  <div class="card"><div class="label">Net Maturity Value</div><div class="value cyan" style="font-size:1.6rem">${formatINR(maturityValue)}</div></div>
  <div class="card"><div class="label">After Tax (est.)</div><div class="value yellow">${formatINR(postTaxValue)}</div></div>
  <div class="card" style="grid-column:span 2"><div class="label">Today's Purchasing Power (6% inflation adjusted)</div><div class="value orange">${formatINR(realMaturityValue)}</div></div>
</div>
<div class="disclaimer">
  Disclaimer: This is a projection based on estimated returns. Past performance does not guarantee future results.<br>
  All figures are indicative. Consult a SEBI-registered investment advisor before investing.<br><br>
  Generated by WealthGenie • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>
</body></html>`;
                        const blob = new Blob([report], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const w = window.open(url, '_blank');
                        setTimeout(() => { w?.print(); }, 600);
                      }}
                    >
                      <ExternalLink size={14} />
                      Save Goal Report
                    </button>
                    <button
                      className="goal-export-btn goal-export-btn--copy"
                      onClick={(e) => {
                        const btn = e.currentTarget;
                        const summary = `WealthGenie – ${inv.name} Goal Report\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Monthly SIP: ₹${calcAmount.toLocaleString('en-IN')}\n• Expected Return: ${calcReturn}% p.a.\n• Time Horizon: ${calcYears} years\n\n• Total Invested: ${formatINR(totalInvested)}\n• Maturity Value: ${formatINR(maturityValue)}\n• After Tax: ${formatINR(postTaxValue)}\n• Today's Value: ${formatINR(realMaturityValue)}\n\n* Past performance is not indicative of future results.\nGenerated by WealthGenie • ${new Date().toLocaleDateString('en-IN')}`;
                        navigator.clipboard.writeText(summary).then(() => {
                          btn.textContent = '✓ Copied!';
                          btn.style.borderColor = '#22c55e';
                          btn.style.color = '#22c55e';
                          setTimeout(() => {
                            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Summary';
                            btn.style.borderColor = '';
                            btn.style.color = '';
                          }, 2000);
                        });
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copy Summary
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TAX */}
          {activeTab === 'Tax' && (() => {
            const name = (inv.name || '').toLowerCase();
            const cat = (inv.category || '').toLowerCase();
            
            // Instrument-specific tax intelligence (FY 2025-26, Budget 2024 rules)
            const taxInfo = (() => {
              const base = {
                section: inv.tax_section || 'N/A',
                taxBenefit: inv.tax_benefit || false,
                taxFreeInterest: inv.tax_free_interest || false,
                maxDeduction: 'N/A',
                ltcg: '',
                stcg: '',
                specialNote: null,
              };

              // ─── PPF ───
              if (name.includes('ppf')) {
                return { ...base, taxBenefit: true, section: '80C', taxFreeInterest: true, maxDeduction: '₹1,50,000',
                  ltcg: 'Fully exempt (EEE status). Maturity amount + interest = 100% tax-free.',
                  stcg: 'Not applicable — PPF has a 15-year lock-in. Partial withdrawal allowed from Year 7.',
                  specialNote: 'PPF is the only instrument in India with complete EEE (Exempt-Exempt-Exempt) status.' };
              }
              // ─── ELSS ───
              if (name.includes('elss')) {
                return { ...base, taxBenefit: true, section: '80C', maxDeduction: '₹1,50,000',
                  ltcg: 'LTCG above ₹1.25 Lakh taxed at 12.5% (held >1 year, effective from Budget 2024).',
                  stcg: 'Not applicable — ELSS has a mandatory 3-year lock-in period.',
                  specialNote: 'ELSS is the only equity instrument eligible for Section 80C deduction with the shortest lock-in (3 yrs).' };
              }
              // ─── NPS ───
              if (name.includes('nps')) {
                return { ...base, taxBenefit: true, section: '80CCD(1B)', maxDeduction: '₹50,000 (additional, over 80C limit)',
                  ltcg: '60% of corpus at maturity is tax-free. 40% must be used to buy an annuity (pension income taxed at slab rate).',
                  stcg: 'Premature withdrawal: 20% of corpus is taxable at slab rate. Remaining 80% must buy an annuity.',
                  specialNote: 'NPS offers an exclusive ₹50,000 additional deduction under 80CCD(1B) — on top of the ₹1.5L under 80C.' };
              }
              // ─── SCSS ───
              if (name.includes('scss')) {
                return { ...base, taxBenefit: true, section: '80C', maxDeduction: '₹1,50,000',
                  ltcg: 'Interest is fully taxable at slab rate. TDS deducted if interest exceeds ₹50,000/year.',
                  stcg: 'Premature closure: 1.5% penalty if closed in Year 2-3, 1% in Year 4-5.',
                  specialNote: 'Available only for senior citizens (60+). Interest rate: 8.2% (Q1 FY26), reviewed quarterly by MoF.' };
              }
              // ─── SSY (Sukanya Samriddhi) ───
              if (name.includes('sukanya') || name.includes('ssy')) {
                return { ...base, taxBenefit: true, section: '80C', taxFreeInterest: true, maxDeduction: '₹1,50,000',
                  ltcg: 'Fully exempt (EEE). Maturity proceeds are 100% tax-free.',
                  stcg: 'Not applicable — 21-year maturity with partial withdrawal after age 18.',
                  specialNote: 'Highest government-guaranteed rate (8.2%). Available only for girl children below 10 years.' };
              }
              // ─── SGB (Sovereign Gold Bond) ───
              if (name.includes('sgb') || (name.includes('gold') && name.includes('bond'))) {
                return { ...base, taxBenefit: false, maxDeduction: 'N/A',
                  ltcg: 'LTCG at maturity (8 years) is fully tax-free. If sold on exchange before maturity: 12.5% LTCG without indexation.',
                  stcg: 'Sold within 1 year: gains taxed at slab rate. Interest (2.5% p.a.) is always taxable at slab rate.',
                  specialNote: 'SGBs are the most tax-efficient way to hold gold. Hold to 8-year maturity for zero capital gains tax.' };
              }
              // ─── FD / Fixed Deposit ───
              if (name.includes('fd') || name.includes('fixed deposit')) {
                return { ...base, taxBenefit: name.includes('tax') || name.includes('5yr'), section: name.includes('tax') ? '80C' : 'N/A', maxDeduction: name.includes('tax') ? '₹1,50,000' : 'N/A',
                  ltcg: 'No capital gains concept. Interest is taxed at slab rate every year (accrual basis).',
                  stcg: 'TDS at 10% if interest >₹40,000/year (₹50,000 for senior citizens). Form 15G/15H to avoid TDS if no tax liability.',
                  specialNote: 'FD interest is one of the most tax-inefficient income sources. Post-tax real return is often negative for 30% slab holders.' };
              }
              // ─── Gold (Physical/ETF) ───
              if (name.includes('gold') && !name.includes('bond')) {
                return { ...base,
                  ltcg: 'LTCG (held >2 years for physical, >1 year for ETF) taxed at 12.5% flat — no indexation benefit (Budget 2024).',
                  stcg: 'STCG taxed at slab rate.',
                  specialNote: 'Physical gold also attracts 3% GST on purchase + making charges. Gold ETFs avoid these costs.' };
              }
              // ─── Equity Mutual Funds (generic) ───
              if (cat === 'equity' || cat === 'hybrid') {
                return { ...base,
                  ltcg: `LTCG above ₹1.25 Lakh taxed at 12.5% (held >1 year). Budget 2024 raised this from ₹1L to ₹1.25L and rate from 10% to 12.5%.`,
                  stcg: 'STCG (held <1 year) taxed at 20% flat (increased from 15% in Budget 2024).',
                  specialNote: 'Equity MFs held >1 year get the ₹1.25L annual LTCG exemption. SIP units are individually tracked for holding period.' };
              }
              // ─── Debt Mutual Funds ───
              if (cat === 'debt') {
                return { ...base,
                  ltcg: 'No LTCG benefit since April 2023. All gains (regardless of holding period) taxed at slab rate. Indexation benefit removed.',
                  stcg: 'All gains taxed at slab rate — no distinction between short/long term.',
                  specialNote: 'Post-April 2023, debt MFs lost their indexation advantage over FDs. They are now taxed identically to bank FDs.' };
              }
              // ─── Fallback ───
              return { ...base,
                ltcg: inv.category === 'Equity' ? 'Gains above ₹1.25L taxed at 12.5% (held >1 year)' : 'Taxed as per income slab',
                stcg: inv.category === 'Equity' ? 'Taxed at 20% (held <1 year)' : 'Taxed as per income slab',
              };
            })();
            return (
              <div className="tab-fade-in">
                <div className="ddm-section-header">Tax Compliance Framework</div>
                <div className="ddm-pc-grid" style={{ marginBottom: 32 }}>
                  <div className="tax-card-premium" style={{ borderTop: `1px solid ${taxInfo.taxBenefit ? 'rgba(34, 197, 94, 0.6)' : 'rgba(244, 63, 94, 0.6)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <span className="metric-label" style={{ color: '#94a3b8', fontSize: '0.85rem', letterSpacing: '1.5px', fontWeight: 700 }}><JargonTooltip term="Section 80C">SECTION 80C ELIGIBILITY</JargonTooltip></span>
                      <Shield size={20} color={taxInfo.taxBenefit ? '#22c55e' : '#f43f5e'} opacity={0.6} />
                    </div>
                    <div style={{ margin: '16px 0', flexGrow: 1 }}>
                      <span className={`tax-status-chip ${taxInfo.taxBenefit ? 'tax-status-chip--eligible' : 'tax-status-chip--not-eligible'}`} style={{ fontSize: '1.1rem', padding: '12px 20px', borderRadius: '12px', boxShadow: `0 0 24px ${taxInfo.taxBenefit ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)'}` }}>
                        {taxInfo.taxBenefit ? <><ShieldCheck size={20} /> QUALIFIED</> : <><X size={20} /> NOT ELIGIBLE</>}
                      </span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Deduction limit</span>
                      <strong style={{ color: '#f8fafc', fontSize: '1.1rem', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }}>{taxInfo.maxDeduction}</strong>
                    </div>
                  </div>
                  <div className="tax-card-premium" style={{ borderTop: '1px solid rgba(56, 189, 248, 0.6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <span className="metric-label" style={{ color: '#94a3b8', fontSize: '0.85rem', letterSpacing: '1.5px', fontWeight: 700 }}>TAXABILITY OF INTEREST</span>
                      <Briefcase size={20} color="#38bdf8" opacity={0.6} />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '12px 0', color: '#f8fafc', letterSpacing: '-0.03em', flexGrow: 1, textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                      {taxInfo.taxFreeInterest ? <span style={{ color: '#38bdf8', textShadow: '0 0 24px rgba(56,189,248,0.5)' }}><JargonTooltip term="EEE">Tax-Free (EEE)</JargonTooltip></span> : <span style={{ color: '#f8fafc' }}>Fully Taxable</span>}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Applicable Section</span>
                      <strong style={{ color: '#cbd5e1', fontSize: '1.1rem', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }}>{taxInfo.section}</strong>
                    </div>
                  </div>
                </div>

                <div className="ddm-section-header">Capital Gains (Market Linked)</div>
                <div className="ddm-pc-grid">
                  <div className="tax-cg-card" style={{ borderTop: '1px solid rgba(245, 158, 11, 0.6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 12px 24px -8px rgba(245, 158, 11, 0.2)' }}>
                         <HistoryIcon size={28} color="#fcd34d" />
                      </div>
                      <div>
                        <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Holding Period</div>
                        <div style={{ color: '#f8fafc', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                          <JargonTooltip term="LTCG">Long-Term (LTCG)</JargonTooltip>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                      <p style={{ color: '#e2e8f0', fontSize: '1.1rem', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>{taxInfo.ltcg}</p>
                    </div>
                  </div>
                  <div className="tax-cg-card" style={{ borderTop: '1px solid rgba(244, 63, 94, 0.6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(244, 63, 94, 0.05))', borderRadius: '16px', border: '1px solid rgba(244, 63, 94, 0.3)', boxShadow: '0 12px 24px -8px rgba(244, 63, 94, 0.2)' }}>
                         <Zap size={28} color="#fda4af" />
                      </div>
                      <div>
                        <div style={{ color: '#fb7185', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Holding Period</div>
                        <div style={{ color: '#f8fafc', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                          <JargonTooltip term="STCG">Short-Term (STCG)</JargonTooltip>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                      <p style={{ color: '#e2e8f0', fontSize: '1.1rem', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>{taxInfo.stcg}</p>
                    </div>
                  </div>
                </div>

                {/* Special Note — Instrument-specific tax intelligence */}
                {taxInfo.specialNote && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '16px 20px', borderRadius: 14, marginTop: 20,
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05), rgba(139, 92, 246, 0.04))',
                    border: '1px solid rgba(56, 189, 248, 0.12)',
                  }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: '#38bdf8' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tax Intelligence</div>
                      <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{taxInfo.specialNote}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'History' && (
            <div className="tab-fade-in">
              <div className="ddm-section-header">Volatility Backtesting</div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 12, paddingLeft: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 3, background: '#8b5cf6', borderRadius: 2 }} />
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{inv.name} (Projected)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 2, borderTop: '1px dashed rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>FD Benchmark (6.5%)</span>
                </div>
              </div>

              <div style={{ height: 340, background: 'rgba(15, 23, 42, 0.4)', borderRadius: 18, padding: '24px 20px 16px', border: '1px solid var(--ddm-border)' }}>
                <ResponsiveContainer>
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.08}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div style={{
                            background: 'rgba(2, 6, 23, 0.95)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(12px)',
                            minWidth: 180,
                          }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                            {payload.map((p, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                                <span style={{ fontSize: '0.78rem', color: p.dataKey === 'investment' ? '#c4b5fd' : '#64748b', fontWeight: 600 }}>
                                  {p.dataKey === 'investment' ? `${inv.name}` : 'FD Benchmark'}
                                </span>
                                <span style={{ fontSize: '0.82rem', color: p.dataKey === 'investment' ? '#8b5cf6' : '#94a3b8', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                                  ₹{p.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="investment" 
                      stroke="#8b5cf6" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorInv)" 
                      animationDuration={1500}
                      name={inv.name}
                    />
                    <Area type="monotone" dataKey="fd" stroke="rgba(255,255,255,0.15)" strokeDasharray="5 5" strokeWidth={1.5} fill="url(#colorFd)" fillOpacity={1} dot={false} name="FD Benchmark" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p style={{ color: 'var(--ddm-text-muted)', fontSize: '0.7rem', marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
                * Simulated projection based on historical return ranges. Actual results may vary. Base ₹100 normalized.
              </p>
            </div>
           )}

          {/* TAB: WHY INVEST — Cost of Doing Nothing */}
          {activeTab === 'Why Invest' && (() => {
            const SAVINGS_RATE = 2.7; // SBI savings account rate (May 2026, above ₹10L: 2.7%)
            const INFLATION = 6; // India CPI 10-yr avg ~5.8%, rounded to 6% for conservative projection
            const realLossRate = (INFLATION - SAVINGS_RATE).toFixed(1); // ~3.3% real loss per year

            // Compute what happens if user puts the same money in savings vs this investment
            const savingsMaturity = calcMode === 'SIP'
              ? calculateSIPFutureValue(calcAmount, SAVINGS_RATE, calcYears)
              : calculateLumpSumFutureValue(calcAmount, SAVINGS_RATE, calcYears);
            const savingsReal = savingsMaturity / Math.pow(1 + INFLATION / 100, calcYears);
            const investMaturity = maturityValue;
            const investReal = realMaturityValue;
            const opportunityCost = investReal - savingsReal;
            const purchasingPowerLost = totalInvested - savingsReal;

            // Year-by-year erosion table
            const erosionData = [];
            for (let y = 1; y <= Math.min(calcYears, 10); y++) {
              const savVal = calcMode === 'SIP'
                ? calculateSIPFutureValue(calcAmount, SAVINGS_RATE, y)
                : calculateLumpSumFutureValue(calcAmount, SAVINGS_RATE, y);
              const invVal = calcMode === 'SIP'
                ? calculateSIPFutureValue(calcAmount, calcReturn, y)
                : calculateLumpSumFutureValue(calcAmount, calcReturn, y);
              const infFactor = Math.pow(1 + INFLATION / 100, y);
              erosionData.push({
                year: y,
                savingsNominal: savVal,
                savingsReal: savVal / infFactor,
                investNominal: invVal,
                investReal: invVal / infFactor,
                principalAtYear: calcMode === 'SIP' ? calcAmount * 12 * y : calcAmount,
              });
            }

            return (
              <div className="tab-fade-in">
                <div className="ddm-section-header">The Cost of Doing Nothing</div>

                {/* Hero Warning Banner */}
                <div className="why-invest-hero">
                  <div className="why-invest-hero-icon"><TrendingDown size={24} /></div>
                  <div>
                    <div className="why-invest-hero-title">Inflation is silently eating your savings</div>
                    <div className="why-invest-hero-subtitle">
                      At {INFLATION}% inflation, your money loses ~half its purchasing power every 14 years.
                      A savings account at {SAVINGS_RATE}% doesn't even keep up — you lose {realLossRate}% purchasing power every year.
                    </div>
                  </div>
                </div>

                {/* Side-by-side comparison cards */}
                <div className="why-invest-compare-grid">
                  {/* Savings Account Card */}
                  <div className="why-invest-card why-invest-card--bad">
                    <div className="why-invest-card-header">
                      <div className="why-invest-card-icon why-invest-card-icon--bad">
                        <TrendingDown size={18} />
                      </div>
                      <div>
                        <div className="why-invest-card-title">Savings Account</div>
                        <div className="why-invest-card-rate">{SAVINGS_RATE}% p.a.</div>
                      </div>
                    </div>
                    <div className="why-invest-card-body">
                      <div className="why-invest-metric">
                        <span className="why-invest-metric-label">After {calcYears} years (nominal)</span>
                        <span className="why-invest-metric-value">{formatINR(savingsMaturity)}</span>
                      </div>
                      <div className="why-invest-metric">
                        <span className="why-invest-metric-label">Real value (today's ₹)</span>
                        <span className="why-invest-metric-value why-invest-metric-value--loss">{formatINR(savingsReal)}</span>
                      </div>
                      <div className="why-invest-verdict why-invest-verdict--loss">
                        <TrendingDown size={14} />
                        <span>You <strong>lose</strong> {formatINR(purchasingPowerLost)} in purchasing power</span>
                      </div>
                    </div>
                  </div>

                  {/* This Investment Card */}
                  <div className="why-invest-card why-invest-card--good">
                    <div className="why-invest-card-header">
                      <div className="why-invest-card-icon why-invest-card-icon--good">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <div className="why-invest-card-title">{inv.name}</div>
                        <div className="why-invest-card-rate">{calcReturn}% p.a.</div>
                      </div>
                    </div>
                    <div className="why-invest-card-body">
                      <div className="why-invest-metric">
                        <span className="why-invest-metric-label">After {calcYears} years (nominal)</span>
                        <span className="why-invest-metric-value">{formatINR(investMaturity)}</span>
                      </div>
                      <div className="why-invest-metric">
                        <span className="why-invest-metric-label">Real value (today's ₹)</span>
                        <span className="why-invest-metric-value why-invest-metric-value--gain">{formatINR(investReal)}</span>
                      </div>
                      <div className="why-invest-verdict why-invest-verdict--gain">
                        <TrendingUp size={14} />
                        <span>You <strong>grow</strong> wealth by {formatINR(opportunityCost)} more</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Opportunity Cost Highlight */}
                <div className="why-invest-opportunity">
                  <div className="why-invest-opportunity-label">Opportunity Cost of Not Investing</div>
                  <div className="why-invest-opportunity-value">{formatINR(opportunityCost)}</div>
                  <div className="why-invest-opportunity-sub">
                    This is the real money you leave on the table by choosing a savings account over {inv.name} for {calcYears} years
                  </div>
                </div>

                {/* Year-by-Year Erosion Table */}
                <div className="ddm-section-header" style={{ marginTop: 28 }}>Year-by-Year Comparison</div>
                <div className="why-invest-table-wrap">
                  <table className="why-invest-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Principal</th>
                        <th className="why-invest-th--bad">Savings (Real ₹)</th>
                        <th className="why-invest-th--good">{inv.name.length > 12 ? inv.name.substring(0,12) + '..' : inv.name} (Real ₹)</th>
                        <th>Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {erosionData.map(d => (
                        <tr key={d.year}>
                          <td>{d.year}</td>
                          <td>{formatINR(d.principalAtYear)}</td>
                          <td className="why-invest-td--bad">{formatINR(d.savingsReal)}</td>
                          <td className="why-invest-td--good">{formatINR(d.investReal)}</td>
                          <td style={{ color: d.investReal > d.savingsReal ? '#22c55e' : '#f43f5e', fontWeight: 700 }}>
                            {d.investReal > d.savingsReal ? '+' : ''}{formatINR(d.investReal - d.savingsReal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom CTA */}
                <div className="why-invest-cta">
                  <div className="why-invest-cta-text">
                    <strong>The best time to invest was yesterday.</strong> The second best time is today.
                  </div>
                  <button
                    className="why-invest-cta-btn"
                    onClick={() => setActiveTab('Calculator')}
                  >
                    Open Calculator <ArrowRight size={14} />
                  </button>
                </div>

                <p style={{ color: 'var(--ddm-text-muted)', fontSize: '0.65rem', marginTop: 16, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5 }}>
                  * All "Real Value" figures are adjusted for {INFLATION}% annual inflation (India CPI avg).
                  Savings account rate assumed at {SAVINGS_RATE}% (SBI, 2026). Returns are estimates, not guaranteed.
                </p>
              </div>
            );
          })()}



          {/* TAB: STRESS TEST — Drawdown Simulator */}
          {activeTab === 'Stress Test' && (() => {
            const cat = (inv.category || '').toLowerCase();
            const isEquity = cat === 'equity' || cat === 'hybrid';
            const isDebt = cat === 'debt' || cat === 'fixed income';
            const isGovt = cat === 'government';
            const isGold = (inv.name || '').toLowerCase().includes('gold');

            // Historical crash data per category — recoveryMultiplier = value of ₹1 at recovery point
            // (verified against NSE Nifty 50, CRISIL Bond Index, MCX Gold historical data)
            const crashScenarios = isGold ? [
              { name: '2013 Gold Crash', period: 'Apr 2013 – Dec 2015', drop: -26, recovery: '~6 years', recoveryMultiplier: 1.0, cause: 'Fed taper tantrum, strong dollar, India import duty hikes to 10%' },
              { name: '2020 COVID Correction', period: 'Aug 2020 – Mar 2021', drop: -12, recovery: '6 months', recoveryMultiplier: 1.02, cause: 'Post-COVID profit booking, vaccine optimism, risk-on sentiment' },
            ] : isGovt ? [
              { name: '2013 Taper Tantrum', period: 'May 2013 – Aug 2013', drop: -3, recovery: '4 months', recoveryMultiplier: 1.01, cause: 'US Fed policy shift, INR depreciation from ₹54 to ₹68/$' },
              { name: '2022 Rate Hike Cycle', period: 'Apr 2022 – Oct 2022', drop: -2, recovery: '3 months', recoveryMultiplier: 1.005, cause: 'RBI hiked repo rate by 250 bps (4.0% → 6.5%)' },
            ] : isDebt ? [
              { name: '2008 Credit Crisis', period: 'Sep 2008 – Mar 2009', drop: -5, recovery: '4-6 months', recoveryMultiplier: 1.02, cause: 'Global credit freeze, sharp bond yield spike, FII outflows' },
              { name: '2020 Franklin Templeton', period: 'Apr 2020', drop: -4, recovery: 'Capital locked 2-3 yrs', recoveryMultiplier: 1.10, cause: '6 debt schemes wound up due to illiquidity; investors got 107-113% back eventually' },
              { name: '2022 Rising Rates', period: 'Apr 2022 – Oct 2022', drop: -3, recovery: '5 months', recoveryMultiplier: 1.01, cause: 'RBI hiked repo rate by 250 bps, global bond selloff' },
            ] : [
              // Equity / Hybrid — Verified against Nifty 50 / BSE Sensex data
              // 2008: Nifty peak 6,357 → bottom 2,524 → recovered past peak to ~6,500 by Q1 2014
              { name: '2008 Global Financial Crisis', period: 'Jan 2008 – Mar 2009', drop: -60, recovery: '~60 months', recoveryMultiplier: 1.02, cause: 'Lehman Brothers collapse, global recession, Nifty fell from 6,357 to 2,524' },
              // 2020: Nifty peak 12,430 → bottom 7,511 → recovered to ~12,960 by Nov 2020 (~104%)
              { name: '2020 COVID-19 Crash', period: 'Feb 2020 – Mar 2020', drop: -38, recovery: '~9 months', recoveryMultiplier: 1.04, cause: 'Pandemic lockdowns, global panic selling, Nifty fell from 12,430 to 7,511' },
              // 2022: Nifty peak 18,350 → bottom 15,183 → recovered to ~18,600 by early 2023 (~101%)
              { name: '2022 Rate Hike Correction', period: 'Oct 2021 – Jun 2022', drop: -17, recovery: '~7 months', recoveryMultiplier: 1.01, cause: 'US Fed tightening, Russia-Ukraine war, FII outflows of ₹1.4L Cr' },
            ];

            const testAmount = stressTestAmount;

            return (
              <div className="tab-fade-in">
                <div className="ddm-section-header">Crash Stress Test</div>

                {/* Hero */}
                <div className="stress-hero">
                  <div className="stress-hero-icon"><Flame size={24} /></div>
                  <div>
                    <div className="stress-hero-title">What happens when markets crash?</div>
                    <div className="stress-hero-subtitle">
                      Every investment faces downturns. The key isn't avoiding crashes — it's understanding
                      that <strong style={{ color: '#fbbf24' }}>markets always recover</strong> for patient investors.
                    </div>
                  </div>
                </div>

                {/* Editable Test Amount */}
                <div className="stress-amount-input-container">
                  <label className="stress-amount-label">Enter your investment amount to simulate</label>
                  <div className="stress-amount-input-wrapper">
                    <span className="stress-amount-prefix">₹</span>
                    <input
                      type="number"
                      className="stress-amount-input"
                      value={stressTestAmount}
                      onChange={(e) => {
                        const val = Math.max(1000, Math.min(10000000, Number(e.target.value) || 0));
                        setStressTestAmount(val);
                      }}
                      min={1000}
                      max={10000000}
                      step={1000}
                    />
                  </div>
                  <span className="stress-amount-hint">Min ₹1,000 · Max ₹1 Crore</span>
                </div>

                {/* Crash Scenario Cards */}
                <div className="stress-scenarios">
                  {crashScenarios.map((crash, i) => {
                    const lostAmount = testAmount * (Math.abs(crash.drop) / 100);
                    const bottomValue = testAmount - lostAmount;
                    const recoveryValue = Math.round(testAmount * crash.recoveryMultiplier);
                    const recoveryGain = recoveryValue - testAmount;
                    return (
                      <div key={i} className="stress-card">
                        <div className="stress-card-header">
                          <span className="stress-card-emoji"><AlertCircle size={20} /></span>
                          <div>
                            <div className="stress-card-name">{crash.name}</div>
                            <div className="stress-card-period">{crash.period}</div>
                          </div>
                        </div>

                        <div className="stress-card-body">
                          <div className="stress-card-cause">{crash.cause}</div>

                          {/* Drop visualization */}
                          <div className="stress-drop-visual">
                            <div className="stress-drop-bar">
                              <div
                                className="stress-drop-bar-fill"
                                style={{ width: `${Math.min(Math.abs(crash.drop), 100)}%` }}
                              />
                            </div>
                            <div className="stress-drop-stats">
                              <div className="stress-stat">
                                <span className="stress-stat-label">Max Drop</span>
                                <span className="stress-stat-value stress-stat-value--drop">{crash.drop}%</span>
                              </div>
                              <div className="stress-stat">
                                <span className="stress-stat-label">Recovery</span>
                                <span className="stress-stat-value stress-stat-value--recovery">{crash.recovery}</span>
                              </div>
                            </div>
                          </div>

                          {/* Scenario: What if user's amount was invested */}
                          <div className="stress-scenario-box">
                            <div className="stress-scenario-title">If you had {formatINR(testAmount)} invested:</div>
                            <div className="stress-scenario-flow">
                              <div className="stress-flow-item">
                                <span className="stress-flow-label">Before</span>
                                <span className="stress-flow-value">{formatINR(testAmount)}</span>
                              </div>
                              <span className="stress-flow-arrow">→</span>
                              <div className="stress-flow-item stress-flow-item--drop">
                                <span className="stress-flow-label">Bottom</span>
                                <span className="stress-flow-value">{formatINR(bottomValue)}</span>
                              </div>
                              <span className="stress-flow-arrow">→</span>
                              <div className="stress-flow-item stress-flow-item--recover">
                                <span className="stress-flow-label">After {crash.recovery}</span>
                                <span className="stress-flow-value">{formatINR(recoveryValue)}</span>
                                {recoveryGain !== 0 && (
                                  <span style={{ fontSize: '0.65rem', color: recoveryGain > 0 ? '#10b981' : '#ef4444', fontWeight: 700, marginTop: 2 }}>
                                    {recoveryGain > 0 ? '+' : ''}{formatINR(recoveryGain)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Insight */}
                <div className="stress-insight">
                  <div className="stress-insight-icon"><Info size={24} /></div>
                  <div>
                    <div className="stress-insight-title">The #1 rule during a crash</div>
                    <div className="stress-insight-text">
                      {isEquity
                        ? 'Investors who stayed invested during the 2020 crash saw their portfolio grow 100%+ within 18 months. Those who panic-sold locked in their losses permanently.'
                        : isDebt
                          ? 'Debt fund drawdowns are typically small (3-8%) and recover quickly. The real risk in debt is credit default — always choose high-quality AAA-rated funds.'
                          : isGovt
                            ? 'Government-backed instruments have near-zero default risk. Short-term NAV fluctuations do not affect your maturity value.'
                            : 'Stay invested. Time in the market beats timing the market — every single time.'
                      }
                    </div>
                  </div>
                </div>

                <p style={{ color: 'var(--ddm-text-muted)', fontSize: '0.65rem', marginTop: 16, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5 }}>
                  * Historical drawdowns sourced from NSE (Nifty 50), BSE (Sensex), CRISIL Bond Index, and MCX Gold data.
                  Recovery = time to reclaim previous peak. Past crashes do not predict future events.
                </p>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};

export default DeepDiveModal;
