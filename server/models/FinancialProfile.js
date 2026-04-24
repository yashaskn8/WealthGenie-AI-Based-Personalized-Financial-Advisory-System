import mongoose from 'mongoose';

const financialProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  income: { type: Number, required: true },
  age: { type: Number, required: true },
  savings: { type: Number, required: true },
  annualIncome: { type: Number, required: true },
  taxSlab: { type: Number },
  effectiveTaxRate: { type: Number },
  taxRegime: { type: String, enum: ['new', 'old'], default: 'new' },
  riskCategory: { type: String },
  riskDescription: { type: String },
  recommendedEquityAllocation: { type: Number },
  investableAmount: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

financialProfileSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('FinancialProfile', financialProfileSchema);
