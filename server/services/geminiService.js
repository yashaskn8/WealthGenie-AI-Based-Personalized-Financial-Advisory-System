import axios from 'axios';
import { getCache, setCache } from '../config/redis.js';
import crypto from 'crypto';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama-3.3-70b-versatile';
const GEMINI_CHAT_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function hashProfile(profile) {
  return crypto.createHash('md5').update(JSON.stringify(profile)).digest('hex');
}

export async function generateAdvisory(userContext) {
  const { age, annualIncome, monthlySavings, taxSlab, riskCategory, instruments, horizon, shapExplanation } = userContext;
  const cacheKey = `advisory:${hashProfile(userContext)}`;

  // Check Redis cache (1 hour TTL)
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const instrumentList = instruments.map(i => `${i.name} (${i.type}) — post-tax return: ${i.postTaxReturn}%`).join('\n  ');

  // Build SHAP context block if available
  let shapContext = '';
  if (shapExplanation && shapExplanation.feature_contributions) {
    const contributions = shapExplanation.feature_contributions
      .map(c => `${c.display_name}: ${c.direction} recommendation by ${c.magnitude}`)
      .join(', ');
    shapContext = `\n\nML Model Reasoning:\nThe AI model's top reason for this recommendation was: ${shapExplanation.top_reason}\nThe feature contributions in order of importance were: ${contributions}.\nIncorporate this reasoning naturally into your advisory paragraph. Do not use technical jargon like 'SHAP values'. Write as if you are a human financial advisor explaining your logic.`;
  }

  const prompt = `You are a certified Indian financial advisor. Based on the following investor profile, write a 3-paragraph advisory note (under 300 words total):

Investor Profile:
- Age: ${age} years
- Annual Income: ₹${annualIncome.toLocaleString('en-IN')}
- Monthly Savings: ₹${monthlySavings.toLocaleString('en-IN')}
- Tax Slab: ${(taxSlab * 100).toFixed(0)}% marginal rate
- Risk Category: ${riskCategory}
- Investment Horizon: ${horizon} years

Top 3 Recommended Instruments:
  ${instrumentList}
${shapContext}
Instructions:
Paragraph 1: Explain WHY these specific instruments suit this investor's profile (age, income, risk tolerance).
Paragraph 2: Highlight 2-3 KEY RISKS the investor should be aware of.
Paragraph 3: Provide ONE specific, actionable next step the investor should take immediately.

Use simple English. Reference specific numbers from the profile. Do not use bullet points. Keep it warm and professional.`;

  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY; // Fallback to GEMINI_API_KEY var name if they forgot to change it
    if (!apiKey) return { text: 'Groq API key not configured. Please set GROQ_API_KEY in your .env file.', cached: false };

    const response = await axios.post(GROQ_API_URL, {
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    }, { 
      timeout: 15000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const text = response.data?.choices?.[0]?.message?.content || 'Unable to generate advisory.';
    const result = { text, cached: false, generatedAt: new Date().toISOString() };

    // Cache for 1 hour
    await setCache(cacheKey, result, 3600);
    return result;
  } catch (err) {
    console.error('Groq API error:', err.message);
    return { text: getFallbackAdvisory(userContext), cached: false, fallback: true };
  }
}

function getFallbackAdvisory({ age, riskCategory, instruments }) {
  const topInst = instruments[0]?.name || 'diversified instruments';
  return `Based on your profile as a ${age}-year-old ${riskCategory} investor, ${topInst} aligns well with your financial goals. The recommended instruments balance growth potential with your risk tolerance, optimizing for post-tax returns under the current Indian tax regime.\n\nKey risks include market volatility affecting equity-linked instruments, interest rate changes impacting fixed-income returns, and inflation eroding purchasing power over your investment horizon. Diversification across the recommended instruments helps mitigate these risks.\n\nAs an immediate next step, consider starting a monthly SIP in your top-recommended instrument to benefit from rupee cost averaging and begin building your wealth systematically.`;
}

export async function chatWithGemini(message, profileContext) {
  const systemPrompt = `You are WealthGenie, an AI financial advisor for Indian retail investors. The user's profile: Age ${profileContext.age}, Income ₹${profileContext.annualIncome}/yr, Risk: ${profileContext.riskCategory}. Answer concisely in 2-3 sentences. Only give financial advice relevant to Indian markets and tax laws.`;

  // ── Attempt 1: Groq API ──
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await axios.post(GROQ_API_URL, {
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.6
      }, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        }
      });
      const text = res.data?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (groqErr) {
      console.error('[chatWithGemini] Groq failed, falling back to Gemini:', groqErr.response?.data || groqErr.message);
    }
  }

  // ── Attempt 2: Gemini API fallback ──
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await axios.post(`${GEMINI_CHAT_URL}?key=${geminiKey}`, {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.6 }
      }, { timeout: 15000 });
      const text = res.data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
      if (text) return text;
    } catch (geminiErr) {
      console.error('[chatWithGemini] Gemini also failed:', geminiErr.response?.data || geminiErr.message);
    }
  }

  return 'I could not process that question right now. Please try again later.';
}
