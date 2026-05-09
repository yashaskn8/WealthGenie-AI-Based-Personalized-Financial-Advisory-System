import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ShieldCheck, Target, Calculator, PieChart, Activity, Sparkles, ChevronRight, Mail, Phone, MessageCircle, X, CheckCircle, ExternalLink, BookOpen, Lightbulb } from 'lucide-react';
/* styles */
import './HelpTourScreen.css';

const HelpTourScreen = () => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const guides = [
    {
      icon: PieChart, color: '#0ea5e9', colorRgb: '14, 165, 233',
      title: 'Strategy Dashboard',
      tag: 'Core Engine',
      desc: 'The core control center. Utilizes a multi-layered allocation engine to map your specific age and risk appetite to a mathematically optimal basket of assets.',
      details: 'Actively computes 15-year projections based on expected returns. Drag the Investment Horizon and Risk Profile sliders to see real-time portfolio rebalancing.',
      step: '01'
    },
    {
      icon: Calculator, color: '#10b981', colorRgb: '16, 185, 129',
      title: 'Post-Tax Analysis & Tax Optimizer',
      tag: 'Tax Intelligence',
      desc: "These modules don't just look at nominal returns. They calculate exact Indian IT slabs (Old vs New Regime) and deduct STCG/LTCG mathematically.",
      details: 'Visualize the real spending power of your investments after tax deductions. Compare Old vs New regime side-by-side to pick the optimal strategy.',
      step: '02'
    },
    {
      icon: Activity, color: '#f59e0b', colorRgb: '245, 158, 11',
      title: 'Rebalancer & SIP Step-Up',
      tag: 'Active Tools',
      desc: 'Markets drift. The Rebalancer lets you drag sliders to adjust risk vectors manually, calculating immediate shifts to your projections.',
      details: 'The SIP Planner models how aggressively increasing your monthly contribution changes your outcome. Try the step-up calculator to see exponential compounding in action.',
      step: '03'
    },
    {
      icon: Target, color: '#8b5cf6', colorRgb: '139, 92, 246',
      title: 'Health Score & Goals',
      tag: 'Financial Health',
      desc: 'A psychometric-style evaluation of your financial resilience. Tracks emergency funds, debt-to-income limits, and maps assets against lifetime expenses.',
      details: 'Maps your raw assets against massive lifetime expenses like Retirement, Education, and Property acquisition with inflation-adjusted projections.',
      step: '04'
    },
    {
      icon: ShieldCheck, color: '#f43f5e', colorRgb: '244, 63, 94',
      title: 'AI Genie Assistant',
      tag: 'Generative AI',
      desc: 'Accessible via the glowing orb in the bottom right. Our generative AI is fully context-aware of your uploaded profile.',
      details: 'Ask analytical questions about your specific strategy — "What if I increase SIP by 5K?", "How does my tax look under new regime?", or "Am I on track for retirement?".',
      step: '05'
    }
  ];

  const handleContactSubmit = () => {
    setContactSent(true);
    setTimeout(() => {
      setContactSent(false);
      setShowContactModal(false);
    }, 2500);
  };

  return (
    <div className="help-page">
      {/* Ambient */}
      <div className="help-ambient">
        <div className="help-orb help-orb-1" />
        <div className="help-orb help-orb-2" />
      </div>

      {/* Header */}
      <motion.div
        className="help-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="help-badge">
          <BookOpen size={12} /> Platform Documentation
        </div>
        <h1 className="help-title">
          <span className="help-icon-wrap">
            <Compass size={22} color="#38bdf8" />
          </span>
          Platform{' '}
          <span className="help-title-accent">Guide</span>
        </h1>
        <p className="help-subtitle">
          Master the WealthGenie Advisor Portal. Here is a breakdown of the deep-analytics engines available in your sidebar.
        </p>
        <div className="help-header-divider" />
      </motion.div>

      {/* Guide Cards */}
      <div className="help-guides">
        {guides.map((g, i) => {
          const IconComp = g.icon;
          const isExpanded = expandedCard === i;
          return (
            <motion.div
              key={i}
              className={`help-guide-card ${isExpanded ? 'help-guide-expanded' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              style={{ '--guide-color': g.color, '--guide-rgb': g.colorRgb }}
              onClick={() => setExpandedCard(isExpanded ? null : i)}
            >
              {/* Left accent bar */}
              <div className="help-guide-accent" style={{ background: `linear-gradient(180deg, ${g.color}, transparent)` }} />

              {/* Step number */}
              <div className="help-guide-step">{g.step}</div>

              <div className="help-guide-icon" style={{
                background: `linear-gradient(135deg, ${g.color}18, ${g.color}08)`,
                border: `1px solid ${g.color}30`,
                boxShadow: `0 0 24px ${g.color}10`
              }}>
                <IconComp size={24} color={g.color} />
              </div>

              <div className="help-guide-content">
                <div className="help-guide-title-row">
                  <h3 className="help-guide-title">{g.title}</h3>
                  <span className="help-guide-tag" style={{
                    color: g.color,
                    background: `${g.color}10`,
                    borderColor: `${g.color}25`
                  }}>{g.tag}</span>
                </div>
                <p className="help-guide-desc">{g.desc}</p>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="help-guide-details"
                    >
                      <div className="help-guide-details-inner">
                        <Lightbulb size={14} color={g.color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{g.details}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <ChevronRight
                size={18}
                className={`help-guide-chevron ${isExpanded ? 'help-guide-chevron-open' : ''}`}
                color="#475569"
              />
            </motion.div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <motion.div
        className="help-cta-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="help-cta-glow" />
        <div className="help-cta-icon">
          <MessageCircle size={24} color="#38bdf8" />
        </div>
        <h3 className="help-cta-title">Need Human Support?</h3>
        <p className="help-cta-desc">
          While the algorithm calculates optimal paths, execution sometimes requires a human touch. Connect with our certified wealth management team.
        </p>
          <button className="help-cta-btn help-cta-btn-primary" onClick={() => setShowContactModal(true)}>
            <Mail size={15} /> Contact Wealth Manager
          </button>
      </motion.div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            className="help-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              className="help-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              {contactSent ? (
                <div className="help-modal-success">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                  >
                    <CheckCircle size={56} color="#10b981" />
                  </motion.div>
                  <h3>Request Submitted!</h3>
                  <p>Our wealth management team will reach out within 24 hours.</p>
                </div>
              ) : (
                <>
                  <button className="help-modal-close" onClick={() => setShowContactModal(false)}>
                    <X size={18} />
                  </button>
                  <div className="help-modal-header">
                    <div className="help-modal-icon">
                      <Mail size={22} color="#38bdf8" />
                    </div>
                    <h3>Contact Wealth Manager</h3>
                    <p>Fill in your details and our certified advisor will get back to you.</p>
                  </div>
                  <div className="help-modal-form">
                    <div className="help-form-group">
                      <label>Full Name</label>
                      <input type="text" placeholder="Your name" className="help-form-input" />
                    </div>
                    <div className="help-form-row">
                      <div className="help-form-group">
                        <label>Email</label>
                        <input type="email" placeholder="you@example.com" className="help-form-input" />
                      </div>
                      <div className="help-form-group">
                        <label>Phone</label>
                        <input type="tel" placeholder="+91 98765 43210" className="help-form-input" />
                      </div>
                    </div>
                    <div className="help-form-group">
                      <label>What do you need help with?</label>
                      <select className="help-form-input">
                        <option>Portfolio Review</option>
                        <option>Tax Optimization</option>
                        <option>Retirement Planning</option>
                        <option>Goal-Based Investment</option>
                        <option>Risk Assessment</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="help-form-group">
                      <label>Message (optional)</label>
                      <textarea className="help-form-input help-form-textarea" placeholder="Describe your query..." rows={3} />
                    </div>
                    <button className="help-form-submit" onClick={handleContactSubmit}>
                      Submit Request <ExternalLink size={14} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HelpTourScreen;
