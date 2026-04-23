/**
 * Indian Income Tax Calculator
 * Supports Old and New Regime for FY 2024-25
 */

const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: Infinity, rate: 30 },
];

const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 700000, rate: 5 },
  { min: 700000, max: 1000000, rate: 10 },
  { min: 1000000, max: 1200000, rate: 15 },
  { min: 1200000, max: 1500000, rate: 20 },
  { min: 1500000, max: Infinity, rate: 30 },
];

export const SECTION_80C_LIMIT = 150000;
export const SECTION_80CCD_1B_LIMIT = 50000;

function calculateTaxFromSlabs(taxableIncome, slabs) {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.min) break;
    const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
    tax += taxableInSlab * (slab.rate / 100);
  }
  return tax;
}

/**
 * Calculates full tax breakdown
 * @param {number} annualIncome - Gross annual income
 * @param {string} regime - "old" or "new"
 * @param {number} existing80C - Already claimed 80C deductions
 * @param {number} existing80CCD - Already claimed 80CCD(1B) deductions
 * @returns {{taxableIncome, taxPayable, remaining80C, remaining80CCD, effectiveRate, slabs}}
 */
export function calculateTax(annualIncome, regime = 'old', existing80C = 0, existing80CCD = 0) {
  const slabs = regime === 'old' ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  
  let deductions = 0;
  let remaining80C = 0;
  let remaining80CCD = 0;

  if (regime === 'old') {
    const used80C = Math.min(existing80C, SECTION_80C_LIMIT);
    const used80CCD = Math.min(existing80CCD, SECTION_80CCD_1B_LIMIT);
    remaining80C = SECTION_80C_LIMIT - used80C;
    remaining80CCD = SECTION_80CCD_1B_LIMIT - used80CCD;
    deductions = used80C + used80CCD + 50000; // Standard deduction
  } else {
    deductions = 75000; // New regime standard deduction FY 24-25
  }

  const taxableIncome = Math.max(0, annualIncome - deductions);
  let taxPayable = calculateTaxFromSlabs(taxableIncome, slabs);

  // Section 87A Rebate
  if (regime === 'new' && taxableIncome <= 700000) {
    taxPayable = 0;
  } else if (regime === 'old' && taxableIncome <= 500000) {
    taxPayable = 0;
  }

  const cess = taxPayable * 0.04;
  const totalTax = taxPayable + cess;
  const effectiveRate = annualIncome > 0 ? ((totalTax / annualIncome) * 100).toFixed(1) : 0;

  return {
    annualIncome,
    deductions,
    taxableIncome,
    taxBeforeCess: taxPayable,
    cess,
    totalTax,
    effectiveRate,
    remaining80C,
    remaining80CCD,
    regime,
    slabs
  };
}

/**
 * Helper to check if an investment qualifies for a given tax section.
 * Supports both old schema (tax_section string) and new schema (taxType field).
 */
function matchesTaxSection(inv, sectionStr) {
  // New schema
  if (inv.taxType) {
    if (sectionStr === '80C') {
      return inv.taxType === 'eee' || inv.taxType === 'elss';
    }
    if (sectionStr === '80CCD') {
      return inv.taxType === 'nps';
    }
  }
  // Old schema fallback
  if (inv.tax_section) {
    return inv.tax_section.includes(sectionStr);
  }
  return false;
}

/**
 * Returns tax-saving investment recommendations to fill the gap
 */
export function getTaxSavingRecommendations(remaining80C, remaining80CCD, investments) {
  const recs = [];

  if (remaining80C > 0) {
    const eligible = investments.filter(inv => matchesTaxSection(inv, '80C'));
    eligible.forEach(inv => {
      recs.push({
        ...inv,
        // Ensure these fields exist for display
        name: inv.name,
        id: inv.id,
        expected_return_min: inv.expected_return_min || (inv.rate ? inv.rate * 0.85 : 0),
        expected_return_max: inv.expected_return_max || inv.rate || 0,
        suggestedAmount: Math.min(remaining80C, 150000),
        section: '80C',
        maxDeduction: SECTION_80C_LIMIT
      });
    });
  }

  if (remaining80CCD > 0) {
    const eligible = investments.filter(inv => matchesTaxSection(inv, '80CCD'));
    eligible.forEach(inv => {
      recs.push({
        ...inv,
        name: inv.name,
        id: inv.id,
        expected_return_min: inv.expected_return_min || (inv.rate ? inv.rate * 0.85 : 0),
        expected_return_max: inv.expected_return_max || inv.rate || 0,
        suggestedAmount: remaining80CCD,
        section: '80CCD(1B)',
        maxDeduction: SECTION_80CCD_1B_LIMIT
      });
    });
  }

  return recs;
}
