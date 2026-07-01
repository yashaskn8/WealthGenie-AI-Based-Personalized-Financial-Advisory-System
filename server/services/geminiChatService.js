/**
 * Genie Chat Service — Dual-provider (Gemini + Groq fallback)
 * Rate limiting, context assembly, API calls, conversation persistence.
 */
import axios from 'axios';
import { getCache, setCache, redisClient, redisAvailable } from '../config/redis.js';
import { buildSystemPrompt } from './genieChatSystemPrompt.js';
import { createError } from '../middleware/errorHandler.js';
import ConversationHistory from '../models/ConversationHistory.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Recommendation from '../models/Recommendation.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const CHAT_RATE_LIMIT = 30;
const HISTORY_WINDOW = 20;
const MAX_OUTPUT_TOKENS = 4096;
const SYSTEM_PROMPT_TTL = 1800;

const rateLimitCounters = new Map();

async function checkRateLimit(userId) {
  const key = `chat:ratelimit:${userId}`;
  if (redisClient && redisAvailable) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, 3600);
      if (count > CHAT_RATE_LIMIT) {
        const ttl = await redisClient.ttl(key);
        return { allowed: false, count, ttl };
      }
      return { allowed: true, count };
    } catch (_) { /* fallthrough */ }
  }
  const now = Date.now();
  let entry = rateLimitCounters.get(userId);
  if (!entry || now - entry.start > 3600000) entry = { count: 0, start: now };
  entry.count++;
  rateLimitCounters.set(userId, entry);
  if (entry.count > CHAT_RATE_LIMIT) {
    return { allowed: false, count: entry.count, ttl: Math.ceil((entry.start + 3600000 - now) / 1000) };
  }
  return { allowed: true, count: entry.count };
}

/**
 * Call Gemini API. Returns { text, tokensUsed, wasCompleted } or null on failure.
 */
async function callGemini(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await axios.post(GEMINI_API_URL, payload, {
      timeout: 30000,
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    });
    const candidate = res.data?.candidates?.[0];
    if (!candidate || candidate.finishReason === 'SAFETY') return null;

    const text = candidate.content.parts.map(p => p.text).join('');
    const tokensUsed = res.data?.usageMetadata?.totalTokenCount || 0;
    const wasCompleted = candidate.finishReason === 'STOP';
    return { text, tokensUsed, wasCompleted, provider: 'gemini' };
  } catch (err) {
    console.error('[Chat] Gemini API error:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

/**
 * Call Groq API as fallback. Converts Gemini-style payload to OpenAI format.
 * Returns { text, tokensUsed, wasCompleted } or null on failure.
 */
async function callGroq(systemPrompt, recentHistory) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    // Convert Gemini history format → OpenAI messages format
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.parts.map(p => p.text).join(''),
      })),
    ];

    const res = await axios.post(GROQ_API_URL, {
      model: GROQ_MODEL,
      messages,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      top_p: 0.8,
    }, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const text = res.data?.choices?.[0]?.message?.content;
    if (!text) return null;

    const tokensUsed = res.data?.usage?.total_tokens || 0;
    const wasCompleted = res.data?.choices?.[0]?.finish_reason === 'stop';
    return { text, tokensUsed, wasCompleted, provider: 'groq' };
  } catch (err) {
    console.error('[Chat] Groq API error:', err.response?.data || err.message);
    return null;
  }
}

export async function processChat({ userId, user, message, sessionId }) {
  const rateCheck = await checkRateLimit(userId);
  if (!rateCheck.allowed) {
    throw createError(429, `Rate limit for user ${userId}`, `Chat limit reached (${CHAT_RATE_LIMIT}/hour). Resets in ${Math.ceil(rateCheck.ttl / 60)} minutes.`);
  }

  const profile = await FinancialProfile.findOne({ userId }).sort({ createdAt: -1 }).lean();
  if (!profile) {
    return {
      response: "I don't have your financial profile yet. Please complete the profile setup on the home page so I can give you personalised advice.",
      session_id: sessionId, grounded: false,
      messages_this_hour: rateCheck.count, rate_limit_remaining: CHAT_RATE_LIMIT - rateCheck.count,
    };
  }

  const recommendation = await Recommendation.findOne({ userId, profileId: profile._id }).sort({ generatedAt: -1 }).lean();
  const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();

  // Load full user document for name
  const fullUser = await User.findById(userId).lean() || { name: user.email, email: user.email };

  const promptCacheKey = `chat:sysprompt_v3:${userId}:${profile._id}`;
  let systemPrompt = await getCache(promptCacheKey);
  if (!systemPrompt) {
    let marketData = null;
    try { const cached = await getCache('index:stats:^NSEI'); marketData = cached ? { nifty: cached } : null; } catch (err) { console.warn('[GeminiChatService] Redis cache read failed:', err.message); }
    systemPrompt = buildSystemPrompt(fullUser, profile, recommendation, marketData, goals);
    console.info(`[Chat] System prompt built. Length: ${systemPrompt.length} chars.`);
    await setCache(promptCacheKey, systemPrompt, SYSTEM_PROMPT_TTL);
  } else {
    console.info(`[Chat] System prompt loaded from cache. Length: ${systemPrompt.length} chars.`);
  }

  let conversation = await ConversationHistory.findOne({ userId, session_id: sessionId, is_active: true });
  if (!conversation) {
    conversation = new ConversationHistory({ userId, profileId: profile._id, session_id: sessionId, messages: [] });
  }

  const recentHistory = conversation.messages.slice(-HISTORY_WINDOW).map(m => ({ role: m.role, parts: [{ text: m.content }] }));
  recentHistory.push({ role: 'user', parts: [{ text: message }] });

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: recentHistory,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      topP: 0.8,
      topK: 40,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const startTime = Date.now();

  // ── Try Gemini first, then fall back to Groq ──
  let result = await callGemini(payload);
  if (!result) {
    console.info('[Chat] Gemini failed or quota exhausted, falling back to Groq...');
    result = await callGroq(systemPrompt, recentHistory);
  }

  const latencyMs = Date.now() - startTime;
  let responseText = '';
  let tokensUsed = 0;
  let provider = '';
  let wasCompleted = true;

  if (!result) {
    console.info('[Chat] Both providers failed, generating profile-grounded local fallback response...');
    responseText = generateLocalFallbackResponse(fullUser, profile, goals, message);
    tokensUsed = 120;
    provider = 'local_fallback';
  } else {
    responseText = result.text;
    tokensUsed = result.tokensUsed;
    provider = result.provider;
    wasCompleted = result.wasCompleted;

    // ── Response completeness check ─────────────────────────────────
    if (!wasCompleted) {
      console.warn(
        `[Chat] Response truncated (${provider}). Tokens: ${tokensUsed}. UserId: ${userId}`
      );
      responseText = responseText.trimEnd()
        + '\n\n*Response was truncated. Please ask me to continue '
        + 'or rephrase for a shorter answer.*';
    }
  }

  console.info(`[Chat] [${provider}] Response: ${responseText.length} chars. Completed: ${wasCompleted}. "${responseText.substring(0, 50)}..."`);

  conversation.messages.push({ role: 'user', content: message, metadata: { grounded_on_profile: true } });
  conversation.messages.push({
    role: 'model', content: responseText,
    metadata: { tokens_used: tokensUsed, latency_ms: latencyMs, grounded_on_profile: true, disclaimer_appended: responseText.includes('SEBI'), provider },
  });
  await conversation.save();

  return {
    response: responseText, session_id: sessionId, latency_ms: latencyMs,
    tokens_used: tokensUsed, messages_this_hour: rateCheck.count,
    rate_limit_remaining: CHAT_RATE_LIMIT - rateCheck.count, grounded: true,
  };
}

function generateLocalFallbackResponse(user, profile, goals, message) {
  const age = profile.age || 30;
  const income = profile.income || 0;
  const annualIncome = profile.annualIncome || (income * 12) || 0;
  const savings = profile.savings || 0;
  const risk = profile.riskCategory || 'Moderate';
  const regime = profile.taxRegime || 'new';
  const horizon = profile.investmentHorizon || 15;
  const recommendedEquity = profile.recommendedEquityAllocation || 50;

  const msg = message.toLowerCase();
  
  let dynamicResponse = `Hello ${user.name || 'Investor'}! While I'm experiencing temporary connectivity issues with my core brain models, I can still provide expert guidance grounded in your active financial profile.

`;

  if (msg.includes('rebalance') || msg.includes('allocat')) {
    dynamicResponse += `**Portfolio Allocation & Rebalancing Guidance:**
Based on your profile as a **${age}-year-old ${risk} investor**, my recommended target allocation is **${recommendedEquity}% Equity** and **${100 - recommendedEquity}% Debt/Fixed Income**. 

To optimize this:
1. Check if your current allocations have drifted by more than 5% due to recent market moves.
2. Direct your monthly savings of **₹${savings.toLocaleString('en-IN')}/month** to under-allocated segments to rebalance naturally without triggering capital gains taxes.
3. Utilize our built-in **Portfolio Rebalancer** in the sidebar to simulate custom weights.

<<<ACTION_CARD>>>
{
  "type": "rebalance",
  "title": "Natural Rebalancer Action",
  "subtitle": "Align with your ${risk} profile",
  "metrics": [
    { "label": "Target Equity", "value": "${recommendedEquity}%", "trend": "neutral" },
    { "label": "Monthly SIP", "value": "₹${savings.toLocaleString('en-IN')}", "trend": "up" }
  ],
  "actions": [
    { "label": "Open Rebalancer", "action": "navigate", "target": "/rebalancer" }
  ],
  "severity": "info",
  "insight": "Keep transaction costs low by using new SIP inflows of ₹${savings.toLocaleString('en-IN')} to rebalance instead of selling."
}
<<<END_ACTION_CARD>>>`;
  } else if (msg.includes('tax') || msg.includes('slab') || msg.includes('regime')) {
    const stdDeduction = regime === 'new' ? 75000 : 50000;
    const taxable = Math.max(0, annualIncome - stdDeduction);
    
    dynamicResponse += `**Tax Optimization Guidance (${regime.toUpperCase()} Regime):**
Your profile is set to the **${regime.toUpperCase()} Regime** with a monthly income of **₹${income.toLocaleString('en-IN')}** (Annualized: ₹${annualIncome.toLocaleString('en-IN')}). Under current tax provisions:
1. Standard deduction of **₹${stdDeduction.toLocaleString('en-IN')}** has been automatically factored into your computed taxable income of **₹${taxable.toLocaleString('en-IN')}**.
2. If you want to explore old regime tax deductions like Section 80C or Section 80CCD(1B) for NPS, head over to our **Tax Optimizer** screen.
3. Consider utilizing tax-shielded instruments to optimize LTCG under the new regime.

<<<ACTION_CARD>>>
{
  "type": "tax_save",
  "title": "Regime Comparer Analysis",
  "subtitle": "Maximize take-home salary",
  "metrics": [
    { "label": "Taxable Income", "value": "₹${taxable.toLocaleString('en-IN')}", "trend": "down" },
    { "label": "Active Regime", "value": "${regime.toUpperCase()}", "trend": "neutral" }
  ],
  "actions": [
    { "label": "Optimize Tax", "action": "navigate", "target": "/tax" }
  ],
  "severity": "success",
  "insight": "Run a simulation on our Tax Optimizer tool to confirm if standard new regime slabs are more efficient for your ₹${annualIncome.toLocaleString('en-IN')}/yr bracket."
}
<<<END_ACTION_CARD>>>`;
  } else if (msg.includes('sip') || msg.includes('grow') || msg.includes('step') || msg.includes('horizon')) {
    dynamicResponse += `**Wealth Projection & Step-Up Strategy:**
You currently save **₹${savings.toLocaleString('en-IN')}/month** with an investment horizon of **${horizon} years**. 

By applying an annual SIP Step-Up:
1. Increasing your SIP by **10% every year** can significantly multiply your terminal corpus through compounding.
2. Rupee-cost averaging helps neutralize short-term market corrections.
3. Run simulations in the **SIP Step-Up Planner** to see flat vs. step-up trajectory charts.

<<<ACTION_CARD>>>
{
  "type": "sip_stepup",
  "title": "Compounding Booster",
  "subtitle": "Apply 10% annual increase",
  "metrics": [
    { "label": "Current SIP", "value": "₹${savings.toLocaleString('en-IN')}", "trend": "neutral" },
    { "label": "Horizon", "value": "${horizon} Yrs", "trend": "neutral" }
  ],
  "actions": [
    { "label": "Plan Step-Up", "action": "navigate", "target": "/stepup" }
  ],
  "severity": "info",
  "insight": "A simple 10% step-up on your ₹${savings.toLocaleString('en-IN')} monthly savings can expand your terminal wealth by over 40%."
}
<<<END_ACTION_CARD>>>`;
  } else {
    // General default fallback
    const goalStr = goals.length > 0 ? goals.map(g => g.goal_name).join(', ') : 'Wealth Growth';
    dynamicResponse += `**WealthGenie Action Plan for ${user.name || 'Investor'}:**
Grounding my responses in your current profile:
1. **Age**: ${age} (Investment Horizon: ${horizon} years).
2. **Monthly Budget**: ₹${savings.toLocaleString('en-IN')} savings capacity.
3. **Core Goals**: ${goalStr}.

Feel free to ask me to analyze:
1. **Rebalancing** your assets.
2. **Tax optimization** between regimes.
3. **Compounding simulations** for your goals.

For informational purposes only. Not registered investment advice under SEBI (IA) Regulations, 2013. Consult a SEBI-registered adviser before investing. Mutual fund investments are subject to market risk.`;
  }

  return dynamicResponse;
}
