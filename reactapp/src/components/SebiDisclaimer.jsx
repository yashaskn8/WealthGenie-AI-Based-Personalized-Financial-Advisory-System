import React from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * SEBI Regulatory Disclaimer
 * Required on all recommendation and advisory screens.
 */
const SEBI_TEXT = `For educational purposes only. Not SEBI-registered investment advice. 
Consult a qualified financial adviser before investing. 
Mutual fund investments are subject to market risk. 
Past returns are not indicative of future performance.`;

const SebiDisclaimer = () => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '10px 14px', borderRadius: 8,
    background: 'rgba(107, 114, 128, 0.06)',
    border: '1px solid rgba(107, 114, 128, 0.12)',
    marginTop: 16,
  }}>
    <ShieldAlert size={14} style={{ color: '#6b7280', marginTop: 2, flexShrink: 0 }} />
    <p style={{
      fontSize: 11, lineHeight: 1.5,
      color: '#6b7280', margin: 0,
      fontStyle: 'italic',
    }}>
      {SEBI_TEXT}
    </p>
  </div>
);

export default SebiDisclaimer;
