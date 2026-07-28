import storage from './storage';
import { clearAllCaches, cancelAllQueries } from './cacheManager';

/**
 * Unified logout handler
 * Cleans up all state, caches, and redirects to login
 * Called from: profile.jsx, menu.jsx, index.jsx (on 401 error), global query cache
 */
export async function logoutHandler(router, messageOrToast = null, showToastFn = null) {
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
  }
}
