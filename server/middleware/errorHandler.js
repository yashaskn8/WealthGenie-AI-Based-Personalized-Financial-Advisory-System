/**
 * WealthGenie Global Error Handler
 * Provides structured error logging and safe client responses.
 * Never exposes internal error messages or stack traces to clients.
 */

const ERROR_CATEGORIES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  ML_SERVICE: 'ML_SERVICE_ERROR',
  GEMINI: 'GEMINI_API_ERROR',
  MARKET_DATA: 'MARKET_DATA_ERROR',
  DATABASE: 'DATABASE_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

function categoriseError(err) {
  if (err.name === 'ValidationError') return ERROR_CATEGORIES.VALIDATION;
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
    return ERROR_CATEGORIES.AUTH;
  if (err.message?.includes('ML service') || err.message?.includes('SHAP'))
    return ERROR_CATEGORIES.ML_SERVICE;
  if (err.message?.includes('Gemini') || err.message?.includes('generativelanguage'))
    return ERROR_CATEGORIES.GEMINI;
  if (err.message?.includes('AMFI') || err.message?.includes('Yahoo') || err.message?.includes('market'))
    return ERROR_CATEGORIES.MARKET_DATA;
  if (err.name === 'MongoServerError' || err.name === 'MongooseError')
    return ERROR_CATEGORIES.DATABASE;
  return ERROR_CATEGORIES.UNKNOWN;
}

const CLIENT_MESSAGES = {
  [ERROR_CATEGORIES.VALIDATION]: 'Invalid request data.',
  [ERROR_CATEGORIES.AUTH]: 'Authentication failed.',
  [ERROR_CATEGORIES.ML_SERVICE]: 'Recommendation engine temporarily unavailable.',
  [ERROR_CATEGORIES.GEMINI]: 'AI advisory service temporarily unavailable.',
  [ERROR_CATEGORIES.MARKET_DATA]: 'Live market data temporarily unavailable.',
  [ERROR_CATEGORIES.DATABASE]: 'Database operation failed.',
  [ERROR_CATEGORIES.UNKNOWN]: 'An unexpected error occurred.',
};

export function errorHandler(err, req, res, next) {
  const category = categoriseError(err);
  const status = err.status || err.statusCode || 500;

  // Structured JSON log — easy to grep in production
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    category,
    status,
    method: req.method,
    path: req.path,
    userId: req.user?.userId || req.user?.id || 'anonymous',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }));

  // Safe client response — never expose internals
  return res.status(status).json({
    error: CLIENT_MESSAGES[category],
    request_id: req.headers['x-request-id'] || null,
  });
}

// Catch unhandled promise rejections — prevents silent failures
process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    category: 'UNHANDLED_REJECTION',
    message: String(reason),
  }));
});
