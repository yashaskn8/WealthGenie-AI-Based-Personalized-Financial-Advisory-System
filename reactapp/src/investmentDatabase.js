/**
 * WealthGenie — 16-Instrument Investment Display Catalogue
 * ─────────────────────────────────────────────────────────
 * ARCHITECTURE NOTE — SOURCE OF TRUTH:
 *   The authoritative instrument data lives in MongoDB (seeded via
 *   GET /api/instruments). This static catalogue serves as:
 *     1. Display-layer defaults for instant UI rendering before API data loads
 *     2. UI constants (colors, risk labels, concentration caps, tax info labels)
 *     3. Eligibility rules for the client-side offline fallback engine
 *
 *   When the backend API responds, its data OVERRIDES these values.
 *   See App.jsx DashboardShell.useEffect() for the merge logic.
 *
 *   If instrument rates change, update BOTH:
 *     - MongoDB instruments collection (via admin panel or seed script)
 *     - This file (to keep the offline fallback accurate)
 *
 * (15 original + SGB split from Gold ETF)
 */

// ─── TAX INFO LOOKUP ──────────────────────────────────────────────
export const TAX_INFO = {
  eee: {
    label: "EEE — Exempt-Exempt-Exempt",
    desc: "Investment, growth, and withdrawal are all 100% tax-free. Best possible tax treatment."
  },
  slab: {
    label: "Taxed at Income Slab Rate",
    desc: "Interest/gains added to taxable income and taxed at your marginal income tax rate.",
    debtNote: "Post Finance Act 2023: debt MF gains are taxed at slab rates regardless of holding period. Indexation and 20% LTCG benefits no longer apply."
  },
  ltcg: {
    label: "LTCG — 12.5% on gains above ₹1.25L",
    desc: "Long-term capital gains above ₹1.25 lakh taxed at 12.5%. Gains below threshold are tax-free."
  },
  elss: {
    label: "ELSS — 80C + LTCG",
    desc: "Investment qualifies for ₹1.5L deduction under 80C. Gains taxed as LTCG at 12.5% above ₹1.25L."
  },
  nps: {
    label: "NPS — 80CCD(1B) Extra Deduction",
    desc: "Additional ₹50,000 deduction under 80CCD(1B) beyond the ₹1.5L 80C limit. 60% lump sum at retirement is tax-free."
  },
  sgb: {
    label: "2.5% Interest Taxable · Gains Tax-Free",
    desc: "2.5% annual interest is taxed at your slab rate. All capital gains at 8-year maturity are fully tax-free under Section 47(viic). Most tax-efficient gold option."
  }
};

// ─── RISK COLORS ──────────────────────────────────────────────────
export const RISK_COLORS = {
  "Very Low": "#14b8a6",
  "Low": "#10b981",
  "Low-Medium": "#22d3ee",
  "Medium-Low": "#22d3ee",
  "Medium": "#f59e0b",
  "High": "#ef4444",
  "Very High": "#fca5a5"
};

// ─── CHART COLORS (16 distinct) ──────────────────────────────────
export const CHART_COLORS = [
  "#f59e0b", "#10b981", "#a855f7", "#3b82f6", "#14b8a6",
  "#06b6d4", "#ef4444", "#f97316", "#8b5cf6", "#6366f1",
  "#eab308", "#ec4899", "#22d3ee", "#dc2626", "#16a34a",
  "#ca8a04"
];

// ─── CONCENTRATION CAPS ──────────────────────────────────────────
export const CONCENTRATION_CAPS = {
  smallcap_mf: { maxPct: 15, badge: "Cap at 15% of portfolio" },
  midcap_mf: { maxPct: 20, badge: "Cap at 20% of portfolio" },
  direct_equity: { maxPct: 20, badge: "Cap at 20% of portfolio" },
  sgb: { maxPct: 10, badge: "Cap at 10% of portfolio" },
  gold_etf: { maxPct: 10, badge: "Cap at 10% of portfolio" },
  nps: { maxPct: 25, badge: "Illiquid until age 60 — plan accordingly" },
};

// ─── 16-INSTRUMENT CATALOGUE ─────────────────────────────────────

export const investmentDatabase = [
  // ═══════════════════  LOW RISK (risk: 1 or 2) — 6 instruments  ═══════════════════
  {
    id: "ppf",
    name: "Public Provident Fund (PPF)",
    abbr: "PPF",
    cat: "Government",
    rate: 7.1,
    risk: 1,
    riskLabel: "Very Low",
    lockIn: 15,
    taxType: "eee",
    color: "#14b8a6",
    minMonthlyInvestment: 500,
    maxAnnualInvestment: 150000,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 0,
      minMonthlySavings: 500,
      notes: "Indian resident only. NRIs not eligible for new accounts."
    },
    desc: "Government-backed EEE tax-free scheme. Zero default risk with sovereign guarantee. Best tax efficiency for all income levels."
  },
  {
    id: "scss",
    name: "Senior Citizens Savings Scheme (SCSS)",
    abbr: "SCSS",
    cat: "Government",
    rate: 8.2,
    risk: 1,
    riskLabel: "Very Low",
    lockIn: 5,
    taxType: "slab",
    color: "#06b6d4",
    minMonthlyInvestment: 1000,
    maxAnnualInvestment: 1500000,
    eligibility: {
      minAge: 60,
      maxAge: null,
      minAnnualIncome: 0,
      minMonthlySavings: 1000,
      notes: "Only available to individuals aged 60+. VRS recipients eligible from age 55."
    },
    desc: "Highest-return government scheme for senior citizens. 8.2% p.a. with quarterly payouts and sovereign guarantee."
  },
  {
    id: "pmvvy",
    name: "PM Vaya Vandana Yojana (PMVVY)",
    abbr: "PMVVY",
    cat: "Government",
    rate: 7.4,
    risk: 1,
    riskLabel: "Very Low",
    lockIn: 10,
    taxType: "slab",
    color: "#0d9488",
    minMonthlyInvestment: 1000,
    maxAnnualInvestment: 1500000,
    eligibility: {
      minAge: 60,
      maxAge: null,
      minAnnualIncome: 0,
      minMonthlySavings: 1000,
      notes: "Government-guaranteed pension for senior citizens aged 60+. Maximum ₹15L investment. Monthly/quarterly/annual pension payouts."
    },
    eligibility_note: 'Only for senior citizens aged 60 and above.',
    desc: "Government-guaranteed pension scheme for senior citizens. Fixed 7.4% p.a. with choice of monthly, quarterly, half-yearly, or annual pension. Premature exit allowed with penalty after 3 years."
  },
  {
    id: "sukanya",
    name: "Sukanya Samriddhi Yojana (SSY)",
    abbr: "SSY",
    cat: "Government",
    rate: 8.2,
    risk: 1,
    riskLabel: "Very Low",
    lockIn: 21,
    taxType: "eee",
    color: "#ec4899",
    minMonthlyInvestment: 250,
    maxAnnualInvestment: 150000,
    eligibility: {
      minAge: 18,
      maxAge: 40,
      minAnnualIncome: 0,
      minMonthlySavings: 250,
      requires_daughter_under_10: true,
      hasGirlChild: true,
      notes: "Only for parents/guardians of a girl child under 10 years of age."
    },
    eligibility_note: 'Only for parents/guardians of a girl child under 10 years of age.',
    desc: "EEE tax-free government scheme for girl child education and marriage. 8.2% p.a. — highest guaranteed tax-free return available."
  },
  {
    id: "rbi_bonds",
    name: "RBI Floating Rate Savings Bonds",
    abbr: "RBI Bonds",
    cat: "Government",
    rate: 8.05,
    risk: 1,
    riskLabel: "Very Low",
    lockIn: 7,
    taxType: "slab",
    color: "#0ea5e9",
    minMonthlyInvestment: 1000,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 100000,
      minMonthlySavings: 5000,
      notes: "Minimum ₹1,000 lump sum. Best for users with surplus lump-sum savings."
    },
    desc: "Floating rate bonds linked to NSC rate + 35 bps. RBI sovereign guarantee."
  },
  {
    id: "fd",
    name: "Bank Fixed Deposit",
    abbr: "FD",
    cat: "Debt",
    rate: 7.25,
    risk: 2,
    riskLabel: "Low",
    lockIn: 0,
    taxType: "slab",
    color: "#10b981",
    minMonthlyInvestment: 1000,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 0,
      minMonthlySavings: 1000,
      notes: "5-year tax-saver FDs qualify for 80C deduction. DICGC insurance up to ₹5L per bank."
    },
    desc: "Guaranteed returns with DICGC deposit insurance up to ₹5L. Most liquid low-risk option."
  },
  {
    id: "sgb",
    name: "Sovereign Gold Bond (SGB)",
    abbr: "SGB",
    cat: "Commodity",
    rate: 10.5,
    risk: 2,
    riskLabel: "Low-Medium",
    lockIn: 8,
    taxType: "sgb",
    color: "#ca8a04",
    minMonthlyInvestment: 500,
    maxAnnualInvestment: 480000,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 0,
      minMonthlySavings: 2000,
      notes: "Capital gains at maturity are 100% tax-free. 2.5% annual interest is taxable at slab rates. Best held to maturity. Suitable as 5-10% of portfolio as inflation hedge."
    },
    desc: "Best gold instrument. Capital gains at 8-year maturity are completely tax-free. Earns 2.5% p.a. interest in addition to gold price appreciation."
  },

  // ═══════════════════  MEDIUM RISK (risk: 3) — 5 instruments  ═══════════════════
  {
    id: "debt_mf",
    name: "Debt Mutual Fund",
    abbr: "Debt MF",
    cat: "Debt",
    rate: 7.5,
    risk: 3,
    riskLabel: "Medium-Low",
    lockIn: 0,
    taxType: "slab",
    color: "#3b82f6",
    minMonthlyInvestment: 500,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 200000,
      minMonthlySavings: 2000,
      notes: "Best suited for investors in 20%+ tax bracket seeking liquid debt exposure."
    },
    desc: "Professionally managed liquid debt instruments. No lock-in. Post April 2023, gains taxed at slab rates."
  },
  {
    id: "nps",
    name: "National Pension System (NPS)",
    abbr: "NPS",
    cat: "Government",
    rate: 10.5,
    risk: 3,
    riskLabel: "Medium",
    lockIn: 0,
    maturity_type: 'age_based',
    maturity_age: 60,
    taxType: "nps",
    color: "#f97316",
    minMonthlyInvestment: 500,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: 70,
      minAnnualIncome: 300000,
      minMonthlySavings: 1000,
      notes: "Additional ₹50,000 deduction under 80CCD(1B) over and above 80C limit."
    },
    desc: "Market-linked pension with equity+debt blending. Extra ₹50K 80CCD(1B) deduction on top of 80C. 60% lump sum tax-free at 60."
  },
  {
    id: "hybrid_mf",
    name: "Balanced Advantage Fund",
    abbr: "Hybrid MF",
    cat: "Equity-Debt",
    rate: 11.0,
    risk: 3,
    riskLabel: "Medium",
    lockIn: 0,
    taxType: "ltcg",
    color: "#8b5cf6",
    minMonthlyInvestment: 500,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 300000,
      minMonthlySavings: 3000,
      notes: "Dynamically rebalances equity and debt allocation based on market valuations."
    },
    desc: "Dynamic asset allocation between equity and debt. Cushions drawdowns while participating in equity upside."
  },
  {
    id: "index_mf",
    name: "Nifty 50 Index Fund",
    abbr: "Index MF",
    cat: "Equity",
    rate: 12.5,
    risk: 3,
    riskLabel: "Medium",
    lockIn: 0,
    taxType: "ltcg",
    color: "#6366f1",
    minMonthlyInvestment: 100,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 200000,
      minMonthlySavings: 1000,
      notes: "No fund manager risk. Ultra-low expense ratio. Suitable for any income level with horizon of 5+ years."
    },
    desc: "Passive Nifty 50 fund with lowest cost in the equity category. Ideal for first-time equity investors."
  },
  {
    id: "gold_etf",
    name: "Gold ETF",
    abbr: "Gold ETF",
    cat: "Commodity",
    rate: 8.5,
    risk: 3,
    riskLabel: "Medium",
    lockIn: 0,
    taxType: "ltcg",
    color: "#eab308",
    minMonthlyInvestment: 500,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 0,
      minMonthlySavings: 500,
      notes: "Requires demat account. Returns taxed as LTCG. SGB is superior for long-horizon investors."
    },
    desc: "Liquid gold exposure via demat account. No lock-in. Gains taxed as LTCG at 12.5%. Less tax-efficient than SGB but more liquid."
  },

  // ═══════════════════  HIGH RISK (risk: 4 or 5) — 5 instruments  ═══════════════════
  {
    id: "elss",
    name: "ELSS Mutual Fund",
    abbr: "ELSS",
    cat: "Equity",
    rate: 13.5,
    risk: 4,
    riskLabel: "High",
    lockIn: 3,
    taxType: "elss",
    color: "#f59e0b",
    minMonthlyInvestment: 500,
    maxAnnualInvestment: 150000,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 300000,
      minMonthlySavings: 2000,
      notes: "80C deduction of up to ₹1.5L. Best for users with taxable income > ₹7L."
    },
    desc: "Equity tax-saving fund with 80C deduction. Shortest lock-in among all 80C options."
  },
  {
    id: "nifty_etf",
    name: "Nifty 50 ETF",
    abbr: "Nifty ETF",
    cat: "Equity",
    rate: 12.5,
    risk: 4,
    riskLabel: "High",
    lockIn: 0,
    taxType: "ltcg",
    color: "#a855f7",
    minMonthlyInvestment: 100,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: null,
      minAnnualIncome: 200000,
      minMonthlySavings: 1000,
      notes: "Real-time tradeable. Requires demat account."
    },
    desc: "Exchange-traded Nifty 50 fund. Real-time pricing, demat account required."
  },
  {
    id: "midcap_mf",
    name: "Mid-Cap Mutual Fund",
    abbr: "Mid-Cap MF",
    cat: "Equity",
    rate: 15.5,
    risk: 4,
    riskLabel: "High",
    lockIn: 0,
    taxType: "ltcg",
    color: "#ef4444",
    minMonthlyInvestment: 1000,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 18,
      maxAge: 50,
      minAnnualIncome: 600000,
      minMonthlySavings: 5000,
      notes: "Higher volatility. Only suitable under 50 with horizon >= 7 years."
    },
    desc: "High-growth equity exposure via mid-cap companies. Historical 15.5% CAGR."
  },
  {
    id: "smallcap_mf",
    name: "Small-Cap Mutual Fund",
    abbr: "Small-Cap MF",
    cat: "Equity",
    rate: 17.0,
    risk: 5,
    riskLabel: "Very High",
    lockIn: 0,
    taxType: "ltcg",
    color: "#dc2626",
    minMonthlyInvestment: 1000,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 21,
      maxAge: 45,
      minAnnualIncome: 800000,
      minMonthlySavings: 8000,
      notes: "Only for: age 21–45, horizon >= 10, risk = high, income >= ₹8L, savings >= ₹8,000/mo."
    },
    desc: "Highest potential equity return with proportionally high risk. Best as 10–15% allocation."
  },
  {
    id: "direct_equity",
    name: "Direct Stock Investment",
    abbr: "Direct Stocks",
    cat: "Equity",
    rate: 14.0,
    risk: 5,
    riskLabel: "Very High",
    lockIn: 0,
    taxType: "ltcg",
    color: "#b91c1c",
    minMonthlyInvestment: 5000,
    maxAnnualInvestment: null,
    eligibility: {
      minAge: 21,
      maxAge: 55,
      minAnnualIncome: 600000,
      minMonthlySavings: 10000,
      notes: "Only for: age 21–55, risk = high, income >= ₹6L, savings >= ₹10,000/mo, horizon >= 5."
    },
    desc: "Highest return potential with company-specific risk. Requires research and active monitoring."
  }
];
