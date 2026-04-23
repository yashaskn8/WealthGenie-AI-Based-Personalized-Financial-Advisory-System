import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
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
import { startMarketDataRefreshJobs } from './jobs/marketDataRefresh.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Headers ─────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));

// ── Body Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── NoSQL Injection Prevention ───────────────────────────────────
app.use(mongoSanitize());

// ── Request Logging ──────────────────────────────────────────────
app.use(morgan('dev'));

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

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'WealthGenie API v2.1',
    features: ['SHAP', 'MonteCarlo', 'GoalPlanner', 'LiveMarketData', 'TaxCompare', 'PostTaxCalc', 'RateLimiting'],
  });
});

// ── Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  await connectRedis();

  // Start market data cron jobs (non-blocking)
  startMarketDataRefreshJobs();

  app.listen(PORT, () => console.log(`WealthGenie API v2.1 running on port ${PORT}`));
};

start().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
