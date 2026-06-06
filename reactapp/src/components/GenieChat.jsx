import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Copy, Trash2, Sparkles, RefreshCw, TrendingUp, TrendingDown, Shield, Target, BarChart3, Zap, AlertTriangle, DollarSign, ChevronRight, ThumbsUp, ThumbsDown, Mic, MicOff, ArrowLeft, ExternalLink, Scale, Coins, Percent, Info, Lock } from 'lucide-react';
import JargonTooltip from './JargonTooltip';
import './GenieChat.css';
import chatGenie from '../assets/chat_genie.png';
import * as api from '../services/api';

// ── Full INR formatting helper (bypassing compact suffix) ────────
function formatFullINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  if (!isFinite(num)) return '₹∞';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

// ── SIP Compound Interest Math ────────────────────────────────────
function calculateStepUpSIP(monthlySIP, annualStepUpPercent, years, rateOfReturn = 12) {
  let totalInvested = 0;
  let terminalValue = 0;
  let currentMonthlySIP = monthlySIP;
  const monthlyRate = rateOfReturn / 12 / 100;
  
  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      totalInvested += currentMonthlySIP;
      terminalValue = (terminalValue + currentMonthlySIP) * (1 + monthlyRate);
    }
    currentMonthlySIP = currentMonthlySIP * (1 + annualStepUpPercent / 100);
  }
  
  return {
    totalInvested: Math.round(totalInvested),
    terminalValue: Math.round(terminalValue),
    wealthGain: Math.round(terminalValue - totalInvested)
  };
}

// ── Indian Income Tax slab calculator (simplified high-fidelity) ──
function calculateTaxes(grossIncome, deduction80C, deductionNPS) {
  const stdDeductionNew = 75000;
  const taxableNew = Math.max(0, grossIncome - stdDeductionNew);
  let taxNew = 0;
  
  if (taxableNew <= 1200000) {
    taxNew = 0;
  } else {
    let temp = taxableNew;
    if (temp > 2400000) { taxNew += (temp - 2400000) * 0.30; temp = 2400000; }
    if (temp > 2000000) { taxNew += (temp - 2000000) * 0.25; temp = 2000000; }
    if (temp > 1600000) { taxNew += (temp - 1600000) * 0.20; temp = 1600000; }
    if (temp > 1200000) { taxNew += (temp - 1200000) * 0.15; temp = 1200000; }
    if (temp > 800000) { taxNew += (temp - 800000) * 0.10; temp = 800000; }
    if (temp > 400000) { taxNew += (temp - 400000) * 0.05; }

    // Marginal relief for 87A (tax cannot exceed excess over 12L)
    const excessOverLimit = taxableNew - 1200000;
    if (taxNew > excessOverLimit) {
      taxNew = excessOverLimit;
    }
  }
  taxNew = taxNew * 1.04;

  const stdDeductionOld = 50000;
  const deductionsOld = Math.min(150000, Number(deduction80C) || 0) + Math.min(50000, Number(deductionNPS) || 0);
  const taxableOld = Math.max(0, grossIncome - stdDeductionOld - deductionsOld);
  let taxOld = 0;
  
  if (taxableOld <= 500000) {
    taxOld = 0;
  } else {
    let temp = taxableOld;
    if (temp > 1000000) { taxOld += (temp - 1000000) * 0.30; temp = 1000000; }
    if (temp > 500000) { taxOld += (temp - 500000) * 0.20; temp = 500000; }
    if (temp > 250000) { taxOld += (temp - 250000) * 0.05; }
  }
  taxOld = taxOld * 1.04;

  return {
    taxableNew: Math.round(taxableNew),
    taxNew: Math.round(taxNew),
    taxableOld: Math.round(taxableOld),
    taxOld: Math.round(taxOld),
    difference: Math.round(Math.abs(taxOld - taxNew)),
    betterRegime: taxNew <= taxOld ? 'new' : 'old'
  };
}

// Set of messages that have already completed streaming/typewriter effect
const streamedMessages = new WeakSet();

// ── Suggested questions ───────────────────────────────────────────
function getSuggestedQuestions(_profile) {
  const questions = [
    'Explain portfolio balancing in simple terms',
    'How do I start my first investment?',
    'Which tax regime is best for a beginner?',
    'How does compound growth build wealth?',
    'What is a safe investment mix for my age?',
  ];
  return questions.slice(0, 4);
}

// ── Parse ACTION_CARD blocks from AI response ─────────────────────
function parseActionCards(text) {
  const cards = [];
  const regex = /<<<ACTION_CARD>>>\s*([\s\S]*?)\s*<<<END_ACTION_CARD>>>/g;
  let match;
  let cleanText = text;
  while ((match = regex.exec(text)) !== null) {
    try {
      let jsonStr = match[1].replace(/^```json?\s*/gm, '').replace(/^```\s*$/gm, '').trim();
      // Strip inline comments
      jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
      // Strip trailing commas before closing braces/brackets
      jsonStr = jsonStr.replace(/,[ \t\r\n]*([}\]])/g, '$1');
      const card = JSON.parse(jsonStr);
      cards.push(card);
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      console.warn('[GenieChat] Failed to parse action card:', e.message);
    }
  }
  return { cleanText: cleanText.trim(), cards };
}

// ── Severity theme config ─────────────────────────────────────────
const severityColors = {
  info: { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)', accent: '#38bdf8', glow: 'rgba(56,189,248,0.15)' },
  success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', accent: '#22c55e', glow: 'rgba(34,197,94,0.15)' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', accent: '#ef4444', glow: 'rgba(239,68,68,0.15)' },
};
const cardIcons = { rebalance: <BarChart3 size={18}/>, sip_stepup: <TrendingUp size={18}/>, tax_save: <Shield size={18}/>, goal_insight: <Target size={18}/>, market_alert: <AlertTriangle size={18}/>, fee_xray: <DollarSign size={18}/> };
const trendIcons = { up: <TrendingUp size={13} style={{color:'#22c55e'}}/>, down: <TrendingDown size={13} style={{color:'#ef4444'}}/>, neutral: null };

// ── Sparkline Mini-Chart (inline bar chart for metrics) ───────────
function SparkBars({ data, color }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data) || 1;
  return (
    <div className="spark-bars">
      {data.map((v, i) => (
        <div key={i} className="spark-bar" style={{ height: `${(v / max) * 100}%`, background: color || '#38bdf8', opacity: 0.4 + (i / data.length) * 0.6 }} />
      ))}
    </div>
  );
}

// ── Action Card Component ─────────────────────────────────────────
function ActionCard({ card, onAction }) {
  const colors = severityColors[card.severity] || severityColors.info;
  const icon = cardIcons[card.type] || <Zap size={18}/>;
  const [executed, setExecuted] = useState(null);

  const handleAction = (action) => {
    setExecuted(action.label);
    if (onAction) onAction(action);
  };

  return (
    <div className="action-card" style={{ '--ac-bg': colors.bg, '--ac-border': colors.border, '--ac-accent': colors.accent, '--ac-glow': colors.glow }}>
      <div className="ac-header">
        <div className="ac-icon-wrap" style={{ color: colors.accent }}>{icon}</div>
        <div className="ac-header-text">
          <div className="ac-title">{card.title}</div>
          <div className="ac-subtitle">{card.subtitle}</div>
        </div>
        <div className="ac-severity-dot" style={{ background: colors.accent }} />
      </div>
      {card.metrics?.length > 0 && (
        <div className="ac-metrics">
          {card.metrics.map((m, i) => (
            <div key={i} className="ac-metric">
              <div className="ac-metric-label">{m.label}</div>
              <div className="ac-metric-value">{m.value}{m.trend && <span className="ac-trend">{trendIcons[m.trend]}</span>}</div>
            </div>
          ))}
        </div>
      )}
      {card.sparkData && <SparkBars data={card.sparkData} color={colors.accent} />}
      {card.insight && (
        <div className="ac-insight">
          <Sparkles size={12} style={{ color: colors.accent, flexShrink: 0, marginTop: 2 }} />
          <span>{card.insight}</span>
        </div>
      )}
      {card.actions?.length > 0 && (
        <div className="ac-actions">
          {card.actions.map((action, i) => (
            <button key={i} className={`ac-btn ${i === 0 ? 'ac-btn-primary' : 'ac-btn-secondary'} ${executed === action.label ? 'ac-btn-executed' : ''}`} onClick={() => handleAction(action)} disabled={!!executed} style={i === 0 ? { '--btn-accent': colors.accent } : {}}>
              {executed === action.label ? <>✓ Done</> : <>{action.label}<ChevronRight size={14} /></>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Confidence Meter ──────────────────────────────────────────────
function ConfidenceMeter({ level }) {
  const pct = level === 'high' ? 95 : level === 'medium' ? 70 : 40;
  const color = pct > 80 ? '#22c55e' : pct > 55 ? '#f59e0b' : '#ef4444';
  return (
    <div className="confidence-meter" title={`AI Confidence: ${pct}%`}>
      <div className="confidence-track"><div className="confidence-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <span className="confidence-label" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── Message Feedback (thumbs up/down) ─────────────────────────────
function MessageFeedback() {
  const [feedback, setFeedback] = useState(null);
  return (
    <div className="msg-feedback">
      <button className={`fb-btn ${feedback === 'up' ? 'fb-active-up' : ''}`} onClick={() => setFeedback('up')} title="Helpful"><ThumbsUp size={11} /></button>
      <button className={`fb-btn ${feedback === 'down' ? 'fb-active-down' : ''}`} onClick={() => setFeedback('down')} title="Not helpful"><ThumbsDown size={11} /></button>
    </div>
  );
}

// ── Inline Markdown renderer ──────────────────────────────────────
function renderInline(line) {
  if (!line) return null;
  const cleaned = line.replace(/^#{1,3}\s+/, '').replace(/^[*-]\s+/, '').replace(/^>\s+/, '');
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

// ── Message Content with Action Cards ─────────────────────────────
function MessageContent({ content, onAction }) {
  if (!content) return null;
  const { cleanText, cards } = parseActionCards(content);
  const lines = cleanText.split('\n');
  return (
    <span className="genie-message-content">
      {lines.map((line, li) => {
        if (!line.trim() && li === lines.length - 1) return null;
        return <span key={li}>{renderInline(line)}{li < lines.length - 1 && <br />}</span>;
      })}
      {cards.map((card, i) => <ActionCard key={i} card={card} onAction={onAction} />)}
    </span>
  );
}

// ── Streamed Typing Effect ────────────────────────────────────────
function useStreamedText(text, speed = 8) {
  const [prevText, setPrevText] = useState(text);
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  if (text !== prevText) {
    setPrevText(text);
    setDisplayed('');
    setDone(false);
  }

  useEffect(() => {
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      if (i >= text.length) { setDisplayed(text); setDone(true); clearInterval(id); }
      else setDisplayed(text.slice(0, i));
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

// ── Message Bubble ────────────────────────────────────────────────
const MessageBubble = ({ msg, onAction, isLatest }) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = msg.role === 'assistant';
  const shouldStream = isAssistant && isLatest && !msg._streamed && !streamedMessages.has(msg);
  const { displayed, done } = useStreamedText(shouldStream ? msg.content : null, 6);
  const content = shouldStream ? (done ? msg.content : displayed) : msg.content;

  useEffect(() => {
    if (done && shouldStream) {
      streamedMessages.add(msg);
    }
  }, [done, shouldStream, msg]);

  const handleCopy = () => { const { cleanText } = parseActionCards(msg.content); navigator.clipboard.writeText(cleanText); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--genie'}`}>
      {isAssistant && <div className="bubble-avatar"><span className="ba-letter">G</span></div>}
      <div className="bubble-body">
        <div className="bubble-text">
          <MessageContent content={content} onAction={onAction} />
          {shouldStream && !done && <span className="stream-cursor">|</span>}
        </div>
        <div className="bubble-meta">
          <span className="bubble-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isAssistant && msg.latency_ms && <span className="bubble-latency">{(msg.latency_ms / 1000).toFixed(1)}s</span>}
          {isAssistant && <MessageFeedback />}
          {isAssistant && <button className="bubble-copy" onClick={handleCopy} title="Copy">{copied ? '✓' : <Copy size={12} />}</button>}
        </div>
      </div>
    </div>
  );
};

// ── Proactive Nudge Banner ────────────────────────────────────────
function ProactiveNudge({ profile, onAsk }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !profile) return null;
  let nudge = null;
  if (profile.risk_appetite === 'High' && profile.age > 50) {
    nudge = { 
      icon: <AlertTriangle size={15} style={{ verticalAlign: 'middle' }} />, 
      text: 'Your risk appetite is set to Aggressive but you are over 50. Review safer allocations.', 
      question: 'Should I reduce my equity exposure at my age?' 
    };
  } else if (profile.monthly_savings && profile.monthly_savings < (profile.monthly_income || 0) * 0.2) {
    nudge = { 
      icon: <Info size={15} style={{ verticalAlign: 'middle' }} />, 
      text: 'Monthly savings are currently below 20% of gross income. Let us optimize your allocations.', 
      question: 'How can I increase my monthly savings rate?' 
    };
  }
  if (!nudge) return null;
  return (
    <div className="proactive-nudge">
      <span className="nudge-icon">{nudge.icon}</span>
      <span className="nudge-text">{nudge.text}</span>
      <button className="nudge-btn" onClick={() => { onAsk(nudge.question); setDismissed(true); }}>Ask Genie</button>
      <button className="nudge-dismiss" onClick={() => setDismissed(true)}>✕</button>
    </div>
  );
}

// ── Portfolio Snapshot Widget ─────────────────────────────────────
function PortfolioSnapshot({ profile }) {
  if (!profile) return null;
  const annualIncome = profile.annualIncome || (profile.monthly_income || profile.income || 0) * 12;
  const riskLabel = profile.risk_appetite || profile.riskCategory || 'N/A';
  const items = [
    { label: 'Income', value: `₹${(annualIncome / 100000).toFixed(1)}L`, color: '#38bdf8' },
    { label: 'Risk', value: riskLabel, color: riskLabel === 'High' ? '#ef4444' : riskLabel === 'Medium' ? '#f59e0b' : '#22c55e' },
    { label: 'Regime', value: (profile.taxRegime || 'new').toUpperCase(), color: '#a855f7' },
  ];
  return (
    <div className="portfolio-snapshot">
      {items.map((item, i) => (
        <div key={i} className="snapshot-item">
          <div className="snapshot-label">{item.label}</div>
          <div className="snapshot-value" style={{ color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Contextual Follow-Up Pills ────────────────────────────────────
function generateContextualPills(lastQ) {
  if (!lastQ) return [];
  const q = lastQ.toLowerCase();
  if (q.includes('rebalance') || q.includes('allocation')) return ['Show ideal asset allocation', 'What if I go 80/20 equity?', 'Compare to balanced fund'];
  if (q.includes('tax')) return ['Which regime saves more?', 'Section 80C breakdown', 'Post-tax FD return'];
  if (q.includes('sip') || q.includes('invest') || q.includes('step')) return ['10-year SIP projection', 'Ideal yearly step-up %', 'What if I double my SIP?'];
  if (q.includes('retire') || q.includes('goal')) return ['Am I on track?', 'Retire 5 years early?', 'SIP for ₹1 crore'];
  if (q.includes('crash') || q.includes('market')) return ['40% crash impact?', 'Invest during crashes?', 'Portfolio risk score'];
  return ['Rebalance my portfolio', 'Tax savings this year'];
}

// ── FAB Button ────────────────────────────────────────────────────
const GenieFAB = ({ onClick, hasNudge }) => (
  <button className="genie-fab" onClick={onClick} title="Ask Genie">
    <img src={chatGenie} alt="Genie AI" className="genie-fab-logo" />
    <span className="genie-fab-ring"></span>
    {hasNudge && <span className="fab-nudge-dot" />}
  </button>
);

// ── Main Component ────────────────────────────────────────────────
const GenieChat = ({ profile, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState({ remaining: 30, total: 30 });
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    const stored = sessionStorage.getItem('genie_session_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('genie_session_id', newId);
    return newId;
  });
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── 2026 Agentic Workspace State ────────────────────────────────
  const [activeWorkspace, setActiveWorkspace] = useState(null); // null | 'rebalancer' | 'sip-planner' | 'tax-optimizer'

  // Rebalancer Workspace parameters
  const [targetEquity, setTargetEquity] = useState(60);
  const [rebalanceMonthlySIP, setRebalanceMonthlySIP] = useState(12000);

  // SIP Step-Up parameters
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState(12000);
  const [sipStepUpPercent, setSipStepUpPercent] = useState(10);
  const [sipHorizon, setSipHorizon] = useState(15);

  // Tax Optimizer parameters
  const [taxGrossIncome, setTaxGrossIncome] = useState(780000);
  const [tax80C, setTax80C] = useState(150000);
  const [taxNPS, setTaxNPS] = useState(50000);

  useEffect(() => {
    if (profile) {
      setTargetEquity(profile.recommendedEquityAllocation || (profile.risk_appetite === 'High' ? 80 : profile.risk_appetite === 'Low' ? 30 : 60));
      setRebalanceMonthlySIP(profile.monthly_savings || profile.savings || 12000);
      setSipMonthlyAmount(profile.monthly_savings || profile.savings || 12000);
      setSipHorizon(profile.investment_horizon || profile.investmentHorizon || 15);
      setTaxGrossIncome(profile.annualIncome || (profile.monthly_income || profile.income || 65000) * 12);
    }
  }, [profile]);

  const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const lastAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.getChatHistory(sessionId);
      if (data.conversations?.[0]?.messages) {
        setMessages(data.conversations[0].messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content, timestamp: m.timestamp || new Date().toISOString(), latency_ms: m.metadata?.latency_ms, _streamed: true })));
      }
    } catch {
      // Graceful error handle — fallback silently to empty chat history
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen, sessionId, messages.length, loadHistory]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  // Voice recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (e) => { const t = e.results[0][0].transcript; setInput(prev => prev + t); setIsListening(false); };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const handleAction = useCallback((action) => {
    console.log('[GenieChat] Action:', action);
    if (action.action === 'navigate' && action.target && onNavigate) {
      const TARGET_MAPPING = {
        '/rebalancer': 'rebalancer',
        '/stepup': 'sip-planner',
        '/tax': 'tax-optimizer',
        '/goals': 'goals',
        '/comparison': 'compare'
      };
      const page = TARGET_MAPPING[action.target];
      if (page) {
        if (['rebalancer', 'sip-planner', 'tax-optimizer'].includes(page)) {
          setActiveWorkspace(page);
        } else {
          onNavigate(page);
          setIsOpen(false); // Close chatbot panel on successful navigation
        }
      }
    }
  }, [onNavigate]);

  const sendMessage = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;
    setInput(''); setError(null);
    setMessages(prev => [...prev, { role: 'user', content: messageText, timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    try {
      const data = await api.sendChatMessage(messageText, sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date().toISOString(), latency_ms: data.latency_ms, _streamed: false }]);
      setRateLimit({ remaining: data.rate_limit_remaining, total: 30 });
    } catch (err) { setError(err.message || 'Genie is temporarily unavailable.'); }
    finally { setIsLoading(false); inputRef.current?.focus(); }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const clearChat = async () => {
    try {
      await api.clearChatSession(sessionId);
    } catch {
      // Best effort deletion, fallback to local reset
    }
    setMessages([]); setError(null); setRateLimit({ remaining: 30, total: 30 });
    const newId = crypto.randomUUID(); sessionStorage.setItem('genie_session_id', newId); setSessionId(newId);
  };

  const suggestedQuestions = getSuggestedQuestions(profile);
  const pills = generateContextualPills(lastUserMessage);

  return (
    <>
      {!isOpen && <GenieFAB onClick={() => setIsOpen(true)} hasNudge={!!profile} />}
      {isOpen && (
        <div className={`genie-panel ${activeWorkspace ? 'genie-panel--with-workspace' : ''}`}>
          <div className="genie-panel-chat-pane">
            {/* Header */}
            <div className="genie-panel-header">
              <div className="genie-header-left">
                <div className="genie-avatar-wrap"><span className="ba-letter">G</span></div>
                <div>
                  <div className="genie-header-title">Genie <span className="genie-agentic-badge">AGENTIC AI</span></div>
                  <div className="genie-header-sub"><span className="online-dot"></span> Financial Co-Pilot · Powered by Gemini</div>
                </div>
              </div>
              <div className="genie-header-actions">
                <span className={`rate-limit-badge ${rateLimit.remaining <= 5 ? 'rate-limit-warning' : ''}`}>{rateLimit.remaining <= 0 ? 'Limit reached' : `${rateLimit.remaining}/${rateLimit.total}`}</span>
                <button onClick={clearChat} title="Clear chat"><Trash2 size={16} /></button>
                <button onClick={() => setIsOpen(false)} title="Close"><X size={18} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="genie-messages">
              {messages.length === 0 && !isLoading && (
                <div className="genie-welcome">
                  <div className="genie-welcome-glow" />
                  <div className="genie-welcome-avatar"><div className="welcome-avatar-ring"><span className="ba-letter ba-large">G</span></div></div>
                  <p className="welcome-headline">Hi{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! I'm <strong>Genie</strong></p>
                  <p className="welcome-sub">Your agentic financial co-pilot. I generate <strong style={{ color: '#38bdf8' }}>interactive action plans</strong> with one-click execution.</p>
                  <PortfolioSnapshot profile={profile} />
                  <div className="welcome-capability-cards">
                    <div className="capability-card"><BarChart3 size={15} style={{color:'#38bdf8'}}/><span>Rebalancing</span></div>
                    <div className="capability-card"><Shield size={15} style={{color:'#22c55e'}}/><span>Tax Saving</span></div>
                    <div className="capability-card"><TrendingUp size={15} style={{color:'#a855f7'}}/><span>SIP Step-Up</span></div>
                    <div className="capability-card"><Target size={15} style={{color:'#f59e0b'}}/><span>Goal Tracking</span></div>
                  </div>
                  {suggestedQuestions.length > 0 && (
                    <div className="welcome-suggestions">
                      {suggestedQuestions.map((q, i) => <button key={i} className="suggestion-pill" onClick={() => sendMessage(q)}><Sparkles size={12} /> {q}</button>)}
                    </div>
                  )}
                </div>
              )}

              <ProactiveNudge profile={profile} onAsk={sendMessage} />

              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} onAction={handleAction} isLatest={i === messages.length - 1} />)}

              {isLoading && (
                <div className="chat-bubble chat-bubble--genie">
                  <div className="bubble-avatar"><span className="ba-letter">G</span></div>
                  <div className="typing-indicator">
                    <div className="typing-label">Genie is analyzing your finances</div>
                    <div className="typing-dots"><span></span><span></span><span></span></div>
                  </div>
                </div>
              )}
              {error && <div className="chat-error-banner">{error}</div>}
              <div ref={chatEndRef} />
            </div>

            {/* Follow-up pills */}
            {messages.length > 0 && !isLoading && lastAssistantMsg?.content?.length > 50 && (
              <div className="quick-replies">
                {pills.map((p, i) => <button key={i} className="quick-chip follow-up" onClick={() => sendMessage(p)}><Sparkles size={12} /> {p}</button>)}
              </div>
            )}

            {/* Input Bar */}
            <div className="genie-input-bar">
              {recognitionRef.current && (
                <button className={`voice-btn ${isListening ? 'voice-active' : ''}`} onClick={toggleVoice} title="Voice input">
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isListening ? 'Listening...' : 'Ask Genie for a financial action plan...'} className="genie-input" maxLength={1000} disabled={isLoading || rateLimit.remaining === 0} />
              <button className="genie-send-btn" onClick={() => sendMessage()} disabled={isLoading || !input.trim() || rateLimit.remaining === 0}>
                {isLoading ? <RefreshCw size={18} className="spin-icon" /> : <Send size={18} />}
              </button>
            </div>
            <div className="genie-disclaimer">Agentic AI Co-Pilot · Not SEBI-registered advice · Powered by Gemini + Groq</div>
          </div>

          {activeWorkspace && (
            <div className="genie-panel-workspace-pane">
              <div className="workspace-header">
                <div className="workspace-title-section">
                  <button className="workspace-back-btn" onClick={() => setActiveWorkspace(null)} title="Back to Chat">
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <div className="workspace-title">
                      {activeWorkspace === 'rebalancer' && <span>Rebalancer Sandbox</span>}
                      {activeWorkspace === 'sip-planner' && <span>Step-Up <JargonTooltip term="SIP">SIP</JargonTooltip> Sandbox</span>}
                      {activeWorkspace === 'tax-optimizer' && 'Tax Regime Comparison'}
                    </div>
                    <div className="workspace-subtitle">Interactive AI Agent Workspace</div>
                  </div>
                </div>
                <div className="workspace-header-actions">
                  <button className="workspace-fullscreen-btn" onClick={() => { onNavigate(activeWorkspace); setIsOpen(false); }} title="Open Fullscreen Tool">
                    <ExternalLink size={14} /> Open Fullscreen
                  </button>
                  <button className="workspace-close-btn" onClick={() => setActiveWorkspace(null)}>✕</button>
                </div>
              </div>

              <div className="workspace-content">
                {activeWorkspace === 'rebalancer' && (
                  <div className="workspace-sandbox">
                    <div className="sandbox-intro">
                      <Sparkles size={14} className="text-sky" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>Adjust target asset allocations to simulate a low-cost, natural rebalancing plan.</span>
                    </div>

                    <div className="sandbox-group">
                      <div className="sandbox-label-row">
                        <span className="sandbox-label"><Scale size={14} /> Target <JargonTooltip term="Asset Allocation">Equity Allocation</JargonTooltip></span>
                        <span className="sandbox-val text-sky">{targetEquity}%</span>
                      </div>
                      <input type="range" min="10" max="90" step="5" value={targetEquity} onChange={e => setTargetEquity(Number(e.target.value))} className="sandbox-slider" />
                      <div className="slider-limits"><span>10% Equity (Conservative)</span><span>90% Equity (Aggressive)</span></div>
                    </div>

                    <div className="sandbox-group">
                      <div className="sandbox-label-row">
                        <span className="sandbox-label"><Coins size={14} /> Monthly <JargonTooltip term="SIP">SIP</JargonTooltip> Amount</span>
                        <span className="sandbox-val text-sky">₹{rebalanceMonthlySIP.toLocaleString('en-IN')}</span>
                      </div>
                      <input type="range" min="1000" max="100000" step="1000" value={rebalanceMonthlySIP} onChange={e => setRebalanceMonthlySIP(Number(e.target.value))} className="sandbox-slider" />
                      <div className="slider-limits"><span>₹1K</span><span>₹100K</span></div>
                    </div>

                    {/* Target Allocation Visual Bar */}
                    <div className="allocation-visualizer">
                      <div className="vis-bars-header">Asset Targets</div>
                      <div className="vis-bar-row">
                        <span className="vis-bar-label">Equity ({targetEquity}%)</span>
                        <div className="vis-bar-track"><div className="vis-bar-fill fill-equity" style={{ width: `${targetEquity}%` }} /></div>
                      </div>
                      <div className="vis-bar-row">
                        <span className="vis-bar-label">Debt ({100 - targetEquity}%)</span>
                        <div className="vis-bar-track"><div className="vis-bar-fill fill-debt" style={{ width: `${100 - targetEquity}%` }} /></div>
                      </div>
                    </div>

                    {/* Directed Monthly Plan */}
                    <div className="directed-inflows-card">
                      <div className="inflow-title">Directed Monthly Allocation Plan:</div>
                      <div className="inflow-rows">
                        <div className="inflow-row">
                          <span className="inflow-label"><JargonTooltip term="Equity">Equity Allocation</JargonTooltip>:</span>
                          <span className="inflow-val text-sky">₹{Math.round(rebalanceMonthlySIP * targetEquity / 100).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="inflow-row">
                          <span className="inflow-label"><JargonTooltip term="Debt Fund">Debt Allocation</JargonTooltip>:</span>
                          <span className="inflow-val text-purple">₹{Math.round(rebalanceMonthlySIP * (100 - targetEquity) / 100).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="inflow-insight">
                        <Info size={14} className="insight-icon" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>Genie advises allocating ₹{Math.round(rebalanceMonthlySIP * (100 - targetEquity) / 100).toLocaleString('en-IN')} to debt investments. This naturally keeps your investment mix on track as your stocks grow, without triggers for extra taxes or fees.</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkspace === 'sip-planner' && (() => {
                  const stdVal = calculateStepUpSIP(sipMonthlyAmount, 0, sipHorizon);
                  const stepUpVal = calculateStepUpSIP(sipMonthlyAmount, sipStepUpPercent, sipHorizon);
                  const diff = stepUpVal.terminalValue - stdVal.terminalValue;
                  const pct = Math.max(10, Math.round((diff / stdVal.terminalValue) * 100));

                  return (
                    <div className="workspace-sandbox">
                      <div className="sandbox-intro">
                        <Sparkles size={14} className="text-purple" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>Simulate compounding growth with a yearly booster SIP to multiply your terminal wealth.</span>
                      </div>

                      <div className="sandbox-group">
                        <div className="sandbox-label-row">
                          <span className="sandbox-label"><Coins size={14} /> Base Monthly <JargonTooltip term="SIP">SIP</JargonTooltip></span>
                          <span className="sandbox-val text-purple">₹{sipMonthlyAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <input type="range" min="1000" max="100000" step="1000" value={sipMonthlyAmount} onChange={e => setSipMonthlyAmount(Number(e.target.value))} className="sandbox-slider" />
                        <div className="slider-limits"><span>₹1K</span><span>₹100K</span></div>
                      </div>

                      <div className="sandbox-group">
                        <div className="sandbox-label-row">
                          <span className="sandbox-label"><Percent size={14} /> Yearly <JargonTooltip term="SIP">SIP</JargonTooltip> Increase %</span>
                          <span className="sandbox-val text-purple">{sipStepUpPercent}%</span>
                        </div>
                        <input type="range" min="0" max="25" step="1" value={sipStepUpPercent} onChange={e => setSipStepUpPercent(Number(e.target.value))} className="sandbox-slider" />
                        <div className="slider-limits"><span>0% (Flat)</span><span>25% (Booster)</span></div>
                      </div>

                      <div className="sandbox-group">
                        <div className="sandbox-label-row">
                          <span className="sandbox-label"><Target size={14} /> Years to Invest</span>
                          <span className="sandbox-val text-purple">{sipHorizon} Years</span>
                        </div>
                        <input type="range" min="5" max="35" step="1" value={sipHorizon} onChange={e => setSipHorizon(Number(e.target.value))} className="sandbox-slider" />
                        <div className="slider-limits"><span>5 Yrs</span><span>35 Yrs</span></div>
                      </div>

                      {/* Visual Bar Comparison */}
                      <div className="comparison-viz">
                        <div className="comp-bars-header">Accumulated Wealth Projections (12% <JargonTooltip term="CAGR">yearly growth</JargonTooltip>)</div>
                        <div className="comp-bar-container">
                          <div className="comp-bar-label-col">Flat <JargonTooltip term="SIP">SIP</JargonTooltip></div>
                          <div className="comp-bar-val-col">
                            <div className="comp-bar-fill-track">
                              <div className="comp-bar-fill bg-grey" style={{ width: '50%' }} />
                            </div>
                            <span className="comp-val">₹{(stdVal.terminalValue / 100000).toFixed(1)}L</span>
                          </div>
                        </div>

                        <div className="comp-bar-container">
                          <div className="comp-bar-label-col">Step-Up</div>
                          <div className="comp-bar-val-col">
                            <div className="comp-bar-fill-track">
                              <div className="comp-bar-fill bg-gradient-purple" style={{ width: `${Math.min(100, 50 * (1 + pct / 100))}%` }} />
                            </div>
                            <span className="comp-val text-purple font-bold">₹{(stepUpVal.terminalValue / 100000).toFixed(1)}L</span>
                          </div>
                        </div>
                      </div>

                      {/* Wealth boost highlight card */}
                      <div className="wealth-boost-card">
                        <div className="boost-header">
                          <TrendingUp size={20} className="text-green" />
                          <div>
                            <div className="boost-title">Hyper-Compounding Bonus: +{pct}%</div>
                            <div className="boost-val">Extra ₹{(diff / 100000).toFixed(1)}L Saved</div>
                          </div>
                        </div>
                        <div className="boost-details">
                          Total Invested: ₹{(stepUpVal.totalInvested / 100000).toFixed(1)}L (vs ₹{(stdVal.totalInvested / 100000).toFixed(1)}L for Flat). The yearly {sipStepUpPercent}% increase adds over ₹{diff.toLocaleString('en-IN')} in extra growth by compounding your savings over time.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {activeWorkspace === 'tax-optimizer' && (() => {
                  const taxes = calculateTaxes(taxGrossIncome, tax80C, taxNPS);

                  return (
                    <div className="workspace-sandbox">
                      <div className="sandbox-intro">
                        <Sparkles size={14} className="text-orange" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>Optimize regime selection dynamically based on custom annual gross income and deductions.</span>
                      </div>

                      <div className="sandbox-group">
                        <div className="sandbox-label-row">
                          <span className="sandbox-label"><Coins size={14} /> Annual Gross Income</span>
                          <span className="sandbox-val text-orange">{formatFullINR(taxGrossIncome)}</span>
                        </div>
                        <input type="range" min="300000" max="3000000" step="50000" value={taxGrossIncome} onChange={e => setTaxGrossIncome(Number(e.target.value))} className="sandbox-slider" />
                        <div className="slider-limits"><span>₹3L</span><span>₹30L</span></div>
                      </div>

                      <div className="sandbox-group">
                        <div className="sandbox-label-row">
                          <span className="sandbox-label"><Shield size={14} /> <JargonTooltip term="Section 80C">Section 80C</JargonTooltip> Deductions (Old Regime)</span>
                          <span className="sandbox-val text-orange">{formatFullINR(tax80C)}</span>
                        </div>
                        <input type="range" min="0" max="150000" step="5000" value={tax80C} onChange={e => setTax80C(Number(e.target.value))} className="sandbox-slider" />
                        <div className="slider-limits"><span>₹0</span><span>₹1.5L Max</span></div>
                      </div>

                      <div className="sandbox-group">
                        <div className="sandbox-label-row">
                          <span className="sandbox-label"><Lock size={14} /> Section 80CCD(1B) (<JargonTooltip term="NPS">NPS</JargonTooltip>) Deductions</span>
                          <span className="sandbox-val text-orange">{formatFullINR(taxNPS)}</span>
                        </div>
                        <input type="range" min="0" max="50000" step="5000" value={taxNPS} onChange={e => setTaxNPS(Number(e.target.value))} className="sandbox-slider" />
                        <div className="slider-limits"><span>₹0</span><span>₹50K Max</span></div>
                      </div>

                      {/* Side-by-side Comparative Table */}
                      <div className="tax-comparison-table">
                        <div className="tax-table-header">
                          <div className="tax-th">Parameter</div>
                          <div className="tax-th text-center">New Regime</div>
                          <div className="tax-th text-center">Old Regime</div>
                        </div>
                        <div className="tax-table-row">
                          <div className="tax-td">Gross Income</div>
                          <div className="tax-td text-center">{formatFullINR(taxGrossIncome)}</div>
                          <div className="tax-td text-center">{formatFullINR(taxGrossIncome)}</div>
                        </div>
                        <div className="tax-table-row">
                          <div className="tax-td">Std Deduction</div>
                          <div className="tax-td text-center text-green">-{formatFullINR(75000)}</div>
                          <div className="tax-td text-center text-green">-{formatFullINR(50000)}</div>
                        </div>
                        <div className="tax-table-row">
                          <div className="tax-td">80C/NPS Deductions</div>
                          <div className="tax-td text-center text-grey">Nil</div>
                          <div className="tax-td text-center text-green">-{formatFullINR(Math.min(150000, tax80C) + Math.min(50000, taxNPS))}</div>
                        </div>
                        <div className="tax-table-row font-bold border-t border-b">
                          <div className="tax-td">Computed Tax</div>
                          <div className="tax-td text-center text-sky">{formatFullINR(taxes.taxNew)}</div>
                          <div className="tax-td text-center text-purple">{formatFullINR(taxes.taxOld)}</div>
                        </div>
                      </div>

                      {/* Verdict Banner */}
                      <div className={`tax-verdict-card ${taxes.betterRegime === 'new' ? 'verdict-new' : 'verdict-old'}`}>
                        <div className="verdict-title">
                          Regime Verdict: {taxes.betterRegime === 'new' ? 'NEW REGIME WINS' : 'OLD REGIME WINS'}
                        </div>
                        <div className="verdict-desc">
                          {taxes.difference === 0 ? (
                            <span>Both regimes result in the exact same tax output. New Regime is recommended for its absolute simplicity and zero capital lock-in.</span>
                          ) : (
                            <span>The <strong className="font-bold">{taxes.betterRegime.toUpperCase()} Regime</strong> is mathematically superior, saving you <strong className="font-bold">{formatFullINR(taxes.difference)}</strong> in taxes this year!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default GenieChat;

