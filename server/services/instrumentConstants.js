/**
 * WealthGenie Instrument Constants — Single Source of Truth
 *
 * ALL nominal rates, volatility parameters, and metadata for every instrument
 * must be defined HERE and imported everywhere else. This eliminates the #1
 * production risk: rate drift between projection, recommendation, and MC modules.
 *
 * DO NOT duplicate these values in any other file.
 */

export const CESS_RATE = 0.04; // 4% Health & Education Cess — FY2025-26

export const INSTRUMENT_PARAMS = {
  FD:           { nominalRate: 7.25,  volatility: 0.005,  riskLevel: 'Low',        lockIn: 0,  name: 'Bank Fixed Deposit',       tags: ['Guaranteed', 'DICGC Insured'] },
  ELSS:         { nominalRate: 13.5,  volatility: 0.18,   riskLevel: 'High',       lockIn: 3,  name: 'ELSS Mutual Fund',         tags: ['Tax Saving', '80C'] },
  Equity_MF:    { nominalRate: 12.5,  volatility: 0.18,   riskLevel: 'High',       lockIn: 0,  name: 'Equity Mutual Fund',       tags: ['Wealth Growth'] },
  ETF:          { nominalRate: 12.5,  volatility: 0.16,   riskLevel: 'Medium',     lockIn: 0,  name: 'Nifty 50 ETF',             tags: ['Passive', 'Low Cost'] },
  Debt_MF:      { nominalRate: 7.5,   volatility: 0.03,   riskLevel: 'Low-Medium', lockIn: 0,  name: 'Debt Mutual Fund',         tags: ['Liquid'] },
  RBI_Bond:     { nominalRate: 8.05,  volatility: 0.002,  riskLevel: 'Very Low',   lockIn: 7,  name: 'RBI Savings Bond',         tags: ['Sovereign'] },
  'G-Sec':      { nominalRate: 7.2,   volatility: 0.01,   riskLevel: 'Very Low',   lockIn: 0,  name: 'Government Security',      tags: ['Sovereign', 'Gilt'] },
  PPF:          { nominalRate: 7.1,   volatility: 0.003,  riskLevel: 'Very Low',   lockIn: 15, name: 'Public Provident Fund',    tags: ['EEE', 'Tax Free', '80C'] },
  NPS:          { nominalRate: 10.0,  volatility: 0.12,   riskLevel: 'Medium',     lockIn: 60, name: 'National Pension System',  tags: ['Retirement', '80CCD'] },
  Gold:         { nominalRate: 9.0,   volatility: 0.15,   riskLevel: 'Medium',     lockIn: 0,  name: 'Gold ETF',                 tags: ['Hedge', 'Inflation'] },
  SGB:          { nominalRate: 10.5,  volatility: 0.14,   riskLevel: 'Low-Medium', lockIn: 8,  name: 'Sovereign Gold Bond',      tags: ['Gold', 'Tax Exempt'] },
  Liquid_MF:    { nominalRate: 7.0,   volatility: 0.005,  riskLevel: 'Low',        lockIn: 0,  name: 'Liquid Mutual Fund',       tags: ['Emergency Fund', 'T+1'] },
  Arbitrage_MF: { nominalRate: 7.5,   volatility: 0.02,   riskLevel: 'Low',        lockIn: 0,  name: 'Arbitrage Mutual Fund',    tags: ['Low Volatility', 'Equity Taxed'] },
};

/**
 * Get nominal rate for an instrument key (as percentage, e.g. 12.5).
 * Returns 7.0 as safe default for unknown instruments.
 */
export function getNominalRate(key) {
  return INSTRUMENT_PARAMS[key]?.nominalRate ?? 7.0;
}

/**
 * Get volatility for an instrument key (as decimal, e.g. 0.18).
 * Returns 0.10 as safe default for unknown instruments.
 */
export function getVolatility(key) {
  return INSTRUMENT_PARAMS[key]?.volatility ?? 0.10;
}

/**
 * Build a RATE_LOOKUP map {key: rate} for projection engine compatibility.
 */
export function buildRateLookup() {
  const lookup = {};
  for (const [key, params] of Object.entries(INSTRUMENT_PARAMS)) {
    lookup[key] = params.nominalRate;
  }
  return lookup;
}

/** Risk-free rate benchmark (FD post-tax approximation) */
export const RISK_FREE_RATE = 0.065;

/** SEBI disclaimer */
export const DISCLAIMER = 'WealthGenie provides AI-generated investment analysis for educational and informational purposes only. It does not constitute registered investment advice under SEBI (Investment Advisers) Regulations, 2013. Past returns are not indicative of future performance. Please consult a SEBI-registered investment adviser before making investment decisions. Mutual fund investments are subject to market risks.';
