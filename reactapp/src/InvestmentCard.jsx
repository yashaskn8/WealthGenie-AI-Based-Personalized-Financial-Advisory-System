import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, Award } from 'lucide-react';
import { formatINR } from './recommendationEngine';

const RiskPill = ({ level }) => {
  const getRiskClass = (lvl) => {
    switch(lvl) {
      case "Very Low": return "risk-very-low";
      case "Low": return "risk-low";
      case "Medium": return "risk-medium";
      case "High": return "risk-high";
      case "Very High": return "risk-very-high";
      default: return "risk-medium";
    }
  };

  return (
    <div className={`risk-pill ${getRiskClass(level)}`}>
      <div className="risk-dot"></div>
      {level} Risk
    </div>
  );
};

const InvestmentCard = ({ investment, horizon, onLearnMore }) => {
  const [showSubtypes, setShowSubtypes] = useState(false);
  const { name, category, expected_return_min, expected_return_max, risk_level, types, monthly_allocation, projected_value, tax_benefit } = investment;

  const getCategoryClass = (cat) => cat.toLowerCase();

  return (
    <div className="investment-card">
      <div className="card-header">
        <h3 className="card-title" style={{ color: '#fff' }}>{name}</h3>
        <span className={`badge ${getCategoryClass(category)}`}>{category}</span>
      </div>

      <div className="card-metrics">
        <div className="metric-block">
          <span className="metric-label">Expected Return</span>
          <span className="metric-val">{expected_return_min}% – {expected_return_max}%</span>
        </div>
        <div className="metric-block">
          <span className="metric-label">Risk Profile</span>
          <RiskPill level={risk_level} />
        </div>
      </div>

      {tax_benefit && (
        <div className="tax-badge" style={{marginBottom: '16px'}}>
          <ShieldAlert size={14} style={{marginRight:'4px'}} /> Tax Benefit Applicable
        </div>
      )}

      <div className="card-allocation">
        <div>
          <div className="alloc-subtitle">Monthly Allocation</div>
          <div className="alloc-amt">{formatINR(monthly_allocation)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="alloc-subtitle">Valuation in {horizon} yrs</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#a855f7' }}>
            {formatINR(projected_value)}
          </div>
        </div>
      </div>

      {types && types.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <button className="subtypes-toggle" onClick={() => setShowSubtypes(!showSubtypes)}>
            View Supported Sub-types {showSubtypes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showSubtypes && (
            <div className="subtypes-list">
              {types.map(t => (
                <span key={t} className="subtype-pill">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="btn-learn-more" onClick={() => onLearnMore && onLearnMore(investment)}>
        Learn More Details
      </button>
    </div>
  );
};

export default InvestmentCard;
