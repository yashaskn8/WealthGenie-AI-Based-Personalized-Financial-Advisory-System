import React, { useState, useEffect } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const formatINR = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(6, 182, 212, 0.3)',
      borderRadius: 12, padding: '14px 18px', color: '#e2e8f0', fontSize: '0.85rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 200,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#06b6d4' }}>Year {d.year}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 16px' }}>
        <span style={{ color: '#94a3b8' }}>90th %ile:</span><span style={{ fontWeight: 600 }}>{formatINR(d.p90)}</span>
        <span style={{ color: '#94a3b8' }}>75th %ile:</span><span style={{ fontWeight: 600 }}>{formatINR(d.p75)}</span>
        <span style={{ color: '#06b6d4' }}>Median:</span><span style={{ fontWeight: 700, color: '#06b6d4' }}>{formatINR(d.p50)}</span>
        <span style={{ color: '#94a3b8' }}>25th %ile:</span><span style={{ fontWeight: 600 }}>{formatINR(d.p25)}</span>
        <span style={{ color: '#94a3b8' }}>10th %ile:</span><span style={{ fontWeight: 600 }}>{formatINR(d.p10)}</span>
      </div>
    </div>
  );
};

const ProjectionBand = ({ chartData, targetAmount, goalProbability, instrumentName, simulationsRun }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!chartData || chartData.length === 0) return null;

  return (
    <div style={{
      opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease',
      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.3))',
      backdropFilter: 'blur(16px)',
      borderRadius: 20, padding: 24,
      border: '1px solid rgba(56, 189, 248, 0.15)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.03), 0 8px 30px rgba(0,0,0,0.3)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Monte Carlo Projection {instrumentName ? `— ${instrumentName}` : ''}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0' }}>
            {(simulationsRun || 10000).toLocaleString()} simulations • Shaded bands show probability ranges
          </p>
        </div>
        {goalProbability !== null && goalProbability !== undefined && (
          <div style={{
            background: goalProbability >= 0.7 ? 'rgba(16, 185, 129, 0.15)' : goalProbability >= 0.4 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${goalProbability >= 0.7 ? 'rgba(16, 185, 129, 0.4)' : goalProbability >= 0.4 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            borderRadius: 12, padding: '8px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: goalProbability >= 0.7 ? '#10b981' : goalProbability >= 0.4 ? '#eab308' : '#f43f5e' }}>
              {Math.round(goalProbability * 100)}%
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>
              chance of reaching {targetAmount ? formatINR(targetAmount) : 'goal'}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#334155' }} tickLine={false}
              label={{ value: 'Years', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={formatINR} width={70}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Outer band: p10 → p90 */}
            <Area type="monotone" dataKey="p90" stroke="none" fill="#06b6d4" fillOpacity={0.08} />
            <Area type="monotone" dataKey="p10" stroke="none" fill="#0f172a" fillOpacity={1} />

            {/* Inner band: p25 → p75 */}
            <Area type="monotone" dataKey="p75" stroke="none" fill="#06b6d4" fillOpacity={0.15} />
            <Area type="monotone" dataKey="p25" stroke="none" fill="#0f172a" fillOpacity={1} />

            {/* Median line */}
            <Line type="monotone" dataKey="p50" stroke="#06b6d4" strokeWidth={2.5} dot={false} animationDuration={800} />

            {/* Target line */}
            {targetAmount && (
              <ReferenceLine y={targetAmount} stroke="#f43f5e" strokeDasharray="8 4" strokeWidth={1.5}
                label={{ value: `Target: ${formatINR(targetAmount)}`, fill: '#f43f5e', fontSize: 11, position: 'right' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: '0.7rem', color: '#64748b', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 16, height: 2, background: '#06b6d4', borderRadius: 1 }} /> Median (50th %ile)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 16, height: 8, background: 'rgba(6, 182, 212, 0.15)', borderRadius: 2 }} /> 25th–75th %ile
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 16, height: 8, background: 'rgba(6, 182, 212, 0.08)', borderRadius: 2 }} /> 10th–90th %ile
        </span>
        {targetAmount && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 0, borderTop: '2px dashed #f43f5e' }} /> Target Amount
          </span>
        )}
      </div>
    </div>
  );
};

export default ProjectionBand;
