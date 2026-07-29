/**
 * Lightweight cache utility for raw AsyncStorage access.
 *
 * Most caching is now handled by React Query + PersistQueryClientProvider.
 * This module is kept for the few cases where we need direct key-value
 * storage outside of React Query (e.g. timestamps, flags).
 *
 * For query caching configuration, see utils/cacheConfig.js
 */
import storage from './storage';

// Cache key constants — kept for reference and for cacheManager cleanup
export const CACHE_KEYS = {
  EVENTS: '@cached_events',
  SCHOOL_INFO: '@cached_school_info',
  NEWS: '@cached_news',
  USERS: '@cached_users',
};

// ── Simple key-value helpers ──

/**
 * Get cached data with optional expiry check.
 * Returns null if expired or not found.
 */
export const getCachedData = async (key, expiryTime = 0) => {
  try {
    const cached = await storage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (!parsed.timestamp) return null;

    if (expiryTime > 0 && (Date.now() - parsed.timestamp) > expiryTime) {
      await storage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn(`[CACHE] Failed to get data for ${key}:`, error);
    return null;
  }
};

/**
 * Set cached data with a timestamp.
 */
export const setCachedData = async (key, data) => {
  try {
    const entry = { data, timestamp: Date.now() };
    await storage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`[CACHE] Failed to set data for ${key}:`, error);
  }
};

/**
 * Clear specific cache key.
 */
export const clearCache = async (key) => {
  try {
    await storage.removeItem(key);
  } catch (error) {
    console.warn(`[CACHE] Failed to clear ${key}:`, error);
  }
};

/**
 * Clear all manual cache keys.
 */
export const clearAllCaches = async () => {
  try {
    const keys = Object.values(CACHE_KEYS);
    await storage.multiRemove(keys);
  } catch (error) {
    console.warn('[CACHE] Failed to clear all caches:', error);
  }
};
