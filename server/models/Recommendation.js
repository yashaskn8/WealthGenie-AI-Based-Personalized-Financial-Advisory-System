import mongoose from 'mongoose';

const instrumentDetailSchema = new mongoose.Schema({
  name: String,
  type: String,
  nominalReturn: Number,
  postTaxReturn: Number,
  effectiveYield: Number,
  riskLevel: String,
  lockIn: Number,
  tags: [String],
  taxNotes: String,
  sharpeRatio: Number,
  allocationWeight: Number,
}, { _id: false });

const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialProfile', required: true },
  instruments: [instrumentDetailSchema],
  advisoryText: { type: String },
  confidenceScores: { type: mongoose.Schema.Types.Mixed },
  mlFallback: { type: Boolean, default: false },
  generatedAt: { type: Date, default: Date.now },
});

recommendationSchema.index({ userId: 1, generatedAt: -1 });
recommendationSchema.index({ profileId: 1 });

export default mongoose.model('Recommendation', recommendationSchema);
