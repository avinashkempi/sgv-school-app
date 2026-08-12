import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { decode as atob } from 'base-64';
import storage from '../utils/storage';
import { clearAllCaches, cancelAllQueries } from '../utils/cacheManager';
import { unregisterBackgroundSync, registerBackgroundSync } from '../utils/backgroundSync';
import { setApiFetchToken, clearApiFetchToken } from '../utils/apiFetch';
import { resetAcademicYearState, triggerAcademicYearSync } from '../context/AcademicYearContext';

const AuthContext = createContext(null);

/**
 * Decode a base64url-encoded string.
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return atob(base64);
}

function isTokenExpired(token) {
  if (!token || token === 'demo-token') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() >= payload.exp * 1000) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract user ID from a user object, handling both `id` and `_id` fields.
 */
function extractUserId(user) {
  if (!user) return null;
  return user.id || user._id || null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const isLoggingOut = useRef(false);

  const isAuthenticated = !!token && token !== 'demo-token';
  const isDemo = token === 'demo-token';
  const userId = extractUserId(user);

  // ── Load persisted auth on mount ──
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          storage.getItem('@auth_token'),
          storage.getItem('@auth_user'),
        ]);

        if (storedToken && isTokenExpired(storedToken)) {
          // Token expired — clear and don't set state
          await storage.multiRemove(['@auth_token', '@auth_user']);
          setIsReady(true);
          return { expired: true };
        }

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              setUser(null);
            }
          }
        }

        setIsReady(true);
        
        // Flush any pending FCM unregistrations from previous offline logouts
        if (Platform.OS !== 'web') {
          global.setTimeout(async () => {
            try {
              const { flushPendingFCMUnregisters } = require('../utils/fcm');
              await flushPendingFCMUnregisters();
            // eslint-disable-next-line no-unused-vars
            } catch (err) {}
          }, 2000);
        }

        return { expired: false, hasToken: !!storedToken };
      } catch (err) {
        console.error('[AuthContext] Error loading auth:', err);
        setIsReady(true);
        return { expired: false, hasToken: false };
      }
    };

    loadAuth();
  }, []);

  /**
   * Login: Clear old caches, set new credentials, re-register FCM.
   * Called from login.jsx after successful API login.
   */
  const login = useCallback(async (newToken, newUser) => {
    try {
      // 1. Cancel pending queries to prevent stale writes
      cancelAllQueries();

      // 2. Detect if this is a different user (account switch)
      const previousUserId = await storage.getItem('@last_user_id');
      const newUserId = extractUserId(newUser);
      const isAccountSwitch = previousUserId && previousUserId !== String(newUserId);

      // 3. ALWAYS clear caches on login for security
      //    (even same user — ensures fresh state)
      await clearAllCaches();

      // 4. Set new auth credentials
      await Promise.all([
        storage.setItem('@auth_token', newToken),
        storage.setItem('@auth_user', JSON.stringify(newUser)),
        newUserId ? storage.setItem('@last_user_id', String(newUserId)) : Promise.resolve(),
      ]);

      // 5. Update React state (triggers re-renders throughout the app)
      setApiFetchToken(newToken);
      setToken(newToken);
      setUser(newUser);

      // 6. Re-register FCM token for the new user
      if (Platform.OS !== 'web' && newToken !== 'demo-token') {
        try {
          const { getFCMToken, registerFCMTokenWithBackend } = require('../utils/fcm');
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            await registerFCMTokenWithBackend(fcmToken);
          }
        } catch (err) {
          console.warn('[AuthContext] FCM registration failed:', err);
        }
      }

      // 7. Register background sync for the new user
      try {
        await registerBackgroundSync();
      } catch (err) {
        console.warn('[AuthContext] Background sync registration failed:', err);
      }

      // 8. Reset academic year context
      await storage.removeItem('selectedAcademicYear');
      triggerAcademicYearSync();

      if (__DEV__) {
        console.log(`[AuthContext] Login complete${isAccountSwitch ? ' (account switch detected)' : ''}`);
      }
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      throw err;
    }
  }, []);

  /**
   * Logout: Clear all state, caches, FCM, and redirect.
   * Includes re-entrancy guard to prevent multiple simultaneous logouts.
   */
  const logout = useCallback(async (router, message = null, showToast = null) => {
    if (isLoggingOut.current) {
      if (__DEV__) console.log('[AuthContext] Logout already in progress, skipping');
      return;
    }
    isLoggingOut.current = true;

    try {
      // 1. Cancel pending queries
      cancelAllQueries();

      // 2. Unregister FCM token from backend before clearing auth
      if (Platform.OS !== 'web') {
        try {
          const { unregisterFCMTokenFromBackend } = require('../utils/fcm');
          if (unregisterFCMTokenFromBackend) {
            await unregisterFCMTokenFromBackend();
          }
        } catch (err) {
          console.warn('[AuthContext] FCM unregister failed:', err);
        }
      }

      // 3. Clear auth credentials
      clearApiFetchToken();
      await storage.multiRemove(['@auth_token', '@auth_user']);

      // 4. Clear all caches
      await clearAllCaches();

      // 5. Unregister background sync
      try {
        await unregisterBackgroundSync();
      } catch (err) {
        console.warn('[AuthContext] Background sync unregister failed:', err);
      }

      // 6. Clear academic year
      try {
        await storage.removeItem('selectedAcademicYear');
        resetAcademicYearState();
      } catch (err) {
        console.warn('[AuthContext] Could not clear academic year:', err);
      }

      // 7. Update React state
      setToken(null);
      setUser(null);

      // 8. Show toast
      if (showToast && message) {
        const isManualLogout = message === 'Logged out successfully';
        showToast(message, isManualLogout ? 'info' : 'error', isManualLogout ? 1500 : 3500);
      } else if (showToast && !message) {
        showToast('Logged out successfully', 'info', 1500);
      }

      // 9. Navigate to login
      if (router?.replace) {
        router.replace('/login');
      }

      if (__DEV__) console.log('[AuthContext] Logout complete');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Still redirect even on error
      if (router?.replace) router.replace('/login');
    } finally {
      global.setTimeout(() => {
        isLoggingOut.current = false;
      }, 2000);
    }
  }, []);

  /**
   * Update user object reactively (e.g., after /auth/me refetch).
   * Also persists to storage so apiFetch (outside React) stays in sync.
   */
  const updateUser = useCallback(async (updatedUser) => {
    setUser(updatedUser);
    if (updatedUser) {
      await storage.setItem('@auth_user', JSON.stringify(updatedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      userId,
      isAuthenticated,
      isDemo,
      isReady,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
