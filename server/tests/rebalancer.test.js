import { computeRebalance } from '../services/portfolioEngine.js';

describe('Portfolio Rebalancer Engine', () => {

  // Case 1: Simple 50-50 allocation drift
  test('correct drift computation and weight normalization', () => {
    // Portfolio value: ₹1,00,000. Underweight Equity, Overweight Debt.
    const current = {
      'Equity_MF': 40000,
      'Debt_MF': 60000
    };
    const target = {
      'Equity_MF': 50,
      'Debt_MF': 50
    };

    const res = computeRebalance(current, target, 2.0, 1.0);

    expect(res.total_portfolio_value).toBe(100000);
    expect(res.drift_index).toBe(10); // abs(40-50) + abs(60-50) / 2 = 10%
    expect(res.drift_severity).toBe('Moderate');
    expect(res.rebalance_recommended).toBe(true);

    const equity = res.assets.find(a => a.asset_class === 'Equity_MF');
    const debt = res.assets.find(a => a.asset_class === 'Debt_MF');

    expect(equity.current_pct).toBe(40);
    expect(equity.target_pct).toBe(50);
    expect(equity.drift_pct).toBe(-10); // underweight
    expect(equity.raw_correction).toBe(10000); // Buy ₹10,000
    expect(equity.action_type).toBe('buy');

    expect(debt.current_pct).toBe(60);
    expect(debt.target_pct).toBe(50);
    expect(debt.drift_pct).toBe(10); // overweight
    expect(debt.raw_correction).toBe(-10000); // Sell ₹10,000
    expect(debt.action_type).toBe('sell');
  });

  // Case 2: Partial rebalancing (ratio 0.5)
  test('partial rebalancing suggested corrections', () => {
    const current = {
      'Equity_MF': 30000,
      'Debt_MF': 70000
    };
    const target = {
      'Equity_MF': 50,
      'Debt_MF': 50
    };

    // rebalance only 50% of the drift
    const res = computeRebalance(current, target, 2.0, 0.5);

    const equity = res.assets.find(a => a.asset_class === 'Equity_MF');
    const debt = res.assets.find(a => a.asset_class === 'Debt_MF');

    expect(equity.raw_correction).toBe(20000);
    expect(equity.suggested_correction).toBe(10000); // 50% of 20000

    expect(debt.raw_correction).toBe(-20000);
    expect(debt.suggested_correction).toBe(-10000); // 50% of -20000
  });

  // Case 3: Empty inputs and fallback
  test('graceful fallback with empty or zero values', () => {
    const res = computeRebalance({}, {}, 2.0, 1.0);
    expect(res.total_portfolio_value).toBe(0);
    expect(res.drift_index).toBe(0);
    expect(res.rebalance_recommended).toBe(false);
    expect(res.assets.length).toBe(0);
  });

  // Case 4: Weighted CAGR and Risk score calculation
  test('CAGR and risk score computation accuracy', () => {
    const current = {
      'Equity_MF': 50000, // Nominal rate: 12.5%, Risk score weight: 80 (High)
      'FD': 50000         // Nominal rate: 6.5%, Risk score weight: 20 (Low)
    };
    const target = {
      'Equity_MF': 80, // Target high risk
      'FD': 20
    };

    const res = computeRebalance(current, target, 2.0, 1.0);

    // Before: 50% Equity, 50% FD
    // CAGR: 0.5 * 12.5 + 0.5 * 6.5 = 9.5
    // Risk score: 0.5 * 80 + 0.5 * 20 = 50
    expect(res.before_stats.cagr).toBe(9.5);
    expect(res.before_stats.risk_score).toBe(50);

    // After: 80% Equity, 20% FD
    // CAGR: 0.8 * 12.5 + 0.2 * 6.5 = 10 + 1.3 = 11.3
    // Risk score: 0.8 * 80 + 0.2 * 20 = 64 + 4 = 68
    expect(res.after_stats.cagr).toBe(11.3);
    expect(res.after_stats.risk_score).toBe(68);
  });
});
