import storage from "./storage";
import { queryClient } from "./queryClient";
import { resetOfflineQueue } from "./offlineQueue";

/**
 * Clear ALL caches comprehensively:
 * - React Query in-memory cache
 * - React Query persisted cache (AsyncStorage)
 * - Offline mutation queue (prevents cross-account data leakage)
 * - Legacy manual app caches (from old dual-cache system)
 *
 * Note: We remove the persisted cache key BEFORE clearing in-memory,
 * to prevent the persister from re-writing stale data during the clear window.
 */
export async function clearAllCaches() {
  try {
    console.log("[CacheManager] Starting comprehensive cache clear...");

    // 1. Remove the persisted cache from AsyncStorage FIRST
    //    We remove both the TanStack default key and custom key
    await storage.multiRemove([
      "REACT_QUERY_OFFLINE_CACHE",
      "@react-query-persist",
      "@school_app_offline_queue",
    ]);

    // 2. Clear React Query in-memory cache
    queryClient.clear();

    // 3. Clear in-memory and persistent offline mutation queue
    try {
      await resetOfflineQueue();
    } catch (qErr) {
      console.warn("[CacheManager] Error resetting offline queue:", qErr);
    }

    // 4. Clear legacy manual cache keys (kept for cleanup of old installs)
    const legacyKeys = [
      "@cached_events",
      "@cached_school_info",
      "@cached_news",
      "@cached_users",
      "selectedAcademicYear",
      "@cached_academic_years",
      "@bg_notification_count",
    ];

    await storage.multiRemove(legacyKeys);

    // 5. Remove persisted cache again after clear, in case the persister
    //    re-wrote during the brief window above (belt and suspenders)
    await storage.multiRemove([
      "REACT_QUERY_OFFLINE_CACHE",
      "@react-query-persist",
      "@school_app_offline_queue",
    ]);

    console.log("[CacheManager] All caches cleared successfully");
    return { success: true };
  } catch (error) {
    console.error("[CacheManager] Error clearing caches:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel all pending queries to prevent unnecessary retries
 */
export function cancelAllQueries() {
  try {
    console.log("[CacheManager] Cancelling all pending queries...");
    queryClient.cancelQueries();
    console.log("[CacheManager] All queries cancelled");
    return { success: true };
  } catch (error) {
    console.error("[CacheManager] Error cancelling queries:", error);
    return { success: false, error: error.message };
  }
}
