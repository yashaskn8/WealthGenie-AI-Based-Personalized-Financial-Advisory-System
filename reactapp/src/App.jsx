import { useState, useRef, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import './App.css';
import logoImg from './assets/logo.png';
import genieVideo from './assets/genie.mp4';
import profileImg from './assets/gen_4k_nobull.png';
import RecommendationDashboard from './RecommendationDashboard';
import Sidebar from './components/Sidebar';
import GenieChat from './components/GenieChat';
import GoalTracker from './components/GoalTracker';
import StepUpPlanner from './components/StepUpPlanner';
import TaxScreen from './components/TaxScreen';
import RebalancerScreen from './components/RebalancerScreen';
import DeepDiveModal from './components/DeepDiveModal';
import ComparisonTableModal from './ComparisonTableModal';
import PostTaxAnalysis from './PostTaxAnalysis';
import HealthScoreScreen from './HealthScoreScreen';
import InsightsScreen from './InsightsScreen';
import HelpTourScreen from './HelpTourScreen';
import RiskQuizModal from './RiskQuizModal';
import { investmentDatabase } from './investmentDatabase';
import { generateRecommendations, getEligibleInvestments } from './recommendationEngine';
import AllocationPlanner from './components/AllocationPlanner';
import ErrorBoundary from './components/ErrorBoundary';
import GoalPlanner from './components/GoalPlanner';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import * as api from './services/api';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isComplete, setIsComplete] = useState(false);
  const [age, setAge] = useState(32);
  const [monthlyIncome, setMonthlyIncome] = useState(65000);
  const [monthlySavings, setMonthlySavings] = useState(12000);
  const [riskAppetite, setRiskAppetite] = useState('Medium');
  const [showRiskQuiz, setShowRiskQuiz] = useState(false);
  const [riskScore, setRiskScore] = useState(null);
  const [investmentGoals, setInvestmentGoals] = useState(['Retirement', 'Wealth Growth']);
  const [horizon, setHorizon] = useState(15);
  const [taxRegime, setTaxRegime] = useState('new');

  const toggleGoal = (goal) => {
    setInvestmentGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await api.buildProfile(monthlyIncome, age, monthlySavings, taxRegime);
      console.log("Profile built:", response);
      setIsComplete(true);
    } catch (err) {
      alert("Error saving profile: " + err.message);
    }
  };

  const userProfilePayload = {
    age,
    monthly_income: monthlyIncome,
    monthly_savings: monthlySavings,
    risk_appetite: riskAppetite,
    investment_goals: investmentGoals,
    investment_horizon: horizon,
    taxRegime
  };

  if (isComplete) {
    return (
      <DashboardShell
        userProfile={userProfilePayload}
        onRecalculate={() => setIsComplete(false)}
      />
    );
  }

  return (
    <main className="profile-page">
      {/* Form content on the left */}
      <div className="profile-content">
        <h1 className="profile-page-title">
          Create Your <span className="gradient-text">Financial Profile</span>
        </h1>

        <div className="profile-form-card">
          <form onSubmit={handleSaveProfile}>
            {/* Row 1: Age & Monthly Income */}
            <div className="pf-grid-2">
              <div className="pf-field">
                <label>Age</label>
                <input type="number" placeholder="32" value={age} onChange={e => setAge(Number(e.target.value))} min="18" max="100" />
              </div>
              <div className="pf-field">
                <label>Monthly Income (₹)</label>
                <div className="pf-input-prefix">
                  <span className="prefix-symbol">₹</span>
                  <input type="text" placeholder="6,500" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Row 2: Monthly Savings & Risk Appetite */}
            <div className="pf-grid-2">
              <div className="pf-field">
                <label>Monthly Savings Capacity</label>
                <input type="text" placeholder="1,200" value={monthlySavings} onChange={e => setMonthlySavings(e.target.value)} />
              </div>
              <div className="pf-field">
                <label>Risk Appetite</label>
                <div className="risk-toggle-group">
                  {['Low', 'Medium', 'High'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`risk-toggle-btn ${riskAppetite === level ? 'active' : ''}`}
                      onClick={() => setRiskAppetite(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Investment Goal checkboxes */}
            <div className="pf-field pf-field-full">
              <label>Investment Goal</label>
              <div className="goal-checkbox-group">
                {['Retirement', 'Wealth Growth', 'Tax Saving', 'Emergency Fund'].map((goal) => (
                  <label key={goal} className="goal-checkbox">
                    <input
                      type="checkbox"
                      checked={investmentGoals.includes(goal)}
                      onChange={() => toggleGoal(goal)}
                    />
                    <span className="goal-checkmark"></span>
                    <span className="goal-label-text">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Row 4: Investment Horizon slider */}
            <div className="pf-field pf-field-full">
              <label>Investment Horizon</label>
              <div className="horizon-slider-container">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="horizon-slider"
                  style={{ '--slider-pct': `${((horizon - 1) / 29) * 100}%` }}
                />
                <div className="horizon-labels">
                  <span>1</span>
                  <span className="horizon-value">{horizon} Years</span>
                  <span>30</span>
                </div>
              </div>
            </div>


            {/* Save Button */}
            <button type="submit" className="btn-save-continue">
              Save and Continue
            </button>
          </form>
        </div>
      </div>
      
      {/* Image container on the right */}
      <div className="profile-side-image">
        <img src={profileImg} alt="Financial Profile" className="profile-img-element" />
        <div className="profile-img-overlay"></div>
      </div>

      <RiskQuizModal 
        isOpen={showRiskQuiz} 
        onClose={() => setShowRiskQuiz(false)} 
        onComplete={(label, score) => {
          setRiskAppetite(label);
          setRiskScore(score);
          setShowRiskQuiz(false);
        }} 
      />
    </main>
  );
};

/* ===== DASHBOARD SHELL — Sidebar + Pages + Chatbot ===== */
const DashboardShell = ({ userProfile, onRecalculate }) => {
  const [activePage, setActivePage] = useState('dashboard');
  const [deepDiveInvestment, setDeepDiveInvestment] = useState(null);
  const [showComparisonTable, setShowComparisonTable] = useState(false);
  const [backendRecs, setBackendRecs] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial local recommendations as baseline
  const localRecommendations = generateRecommendations(userProfile);
  const eligibleInvestments = getEligibleInvestments(userProfile);

  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        setIsLoading(true);
        // Assuming we have a way to get the latest profile ID or we fetch it
        // For simplicity, we'll fetch recommendations (backend will handle finding the profile)
        const profileResponse = await api.buildProfile(userProfile.monthly_income, userProfile.age, userProfile.monthly_savings, userProfile.taxRegime);
        const recResponse = await api.getRecommendations(profileResponse.profileId);
        setBackendRecs(recResponse);
      } catch (err) {
        console.error("Failed to fetch backend recommendations:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBackendData();
  }, [userProfile]);

  // Merge backend data with local recommendations for display
  const recommendations = useMemo(() => {
    if (!backendRecs) return localRecommendations;
    
    // Map backend instruments to local structure or vice versa
    return localRecommendations.map(lr => {
      const match = backendRecs.instruments.find(bi => bi.type === lr.id || bi.name === lr.name);
      if (match) {
        return {
          ...lr,
          // Fix 5: Use backend post-tax return if available
          postTaxReturn: match.postTaxReturn || match.effectiveYield || lr.postTaxReturn,
          nominalReturn: match.nominalReturn || lr.nominalReturn || lr.rate,
          // Fix 4: Use authoritative ML confidence_scores from the backend
          ml_confidence: backendRecs?.confidence_scores?.[match.type] ?? lr.ml_confidence,
          advisory_text: backendRecs.advisory_text,
          _source: 'backend',
        };
      }
      return lr;
    });
  }, [backendRecs, localRecommendations]);

  const handleLearnMore = (investment) => {
    setDeepDiveInvestment(investment);
  };

  const handleRebalanceSave = (updatedRecs) => {
    alert('Rebalanced portfolio saved! Projections will update on next load.');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <ErrorBoundary>
          <RecommendationDashboard
            userProfile={userProfile}
            recommendations={recommendations}
            isLoading={isLoading}
            explanation={backendRecs?.explanation || null}
            onRecalculate={onRecalculate}
            onLearnMore={handleLearnMore}
            onExploreAll={() => setShowComparisonTable(true)}
            onRebalance={() => setActivePage('rebalancer')}
          />
          </ErrorBoundary>
        );
      case 'post-tax':
        return <ErrorBoundary><PostTaxAnalysis profile={userProfile} recommendations={recommendations} /></ErrorBoundary>;
      case 'health':
        return <ErrorBoundary><HealthScoreScreen profile={userProfile} recommendations={recommendations} /></ErrorBoundary>;
      case 'goals':
        return <ErrorBoundary><GoalTracker profile={userProfile} recommendations={recommendations} /></ErrorBoundary>;
      case 'goal-planner':
        return <ErrorBoundary><GoalPlanner profile={userProfile} /></ErrorBoundary>;
      case 'rebalancer':
        return (
          <ErrorBoundary>
          <RebalancerScreen
            profile={userProfile}
            recommendations={recommendations}
            onSave={handleRebalanceSave}
          />
          </ErrorBoundary>
        );
      case 'sip-planner':
        return <ErrorBoundary><StepUpPlanner profile={userProfile} /></ErrorBoundary>;
      case 'tax-optimizer':
        return <ErrorBoundary><TaxScreen profile={userProfile} /></ErrorBoundary>;
      case 'compare':
        return (
          <ErrorBoundary>
          <div style={{ padding: '40px 20px', maxWidth: 1100, margin: '0 auto' }}>
            <h1 className="page-title">🔍 Compare Investments</h1>
            <p className="page-subtitle">Compare {eligibleInvestments.length} eligible investments side by side</p>
            <ComparisonTableModal
              isOpen={true}
              onClose={() => setActivePage('dashboard')}
              allInvestments={eligibleInvestments}
              embedded={true}
            />
          </div>
          </ErrorBoundary>
        );
      case 'allocation':
        return <ErrorBoundary><AllocationPlanner profile={userProfile} /></ErrorBoundary>;
      case 'profile':
        return (
          <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto', color: '#fff' }}>
            <h1 className="page-title">👤 My Profile</h1>
            <p className="page-subtitle">Your current financial parameters</p>
            <div style={{ background: '#0B131E', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  ['Age', userProfile.age],
                  ['Monthly Income', `₹${Number(userProfile.monthly_income).toLocaleString('en-IN')}`],
                  ['Monthly Savings', `₹${Number(userProfile.monthly_savings).toLocaleString('en-IN')}`],
                  ['Risk Appetite', userProfile.risk_appetite],
                  ['Investment Goals', userProfile.investment_goals.join(', ')],
                  ['Investment Horizon', `${userProfile.investment_horizon} years`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 10 }}>
                    <span style={{ color: '#94a3b8' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 24, width: '100%' }}
                onClick={onRecalculate}
              >
                Edit Profile & Recalculate
              </button>
            </div>
          </div>
        );
      case 'insights':
        return <InsightsScreen profile={userProfile} recommendations={recommendations} />;
      case 'help':
        return <HelpTourScreen />;
      default:
        return (
          <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto', color: '#fff', textAlign: 'center' }}>
            <h1 className="page-title">🚧 Coming Soon</h1>
            <p className="page-subtitle">This feature is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="app-main">
        {renderPage()}
      </main>

      {/* Deep Dive Modal */}
      <DeepDiveModal
        isOpen={!!deepDiveInvestment}
        onClose={() => setDeepDiveInvestment(null)}
        investment={deepDiveInvestment}
        allRecommendations={recommendations}
        horizon={userProfile.investment_horizon}
      />

      {/* Comparison Table Modal */}
      {showComparisonTable && activePage !== 'compare' && (
        <ComparisonTableModal
          isOpen={true}
          onClose={() => setShowComparisonTable(false)}
          allInvestments={eligibleInvestments}
        />
      )}

      {/* Genie Chatbot FAB */}
      <GenieChat profile={userProfile} recommendations={recommendations} />
    </div>
  );
};

function AuthPage() {
  const [showUI, setShowUI] = useState(false);
  const [activeView, setActiveView] = useState('login');
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  // ===== Registration State =====
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);

  // ===== Video Event Handling =====
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => setShowUI(true);
    const handleError = () => setShowUI(true);

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // ===== Password Validation Rules (Regex-based) =====
  const passwordRules = [
    { label: 'Minimum 8 characters', test: (pw) => pw.length >= 8 },
    { label: 'At least 1 uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'At least 1 lowercase letter', test: (pw) => /[a-z]/.test(pw) },
    { label: 'At least 1 number', test: (pw) => /[0-9]/.test(pw) },
    { label: 'At least 1 special character', test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];

  // Count how many password rules are satisfied
  const satisfiedCount = passwordRules.filter((rule) => rule.test(regPassword)).length;

  // Determine password strength based on how many rules pass
  const getPasswordStrength = () => {
    if (regPassword.length === 0) return null;
    if (satisfiedCount < 3) return { label: 'Weak', color: '#ff4d4d' };
    if (satisfiedCount < 5) return { label: 'Medium', color: '#ffc107' };
    return { label: 'Strong', color: '#4caf50' };
  };

  const passwordStrength = getPasswordStrength();

  // ===== Clear Registration Form =====
  const clearRegForm = () => {
    setRegName('');
    setRegEmail('');
    setRegMobile('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // ===== View Switching =====
  const switchToLogin = () => {
    clearRegForm();
    setActiveView('login');
  };

  const switchToRegister = () => {
    setActiveView('register');
  };

  // ===== Login Submit =====
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email').value;
    const passwordInput = document.getElementById('login-password').value;

    const btn = e.target.querySelector('.btn-primary');
    const originalText = btn.textContent;
    btn.textContent = 'Authenticating...';
    btn.style.opacity = '0.8';
    btn.style.pointerEvents = 'none';

    try {
      const response = await api.login(emailInput, passwordInput);
      btn.textContent = originalText;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      navigate('/profile');
    } catch (err) {
      btn.textContent = originalText;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      alert(err.message || "Invalid credentials");
    }
  };

  // ===== Registration Submit with Full Validation =====
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!regName.trim()) errors.name = 'Full name is required';
    if (!regEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!regMobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(regMobile)) {
      errors.mobile = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!regPassword) {
      errors.password = 'Password is required';
    } else if (satisfiedCount < 5) {
      errors.password = 'Password must satisfy all strength requirements';
    }
    if (!regConfirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsRegistering(true);
    try {
      await api.register(regName, regEmail, regPassword);
      setIsRegistering(false);
      setShowPopup(true);
    } catch (err) {
      setIsRegistering(false);
      alert(err.message || "Registration failed");
    }
  };

  const handlePopupOk = () => {
    setShowPopup(false);
    clearRegForm();
    navigate('/profile');
  };

  return (
    <>
      <div className="video-container">
        <div className="overlay"></div>
        <video autoPlay muted playsInline ref={videoRef} id="bg-video">
          <source src={genieVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <main className="ui-layer">
        <div className={`glass-card login-card ${showUI ? 'visible' : ''}`} id="login-container">
          <div className="card-header">
            <div className="logo-icon">
              <img src={logoImg} alt="Wealth Genie Logo" />
            </div>
            <h1>Wealth Genie</h1>
            <p className="subtitle">Architecturing Your Financial Future with AI Intelligence</p>
          </div>

          <div id="forms-container">
            <div className={`form-view ${activeView === 'login' ? 'active' : 'hidden'}`} id="login-view">
              <form id="login-form" onSubmit={handleLoginSubmit}>
                <div className="input-group">
                  <label htmlFor="login-email">Username</label>
                  <input type="text" id="login-email" placeholder="Enter username (admin)" required autoComplete="username" />
                </div>
                <div className="input-group">
                  <label htmlFor="login-password">Password</label>
                  <input type="password" id="login-password" placeholder="Enter password (admin123)" required />
                </div>
                <div className="form-actions">
                  <label className="remember-me">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="forgot-password">Forgot Password?</a>
                </div>
                <button type="submit" className="btn-primary">Login</button>
              </form>
              <div className="card-footer">
                <p>New to Wealth Genie? <a href="#" onClick={(e) => { e.preventDefault(); switchToRegister(); }}>Register</a></p>
              </div>
            </div>

            <div className={`form-view ${activeView === 'register' ? 'active' : 'hidden'}`} id="register-view">
              <form id="register-form" onSubmit={handleRegisterSubmit} noValidate>
                <div className="input-group">
                  <label htmlFor="reg-name">Full Name</label>
                  <input
                    type="text"
                    id="reg-name"
                    placeholder="Enter your full name"
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); setRegErrors((prev) => ({ ...prev, name: '' })); }}
                    className={regErrors.name ? 'input-error' : ''}
                  />
                  {regErrors.name && <span className="error-msg">{regErrors.name}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="reg-email">Email Address</label>
                  <input
                    type="email"
                    id="reg-email"
                    placeholder="example@gmail.com"
                    value={regEmail}
                    onChange={(e) => { setRegEmail(e.target.value); setRegErrors((prev) => ({ ...prev, email: '' })); }}
                    className={regErrors.email ? 'input-error' : ''}
                  />
                  {regErrors.email && <span className="error-msg">{regErrors.email}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="reg-mobile">Mobile Number</label>
                  <input
                    type="tel"
                    id="reg-mobile"
                    placeholder="10-digit mobile number"
                    value={regMobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setRegMobile(val);
                      setRegErrors((prev) => ({ ...prev, mobile: '' }));
                    }}
                    className={regErrors.mobile ? 'input-error' : ''}
                  />
                  {regErrors.mobile && <span className="error-msg">{regErrors.mobile}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="reg-password">Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="reg-password"
                      placeholder="Create a strong password"
                      value={regPassword}
                      onChange={(e) => { setRegPassword(e.target.value); setRegErrors((prev) => ({ ...prev, password: '' })); }}
                      className={regErrors.password ? 'input-error' : ''}
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {regErrors.password && <span className="error-msg">{regErrors.password}</span>}
                  {regPassword.length > 0 && (
                    <div className="password-checklist">
                      {passwordRules.map((rule, index) => {
                        const passed = rule.test(regPassword);
                        return (
                          <div key={index} className={`checklist-item ${passed ? 'passed' : ''}`}>
                            <span className="checklist-icon">{passed ? '✔' : '✖'}</span>
                            <span className="checklist-label">{rule.label}</span>
                          </div>
                        );
                      })}
                      {passwordStrength && (
                        <div className="password-strength" style={{ color: passwordStrength.color }}>
                          Password Strength: <strong>{passwordStrength.label}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label htmlFor="reg-confirm-password">Confirm Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="reg-confirm-password"
                      placeholder="Re-enter your password"
                      value={regConfirmPassword}
                      onChange={(e) => { setRegConfirmPassword(e.target.value); setRegErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
                      className={regErrors.confirmPassword ? 'input-error' : ''}
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {regErrors.confirmPassword && <span className="error-msg">{regErrors.confirmPassword}</span>}
                  {regConfirmPassword.length > 0 && !regErrors.confirmPassword && (
                    <span className={`match-indicator ${regPassword === regConfirmPassword ? 'match' : 'no-match'}`}>
                      {regPassword === regConfirmPassword ? '✔ Passwords match' : '✖ Passwords do not match'}
                    </span>
                  )}
                </div>
                <button type="submit" className="btn-primary" disabled={isRegistering}>
                  {isRegistering ? <span className="btn-loading"><span className="spinner"></span> Creating Account...</span> : 'Complete Registration'}
                </button>
              </form>
              <div className="card-footer">
                <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchToLogin(); }}>Login</a></p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-card">
            <div className="popup-icon">
              <img src={logoImg} alt="Wealth Genie Logo" />
            </div>
            <h2>Registration Successful!</h2>
            <p>Your Wealth Genie account has been created successfully.</p>
            <button className="btn-primary popup-btn" onClick={handlePopupOk}>OK</button>
          </div>
        </div>
      )}
    </>
  );
}

// Auth guard: redirects to login if no token
function AuthGuard({ children }) {
  const token = api.getAuthToken();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

import LandingPage from './LandingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
      </Routes>
    </Router>
  );
}

export default App;
