import React, { useState, useMemo } from 'react';
import { formatINR } from './recommendationEngine';
import { RISK_COLORS } from './investmentDatabase';
import { X, Lock, Unlock, Droplets, Info, Search, Link } from 'lucide-react';
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
  'ppf': '🛡️',
  'scss': '👴',
  'sukanya': '👧',
  'rbi_bonds': '🏛️',
  'fd': '🏦',
  'debt_mf': '📜',
  'nps': '⚖️',
  'hybrid_mf': '📊',
  'index_mf': '📈',
  'gold_etf': '🥇',
  'elss': '💰',
  'nifty_etf': '🛒',
  'midcap_mf': '🚀',
  'smallcap_mf': '⚡',
  'direct_equity': '📉'
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
  const color = percent <= 30 ? '#2dd4bf' : percent <= 60 ? '#fbbf24' : '#ef4444';
  
  const liqCount = liquidity === 'High' ? 5 : liquidity === 'Medium' ? 3 : 1;
  const dots = [];
  for (let i = 0; i < 5; i++) {
    dots.push(
      <div 
        key={i} 
        style={{
          width: 5, height: 5, borderRadius: '50%',
          background: i < liqCount ? '#fbbf24' : '#334155'
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 28, height: 10, background: '#1e293b', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {dots}
      </div>
    </div>
  );
};

const getLiquidityLevel = (lockIn) => {
  if (lockIn === 0) return 'High';
  if (lockIn <= 5) return 'Medium';
  return 'Low';
};

const ComparisonTableModal = ({ isOpen, onClose, allInvestments, embedded }) => {
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterTax, setFilterTax] = useState(false);
  const [riskRange, setRiskRange] = useState(100);
  const [minInvRange, setMinInvRange] = useState(50000);
  const [selectedIds, setSelectedIds] = useState([]);

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
                className="tax-input"
                style={{
                  width: '100%',
                  padding: 0,
                  height: '6px',
                  appearance: 'none',
                  background: `linear-gradient(to right, #fbbf24 0%, #ef4444 ${riskRange}%, rgba(255,255,255,0.1) ${riskRange}%, rgba(255,255,255,0.1) 100%)`,
                  borderRadius: '3px',
                  outline: 'none'
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
                min="100" max="50000" step="500" 
                value={minInvRange} 
                onChange={e => setMinInvRange(e.target.value)} 
                className="tax-input"
                style={{
                  width: '100%',
                  padding: 0,
                  height: '6px',
                  appearance: 'none',
                  background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${(minInvRange/50000)*100}%, rgba(255,255,255,0.1) ${(minInvRange/50000)*100}%, rgba(255,255,255,0.1) 100%)`,
                  borderRadius: '3px',
                  outline: 'none'
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

                return (
                  <tr key={invId} className={isSelected ? 'selected-row' : ''}>
                    <td>
                      <div className="inv-name-group">
                        <div className="inv-icon-wrapper">
                          {INVESTMENT_ICONS[invId] || '📄'}
                        </div>
                        <div className="inv-name-details">
                          <div className="inv-title">{inv.abbr || inv.name}</div>
                          <div className="inv-category-pill" style={{ color: isSelected ? undefined : CATEGORY_COLORS[cat] }}>{cat}</div>
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
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Slab</span>
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

        <footer className="comparison-footer">
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
        </footer>

      </div>
    </div>
  );
};

export default ComparisonTableModal;
