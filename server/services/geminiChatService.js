/**
 * Genie Chat Service — Gemini 1.5 Flash integration
 * Rate limiting, context assembly, API calls, conversation persistence.
 */
import axios from 'axios';
import { getCache, setCache, redisClient } from '../config/redis.js';
import { buildSystemPrompt } from './genieChatSystemPrompt.js';
import ConversationHistory from '../models/ConversationHistory.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Recommendation from '../models/Recommendation.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const CHAT_RATE_LIMIT = 30;
const HISTORY_WINDOW = 20;
const MAX_OUTPUT_TOKENS = 1200;
const SYSTEM_PROMPT_TTL = 1800;

const rateLimitCounters = new Map();

async function checkRateLimit(userId) {
  const key = `chat:ratelimit:${userId}`;
  if (redisClient) {
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

export async function processChat({ userId, user, message, sessionId }) {
  const rateCheck = await checkRateLimit(userId);
  if (!rateCheck.allowed) {
    throw { status: 429, message: `Chat limit reached (${CHAT_RATE_LIMIT}/hour). Resets in ${Math.ceil(rateCheck.ttl / 60)} minutes.` };
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
    try { const cached = await getCache('index:stats:^NSEI'); marketData = cached ? { nifty: cached } : null; } catch (_) {}
    systemPrompt = buildSystemPrompt(fullUser, profile, recommendation, marketData, goals);
    console.log(`[Chat] System prompt built. Length: ${systemPrompt.length} chars.`);
    await setCache(promptCacheKey, systemPrompt, SYSTEM_PROMPT_TTL);
  } else {
    console.log(`[Chat] System prompt loaded from cache. Length: ${systemPrompt.length} chars.`);
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
      // No stopSequences — let the model reach a natural end.
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const startTime = Date.now();
  let geminiResponse;
  try {
    geminiResponse = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, payload, { timeout: 20000 });
  } catch (apiErr) {
    console.error('[Chat] Gemini API error:', apiErr.response?.data || apiErr.message);
    conversation.messages.push({ role: 'user', content: message, metadata: { grounded_on_profile: true } });
    await conversation.save();
    throw { status: 502, message: 'Genie is temporarily unavailable. Please try again in a moment.' };
  }

  const latencyMs = Date.now() - startTime;
  const candidate = geminiResponse.data?.candidates?.[0];
  if (!candidate || candidate.finishReason === 'SAFETY') {
    throw { status: 400, message: 'The message could not be processed. Please rephrase your question.' };
  }

  let responseText = candidate.content.parts.map(p => p.text).join('');
  const tokensUsed = geminiResponse.data?.usageMetadata?.totalTokenCount || 0;

  // ── Response completeness check ─────────────────────────────────
  const finishReason = candidate.finishReason;
  const wasCompleted = finishReason === 'STOP';

  if (!wasCompleted) {
    console.warn(
      `[Chat] Response truncated. finishReason: ${finishReason}. `
      + `Tokens: ${tokensUsed}. UserId: ${userId}`
    );
    responseText = responseText.trimEnd()
      + '\n\n*Response was truncated. Please ask me to continue '
      + 'or rephrase for a shorter answer.*';
  }

  console.log(`[Chat] Response length: ${responseText.length} chars. Completed: ${wasCompleted}. Text: "${responseText.substring(0, 50)}..."`);

  conversation.messages.push({ role: 'user', content: message, metadata: { grounded_on_profile: true } });
  conversation.messages.push({
    role: 'model', content: responseText,
    metadata: { tokens_used: tokensUsed, latency_ms: latencyMs, grounded_on_profile: true, disclaimer_appended: responseText.includes('SEBI') },
  });
  await conversation.save();

  return {
    response: responseText, session_id: sessionId, latency_ms: latencyMs,
    tokens_used: tokensUsed, messages_this_hour: rateCheck.count,
    rate_limit_remaining: CHAT_RATE_LIMIT - rateCheck.count, grounded: true,
  };
}
