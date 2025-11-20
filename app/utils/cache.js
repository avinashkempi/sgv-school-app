// Centralized cache management utility
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
export const CACHE_KEYS = {
  EVENTS: '@cached_events',
  SCHOOL_INFO: '@cached_school_info',
  NEWS: '@cached_news',
  USERS: '@cached_users',
};

// Cache expiry times (in milliseconds)
export const CACHE_EXPIRY = {
  EVENTS: 30 * 60 * 1000, // 30 minutes
  SCHOOL_INFO: 60 * 60 * 1000, // 1 hour
  NEWS: 15 * 60 * 1000, // 15 minutes
  USERS: 60 * 60 * 1000, // 1 hour
};

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

// Get cached data if not expired
export const getCachedData = async (key, expiryTime = 0) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (!parsed.timestamp) return null;

    const now = Date.now();
    if (expiryTime > 0 && (now - parsed.timestamp) > expiryTime) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn(`Failed to get cached data for ${key}:`, error);
    return null;
  }
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
