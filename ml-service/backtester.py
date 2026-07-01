"""
WealthGenie Recommendation Backtester
Tests how recommended instruments would have performed for
a given profile over historical Nifty return periods.

=========================================================================
ðŸ“˜ BEGINNER NOTE: WHAT IS BACKTESTING & CAPM (ALPHA/BETA)?
=========================================================================
1. What is Backtesting?
   Before investing your hard-earned money, you want to know: "How would this
   portfolio have survived past financial storms?"
   Backtesting runs historical market data (like the 2008 Global Financial
   Crisis or the 2020 COVID crash) through our asset profiles to simulate
   what your returns and maximum losses (drawdowns) would have been.

2. Beta (Market Sensitivity):
   Beta measures how much an asset moves when the broad stock market moves:
   - Beta = 1.0 (e.g. Nifty 50 ETF): Moves in lockstep with the market. If the 
     market rises 10%, this rises 10%.
   - Beta = 0.0 (e.g. Fixed Deposit, PPF): Zero stock market sensitivity. Safe and steady.
   - Beta = -0.2 (e.g. Gold): Moves in the opposite direction. Highly useful for hedging 
     because when stock markets crash, gold prices often spike as investors seek safety.

3. Alpha (Value-Add):
   Alpha represents the excess return an investment earns above its benchmark index. 
   If the benchmark earns 10%, but an active ELSS fund earns 12%, the fund manager's 
   alpha is 2%.
"""
import numpy as np
from dataclasses import dataclass
from typing import List

# Historical Nifty 50 annual returns by decade
# Source: NSE data (approximated for illustration)
HISTORICAL_PERIODS = {
    '2004-2008': {'equity_return': 0.42, 'equity_vol': 0.28, 'note': 'Bull run'},
    '2008-2009': {'equity_return': -0.52, 'equity_vol': 0.45, 'note': 'GFC crash'},
    '2009-2014': {'equity_return': 0.18, 'equity_vol': 0.22, 'note': 'Recovery'},
    '2014-2019': {'equity_return': 0.12, 'equity_vol': 0.17, 'note': 'Stable growth'},
    '2019-2020': {'equity_return': -0.38, 'equity_vol': 0.40, 'note': 'COVID crash'},
    '2020-2024': {'equity_return': 0.28, 'equity_vol': 0.20, 'note': 'Post-COVID rally'},
}

INSTRUMENT_MARKET_SENSITIVITY = {
    'ELSS':       {'beta': 1.1,  'alpha': 0.02},
    'Equity_MF':  {'beta': 1.0,  'alpha': 0.01},
    'ETF':        {'beta': 0.99, 'alpha': 0.00},
    'NPS':        {'beta': 0.6,  'alpha': 0.03},
    'Debt_MF':    {'beta': 0.1,  'alpha': 0.02},
    'FD':         {'beta': 0.0,  'alpha': 0.00},
    'RBI_Bond':   {'beta': 0.0,  'alpha': 0.00},
    'PPF':        {'beta': 0.0,  'alpha': 0.00},
    'SGB':        {'beta': 0.3,  'alpha': 0.04},
    'Gold':       {'beta': -0.2, 'alpha': 0.05},
}

@dataclass
class BacktestResult:
    instrument: str
    period: str
    simulated_return: float
    worst_year_return: float
    best_year_return: float
    sharpe_ratio: float
    max_drawdown: float
    note: str

def compute_instrument_return(
    market_return: float,
    market_vol: float,
    instrument_type: str
) -> float:
    """
    Estimate instrument return given a market scenario.
    Uses CAPM-inspired model: R_i = alpha + beta Ã— R_m
    """
    sensitivity = INSTRUMENT_MARKET_SENSITIVITY.get(
        instrument_type,
        {'beta': 0.5, 'alpha': 0.01}
    )
    beta = sensitivity['beta']
    alpha = sensitivity['alpha']
    return alpha + beta * market_return

def run_backtest(
    instrument_type: str,
    monthly_sip: float,
    years: int = 5
) -> List[BacktestResult]:
    """
    Simulate how the instrument would have performed across
    historical market periods.
    """
    results = []

    for period_name, period_data in HISTORICAL_PERIODS.items():
        market_return = period_data['equity_return']
        market_vol = period_data['equity_vol']

        inst_return = compute_instrument_return(
            market_return, market_vol, instrument_type
        )

        # Simplified Sharpe ratio: (return - risk_free) / vol
        risk_free = 0.065  # approximate RBI repo rate
        inst_vol = market_vol * abs(
            INSTRUMENT_MARKET_SENSITIVITY.get(
                instrument_type, {'beta': 0.5}
            )['beta']
        ) + 0.01

        sharpe = (inst_return - risk_free) / inst_vol \
            if inst_vol > 0 else 0

        # Estimate max drawdown from volatility
        max_drawdown = -abs(inst_return - 2 * inst_vol) \
            if inst_return < 0 else -inst_vol * 0.5

        results.append(BacktestResult(
            instrument=instrument_type,
            period=period_name,
            simulated_return=round(inst_return, 4),
            worst_year_return=round(inst_return - 2 * inst_vol, 4),
            best_year_return=round(inst_return + 2 * inst_vol, 4),
            sharpe_ratio=round(sharpe, 3),
            max_drawdown=round(max_drawdown, 4),
            note=period_data['note'],
        ))

    return results
