/**
 * SIP Future Value Calculator
 * FV = P × [((1 + r)^n - 1) / r] × (1 + r)
 * where P = monthly deposit, r = monthly rate, n = total months
 */
export function calculateSIPFutureValue(monthlyDeposit, annualReturnPercent, years) {
  if (!years || years <= 0 || !monthlyDeposit || monthlyDeposit <= 0) return 0;
  const monthlyRate = (annualReturnPercent / 100) / 12;
  const totalMonths = years * 12;
  if (monthlyRate === 0) return monthlyDeposit * totalMonths;
  return monthlyDeposit * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
}

/**
 * Lump Sum Future Value Calculator
 * FV = P × (1 + r)^n
 */
export function calculateLumpSumFutureValue(principal, annualReturnPercent, years) {
  if (!years || years <= 0 || !principal || principal <= 0) return 0;
  const rate = annualReturnPercent / 100;
  return principal * Math.pow(1 + rate, years);
}

/**
 * Step-Up SIP Future Value
 * Each year the monthly SIP increases by stepUpPercent
 */
export function calculateStepUpSIPValue(baseSIP, annualReturnPercent, years, stepUpPercent) {
  if (!years || years <= 0 || !baseSIP || baseSIP <= 0) return 0;
  const monthlyRate = (annualReturnPercent / 100) / 12;
  let totalValue = 0;
  let currentSIP = baseSIP;

  for (let year = 1; year <= years; year++) {
    const monthsRemaining = (years - year) * 12 + 12;
    for (let month = 1; month <= 12; month++) {
      const n = monthsRemaining - month + 1;
      if (monthlyRate === 0) {
        totalValue += currentSIP;
      } else {
        totalValue += currentSIP * Math.pow(1 + monthlyRate, n);
      }
    }
    currentSIP = currentSIP * (1 + stepUpPercent / 100);
  }
  return totalValue;
}

/**
 * Year-by-year projection for step-up SIP
 */
export function getStepUpProjectionData(baseSIP, annualReturnPercent, years, stepUpPercent) {
  const flatData = [];
  const stepUpData = [];

  for (let y = 1; y <= years; y++) {
    flatData.push({
      year: `Year ${y}`,
      value: calculateSIPFutureValue(baseSIP, annualReturnPercent, y),
      invested: baseSIP * 12 * y
    });
    stepUpData.push({
      year: `Year ${y}`,
      value: calculateStepUpSIPValue(baseSIP, annualReturnPercent, y, stepUpPercent),
      invested: calculateStepUpTotalInvested(baseSIP, y, stepUpPercent)
    });
  }
  return { flatData, stepUpData };
}

function calculateStepUpTotalInvested(baseSIP, years, stepUpPercent) {
  let total = 0;
  let currentSIP = baseSIP;
  for (let y = 0; y < years; y++) {
    total += currentSIP * 12;
    currentSIP *= (1 + stepUpPercent / 100);
  }
  return total;
}
