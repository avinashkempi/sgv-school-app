import storage from './storage';
import { queryClient } from './queryClient';

/**
 * Clear ALL caches comprehensively:
 * - React Query in-memory cache
 * - React Query persisted cache (AsyncStorage)
 * - Legacy manual app caches (from old dual-cache system)
 */
export async function clearAllCaches() {
  try {
    console.log('[CacheManager] Starting comprehensive cache clear...');

    // 1. Clear React Query in-memory cache
    queryClient.clear();

    // 2. Clear React Query persisted cache from AsyncStorage
    await storage.removeItem('@react-query-persist');

    // 3. Clear legacy manual cache keys (kept for cleanup of old installs)
    const legacyKeys = [
      '@cached_events',
      '@cached_school_info',
      '@cached_news',
      '@cached_users',
      'selectedAcademicYear',
    ];

    await storage.multiRemove(legacyKeys);

    console.log('[CacheManager] All caches cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('[CacheManager] Error clearing caches:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel all pending queries to prevent unnecessary retries
 */
export function cancelAllQueries() {
  try {
    console.log('[CacheManager] Cancelling all pending queries...');
    queryClient.cancelQueries();
    console.log('[CacheManager] All queries cancelled');
    return { success: true };
  } catch (error) {
    console.error('[CacheManager] Error cancelling queries:', error);
    return { success: false, error: error.message };
  }
}
