import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/projection', projectionRoutes);
app.use('/api/montecarlo', montecarloRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/tax', taxRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'WealthGenie API v2.1', features: ['SHAP', 'MonteCarlo', 'GoalPlanner', 'LiveMarketData', 'TaxCompare'] });
});

// Error handler
app.use(errorHandler);

// Start server
const start = async () => {
  await connectDB();
  await connectRedis();

  // Start market data cron jobs (non-blocking)
  startMarketDataRefreshJobs();

  app.listen(PORT, () => console.log(`WealthGenie API v2.1 running on port ${PORT}`));
};

start().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
