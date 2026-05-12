import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const ML_TIMEOUT_MS = 5000;

export async function getMLPrediction(profileData) {
  try {
    const res = await axios.post(`${ML_SERVICE_URL}/predict/enriched`, {
      age: profileData.age,
      annual_income: profileData.annual_income,
      monthly_savings: profileData.monthly_savings,
      risk_category: profileData.risk_category,
    }, { timeout: ML_TIMEOUT_MS });
    return res.data;
  } catch (err) {
    console.warn('[MLClient] ML service unavailable, using rule-based fallback:', err.message);
    // Use rule-based fallback instead of returning null picks
    return getRuleBasedFallback(profileData);
  }
}

export async function checkMLHealth() {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
    return res.data;
  } catch { return null; }
}

export function getRuleBasedFallback({ age, annual_income, risk_category }) {
  let primary, secondary, tertiary;
  const path = [`risk=${risk_category}`, `age=${age}`];
  if (risk_category === 'Aggressive') {
    primary = 'ELSS'; secondary = 'Equity_MF'; tertiary = 'ETF';
  } else if (risk_category === 'Moderate-Aggressive') {
    primary = 'Equity_MF'; secondary = 'ETF'; tertiary = 'ELSS';
  } else if (risk_category === 'Moderate') {
    primary = 'ETF'; secondary = 'Debt_MF'; tertiary = 'ELSS';
  } else if (risk_category === 'Conservative-Moderate') {
    primary = 'Debt_MF'; secondary = 'FD'; tertiary = 'RBI_Bond';
  } else {
    primary = age > 60 ? 'RBI_Bond' : 'FD';
    secondary = 'Debt_MF'; tertiary = 'RBI_Bond';
  }
  return { primary, secondary, tertiary, confidence_scores: { [primary]: 0.6, [secondary]: 0.25, [tertiary]: 0.15 }, decision_path: path, fallback: true };
}
