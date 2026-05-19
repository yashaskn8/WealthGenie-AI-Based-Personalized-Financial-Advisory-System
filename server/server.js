import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import crypto from 'crypto';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import recommendRoutes from './routes/recommend.js';
import instrumentRoutes from './routes/instruments.js';
import projectionRoutes from './routes/projection.js';
import montecarloRoutes from './routes/montecarlo.js';
import goalRoutes from './routes/goals.js';
import marketRoutes from './routes/market.js';
import taxRoutes from './routes/tax.js';
import chatRoutes from './routes/chatRoutes.js';
import { startMarketDataRefreshJobs } from './jobs/marketDataRefresh.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Headers ─────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  contentSecurityPolicy: false,   // Vite dev server injects inline scripts
}));

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));

// ── Body Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── NoSQL Injection Prevention ───────────────────────────────────
app.use(mongoSanitize());

// ── Request Logging ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Request ID Middleware ────────────────────────────────────────
app.use((req, res, next) => {
  req.headers['x-request-id'] =
    req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  // Response time tracking for performance monitoring
  req._startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req._startTime;
    // Log slow requests (>3s) for investigation
    if (duration > 3000) {
      console.warn(`[PERF] Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  });
  next();
});

// ── Rate Limiting ────────────────────────────────────────────────
// Strict limiter for auth endpoints (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Standard API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,
  message: { error: 'Rate limit exceeded.' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/projection', projectionRoutes);
app.use('/api/montecarlo', montecarloRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/chat', chatRoutes);

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'WealthGenie API v3.0',
    uptime_seconds: Math.round(process.uptime()),
    node_version: process.version,
    memory: {
      rss_mb: Math.round(memUsage.rss / 1048576),
      heap_used_mb: Math.round(memUsage.heapUsed / 1048576),
      heap_total_mb: Math.round(memUsage.heapTotal / 1048576),
    },
    engines: {
      tax: 'FY2025-26 (Section 87A marginal relief + surcharge marginal relief)',
      monte_carlo: 'Halton QMC + Antithetic Variates + Control Variates',
      risk_profiler: '3-Factor Model (Age + Income + Horizon)',
      projections: 'Real + Nominal (Fisher Equation inflation adjustment)',
      post_tax: 'FY2025-26 LTCG/STCG/EEE compliance',
    },
    features: [
      'SHAP', 'MonteCarlo-QMC', 'GoalPlanner', 'LiveMarketData',
      'TaxCompare', 'PostTaxCalc', 'RateLimiting', 'GenieChat',
      'SharpeRatio', 'PortfolioAllocation', 'VarianceReduction',
    ],
  });
});

// ── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Error Handler (must be last) ─────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────
let server;

const start = async () => {
  // ── Critical Environment Validation ─────────────────────────────
  const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = REQUIRED_ENV.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    console.error('Server cannot start without these. Check your .env file.');
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('[SECURITY] JWT_SECRET is shorter than 32 characters. Use a strong secret in production.');
  }
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    console.warn('[STARTUP] Neither GEMINI_API_KEY nor GROQ_API_KEY configured. AI features will be unavailable.');
  }

  await connectDB();
  await connectRedis();

  // Start market data cron jobs (non-blocking)
  startMarketDataRefreshJobs();

  server = app.listen(PORT, () => console.log(`WealthGenie API v3.0 running on port ${PORT}`));
};

// ── Graceful Shutdown ────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force exit after 10 seconds if connections haven't closed
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
