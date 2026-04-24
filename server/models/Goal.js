import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profileId:  { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialProfile', required: true },
  goal_name:  { type: String, required: true },
  target_amount:  { type: Number, required: true },
  target_date:    { type: Date,   required: true },
  current_savings:       { type: Number, default: 0 },
  recommended_sip:       { type: Number },    // computed field
  recommended_instrument: { type: String },
  probability_of_success: { type: Number },   // from Monte Carlo
  gap_amount:             { type: Number },    // shortfall if savings insufficient
  status: {
    type: String,
    enum: ['on_track', 'at_risk', 'off_track'],
    default: 'on_track',
  },
  monte_carlo_summary: {
    p10: Number,
    p25: Number,
    p50: Number,
    p75: Number,
    p90: Number,
    simulations_run: Number,
  },
  gemini_advice: { type: String },
}, { timestamps: true });

GoalSchema.index({ userId: 1, target_date: 1 });
GoalSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Goal', GoalSchema);
