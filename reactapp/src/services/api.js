/**
 * WealthGenie API Client
 * Axios instance configured for the Express backend.
 * Token is stored in memory (not localStorage) for security.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

// Restore token from localStorage on module load (survives page reload)
let authToken = localStorage.getItem('wg_token') || null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('wg_token', token);
  } else {
    localStorage.removeItem('wg_token');
  }
}

export function getAuthToken() {
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('wg_token');
}

async function request(method, path, data = null, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const config = { method, headers, ...options };
  if (data) config.body = JSON.stringify(data);

  const res = await fetch(url, config);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json;
}

// ─── AUTH ─────────────────────────────────────────────────
export async function register(name, email, password) {
  const data = await request('POST', '/auth/register', { name, email, password });
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await request('POST', '/auth/login', { email, password });
  if (data.token) setAuthToken(data.token);
  return data;
}

// ─── PROFILE ─────────────────────────────────────────────
export async function buildProfile(monthlyIncome, age, monthlySavings, regime = 'new') {
  return request('POST', '/profile/build', {
    monthly_income: monthlyIncome,
    age,
    monthly_savings: monthlySavings,
    regime,
  });
}

// ─── RECOMMENDATIONS ─────────────────────────────────────
export async function getRecommendations(profileId) {
  return request('POST', '/recommend', { profileId });
}

// ─── INSTRUMENTS ─────────────────────────────────────────
export async function getInstruments(type, sort = 'rate', order = 'desc', limit = 20) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  params.set('sort', sort);
  params.set('order', order);
  params.set('limit', limit);
  return request('GET', `/instruments?${params.toString()}`);
}

// ─── PROJECTIONS ─────────────────────────────────────────
export async function getProjections(profileId, instruments, monthlyInvestment, years) {
  return request('POST', '/projection', {
    profileId,
    instruments,
    monthly_investment: monthlyInvestment,
    years: years || [5, 10, 15, 20],
  });
}

// ─── MONTE CARLO ─────────────────────────────────────────
export async function runMonteCarlo(instrument, monthlyInvestment, years, targetAmount, postTaxRate) {
  return request('POST', '/montecarlo/montecarlo', {
    instrument,
    monthly_investment: monthlyInvestment,
    years,
    target_amount: targetAmount || null,
    post_tax_rate: postTaxRate || null,
  });
}

// ─── GOALS ───────────────────────────────────────────────
export async function createGoal(goalData) {
  return request('POST', '/goals/create', goalData);
}

export async function getGoals() {
  return request('GET', '/goals');
}

export async function deleteGoal(goalId) {
  return request('DELETE', `/goals/${goalId}`);
}

// ─── HEALTH ──────────────────────────────────────────────
export async function healthCheck() {
  return request('GET', '/health');
}

// ─── CHAT (Genie) ────────────────────────────────────────
export async function sendChatMessage(message, sessionId) {
  return request('POST', '/chat/message', { message, session_id: sessionId });
}

export async function getChatHistory(sessionId) {
  return request('GET', `/chat/history?session_id=${sessionId}&limit=50`);
}

export async function clearChatSession(sessionId) {
  return request('DELETE', `/chat/session/${sessionId}`);
}

// Default export for convenience
const api = {
  register, login, setAuthToken, getAuthToken, clearAuthToken,
  buildProfile, getRecommendations, getInstruments, getProjections,
  runMonteCarlo, createGoal, getGoals, deleteGoal, healthCheck,
  sendChatMessage, getChatHistory, clearChatSession,
};

export default api;
