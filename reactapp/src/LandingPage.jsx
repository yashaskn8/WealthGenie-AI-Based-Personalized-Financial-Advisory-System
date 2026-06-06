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

  // Container variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, rotateX: 10 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="landing-page">
      {/* Premium Glass Header Navbar */}
      <header className="landing-navbar">
        <div className="navbar-container">
          <div className="navbar-logo" onClick={() => navigate('/')}>
            <Sparkles size={20} className="logo-glow-icon" />
            <span className="logo-text">Wealth<span className="accent-text">Genie</span></span>
          </div>
          <nav className="navbar-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#about" className="nav-link">Platform</a>
            <a href="#security" className="nav-link">Security</a>
            <a href="#advisory" className="nav-link">AI Advisory</a>
          </nav>
          <button className="navbar-cta-btn" onClick={() => navigate('/login')}>
            Launch App
          </button>
        </div>
      </header>

      {/* Decorative Grid & Floating Particles */}
      <div className="landing-grid-dots" />
      <div className="decorative-glow-line" />

      {/* 3D Background Orbs */}
      <motion.div 
        className="bg-orb orb-1"
        animate={{ 
          y: [0, -50, 20, 0], 
          x: [0, 40, -30, 0],
          scale: [1, 1.15, 0.9, 1]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="bg-orb orb-2"
        animate={{ 
          y: [0, 60, -40, 0], 
          x: [0, -50, 30, 0],
          scale: [1, 0.9, 1.1, 1]
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Hero & Staggered Reveal Content */}
      <motion.div 
        className="landing-content-wrapper"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="landing-hero" style={{ perspective: 1000 }} variants={itemVariants}>
          <div className="badge-3d">
            <Sparkles size={14} /> Welcome to Premium Financial Advising
          </div>
          <h1 className="landing-title">
            Wealth<span className="title-3d">Genie</span>
          </h1>
          <p className="landing-subtitle">
            Experience spatial personal finance. AI-powered wealth optimization, intelligent tax planning, and personalized portfolio tracking in a fully interactive spatial interface.
          </p>
        </motion.div>

        <motion.div className="landing-features" id="features" variants={itemVariants}>
          <TiltCard 
            icon={Brain} 
            title="Genie AI Chat" 
            desc="Get instant, context-aware financial advice and personalized portfolio adjustments from our advanced conversational AI."
            delay={0.1}
          />
          <TiltCard 
            icon={TrendingUp} 
            title="Smart Allocation" 
            desc="Optimize your returns with dynamic asset allocation algorithms that adapt to your specific risk profile and financial goals."
            delay={0.25}
          />
          <TiltCard 
            icon={ShieldCheck} 
            title="Tax Optimization" 
            desc="Maximize your take-home wealth with automated tax-saving strategies across Old and New regimes under Indian tax laws."
            delay={0.4}
          />
        </motion.div>

        <motion.div className="landing-cta-container" variants={itemVariants}>
          <motion.button 
            className="cta-button-3d" 
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.03, translateZ: 15 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Summon Genie</span>
            <ArrowRight size={20} />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
