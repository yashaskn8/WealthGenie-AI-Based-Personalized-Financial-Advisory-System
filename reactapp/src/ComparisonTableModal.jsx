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

const Sparkline = ({ color }) => (
  <svg className="sparkline-container" viewBox="0 0 100 20">
    <path d="M0,18 Q20,2 40,15 T80,5 T100,2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

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

          <div className="filter-row" style={{ marginTop: 4 }}>
            <div className="range-group">
              <span className="range-labels">Risk Filter</span>
              <div className="range-track">
                <div style={{ position: 'absolute', top: -4, left: `${riskRange}%`, width: 12, height: 12, background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px #38bdf8', transform: 'translateX(-50%)' }} />
                <div style={{ height: '100%', width: `${riskRange}%`, background: 'linear-gradient(90deg, #38bdf8, #fbbf24)', borderRadius: 2 }} />
              </div>
              <input type="range" min="0" max="100" value={riskRange} onChange={e => setRiskRange(e.target.value)} style={{opacity: 0, position: 'absolute', width: '200px', cursor:'pointer'}} />
            </div>

            <div className="range-group">
              <span className="range-labels">Max Cap: ₹{Number(minInvRange).toLocaleString()}</span>
              <div className="range-track">
                <div style={{ position: 'absolute', top: -4, left: `${(minInvRange/50000)*100}%`, width: 12, height: 12, background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px #38bdf8', transform: 'translateX(-50%)' }} />
                <div style={{ height: '100%', width: `${(minInvRange/50000)*100}%`, background: 'rgba(56, 189, 248, 0.4)', borderRadius: 2 }} />
              </div>
              <input type="range" min="100" max="50000" step="500" value={minInvRange} onChange={e => setMinInvRange(e.target.value)} style={{opacity: 0, position: 'absolute', width: '200px', cursor:'pointer'}} />
              <span className="range-labels" style={{marginLeft: 'auto'}}>Max</span>
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
                const lockIn = inv.lockIn !== undefined ? inv.lockIn : inv.lock_in_years;
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
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{rate}%</span>
                        <Sparkline color={CATEGORY_COLORS[cat] || '#888'} />
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
