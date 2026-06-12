import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, HelpCircle, ShieldCheck, ChevronDown, Activity, ArrowRight, Loader2, TrendingUp, Shield, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../utils/indianNumberFormat';
import JargonTooltip from './JargonTooltip';
import api from '../services/api';
import './RebalancerScreen.css';

const RISK_COLORS = {
  'Very Low': '#10b981', 'Low': '#34d399', 'Low-Medium': '#a3e635', 'Medium-Low': '#fbbf24',
  'Medium': '#f59e0b', 'High': '#ef4444', 'Very High': '#dc2626'
};

const LOCAL_TO_BACKEND_MAP = {
  'index_mf': 'Index_MF',
  'nifty_etf': 'ETF',
  'elss': 'ELSS',
  'fd': 'FD',
  'nps': 'NPS',
  'rbi_bonds': 'RBI_Bond',
  'gold_etf': 'Gold',
  'sgb': 'SGB',
  'debt_mf': 'Debt_MF',
  'liquid_mf': 'Liquid_MF',
  'hybrid_mf': 'Hybrid_MF',
  'midcap_mf': 'Midcap_MF',
  'smallcap_mf': 'Smallcap_MF',
  'equity_mf': 'Equity_MF',
  'ppf': 'PPF',
  'scss': 'SCSS',
  'ssy': 'SSY',
  'g-sec': 'G-Sec',
};

/**
 * Build allocation percentages from recommendation list.
 * Normalizes so sum === 100.
 */
const buildAllocations = (recs, savings) => {
  const allocs = {};
  let sum = 0;
  const safeSavings = Number(savings) || 12000;
  const safeRecs = recs || [];

  safeRecs.forEach(inv => {
    if (!inv || !inv.id) return;
    const allocVal = Number(inv.monthly_allocation) || 0;
    const pct = safeSavings > 0 ? (allocVal / safeSavings) * 100 : 0;
    allocs[inv.id] = pct;
    sum += pct;
  });

  // Normalize to 100%
  if (sum > 0 && Math.abs(sum - 100) > 0.01) {
    Object.keys(allocs).forEach(k => {
      allocs[k] = (allocs[k] / sum) * 100;
    });
  } else if (sum === 0 && safeRecs.length > 0) {
    const count = safeRecs.filter(inv => inv && inv.id).length;
    safeRecs.forEach(inv => {
      if (inv && inv.id) {
        allocs[inv.id] = 100 / count;
      }
    });
  }
  return allocs;
};

const RebalancerScreen = ({ profile, recommendations, onSave }) => {
  const totalSavings = Number(profile?.monthly_savings) || 12000;
  const recs = useMemo(() => recommendations || [], [recommendations]);

  const [allocations, setAllocations] = useState(() => buildAllocations(recs, totalSavings));
  const [prevRecs, setPrevRecs] = useState(recommendations);

  // Sync allocations when recommendations change during render
  if (recommendations !== prevRecs) {
    setPrevRecs(recommendations);
    setAllocations(buildAllocations(recommendations || [], totalSavings));
  }

  // ─── Advanced settings & Sandbox holdings state ───
  const [threshold, setThreshold] = useState(2.0);
  const [partialRatio, setPartialRatio] = useState(1.0);
  const [holdingMonths, setHoldingMonths] = useState(24);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rebalanceResult, setRebalanceResult] = useState(null);

  const [customHoldings, setCustomHoldings] = useState(() => {
    const holdings = {};
    recs.forEach(inv => {
      holdings[inv.id] = Number(inv.monthly_allocation) || 0;
    });
    return holdings;
  });

  // Sync custom holdings when recommendations change during render
  const [prevRecsCustom, setPrevRecsCustom] = useState(recommendations);
  if (recommendations !== prevRecsCustom) {
    setPrevRecsCustom(recommendations);
    const newHoldings = {};
    (recommendations || []).forEach(inv => {
      newHoldings[inv.id] = Number(inv.monthly_allocation) || 0;
    });
    setCustomHoldings(newHoldings);
  }

  // ─── Fetch rebalance computations from backend API ───
  useEffect(() => {
    let active = true;
    const fetchRebalance = async () => {
      try {
        setLoading(true);
        const currentAllocation = {};
        const targetAllocation = {};

        recs.forEach(inv => {
          const backendKey = LOCAL_TO_BACKEND_MAP[inv.id] || inv.id;
          const currentVal = customHoldings[inv.id] !== undefined
            ? Number(customHoldings[inv.id]) || 0
            : Number(inv.monthly_allocation) || 0;
          currentAllocation[backendKey] = currentVal;

          const targetPct = allocations[inv.id] || 0;
          targetAllocation[backendKey] = Math.round((targetPct / 100) * totalSavings);
        });

        const res = await api.rebalancePortfolio(
          currentAllocation,
          targetAllocation,
          Number(threshold),
          Number(partialRatio),
          Number(holdingMonths)
        );

        if (active) {
          setRebalanceResult(res);
        }
      } catch (err) {
        console.error("Failed to compute rebalancing:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchRebalance();
    return () => { active = false; };
  }, [allocations, customHoldings, threshold, partialRatio, holdingMonths, recs, totalSavings]);

  /**
   * Slider change handler — redistributes remaining % proportionally
   * among other instruments so total stays at 100%.
   */
  const handleSliderChange = useCallback((id, newPct) => {
    setAllocations(prev => {
      const oldPct = prev[id] || 0;
      const diff = newPct - oldPct;
      const otherIds = Object.keys(prev).filter(k => k !== String(id));
      const otherTotal = otherIds.reduce((s, k) => s + (prev[k] || 0), 0);

      const newAllocs = { ...prev, [id]: newPct };

      if (otherTotal > 0) {
        otherIds.forEach(k => {
          const proportion = prev[k] / otherTotal;
          newAllocs[k] = Math.max(0, prev[k] - diff * proportion);
        });
      } else if (diff < 0 && otherIds.length > 0) {
        const split = Math.abs(diff) / otherIds.length;
        otherIds.forEach(k => {
          newAllocs[k] = split;
        });
      }

      // Re-normalize
      const total = Object.values(newAllocs).reduce((a, b) => a + b, 0);
      if (total > 0 && Math.abs(total - 100) > 0.01) {
        Object.keys(newAllocs).forEach(k => {
          newAllocs[k] = (newAllocs[k] / total) * 100;
        });
      }

      return newAllocs;
    });
  }, []);

  const handleSave = () => {
    const updated = recs.map(inv => {
      const pct = allocations[inv.id] || 0;
      return {
        ...inv,
        monthly_allocation: Math.round((pct / 100) * totalSavings / 100) * 100
      };
    });
    if (onSave) onSave(updated);
  };

  // ─── Derivations ───
  const driftIndex = rebalanceResult ? rebalanceResult.drift_index : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - driftIndex * 4)));
  const statusColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  const activeDirectives = useMemo(() => {
    if (!rebalanceResult || !rebalanceResult.assets) return [];
    return rebalanceResult.assets.filter(a => a.action_type !== 'hold');
  }, [rebalanceResult]);

  return (
    <div className="rebalancer-page">
      <div className="ambient-background">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>

      {/* ─── Header ─── */}
      <motion.div
        className="page-header"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
      >
        <div className="page-header-badge">
          <Scale size={12} />
          <span>Investment Mix</span>
        </div>
        <h1 className="page-title">
          Customize Your <span className="title-gradient">Investment Mix</span>
        </h1>
        <p className="page-subtitle">
          Decide how your monthly savings are split across different investments. Adjust the sliders below to match your comfort level.
        </p>
      </motion.div>

      {/* ─── Why This Matters — Beginner Tip ─── */}
      <motion.div
        className="why-balance-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        style={{ marginBottom: 24 }}
      >
        <div className="why-balance-icon-wrap">
          <HelpCircle size={18} color="#818cf8" />
        </div>
        <div className="why-balance-content">
          <h4 className="why-balance-title">Why does this matter?</h4>
          <p className="why-balance-text">
            Your investment mix decides how fast your money can grow and how much risk you take. Putting more into Equity (stocks) can give higher returns but with ups and downs, while Debt (FDs, bonds) is steadier but grows slower. A good balance suits your comfort level.
          </p>
        </div>
      </motion.div>

      {/* ─── Balance Hero Card ─── */}
      <motion.div
        className="balance-hero-card premium-glass"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ '--status-color': statusColor, marginBottom: 24 }}
      >
        <div className="balance-hero-inner">
          <div className="balance-ring-container">
            <svg className="balance-ring-svg" viewBox="0 0 180 180">
              <circle className="balance-ring-bg" cx="90" cy="90" r="76" />
              <circle
                className="balance-ring-glow"
                cx="90" cy="90" r="76"
                stroke={statusColor}
                style={{
                  strokeDasharray: '478',
                  strokeDashoffset: 478 - (478 * score) / 100
                }}
              />
              <circle
                className="balance-ring-progress"
                cx="90" cy="90" r="76"
                stroke={statusColor}
                style={{
                  '--ring-color': statusColor,
                  strokeDasharray: '478',
                  strokeDashoffset: 478 - (478 * score) / 100
                }}
              />
            </svg>
            <div className="balance-ring-text">
              <span className="balance-ring-score">
                {score}<span className="balance-ring-unit">%</span>
              </span>
              <span className="balance-ring-quality" style={{ color: statusColor }}>
                {score >= 80 ? 'WELL BALANCED' : score >= 50 ? 'NEEDS TWEAKING' : 'NEEDS ATTENTION'}
              </span>
            </div>
          </div>

          <div className="balance-status-info">
            <div className="balance-status-header">
              <span className="balance-status-title">
                {score >= 80 ? 'Your Investments Are Well Balanced' : score >= 50 ? 'Your Investments Have Shifted' : 'Your Investments Need Rebalancing'}
              </span>
            </div>
            <p className="balance-status-description">
              {score >= 80
                ? 'Great news! Your current investments match your chosen mix. No changes are needed right now.'
                : `Your investments have shifted ${driftIndex.toFixed(1)}% away from your chosen mix. Adjusting them will bring everything back in line.`}
            </p>
            <div className={`balance-status-summary ${score >= 80 ? 'balanced' : ''}`}>
              {loading ? (
                <div className="loading-inline">
                  <Loader2 size={14} className="spin-icon" style={{ animation: 'spin-anim 1s linear infinite' }} />
                  <span>Calculating...</span>
                </div>
              ) : (
                <span>Imbalance Level: {rebalanceResult?.drift_severity === 'Low' ? 'Minor' : rebalanceResult?.drift_severity === 'Medium' ? 'Moderate' : rebalanceResult?.drift_severity || 'Minor'} ({driftIndex.toFixed(1)}% off target)</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Advanced Settings Collapsible ─── */}
      <div className="disclosure-section" style={{ marginBottom: 24 }}>
        <button className="disclosure-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
          <span className="disclosure-toggle-label">
            <Scale size={16} />
            <span>Advanced Settings (For Experts)</span>
          </span>
          <ChevronDown size={16} className={`disclosure-chevron ${showAdvanced ? 'open' : ''}`} style={{ transition: 'transform 0.25s ease', transform: showAdvanced ? 'rotate(180deg)' : 'none' }} />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="advanced-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 12 }}>
                <div className="settings-card premium-glass">
                  <h4 className="settings-card-title">Sensitivity & Speed</h4>
                  <p className="settings-card-desc">Control how much your mix can shift before we recommend changes, and how quickly to correct it.</p>
                  
                  <div className="setting-item">
                    <div className="setting-label-row">
                      <span className="setting-label">Minimum Shift Before Alert</span>
                      <span className="setting-value-badge">{threshold}%</span>
                    </div>
                    <input
                      type="range"
                      className="bounds-range"
                      min="0.5" max="10" step="0.5"
                      value={threshold}
                      onChange={e => setThreshold(Number(e.target.value))}
                      style={{
                        '--slider-color': '#6366f1',
                        '--slider-pct': `${((threshold - 0.5) / 9.5) * 100}%`
                      }}
                    />
                    <div className="range-labels">
                      <span>0.5%</span>
                      <span>10.0%</span>
                    </div>
                  </div>

                  <div className="setting-item" style={{ marginTop: 12 }}>
                    <div className="setting-label-row">
                      <span className="setting-label">Correction Speed</span>
                      <span className="setting-value-badge">{partialRatio * 100}%</span>
                    </div>
                    <input
                      type="range"
                      className="bounds-range"
                      min="0.1" max="1.0" step="0.1"
                      value={partialRatio}
                      onChange={e => setPartialRatio(Number(e.target.value))}
                      style={{
                        '--slider-color': '#38bdf8',
                        '--slider-pct': `${((partialRatio - 0.1) / 0.9) * 100}%`
                      }}
                    />
                    <div className="range-labels">
                      <span>10% (Gradual)</span>
                      <span>100% (All at Once)</span>
                    </div>
                  </div>
                </div>

                <div className="settings-card premium-glass">
                  <h4 className="settings-card-title">Holding Period & Costs</h4>
                  <p className="settings-card-desc">How long you've held your investments. This helps estimate any early withdrawal charges.</p>

                  <div className="setting-item">
                    <div className="setting-label-row">
                      <span className="setting-label">How Long You've Held</span>
                      <span className="setting-value-badge">{holdingMonths} Months</span>
                    </div>
                    <input
                      type="range"
                      className="bounds-range"
                      min="1" max="60" step="1"
                      value={holdingMonths}
                      onChange={e => setHoldingMonths(Number(e.target.value))}
                      style={{
                        '--slider-color': '#f59e0b',
                        '--slider-pct': `${((holdingMonths - 1) / 59) * 100}%`
                      }}
                    />
                    <div className="range-labels">
                      <span>1 Month</span>
                      <span>60 Months</span>
                    </div>
                  </div>

                  {rebalanceResult && (
                    <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#94a3b8', marginBottom: 4 }}>
                        <span>Portfolio Deviation:</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{(rebalanceResult.portfolio_tracking_error * 100).toFixed(2)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#94a3b8' }}>
                        <span>Estimated Charges (if you rebalance now):</span>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>{formatINR(rebalanceResult.total_estimated_transaction_cost)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Sliders & Holdings Sandbox Grid ─── */}
      <div className="advanced-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, alignItems: 'start', marginBottom: 24 }}>
        <motion.div
          className="rebal-sliders-container premium-glass"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(10, 16, 30, 0.4)', backdropFilter: 'blur(16px)', margin: 0 }}
        >
          <div className="sliders-summary-header" style={{ marginBottom: 20 }}>
            <div className="sliders-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="sliders-header-label" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                <JargonTooltip term="Asset Allocation">Your Investment Split</JargonTooltip>
              </span>
              <span className="sliders-total-badge" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
                Total: 100%
              </span>
            </div>
            <p className="sliders-hint" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6 }}>
              Drag any slider to change how much of your savings goes into each investment. The rest will adjust automatically to keep the total at 100%.
            </p>
          </div>

          <div className="rebal-sliders" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recs.map(inv => {
              const pct = allocations[inv.id] || 0;
              const amt = Math.round((pct / 100) * totalSavings / 100) * 100;
              const riskLabel = inv.risk_level || inv.riskLabel || 'Medium';
              const color = RISK_COLORS[riskLabel] || '#0ea5e9';
              const isAllocated = pct > 0;

              return (
                <div 
                  key={inv.id} 
                  className={`rebal-slider-row ${isAllocated ? 'allocated' : 'unallocated'}`}
                  style={{ display: 'grid', gridTemplateColumns: '150px 1fr 48px 100px', alignItems: 'center', gap: 14, padding: '12px 16px', background: isAllocated ? 'rgba(255,255,255,0.02)' : 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '12px' }}
                >
                  <div className="slider-info-col" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="slider-instrument-name" style={{ fontWeight: 600, color: isAllocated ? '#f1f5f9' : '#94a3b8', fontSize: '0.9rem' }}>{inv.name}</span>
                    <span className="slider-instrument-risk" style={{ color: isAllocated ? color : '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                      {riskLabel} Risk
                    </span>
                  </div>
                  <div className="slider-range-col">
                    <input
                      type="range"
                      className="rebal-range"
                      min="0" max="100" step="0.5"
                      value={pct}
                      onChange={e => handleSliderChange(inv.id, Number(e.target.value))}
                      style={{
                        '--slider-color': isAllocated ? color : '#475569',
                        '--slider-pct': `${pct}%`
                      }}
                    />
                  </div>
                  <span className="slider-pct-value" style={{ color: isAllocated ? color : '#64748b', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right' }}>
                    {pct.toFixed(0)}%
                  </span>
                  <span className={`slider-amount-value ${isAllocated ? 'allocated-label' : 'unallocated-label'}`} style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: isAllocated ? '#e2e8f0' : '#475569' }}>
                    {isAllocated ? `${formatINR(amt)}/mo` : 'Not Allocated'}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Sandbox Holdings Input Card */}
        <motion.div
          className="rebal-sliders-container premium-glass"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(10, 16, 30, 0.4)', backdropFilter: 'blur(16px)', margin: 0 }}
        >
          <div className="sliders-summary-header" style={{ marginBottom: 20 }}>
            <span className="sliders-header-label" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Your Current Holdings
            </span>
            <p className="sliders-hint" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6 }}>
              Enter how much money you currently have in each investment. We'll tell you exactly what to buy or sell.
            </p>
          </div>

          <div className="custom-balance-list">
            {recs.map(inv => {
              const currentVal = customHoldings[inv.id] !== undefined ? customHoldings[inv.id] : '';
              return (
                <div key={inv.id} className="custom-balance-row" style={{ marginBottom: 10 }}>
                  <span className="custom-balance-name">{inv.name}</span>
                  <div className="custom-balance-input-wrap">
                    <span className="input-prefix">₹</span>
                    <input
                      type="number"
                      className="custom-balance-input"
                      placeholder="0"
                      value={currentVal}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setCustomHoldings(prev => ({ ...prev, [inv.id]: val }));
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sandbox-hint" style={{ marginTop: 16 }}>
            <span>Note: These are pre-filled with your recommended monthly amounts. Update them with your actual holdings for more accurate suggestions.</span>
          </div>
        </motion.div>
      </div>

      {/* ─── Directives Grid / Output List ─── */}
      {activeDirectives.length === 0 ? (
        <div className="balanced-empty-state" style={{ marginBottom: 24 }}>
          <div className="empty-state-icon-wrap">
            <CheckCircle2 size={36} />
          </div>
          <span className="empty-state-title">Everything Looks Good!</span>
          <span className="empty-state-text">Your investments are already well balanced. No changes needed right now.</span>
        </div>
      ) : (
        <div className="rebal-directives-grid" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Activity size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Suggested Changes</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeDirectives.map((asset, idx) => {
              const isBuy = asset.action_type === 'buy';
              
              return (
                <div
                  key={asset.asset_class}
                  className={`directive-card ${isBuy ? 'dir-buy' : 'dir-sell'}`}
                >
                  <div className={`dir-step-number ${isBuy ? 'step-buy' : 'step-sell'}`}>
                    {idx + 1}
                  </div>
                  <div className="dir-info">
                    <div className="dir-action-label" style={{ color: '#fff' }}>
                      {isBuy ? 'Add ' : 'Reduce '}
                      <strong>{formatINR(Math.abs(asset.suggested_correction))}</strong> in{' '}
                      <strong>{asset.name}</strong>
                    </div>
                    <div className="dir-sub-label">
                      <span>Your target: {asset.target_pct}%</span>
                      <span>·</span>
                      <span>Current: {asset.current_pct}%</span>
                      <span>·</span>
                      <span className={`dir-drift-badge ${isBuy ? 'drift-buy' : 'drift-sell'}`}>
                        {isBuy ? `${Math.abs(asset.drift_pct).toFixed(1)}% below target` : `${Math.abs(asset.drift_pct).toFixed(1)}% above target`}
                      </span>
                      {asset.estimated_transaction_cost > 0 && (
                        <>
                          <span>·</span>
                          <span style={{ color: '#fb7185' }}>Charges: {formatINR(asset.estimated_transaction_cost)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`dir-amount ${isBuy ? 'amount-buy' : 'amount-sell'}`}>
                    {isBuy ? '+' : '-'}{formatINR(Math.abs(asset.suggested_correction))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Stats comparison ─── */}
      {rebalanceResult && (
        <div className="stats-comparison-grid" style={{ marginBottom: 24 }}>
          <div className="stats-comparison-card">
            <div className="stats-card-icon stats-card-icon--return">
              <TrendingUp size={20} />
            </div>
            <div className="stats-card-content">
              <span className="stats-card-label">Expected Annual Return</span>
              <div className="stats-card-values">
                <span className="stats-val-before">{rebalanceResult.before_stats.cagr.toFixed(1)}%</span>
                <ArrowRight size={14} className="stats-arrow" />
                <span className="stats-val-after stats-val-after--green">{rebalanceResult.after_stats.cagr.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div className="stats-comparison-card">
            <div className="stats-card-icon stats-card-icon--risk">
              <Shield size={20} />
            </div>
            <div className="stats-card-content">
              <span className="stats-card-label">Overall Risk Level</span>
              <div className="stats-card-values">
                <span className="stats-val-before">{Math.round(rebalanceResult.before_stats.risk_score)}</span>
                <ArrowRight size={14} className="stats-arrow" />
                <span className="stats-val-after stats-val-after--blue">{Math.round(rebalanceResult.after_stats.risk_score)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main CTA ─── */}
      <motion.div
        className="rebal-actions"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <button className="btn-primary-glow" onClick={handleSave}>
          <ShieldCheck size={18} />
          Save My Investment Mix
        </button>
        <p className="cta-helper-text">This will save your chosen investment split and update all your projections</p>
      </motion.div>
    </div>
  );
};

export default RebalancerScreen;
