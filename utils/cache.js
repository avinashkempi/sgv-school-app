// Centralized cache management utility
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
export const CACHE_KEYS = {
  EVENTS: '@cached_events',
  SCHOOL_INFO: '@cached_school_info',
  NEWS: '@cached_news',
  USERS: '@cached_users',
};

// Cache expiry times (in milliseconds) - Hard expiry (cache deleted)
export const CACHE_EXPIRY = {
  EVENTS: 24 * 60 * 60 * 1000,   // 24 hours
  SCHOOL_INFO: 7 * 24 * 60 * 60 * 1000, // 7 days
  NEWS: 24 * 60 * 60 * 1000,     // 24 hours
  USERS: 24 * 60 * 60 * 1000,    // 24 hours
};

// Stale times (in milliseconds) - When to refresh in background
export const STALE_TIME = {
  NEWS: 5 * 60 * 1000,           // 5 minutes
  EVENTS: 5 * 60 * 1000,         // 5 minutes
  USERS: 10 * 60 * 1000,         // 10 minutes
  SCHOOL_INFO: 60 * 60 * 1000,   // 1 hour
};

// Refresh locks to prevent duplicate fetches
const refreshLocks = new Map();

// Cache data structure
const createCacheEntry = (data) => ({
  data,
  timestamp: Date.now(),
});

// Validate cached data based on expected structure
const validateCachedData = (key, data) => {
  if (!data) return false;

  switch (key) {
    case CACHE_KEYS.EVENTS:
      return Array.isArray(data) && data.every(item =>
        item && typeof item === 'object' && (item._id || item.id) && item.title
      );
    case CACHE_KEYS.NEWS:
      return Array.isArray(data) && data.every(item =>
        item && typeof item === 'object' && item._id && item.title
      );
    case CACHE_KEYS.USERS:
      return Array.isArray(data) && data.every(item =>
        item && typeof item === 'object' && item._id && item.name
      );
    case CACHE_KEYS.SCHOOL_INFO:
      return data && typeof data === 'object';
    default:
      return true; // Allow other data types
  }
};

// Get cached data without expiry check (for stale-while-revalidate)
export const getCachedDataRaw = async (key) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (!parsed.timestamp) return null;

    return parsed;
  } catch (error) {
    console.warn(`Failed to get cached data for ${key}:`, error);
    return null;
  }
};

// Get cached data if not expired
export const getCachedData = async (key, expiryTime = 0) => {
  try {
    const cached = await getCachedDataRaw(key);
    if (!cached) return null;

    const now = Date.now();
    if (expiryTime > 0 && (now - cached.timestamp) > expiryTime) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.warn(`Failed to get cached data for ${key}:`, error);
    return null;
  }
};

// Check if cache is stale (needs background refresh)
export const isCacheStale = async (key, staleTime) => {
  try {
    const cached = await getCachedDataRaw(key);
    if (!cached) return true; // No cache = stale

    const now = Date.now();
    const age = now - cached.timestamp;
    
    return age > staleTime;
  } catch (error) {
    console.warn(`Failed to check cache staleness for ${key}:`, error);
    return true; // On error, consider stale
  }
};

// Check if a refresh is currently in progress
export const isRefreshing = (key) => {
  return refreshLocks.has(key);
};

// Set refresh lock
export const setRefreshLock = (key) => {
  refreshLocks.set(key, Date.now());
};

// Clear refresh lock
export const clearRefreshLock = (key) => {
  refreshLocks.delete(key);
};

// Get cache with staleness info
export const getCacheWithMeta = async (key, expiryTime = 0, staleTime = 0) => {
  const data = await getCachedData(key, expiryTime);
  const isStale = await isCacheStale(key, staleTime);
  
  return {
    data,
    isStale,
    exists: data !== null,
  };
};

// Set cached data
export const setCachedData = async (key, data) => {
  try {
    // Validate data before caching
    if (!validateCachedData(key, data)) {
      console.warn(`[CACHE] Refusing to cache invalid data for ${key}`);
      return;
    }

    const cacheEntry = createCacheEntry(data);
    await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
    console.log(`[CACHE] Cached data for ${key}: ${Array.isArray(data) ? data.length : 1} items`);
  } catch (error) {
    console.warn(`[CACHE] Failed to set cached data for ${key}:`, error);
  }
};

// Clear specific cache
export const clearCache = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear cache for ${key}:`, error);
  }
};

// Clear all caches
export const clearAllCaches = async () => {
  try {
    const keys = Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.warn('Failed to clear all caches:', error);
  }
};

// Update cached data (for partial updates)
export const updateCachedData = async (key, updateFn) => {
  try {
    const cached = await getCachedData(key);
    if (cached) {
      const updated = updateFn(cached);
      await setCachedData(key, updated);
      return updated;
    }
  } catch (error) {
    console.warn(`Failed to update cached data for ${key}:`, error);
  }
  return null;
};

// Check if cache exists and is valid
export const isCacheValid = async (key, expiryTime = 0) => {
  const cached = await getCachedData(key, expiryTime);
  return cached !== null;
};
