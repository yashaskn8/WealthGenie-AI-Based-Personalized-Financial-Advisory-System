import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Normalizes values for tooltip display
 */
const formatYAxis = (tickItem) => {
  if (tickItem >= 10000000) return `₹${(tickItem / 10000000).toFixed(1)}Cr`;
  if (tickItem >= 100000) return `₹${(tickItem / 100000).toFixed(1)}L`;
  return `₹${tickItem.toLocaleString('en-IN')}`;
};

const PortfolioChart = ({ recommendations, horizon }) => {

  const data = useMemo(() => {
    let resultData = [];
    // We calculate projected value for each year from 1 to horizon
    for (let year = 1; year <= horizon; year++) {
      let totalValueForYear = 0;
      
      recommendations.forEach(inv => {
        // Compound interest calculation
        const rate = (inv.expected_return_max / 100);
        const monthlyRate = rate / 12;
        const totalMonths = year * 12;
        const monthlyDeposit = inv.monthly_allocation;

        if (monthlyDeposit > 0) {
          if (monthlyRate === 0) {
             totalValueForYear += monthlyDeposit * totalMonths;
          } else {
             const fv = monthlyDeposit * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
             totalValueForYear += fv;
          }
        }
      });

      resultData.push({
        year: `Year ${year}`,
        value: totalValueForYear
      });
    }
    return resultData;
  }, [recommendations, horizon]);


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#0B131E', padding: '12px 16px', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)' }}>
          <p style={{ color: '#94a3b8', marginBottom: '8px', fontSize: '0.85rem' }}>{label}</p>
          <p style={{ color: '#0ea5e9', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {formatYAxis(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="projection-chart-wrapper">
      <div style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ fontSize: '1.4rem' }}>Trajectory of your Portfolio</h3>
        <p className="dashboard-subtitle">Combined hypothetical growth based on upper-bound historical returns over {horizon} years.</p>
      </div>

      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="year" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} dy={10} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis tickFormatter={formatYAxis} stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} dx={-10} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(6,182,212,0.2)', strokeWidth: 2 }} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#06b6d4" 
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 8, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioChart;
