import { Router } from 'express';
import { getMarketDataSummary, getLiveInstrumentParams } from '../services/marketDataService.js';

const router = Router();

/**
 * GET /api/market/rates
 * Returns live market data summary: Nifty/Sensex stats, AMFI NAV count,
 * and data freshness timestamps. No auth required (public endpoint).
 */
router.get('/rates', async (req, res) => {
  try {
    const summary = await getMarketDataSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch market data: ' + err.message });
  }
});

/**
 * GET /api/market/params
 * Returns live Monte Carlo instrument parameters derived from real index data.
 * Used by the frontend to show whether parameters are live or static.
 */
router.get('/params', async (req, res) => {
  try {
    const result = await getLiveInstrumentParams();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch instrument params: ' + err.message });
  }
});

export default router;
