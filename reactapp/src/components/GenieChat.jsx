import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Copy, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import './GenieChat.css';
import chatGenie from '../assets/chat_genie.png';
import * as api from '../services/api';

// ── Suggested questions derived from user profile context ─────────
function getSuggestedQuestions(profile) {
  if (!profile) return [];
  const questions = [
    'How much tax will I pay this financial year?',
    'Is ELSS better than PPF for my tax bracket?',
    'What is my actual post-tax return on an FD right now?',
    'How much should I invest monthly to retire at 60?',
  ];
  if (profile.risk_appetite === 'High') {
    questions.unshift('Should I increase my equity allocation?');
  }
  if (profile.age > 45) {
    questions.unshift('How should I shift my portfolio as I near retirement?');
  }
  return questions.slice(0, 4);
}

// ── FAB Button ────────────────────────────────────────────────────
const GenieFAB = ({ onClick }) => (
  <button className="genie-fab" onClick={onClick} title="Ask Genie">
    <img src={chatGenie} alt="Genie AI" className="genie-fab-logo" />
    <span className="genie-fab-ring"></span>
  </button>
);

// ── Robust inline Markdown renderer ───────────────────────────────
/**
 * Renders inline formatting within a single line of text.
 * Handles: **bold**, *italic*, and plain text.
 * Strips any remaining Markdown syntax that slipped through.
 */
function renderInline(line) {
  if (!line) return null;

  // Strip raw Markdown headers (### ## #) — replace with bold
  const cleanedLine = line
    .replace(/^#{1,3}\s+/, '')   // Remove leading ### or ## or #
    .replace(/^[*-]\s+/, '')      // Remove leading * or - bullets
    .replace(/^>\s+/, '');        // Remove blockquote >

  // Split on **bold** and *italic* markers
  const parts = cleanedLine.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Renders message content with robust Markdown handling ─────────
function MessageContent({ content }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <span className="genie-message-content">
      {lines.map((line, lineIndex) => {
        const isLast = lineIndex === lines.length - 1;

        // Skip rendering empty lines at the end
        if (!line.trim() && isLast) return null;

        return (
          <span key={lineIndex}>
            {renderInline(line)}
            {!isLast && <br />}
          </span>
        );
      })}
    </span>
  );
}

// ── Message Bubble ────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--genie'}`}>
      {msg.role === 'assistant' && <div className="bubble-avatar">🧞</div>}
      <div className="bubble-body">
        <div className="bubble-text">
          <MessageContent content={msg.content} />
        </div>
        <div className="bubble-meta">
          <span className="bubble-time">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.role === 'assistant' && msg.latency_ms && (
            <span className="bubble-latency">{(msg.latency_ms / 1000).toFixed(1)}s</span>
          )}
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

// ── Contextual Suggested Pills (FIX 4) ───────────────────────────
function generateContextualPills(lastQuestion, profile) {
  if (!lastQuestion) return [];

  const q = lastQuestion.toLowerCase();

  // Tax-related follow-ups
  if (q.includes('tax')) {
    return [
      'Which regime saves me more tax?',
      'How can I reduce my tax liability?',
      'What is my post-tax return on an FD?',
    ];
  }

  // Investment comparison follow-ups
  if (q.includes('invest') || q.includes('elss') || q.includes('fd') || q.includes('ppf')) {
    return [
      'Show me a 10-year projection for ELSS',
      'What is the lock-in period for ELSS?',
      'How does ELSS compare to PPF after tax?',
    ];
  }

  // Goal planning follow-ups
  if (q.includes('retire') || q.includes('goal') || q.includes('corpus') || q.includes('sip')) {
    return [
      'How much SIP do I need for retirement?',
      'Am I on track for my goals?',
      'What is the 25x rule for retirement?',
    ];
  }

  // General financial follow-ups
  return [
    'What investment suits my risk profile?',
    'How much emergency fund should I maintain?',
  ];
}

function SuggestedPills({ baseQuestion, profile, onSelect }) {
  const pills = generateContextualPills(baseQuestion, profile);
  if (!pills.length) return null;

  return (
    <div className="quick-replies">
      {pills.map((pill, i) => (
        <button
          key={i}
          className="quick-chip follow-up"
          onClick={() => onSelect(pill)}
        >
          <Sparkles size={12} /> {pill}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
const GenieChat = ({ profile, recommendations }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState({ remaining: 30, total: 30 });
  const [sessionId, setSessionId] = useState(() => {
    const stored = sessionStorage.getItem('genie_session_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('genie_session_id', newId);
    return newId;
  });

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Track last user message for contextual pills
  const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

  // Load history on open
  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async () => {
    try {
      const data = await api.getChatHistory(sessionId);
      if (data.conversations?.[0]?.messages) {
        setMessages(data.conversations[0].messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
          latency_ms: m.metadata?.latency_ms,
        })));
      }
    } catch (_) {
      // New session — no history
    }
  };

  const sendMessage = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setError(null);

    const userMsg = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await api.sendChatMessage(messageText, sessionId);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        latency_ms: data.latency_ms,
      }]);

      setRateLimit({
        remaining: data.rate_limit_remaining,
        total: 30,
      });
    } catch (err) {
      const errorMsg = err.message || 'Genie is temporarily unavailable. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await api.clearChatSession(sessionId);
    } catch (_) {}
    setMessages([]);
    setError(null);
    setRateLimit({ remaining: 30, total: 30 });
    const newId = crypto.randomUUID();
    sessionStorage.setItem('genie_session_id', newId);
    setSessionId(newId);
  };

  const suggestedQuestions = getSuggestedQuestions(profile);

  // Get last assistant message to check for truncation
  const lastAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];
  const lastResponseTruncated = lastAssistantMsg?.content?.includes('*Response was truncated');

  return (
    <>
      {!isOpen && <GenieFAB onClick={() => setIsOpen(true)} />}

      {isOpen && (
        <div className="genie-panel">
          {/* ── Header ──────────────────────────────────── */}
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
              {/* FIX 5: Rate limit warning state */}
              <span className={`rate-limit-badge ${
                rateLimit.remaining <= 5 ? 'rate-limit-warning' : ''
              }`}>
                {rateLimit.remaining <= 0
                  ? 'Limit reached — resets in 1 hour'
                  : `${rateLimit.remaining}/${rateLimit.total}`
                }
              </span>
              <button onClick={clearChat} title="Clear chat"><Trash2 size={16} /></button>
              <button onClick={() => setIsOpen(false)} title="Close"><X size={18} /></button>
            </div>
          </div>

          {/* ── Messages ────────────────────────────────── */}
          <div className="genie-messages">
            {messages.length === 0 && !isLoading && (
              <div className="genie-welcome">
                <span style={{ fontSize: '2.5rem' }}>🧞</span>
                <p>Hi{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! I'm <strong>Genie</strong>, your personal financial advisor.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Ask me anything about your investments, tax planning, or financial goals. I have your complete profile loaded.
                </p>
                {suggestedQuestions.length > 0 && (
                  <div className="welcome-suggestions">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} className="suggestion-pill" onClick={() => sendMessage(q)}>
                        <Sparkles size={12} /> {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {isLoading && (
              <div className="chat-bubble chat-bubble--genie">
                <div className="bubble-avatar">🧞</div>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error-banner">{error}</div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Contextual Follow-Up Pills (FIX 4) ──────── */}
          {messages.length > 0
            && !isLoading
            && !lastResponseTruncated
            && lastAssistantMsg?.content?.length > 50
            && (
              <SuggestedPills
                baseQuestion={lastUserMessage}
                profile={profile}
                onSelect={sendMessage}
              />
            )}

          {/* ── Input Bar ──────────────────────────────── */}
          <div className="genie-input-bar">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Genie about your investments, tax, or goals..."
              className="genie-input"
              maxLength={1000}
              disabled={isLoading || rateLimit.remaining === 0}
            />
            <button
              className="genie-send-btn"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim() || rateLimit.remaining === 0}
            >
              {isLoading ? <RefreshCw size={18} className="spin-icon" /> : <Send size={18} />}
            </button>
          </div>

          {/* ── Disclaimer ─────────────────────────────── */}
          <div className="genie-disclaimer">
            ⚠️ For informational purposes only. Not registered investment advice.
          </div>
        </div>
      )}
    </>
  );
};

export default GenieChat;
