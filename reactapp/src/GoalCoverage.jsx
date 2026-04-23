import React from 'react';

const GoalCoverage = ({ selectedGoals, recommendations }) => {
  return (
    <div className="goals-coverage">
      <h3 className="card-title">Goal Coverage Summary</h3>
      <p className="dashboard-subtitle" style={{marginBottom: '16px'}}>How your recommended portfolio covers your life targets</p>
      
      <div className="goals-list">
        {selectedGoals.map(goal => {
          // Find which recommended investments mention this goal
          const coveringInvestments = recommendations
            .filter(inv => inv.suitable_for_goals.includes(goal))
            .map(inv => inv.name);

          return (
            <div key={goal} className="goal-coverage-row">
              <span className="goal-check">✅</span>
              <span style={{fontWeight: '600', color: '#e2e8f0', minWidth: '140px'}}>{goal}</span>
              <span className="goal-covered-by">
                — covered by: {coveringInvestments.length > 0 ? coveringInvestments.join(', ') : 'Not directly covered by top picks'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GoalCoverage;
