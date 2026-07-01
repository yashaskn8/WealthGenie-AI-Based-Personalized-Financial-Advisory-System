import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '../utils/indianNumberFormat';
import { getTaxSavingRecommendations, SECTION_80C_LIMIT, SECTION_80CCD_1B_LIMIT } from '../utils/taxCalculator';
import { investmentDatabase } from '../investmentDatabase';
import { ShieldCheck, Calculator, Wallet, Receipt, Percent, PiggyBank, TrendingDown, Info, Sparkles, IndianRupee, HelpCircle, Layers, ArrowUpRight, CheckCircle2, Heart, ToggleLeft, ToggleRight } from 'lucide-react';
import JargonTooltip from './JargonTooltip';
import api from '../services/api';
import './TaxScreen.css';

// Section 80D limits
const SECTION_80D_SELF_LIMIT = 25000;
const SECTION_80D_SELF_SENIOR_LIMIT = 50000;
const SECTION_80D_PARENTS_LIMIT = 25000;
const SECTION_80D_PARENTS_SENIOR_LIMIT = 50000;

// Local Fallback Calculator (Fully aligned with latest FY2025-26 rules)
function calculateTaxesLocal(grossIncome, section80C, sectionNPS, hra = 0, homeLoanInterest = 0, other = 0, section80D_self = 0, section80D_parents = 0, parentsSenior = false, age = 30) {
  const stdDeductionNew = 75000;
  const taxableNew = Math.max(0, grossIncome - stdDeductionNew);
  let taxNew = 0;
  
  // Slab details for FY 2025-26 New Regime:
  if (taxableNew <= 1200000) {
    taxNew = 0; // Rebate covers taxable income up to 12L under Sec 87A for FY 2025-26
  } else {
    let temp = taxableNew;
    if (temp > 2400000) { taxNew += (temp - 2400000) * 0.30; temp = 2400000; }
    if (temp > 2000000) { taxNew += (temp - 2000000) * 0.25; temp = 2000000; }
    if (temp > 1600000) { taxNew += (temp - 1600000) * 0.20; temp = 1600000; }
    if (temp > 1200000) { taxNew += (temp - 1200000) * 0.15; temp = 1200000; }
    if (temp > 800000) { taxNew += (temp - 800000) * 0.10; temp = 800000; }
    if (temp > 400000) { taxNew += (temp - 400000) * 0.05; }

    // Marginal relief for 87A (tax cannot exceed the excess over â‚¹12,00,000)
    const excessOverLimit = taxableNew - 1200000;
    if (taxNew > excessOverLimit) {
      taxNew = excessOverLimit;
    }
  }
  const taxBeforeCessNew = taxNew;
  taxNew = taxNew * 1.04;

  // Section 80D calculation (Old Regime only)
  const selfSenior = (Number(age) || 30) >= 60;
  const max80DSelf = selfSenior ? SECTION_80D_SELF_SENIOR_LIMIT : SECTION_80D_SELF_LIMIT;
  const max80DParents = parentsSenior ? SECTION_80D_PARENTS_SENIOR_LIMIT : SECTION_80D_PARENTS_LIMIT;
  const allowed80DSelf = Math.min(Number(section80D_self) || 0, max80DSelf);
  const allowed80DParents = Math.min(Number(section80D_parents) || 0, max80DParents);
  const total80D = allowed80DSelf + allowed80DParents;

  const stdDeductionOld = 50000;
  const deductionsOld = Math.min(SECTION_80C_LIMIT, Number(section80C) || 0) + 
                        Math.min(SECTION_80CCD_1B_LIMIT, Number(sectionNPS) || 0) +
                        total80D +
                        (Number(hra) || 0) +
                        Math.min(200000, Number(homeLoanInterest) || 0) +
                        (Number(other) || 0);

  const taxableOld = Math.max(0, grossIncome - stdDeductionOld - deductionsOld);
  let taxOld = 0;
  
  // Slab details for Old Regime
  if (taxableOld <= 500000) {
    taxOld = 0;
  } else {
    let temp = taxableOld;
    if (temp > 1000000) { taxOld += (temp - 1000000) * 0.30; temp = 1000000; }
    if (temp > 500000) { taxOld += (temp - 500000) * 0.20; temp = 500000; }
    if (temp > 250000) { taxOld += (temp - 250000) * 0.05; }
  }
  const taxBeforeCessOld = taxOld;
  taxOld = taxOld * 1.04;

  return {
    taxableNew: Math.round(taxableNew),
    taxNew: Math.round(taxNew),
    taxBeforeCessNew: Math.round(taxBeforeCessNew),
    taxableOld: Math.round(taxableOld),
    taxOld: Math.round(taxOld),
    taxBeforeCessOld: Math.round(taxBeforeCessOld),
    difference: Math.round(Math.abs(taxOld - taxNew)),
    betterRegime: taxNew < taxOld ? 'New' : taxOld < taxNew ? 'Old' : 'Either',
    // Deduction breakdown for comparison matrix
    stdDeductionNew: 75000,
    stdDeductionOld: 50000,
    deductionsOld: Math.round(deductionsOld),
    total80D: Math.round(total80D),
    allowed80DSelf: Math.round(allowed80DSelf),
    allowed80DParents: Math.round(allowed80DParents),
  };
}

function findDeductionCrossoverLocal(grossIncome) {
  const newRegimeTax = calculateTaxesLocal(grossIncome, 0, 0).taxNew;
  if (newRegimeTax === 0) return 0;

  for (let ded = 0; ded <= 600000; ded += 1000) {
    const c80 = Math.min(150000, ded);
    const nps = Math.min(50000, Math.max(0, ded - 150000));
    const testResult = calculateTaxesLocal(grossIncome, c80, nps);
    if (testResult.taxOld <= testResult.taxNew) {
      return ded;
    }
  }
  return null; 
}

function getSlabBreakdownLocal(taxableIncome, isNew) {
  const slabs = isNew 
    ? [
        { limit: 400000, rate: 0.00, label: 'â‚¹0 â€“ â‚¹4L' },
        { limit: 400000, rate: 0.05, label: 'â‚¹4L â€“ â‚¹8L' },
        { limit: 400000, rate: 0.10, label: 'â‚¹8L â€“ â‚¹12L' },
        { limit: 400000, rate: 0.15, label: 'â‚¹12L â€“ â‚¹16L' },
        { limit: 400000, rate: 0.20, label: 'â‚¹16L â€“ â‚¹20L' },
        { limit: 400000, rate: 0.25, label: 'â‚¹20L â€“ â‚¹24L' },
        { limit: Infinity, rate: 0.30, label: 'Above â‚¹24L' }
      ]
    : [
        { limit: 250000, rate: 0.00, label: 'â‚¹0 â€“ â‚¹2.5L' },
        { limit: 250000, rate: 0.05, label: 'â‚¹2.5L â€“ â‚¹5L' },
        { limit: 500000, rate: 0.20, label: 'â‚¹5L â€“ â‚¹10L' },
        { limit: Infinity, rate: 0.30, label: 'Above â‚¹10L' }
      ];

  let remaining = taxableIncome;
  const breakdown = [];
  const qualifiesForRebate = isNew ? taxableIncome <= 1200000 : taxableIncome <= 500000;

  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i];
    const width = slab.limit;
    const rate = slab.rate;
    
    if (remaining <= 0) {
      breakdown.push({ label: slab.label, rate: rate * 100, taxableInSlab: 0, taxInSlab: 0 });
      continue;
    }
    
    const amountInSlab = Math.min(remaining, width);
    const taxInSlab = qualifiesForRebate ? 0 : amountInSlab * rate;
    
    breakdown.push({
      label: slab.label,
      rate: rate * 100,
      taxableInSlab: Math.round(amountInSlab),
      taxInSlab: Math.round(taxInSlab)
    });
    
    remaining -= amountInSlab;
  }
  
  return breakdown;
}

const TaxScreen = ({ profile }) => {
  const defaultIncome = (profile?.monthly_income || 65000) * 12;
  const [annualIncome, setAnnualIncome] = useState(defaultIncome);
  const [regime, setRegime] = useState(profile?.taxRegime || 'new');
  const [existing80C, setExisting80C] = useState('');
  const [existing80CCD, setExisting80CCD] = useState('');
  const [existingHRA, setExistingHRA] = useState('');
  const [existingHomeLoan, setExistingHomeLoan] = useState('');
  const [existingOther, setExistingOther] = useState('');
  const [existing80DSelf, setExisting80DSelf] = useState('');
  const [existing80DParents, setExisting80DParents] = useState('');
  const [parentsSenior, setParentsSenior] = useState(false);
  const [showSlabBreakdown, setShowSlabBreakdown] = useState(false);

  // Server state tracking
  const [serverTaxData, setServerTaxData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [prevIncome, setPrevIncome] = useState(defaultIncome);

  if (defaultIncome !== prevIncome) {
    setPrevIncome(defaultIncome);
    setAnnualIncome(defaultIncome);
    setRegime(profile?.taxRegime || 'new');
  }

  // â”€â”€ Debounced API Synchronisation â”€â”€
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setApiError(null);

    const timer = setTimeout(async () => {
      try {
        const payload = {
          section80C: existing80C === '' ? 0 : Number(existing80C),
          nps80CCD1B: existing80CCD === '' ? 0 : Number(existing80CCD),
          hra: existingHRA === '' ? 0 : Number(existingHRA),
          homeLoanInterest: existingHomeLoan === '' ? 0 : Number(existingHomeLoan),
          other: existingOther === '' ? 0 : Number(existingOther),
          section80D_self: existing80DSelf === '' ? 0 : Number(existing80DSelf),
          section80D_parents: existing80DParents === '' ? 0 : Number(existing80DParents),
          parents_senior: parentsSenior,
          age: profile?.age || 30,
        };
        const response = await api.compareTax(annualIncome, payload);
        if (active) {
          setServerTaxData(response);
          setApiError(null);
        }
      } catch (err) {
        console.error("Backend tax query failed, sliding into high-fidelity local calculator:", err);
        if (active) {
          setApiError(err.message || "Failed to synchronise with tax slabs server.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 450); // Debounce delay prevents API throttling

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [annualIncome, existing80C, existing80CCD, existingHRA, existingHomeLoan, existingOther, existing80DSelf, existing80DParents, parentsSenior, profile?.age]);

  // Fast Local Fallback (instant responses while sliding)
  const localTax = useMemo(() => {
    return calculateTaxesLocal(
      annualIncome, 
      existing80C, 
      existing80CCD, 
      existingHRA, 
      existingHomeLoan, 
      existingOther,
      existing80DSelf,
      existing80DParents,
      parentsSenior,
      profile?.age || 30
    );
  }, [annualIncome, existing80C, existing80CCD, existingHRA, existingHomeLoan, existingOther, existing80DSelf, existing80DParents, parentsSenior, profile?.age]);

  const remaining80C = Math.max(0, SECTION_80C_LIMIT - (Number(existing80C) || 0));
  const remaining80CCD = Math.max(0, SECTION_80CCD_1B_LIMIT - (Number(existing80CCD) || 0));
  const self80DLimit = (Number(profile?.age) || 30) >= 60 ? SECTION_80D_SELF_SENIOR_LIMIT : SECTION_80D_SELF_LIMIT;
  const parents80DLimit = parentsSenior ? SECTION_80D_PARENTS_SENIOR_LIMIT : SECTION_80D_PARENTS_LIMIT;
  const allowed80DSelf = Math.min(self80DLimit, Number(existing80DSelf) || 0);
  const allowed80DParents = Math.min(parents80DLimit, Number(existing80DParents) || 0);

  const taxSavingRecs = useMemo(() => {
    return getTaxSavingRecommendations(remaining80C, remaining80CCD, investmentDatabase);
  }, [remaining80C, remaining80CCD]);

  // Resolve values: backend primary, local fallback secondary
  const totalTax = serverTaxData
    ? (regime === 'new' ? serverTaxData.new_regime.tax : serverTaxData.old_regime.tax)
    : (regime === 'new' ? localTax.taxNew : localTax.taxOld);

  const taxableIncome = serverTaxData
    ? (regime === 'new' ? serverTaxData.new_regime.taxable_income : serverTaxData.old_regime.taxable_income)
    : (regime === 'new' ? localTax.taxableNew : localTax.taxableOld);

  const effectiveRate = serverTaxData
    ? (regime === 'new' ? serverTaxData.new_regime.effective_rate : serverTaxData.old_regime.effective_rate)
    : (annualIncome > 0 ? ((totalTax / annualIncome) * 100).toFixed(1) : 0);

  const standardDeduction = serverTaxData
    ? (regime === 'new' ? serverTaxData.new_regime.standard_deduction : serverTaxData.old_regime.standard_deduction)
    : (regime === 'new' ? 75000 : 50000);

  const taxBeforeCess = serverTaxData
    ? (regime === 'new' ? serverTaxData.new_regime.tax - serverTaxData.new_regime.cess : serverTaxData.old_regime.tax - serverTaxData.old_regime.cess)
    : (regime === 'new' ? localTax.taxBeforeCessNew : localTax.taxBeforeCessOld);

  const marginalRate = taxBeforeCess > 0 ? (taxBeforeCess / taxableIncome) : 0;
  const potentialSaving = regime === 'old' ? Math.round((remaining80C + remaining80CCD) * marginalRate * 1.04) : 0;

  const betterRegime = serverTaxData
    ? (serverTaxData.saving === 0 ? 'Either' : (serverTaxData.recommended_regime === 'new' ? 'New' : 'Old'))
    : localTax.betterRegime;

  const betterRegimeSavings = serverTaxData ? serverTaxData.saving : localTax.difference;

  // Breakdown lists for slabs tables
  const newRegimeSlabs = useMemo(() => {
    const tInc = serverTaxData ? serverTaxData.new_regime.taxable_income : localTax.taxableNew;
    return getSlabBreakdownLocal(tInc, true);
  }, [serverTaxData, localTax.taxableNew]);

  const oldRegimeSlabs = useMemo(() => {
    const tInc = serverTaxData ? serverTaxData.old_regime.taxable_income : localTax.taxableOld;
    return getSlabBreakdownLocal(tInc, false);
  }, [serverTaxData, localTax.taxableOld]);

  const activeSlabs = regime === 'new' ? newRegimeSlabs : oldRegimeSlabs;

  // Crossover breakpoint
  const crossoverBreakpoint = useMemo(() => findDeductionCrossoverLocal(annualIncome), [annualIncome]);
  const currentDeductions = (Number(existing80C) || 0) + (Number(existing80CCD) || 0) + (Number(existingHRA) || 0) + (Number(existingHomeLoan) || 0) + allowed80DSelf + allowed80DParents + (Number(existingOther) || 0);

  const taxOldVal = serverTaxData ? serverTaxData.old_regime.tax : localTax.taxOld;
  const taxNewVal = serverTaxData ? serverTaxData.new_regime.tax : localTax.taxNew;

  const regimeChartData = [
    { label: 'Old Regime', value: taxOldVal, fill: 'url(#colorOld)' },
    { label: 'New Regime', value: taxNewVal, fill: 'url(#colorNew)' },
  ];

  const optimizationChartData = [
    { label: 'Current Tax', value: totalTax, fill: 'url(#colorCurrent)' },
    { label: 'After Optimization', value: Math.max(0, totalTax - potentialSaving), fill: 'url(#colorOpt)' },
  ];

  return (
    <div className="tax-page">
      {/* Visual Ambient Orbs */}
      <div className="tax-bg-orb tax-bg-orb--1" />
      <div className="tax-bg-orb tax-bg-orb--2" />

      <motion.header 
        style={{ marginBottom: 32, textAlign: 'center' }}
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="tax-page-badge">
          <ShieldCheck size={11} style={{ marginRight: 6 }} />
          Tax Optimizer
        </div>
        <h1 className="tax-page-title">Save Money on Taxes</h1>
        <p className="tax-page-subtitle" style={{ color: '#94a3b8' }}>
          Find out how much tax you owe, which tax system saves you more, and discover easy ways to reduce your tax bill.
        </p>
        <div className="tax-header-divider" />
      </motion.header>

      {/* Verdict Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '20px',
          padding: '20px 24px',
          marginBottom: '32px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          backdropFilter: 'blur(20px)',
          textAlign: 'left'
        }}
      >
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '12px', borderRadius: '14px' }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Our Recommendation</h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            {betterRegime !== 'Either' ? (
              <span>You'll pay less tax with the <strong>{betterRegime} Regime</strong> â€” saving <strong>{formatINR(betterRegimeSavings)}</strong> compared to the other option!</span>
            ) : (
              <span>Good news! Both tax systems cost you the same amount â€” so you can pick whichever you prefer.</span>
            )}
          </p>
        </div>
      </motion.div>

      {/* Sync / Loading Indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, fontSize: '0.8rem', color: '#38bdf8', marginBottom: 20
            }}
          >
            <div className="spinner-loader" style={{
              width: 14, height: 14, border: '2px solid rgba(56,189,248,0.2)',
              borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.6s linear infinite'
            }} />
            Calculating your taxes...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Mode Indicator */}
      <AnimatePresence>
        {apiError && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, fontSize: '0.8rem', color: '#fb7185', marginBottom: 20
            }}
          >
            <Info size={14} />
            <span>Using high-fidelity local tax calculator.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Banner for Zero Tax */}
      <AnimatePresence>
        {totalTax === 0 && (
          <motion.div 
            className="tax-zero-banner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="tax-zero-icon"></span>
            <div>
              <div style={{ fontWeight: 800 }}>You Owe Zero Tax!</div>
              <div style={{ fontSize: '0.85rem', color: '#a7f3d0', marginTop: 2 }}>
                Your income is below the tax-free limit â€” you don't need to pay any income tax under the {regime === 'new' ? 'New' : 'Old'} Regime.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inputs Section */}
      <motion.div 
        className="tax-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Gross Income Slider Card */}
        <div className="tax-control-card">
          <div className="tax-control-card-header">
            <div className="tax-control-card-icon" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
              <Wallet size={20} />
            </div>
            <label>Your Yearly Income (before tax)</label>
          </div>
          
          <input 
            type="range" 
            min="300000" 
            max="12000000" 
            step="50000" 
            value={annualIncome}
            onChange={(e) => setAnnualIncome(Number(e.target.value))}
            className="tax-slider"
            style={{ 
              width: '100%', 
              margin: '20px 0', 
              '--val': `${((annualIncome - 300000) / (12000000 - 300000)) * 100}%` 
            }}
          />

          <div className="tax-income-display">{formatINR(annualIncome)}</div>
          <div className="tax-income-sub">
            <span>Monthly: {formatINR(Math.round(annualIncome / 12))}</span>
            <span className="tax-income-badge">FY 2025-26 Slabs</span>
          </div>
        </div>

        {/* Regime Switcher Card */}
        <div className="tax-control-card">
          <div className="tax-control-card-header">
            <div className="tax-control-card-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
              <Calculator size={20} />
            </div>
            <label>Choose Your Tax System</label>
          </div>
          <div className="tax-regime-toggle" style={{ margin: '18px 0' }}>
            <button 
              className={`regime-btn ${regime === 'old' ? 'regime-btn--active' : ''}`} 
              onClick={() => setRegime('old')}
            >
              Old Regime
            </button>
            <button 
              className={`regime-btn ${regime === 'new' ? 'regime-btn--active' : ''}`} 
              onClick={() => setRegime('new')}
            >
              New Regime
            </button>
          </div>
          {betterRegime !== 'Either' ? (
            <div className="tax-better-badge" style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', width: '100%', boxSizing: 'border-box' }}>
              <CheckCircle2 size={14} style={{ marginRight: 6, flexShrink: 0 }} />
              <span><strong>Tip:</strong> The {betterRegime} Regime saves you <strong>{formatINR(betterRegimeSavings)}</strong></span>
            </div>
          ) : (
            <div className="tax-better-badge" style={{ backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8', width: '100%', boxSizing: 'border-box' }}>
              <Info size={14} style={{ marginRight: 6, flexShrink: 0 }} />
              <span>Both systems charge the same tax. You can pick either one.</span>
            </div>
          )}
        </div>

        {/* Tax-Saving Deductions Panel (Old Regime Only) */}
        <AnimatePresence>
          {regime === 'old' && (
            <motion.div 
              style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {/* 80C Deduction */}
              <div className="tax-control-card" style={{ padding: 18 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  <JargonTooltip term="Section 80C">Tax-Saving Investments</JargonTooltip>
                </label>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                  PPF, ELSS, Life Insurance, Tax-saver FD, etc.
                </div>
                <input 
                  type="number" 
                  value={existing80C} 
                  onChange={e => setExisting80C(e.target.value === '' ? '' : Math.min(SECTION_80C_LIMIT, Number(e.target.value)))} 
                  max={SECTION_80C_LIMIT} 
                  className="tax-input" 
                  placeholder="0"
                />
                <div className="tax-input-hint">Limit: {formatINR(SECTION_80C_LIMIT)} per year</div>
              </div>

              {/* NPS 80CCD */}
              <div className="tax-control-card" style={{ padding: 18 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  <JargonTooltip term="NPS">Pension (NPS) Savings</JargonTooltip>
                </label>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                  Extra â‚¹50K deduction for NPS contributions
                </div>
                <input 
                  type="number" 
                  value={existing80CCD} 
                  onChange={e => setExisting80CCD(e.target.value === '' ? '' : Math.min(SECTION_80CCD_1B_LIMIT, Number(e.target.value)))} 
                  max={SECTION_80CCD_1B_LIMIT} 
                  className="tax-input" 
                  placeholder="0"
                />
                <div className="tax-input-hint">Limit: {formatINR(SECTION_80CCD_1B_LIMIT)} per year</div>
              </div>

              {/* HRA Exemption */}
              <div className="tax-control-card" style={{ padding: 18 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Rent Allowance (HRA)
                </label>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                  Tax-free portion of your rent allowance from salary
                </div>
                <input 
                  type="number" 
                  value={existingHRA} 
                  onChange={e => setExistingHRA(e.target.value === '' ? '' : Number(e.target.value))} 
                  className="tax-input" 
                  placeholder="0"
                />
                <div className="tax-input-hint">Enter the HRA exemption amount from your salary slip</div>
              </div>

              {/* Home Loan Interest (Sec 24b) */}
              <div className="tax-control-card" style={{ padding: 18 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Home Loan Interest
                </label>
                <input 
                  type="number" 
                  value={existingHomeLoan} 
                  onChange={e => setExistingHomeLoan(e.target.value === '' ? '' : Math.min(200000, Number(e.target.value)))} 
                  max={200000} 
                  className="tax-input" 
                  placeholder="0"
                />
                <div className="tax-input-hint">Yearly interest on your home loan (limit: {formatINR(200000)})</div>
              </div>

              {/* Medical Insurance 80D - Self/Family */}
              <div className="tax-control-card" style={{ padding: 18 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Heart size={13} /> Medical Insurance
                </label>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                  Self, spouse, and children under Section 80D
                </div>
                <input
                  type="number"
                  value={existing80DSelf}
                  onChange={e => setExisting80DSelf(e.target.value === '' ? '' : Math.min(self80DLimit, Number(e.target.value)))}
                  max={self80DLimit}
                  className="tax-input"
                  placeholder="0"
                />
                <div className="tax-input-hint">Limit: {formatINR(self80DLimit)} per year</div>
              </div>

              {/* Medical Insurance 80D - Parents */}
              <div className="tax-control-card" style={{ padding: 18 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Heart size={13} /> Parent Insurance
                </label>
                <button
                  type="button"
                  onClick={() => setParentsSenior(prev => !prev)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: parentsSenior ? '#34d399' : '#94a3b8', padding: '6px 8px', marginBottom: 8, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                >
                  {parentsSenior ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  Senior citizen parents
                </button>
                <input
                  type="number"
                  value={existing80DParents}
                  onChange={e => setExisting80DParents(e.target.value === '' ? '' : Math.min(parents80DLimit, Number(e.target.value)))}
                  max={parents80DLimit}
                  className="tax-input"
                  placeholder="0"
                />
                <div className="tax-input-hint">Limit: {formatINR(parents80DLimit)} per year</div>
              </div>

              {/* Other Deductions */}
              <div className="tax-control-card" style={{ padding: 18, gridColumn: 'span 3' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Other Deductions
                </label>
                <input 
                  type="number" 
                  value={existingOther} 
                  onChange={e => setExistingOther(e.target.value === '' ? '' : Number(e.target.value))} 
                  className="tax-input" 
                  placeholder="0"
                />
                <div className="tax-input-hint">LTA, education loan interest, donations, and other eligible deductions.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tax Summary KPIs Grid */}
      <motion.div 
        className="tax-summary-grid"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><Wallet size={20} /></div>
          <span className="tax-sum-label">Taxable Income</span>
          <span className="tax-sum-value" style={{ color: '#fff' }}>{formatINR(taxableIncome)}</span>
        </div>
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><Receipt size={20} /></div>
          <span className="tax-sum-label">Estimated Tax Owed</span>
          <span className="tax-sum-value">{formatINR(totalTax)}</span>
        </div>
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><Percent size={20} /></div>
          <span className="tax-sum-label">Effective Tax Rate</span>
          <span className="tax-sum-value" style={{ color: '#a78bfa' }}>{effectiveRate}%</span>
        </div>
        <div className="tax-summary-card">
          <div className="tax-sum-icon"><PiggyBank size={20} /></div>
          <span className="tax-sum-label">Potential Tax Savings</span>
          <span className="tax-sum-value">{formatINR(potentialSaving)}</span>
        </div>
      </motion.div>

      {/* Crossover Threshold Breakpoint Advisories */}
      {crossoverBreakpoint !== null && crossoverBreakpoint > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(139,92,246,0.04) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 20, padding: 24, marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start'
          }}
        >
          <Sparkles size={24} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0' }}>When Should You Switch Regimes?</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              With your income of <strong>{formatINR(annualIncome)}</strong>, you need at least <strong>{formatINR(crossoverBreakpoint)}</strong> in deductions for the Old Regime to be cheaper.
              {currentDeductions >= crossoverBreakpoint ? (
                <span> You already have <strong>{formatINR(currentDeductions)}</strong> in deductions â€” great, the <strong>Old Regime saves you more money</strong>!</span>
              ) : (
                <span> Right now you have <strong>{formatINR(currentDeductions)}</strong> in deductions. If you invest <strong>{formatINR(crossoverBreakpoint - currentDeductions)}</strong> more in tax-saving options, the <strong>Old Regime becomes cheaper</strong>.</span>
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* Toggle Slab Details */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, marginTop: 24 }}>
        <button
          onClick={() => setShowSlabBreakdown(!showSlabBreakdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 20px',
            color: '#38bdf8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          {showSlabBreakdown ? 'Hide Detailed Breakdown' : 'Show Detailed Tax Breakdown & Charts'}
        </button>
      </div>

      {showSlabBreakdown && (
        <>
          {/* Slab Breakdown Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 32 }}>
            {/* Slabs table */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="#38bdf8" />
                How Your Tax is Calculated ({regime === 'new' ? 'New' : 'Old'} Regime)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Slab Bracket</th>
                    <th style={{ padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Tax Rate</th>
                    <th style={{ padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Taxable Amount</th>
                    <th style={{ padding: '12px 8px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Calculated Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSlabs.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: s.taxableInSlab > 0 ? 'rgba(56,189,248,0.02)' : 'transparent' }}>
                      <td style={{ padding: '14px 8px', fontWeight: 600, color: s.taxableInSlab > 0 ? '#fff' : '#64748b' }}>{s.label}</td>
                      <td style={{ padding: '14px 8px', color: s.taxableInSlab > 0 ? '#cbd5e1' : '#64748b' }}>{s.rate}%</td>
                      <td style={{ padding: '14px 8px', color: s.taxableInSlab > 0 ? '#fff' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>{formatINR(s.taxableInSlab)}</td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 700, color: s.taxInSlab > 0 ? '#f59e0b' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {s.taxInSlab > 0 ? formatINR(s.taxInSlab) : 'Nil'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Smart Insights Panel */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#fbbf24" />
                Helpful Insights
              </h3>
              <div className="tax-insight-items" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="tax-insight-item" style={{ display: 'flex', gap: 14, padding: 12 }}>
                  <div className="tax-insight-icon" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center' }}><IndianRupee size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>Monthly Tax from Salary</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                      About {formatINR(Math.round(totalTax / 12))}/month will be deducted from your salary as <JargonTooltip term="TDS">TDS</JargonTooltip>.
                    </div>
                  </div>
                </div>

                <div className="tax-insight-item" style={{ display: 'flex', gap: 14, padding: 12 }}>
                  <div className="tax-insight-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center' }}><TrendingDown size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>What You Take Home</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                      About {formatINR(Math.round((annualIncome - totalTax) / 12))}/month in your bank account after tax.
                    </div>
                  </div>
                </div>

                <div className="tax-insight-item" style={{ display: 'flex', gap: 14, padding: 12 }}>
                  <div className="tax-insight-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center' }}><Info size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>Extra Charges on Tax</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                      {serverTaxData?.new_regime.marginal_relief_applied || serverTaxData?.old_regime.marginal_relief_applied 
                        ? `Marginal relief has been dynamically applied by server: ${formatINR(serverTaxData?.new_regime.marginal_relief_applied ? serverTaxData.new_regime.marginal_relief_amount : serverTaxData.old_regime.marginal_relief_amount)} saved.`
                        : "A small 4% extra charge (called 'cess') is added on top of your tax â€” it funds healthcare and education."}
                    </div>
                  </div>
                </div>

                <div className="tax-insight-item" style={{ display: 'flex', gap: 14, padding: 12 }}>
                  <div className="tax-insight-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center' }}><HelpCircle size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>Automatic Tax-Free Amount</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                      The government automatically exempts <strong>{formatINR(standardDeduction)}</strong> of your income from tax â€” no paperwork needed!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Layout: Chart + Recommendations */}
          <div className="tax-two-col">
            {/* Old vs New Regime Comparison Chart */}
            <motion.div 
              className="tax-chart-wrapper"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3>Old vs New Regime â€” Which Costs Less?</h3>
              <div style={{ width: '100%', height: 300 }} className="tax-bar-chart-glow">
                <ResponsiveContainer>
                  <BarChart data={regimeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorOld" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#0369a1" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} />
                    <YAxis tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                    <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                    <Bar dataKey="value" name="Tax Payable" radius={[10, 10, 0, 0]} barSize={80}>
                      {regimeChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Slabs optimization chart (only Old regime) */}
            <div className="tax-chart-wrapper">
              <h3>Before vs After Tax-Saving Investments</h3>
              {totalTax > 0 && regime === 'old' && potentialSaving > 0 ? (
                <div style={{ width: '100%', height: 300 }} className="tax-bar-chart-glow">
                  <ResponsiveContainer>
                    <BarChart data={optimizationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                      <defs>
                        <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#15803d" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} />
                      <YAxis tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                      <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                      <Bar dataKey="value" name="Tax Payable" radius={[10, 10, 0, 0]} barSize={80}>
                        {optimizationChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '0 20px', minHeight: 300 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <Info size={36} color="#475569" />
                    Tax-saving deductions only apply in the Old Regime. In the New Regime, you get lower tax rates instead â€” no need to make special investments.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Slabs Limits Progress (Only for Old Regime) */}
      {regime === 'old' && (
        <div className="tax-limits-row">
          <div className="tax-limit-card">
            <div className="tax-limit-header"><JargonTooltip term="Section 80C">Tax-Saving Investments (80C)</JargonTooltip> â€” How Much You've Used</div>
            <div className="tax-limit-bar-track">
              <div className="tax-limit-bar-fill" style={{ width: `${((SECTION_80C_LIMIT - remaining80C) / SECTION_80C_LIMIT) * 100}%` }} />
            </div>
            <div className="tax-limit-info">
              Deductions Claimed: {formatINR(SECTION_80C_LIMIT - remaining80C)} / {formatINR(SECTION_80C_LIMIT)}
              <span>Remaining: {formatINR(remaining80C)}</span>
            </div>
          </div>
          <div className="tax-limit-card">
            <div className="tax-limit-header"><JargonTooltip term="Section 80CCD(1B)">Pension (NPS) Deduction</JargonTooltip> â€” How Much You've Used</div>
            <div className="tax-limit-bar-track">
              <div className="tax-limit-bar-fill tax-limit-bar-fill--purple" style={{ width: `${((SECTION_80CCD_1B_LIMIT - remaining80CCD) / SECTION_80CCD_1B_LIMIT) * 100}%` }} />
            </div>
            <div className="tax-limit-info">
              Deductions Claimed: {formatINR(SECTION_80CCD_1B_LIMIT - remaining80CCD)} / {formatINR(SECTION_80CCD_1B_LIMIT)}
              <span>Remaining: {formatINR(remaining80CCD)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tax-saving Instruments Suggestions */}
      {regime === 'old' && taxSavingRecs.length > 0 && (
        <motion.div 
          className="tax-recs-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: 24 }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PiggyBank size={22} color="#34d399" />
            Smart Ways to Save on Taxes
          </h3>
          <div className="tax-recs-grid">
            {taxSavingRecs.map((rec, i) => (
              <motion.div 
                key={rec.id + rec.section} 
                className="tax-rec-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + (i * 0.05) }}
                whileHover={{ y: -4, scale: 1.01 }}
              >
                <div className="tax-rec-name" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{rec.name}</div>
                <div className="tax-rec-section">Saves tax under Section {rec.section}</div>
                <div className="tax-rec-amount" style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', margin: '14px 0 6px' }}>Limit: up to {formatINR(rec.suggestedAmount)}</div>
                <div className="tax-rec-return" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Expected growth: {Number(rec.expected_return_min).toFixed(0)}% â€“ {Number(rec.expected_return_max).toFixed(0)}% per year</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TaxScreen;
