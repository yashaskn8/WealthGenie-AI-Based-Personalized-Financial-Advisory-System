import React from 'react';
import { motion } from 'framer-motion';
import { Compass, ShieldCheck, Target, Calculator, PieChart, Activity } from 'lucide-react';

const HelpTourScreen = () => {
  return (
    <div style={{ padding: '40px 40px', maxWidth: 900, margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: 16 }}>Platform Guide</h1>
        <p className="page-subtitle" style={{ fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
          Master the WealthGenie Advisor Portal. Here is a breakdown of the deep-analytics engines available in your sidebar.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        <GuideRow 
          icon={<PieChart size={32} color="#0ea5e9" />}
          title="Strategy Dashboard"
          desc="The core control center. Utilizes a multi-layered allocation engine to map your specific age and risk appetite to a mathematically optimal basket of assets, actively computing 15-year projections based on expected returns."
        />

        <GuideRow 
          icon={<Calculator size={32} color="#10b981" />}
          title="Post-Tax Analysis & Tax Optimizer"
          desc="These modules don't just look at nominal returns. They calculate exact Indian IT slabs (Old vs New Regime) and deduct STCG/LTCG mathematically so you can visualize the *real* spending power of your investments."
        />

        <GuideRow 
          icon={<Activity size={32} color="#f59e0b" />}
          title="Rebalancer & SIP Step-Up"
          desc="Markets drift. The Rebalancer allows you to drag sliders to adjust risk vectors manually, calculating immediate shifts to your projections. The SIP Planner models how aggressively increasing your monthly contribution changes your outcome."
        />

        <GuideRow 
          icon={<Target size={32} color="#8b5cf6" />}
          title="Health Score & Goals"
          desc="A psychometric-style evaluation of your financial resilience. Tracks emergency funds, debt-to-income limits, and maps your raw assets against massive lifetime expenses like Retirement or property acquisition."
        />

        <GuideRow 
          icon={<ShieldCheck size={32} color="#ef4444" />}
          title="AI Genie Assistant"
          desc="Accessible via the glowing orb in the bottom right. Our generative AI is fully context-aware of your uploaded profile and can answer immediate analytical queries about your specific strategy."
        />

      </div>

      <div style={{ marginTop: 60, padding: 30, background: '#11151c', border: '1px solid #2d3748', borderRadius: 16, textAlign: 'center' }}>
        <Compass size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
        <h3>Need Human Support?</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>
          While the algorithm calculates optimal paths, execution sometimes requires a human touch.
        </p>
        <button className="btn-portal btn-portal-primary" style={{ padding: '12px 32px' }}>
          Contact Wealth Manager
        </button>
      </div>
    </div>
  );
};

const GuideRow = ({ icon, title, desc }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
    style={{ display: 'flex', gap: 24, padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, alignItems: 'center' }}
  >
    <div style={{ background: '#11151c', padding: 20, borderRadius: '50%', border: '1px solid #2d3748' }}>
      {icon}
    </div>
    <div>
      <h3 style={{ fontSize: '1.2rem', marginBottom: 8, color: '#f8fafc' }}>{title}</h3>
      <p style={{ color: '#94a3b8', margin: 0, lineHeight: 1.6, fontSize: '0.95rem' }}>{desc}</p>
    </div>
  </motion.div>
);

export default HelpTourScreen;
