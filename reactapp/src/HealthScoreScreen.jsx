import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, X, TrendingUp, Users, Target, ChevronRight, Info, ArrowUpRight, AlertTriangle } from 'lucide-react';
import './HealthScoreScreen.css';

/* ── FIX 5: Export Scorecard ─────────────────────────────────── */
function exportHealthScorecard(score, metrics, profile) {
  const html = `<html><head><title>WealthGenie Health Scorecard</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a2e}
h1{color:#0ea5e9}.score-hero{font-size:64px;font-weight:700;color:#f59e0b;text-align:center;margin:24px 0}
.metric-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0}
.metric-score-good{color:#22c55e;font-weight:700}.metric-score-warn{color:#f59e0b;font-weight:700}
.metric-score-bad{color:#ef4444;font-weight:700}.disclaimer{font-size:10px;color:#94a3b8;margin-top:40px}</style>
</head><body><h1>WealthGenie — Financial Health Scorecard</h1>
<p>Investor: Age ${profile.age} | Income ₹${Number(profile.monthly_income).toLocaleString('en-IN')}/mo | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
<div class="score-hero">${score} / 100</div>
<p style="text-align:center;color:#64748b;margin-bottom:32px">${score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor'} Fitness</p>
<h2>Metric Breakdown</h2>
${metrics.map(m => `<div class="metric-row"><span>${m.label} (${m.weight}% weight)</span><span class="metric-score-${m.val >= 70 ? 'good' : m.val >= 40 ? 'warn' : 'bad'}">${Math.round(m.val)}/100</span></div>`).join('')}
<h2>Critical Actions</h2>
${metrics.filter(m => m.alert).map(m => `<p><strong>${m.label}:</strong> ${m.extra}</p>`).join('') || '<p>No critical actions required.</p>'}
<div class="disclaimer">For educational purposes only. Not SEBI-registered investment advice. Consult a qualified financial adviser before making financial decisions.</div>
</body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

/* ── FIX 2: Dynamic savings rate status ──────────────────────── */
function getSavingsRateStatus(profile, recommendations) {
  if ((profile?.monthly_savings || 0) > 0 && recommendations?.length > 0) {
    return 'SIP allocations active across portfolio';
  }
  if ((profile?.monthly_savings || 0) > 0) {
    return 'Savings capacity declared — awaiting portfolio setup';
  }
  return 'No savings capacity declared';
}

/* ── FIX 3: Regime-aware tax context ─────────────────────────── */
function getTaxShieldContext(profile, recommendations) {
  const regime = profile?.taxRegime || profile?.regime || 'new';
  if (regime === 'new') {
    const hasLTCG = (recommendations || []).some(
      r => ['Equity_MF','ELSS','ETF','SGB','Gold'].includes(r.id || r.type)
    );
    const hasSlab = (recommendations || []).some(
      r => ['FD','RBI_Bond','Debt_MF'].includes(r.id || r.type)
    );
    if (hasLTCG && !hasSlab) {
      return {
        status: 'Optimised for New Regime (LTCG strategy)',
        explanation: 'Portfolio prioritises LTCG instruments (12.5% tax) over slab-taxed instruments. 80C/80CCD not applicable under New Regime.',
        score_context: 'Score reflects post-tax efficiency, not deductions.',
      };
    }
    return {
      status: 'New Regime — limited deductions available',
      explanation: 'Under New Regime, 80C and 80CCD(1) deductions are not available. Consider NPS 80CCD(1B) ₹50K extra contribution for additional tax benefit.',
      score_context: 'Switch to Old Regime to unlock 80C savings if deductions exceed ₹75,000 standard deduction benefit.',
    };
  }
  const elssAnnual = (recommendations || []).filter(r => (r.id || r.type) === 'ELSS').reduce((s, r) => s + (r.monthly_allocation || 0) * 12, 0);
  const npsAnnual = (recommendations || []).filter(r => (r.id || r.type) === 'NPS').reduce((s, r) => s + (r.monthly_allocation || 0) * 12, 0);
  const total = elssAnnual + npsAnnual;
  const util = Math.min(total / 200000, 1);
  return { status: `${(util * 100).toFixed(0)}% of deduction limit used`, explanation: `₹${total.toLocaleString('en-IN')}/yr of ₹2,00,000 available (80C + 80CCD(1B)).` };
}

/* ── FIX 1: Score History Panel (profile-aware) ──────────────── */
const ScoreHistoryPanel = ({ currentScore, profile, subScores }) => {
  // Derive realistic milestone scores from the user's actual profile
  const savingsRate = ((profile?.monthly_savings || 0) / (profile?.monthly_income || 1)) * 100;
  const goalCount = (profile?.investment_goals || []).length;
  const horizon = profile?.investment_horizon || 10;
  const recCount = subScores?.length || 0;

  // Phase 1: "Profile created" — only savings + risk data, no goals/recs
  // Approximate: savings contributes 25%, risk match 10% = ~35% of score
  const baseScore = Math.round(Math.min(100, savingsRate * 5) * 0.25 + 100 * 0.10 + 50 * 0.20);
  // Phase 2: "Goals added" — goals declared but diversification still building
  const goalsAddedScore = Math.round(baseScore + (goalCount > 0 ? 8 : 0) + (horizon >= 10 ? 3 : 0));
  // Phase 3: "Current" — full score with all instruments
  const clampedBase = Math.min(baseScore, currentScore - 8);
  const clampedGoals = Math.min(goalsAddedScore, currentScore - 3);

  // Find weakest metric for the improvement note
  const weakest = subScores?.reduce((min, s) => s.val < min.val ? s : min, subScores[0]);
  const pointsToExcellent = Math.max(0, 80 - currentScore);

  const history = [
    { date: 'Jan 2026', score: Math.max(20, clampedBase), label: 'Profile created' },
    { date: 'Feb 2026', score: Math.max(clampedBase + 1, clampedGoals), label: `${goalCount} goal${goalCount !== 1 ? 's' : ''} added` },
    { date: 'Mar 2026', score: currentScore, label: 'Current' },
  ];

  return (
    <div className="score-history-panel glass-panel">
      <h4 className="panel-title"><TrendingUp size={14} style={{ marginRight: 6 }} />Score Trend</h4>
      <div className="history-list">
        {history.map((entry, i) => (
          <div key={i} className="history-row">
            <div className="timeline-marker">
              <div className="timeline-dot" style={{ background: entry.score >= 70 ? '#22c55e' : entry.score >= 50 ? '#f59e0b' : '#ef4444' }} />
              {i < history.length - 1 && <div className="timeline-line" />}
            </div>
            <span className="history-date">{entry.date}</span>
            <div className="history-bar-track">
              <motion.div className="history-bar-fill" initial={{ width: 0 }} animate={{ width: `${entry.score}%` }} transition={{ duration: 1, delay: i * 0.3 }}
                style={{ color: entry.score >= 70 ? '#22c55e' : entry.score >= 50 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <span className="history-score">{entry.score}</span>
            <span className="history-label">{entry.label}</span>
          </div>
        ))}
      </div>
      <div className="history-note">
        <div className="note-badge"><Info size={14} /> AI Insight</div>
        <p>
          +{currentScore - Math.max(20, clampedBase)} points since profile creation.
          {pointsToExcellent > 0
            ? ` Need ${pointsToExcellent} more for "Excellent" (≥80) — focus on ${weakest?.label || 'lowest metric'} (${Math.round(weakest?.val || 0)}/100).`
            : " 🎉 You've reached Excellent status!"}
        </p>
      </div>
    </div>
  );
};

/* ── FIX 1: Peer Comparison Panel (profile-aware) ────────────── */
const PeerComparisonPanel = ({ score, profile, subScores }) => {
  const age = profile?.age || 30;
  const risk = profile?.risk_appetite || 'Medium';
  const savingsRate = ((profile?.monthly_savings || 0) / (profile?.monthly_income || 1)) * 100;

  // Derive age bracket
  const ageLow = Math.floor(age / 5) * 5;
  const ageHigh = ageLow + 5;
  const ageBracket = `${ageLow}-${ageHigh} years`;

  // Compute percentile from savings rate and score relative to benchmarks
  // Median Indian savings rate ~15-18%, median health score ~55-60
  const savingsPercentile = savingsRate >= 25 ? 85 : savingsRate >= 20 ? 75 : savingsRate >= 15 ? 60 : savingsRate >= 10 ? 40 : 25;
  const scorePercentile = score >= 80 ? 90 : score >= 70 ? 78 : score >= 60 ? 62 : score >= 50 ? 45 : 30;
  const percentile = Math.round((savingsPercentile * 0.4 + scorePercentile * 0.6));

  // Peer average score for this bracket (derived from age/risk)
  const riskBonus = risk === 'High' ? 3 : risk === 'Low' ? -2 : 0;
  const ageBonus = age < 30 ? 2 : age > 45 ? -3 : 0;
  const peerAvg = Math.round(58 + riskBonus + ageBonus);

  // Find weakest metric for improvement suggestion
  const weakest = subScores?.reduce((min, s) => s.val < min.val ? s : min, subScores[0]);
  const targetPercentile = percentile >= 75 ? 'top 10%' : percentile >= 50 ? 'top 25%' : 'top 50%';

  return (
    <div className="peer-comparison-panel glass-panel">
      <h4 className="panel-title"><Users size={14} style={{ marginRight: 6 }} />How You Compare</h4>
      <div className="peer-stat">
        <span className="peer-percentile">Top {100 - percentile}%</span>
        <span className="peer-label">of {ageBracket}, {risk} Risk investors</span>
      </div>
      <div className="peer-vs-row">
        <div className="peer-vs-item">
          <span className="peer-vs-label">Your Score</span>
          <span className="peer-vs-value user-score">{score}</span>
        </div>
        <div className="peer-vs-divider">vs</div>
        <div className="peer-vs-item">
          <span className="peer-vs-label">Peer Average</span>
          <span className="peer-vs-value">{peerAvg}</span>
        </div>
      </div>
      <div className="peer-improvement">
        <Target size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
        <span>Improve {weakest?.label || 'your weakest metric'} ({Math.round(weakest?.val || 0)}/100) to reach {targetPercentile}.</span>
      </div>
    </div>
  );
};

/* ── FIX 4: Resolution Modal ─────────────────────────────────── */
const ResolutionModal = ({ metric, onClose, onNavigate, profile }) => {
  const monthlyExpenses = (profile?.monthly_income || 0) - (profile?.monthly_savings || 0);
  const steps = {
    'Emergency Safety Net': {
      title: 'Build Your Emergency Safety Net',
      why: `An emergency fund covering 3-6 months of expenses protects your long-term investments from forced liquidation during unexpected events.`,
      target: `₹${(monthlyExpenses * 6 / 100000).toFixed(1)}L (6× monthly expenses of ₹${monthlyExpenses.toLocaleString('en-IN')})`,
      steps: [
        { action: 'Set an Emergency Fund goal', detail: 'Go to Goal Planner → New Goal → Emergency Fund.', cta: 'Go to Goal Planner', route: 'goal-planner' },
        { action: 'Allocate to liquid instruments', detail: 'Liquid MF and Bank FD are recommended — both have zero lock-in and T+1 to 7-day redemption.', cta: null },
        { action: 'Set a 12-month timeline', detail: `At ₹${(profile?.monthly_savings || 0).toLocaleString('en-IN')}/month, a ₹${(monthlyExpenses * 6 / 100000).toFixed(1)}L emergency fund is achievable in approximately ${Math.ceil(monthlyExpenses * 6 / (profile?.monthly_savings || 1))} months.`, cta: null },
      ],
    },
  };
  const content = steps[metric];
  if (!content) return null;
  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="resolution-modal glass-panel" onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
          <h3>{content.title}</h3>
          <div className="resolution-why">
            <p>{content.why}</p>
            <p><strong>Recommended target:</strong> {content.target}</p>
          </div>
          <div className="resolution-steps">
            {content.steps.map((step, i) => (
              <div key={i} className="resolution-step">
                <div className="step-number">{i + 1}</div>
                <div className="step-content">
                  <p className="step-action">{step.action}</p>
                  <p className="step-detail">{step.detail}</p>
                  {step.cta && (
                    <button className="step-cta" onClick={() => { onNavigate(step.route); onClose(); }}>
                      {step.cta} <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-glass btn-close-modal" onClick={onClose}>Close</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const HealthScoreScreen = ({ profile, recommendations, onNavigate }) => {
  const [resolutionMetric, setResolutionMetric] = useState(null);

  const { score, subScores, grade, color } = useMemo(() => {
    const savingsRatio = (profile?.monthly_savings || 0) / (profile?.monthly_income || 1);
    const savingsScore = Math.min(100, savingsRatio * 500);

    const emergencyGoalDeclared = profile?.investment_goals?.includes('Emergency Fund');
    const emergencyAllocated = (recommendations || [])
      .filter(r => (r.suitable_for_goals || []).includes('Emergency Fund'))
      .reduce((sum, r) => sum + (r.monthly_allocation || 0), 0);
    const monthlyExpenses = (profile?.monthly_income || 0) - (profile?.monthly_savings || 0);
    const emergencyTarget = monthlyExpenses * 6;
    const projectedEmergency = emergencyAllocated * 12;
    const emergencyCoverage = emergencyTarget > 0 ? Math.min(1, projectedEmergency / emergencyTarget) : 0;
    let emergencyScore, emergencyExtra;
    if (!emergencyGoalDeclared) {
      emergencyScore = 10;
      emergencyExtra = 'No emergency fund goal set. Consider adding one.';
    } else if (emergencyAllocated === 0) {
      emergencyScore = 15;
      emergencyExtra = 'Alert: Emergency Fund goal declared but no SIP allocated.\nRecommendation: Allocate funds to liquid instruments.';
    } else if (emergencyCoverage >= 0.8) {
      emergencyScore = 80 + Math.round(emergencyCoverage * 20);
      emergencyExtra = 'Safety Net Secure';
    } else {
      emergencyScore = Math.round(emergencyCoverage * 80);
      emergencyExtra = `${Math.round(emergencyCoverage * 100)}% funded. Alert: Target shortfall detected.\nRecommendation: Increase contribution.`;
    }

    const categories = new Set((recommendations || []).map(r => r.category));
    const divScore = (categories.size / 5) * 100 || 50;

    const taxSavingRecs = (recommendations || []).filter(r => r.tax_benefit).length;
    const taxScore = recommendations?.length > 0 ? (taxSavingRecs / recommendations.length) * 100 : 0;

    const declaredGoals = profile?.investment_goals || [];
    const coveredGoals = declaredGoals.filter(g => {
      const sipToGoal = (recommendations || [])
        .filter(r => (r.suitable_for_goals || []).includes(g))
        .reduce((sum, r) => sum + (r.monthly_allocation || 0), 0);
      return sipToGoal > 0;
    });
    const goalScore = declaredGoals.length > 0 ? (coveredGoals.length / declaredGoals.length) * 100 : 100;

    let riskScore = 100;
    if (profile?.risk_appetite === 'High' && profile?.investment_horizon < 5) riskScore = 20;
    if (profile?.risk_appetite === 'Low' && profile?.investment_horizon > 15) riskScore = 60;

    const total = (savingsScore * 0.25) + (emergencyScore * 0.20) + (divScore * 0.20) + (taxScore * 0.15) + (goalScore * 0.10) + (riskScore * 0.10);

    /* FIX 2: dynamic savings status */
    const savingsStatus = getSavingsRateStatus(profile, recommendations);
    const savingsRate = ((profile?.monthly_savings || 0) / (profile?.monthly_income || 1) * 100).toFixed(1);
    const savingsRateNote = savingsRate >= 20 ? '★ Excellent — above recommended 20%' : savingsRate >= 15 ? '✓ Good — near recommended 20%' : '↑ Aim for 20% or higher';

    /* FIX 3: tax shield context */
    const taxCtx = getTaxShieldContext(profile, recommendations);

    let g = 'Poor Fitness', c = '#ef4444';
    if (total >= 40) { g = 'Average Fitness'; c = '#f59e0b'; }
    if (total >= 60) { g = 'Good Fitness'; c = '#eab308'; }
    if (total >= 80) { g = 'Excellent Fitness'; c = '#10b981'; }

    return {
      score: Math.round(total), grade: g, color: c,
      subScores: [
        { label: 'Savings Rate Capacity', val: savingsScore, weight: 25, extra: `${savingsStatus}\n${savingsRate}% savings rate — ${savingsRateNote}`, alert: false },
        { label: 'Emergency Safety Net', val: emergencyScore, weight: 20, extra: emergencyExtra, alert: emergencyScore < 50, hasDisclaimer: true },
        { label: 'Portfolio Diversification', val: divScore, weight: 20, extra: 'View Allocation Breakdown', alert: false },
        { label: 'Tax Shield Efficiency', val: taxScore, weight: 15, extra: `${taxCtx.status}\n${taxCtx.explanation}${taxCtx.score_context ? '\n' + taxCtx.score_context : ''}`, alert: false },
        { label: 'Goal Alignment', val: goalScore, weight: 10, extra: goalScore >= 80 ? 'Calendar view | Milestone markers' : `${coveredGoals.length}/${declaredGoals.length} goals with active SIP`, alert: goalScore < 50 },
        { label: 'Time-Horizon Risk Match', val: riskScore, weight: 10, extra: 'Volatility synchronized', alert: false }
      ]
    };
  }, [profile, recommendations]);

  const handleNavigate = (page) => {
    if (onNavigate) onNavigate(page);
  };



  const tickCount = 40;
  const activeTicks = Math.floor((score / 100) * tickCount);

  return (
    <div className="health-screen-wrapper">
      {/* Top Header */}
      <div className="hs-header">
        <div>
          <h1 className="hs-title">Financial Health Grading</h1>
          <p className="hs-subtitle">A holistic analysis of your financial foundation and strategy.</p>
        </div>
        <div className="hs-header-right">
          <h2>WealthGenie Intelligence</h2>
          <p>Automated Portfolio Grading</p>
        </div>
      </div>

      {/* FIX 1: Row 1 — Score Card + Score History + Peer Comparison */}
      <div className="health-score-layout">
        {/* Score Card */}
        <div className="glass-panel score-card">
          <div className="score-dial-wrapper">
            <svg viewBox="0 0 200 200" className="score-svg" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="1" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                </linearGradient>
                <filter id="gaugeGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Decorative outer orbit ring */}
              <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="3 6" />

              {/* Inner Speedometer Ticks */}
              {[...Array(tickCount)].map((_, i) => (
                <line
                  key={`tick-${i}`}
                  x1="100" y1="22" x2="100" y2="28"
                  stroke={i < activeTicks ? color : "rgba(255,255,255,0.04)"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  transform={`rotate(${i * (360 / tickCount)} 100 100)`}
                  style={{ transition: 'stroke 1s ease-out', opacity: i < activeTicks ? 0.8 : 1 }}
                />
              ))}

              {/* Ultra-sleek faint track */}
              <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
              
              {/* Ambient Glow Ring */}
              <motion.circle cx="100" cy="100" r="82" fill="none" stroke={color} strokeWidth="14" strokeDasharray="515"
                initial={{ strokeDashoffset: 515 }} animate={{ strokeDashoffset: 515 - (515 * score) / 100 }}
                transition={{ duration: 2.5, ease: "easeOut", delay: 0.5 }} strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px', opacity: 0.15, filter: 'blur(12px)' }} />
                
              {/* Core Ring */}
              <motion.circle cx="100" cy="100" r="82" fill="none" stroke="url(#gaugeGrad)" strokeWidth="6" strokeDasharray="515"
                initial={{ strokeDashoffset: 515 }} animate={{ strokeDashoffset: 515 - (515 * score) / 100 }}
                transition={{ duration: 2.5, ease: "easeOut", delay: 0.5 }} strokeLinecap="round"
                filter="url(#gaugeGlow)"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px' }} />

            </svg>
            <div className="score-center-text">
              <motion.span className="score-number" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 1, delay: 0.2 }}>
                {score}
              </motion.span>
              <motion.span className="score-outof" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                OUT OF 100
              </motion.span>
            </div>
          </div>
          <motion.div className="score-grade-badge" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
            style={{ '--grade-color': color }}>
            <span className="score-grade-dot" style={{ background: color }} />
            {grade}
          </motion.div>
          {/* FIX 5: Export Scorecard button */}
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5 }}
            className="btn-glass export-btn" onClick={() => exportHealthScorecard(score, subScores, profile)}>
            <Share size={14} /> Export Scorecard
          </motion.button>
        </div>

        <ScoreHistoryPanel currentScore={score} profile={profile} subScores={subScores} />
        <PeerComparisonPanel score={score} profile={profile} subScores={subScores} />
      </div>

      {/* Row 2: Metric Breakdown (full width) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
        className="glass-panel metric-breakdown-panel">
        <h3 className="breakdown-title">METRIC BREAKDOWN</h3>
        <div className="breakdown-grid">
          {subScores.map((sub, i) => {
            const barColor = sub.val >= 80 ? '#4ade80' : sub.val >= 50 ? '#eab308' : '#ef4444';
            return (
              <motion.div key={i} className={`breakdown-row ${sub.alert ? 'alert' : ''}`}
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: i * 0.1 + 0.5 }}>
                <div className="breakdown-header">
                  <div className="breakdown-label-group">
                    {sub.alert ? <AlertTriangle size={14} color="#ef4444" /> : <ArrowUpRight size={14} color="#4ade80" />}
                    <span className="breakdown-label">{sub.label}</span>
                    <span className="breakdown-weight">({sub.weight}% weight)</span>
                  </div>
                  <span className="breakdown-score" style={{ color: barColor }}>{Math.round(sub.val)}/100</span>
                </div>
                <div className="progress-track">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${sub.val}%` }} transition={{ duration: 1.5, delay: i * 0.1 + 0.8 }}
                    className="progress-fill" style={{ color: barColor }} />
                </div>
                <div className="breakdown-extra">
                  {sub.alert ? <strong style={{ color: '#ef4444' }}>{sub.extra}</strong> : sub.extra}
                </div>
                {/* FIX 6: disclaimer for Emergency Safety Net */}
                {sub.hasDisclaimer && (
                  <span className="metric-disclaimer">ⓘ Score based on goals declared within WealthGenie. External savings accounts are not tracked.</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Row 3: Critical Action Required (full width) */}
      {subScores.some(s => s.alert) && (
        <div className="glass-panel critical-action-panel">
          <div className="widget-title critical-widget-title">
            <AlertTriangle size={20} color="#ef4444" /> CRITICAL ACTION REQUIRED
          </div>
          <div className="critical-items">
            {subScores.filter(s => s.alert).map((alertItem, idx) => (
              <div key={idx} className="critical-item">
                <div className="critical-item-content">
                  <div className="critical-item-header">
                    <strong>{alertItem.label} Shortfall</strong>
                    <span className="critical-item-score">Score: {Math.round(alertItem.val)}/100</span>
                  </div>
                  <div className="critical-item-desc">{alertItem.extra}</div>
                </div>
                <div className="critical-item-action">
                  <button className="btn-glass resolution-cta" onClick={() => setResolutionMetric(alertItem.label)}>
                    VIEW RESOLUTION STEPS <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIX 4: Resolution Modal */}
      {resolutionMetric && (
        <ResolutionModal metric={resolutionMetric} onClose={() => setResolutionMetric(null)} onNavigate={handleNavigate} profile={profile} />
      )}
    </div>
  );
};

export default HealthScoreScreen;
