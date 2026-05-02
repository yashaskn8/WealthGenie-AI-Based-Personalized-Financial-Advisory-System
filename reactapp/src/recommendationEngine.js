/**
 * WealthGenie — Client-Side Recommendation Engine (Offline-First Fallback)
 * ────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE NOTE — THIS IS NOT THE AUTHORITATIVE ENGINE:
 *   The authoritative recommendation pipeline is:
 *     1. server/routes/recommend.js → ML microservice (FastAPI + RandomForest)
 *     2. server/services/postTaxCalculator.js → post-tax adjustments
 *     3. server/services/taxEngine.js → marginal slab computation (FY2025-26)
 *
 *   This client-side engine provides:
 *     - Instant UI rendering BEFORE backend API responds (offline-first UX)
 *     - Eligibility filtering, scoring, and allocation for immediate display
 *     - Post-tax estimation consistent with the backend's tax-type logic
 *
 *   When backend data arrives, App.jsx merges it over these local results.
 *   See DashboardShell.useMemo() in App.jsx for the merge logic.
 *
 *   DO NOT add new tax computation logic here. If tax rules change,
 *   update server/services/taxEngine.js and server/services/postTaxCalculator.js.
 */
import { investmentDatabase, TAX_INFO, RISK_COLORS, CHART_COLORS, CONCENTRATION_CAPS } from './investmentDatabase';

// Re-export for backward compatibility
export { TAX_INFO, RISK_COLORS, CHART_COLORS, CONCENTRATION_CAPS };

// ─── FIX 1: GOAL PROFILES — Liquidity & lock-in rules per goal ───
export const GOAL_PROFILES = {
  'Emergency Fund': {
    liquidity_required: 'high',
    max_lock_in_years: 0,
    preferred_categories: ['Debt', 'Government', 'Commodity'],
    excluded_ids: ['elss', 'nps', 'ppf', 'scss', 'rbi_bonds', 'sgb', 'sukanya',
                   'smallcap_mf', 'midcap_mf', 'direct_equity', 'index_mf',
                   'nifty_etf', 'gold_etf'],
    target_formula: 'monthly_expenses * 6',
    recommended_horizon_months: 18,
    note: 'Emergency funds must be instantly accessible. Only liquid instruments.',
  },
  'Retirement': {
    liquidity_required: 'low',
    max_lock_in_years: 30,
    preferred_categories: ['Equity', 'Government', 'Equity-Debt'],
    excluded_ids: [],
    recommended_horizon_months: null,
  },
  'Wealth Growth': {
    liquidity_required: 'low',
    max_lock_in_years: 10,
    preferred_categories: ['Equity', 'Equity-Debt', 'Commodity'],
    excluded_ids: [],
    recommended_horizon_months: null,
  },
  'Tax Saving': {
    liquidity_required: 'low',
    max_lock_in_years: 3,
    preferred_categories: ['Equity', 'Government'],
    prioritised_ids: ['elss', 'nps', 'ppf'],
    max_80c_limit: 150000,
    excluded_ids: [],
    recommended_horizon_months: null,
  },
};

// ─── FIX 1: Filter instruments based on goal requirements ─────────
export function filterInstrumentsForGoal(instruments, goalType) {
  const profile = GOAL_PROFILES[goalType];
  if (!profile) return instruments;

  return instruments.filter(inst => {
    // Exclude instruments by ID
    if (profile.excluded_ids?.includes(inst.id)) return false;
    // Exclude instruments that violate liquidity requirements
    if (profile.max_lock_in_years === 0 && (inst.lockIn > 0 || inst.lock_in_years > 0)) {
      return false;
    }
    return true;
  });
}

// ─── FIX 1: Emergency Fund — dedicated liquid portfolio ───────────
export function buildEmergencyFundPortfolio(userProfile) {
  const income = Number(userProfile.monthly_income || userProfile.income) || 0;
  const savings = Number(userProfile.monthly_savings || userProfile.savings) || 0;
  const monthlyExpenses = income - savings;
  const emergencyTarget = monthlyExpenses * 6;
  const monthsToAchieve = Math.ceil(emergencyTarget / (savings || 1));

  // Liquid instruments only — all have lockIn=0
  const liquidPortfolio = [
    {
      id: 'liquid_mf', name: 'Liquid Mutual Fund', abbr: 'Liquid MF',
      cat: 'Debt', rate: 7.0, risk: 1, riskLabel: 'Very Low', lockIn: 0,
      taxType: 'slab', color: '#14b8a6', minMonthlyInvestment: 500,
      maxAnnualInvestment: null, desc: 'T+1 redemption. Ideal core emergency holding.',
      eligibility: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500 },
    },
    {
      ...investmentDatabase.find(i => i.id === 'fd'),
    },
    {
      ...investmentDatabase.find(i => i.id === 'debt_mf'),
    },
  ].filter(Boolean);

  // Weights: 50% Liquid MF, 35% FD, 15% Debt MF
  const weights = [0.50, 0.35, 0.15];
  const sipAllocations = weights.map(w => Math.round(w * savings / 100) * 100);

  // Fix rounding residual
  const allocated = sipAllocations.reduce((s, a) => s + a, 0);
  const diff = savings - allocated;
  if (diff !== 0) sipAllocations[0] += diff;

  const annualIncome = income * 12;
  const annualSavings = savings * 12;

  liquidPortfolio.forEach((inv, i) => {
    inv.monthly_allocation = sipAllocations[i];
    inv.projected_value = calculateSIPValue(inv.monthly_allocation, inv.rate, Math.ceil(monthsToAchieve / 12) || 1);
    inv.category = inv.cat;
    inv.expected_return_min = Math.max(inv.rate - 1, inv.rate * 0.9);
    inv.expected_return_max = inv.rate;
    inv.risk_level = inv.riskLabel;
    inv.tax_benefit = false;
    inv.tax_section = null;
    inv.lock_in_years = 0;
    inv.liquidity = 'High';
    inv.min_investment_inr = inv.minMonthlyInvestment;
    inv.match_score = 90 - i * 5;
    inv.score = 90 - i * 5;
    inv.description = inv.desc;
    inv.suitable_for_goals = ['Emergency Fund'];
    inv.suitable_risk_profiles = ['Low', 'Medium', 'High'];
    inv.types = [];
    inv.nominalReturn = inv.rate;
    const ptResult = computePostTaxReturn(inv, annualSavings, annualIncome, userProfile);
    inv.postTaxReturn = parseFloat(ptResult.postTaxRate.toFixed(1));
    inv.ml_confidence = 0.92;
    inv._source = 'local_engine';
    inv._goalType = 'Emergency Fund';
  });

  // Attach metadata
  liquidPortfolio._emergencyMeta = {
    target_amount: emergencyTarget,
    monthly_sip: savings,
    months_to_achieve: monthsToAchieve,
    message: `At ₹${savings.toLocaleString('en-IN')}/month, you can build a ₹${(emergencyTarget/100000).toFixed(1)}L emergency fund in ${monthsToAchieve} months.`,
  };

  return liquidPortfolio;
}

// ─── SIP FUTURE VALUE ─────────────────────────────────────────────
function calculateSIPValue(monthlyDeposit, annualRate, years) {
  if (!years || years <= 0 || !monthlyDeposit || monthlyDeposit <= 0) return 0;
  const r = (annualRate / 100) / 12;
  const n = years * 12;
  if (r === 0) return monthlyDeposit * n;
  return monthlyDeposit * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

// ─── FORMAT INR ───────────────────────────────────────────────────
export function formatINR(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
}

// ─── MARGINAL RATE (New Regime default) ───────────────────────────
export function getMarginalRate(annualIncome, regime = 'new') {
  if (regime === 'old') {
    if (annualIncome > 1000000) return 0.30;
    if (annualIncome > 500000) return 0.20;
    if (annualIncome > 250000) return 0.05;
    return 0;
  }
  // New regime
  if (annualIncome > 1500000) return 0.30;
  if (annualIncome > 1200000) return 0.20;
  if (annualIncome > 900000) return 0.15;
  if (annualIncome > 600000) return 0.10;
  if (annualIncome > 300000) return 0.05;
  return 0;
}

// ─── POST-TAX COMPUTATION (FIXED: post-tax NEVER exceeds nominal) ─
// Tax savings (80C, 80CCD) are reported separately and NEVER added
// to the postTaxRate. The taxEquivalentYield is provided separately
// for comparison purposes only — it must NEVER populate postTaxReturn.
export function computePostTaxReturn(inv, annualSavings, annualIncome, profile) {
  const mr = getMarginalRate(annualIncome, profile?.taxRegime || 'new');
  const rate = typeof inv === 'number' ? inv : inv.rate;
  const taxType = typeof inv === 'object' ? inv.taxType : 'slab';
  const invId = typeof inv === 'object' ? inv.id : null;
  const age = Number(profile?.age) || 30;

  switch (taxType) {
    case "eee": {
      // EEE instruments: NO tax at any stage. Post-tax = nominal EXACTLY.
      const taxSaving = Math.min(150000, annualSavings) * mr;
      return {
        postTaxRate: rate, // NEVER exceeds nominal
        taxSaving,
        taxPaid: 0,
        marginalRate: mr,
        // Tax-equivalent yield is for COMPARISON ONLY — never display as post-tax return
        taxEquivalentYield: mr > 0 ? parseFloat((rate / (1 - mr)).toFixed(2)) : rate,
      };
    }

    case "slab": {
      // Interest fully taxed at marginal slab rate
      const postTaxRate = rate * (1 - mr);

      if (invId === "fd") {
        const interest = annualSavings * rate / 100;
        const tdsThreshold = age >= 60 ? 50000 : 40000;
        const tdsApplies = interest > tdsThreshold;
        return {
          postTaxRate: parseFloat(postTaxRate.toFixed(2)),
          taxSaving: 0,
          taxPaid: Math.round(interest * mr),
          marginalRate: mr,
          tdsNote: tdsApplies
            ? `TDS at 10% applies on FD interest above ₹${tdsThreshold.toLocaleString("en-IN")}/yr. Claim it back when filing ITR if your total tax is lower.`
            : null,
        };
      }

      return {
        postTaxRate: parseFloat(postTaxRate.toFixed(2)),
        taxSaving: 0,
        taxPaid: Math.round(annualSavings * rate / 100 * mr),
        marginalRate: mr,
      };
    }

    case "ltcg": {
      // Equity LTCG: 12.5% on gains (simplified)
      const ltcgRate = 0.125;
      const postTaxRate = rate * (1 - ltcgRate);
      return {
        postTaxRate: parseFloat(postTaxRate.toFixed(2)),
        taxSaving: 0,
        taxPaid: Math.round(annualSavings * rate / 100 * ltcgRate),
        marginalRate: mr,
      };
    }

    case "elss": {
      // ELSS: LTCG 12.5% on gains; 80C deduction reported separately
      const ltcgRate = 0.125;
      const postTaxRate = rate * (1 - ltcgRate);
      const taxSaving = Math.min(150000, annualSavings) * mr;
      return {
        postTaxRate: parseFloat(postTaxRate.toFixed(2)),
        taxSaving,
        taxPaid: Math.round(annualSavings * rate / 100 * ltcgRate),
        marginalRate: mr,
      };
    }

    case "nps": {
      // NPS: Partial EET — 40% annuity taxed at slab
      // Tax saving from 80CCD(1B) is reported SEPARATELY
      const annuityFraction = 0.40;
      const blendedTaxDrag = annuityFraction * mr;
      const postTaxRate = rate * (1 - blendedTaxDrag);
      const ccd1bDeduction = Math.min(50000, annualSavings);
      const taxSaving = ccd1bDeduction * mr;
      return {
        postTaxRate: parseFloat(postTaxRate.toFixed(2)),
        taxSaving: Math.round(taxSaving),
        taxPaid: 0,
        marginalRate: mr,
        npsNote: `80CCD(1B) deduction of ₹${ccd1bDeduction.toLocaleString("en-IN")} saves ₹${Math.round(taxSaving).toLocaleString("en-IN")} annually. This is SEPARATE from your ₹1.5L 80C limit. 60% lump sum at age 60 is tax-free.`,
      };
    }

    case "sgb": {
      // SGB: 2.5% interest taxed at slab; capital gains exempt at maturity
      const interestComponent = 0.025;
      const taxOnInterest = interestComponent * mr;
      const postTaxRate = rate - taxOnInterest;
      return {
        postTaxRate: parseFloat(Math.max(0, postTaxRate).toFixed(2)),
        taxSaving: 0,
        taxPaid: Math.round(annualSavings * interestComponent * mr),
        marginalRate: mr,
      };
    }

    default: {
      // Default: slab-taxed
      const postTaxRate = rate * (1 - mr);
      return {
        postTaxRate: parseFloat(Math.max(0, postTaxRate).toFixed(2)),
        taxSaving: 0,
        taxPaid: Math.round(annualSavings * rate / 100 * mr),
        marginalRate: mr,
      };
    }
  }
}

// ─── STEP 3: SMART ELIGIBILITY FILTER (13 rules) ─────────────────
export function getEligibleInvestments(profile) {
  const age = Number(profile.age) || 25;
  const income = Number(profile.monthly_income || profile.income) || 0;
  const savings = Number(profile.monthly_savings || profile.savings) || 0;
  const risk = (profile.risk_appetite || profile.risk || "Medium").toLowerCase();
  const horizon = Number(profile.investment_horizon || profile.horizon) || 10;
  const annualIncome = income * 12;
  const mr = getMarginalRate(annualIncome);

  let result = investmentDatabase.filter(inv => {
    const elig = inv.eligibility;
    if (age < elig.minAge) return false;
    if (elig.maxAge !== null && age > elig.maxAge) return false;
    if (annualIncome < elig.minAnnualIncome) return false;
    if (savings < inv.minMonthlyInvestment) return false;
    if (inv.id === "scss" && age < 60) return false;
    // Fix 3: SSY requires user to have declared a daughter under 10
    if (inv.id === "sukanya") {
      if (age < 18 || age > 40) return false;
      // SSY eligibility requires explicit declaration of having a daughter under 10.
      // Since the profile does not collect this data, SSY is always excluded
      // unless the profile explicitly sets has_daughter_under_10 = true.
      if (!profile.has_daughter_under_10) return false;
    }
    if (inv.id === "smallcap_mf") {
      if (!(age >= 21 && age <= 45 && horizon >= 10 && risk === "high" && annualIncome >= 800000 && savings >= 8000)) return false;
    }
    if (inv.id === "direct_equity") {
      if (!(age >= 21 && age <= 55 && risk === "high" && annualIncome >= 600000 && savings >= 10000 && horizon >= 5)) return false;
    }
    if (inv.id === "midcap_mf") {
      if (age > 50 || horizon < 7 || savings < 5000 || annualIncome < 600000) return false;
    }
    if (inv.id === "nps" && horizon < 5) return false;
    if (risk === "low" && inv.risk >= 4) return false;
    if (risk === "high" && inv.risk === 1 && horizon <= 3) return false;
    if (inv.id === "elss" && mr === 0) return false;
    if (inv.id === "debt_mf" && mr === 0 && savings < 10000) return false;
    return true;
  });

  // FIX 2.7 — Minimum eligible instruments fallback
  if (result.length === 0) {
    const fd = investmentDatabase.find(i => i.id === "fd");
    const ppf = investmentDatabase.find(i => i.id === "ppf");
    result = [fd, ppf].filter(Boolean);
    result._fallbackNotice = "Your profile is very specific. Showing universal safe options. Adjust your profile to unlock more.";
  } else if (result.length === 1) {
    const fd = investmentDatabase.find(i => i.id === "fd");
    const ppf = investmentDatabase.find(i => i.id === "ppf");
    const ids = new Set(result.map(i => i.id));
    if (!ids.has("fd") && fd) result.push(fd);
    if (!ids.has("ppf") && ppf) result.push(ppf);
  } else if (result.length === 2) {
    const fd = investmentDatabase.find(i => i.id === "fd");
    if (fd && !result.some(i => i.id === "fd")) result.push(fd);
  }

  return result;
}

// ─── SCORING FORMULA ──────────────────────────────────────────────
function computeScore(inv, profile) {
  const income = Number(profile.monthly_income || profile.income) || 0;
  const savings = Number(profile.monthly_savings || profile.savings) || 0;
  const risk = (profile.risk_appetite || profile.risk || "Medium").toLowerCase();
  const horizon = Number(profile.investment_horizon || profile.horizon) || 10;
  const age = Number(profile.age) || 30;
  const goals = profile.investment_goals || [];
  const annualIncome = income * 12;
  const annualSavings = savings * 12;

  const { postTaxRate } = computePostTaxReturn(inv, annualSavings, annualIncome, profile);

  let score = 0;
  let returnPoints = postTaxRate * 3.5;
  if (inv.id === "gold_etf" || inv.id === "sgb") returnPoints = Math.min(returnPoints, 30);
  score += returnPoints;

  if (risk === "low" && inv.risk <= 2) score += 20;
  else if (risk === "medium" && inv.risk >= 2 && inv.risk <= 4) score += 15;
  else if (risk === "high" && inv.risk >= 3) score += 18;

  // Fix 2: Use effective lock-in for age-based instruments (NPS)
  const effectiveLockIn = (inv.maturity_type === 'age_based' && inv.maturity_age)
    ? Math.max(0, inv.maturity_age - age)
    : inv.lockIn;
  if (effectiveLockIn <= horizon) score += 15;
  if (effectiveLockIn === 0) score += 5;

  if (inv.taxType === "eee") score += 12;
  if (inv.taxType === "elss" && goals.includes("Tax Saving")) score += 10;
  if (inv.taxType === "nps") score += 8;
  if (inv.taxType === "sgb") score += 6;

  if (goals.includes("Tax Saving") && ["eee", "elss", "nps"].includes(inv.taxType)) score += 8;
  if (goals.includes("Retirement") && ["nps", "ppf", "scss"].includes(inv.id)) score += 10;
  if (goals.includes("Wealth Growth") && inv.risk >= 3) score += 5;

  if (inv.id === "nps" && horizon >= 15) score += 8;
  if (inv.id === "sukanya") score += 12;
  if (inv.id === "scss") score += 15;

  return { ...inv, score, postTaxRate };
}

// ─── FIX 2.6: CONCENTRATION GUARD ────────────────────────────────
export function enforceConcentrationLimits(rankedInvestments) {
  return rankedInvestments.map((inv, idx) => {
    const cap = CONCENTRATION_CAPS[inv.id];
    if (cap) {
      return { ...inv, concentrationBadge: cap.badge, maxPct: cap.maxPct };
    }
    return inv;
  });
}

// ─── SECTION 8: getWhy RATIONALE — ALL 16 INSTRUMENTS ─────────────
export function getWhy(inv, profile) {
  const income = Number(profile.monthly_income || profile.income) || 0;
  const savings = Number(profile.monthly_savings || profile.savings) || 0;
  const risk = profile.risk_appetite || profile.risk || "Medium";
  const horizon = Number(profile.investment_horizon || profile.horizon) || 10;
  const age = Number(profile.age) || 30;
  const annualIncome = income * 12;
  const annualSavings = savings * 12;
  const mr = getMarginalRate(annualIncome, profile.taxRegime || 'new');
  const mrPct = (mr * 100).toFixed(0);
  const { postTaxRate, tdsNote, npsNote } = computePostTaxReturn(inv, annualSavings, annualIncome, profile);
  const postTaxStr = postTaxRate.toFixed(1);

  // Equivalent taxable rate for EEE instruments
  const equivTaxableRate = mr > 0 ? (inv.rate / (1 - mr)).toFixed(1) : inv.rate.toFixed(1);

  const reasons = {
    ppf: [
      `Tax-free growth under the EEE framework means zero tax at every stage — contribution, accumulation, and withdrawal. At your marginal rate of ${mrPct}%, the effective yield is equivalent to a ${equivTaxableRate}% taxable instrument.`,
      `The 15-year horizon aligns with long-term wealth building and the sovereign guarantee eliminates default risk.`,
      `PPF is universally recommended as a foundation for any Indian investor's portfolio.`,
    ],
    scss: [
      `At age ${age}, SCSS is the most efficient guaranteed-income instrument available to you — 8.2% with quarterly payouts and sovereign backing.`,
      `No other government scheme offers this rate with a 5-year lock-in for your age group.`,
      `TDS applies if annual interest exceeds ₹50,000. This should be one of your top-3 instruments.`,
    ],
    sukanya: [
      `SSY offers the highest guaranteed EEE return at 8.2% p.a. — better than PPF and entirely tax-free.`,
      `If you have a daughter under 10, this is the single most efficient government scheme available for her education or marriage.`,
      `The 21-year lock-in matches the long-term nature of the goal.`,
    ],
    rbi_bonds: [
      `RBI Sovereign Bonds offer 8.05% with zero credit risk — the highest available safe nominal rate.`,
      `With your savings of ₹${savings.toLocaleString("en-IN")}/month, the 7-year lock-in is manageable within your ${horizon}-year horizon.`,
      `Interest is taxable at your ${mrPct}% slab rate, but the pre-tax yield still exceeds most alternatives.`,
    ],
    fd: [
      `Fixed Deposits offer guaranteed, DICGC-insured returns with no credit risk up to ₹5L per bank.`,
      `Interest is taxable at your slab rate of ${mrPct}%, bringing the net return to ${postTaxStr}%.${tdsNote ? ' ' + tdsNote : ''}`,
      `The 5-year tax-saver FD variant qualifies for 80C deduction if you have remaining 80C capacity.`,
    ],
    sgb: [
      `Sovereign Gold Bonds are the most tax-efficient gold instrument available. Capital gains at 8-year maturity are completely exempt under Section 47(viic), and you additionally earn 2.5% annual interest on the face value.`,
      `This makes the effective post-tax return significantly better than Gold ETF for long-horizon investors.`,
      `The ₹${(480000).toLocaleString("en-IN")} annual investment cap limits exposure. Ideal as 5–10% of portfolio.`,
    ],
    gold_etf: [
      `Gold ETFs provide inflation-hedging and portfolio diversification through a demat account with no lock-in.`,
      `Gains after 1 year are taxed as LTCG at 12.5%. SGB is superior for investors with an 8-year horizon; Gold ETF suits those needing shorter liquidity.`,
      `Limit to 5–10% of total portfolio to avoid over-concentration in commodities.`,
    ],
    debt_mf: [
      `Debt mutual funds provide better liquidity than FDs with comparable returns.`,
      `Since April 2023, all gains are taxed at slab rates, so at your ${mrPct}% rate the net return is ${postTaxStr}%. The key advantage over FDs is complete liquidity and no TDS at source.`,
      `Note: Since April 2023, all debt fund gains are taxed at your income slab rate (no indexation or LTCG benefit). The net return shown already reflects this.`,
    ],
    nps: [
      `NPS offers an additional ₹50,000 deduction under 80CCD(1B) that sits entirely outside your ₹1.5L 80C limit. At your marginal rate of ${mrPct}%, this saves ₹${Math.round(Math.min(50000, annualSavings) * mr).toLocaleString("en-IN")} annually in tax — a guaranteed return on that saving alone.`,
      `The market-linked equity-debt blend historically returns 10–11% p.a., and 60% of the corpus at retirement is tax-free.`,
      horizon >= 15 ? `Your ${horizon}-year horizon perfectly aligns with NPS's long-term structure for maximum compounding.` : `NPS works best with long horizons. Consider maximising only if your horizon is 15+ years.`,
    ],
    hybrid_mf: [
      `Balanced Advantage Funds dynamically shift between equity and debt based on market valuations, reducing drawdown risk during corrections.`,
      `At your ${risk} risk profile and ${horizon}-year horizon, this provides equity-like returns of approximately ${inv.rate}% with meaningfully lower volatility than pure equity.`,
      `LTCG at 12.5% on gains above ₹1.25L.`,
    ],
    index_mf: [
      `Nifty 50 Index Funds offer broad market exposure with the lowest expense ratio in the equity category — typically 0.1–0.2% vs 1–2% for active funds.`,
      `Historical Nifty 50 CAGR over 15-year rolling periods has consistently exceeded 12%.`,
      `LTCG at 12.5% on annual gains above ₹1.25L reduces the effective take-home to ${postTaxStr}%.`,
    ],
    elss: [
      `ELSS provides equity market growth (historically 13–14% CAGR) combined with an 80C deduction of up to ₹1.5L. At your marginal rate of ${mrPct}%, this saves ₹${Math.round(Math.min(150000, annualSavings) * mr).toLocaleString("en-IN")} annually in tax.`,
      `Each SIP instalment has its own 3-year lock-in. A ₹5,000 instalment made today is locked until the same date 3 years from now, not when the account was opened. Units purchased via SIP become liquid on a rolling basis from month 37 onward.`,
      `With the fewest restrictions among all 80C options, ELSS is the strongest tax-saving instrument for equity investors with a horizon above 5 years.`,
    ],
    nifty_etf: [
      `Nifty 50 ETF is the real-time tradeable equivalent of the Index Fund, requiring a demat account. The expense ratio is marginally lower.`,
      `Returns and tax treatment (LTCG at 12.5%) are identical to the Index Fund.`,
      `Prefer this if you already have an active demat account; otherwise the Index Fund is simpler.`,
    ],
    midcap_mf: [
      `Mid-Cap funds have historically delivered 15–16% CAGR over 7-year rolling periods, outperforming large-caps during sustained bull runs.`,
      `The trade-off is meaningfully higher volatility. At age ${age} with a ${horizon}-year horizon, you have sufficient time to recover from drawdowns.`,
      `Keep this as 15–20% of your equity allocation rather than a standalone holding. LTCG applies at 12.5%.`,
    ],
    smallcap_mf: [
      `Small-Cap funds represent the highest potential return in the mutual fund universe — 17%+ CAGR over long periods — but with the highest interim volatility.`,
      `You qualify for this based on your age (${age}), income (₹${annualIncome.toLocaleString("en-IN")}), and savings (₹${savings.toLocaleString("en-IN")}/mo). A strict 10-year minimum horizon is required to absorb drawdown cycles.`,
      `Limit to 10–15% of total portfolio. LTCG at 12.5%.`,
    ],
    direct_equity: [
      `Direct stock investment offers uncapped return potential but demands active research and monitoring.`,
      `With annual income of ₹${annualIncome.toLocaleString("en-IN")} and savings of ₹${savings.toLocaleString("en-IN")}/mo, you have the financial capacity for this.`,
      `LTCG at 12.5% on gains held over 1 year. Diversify across 10–15 stocks to manage company-specific risk. Only suitable as part of a broader portfolio.`,
    ],
  };

  return reasons[inv.id] || [
    `${inv.name} offers ${inv.rate}% p.a. returns with ${inv.riskLabel} risk.`,
    `Lock-in period of ${inv.lockIn} years fits within your ${horizon}-year horizon.`,
    `Tax treatment: ${TAX_INFO[inv.taxType]?.label || inv.taxType}`,
  ];
}

// ─── MAIN: generateRecommendations ────────────────────────────────
export function generateRecommendations(userProfile) {
  const { age, monthly_income, monthly_savings, risk_appetite, investment_goals, investment_horizon } = userProfile;
  const savings = Number(monthly_savings) || 0;
  const primaryGoal = (investment_goals || [])[0] || null;

  // FIX 1: Emergency Fund uses dedicated liquid portfolio
  if (primaryGoal === 'Emergency Fund') {
    return buildEmergencyFundPortfolio(userProfile);
  }

  const profile = {
    age: Number(age) || 25,
    monthly_income: Number(monthly_income) || 0,
    income: Number(monthly_income) || 0,
    monthly_savings: savings,
    savings: savings,
    risk_appetite: risk_appetite || "Medium",
    risk: risk_appetite || "Medium",
    investment_goals: investment_goals || [],
    investment_horizon: Number(investment_horizon) || 10,
    horizon: Number(investment_horizon) || 10,
    taxRegime: userProfile.taxRegime || "new",
  };

  let eligible = getEligibleInvestments(profile);
  if (eligible.length === 0) return [];

  // FIX 1: Apply goal-aware filtering
  if (primaryGoal) {
    eligible = filterInstrumentsForGoal(eligible, primaryGoal);
    // Ensure we still have instruments after goal filtering
    if (eligible.length === 0) {
      const fd = investmentDatabase.find(i => i.id === 'fd');
      const debtMf = investmentDatabase.find(i => i.id === 'debt_mf');
      eligible = [fd, debtMf].filter(Boolean);
    }
  }

  // Store fallback notice if present
  const fallbackNotice = eligible._fallbackNotice || null;

  let scored = eligible.map(inv => computeScore(inv, profile));
  scored.sort((a, b) => b.score - a.score);

  // Apply concentration limits
  scored = enforceConcentrationLimits(scored);

  const maxPicks = Math.min(8, scored.length);
  const recommended = scored.slice(0, maxPicks);

  const totalScore = recommended.reduce((sum, inv) => sum + inv.score, 0);
  if (totalScore === 0) return [];

  // Compute raw weights, guarantee non-negative, normalize to 100%
  let rawWeights = recommended.map(inv => Math.max(0, inv.score / totalScore));
  const rawTotal = rawWeights.reduce((s, w) => s + w, 0);
  if (rawTotal <= 0) {
    rawWeights = recommended.map(() => 1 / recommended.length);
  } else {
    rawWeights = rawWeights.map(w => w / rawTotal);
  }

  // Compute monthly SIP from normalized weights
  let sipAllocations = rawWeights.map(w => {
    let amount = Math.round(w * savings / 100) * 100;
    return Math.max(0, amount);
  });

  // Apply instrument caps
  recommended.forEach((inv, i) => {
    if (sipAllocations[i] > 0 && sipAllocations[i] < inv.minMonthlyInvestment) {
      sipAllocations[i] = inv.minMonthlyInvestment;
    }
    if (inv.maxAnnualInvestment && sipAllocations[i] * 12 > inv.maxAnnualInvestment) {
      sipAllocations[i] = Math.floor(inv.maxAnnualInvestment / 12 / 100) * 100;
    }
  });

  // Ensure SIP sum equals total savings exactly
  let allocatedSum = sipAllocations.reduce((s, a) => s + a, 0);
  const diff = savings - allocatedSum;
  if (diff !== 0 && recommended.length > 0) {
    sipAllocations[0] = Math.max(0, sipAllocations[0] + diff);
  }

  // Assign allocations
  recommended.forEach((inv, i) => {
    inv.monthly_allocation = sipAllocations[i];
  });

  const annualIncome = (Number(profile.monthly_income || profile.income) || 0) * 12;
  const annualSavings = savings * 12;

  recommended.forEach(inv => {
    inv.projected_value = calculateSIPValue(inv.monthly_allocation, inv.rate, profile.investment_horizon);
    inv.category = inv.cat;
    inv.expected_return_min = Math.max(inv.rate - 2, inv.rate * 0.8);
    inv.expected_return_max = inv.rate;
    inv.risk_level = inv.riskLabel;
    inv.tax_benefit = ["eee", "elss", "nps", "sgb"].includes(inv.taxType);
    inv.tax_section = inv.taxType === "eee" ? "80C" : inv.taxType === "elss" ? "80C" : inv.taxType === "nps" ? "80CCD(1B)" : inv.taxType === "sgb" ? "47(viic)" : null;

    // Dynamic lock-in for age-based instruments (NPS)
    if (inv.maturity_type === 'age_based' && inv.maturity_age) {
      inv.lock_in_years = Math.max(0, inv.maturity_age - profile.age);
    } else {
      inv.lock_in_years = inv.lockIn;
    }

    inv.liquidity = inv.lock_in_years === 0 ? "High" : inv.lock_in_years <= 5 ? "Medium" : "Low";
    inv.min_investment_inr = inv.minMonthlyInvestment;
    inv.match_score = inv.score;
    inv.description = inv.desc;
    inv.suitable_for_goals = [];
    if (["eee", "elss", "nps"].includes(inv.taxType)) inv.suitable_for_goals.push("Tax Saving");
    if (inv.risk <= 2) inv.suitable_for_goals.push("Emergency Fund");
    if (inv.risk >= 3) inv.suitable_for_goals.push("Wealth Growth");
    if (inv.lock_in_years >= 5 || ["nps", "ppf"].includes(inv.id)) inv.suitable_for_goals.push("Retirement");
    inv.suitable_risk_profiles = [];
    if (inv.risk <= 2) inv.suitable_risk_profiles.push("Low");
    if (inv.risk >= 2 && inv.risk <= 4) inv.suitable_risk_profiles.push("Medium");
    if (inv.risk >= 3) inv.suitable_risk_profiles.push("High");
    inv.types = [];

    // FIX 5: Compute post-tax return — with Hybrid MF blended tax correction
    const ptResult = computePostTaxReturn(inv, annualSavings, annualIncome, profile);
    inv.nominalReturn = inv.rate;
    // Hybrid MF special: blended equity(65%) + debt(35%) tax drag
    if (inv.id === 'hybrid_mf') {
      // Balanced fund: 65% equity (LTCG 12.5%) + 35% debt (slab rate)
      const marginal = getMarginalRate(annualIncome, profile.taxRegime || 'new');
      const blendedTaxDrag = (0.65 * 0.125) + (0.35 * marginal);
      // For ₹7.8L new regime (5%): 0.08125 + 0.0175 = 0.09875 → 11% × 0.90125 = 9.9%
      inv.postTaxReturn = parseFloat((inv.rate * (1 - blendedTaxDrag)).toFixed(1));
    } else {
      inv.postTaxReturn = parseFloat(ptResult.postTaxRate.toFixed(1));
    }

    inv.ml_confidence = Math.min(0.98, Math.max(0.65, inv.score / 100));
    inv._source = 'local_engine';
  });

  // Attach fallback notice
  if (fallbackNotice) recommended._fallbackNotice = fallbackNotice;

  return recommended;
}

// ─── SECTION 5: ALLOCATION ENGINE ─────────────────────────────────
export function computeAllocation(profile, eligibleInvestments) {
  const savings = Number(profile.monthly_savings || profile.savings) || 0;
  const annualIncome = (Number(profile.monthly_income || profile.income) || 0) * 12;
  const annualSavings = savings * 12;

  // Step 1: Top 5 ranked eligible
  let scored = eligibleInvestments.map(inv => computeScore(inv, profile));
  scored.sort((a, b) => b.score - a.score);
  let top = scored.slice(0, 5);

  // Step 5: If fewer than 3, fill with fd/ppf
  if (top.length < 3) {
    const ids = new Set(top.map(i => i.id));
    const fd = investmentDatabase.find(i => i.id === "fd");
    const ppf = investmentDatabase.find(i => i.id === "ppf");
    if (fd && !ids.has("fd")) { top.push(computeScore(fd, profile)); ids.add("fd"); }
    if (ppf && !ids.has("ppf") && top.length < 5) { top.push(computeScore(ppf, profile)); }
  }

  const N = top.length;
  if (N === 0) return [];

  // Step 2: Hard caps
  const caps = {};
  const goldIds = ["sgb", "gold_etf"];
  top.forEach(inv => {
    const cap = CONCENTRATION_CAPS[inv.id];
    caps[inv.id] = cap ? cap.maxPct : 40;
  });
  // Combined gold cap
  const goldInTop = top.filter(i => goldIds.includes(i.id));
  if (goldInTop.length === 2) {
    goldInTop.forEach(i => { caps[i.id] = 5; }); // split 10% cap
  }

  // Step 3: Floor minimum
  const floor = 5;

  // Step 4: Score-weighted allocation, then clip + renormalize
  const totalScore = top.reduce((s, i) => s + i.score, 0);
  let allocs = top.map(inv => ({
    ...inv,
    allocationPct: totalScore > 0 ? (inv.score / totalScore) * 100 : 100 / N,
  }));

  // Clip to caps and floors
  for (let iter = 0; iter < 5; iter++) {
    let excess = 0;
    let freeCount = 0;
    allocs.forEach(a => {
      if (a.allocationPct > caps[a.id]) {
        excess += a.allocationPct - caps[a.id];
        a.allocationPct = caps[a.id];
      } else if (a.allocationPct < floor) {
        excess -= (floor - a.allocationPct);
        a.allocationPct = floor;
      } else {
        freeCount++;
      }
    });
    if (Math.abs(excess) > 0.1 && freeCount > 0) {
      const freeItems = allocs.filter(a => a.allocationPct > floor && a.allocationPct < caps[a.id]);
      const redistPer = excess / freeItems.length;
      freeItems.forEach(a => { a.allocationPct += redistPer; });
    }
  }

  // Renormalize to sum to exactly 100%
  const totalPct = allocs.reduce((s, a) => s + a.allocationPct, 0);
  if (totalPct > 0) allocs.forEach(a => { a.allocationPct = (a.allocationPct / totalPct) * 100; });

  // Compute post-tax rate for each
  return allocs.map(a => {
    const { postTaxRate } = computePostTaxReturn(a, annualSavings, annualIncome, profile);
    return {
      id: a.id,
      name: a.name,
      abbr: a.abbr,
      cat: a.cat,
      allocationPct: parseFloat(a.allocationPct.toFixed(1)),
      monthlyAmount: Math.round((a.allocationPct / 100) * savings / 100) * 100,
      color: a.color,
      postTaxRate: parseFloat(postTaxRate.toFixed(1)),
      riskLabel: a.riskLabel,
      rate: a.rate,
      score: a.score,
      concentrationBadge: CONCENTRATION_CAPS[a.id]?.badge || null,
      maxPct: caps[a.id] || 40,
    };
  });
}
