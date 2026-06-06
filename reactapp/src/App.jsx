import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Clock, Banknote, Wallet, Scale, Target, Telescope, User, Eye, EyeOff } from 'lucide-react';
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
import { generateRecommendations, getEligibleInvestments } from './recommendationEngine';
import AllocationPlanner from './components/AllocationPlanner';
import ErrorBoundary from './components/ErrorBoundary';
import GoalPlanner from './components/GoalPlanner';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import ProfileEditor from './ProfileEditor';
import * as api from './services/api';

const PROFILE_STORAGE_KEY = 'wealthgenie_user_profile';

const ProfilePage = () => {
  // Try to load saved profile from localStorage, scoped to the current user
  const savedProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Ensure the saved profile belongs to the current authenticated user
      const currentUser = api.getUserInfo();
      if (currentUser && parsed._userId && parsed._userId !== currentUser.id) {
        // Different user — discard stale profile
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch { return null; }
  }, []);

  const [isComplete, setIsComplete] = useState(!!savedProfile);
  const [age, setAge] = useState(savedProfile?.age || 32);
  const [monthlyIncome, setMonthlyIncome] = useState(savedProfile?.monthly_income || 65000);
  const [monthlySavings, setMonthlySavings] = useState(savedProfile?.monthly_savings || 12000);
  const [riskAppetite, setRiskAppetite] = useState(savedProfile?.risk_appetite || 'Medium');
  const [showRiskQuiz, setShowRiskQuiz] = useState(false);
  const [investmentGoals, setInvestmentGoals] = useState(savedProfile?.investment_goals || ['Retirement', 'Wealth Growth']);
  const [horizon, setHorizon] = useState(savedProfile?.investment_horizon || 15);
  const [taxRegime, setTaxRegime] = useState(savedProfile?.taxRegime || 'new');
  const [profileId, setProfileId] = useState(savedProfile?.profileId || null);

  const toggleGoal = (goal) => {
    setInvestmentGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const userProfilePayload = useMemo(() => ({
    age: Number(age),
    monthly_income: Number(monthlyIncome),
    monthly_savings: Number(monthlySavings),
    risk_appetite: riskAppetite,
    investment_goals: investmentGoals,
    investment_horizon: horizon,
    taxRegime,
    profileId
  }), [age, monthlyIncome, monthlySavings, riskAppetite, investmentGoals, horizon, taxRegime, profileId]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    // ── Frontend validation (catch errors before API call) ──
    const numAge = Number(age);
    const numIncome = Number(monthlyIncome);
    const numSavings = Number(monthlySavings);

    if (!numAge || isNaN(numAge) || numAge < 18 || numAge > 80) {
      alert('Please enter a valid age between 18 and 80.');
      return;
    }
    if (!numIncome || isNaN(numIncome) || numIncome < 1000 || numIncome > 100000000) {
      alert('Monthly income must be between ₹1,000 and ₹10,00,00,000 (10 Crores).');
      return;
    }
    if (!numSavings || isNaN(numSavings) || numSavings < 500 || numSavings > 100000000) {
      alert('Monthly savings must be between ₹500 and ₹10,00,00,000 (10 Crores).');
      return;
    }
    if (numSavings >= numIncome) {
      alert('Monthly savings must be less than monthly income.');
      return;
    }
    if (investmentGoals.length === 0) {
      alert('Please select at least one investment goal.');
      return;
    }

    try {
      const response = await api.buildProfile(numIncome, numAge, numSavings, taxRegime, horizon);
      console.log("Profile built:", response);
      // Persist profile to localStorage, scoped to the current user
      const currentUser = api.getUserInfo();
      const nextProfileId = response.profileId || null;
      setProfileId(nextProfileId);
      const profileWithUser = { ...userProfilePayload, profileId: nextProfileId, _userId: currentUser?.id || null };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileWithUser));
      setIsComplete(true);
    } catch (err) {
      alert("Error saving profile: " + err.message);
    }
  };

  // Called from DashboardShell when profile is updated inline
  const handleProfileUpdate = useCallback((updatedProfile) => {
    setAge(updatedProfile.age);
    setMonthlyIncome(updatedProfile.monthly_income);
    setMonthlySavings(updatedProfile.monthly_savings);
    setRiskAppetite(updatedProfile.risk_appetite);
    setInvestmentGoals(updatedProfile.investment_goals);
    setHorizon(updatedProfile.investment_horizon);
    setTaxRegime(updatedProfile.taxRegime);
    const nextProfileId = updatedProfile.profileId || profileId || null;
    setProfileId(nextProfileId);
    const currentUser = api.getUserInfo();
    const profileWithUser = { ...updatedProfile, profileId: nextProfileId, _userId: currentUser?.id || null };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileWithUser));
  }, [profileId]);

  if (isComplete) {
    return (
      <DashboardShell
        userProfile={userProfilePayload}
        onProfileUpdate={handleProfileUpdate}
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
                <input 
                  type="number" 
                  placeholder="32" 
                  value={age || ''} 
                  onChange={e => {
                    let val = e.target.value.replace(/^0+/, '');
                    setAge(val === '' ? '' : Number(val));
                  }} 
                  min="18" 
                  max="80" 
                />
              </div>
              <div className="pf-field">
                <label>Monthly Income (₹)</label>
                <div className="pf-input-prefix">
                  <span className="prefix-symbol">₹</span>
                  <input 
                    type="number" 
                    placeholder="65000" 
                    value={monthlyIncome || ''} 
                    onChange={e => {
                      let val = e.target.value.replace(/^0+/, '');
                      if (val === '') {
                        setMonthlyIncome('');
                      } else {
                        let num = Number(val);
                        if (num > 100000000) num = 100000000;
                        setMonthlyIncome(num);
                      }
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Monthly Savings & Risk Appetite */}
            <div className="pf-grid-2">
              <div className="pf-field">
                <label>Monthly Savings Capacity (₹)</label>
                <div className="pf-input-prefix">
                  <span className="prefix-symbol">₹</span>
                  <input 
                    type="number" 
                    placeholder="12000" 
                    value={monthlySavings || ''} 
                    onChange={e => {
                      let val = e.target.value.replace(/^0+/, '');
                      if (val === '') {
                        setMonthlySavings('');
                      } else {
                        let num = Number(val);
                        if (num > 100000000) num = 100000000;
                        setMonthlySavings(num);
                      }
                    }} 
                  />
                </div>
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
                  <span className="horizon-value">{horizon} {horizon === 1 ? 'Year' : 'Years'}</span>
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
        onComplete={(label) => {
          setRiskAppetite(label);
          setShowRiskQuiz(false);
        }} 
      />
    </main>
  );
};

/* ===== DASHBOARD SHELL — Sidebar + Pages + Chatbot ===== */
const DashboardShell = ({ userProfile, onProfileUpdate }) => {
  const [activePage, setActivePage] = useState('dashboard');
  const [deepDiveInvestment, setDeepDiveInvestment] = useState(null);
  const [showComparisonTable, setShowComparisonTable] = useState(false);
  const [backendRecs, setBackendRecs] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stable serialized key — changes ONLY when profile data changes, not on every render
  const profileKey = useMemo(() => JSON.stringify({
    a: userProfile.age, i: userProfile.monthly_income, s: userProfile.monthly_savings,
    r: userProfile.risk_appetite, g: userProfile.investment_goals,
    h: userProfile.investment_horizon, t: userProfile.taxRegime, p: userProfile.profileId,
  }), [userProfile.age, userProfile.monthly_income, userProfile.monthly_savings,
       userProfile.risk_appetite, userProfile.investment_goals,
       userProfile.investment_horizon, userProfile.taxRegime, userProfile.profileId]);

  // Memoize local recommendations — only recomputes when profile key changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const localRecommendations = useMemo(() => generateRecommendations(userProfile), [profileKey, userProfile]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eligibleInvestments = useMemo(() => getEligibleInvestments(userProfile), [profileKey, userProfile]);

  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        setIsLoading(true);
        setBackendRecs(null); // Clear stale data immediately
        let activeProfileId = userProfile.profileId;
        if (!activeProfileId) {
          const profileResponse = await api.buildProfile(
            userProfile.monthly_income, userProfile.age, userProfile.monthly_savings,
            userProfile.taxRegime || 'new', userProfile.investment_horizon || 15
          );
          activeProfileId = profileResponse.profileId;
          if (activeProfileId) {
            onProfileUpdate?.({ ...userProfile, profileId: activeProfileId });
          }
        }
        if (!activeProfileId) {
          throw new Error('Backend profile creation did not return a profileId.');
        }
        const recResponse = await api.getRecommendations(activeProfileId);
        setBackendRecs({
          ...recResponse,
          profileId: activeProfileId
        });
      } catch (err) {
        console.error("Failed to fetch backend recommendations:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBackendData();
  }, [profileKey, userProfile, onProfileUpdate]);

  // Merge backend data with local recommendations for display
  const recommendations = useMemo(() => {
    if (!backendRecs) return localRecommendations;
    
    const BACKEND_TO_LOCAL_MAP = {
      'Equity_MF': 'index_mf',
      'ETF': 'nifty_etf',
      'ELSS': 'elss',
      'FD': 'fd',
      'NPS': 'nps',
      'RBI_Bond': 'rbi_bonds',
      'Gold': 'gold_etf',
      'SGB': 'sgb',
      'Debt_MF': 'debt_mf',
      'Liquid_MF': 'liquid_mf',
      'Hybrid_MF': 'hybrid_mf',
      'Index_MF': 'index_mf',
      'Midcap_MF': 'midcap_mf',
      'Smallcap_MF': 'smallcap_mf'
    };

    const totalSavings = Number(userProfile?.monthly_savings || userProfile?.savings) || 0;

    let merged = localRecommendations.map(lr => {
      const match = backendRecs.instruments.find(bi => {
        const localId = BACKEND_TO_LOCAL_MAP[bi.type] || bi.type.toLowerCase();
        return localId === lr.id || bi.name === lr.name || bi.type === lr.id;
      });
      if (match) {
        const idx = backendRecs.instruments.findIndex(bi => bi.type === match.type);
        const backendWeight = match.allocationWeight !== undefined 
          ? match.allocationWeight 
          : (idx === 0 ? 0.5 : idx === 1 ? 0.3 : 0.2);
        
        const allocation = Math.round((backendWeight * totalSavings) / 100) * 100;
        
        return {
          ...lr,
          monthly_allocation: allocation,
          postTaxReturn: match.postTaxReturn || match.effectiveYield || lr.postTaxReturn,
          nominalReturn: match.nominalReturn || lr.nominalReturn || lr.rate,
          ml_confidence: backendRecs?.confidence_scores?.[match.type] ?? lr.ml_confidence,
          advisory_text: backendRecs.advisory_text,
          _source: 'backend',
        };
      } else {
        return {
          ...lr,
          monthly_allocation: 0,
          _source: 'local_inactive'
        };
      }
    });

    // Adjust residual so the sum of active allocations matches totalSavings exactly
    const activeMerged = merged.filter(r => r.monthly_allocation > 0);
    if (activeMerged.length > 0) {
      const allocatedSum = merged.reduce((s, r) => s + r.monthly_allocation, 0);
      const residual = totalSavings - allocatedSum;
      if (residual !== 0) {
        const maxItem = activeMerged.reduce((max, r) => r.monthly_allocation > max.monthly_allocation ? r : max, activeMerged[0]);
        maxItem.monthly_allocation += residual;
      }
    }
    return merged;
  }, [backendRecs, localRecommendations, userProfile]);


  const handleLearnMore = (investment) => {
    // Normalize recommendation engine fields → DeepDiveModal expected schema
    const normalized = {
      ...investment,
      expected_return_min: investment.expected_return_min ?? (investment.rate ? investment.rate * 0.85 : 0),
      expected_return_max: investment.expected_return_max ?? (investment.rate || 0),
      category: investment.category || investment.cat || 'Other',
      risk_level: investment.risk_level || investment.riskLabel || 'Medium',
      lock_in_years: investment.lock_in_years ?? investment.lockIn ?? 0,
      tax_benefit: investment.tax_benefit ?? (investment.taxType === 'eee' || investment.taxType === 'elss' || investment.taxType === 'nps'),
      tax_section: investment.tax_section || (investment.taxType === 'eee' ? '80C' : investment.taxType === 'elss' ? '80C' : investment.taxType === 'nps' ? '80CCD(1B)' : null),
      tax_free_interest: investment.tax_free_interest ?? (investment.taxType === 'eee'),
      liquidity: investment.liquidity || (investment.lockIn > 3 ? 'Low' : investment.lockIn > 0 ? 'Medium' : 'High'),
      description: investment.description || investment.desc || '',
    };
    setDeepDiveInvestment(normalized);
  };

  const handleRebalanceSave = async (updated) => {
    try {
      let profileId = backendRecs?.profileId || userProfile.profileId;
      if (!profileId) {
        const profileResponse = await api.buildProfile(
          userProfile.monthly_income, userProfile.age, userProfile.monthly_savings,
          userProfile.taxRegime || 'new', userProfile.investment_horizon || 15
        );
        profileId = profileResponse.profileId;
        if (profileId) {
          const recResponse = await api.getRecommendations(profileId);
          onProfileUpdate?.({ ...userProfile, profileId });
          setBackendRecs({
            ...recResponse,
            profileId,
          });
        }
      }

      if (!profileId) {
        throw new Error("Could not build user profile for database update.");
      }

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

      const weights = {};
      updated.forEach(item => {
        const backendKey = LOCAL_TO_BACKEND_MAP[item.id] || item.id;
        weights[backendKey] = item.monthly_allocation;
      });

      const response = await api.updateRecommendationWeights(profileId, weights);
      
      setBackendRecs(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          instruments: response.instruments,
        };
      });

      alert('Rebalanced portfolio saved! Projections and dashboard updated in real-time.');
    } catch (err) {
      alert('Failed to save rebalanced portfolio: ' + err.message);
    }
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
            onRecalculate={() => setActivePage('profile')}
            onLearnMore={handleLearnMore}
            onExploreAll={() => setShowComparisonTable(true)}
            onRebalance={() => setActivePage('rebalancer')}
            onNavigate={setActivePage}
          />
          </ErrorBoundary>
        );
      case 'post-tax':
        return <ErrorBoundary><PostTaxAnalysis profile={userProfile} recommendations={recommendations} /></ErrorBoundary>;
      case 'health':
        return <ErrorBoundary><HealthScoreScreen profile={userProfile} recommendations={recommendations} onNavigate={setActivePage} /></ErrorBoundary>;
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
          <div style={{ padding: '40px 28px', maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#38bdf8', marginBottom: 8, opacity: 0.9 }}>
                INVESTMENT EXPLORER
              </div>
              <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: 6 }}>
                Compare <span style={{
                  background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>Investments</span>
              </h1>
              <p className="page-subtitle" style={{ marginBottom: 0, fontSize: '0.95rem' }}>
                Compare {eligibleInvestments.length} eligible investments side by side
              </p>
            </div>
            <ComparisonTableModal
              isOpen={true}
              onClose={() => setActivePage('dashboard')}
              allInvestments={eligibleInvestments}
              embedded={true}
              profile={userProfile}
            />
          </div>
          </ErrorBoundary>
        );
      case 'allocation':
        return <ErrorBoundary><AllocationPlanner profile={userProfile} /></ErrorBoundary>;
      case 'profile':
        return (
          <ProfileEditor
            userProfile={userProfile}
            onProfileUpdate={onProfileUpdate}
          />
        );
      case 'insights':
        return <InsightsScreen profile={userProfile} recommendations={recommendations} />;
      case 'help':
        return <HelpTourScreen />;
      default:
        return (
          <div style={{ padding: '80px 20px', maxWidth: 600, margin: '0 auto', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: '#8b5cf6', marginBottom: 16, opacity: 0.8 }}>
              IN DEVELOPMENT
            </div>
            <h1 className="page-title" style={{ fontSize: '2.4rem', marginBottom: 12 }}>
              Coming <span style={{
                background: 'linear-gradient(135deg, #8b5cf6, #38bdf8)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>Soon</span>
            </h1>
            <p className="page-subtitle" style={{ fontSize: '1rem' }}>This feature is currently under development and will be available shortly.</p>
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
          profile={userProfile}
        />
      )}

      {/* Genie Chatbot FAB */}
      <GenieChat profile={userProfile} recommendations={recommendations} onNavigate={setActivePage} />
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
      await api.login(emailInput, passwordInput);
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
      // Clear any stale financial profile from a previous user session
      localStorage.removeItem(PROFILE_STORAGE_KEY);
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
            <p className="subtitle">Architecting Your Financial Future with AI Intelligence</p>
          </div>

          <div id="forms-container">
            <div className={`form-view ${activeView === 'login' ? 'active' : 'hidden'}`} id="login-view">
              <form id="login-form" onSubmit={handleLoginSubmit}>
                <div className="input-group">
                  <label htmlFor="login-email">Username</label>
                  <input type="text" id="login-email" placeholder="e.g. admin" required autoComplete="username" />
                </div>
                <div className="input-group">
                  <label htmlFor="login-password">Password</label>
                  <div className="password-wrapper">
                    <input 
                       type={showPassword ? 'text' : 'password'} 
                       id="login-password" 
                       placeholder="••••••••" 
                       required 
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                    </button>
                  </div>
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
              <form id="register-form" onSubmit={handleRegisterSubmit} noValidate autoComplete="off">
                <div className="input-group">
                  <label htmlFor="reg-name">Full Name</label>
                  <input
                    type="text"
                    id="reg-name"
                    placeholder="Enter your full name"
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); setRegErrors((prev) => ({ ...prev, name: '' })); }}
                    className={regErrors.name ? 'input-error' : ''}
                    autoComplete="off"
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
                    autoComplete="off"
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
                    autoComplete="off"
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
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
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
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
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
