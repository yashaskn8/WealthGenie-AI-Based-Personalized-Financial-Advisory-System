import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, BarChart3, Newspaper, Sparkles, Shield, Zap } from 'lucide-react';
import './InsightsScreen.css';

const InsightsScreen = ({ profile, recommendations }) => {
  const isHighRisk = profile?.risk_appetite === 'High';
  const horizon = profile?.investment_horizon || 15;
  const savings = Number(profile?.monthly_savings || 0);
  const income = Number(profile?.monthly_income || 0);
  const recCount = recommendations?.length || 0;
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : '0';

  const cards = [
    {
      icon: TrendingUp,
      iconColor: '#f43f5e',
      accentGradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
      title: 'Macro Equity Valuation',
      tag: 'Market Signal',
      tagColor: '#f43f5e',
      severity: 'medium',
      body: `Broad market indices are pushing historically high P/E ratios. For your ${horizon}-year horizon, our models suggest maintaining SIP discipline during near-term volatility rather than attempting to time macro entry points.`,
      action: isHighRisk
        ? 'Your high-risk profile captures upside but stay prepared for 15–20% drawdown windows.'
        : 'Continue systematic investing — time in market beats timing the market.',
      delay: 0.1
    },
    {
      icon: BarChart3,
      iconColor: '#2dd4bf',
      accentGradient: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
      title: 'Yield Curve Dynamics',
      tag: 'Fixed Income',
      tagColor: '#2dd4bf',
      severity: 'low',
      body: 'With the RBI signaling potential rate shifts, locking in long-duration fixed income yields now provides a strong counter-balance to your equity exposure. Your debt allocation has been weighted towards sovereign and high-grade corporate bonds to optimize post-tax risk-adjusted returns.',
      action: 'Review your debt allocation in the Rebalancer to capture current yield premiums.',
      delay: 0.2
    },
    {
      icon: Newspaper,
      iconColor: '#fbbf24',
      accentGradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
      title: 'Regulatory Alpha',
      tag: 'Tax Strategy',
      tagColor: '#fbbf24',
      severity: 'high',
      body: 'We\'ve detected structural shifts in domestic taxation. Funneling your mandatory fixed-income savings through EPF/PPF rather than taxable FDs structurally improves your compounding rate by approximately 1.8% annualized.',
      action: 'Check the "Tax Optimizer" tab to maximize your Section 80C deductions.',
      delay: 0.3
    },
    {
      icon: AlertTriangle,
      iconColor: '#38bdf8',
      accentGradient: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
      title: 'Portfolio Concentration',
      tag: 'Risk Monitor',
      tagColor: '#38bdf8',
      severity: 'low',
      body: `Your portfolio is diversified across ${recCount} discrete asset configurations. However, keep an eye on overlapping sectoral allocations if you add thematic mutual funds manually.`,
      action: `${recCount} instruments active — monitor sector overlap when adding new positions.`,
      delay: 0.4
    },
    {
      icon: Shield,
      iconColor: '#a78bfa',
      accentGradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
      title: 'Savings Efficiency',
      tag: 'Behavioral',
      tagColor: '#a78bfa',
      severity: savingsRate >= 30 ? 'low' : savingsRate >= 20 ? 'medium' : 'high',
      body: `Your current savings rate is ${savingsRate}% of gross income (₹${savings.toLocaleString('en-IN')}/mo of ₹${income.toLocaleString('en-IN')}/mo). ${Number(savingsRate) >= 30 ? 'This is excellent — you\'re well above the recommended 20% threshold.' : Number(savingsRate) >= 20 ? 'This is a healthy rate, but pushing to 30%+ would significantly accelerate your wealth trajectory.' : 'Consider increasing your savings rate. Even a 5% boost compounds into lakhs over your timeline.'}`,
      action: Number(savingsRate) >= 30
        ? 'Excellent discipline — consider deploying surplus into step-up SIP for exponential growth.'
        : `Increasing savings by ₹${Math.round((income * 0.05) / 1000) * 1000}/mo could add ₹${((Math.round((income * 0.05) / 1000) * 1000 * 12 * horizon * 1.5) / 100000).toFixed(0)}L+ to your corpus.`,
      delay: 0.5
    },
  ];

  const severityConfig = {
    low: { label: 'Low Impact', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.08)', border: 'rgba(74, 222, 128, 0.2)' },
    medium: { label: 'Monitor', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.2)' },
    high: { label: 'Action Needed', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.2)' },
  };

  return (
    <div className="insights-page">
      <div className="insights-ambient">
        <div className="insights-orb insights-orb-1" />
        <div className="insights-orb insights-orb-2" />
      </div>

      {/* Header */}
      <motion.div
        className="insights-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="insights-badge">
          <Sparkles size={12} /> AI-Powered Analysis
        </div>
        <h1 className="insights-title">
          <span className="insights-icon-wrap">
            <Lightbulb size={22} color="#fbbf24" />
          </span>
          Genie AI{' '}
          <span className="insights-title-accent">Insights</span>
        </h1>
        <p className="insights-subtitle">
          Algorithmic market observations mapped to your {horizon}-year trajectory.
        </p>
        <div className="insights-header-divider" />
      </motion.div>

      {/* Cards */}
      <div className="insights-grid">
        {cards.map((card, i) => {
          const IconComp = card.icon;
          const sev = severityConfig[card.severity];
          return (
            <motion.div
              key={i}
              className="insight-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: card.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ '--card-color': card.iconColor, '--card-color-rgb': hexToRgb(card.iconColor) }}
            >
              {/* Top accent */}
              <div className="insight-card-accent" style={{ background: card.accentGradient }} />
              
              {/* Ambient glow */}
              <div className="insight-card-glow" style={{ background: `radial-gradient(circle, ${card.iconColor}0a, transparent 70%)` }} />

              {/* Number badge */}
              <div className="insight-number">{String(i + 1).padStart(2, '0')}</div>

              {/* Header */}
              <div className="insight-card-header">
                <div className="insight-icon-wrap" style={{ 
                  background: `linear-gradient(135deg, ${card.iconColor}15, ${card.iconColor}05)`,
                  border: `1px solid ${card.iconColor}30`,
                  boxShadow: `0 0 20px ${card.iconColor}10`
                }}>
                  <IconComp color={card.iconColor} size={20} />
                </div>
                <div className="insight-title-group">
                  <h3 className="insight-card-title">{card.title}</h3>
                  <div className="insight-tags">
                    <span className="insight-tag" style={{ color: card.tagColor, background: `${card.tagColor}12`, borderColor: `${card.tagColor}25` }}>
                      {card.tag}
                    </span>
                    <span className="insight-severity" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>
                      {sev.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <p className="insight-card-body">{card.body}</p>

              {/* Action */}
              <div className="insight-action" style={{ borderColor: `${card.iconColor}15` }}>
                <Zap size={13} color={card.iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{card.action}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '56, 189, 248';
}

export default InsightsScreen;
