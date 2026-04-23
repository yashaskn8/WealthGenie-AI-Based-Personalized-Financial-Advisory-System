import Joi from 'joi';

/**
 * WealthGenie Request Validation Schemas
 * Uses Joi for runtime input validation on Express routes.
 */

export const profileSchema = Joi.object({
  monthly_income: Joi.number().min(1000).max(10000000).required()
    .messages({ 'number.min': 'Monthly income must be at least ₹1,000' }),
  age: Joi.number().integer().min(18).max(80).required()
    .messages({ 'number.min': 'Age must be at least 18', 'number.max': 'Age must be at most 80' }),
  monthly_savings: Joi.number().min(0).required(),
  regime: Joi.string().valid('new', 'old').default('new'),
}).custom((value, helpers) => {
  if (value.monthly_savings > value.monthly_income) {
    return helpers.error('any.invalid', { message: 'Savings cannot exceed income' });
  }
  return value;
});

export const recommendSchema = Joi.object({
  profileId: Joi.string().hex().length(24).required()
    .messages({ 'string.hex': 'Invalid profile ID format' }),
});

export const monteCarloSchema = Joi.object({
  instrument: Joi.string()
    .valid('FD', 'ELSS', 'Equity_MF', 'ETF', 'Debt_MF',
           'RBI_Bond', 'G-Sec', 'PPF', 'NPS', 'Gold').required(),
  monthly_investment: Joi.number().min(500).max(1000000).required(),
  years: Joi.number().integer().min(1).max(40).required(),
  target_amount: Joi.number().min(0).optional(),
  post_tax_rate: Joi.number().min(0).max(1).optional(),
});

export const goalSchema = Joi.object({
  goal_name: Joi.string().min(2).max(100).required(),
  target_amount: Joi.number().min(1000).required(),
  target_date: Joi.date().iso().greater('now').required()
    .messages({ 'date.greater': 'Target date must be in the future' }),
  current_savings: Joi.number().min(0).default(0),
  profileId: Joi.string().hex().length(24).optional(),
});

/**
 * Express middleware factory for Joi validation.
 * Returns 400 with structured error details on failure.
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }
    req.body = value; // Replace with sanitized/coerced values
    next();
  };
}
