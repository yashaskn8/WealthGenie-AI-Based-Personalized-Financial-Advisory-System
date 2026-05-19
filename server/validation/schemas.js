import Joi from 'joi';

/**
 * WealthGenie Request Validation Schemas
 * Uses Joi for runtime input validation on Express routes.
 */

// ── Reusable field definitions ─────────────────────────────────────
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format');

// ── Auth Schemas ───────────────────────────────────────────────────
export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'string.min': 'Name must be at least 2 characters' }),
  email: Joi.string().trim().lowercase().email().max(254).required()
    .messages({ 'string.email': 'Please provide a valid email address' }),
  password: Joi.string().min(8).max(128).required()
    .messages({ 'string.min': 'Password must be at least 8 characters' }),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required()
    .messages({ 'string.email': 'Please provide a valid email address' }),
  password: Joi.string().min(1).required()
    .messages({ 'any.required': 'Password is required' }),
});

// ── Profile Schema ─────────────────────────────────────────────────
export const profileSchema = Joi.object({
  monthly_income: Joi.number().min(1000).max(100000000).required()
    .messages({
      'number.min': 'Monthly income must be at least ₹1,000',
      'number.max': 'Monthly income cannot exceed ₹10,00,00,000',
    }),
  age: Joi.number().integer().min(18).max(80).required()
    .messages({ 'number.min': 'Age must be at least 18', 'number.max': 'Age must be at most 80' }),
  monthly_savings: Joi.number().min(500).max(100000000).required()
    .messages({
      'number.min': 'Monthly savings must be at least ₹500',
      'number.max': 'Monthly savings cannot exceed ₹10,00,00,000',
    }),
  regime: Joi.string().valid('new', 'old').default('new'),
  investment_horizon: Joi.number().integer().min(1).max(40).default(15),
}).custom((value, helpers) => {
  if (value.monthly_savings >= value.monthly_income) {
    return helpers.error('any.custom', { message: 'Monthly savings (₹' + value.monthly_savings.toLocaleString('en-IN') + ') must be less than monthly income (₹' + value.monthly_income.toLocaleString('en-IN') + ')' });
  }
  return value;
});

// ── Recommendation Schema ──────────────────────────────────────────
export const recommendSchema = Joi.object({
  profileId: objectId.required()
    .messages({ 'string.pattern.base': 'Invalid profile ID format' }),
});

// ── Projection Schema ──────────────────────────────────────────────
const VALID_INSTRUMENTS = [
  'FD', 'ELSS', 'Equity_MF', 'ETF', 'Debt_MF',
  'RBI_Bond', 'G-Sec', 'PPF', 'NPS', 'Gold',
  'SGB', 'Liquid_MF', 'Arbitrage_MF',
];

export const projectionSchema = Joi.object({
  profileId: objectId.required(),
  instruments: Joi.array().items(Joi.string().valid(...VALID_INSTRUMENTS)).min(1).max(10).optional(),
  monthly_investment: Joi.number().min(500).max(10000000).optional(),
  years: Joi.array().items(Joi.number().integer().min(1).max(50)).min(1).max(10).optional(),
});

// ── Monte Carlo Schema ─────────────────────────────────────────────
export const monteCarloSchema = Joi.object({
  instrument: Joi.string().valid(...VALID_INSTRUMENTS).required(),
  monthly_investment: Joi.number().min(500).max(10000000).required(),
  years: Joi.number().integer().min(1).max(40).required(),
  target_amount: Joi.number().min(0).optional(),
  post_tax_rate: Joi.number().min(0).max(1).optional(),
  profileId: objectId.optional(),
});

// ── Goal Schema ────────────────────────────────────────────────────
export const goalSchema = Joi.object({
  goal_name: Joi.string().trim().min(2).max(100).required(),
  target_amount: Joi.number().min(1000).max(10000000000).required()
    .messages({
      'number.min': 'Target amount must be at least ₹1,000',
      'number.max': 'Target amount cannot exceed ₹1,000 Crores',
    }),
  target_date: Joi.date().iso().required()
    .custom((value, helpers) => {
      // Enforce 6-month minimum horizon for meaningful projections
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      if (value < sixMonthsFromNow) {
        return helpers.error('date.min', { message: 'Target date must be at least 6 months from today' });
      }
      return value;
    })
    .messages({
      'date.min': 'Target date must be at least 6 months from today for meaningful projections',
    }),
  current_savings: Joi.number().min(0).max(10000000000).default(0),
  profileId: objectId.optional(),
});

// ── Tax Schema ─────────────────────────────────────────────────────
export const taxComputeSchema = Joi.object({
  income: Joi.number().min(0).max(1000000000).required()
    .messages({ 'number.min': 'Income must be a positive number' }),
  regime: Joi.string().valid('new', 'old').default('new'),
});

export const taxCompareSchema = Joi.object({
  income: Joi.number().min(0).max(1000000000).required()
    .messages({ 'number.min': 'Income must be a positive number' }),
});

// ── Chat Schema ────────────────────────────────────────────────────
export const chatMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required()
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message too long. Maximum 1000 characters.',
    }),
  session_id: Joi.string().max(100).optional(),
});

/**
 * Express middleware factory for Joi body validation.
 * Returns 400 with structured error details on failure.
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
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

/**
 * Express middleware factory for Joi query validation.
 * Returns 400 with structured error details on failure.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }
    req.query = value;
    next();
  };
}
