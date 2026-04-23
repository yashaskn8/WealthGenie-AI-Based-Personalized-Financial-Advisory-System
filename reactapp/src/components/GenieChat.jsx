import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Copy, Trash2, Sparkles } from 'lucide-react';
import './GenieChat.css';
import chatGenie from '../assets/chat_genie.png';

const GenieFAB = ({ onClick }) => (
  <button className="genie-fab" onClick={onClick} title="Ask Genie">
    <img src={chatGenie} alt="Genie AI" className="genie-fab-logo" />
    <span className="genie-fab-ring"></span>
  </button>
);

const MessageBubble = ({ msg }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--genie'}`}>
      {msg.role === 'assistant' && (
        <div className="bubble-avatar">🧞</div>
      )}
      <div className="bubble-body">
        <div className="bubble-text">{msg.content}</div>
        <div className="bubble-meta">
          <span className="bubble-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.role === 'assistant' && (
            <button className="bubble-copy" onClick={handleCopy} title="Copy">
              {copied ? '✓' : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickReplies = ({ chips, onSelect }) => (
  <div className="quick-replies">
    {chips.map((chip, i) => (
      <button key={i} className="quick-chip" onClick={() => onSelect(chip)}>
        <Sparkles size={12} /> {chip}
      </button>
    ))}
  </div>
);

const GenieChat = ({ profile, recommendations }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('wg_chat');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState([
    'Explain my portfolio allocation',
    'How does ELSS save tax?',
    'What if I invest ₹500 more monthly?'
  ]);
  const [nudgeSent, setNudgeSent] = useState(false);
  const chatEndRef = useRef(null);
  const nudgeTimerRef = useRef(null);

  // Persist chat
  useEffect(() => {
    localStorage.setItem('wg_chat', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Proactive nudge after 30s on dashboard
  useEffect(() => {
    if (!nudgeSent && messages.length === 0) {
      nudgeTimerRef.current = setTimeout(() => {
        const nudgeMsg = {
          role: 'assistant',
          content: "👋 Hi! I noticed you're exploring your portfolio. Want me to explain why your top investment got the highest allocation, or help you optimize your tax savings?",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, nudgeMsg]);
        setNudgeSent(true);
        setIsOpen(true);
      }, 30000);
    }
    return () => clearTimeout(nudgeTimerRef.current);
  }, [nudgeSent, messages.length]);

  const buildSystemPrompt = () => {
    return `You are Genie, an expert AI financial advisor embedded inside WealthGenie, a personal finance platform for Indian investors. You have access to the user's complete financial profile and their current recommended portfolio.

User Profile: ${JSON.stringify(profile || {})}
Recommended Portfolio: ${JSON.stringify((recommendations || []).map(r => ({
  name: r.name, category: r.category, monthly_allocation: r.monthly_allocation,
  projected_value: r.projected_value, expected_return_max: r.expected_return_max,
  risk_level: r.risk_level, tax_benefit: r.tax_benefit
})))}

You must:
- Answer questions about their specific investments, returns, tax benefits, and portfolio allocation.
- Explain any of the 15 investment options in simple terms.
- Suggest rebalancing if the user describes a life change.
- Calculate projections on demand.
- Always cite specific data from their profile when giving advice.
- Format all monetary values in Indian format (lakhs and crores).
- Never recommend illegal tax evasion. Always note that advice is educational and not SEBI-registered financial advice.
- Keep responses concise — under 200 words unless the user asks for detail.
- Use a warm, encouraging tone.`;
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation for API
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: apiMessages
        })
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      const genieMsg = {
        role: 'assistant',
        content: data.response || "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, genieMsg]);

      // Generate quick replies
      if (data.suggestions && data.suggestions.length > 0) {
        setQuickReplies(data.suggestions);
      } else {
        setQuickReplies([
          'Tell me more about this',
          'How does this affect my taxes?',
          'What are the risks?'
        ]);
      }
    } catch (err) {
      // Fallback: generate a helpful local response
      const fallbackMsg = {
        role: 'assistant',
        content: generateLocalResponse(text, profile, recommendations),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setQuickReplies([
      'Explain my portfolio allocation',
      'How does ELSS save tax?',
      'What if I invest ₹500 more monthly?'
    ]);
    localStorage.removeItem('wg_chat');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {!isOpen && <GenieFAB onClick={() => setIsOpen(true)} />}

      {isOpen && (
        <div className="genie-panel">
          <div className="genie-panel-header">
            <div className="genie-header-left">
              <span className="genie-avatar">🧞</span>
              <div>
                <div className="genie-header-title">Genie</div>
                <div className="genie-header-sub">
                  <span className="online-dot"></span> Your Financial Advisor
                </div>
              </div>
            </div>
            <div className="genie-header-actions">
              <button onClick={clearChat} title="Clear chat"><Trash2 size={16} /></button>
              <button onClick={() => setIsOpen(false)} title="Close"><X size={18} /></button>
            </div>
          </div>

          <div className="genie-messages">
            {messages.length === 0 && (
              <div className="genie-welcome">
                <span style={{ fontSize: '2rem' }}>🧞</span>
                <p>Hi! I'm <strong>Genie</strong>, your personal finance advisor.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Ask me anything about your portfolio, investments, or tax savings.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {isTyping && (
              <div className="chat-bubble chat-bubble--genie">
                <div className="bubble-avatar">🧞</div>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {quickReplies.length > 0 && messages.length > 0 && (
            <QuickReplies chips={quickReplies} onSelect={sendMessage} />
          )}

          <div className="genie-input-bar">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Genie anything..."
              className="genie-input"
            />
            <button className="genie-send-btn" onClick={() => sendMessage(input)} disabled={!input.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/** Fallback local response when API is unavailable */
function generateLocalResponse(question, profile, recommendations) {
  const q = question.toLowerCase();
  const recs = recommendations || [];
  const topRec = recs[0];

  if (q.includes('portfolio') || q.includes('allocation')) {
    const summary = recs.map(r => `• ${r.name}: ₹${r.monthly_allocation}/mo`).join('\n');
    return `Here's your current portfolio allocation:\n\n${summary}\n\nThis allocation is optimized for your ${profile?.risk_appetite || 'Medium'} risk profile and ${profile?.investment_horizon || 15}-year horizon. 📊\n\n⚠️ This is educational advice, not SEBI-registered financial advice.`;
  }

  if (q.includes('tax') || q.includes('elss') || q.includes('80c')) {
    const taxInvestments = recs.filter(r => r.tax_benefit);
    if (taxInvestments.length > 0) {
      return `Great question! Your portfolio includes ${taxInvestments.length} tax-saving investments:\n\n${taxInvestments.map(r => `• ${r.name} (Section ${r.tax_section})`).join('\n')}\n\nUnder Section 80C, you can claim up to ₹1,50,000 in deductions. ELSS funds have the shortest lock-in of just 3 years among 80C options! 💰\n\n⚠️ This is educational advice only.`;
    }
  }

  if (q.includes('increase') || q.includes('more') || q.includes('step up')) {
    return `Increasing your SIP by even ₹500/month can make a significant difference over ${profile?.investment_horizon || 15} years. With the power of compounding, that extra ₹500 at ~12% returns could grow to approximately ₹2.5L over 15 years! Consider using the SIP Step-Up Planner for detailed projections. 📈\n\n⚠️ This is educational advice only.`;
  }

  if (topRec) {
    return `Based on your ${profile?.risk_appetite || 'Medium'} risk profile and goals of ${(profile?.investment_goals || []).join(', ')}, I've allocated the highest portion to ${topRec.name} (₹${topRec.monthly_allocation}/mo) because it offers ${topRec.expected_return_min}%–${topRec.expected_return_max}% returns${topRec.tax_benefit ? ' with tax benefits' : ''}.\n\nWould you like me to explain any specific investment in detail? 🧞\n\n⚠️ This is educational advice only.`;
  }

  return "I'd be happy to help with your financial questions! Try asking about your portfolio allocation, tax saving options, or how to increase your returns. 🧞\n\n⚠️ This is educational advice, not SEBI-registered financial advice.";
}

export default GenieChat;
