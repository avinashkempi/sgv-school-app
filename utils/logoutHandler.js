import storage from './storage';
import { clearAllCaches, cancelAllQueries } from './cacheManager';
import { unregisterBackgroundSync } from './backgroundSync';

/**
 * Unified logout handler
 * Cleans up all state, caches, and redirects to login
 * Called from: profile.jsx, menu.jsx, index.jsx (on 401 error), global query cache
 *
 * Includes a re-entrancy guard to prevent multiple simultaneous logouts
 * (e.g., when multiple queries all return 401 at the same time).
 */
let isLoggingOut = false;

export async function logoutHandler(router, messageOrToast = null, showToastFn = null) {
  // Re-entrancy guard: if a logout is already in progress, silently skip
  if (isLoggingOut) {
    console.log('[LogoutHandler] Logout already in progress, skipping duplicate call');
    return;
  }
  isLoggingOut = true;

  let message = null;
  let showToast = null;

  if (typeof messageOrToast === 'function') {
    showToast = messageOrToast;
    message = 'Logged out successfully';
  } else {
    message = messageOrToast;
    showToast = showToastFn;
  }

  try {
    console.log('[LogoutHandler] Starting logout process...');

    // 1. Cancel all pending queries FIRST (prevent retry storm)
    cancelAllQueries();

    // 2. Remove auth credentials
    await storage.multiRemove(['@auth_token', '@auth_user']);
    console.log('[LogoutHandler] Auth credentials cleared');

    // 3. Clear ALL caches (React Query + manual + persisted)
    await clearAllCaches();
    console.log('[LogoutHandler] All caches cleared');

    // 3b. Unregister background sync task
    try {
      await unregisterBackgroundSync();
    } catch (err) {
      console.warn('[LogoutHandler] Could not unregister background sync:', err);
    }

    // 4. Clear academic year context
    try {
      await storage.removeItem('selectedAcademicYear');
    } catch (err) {
      console.warn('[LogoutHandler] Could not clear academic year:', err);
    }

    // 5. Show toast notification if available
    if (showToast && message) {
      const isManualLogout = message === 'Logged out successfully';
      const toastType = isManualLogout ? 'info' : 'error';
      const duration = isManualLogout ? 1500 : 3500;
      showToast(message, toastType, duration);
    }

    console.log('[LogoutHandler] Logout complete, redirecting to login...');

    // 6. Navigate to login
    if (router && router.replace) {
      router.replace('/login');
    } else {
      console.error('[LogoutHandler] Router not available');
    }
  } catch (error) {
    console.error('[LogoutHandler] Error during logout:', error);
    // Still try to redirect even if cleanup fails
    if (router && router.replace) {
      router.replace('/login');
    }
  } finally {
    // Reset the guard after a short delay to allow navigation to complete
    // and prevent immediate re-trigger from stale error callbacks
    global.setTimeout(() => {
      isLoggingOut = false;
    }, 2000);
  }
}
