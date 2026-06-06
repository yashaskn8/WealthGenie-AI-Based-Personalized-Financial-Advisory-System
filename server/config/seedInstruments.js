import 'dotenv/config';
import mongoose from 'mongoose';
import Instrument from '../models/Instrument.js';

const SEED_DATA = [
  // ═══ FIXED DEPOSITS — 15 Banks ═══
  { name: 'SBI Fixed Deposit', type: 'FD', category: 'Public Bank', provider: 'SBI', interestRate: 6.8, interestRateSenior: 7.3, riskLevel: 'Low', lockInYears: 0, minInvestment: 1000, tdsApplicable: true, prematureWithdrawalPenalty: '0.5-1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'HDFC Bank FD', type: 'FD', category: 'Private Bank', provider: 'HDFC', interestRate: 7.1, interestRateSenior: 7.6, riskLevel: 'Low', lockInYears: 0, minInvestment: 5000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'ICICI Bank FD', type: 'FD', category: 'Private Bank', provider: 'ICICI', interestRate: 7.0, interestRateSenior: 7.5, riskLevel: 'Low', lockInYears: 0, minInvestment: 5000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Axis Bank FD', type: 'FD', category: 'Private Bank', provider: 'Axis', interestRate: 7.1, interestRateSenior: 7.6, riskLevel: 'Low', lockInYears: 0, minInvestment: 5000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Kotak Mahindra FD', type: 'FD', category: 'Private Bank', provider: 'Kotak', interestRate: 7.25, interestRateSenior: 7.75, riskLevel: 'Low', lockInYears: 0, minInvestment: 5000, tdsApplicable: true, prematureWithdrawalPenalty: '0.5%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Yes Bank FD', type: 'FD', category: 'Private Bank', provider: 'Yes Bank', interestRate: 7.75, interestRateSenior: 8.25, riskLevel: 'Low', lockInYears: 0, minInvestment: 10000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'IndusInd Bank FD', type: 'FD', category: 'Private Bank', provider: 'IndusInd', interestRate: 7.99, interestRateSenior: 8.49, riskLevel: 'Low', lockInYears: 0, minInvestment: 10000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Canara Bank FD', type: 'FD', category: 'Public Bank', provider: 'Canara', interestRate: 6.7, interestRateSenior: 7.2, riskLevel: 'Low', lockInYears: 0, minInvestment: 1000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'PNB Fixed Deposit', type: 'FD', category: 'Public Bank', provider: 'PNB', interestRate: 6.8, interestRateSenior: 7.3, riskLevel: 'Low', lockInYears: 0, minInvestment: 1000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Bank of Baroda FD', type: 'FD', category: 'Public Bank', provider: 'BoB', interestRate: 6.8, interestRateSenior: 7.3, riskLevel: 'Low', lockInYears: 0, minInvestment: 1000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'AU Small Finance Bank FD', type: 'FD', category: 'Small Finance', provider: 'AU SFB', interestRate: 8.0, interestRateSenior: 8.5, riskLevel: 'Medium', lockInYears: 0, minInvestment: 1000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Ujjivan SFB FD', type: 'FD', category: 'Small Finance', provider: 'Ujjivan', interestRate: 8.25, interestRateSenior: 8.75, riskLevel: 'Medium', lockInYears: 0, minInvestment: 1000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Jana SFB Fixed Deposit', type: 'FD', category: 'Small Finance', provider: 'Jana SFB', interestRate: 8.0, interestRateSenior: 8.5, riskLevel: 'Medium', lockInYears: 0, minInvestment: 1000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'IDFC First Bank FD', type: 'FD', category: 'Private Bank', provider: 'IDFC First', interestRate: 7.75, interestRateSenior: 8.25, riskLevel: 'Low', lockInYears: 0, minInvestment: 10000, tdsApplicable: true, prematureWithdrawalPenalty: '0.5%', sovereignGuarantee: false, taxation: 'Slab Rate' },
  { name: 'Federal Bank FD', type: 'FD', category: 'Private Bank', provider: 'Federal', interestRate: 7.4, interestRateSenior: 7.9, riskLevel: 'Low', lockInYears: 0, minInvestment: 5000, tdsApplicable: true, prematureWithdrawalPenalty: '1%', sovereignGuarantee: false, taxation: 'Slab Rate' },

  // ═══ MUTUAL FUNDS — 10 Funds ═══
  { name: 'Mirae Asset ELSS Tax Saver', type: 'Mutual_Fund', category: 'ELSS', subCategory: 'Equity - ELSS', provider: 'Mirae Asset', nav: 42.5, aumCr: 22500, expenseRatio: 0.58, returns1yr: 28.5, returns3yr: 18.2, returns5yr: 16.8, riskLevel: 'High', lockInYears: 3, minInvestment: 500, exitLoad: 'Nil', sebiRating: '5-Star', taxation: 'LTCG 12.5% above 1.25L' },
  { name: 'Axis Long Term Equity ELSS', type: 'Mutual_Fund', category: 'ELSS', subCategory: 'Equity - ELSS', provider: 'Axis AMC', nav: 78.3, aumCr: 35600, expenseRatio: 0.63, returns1yr: 22.1, returns3yr: 14.5, returns5yr: 15.2, riskLevel: 'High', lockInYears: 3, minInvestment: 500, exitLoad: 'Nil', sebiRating: '4-Star', taxation: 'LTCG 12.5% above 1.25L' },
  { name: 'Parag Parikh Flexi Cap Fund', type: 'Mutual_Fund', category: 'Equity', subCategory: 'Flexi Cap', provider: 'PPFAS', nav: 68.9, aumCr: 54200, expenseRatio: 0.63, returns1yr: 25.8, returns3yr: 19.1, returns5yr: 18.5, riskLevel: 'High', lockInYears: 0, minInvestment: 1000, exitLoad: '1% if < 365 days', sebiRating: '5-Star', taxation: 'LTCG 12.5% above 1.25L' },
  { name: 'SBI Bluechip Fund', type: 'Mutual_Fund', category: 'Equity', subCategory: 'Large Cap', provider: 'SBI MF', nav: 82.1, aumCr: 42300, expenseRatio: 0.81, returns1yr: 18.2, returns3yr: 14.8, returns5yr: 14.1, riskLevel: 'High', lockInYears: 0, minInvestment: 500, exitLoad: '1% if < 1 year', sebiRating: '4-Star', taxation: 'LTCG 12.5% above 1.25L' },
  { name: 'HDFC Mid-Cap Opportunities', type: 'Mutual_Fund', category: 'Equity', subCategory: 'Mid Cap', provider: 'HDFC AMC', nav: 145.6, aumCr: 58700, expenseRatio: 0.75, returns1yr: 32.4, returns3yr: 24.1, returns5yr: 19.8, riskLevel: 'Very High', lockInYears: 0, minInvestment: 500, exitLoad: '1% if < 1 year', sebiRating: '5-Star', taxation: 'LTCG 12.5% above 1.25L' },
  { name: 'ICICI Prudential Liquid Fund', type: 'Mutual_Fund', category: 'Debt', subCategory: 'Liquid', provider: 'ICICI Pru', nav: 345.2, aumCr: 48900, expenseRatio: 0.20, returns1yr: 7.2, returns3yr: 6.1, returns5yr: 5.8, riskLevel: 'Low', lockInYears: 0, minInvestment: 500, exitLoad: 'Graded exit load up to 7 days', sebiRating: '4-Star', taxation: 'Slab Rate' },
  { name: 'HDFC Short Duration Debt Fund', type: 'Mutual_Fund', category: 'Debt', subCategory: 'Short Duration', provider: 'HDFC AMC', nav: 28.7, aumCr: 18500, expenseRatio: 0.35, returns1yr: 7.8, returns3yr: 6.9, returns5yr: 7.1, riskLevel: 'Low', lockInYears: 0, minInvestment: 500, exitLoad: 'Nil', sebiRating: '4-Star', taxation: 'Slab Rate' },
  { name: 'SBI Corporate Bond Fund', type: 'Mutual_Fund', category: 'Debt', subCategory: 'Corporate Bond', provider: 'SBI MF', nav: 14.2, aumCr: 12300, expenseRatio: 0.32, returns1yr: 7.5, returns3yr: 6.8, returns5yr: 7.0, riskLevel: 'Medium', lockInYears: 0, minInvestment: 500, exitLoad: 'Nil', sebiRating: '3-Star', taxation: 'Slab Rate' },
  { name: 'Kotak Balanced Advantage Fund', type: 'Mutual_Fund', category: 'Hybrid', subCategory: 'Balanced Advantage', provider: 'Kotak AMC', nav: 18.5, aumCr: 16800, expenseRatio: 0.52, returns1yr: 15.2, returns3yr: 12.8, returns5yr: 11.5, riskLevel: 'Medium', lockInYears: 0, minInvestment: 500, exitLoad: '1% if < 1 year', sebiRating: '4-Star', taxation: 'LTCG 12.5% above 1.25L' },
  { name: 'Nippon India ETF Nifty 50', type: 'Mutual_Fund', category: 'ETF', subCategory: 'Index ETF', provider: 'Nippon AMC', nav: 245.8, aumCr: 21200, expenseRatio: 0.05, returns1yr: 16.5, returns3yr: 14.2, returns5yr: 13.8, riskLevel: 'Medium', lockInYears: 0, minInvestment: 500, exitLoad: 'Nil', sebiRating: '4-Star', taxation: 'LTCG 12.5% above 1.25L' },

  // ═══ ETFs — 5 ═══
  { name: 'Nippon India Nifty BeES', type: 'ETF', category: 'Index', underlyingIndex: 'Nifty 50', provider: 'Nippon AMC', expenseRatio: 0.04, returns1yr: 16.5, returns3yr: 14.2, riskLevel: 'Medium', minInvestment: 500, exchange: 'NSE', trackingError: 0.03, taxation: 'LTCG 12.5%' },
  { name: 'SBI ETF Sensex', type: 'ETF', category: 'Index', underlyingIndex: 'BSE Sensex', provider: 'SBI MF', expenseRatio: 0.05, returns1yr: 15.8, returns3yr: 13.9, riskLevel: 'Medium', minInvestment: 500, exchange: 'BSE', trackingError: 0.04, taxation: 'LTCG 12.5%' },
  { name: 'HDFC Gold ETF', type: 'ETF', category: 'Commodity', underlyingIndex: 'Gold Price', provider: 'HDFC AMC', expenseRatio: 0.59, returns1yr: 12.5, returns3yr: 10.8, riskLevel: 'Medium', minInvestment: 1000, exchange: 'NSE', trackingError: 0.15, taxation: 'LTCG 12.5%' },
  { name: 'Nippon India Gold BeES', type: 'ETF', category: 'Commodity', underlyingIndex: 'Gold Price', provider: 'Nippon AMC', expenseRatio: 0.82, returns1yr: 12.3, returns3yr: 10.5, riskLevel: 'Medium', minInvestment: 500, exchange: 'NSE', trackingError: 0.18, taxation: 'LTCG 12.5%' },
  { name: 'Mirae Asset NYSE FANG+ ETF', type: 'ETF', category: 'International', underlyingIndex: 'NYSE FANG+', provider: 'Mirae Asset', expenseRatio: 0.58, returns1yr: 35.2, returns3yr: 22.5, riskLevel: 'Very High', minInvestment: 1000, exchange: 'NSE', trackingError: 0.25, taxation: 'LTCG 12.5%' },

  // ═══ GOVERNMENT INSTRUMENTS — 4 ═══
  { name: 'RBI Floating Rate Savings Bonds', type: 'Government', category: 'RBI Bond', issuer: 'RBI', interestRate: 8.05, maturityYears: 7, riskLevel: 'Very Low', lockInYears: 7, minInvestment: 1000, sovereignGuarantee: true, tdsApplicable: false, taxation: 'Slab Rate' },
  { name: '10-Year Government Security', type: 'Government', category: 'G-Sec', issuer: 'Government of India', interestRate: 7.18, maturityYears: 10, riskLevel: 'Very Low', lockInYears: 0, minInvestment: 10000, sovereignGuarantee: true, tdsApplicable: false, taxation: 'STCG at Slab / LTCG at 12.5%' },
  { name: '364-Day Treasury Bill', type: 'Government', category: 'T-Bill', issuer: 'Government of India', interestRate: 6.85, maturityYears: 1, riskLevel: 'Very Low', lockInYears: 0, minInvestment: 25000, sovereignGuarantee: true, tdsApplicable: false, taxation: 'STCG at Slab Rate' },
  { name: '5-Year Government Security', type: 'Government', category: 'G-Sec', issuer: 'Government of India', interestRate: 7.05, maturityYears: 5, riskLevel: 'Very Low', lockInYears: 0, minInvestment: 10000, sovereignGuarantee: true, tdsApplicable: false, taxation: 'STCG at Slab / LTCG at 12.5%' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Instrument.deleteMany({});
    console.log('Cleared existing instruments');

    await Instrument.insertMany(SEED_DATA);
    console.log(`Seeded ${SEED_DATA.length} instruments successfully`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
