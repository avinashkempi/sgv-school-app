import storage from './storage';
import { queryClient } from './queryClient';

/**
 * Clear ALL caches comprehensively:
 * - React Query in-memory cache
 * - React Query persisted cache (AsyncStorage)
 * - Manual app caches
 * - Context state if needed
 */
export async function clearAllCaches() {
  try {
    console.log('[CacheManager] Starting comprehensive cache clear...');

    // 1. Clear React Query in-memory cache
    queryClient.clear();

    // 2. Clear React Query persisted cache from AsyncStorage
    await storage.removeItem('@react-query-persist');

    // 3. Clear all manual app caches
    const keysToRemove = [
      '@cached_events',
      '@cached_school_info',
      '@cached_notifications',
      '@cached_user_data',
      '@cached_attendance',
      '@cached_marks',
      '@cached_fees',
      '@cached_timetable',
      '@cached_exams',
      '@cached_leaves',
      '@cached_subjects',
      '@cached_classes',
      '@cached_teachers',
      '@cached_students',
      '@cached_staff',
      '@cached_admin_dashboard',
      '@cached_teacher_dashboard',
      '@cached_student_dashboard',
      'selectedAcademicYear', // Academic year context
    ];

    await storage.multiRemove(keysToRemove);

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
