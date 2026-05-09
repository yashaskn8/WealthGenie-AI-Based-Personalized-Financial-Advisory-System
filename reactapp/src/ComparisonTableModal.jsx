import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from './recommendationEngine';
import { RISK_COLORS } from './investmentDatabase';
import { X, Lock, Unlock, Droplets, Info, Search, Link, BarChart3, ArrowUpRight, ArrowDownRight, ChevronLeft, TrendingUp, Shield, Zap } from 'lucide-react';
import './ComparisonTableModal.css';

const CATEGORY_COLORS = {
  'Debt': '#2dd4bf',
  'Equity-Debt': '#fbbf24', // Yellowish neon for Hybrid
  'Government': '#38bdf8', // Blue neon
  'Equity': '#f43f5e', // Red neon
  'Commodity': '#facc15', // Gold 
  'Alternative': '#fbbf24'
};

const INVESTMENT_ICONS = {
  'ppf': 'PP',
  'scss': 'SC',
  'sukanya': 'SS',
  'rbi_bonds': 'RB',
  'fd': 'FD',
  'debt_mf': 'DM',
  'nps': 'NP',
  'hybrid_mf': 'HM',
  'index_mf': 'IX',
  'gold_etf': 'AU',
  'elss': 'EL',
  'nifty_etf': 'NF',
  'midcap_mf': 'MC',
  'smallcap_mf': 'SM',
  'direct_equity': 'EQ',
  'pmvvy': 'PM',
  'sgb': 'SG'
};

const RISK_LABEL_TO_LEVEL = {
  'Very Low': 15,
  'Low': 30,
  'Medium-Low': 45,
  'Medium': 60,
  'High': 80,
  'Very High': 95
};

const Sparkline = ({ color, category, riskLevel, rate, invId }) => {
  // Deterministic pseudo-random based on invId so the graph looks the same on every render
  const seedStr = invId || 'default';
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = Math.imul(31, seed) + seedStr.charCodeAt(i) | 0;
  }
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const isDebt = category === 'Debt' || category === 'Government';
  const volMulti = (RISK_LABEL_TO_LEVEL[riskLevel] || 50) / 100;
  
  // Map return rate (e.g., 5% to 16%) to final Y position (18 to 2)
  const clampedRate = Math.max(5, Math.min(16, rate || 8));
  const finalY = 18 - ((clampedRate - 5) / 11) * 16;
  
  const pointsCount = isDebt ? 6 : 14; // Equity has more jagged, frequent points
  const dx = 100 / (pointsCount - 1);
  
  let points = [{ x: 0, y: 18 }];
  
  for (let i = 1; i < pointsCount - 1; i++) {
    const x = i * dx;
    // Linear interpolation for the upward trend
    const progress = i / (pointsCount - 1);
    const trendY = 18 - (18 - finalY) * progress;
    
    // Add volatility noise
    let noise = (random() - 0.5) * 20 * volMulti;
    if (isDebt) noise *= 0.15; // Make debt extremely smooth with minimal noise
    
    points.push({ x, y: Math.max(2, Math.min(18, trendY + noise)) });
  }
  
  points.push({ x: 100, y: finalY });
  
  // Construct SVG path
  let path = `M 0 18`;
  if (isDebt) {
    // Smooth Bezier curves for stable investments
    for (let i = 1; i < points.length; i++) {
      const prev = points[i-1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  } else {
    // Jagged, sharp lines for volatile equity investments
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  return (
    <svg className="sparkline-container" viewBox="0 0 100 20" style={{ width: '80px', height: '24px', flexShrink: 0, overflow: 'visible', filter: `drop-shadow(0 2px 4px ${color}40)` }}>
      {/* Subtle background glow for volatile assets */}
      {!isDebt && <path d={`${path} L 100 20 L 0 20 Z`} fill={`${color}15`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={isDebt ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" />
      {/* End point dot */}
      <circle cx="100" cy={finalY} r="2.5" fill={color} />
    </svg>
  );
};

const RiskLiquidityVisual = ({ risk, liquidity }) => {
  const percent = RISK_LABEL_TO_LEVEL[risk] || 50;
  const color = percent <= 30 ? '#34d399' : percent <= 60 ? '#fbbf24' : '#ef4444';
  const liqCount = liquidity === 'High' ? 5 : liquidity === 'Medium' ? 3 : 1;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Risk bar — segmented */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {[20, 40, 60, 80, 100].map((threshold, i) => (
          <div key={i} style={{
            width: 6, height: percent >= threshold ? 14 : 8,
            borderRadius: 2,
            background: percent >= threshold ? color : 'rgba(255,255,255,0.06)',
            boxShadow: percent >= threshold ? `0 0 4px ${color}50` : 'none',
            transition: 'all 0.3s ease',
            opacity: percent >= threshold ? 1 : 0.4
          }} />
        ))}
      </div>
      {/* Liquidity dots — refined */}
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: i < liqCount ? '#38bdf8' : 'rgba(255,255,255,0.06)',
            boxShadow: i < liqCount ? '0 0 4px rgba(56,189,248,0.4)' : 'none',
            transition: 'all 0.3s ease'
          }} />
        ))}
      </div>
    </div>
  );
};

const getLiquidityLevel = (lockIn) => {
  if (lockIn === 0) return 'High';
  if (lockIn <= 5) return 'Medium';
  return 'Low';
};

/* ── Deep Comparison Detail Panel ─────────────────────────── */
const ComparisonDetailPanel = ({ selectedInvestments, onBack }) => {
  if (!selectedInvestments.length) return null;
  const metrics = [
    { key: 'rate', label: 'Return Rate', fmt: v => `${v}%`, icon: <TrendingUp size={14}/>, higher: true },
    { key: 'riskLabel', label: 'Risk Level', fmt: v => v, icon: <Shield size={14}/> },
    { key: 'lockIn', label: 'Lock-in (yrs)', fmt: v => v === 0 ? 'None' : `${v} yrs`, icon: <Lock size={14}/>, higher: false },
    { key: 'taxType', label: 'Tax Treatment', fmt: v => v?.toUpperCase() || 'Slab', icon: <Zap size={14}/> },
    { key: 'minMonthlyInvestment', label: 'Min Investment', fmt: v => formatINR(v || 0), icon: <BarChart3 size={14}/>, higher: false },
  ];
  const bestRate = Math.max(...selectedInvestments.map(i => i.rate || 0));
  const bestLock = Math.min(...selectedInvestments.map(i => i.lockIn ?? i.lock_in_years ?? 99));

  return (
    <motion.div className="comparison-detail-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <div className="detail-header">
        <button className="detail-back-btn" onClick={onBack}><ChevronLeft size={18}/> Back to Table</button>
        <h3>Deep Comparison — {selectedInvestments.length} Instruments</h3>
      </div>
      <div className="detail-grid" style={{ gridTemplateColumns: `200px repeat(${selectedInvestments.length}, 1fr)` }}>
        {/* Header row */}
        <div className="detail-cell detail-label-cell" />
        {selectedInvestments.map(inv => (
          <div key={inv.id} className="detail-cell detail-header-cell">
            <div className="detail-inv-icon" style={{ background: `${(CATEGORY_COLORS[inv.cat] || '#888')}20`, borderColor: `${(CATEGORY_COLORS[inv.cat] || '#888')}40` }}>
              <span style={{ color: CATEGORY_COLORS[inv.cat], fontWeight: 800, fontSize: '0.7rem' }}>{INVESTMENT_ICONS[inv.id] || 'IN'}</span>
            </div>
            <span className="detail-inv-name">{inv.abbr || inv.name}</span>
            <span className="detail-inv-cat" style={{ color: CATEGORY_COLORS[inv.cat] }}>{inv.cat}</span>
          </div>
        ))}
        {/* Metric rows */}
        {metrics.map(m => (
          <React.Fragment key={m.key}>
            <div className="detail-cell detail-label-cell">
              <span className="detail-metric-icon">{m.icon}</span>
              {m.label}
            </div>
            {selectedInvestments.map(inv => {
              const val = inv[m.key];
              const isBest = m.key === 'rate' ? (inv.rate === bestRate) : m.key === 'lockIn' ? ((inv.lockIn ?? inv.lock_in_years ?? 99) === bestLock) : false;
              return (
                <div key={inv.id} className={`detail-cell detail-value-cell ${isBest ? 'best-value' : ''}`}>
                  {m.fmt(val)}
                  {isBest && m.higher !== undefined && <span className="best-badge">Best</span>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
        {/* Verdict row */}
        <div className="detail-cell detail-label-cell" style={{ fontWeight: 700, color: '#38bdf8' }}>Verdict</div>
        {selectedInvestments.map(inv => {
          const score = (inv.rate || 0) * 2 + (inv.lockIn === 0 ? 15 : 0) + (['eee','elss','nps'].includes(inv.taxType) ? 10 : 0);
          const maxScore = Math.max(...selectedInvestments.map(i => (i.rate||0)*2 + (i.lockIn===0?15:0) + (['eee','elss','nps'].includes(i.taxType)?10:0)));
          return (
            <div key={inv.id} className={`detail-cell detail-value-cell ${score === maxScore ? 'verdict-winner' : ''}`}>
              {score === maxScore ? (
                <span className="winner-badge"><ArrowUpRight size={12}/> Top Pick</span>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Good Option</span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const ComparisonTableModal = ({ isOpen, onClose, allInvestments, embedded }) => {
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterTax, setFilterTax] = useState(false);
  const [riskRange, setRiskRange] = useState(100);
  const [minInvRange, setMinInvRange] = useState(50000);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  const filtered = useMemo(() => {
    return allInvestments.filter(inv => {
      const cat = inv.cat || inv.category || '';
      if (filterCategory !== "All" && cat !== filterCategory) return false;
      const hasTax = inv.taxType === "eee" || inv.taxType === "elss" || inv.taxType === "nps" || inv.tax_benefit;
      if (filterTax && !hasTax) return false;
      const minInv = inv.minMonthlyInvestment || inv.min_investment_inr || 0;
      if (minInv > minInvRange) return false;
      return true;
    });
  }, [allInvestments, filterCategory, filterTax, minInvRange]);

  if (!isOpen) return null;

  const categories = ["All", "Government", "Debt", "Equity", "Equity-Debt", "Commodity"];

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className={embedded ? "comparison-embedded" : "comparison-modal-overlay"} onClick={embedded ? undefined : onClose}>
      <div className={embedded ? "comparison-embedded-container" : "comparison-modal-container"} onClick={e => e.stopPropagation()}>
        
        {!embedded && (
          <header className="modal-header">
            <div className="modal-title-group">
              <div className="modal-icon-box">
                <div style={{ width: 18, height: 14, background: '#38bdf8', borderRadius: '4px 4px 8px 8px', boxShadow: '0 0 12px #38bdf8' }}></div>
              </div>
              <div>
                <h2>Compare Investments</h2>
                <p>Compare {filtered.length} eligible investments side by side</p>
              </div>
            </div>
            <button className="modal-close-btn" onClick={onClose}><X size={32} color="#64748b" /></button>
          </header>
        )}

        <section className="filter-bar-container">
          <div className="filter-row filter-row-top">
            <div className="category-group">
              <span style={{ color: '#fff', fontSize: '0.85rem' }}>Category:</span>
              {categories.map(c => (
                <button 
                  key={c} 
                  className={`pill-btn ${filterCategory === c ? 'active' : ''}`}
                  onClick={() => setFilterCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            
            <div className="toggle-group">
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Only Show Tax Beneficial</span>
              <label className="switch">
                <input type="checkbox" checked={filterTax} onChange={e => setFilterTax(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="filter-row" style={{ marginTop: 24, gap: 40 }}>
            <div className="range-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Max Risk Tolerance</span>
                <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem' }}>{riskRange}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={riskRange} 
                onChange={e => setRiskRange(e.target.value)} 
                className="filter-range-slider"
                style={{
                  '--filter-pct': `${riskRange}%`,
                  '--filter-gradient': `linear-gradient(to right, #fbbf24 0%, #ef4444 ${riskRange}%, rgba(255,255,255,0.1) ${riskRange}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
            </div>

            <div className="range-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Max Minimum Investment</span>
                <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem' }}>₹{Number(minInvRange).toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="500" max="50000" step="500" 
                value={minInvRange} 
                onChange={e => setMinInvRange(e.target.value)} 
                className="filter-range-slider"
                style={{
                  '--filter-pct': `${(minInvRange/50000)*100}%`,
                  '--filter-gradient': `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${(minInvRange/50000)*100}%, rgba(255,255,255,0.1) ${(minInvRange/50000)*100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
            </div>
          </div>
        </section>

        <div className="table-scroll">
          <table className="comparison-grid-table">
            <thead>
              <tr>
                <th>INVESTMENT NAME</th>
                <th>RETURN RATE</th>
                <th>RISK & LIQUIDITY</th>
                <th>LOCK-IN <span style={{fontSize: '0.6rem'}}>(YRS)</span></th>
                <th>TAX TREATMENT</th>
                <th>MIN. INV.</th>
                <th>SELECT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const cat = inv.cat || inv.category || '';
                const lockIn = inv.lock_in_years !== undefined ? inv.lock_in_years : (inv.lockIn !== undefined ? inv.lockIn : 0);
                const riskLbl = inv.riskLabel || inv.risk_level || 'Medium';
                const liquidity = getLiquidityLevel(lockIn);
                const hasTax = inv.taxType === "eee" || inv.taxType === "elss" || inv.taxType === "nps" || inv.tax_benefit;
                const taxLabel = inv.taxType ? inv.taxType.toUpperCase() : (inv.tax_section || 'None');
                const minInv = inv.minMonthlyInvestment || inv.min_investment_inr || 0;
                const rate = inv.rate || inv.expected_return_max || 0;
                const invId = inv.id;
                const isSelected = selectedIds.includes(invId);

                let defaultTaxText = 'Slab';
                if (cat === 'Equity') {
                  defaultTaxText = 'STCG / LTCG';
                } else if (cat === 'Equity-Debt') {
                  defaultTaxText = 'Equity Tax / Slab';
                } else if (cat === 'Commodity') {
                  defaultTaxText = 'LTCG / Slab';
                }

                return (
                  <tr key={invId} className={isSelected ? 'selected-row' : ''}>
                    <td>
                      <div className="inv-name-group">
                        <div className="inv-icon-wrapper" style={{
                          background: `linear-gradient(135deg, ${(CATEGORY_COLORS[cat] || '#888')}18, ${(CATEGORY_COLORS[cat] || '#888')}08)`,
                          borderColor: `${(CATEGORY_COLORS[cat] || '#888')}30`
                        }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px',
                            color: CATEGORY_COLORS[cat] || '#94a3b8',
                            fontFamily: 'Inter, monospace'
                          }}>{INVESTMENT_ICONS[invId] || inv.abbr?.substring(0,2) || 'IN'}</span>
                        </div>
                        <div className="inv-name-details">
                          <div className="inv-title">{inv.abbr || inv.name}</div>
                          <div className="inv-category-pill" style={{
                            color: isSelected ? undefined : CATEGORY_COLORS[cat],
                            borderColor: isSelected ? undefined : `${(CATEGORY_COLORS[cat] || '#888')}30`,
                            background: isSelected ? undefined : `${(CATEGORY_COLORS[cat] || '#888')}0a`
                          }}>{cat}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, minWidth: '45px' }}>{rate}%</span>
                        <Sparkline 
                          color={CATEGORY_COLORS[cat] || '#888'} 
                          category={cat}
                          riskLevel={riskLbl}
                          rate={rate}
                          invId={invId}
                        />
                      </div>
                    </td>
                    <td>
                      <RiskLiquidityVisual risk={riskLbl} liquidity={liquidity} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                         <span style={{ fontWeight: 600 }}>{lockIn || 'None'}</span>
                         {lockIn ? <Lock size={12} color="#f43f5e" /> : <Unlock size={12} color="#64748b" />}
                      </div>
                    </td>
                    <td>
                      {hasTax ? (
                        <span className="tax-benefit-tag" style={taxLabel==='NPS'?{color:'#38bdf8', borderColor:'rgba(56,189,248,0.3)', background:'rgba(56,189,248,0.1)'}:{}}>{taxLabel}</span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{defaultTaxText}</span>
                      )}
                    </td>
                    <td>
                      <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                        {formatINR(minInv)}
                        <Link size={12} color="#fbbf24" style={{opacity: 0.8}} />
                      </div>
                    </td>
                    <td>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelect(invId)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Deep Comparison Panel */}
        <AnimatePresence>
          {showComparison && (
            <ComparisonDetailPanel
              selectedInvestments={allInvestments.filter(i => selectedIds.includes(i.id))}
              onBack={() => setShowComparison(false)}
            />
          )}
        </AnimatePresence>

        <footer className="comparison-footer">
          {selectedIds.length > 0 ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="selected-count-badge">
                  <BarChart3 size={14}/> {selectedIds.length} Selected
                </div>
                <button className="clear-selection-btn" onClick={() => { setSelectedIds([]); setShowComparison(false); }}>
                  Clear All
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="compare-action-btn secondary"
                  onClick={() => setShowComparison(!showComparison)}
                  disabled={selectedIds.length < 2}
                >
                  <BarChart3 size={14}/>
                  {showComparison ? 'Hide Comparison' : 'Deep Compare'}
                </button>
                <button
                  className="compare-action-btn primary"
                  onClick={() => {
                    setSelectedIds([]);
                    setShowComparison(false);
                  }}
                >
                  <ArrowUpRight size={14}/>
                  Add to Portfolio
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="legend">
                <span className="legend-item"><span style={{color: '#2dd4bf'}}>●</span> Low</span>
                <span className="legend-item"><span style={{color: '#fbbf24'}}>●</span> Moderate</span>
                <span className="legend-item"><span style={{color: '#f43f5e'}}>●</span> High</span>
              </div>
              <div className="pagination">
                <span>1-{filtered.length} of {allInvestments.length} investments</span>
                <button className="page-btn"><X size={12}/></button>
                <button className="page-btn" style={{background: '#1e293b', borderColor: '#334155'}}>1</button>
              </div>
            </>
          )}
        </footer>

      </div>
    </div>
  );
};

export default ComparisonTableModal;
