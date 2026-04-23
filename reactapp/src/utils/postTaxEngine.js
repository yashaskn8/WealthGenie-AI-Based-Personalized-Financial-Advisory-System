/**
 * Post-Tax Return Engine
 * Calculates real post-tax returns for all investments based on Indian Tax profiles.
 * Updated to support the new 15-instrument catalogue including NPS.
 */

// Income Tax Slab Calculation
export function calculateIncomeTax(annualIncome, regime = 'new') {
  let taxPayable = 0;
  let marginalRate = 0;
  const slabBreakdown = [];
  let remaining = annualIncome;

  if (regime === 'new') {
    // New Tax Regime (FY 24-25 estimates based on user spec)
    if (remaining > 1500000) {
      taxPayable += (remaining - 1500000) * 0.30;
      slabBreakdown.push({ range: '> 15,00,000', amountExposed: remaining - 1500000, rate: 0.30, tax: (remaining - 1500000) * 0.30 });
      marginalRate = 0.30;
      remaining = 1500000;
    }
    if (remaining > 1200000) {
      taxPayable += (remaining - 1200000) * 0.20;
      slabBreakdown.push({ range: '12L - 15L', amountExposed: remaining - 1200000, rate: 0.20, tax: (remaining - 1200000) * 0.20 });
      if (marginalRate === 0) marginalRate = 0.20;
      remaining = 1200000;
    }
    if (remaining > 900000) {
      taxPayable += (remaining - 900000) * 0.15;
      slabBreakdown.push({ range: '9L - 12L', amountExposed: remaining - 900000, rate: 0.15, tax: (remaining - 900000) * 0.15 });
      if (marginalRate === 0) marginalRate = 0.15;
      remaining = 900000;
    }
    if (remaining > 600000) {
      taxPayable += (remaining - 600000) * 0.10;
      slabBreakdown.push({ range: '6L - 9L', amountExposed: remaining - 600000, rate: 0.10, tax: (remaining - 600000) * 0.10 });
      if (marginalRate === 0) marginalRate = 0.10;
      remaining = 600000;
    }
    if (remaining > 300000) {
      taxPayable += (remaining - 300000) * 0.05;
      slabBreakdown.push({ range: '3L - 6L', amountExposed: remaining - 300000, rate: 0.05, tax: (remaining - 300000) * 0.05 });
      if (marginalRate === 0) marginalRate = 0.05;
      remaining = 300000;
    }
    if (remaining > 0 && marginalRate === 0) marginalRate = 0.0;
  } else {
    // Old Tax Regime
    if (remaining > 1000000) {
      taxPayable += (remaining - 1000000) * 0.30;
      slabBreakdown.push({ range: '> 10,00,000', amountExposed: remaining - 1000000, rate: 0.30, tax: (remaining - 1000000) * 0.30 });
      marginalRate = 0.30;
      remaining = 1000000;
    }
    if (remaining > 500000) {
      taxPayable += (remaining - 500000) * 0.20;
      slabBreakdown.push({ range: '5L - 10L', amountExposed: remaining - 500000, rate: 0.20, tax: (remaining - 500000) * 0.20 });
      if (marginalRate === 0) marginalRate = 0.20;
      remaining = 500000;
    }
    if (remaining > 250000) {
      taxPayable += (remaining - 250000) * 0.05;
      slabBreakdown.push({ range: '2.5L - 5L', amountExposed: remaining - 250000, rate: 0.05, tax: (remaining - 250000) * 0.05 });
      if (marginalRate === 0) marginalRate = 0.05;
      remaining = 250000;
    }
    if (remaining > 0 && marginalRate === 0) marginalRate = 0.0;
  }

  // Handle standard rebates
  if (regime === 'new' && taxPayable > 0 && taxPayable <= 25000) {
     taxPayable = 0; // Section 87A rebate for new regime
  }
  if (regime === 'old' && taxPayable > 0 && taxPayable <= 12500) {
     taxPayable = 0; // Section 87A rebate for old regime
  }

  // 4% Health & Education Cess
  if (taxPayable > 0) {
    taxPayable = taxPayable * 1.04;
  }

  const effectiveRate = annualIncome > 0 ? (taxPayable / annualIncome) : 0;

  return { taxPayable, effectiveRate, marginalRate, slabBreakdown };
}

// Post-Tax Return Computation — supports new instrument schema
export function calculatePostTaxReturn(investment, holdingMonths, gainAmount, userMarginalRate, inflationRate = 0.06) {
  let taxAmount = 0;
  let taxType = "Not Applicable";
  let taxRatePercent = 0;

  const isLTCG = holdingMonths > 12;
  const isDebtLTCG = holdingMonths > 36;

  // Support both old and new instrument schema
  const category = investment.category || investment.cat || "";
  const name = investment.name || "";
  const invTaxType = investment.taxType || null;
  const invId = investment.id || null;

  // ─── Use new taxType-based routing if available ───
  if (invTaxType) {
    switch (invTaxType) {
      case "eee":
        taxType = "Exempt (EEE Status)";
        taxAmount = 0;
        taxRatePercent = 0;
        break;

      case "slab":
        taxType = "Added to Income Slab";
        taxAmount = gainAmount * userMarginalRate;
        taxRatePercent = userMarginalRate * 100;
        break;

      case "ltcg":
        if (isLTCG) {
          taxType = "LTCG (12.5% above ₹1.25L)";
          const taxableGain = Math.max(0, gainAmount - 125000);
          taxAmount = taxableGain * 0.125;
          taxRatePercent = 12.5;
        } else {
          taxType = "STCG (20%)";
          taxAmount = gainAmount * 0.20;
          taxRatePercent = 20;
        }
        break;

      case "elss":
        if (isLTCG) {
          taxType = "ELSS LTCG (12.5% above ₹1.25L)";
          const elssGainTaxable = Math.max(0, gainAmount - 125000);
          taxAmount = elssGainTaxable * 0.125;
          taxRatePercent = 12.5;
        } else {
          taxType = "STCG (20%)";
          taxAmount = gainAmount * 0.20;
          taxRatePercent = 20;
        }
        break;

      case "nps":
        taxType = "NPS — Partially Exempt (60/40 rule)";
        // 60% lump sum tax-free, 40% annuitised and taxed
        taxAmount = (gainAmount * 0.40) * userMarginalRate;
        taxRatePercent = userMarginalRate * 100 * 0.4;
        break;

      default:
        taxType = "Capital Gains";
        taxAmount = gainAmount * 0.10;
        taxRatePercent = 10;
    }
  } else {
    // ─── Legacy name-based fallback for backward compatibility ───
    if (category === "Equity" || name.includes("Mutual Fund") || name.includes("ETF") || name.includes("Stock")) {
      if (isLTCG) {
        taxType = "LTCG (12.5% above ₹1.25L)";
        const taxableGain = Math.max(0, gainAmount - 125000);
        taxAmount = taxableGain * 0.125;
        taxRatePercent = 12.5;
      } else {
        taxType = "STCG (20%)";
        taxAmount = gainAmount * 0.20;
        taxRatePercent = 20;
      }
    } else if (category === "Debt" || name.toLowerCase().includes("fd") || name.toLowerCase().includes("bond")) {
      taxType = "Added to Income Slab";
      taxAmount = gainAmount * userMarginalRate;
      taxRatePercent = userMarginalRate * 100;
    } else if (name.includes("PPF") || name.includes("Sukanya")) {
      taxType = "Exempt (EEE Status)";
      taxAmount = 0;
      taxRatePercent = 0;
    } else if (name.includes("NPS")) {
      taxType = "NPS — Partially Exempt (60/40 rule)";
      taxAmount = (gainAmount * 0.40) * userMarginalRate;
      taxRatePercent = userMarginalRate * 100 * 0.4;
    } else if (name.includes("SGB") || name.includes("Sovereign Gold") || name.includes("Gold")) {
      if (holdingMonths >= 96) {
        taxType = "Capital Gains Exempt";
        taxAmount = 0;
      } else {
        taxType = "Added to Income Slab";
        taxAmount = gainAmount * userMarginalRate;
      }
      taxRatePercent = (holdingMonths >= 96) ? 0 : userMarginalRate * 100;
    } else {
      taxType = "Capital Gains (LTCG/STCG)";
      taxAmount = gainAmount * 0.10;
      taxRatePercent = 10;
    }
  }

  // Add 4% cess on tax
  taxAmount = taxAmount * 1.04;

  const postTaxGain = gainAmount - taxAmount;
  const nominalReturnRate = investment.expected_return_max || investment.rate || 10;
  const postTaxReturnRate = gainAmount > 0 ? (postTaxGain / gainAmount) * nominalReturnRate : nominalReturnRate;
  
  // Real Return (Inflation Adjusted)
  // using fisher equation: (1+nominal)/(1+inflation) - 1
  const realReturnRate = ((1 + (postTaxReturnRate / 100)) / (1 + inflationRate)) - 1;

  return {
    nominalReturnRate,
    taxAmount,
    postTaxGain,
    postTaxReturnRate,
    taxType,
    taxRatePercent,
    effectivePostTaxCAGR: postTaxReturnRate,
    realReturnRate: realReturnRate * 100
  };
}
