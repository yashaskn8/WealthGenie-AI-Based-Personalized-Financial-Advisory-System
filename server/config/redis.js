import { createClient } from 'redis';

let redisClient = null;
let redisAvailable = false;

/**
 * Initialize Redis connection.
 * Falls back gracefully if Redis is not available (dev environments).
 */
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeoutMs: 3000,
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            return new Error('Redis reconnect attempts exhausted.');
          }
          return Math.min(retries * 500, 3000); // Backoff: 500ms, 1000ms, 1500ms, etc.
        },
      },
    });

    let errorLogged = false;
    redisClient.on('error', (err) => {
      if (!errorLogged) {
        console.warn('Redis not available — running without cache:', err.message);
        errorLogged = true;
      }
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
      redisAvailable = true;
    });

    await redisClient.connect();
    redisAvailable = true;
  } catch (error) {
    console.warn('Redis not available — running without cache:', error.message);
    redisAvailable = false;
    redisClient = null;
  }
};

/**
 * Get cached value by key. Returns null if Redis is unavailable or key doesn't exist.
 */
const getCache = async (key) => {
  if (!redisAvailable || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Set cache with TTL (default 24 hours).
 */
const setCache = async (key, value, ttlSeconds = 86400) => {
  if (!redisAvailable || !redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Silently fail — caching is non-critical
  }
};

/**
 * Delete a cache key.
 */
const delCache = async (key) => {
  if (!redisAvailable || !redisClient) return;
  try {
    await redisClient.del(key);
  } catch {
    // Silently fail
  }
};

export { connectRedis, getCache, setCache, delCache, redisClient, redisAvailable };
