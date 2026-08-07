import storage from './storage';
import { queryClient } from './queryClient';

/**
 * Clear ALL caches comprehensively:
 * - React Query in-memory cache
 * - React Query persisted cache (AsyncStorage)
 * - Legacy manual app caches (from old dual-cache system)
 *
 * Note: We remove the persisted cache key BEFORE clearing in-memory,
 * to prevent the persister from re-writing stale data during the clear window.
 */
export async function clearAllCaches() {
  try {
    console.log('[CacheManager] Starting comprehensive cache clear...');

    // 1. Remove the persisted cache from AsyncStorage FIRST
    //    This prevents the throttled persister from re-saving stale data
    await storage.removeItem('@react-query-persist');

    // 2. Clear React Query in-memory cache
    queryClient.clear();

    // 3. Clear legacy manual cache keys (kept for cleanup of old installs)
    const legacyKeys = [
      '@cached_events',
      '@cached_school_info',
      '@cached_news',
      '@cached_users',
      'selectedAcademicYear',
      '@cached_academic_years',
      '@bg_notification_count',
    ];

    await storage.multiRemove(legacyKeys);

    // 4. Remove persisted cache again after clear, in case the persister
    //    re-wrote during the brief window above (belt and suspenders)
    await storage.removeItem('@react-query-persist');

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
