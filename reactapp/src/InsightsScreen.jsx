import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, BarChart3, Newspaper } from 'lucide-react';

const InsightsScreen = ({ profile, recommendations }) => {
  const isHighRisk = profile?.risk_appetite === 'High';
  const horizon = profile?.investment_horizon || 15;

  return (
    <div style={{ padding: '40px 40px', maxWidth: 1200, margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 className="page-title" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Lightbulb color="#dfbd69" size={32} />
          Genie AI Insights
        </h1>
        <p className="page-subtitle" style={{ fontSize: '1.1rem' }}>
          Algorithmic market observations mapped to your {horizon}-year trajectory.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: '#11151c', border: '1px solid #2d3748', borderRadius: 16, padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(217, 70, 111, 0.1)', padding: 12, borderRadius: 12 }}>
              <TrendingUp color="#d9466f" size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Macro Equity Valuation</h3>
          </div>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.9rem' }}>
            Broad market indices are pushing historically high P/E ratios. For your {horizon}-year horizon, our models suggest maintaining SIP discipline during near-term volatility rather than attempting to time macro entry points. 
            {isHighRisk && " As a high-risk investor, your allocation captures this upside but remains exposed to 15-20% drawdown risks."}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: '#11151c', border: '1px solid #2d3748', borderRadius: 16, padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(56, 178, 172, 0.1)', padding: 12, borderRadius: 12 }}>
              <BarChart3 color="#38b2ac" size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Yield Curve Dynamics</h3>
          </div>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.9rem' }}>
            With the RBI signaling potential rate shifts, locking in long-duration fixed income yields now provides a strong counter-balance to your equity exposure. Your debt allocation has been weighted towards sovereign and high-grade corporate bonds to optimize post-tax risk-adjusted returns.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: '#11151c', border: '1px solid #2d3748', borderRadius: 16, padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(223, 189, 105, 0.1)', padding: 12, borderRadius: 12 }}>
              <Newspaper color="#dfbd69" size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Regulatory Alpha</h3>
          </div>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.9rem' }}>
            We've detected structural shifts in domestic taxation. Ensure you've reviewed the "Tax Optimizer" tab. Funneling your mandatory fixed-income savings through EPF/PPF rather than taxable FDs structurally improves your compounding rate by approximately 1.8% annualized.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#11151c', border: '1px solid #2d3748', borderRadius: 16, padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(160, 174, 192, 0.1)', padding: 12, borderRadius: 12 }}>
              <AlertTriangle color="#a0aec0" size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Portfolio Concentration</h3>
          </div>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.9rem' }}>
            Your current portfolio engine is diversified across {recommendations?.length || 0} discrete asset configurations. However, keep an eye on overlapping sectoral allocations if you add thematic mutual funds manually.
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default InsightsScreen;
