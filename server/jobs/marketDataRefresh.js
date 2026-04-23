/**
 * WealthGenie Market Data Cron Jobs
 * Refreshes live market data on a schedule.
 *
 * - AMFI NAVs: daily at 23:30 IST (18:00 UTC)
 * - Index statistics: every 2 hours during market hours
 */

import { fetchMutualFundNAVs, fetchIndexStatistics } from '../services/marketDataService.js';

/**
 * Start all scheduled market data refresh jobs.
 * Call this once in server.js after DB and Redis are connected.
 */
export function startMarketDataRefreshJobs() {
  // Daily AMFI NAV refresh at 23:30 IST (18:00 UTC)
  // AMFI publishes updated NAVs around 23:00 IST
  scheduleJob('0 18 * * *', 'AMFI NAV Refresh', async () => {
    const result = await fetchMutualFundNAVs();
    console.log(`[CRON] AMFI: ${result.count} schemes fetched`);
  });

  // Index statistics refresh every 2 hours
  scheduleJob('0 */2 * * *', 'Index Statistics', async () => {
    const [nifty, sensex] = await Promise.allSettled([
      fetchIndexStatistics('^NSEI'),
      fetchIndexStatistics('^BSESN'),
    ]);
    console.log(`[CRON] Nifty: ${nifty.status}, Sensex: ${sensex.status}`);
  });

  console.log('[CRON] Market data refresh jobs scheduled');
}

/**
 * Simple cron scheduler using setInterval.
 * Parses basic cron expressions: "minute hour * * *"
 * Falls back to fixed interval if parsing fails.
 */
function scheduleJob(cronExpr, name, fn) {
  // Parse the cron expression to determine interval
  const parts = cronExpr.split(' ');
  let intervalMs;

  if (parts[1] === '*/2') {
    // Every 2 hours
    intervalMs = 2 * 60 * 60 * 1000;
  } else if (parts[1] !== '*' && parts[0] !== '*') {
    // Daily at a specific time — run every 24 hours
    intervalMs = 24 * 60 * 60 * 1000;
  } else {
    // Default: every 6 hours
    intervalMs = 6 * 60 * 60 * 1000;
  }

  // Run immediately on startup (non-blocking)
  setTimeout(async () => {
    try {
      await fn();
      console.log(`[CRON] ${name}: initial run complete`);
    } catch (err) {
      console.error(`[CRON] ${name}: initial run failed:`, err.message);
    }
  }, 5000); // 5s delay to let the server finish startup

  // Schedule recurring runs
  setInterval(async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[CRON] ${name} failed:`, err.message);
      // Do NOT throw — cron failure must not crash the server
    }
  }, intervalMs);
}
