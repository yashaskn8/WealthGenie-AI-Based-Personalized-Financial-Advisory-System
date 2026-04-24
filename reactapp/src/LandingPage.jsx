import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import './LandingPage.css';

const TiltCard = ({ icon: Icon, title, desc, delay }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay, type: "spring" }}
      className="feature-card-wrapper"
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="feature-card"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
      >
        <div className="feature-icon-wrapper" style={{ transform: "translateZ(40px)" }}>
          <Icon size={32} />
        </div>
        <h3 style={{ transform: "translateZ(30px)" }}>{title}</h3>
        <p style={{ transform: "translateZ(20px)" }}>{desc}</p>
      </motion.div>
    </motion.div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* 3D Background Orbs */}
      <motion.div 
        className="bg-orb orb-1"
        animate={{ y: [0, -40, 0], x: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="bg-orb orb-2"
        animate={{ y: [0, 50, 0], x: [0, -40, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="landing-hero" style={{ perspective: 1000 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotateX: 30 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 1, type: "spring", bounce: 0.4 }}
        >
          <div className="badge-3d"><Sparkles size={16} /> Welcome to the Future</div>
          <h1 className="landing-title">WealthGenie</h1>
          <p className="landing-subtitle">
            Experience spatial personal finance. AI-powered wealth optimization, intelligent tax planning, and personalized portfolio tracking in a fully interactive spatial interface.
          </p>
        </motion.div>
      </div>

      <div className="landing-features">
        <TiltCard 
          icon={Brain} 
          title="Genie AI Chat" 
          desc="Get instant, context-aware financial advice and personalized portfolio adjustments from our advanced conversational AI."
          delay={0.2}
        />
        <TiltCard 
          icon={TrendingUp} 
          title="Smart Allocation" 
          desc="Optimize your returns with dynamic asset allocation algorithms that adapt to your specific risk profile and financial goals."
          delay={0.4}
        />
        <TiltCard 
          icon={ShieldCheck} 
          title="Tax Optimization" 
          desc="Maximize your take-home wealth with automated tax-saving strategies across Old and New regimes under Indian tax laws."
          delay={0.6}
        />
      </div>

      <motion.button 
        className="cta-button-3d" 
        onClick={() => navigate('/login')}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.05, translateZ: 20 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>Summon Genie</span>
        <ArrowRight size={24} />
      </motion.button>
    </div>
  );
};

export default LandingPage;
