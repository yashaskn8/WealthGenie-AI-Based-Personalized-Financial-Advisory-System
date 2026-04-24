import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { getConfidenceLabel } from '../utils/confidenceLabels';

const FEATURE_COLORS = {
  positive: '#10b981',
  negative: '#f43f5e',
};

// ── FIX 2: Format raw feature values for human display ─────────────
function formatRawValue(feature, value) {
  if (feature === 'annual_income' || feature === 'monthly_savings') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(value);
  }
  if (feature === 'age') return `${value} years`;
  if (feature === 'risk_score') {
    const labels = ['Conservative', 'Moderate-Conservative', 'Moderate', 'Moderate-Aggressive', 'Aggressive'];
    return labels[Math.round(value)] || value;
  }
  return value;
}

const ExplainabilityPanel = ({ explanation, instrumentName }) => {
  if (!explanation || !explanation.feature_contributions) return null;

  // ── FIX 1: Consistency guard ───────────────────────────────────
  const explanationInstrument = explanation?.predicted_class?.replace('_', ' ');
  const titleInstrument = instrumentName || 'this instrument';

  const isConsistent = explanationInstrument &&
    (titleInstrument.toLowerCase().includes(explanationInstrument.toLowerCase()) ||
     explanationInstrument.toLowerCase().includes(titleInstrument.toLowerCase()) ||
     (explanationInstrument === 'Equity MF' && titleInstrument.includes('Equity')) ||
     (explanationInstrument === 'Debt MF' && titleInstrument.includes('Debt')) ||
     (explanationInstrument === 'ETF' && titleInstrument.includes('ETF')));

  if (!isConsistent && process.env.NODE_ENV === 'development') {
    console.warn(
      `[ExplainabilityPanel] Instrument mismatch detected.\n` +
      ` Title instrument: "${titleInstrument}"\n` +
      ` Explanation instrument: "${explanationInstrument}"\n` +
      ` Verify that the explanation prop matches the displayed recommendation.`
    );
  }

  const displaySubtitle = isConsistent
    ? explanation.top_reason
    : `This recommendation is based on your financial profile. The model analysed your age, income, savings, and risk appetite to generate this suggestion.`;

  const contributions = explanation.feature_contributions.map(c => ({
    name: c.display_name,
    display_name: c.display_name,
    feature: c.feature || c.display_name?.toLowerCase().replace(' ', '_'),
    value: c.shap_value,
    magnitude: c.magnitude,
    direction: c.direction,
    raw_value: c.raw_value,
  }));

  // ── FIX 2: Custom tooltip with percentage influence ────────────
  const totalMagnitude = contributions.reduce((sum, c) => sum + c.magnitude, 0);

  const ShapTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const influencePercent = totalMagnitude > 0
      ? ((item.magnitude / totalMagnitude) * 100).toFixed(0) : 0;

    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: 12, padding: '12px 16px', color: '#e2e8f0', fontSize: '0.85rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 260,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.display_name}</div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: item.direction === 'increased' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
            {item.direction === 'increased' ? '↑' : '↓'}
          </span>{' '}
          {influencePercent}% influence on this recommendation
        </div>
        {item.raw_value != null && (
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Your value: {formatRawValue(item.feature, item.raw_value)}
          </div>
        )}
      </div>
    );
  };

  // ── FIX 2: Confidence badge ────────────────────────────────────
  const conf = getConfidenceLabel(explanation.confidence || 0);

  return (
    <div style={{
      marginTop: 24, padding: 24,
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.08))',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      borderRadius: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative glow */}
      <div style={{
        position: 'absolute', top: -30, left: -30, width: 120, height: 120,
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(25px)', pointerEvents: 'none',
      }} />

      <h3 style={{
        fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4,
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          display: 'inline-flex', width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
        }}>🧠</span>
        Why WealthGenie recommended {titleInstrument}
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 16, position: 'relative' }}>
        {displaySubtitle}
      </p>

      {/* FIX 2: Qualitative scale legend */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 12, fontSize: '0.75rem', color: '#94a3b8',
        position: 'relative',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: FEATURE_COLORS.positive }} />
          Increases recommendation likelihood
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: FEATURE_COLORS.negative }} />
          Reduces recommendation likelihood
        </span>
      </div>

      <div style={{ width: '100%', height: 180, minWidth: 0 }}>
        <ResponsiveContainer>
          <BarChart data={contributions} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            {/* FIX 2: Hide numeric X-axis */}
            <XAxis type="number" hide={true} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 500 }} width={90} axisLine={false} tickLine={false} />
            <Tooltip content={<ShapTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={800} animationBegin={200}>
              {contributions.map((entry, index) => (
                <Cell key={index} fill={entry.value >= 0 ? FEATURE_COLORS.positive : FEATURE_COLORS.negative} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FIX 2: Qualitative confidence badge */}
      <div style={{
        marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem',
        position: 'relative',
      }}>
        <span style={{
          color: conf.colour, fontWeight: 600,
          background: `${conf.colour}15`, padding: '4px 12px', borderRadius: 20,
          border: `1px solid ${conf.colour}30`,
        }}>
          {conf.label}
        </span>
        {conf.note && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: 320 }}>
            {conf.note}
          </span>
        )}
      </div>
    </div>
  );
};

export default ExplainabilityPanel;
