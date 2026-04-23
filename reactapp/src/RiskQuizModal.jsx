import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    text: "If your investment dropped 20% in one month, you would:",
    options: [
      { text: "Sell everything immediately", score: 1 },
      { text: "Sell some to reduce exposure", score: 2 },
      { text: "Hold and wait for recovery", score: 3 },
      { text: "Buy more at the lower price", score: 4 }
    ]
  },
  {
    id: 2,
    text: "What is your primary investment goal?",
    options: [
      { text: "Preserve capital at all costs", score: 1 },
      { text: "Generate steady income", score: 2 },
      { text: "Balanced growth and income", score: 3 },
      { text: "Maximize long-term growth", score: 4 }
    ]
  },
  {
    id: 3,
    text: "Your investment horizon is:",
    options: [
      { text: "Less than 2 years", score: 1 },
      { text: "2–5 years", score: 2 },
      { text: "5–10 years", score: 3 },
      { text: "More than 10 years", score: 4 }
    ]
  },
  {
    id: 4,
    text: "What percentage of your monthly income can you afford to lose?",
    options: [
      { text: "None", score: 1 },
      { text: "Up to 5%", score: 2 },
      { text: "5–15%", score: 3 },
      { text: "More than 15%", score: 4 }
    ]
  },
  {
    id: 5,
    text: "How familiar are you with financial markets?",
    options: [
      { text: "No knowledge", score: 1 },
      { text: "Basic understanding", score: 2 },
      { text: "Moderate experience", score: 3 },
      { text: "Advanced investor", score: 4 }
    ]
  },
  {
    id: 6,
    text: "Your emergency fund covers:",
    options: [
      { text: "Less than 1 month of expenses", score: 1 },
      { text: "1–3 months", score: 2 },
      { text: "3–6 months", score: 3 },
      { text: "More than 6 months", score: 4 }
    ]
  },
  {
    id: 7,
    text: "When markets are volatile, you typically:",
    options: [
      { text: "Check portfolio multiple times daily", score: 1 },
      { text: "Avoid checking", score: 2 },
      { text: "Review monthly as planned", score: 3 },
      { text: "See it as a buying opportunity", score: 4 }
    ]
  },
  {
    id: 8,
    text: "Your income stability is:",
    options: [
      { text: "Highly variable/uncertain", score: 1 },
      { text: "Somewhat variable", score: 2 },
      { text: "Stable with some variability", score: 3 },
      { text: "Very stable and predictable", score: 4 }
    ]
  },
  {
    id: 9,
    text: "What return would satisfy you over 5 years?",
    options: [
      { text: "5–6% guaranteed", score: 1 },
      { text: "7–9% with low risk", score: 2 },
      { text: "10–13% with moderate risk", score: 3 },
      { text: "15%+ even with high risk", score: 4 }
    ]
  },
  {
    id: 10,
    text: "You have dependents (children, elderly parents) relying on your income?",
    options: [
      { text: "Yes, fully dependent on me", score: 1 },
      { text: "Partially dependent", score: 2 },
      { text: "Mostly independent", score: 3 },
      { text: "No dependents", score: 4 }
    ]
  }
];

const RiskQuizModal = ({ isOpen, onClose, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (score) => {
    const newAnswers = [...answers, score];
    setAnswers(newAnswers);

    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      calculateResult(newAnswers);
    }
  };

  const calculateResult = (finalAnswers) => {
    const totalScore = finalAnswers.reduce((a, b) => a + b, 0);
    
    let riskLabel = "Low";
    if (totalScore >= 19 && totalScore <= 27) riskLabel = "Medium";
    if (totalScore >= 28 && totalScore <= 34) riskLabel = "High"; // Moderately Aggressive mapped to High for DB match
    if (totalScore >= 35) riskLabel = "High";                     // Aggressive

    setIsFinished(true);
    setTimeout(() => {
      onComplete(riskLabel, totalScore);
    }, 3000);
  };

  const question = QUIZ_QUESTIONS[currentIdx];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 600, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        {!isFinished ? (
          <>
            <div style={{ marginBottom: 24, fontSize: '0.9rem', color: '#94a3b8' }}>
              Psychometric Profiling: Question {currentIdx + 1} of {QUIZ_QUESTIONS.length}
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                style={{ flex: 1 }}
              >
                <h2 style={{ fontSize: '1.5rem', marginBottom: 32, lineHeight: 1.4 }}>{question.text}</h2>
                <div style={{ display: 'grid', gap: 16 }}>
                  {question.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(opt.score)}
                      style={{
                        padding: '16px 20px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#fff',
                        textAlign: 'left',
                        fontSize: '1.05rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                        e.currentTarget.style.borderColor = '#8b5cf6';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      }}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}
          >
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'conic-gradient(#8b5cf6, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, animation: 'spin 2s linear infinite' }}>
               <div style={{ width: 110, height: 110, background: '#0B131E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  Analyzing...
               </div>
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <h2>Calibrating Cognitive Risk Profile</h2>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default RiskQuizModal;
