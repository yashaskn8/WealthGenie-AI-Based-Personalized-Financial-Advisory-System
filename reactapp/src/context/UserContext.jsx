/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateRecommendations } from '../recommendationEngine';

const UserContext = createContext(null);

const DEFAULT_PROFILE = {
  age: 32,
  monthly_income: 65000,
  monthly_savings: 12000,
  risk_appetite: 'Medium',
  investment_goals: ['Retirement', 'Wealth Growth'],
  investment_horizon: 15,
};

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('wg_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [isProfileComplete, setIsProfileComplete] = useState(() => {
    return localStorage.getItem('wg_profile_complete') === 'true';
  });

  const [recommendations, setRecommendations] = useState(() => {
    const saved = localStorage.getItem('wg_profile');
    const prof = saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    const complete = localStorage.getItem('wg_profile_complete') === 'true';
    return complete ? generateRecommendations(prof) : [];
  });

  const [prevProfileForRecs, setPrevProfileForRecs] = useState(profile);
  const [prevIsCompleteForRecs, setPrevIsCompleteForRecs] = useState(isProfileComplete);

  if (profile !== prevProfileForRecs || isProfileComplete !== prevIsCompleteForRecs) {
    setPrevProfileForRecs(profile);
    setPrevIsCompleteForRecs(isProfileComplete);
    if (isProfileComplete) {
      setRecommendations(generateRecommendations(profile));
    }
  }

  // Persist profile
  useEffect(() => {
    localStorage.setItem('wg_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('wg_profile_complete', String(isProfileComplete));
  }, [isProfileComplete]);

  const updateProfile = (newProfile) => {
    setProfile(newProfile);
  };

  const completeProfile = (profileData) => {
    setProfile(profileData);
    setIsProfileComplete(true);
  };

  const resetProfile = () => {
    setIsProfileComplete(false);
  };

  const updateRecommendations = (newRecs) => {
    setRecommendations(newRecs);
  };

  return (
    <UserContext.Provider value={{
      profile,
      recommendations,
      isProfileComplete,
      updateProfile,
      completeProfile,
      resetProfile,
      updateRecommendations
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
