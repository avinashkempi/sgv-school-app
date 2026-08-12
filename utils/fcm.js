import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Get the FCM (Firebase Cloud Messaging) registration token using Expo Notifications
 * This works on both Android and iOS without requiring a rebuild
 * @returns {Promise<string>} The FCM/Push token
 * @throws {Error} If the token cannot be retrieved
 */
export async function getFCMToken() {
  try {
    // Request permissions first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (__DEV__) {
        console.log('Push notification permission denied');
      }
      return null;
    }

    // Get the device-specific push token (FCM on Android, APNs on iOS)
    let tokenData;
    try {
      tokenData = await Notifications.getDevicePushTokenAsync();
    } catch (e) {
      console.warn('Failed to get device push token:', e);
      // Do NOT fallback to Expo tokens as they don't work with Firebase FCM
      console.error('❌ Cannot get native push token. Firebase notifications will not work.');
      console.error('ℹ️ Use a Development Build or compiled APK/IPA to enable push notifications.');
      return null;
    }

    const token = tokenData.data;
    if (__DEV__) {
      console.log('[FCM] Push token received');
    }

    // Validate token format
    if (!token || typeof token !== 'string' || token.length === 0) {
      console.error('❌ Invalid token received:', token);
      return null;
    }

    // Double-check: reject any Expo tokens that might slip through
    if (token.startsWith('ExponentPushToken')) {
      console.error('❌ Received Expo Push Token. Firebase FCM does not support Expo tokens.');
      console.error('ℹ️ Use a Development Build or compiled APK/IPA to enable push notifications.');
      return null;
    }

    return token;
  } catch (error) {
    console.error('[FCM] Failed to get token:', error);
    return null;
  }
}

/**
 * Get the FCM token and log it to console
 * Useful for development and debugging
 */
export async function logFCMToken() {
  try {
    const token = await getFCMToken();
    return token;
  } catch (error) {
    console.error('Failed to retrieve FCM token:', error);
    return null;
  }
}

/**
 * Register FCM token with backend server
 * This allows the backend to send push notifications to this device
 * @param {string} token - The FCM token to register
 * @returns {Promise<boolean>} Success status
 */
export async function registerFCMTokenWithBackend(token) {
  try {
    // const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const storage = (await import('./storage')).default;
    const apiFetch = (await import('./apiFetch')).default;
    const apiConfig = (await import('../config/apiConfig')).default;

    const authToken = await storage.getItem('@auth_token');
    const storedUser = await storage.getItem('@auth_user');

    // Skip FCM registration in demo mode
    if (authToken === 'demo-token') {
      if (__DEV__) {
        console.log('[FCM] Skipping token registration in demo mode');
      }
      return true;
    }

    let userId = 'guest';
    let isAuthenticated = false;

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        userId = user._id || user.id || 'guest';
        isAuthenticated = !!authToken;
      } catch (e) {
        console.warn('[FCM] Failed to parse user data:', e);
      }
    }

    const endpoint = (authToken && isAuthenticated)
      ? apiConfig.endpoints.fcm.register
      : apiConfig.endpoints.fcm.registerPublic;

    const response = await apiFetch(apiConfig.url(endpoint), {
      method: 'POST',
      silent: true,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify({
        token,
        userId,
        platform: Platform.OS,
        isAuthenticated
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[FCM] Backend registration failed:', errorData);
      throw new Error(errorData.message || 'Failed to register FCM token');
    }

    const _result = await response.json();
    if (__DEV__) {
      console.log('[FCM] Token registered with backend successfully');
    }

    // Store the FCM token so we can unregister it on account switch/logout
    await storage.setItem('@last_fcm_token', token);

    return true;
  } catch (error) {
    console.error('[FCM] Failed to register token with backend:', error);
    // Silent fail to avoid annoying user, but logged to console
    return false;
  }
}

/**
 * Unregister FCM token from backend on logout or account switch.
 * Prevents the previous user from receiving push notifications on this device.
 * @returns {Promise<boolean>} Success status
 */
export async function unregisterFCMTokenFromBackend() {
  try {
    const storage = (await import('./storage')).default;
    const apiFetch = (await import('./apiFetch')).default;
    const apiConfig = (await import('../config/apiConfig')).default;

    const authToken = await storage.getItem('@auth_token');
    const lastFcmToken = await storage.getItem('@last_fcm_token');

    if (!lastFcmToken || !authToken || authToken === 'demo-token') {
      return true; // Nothing to unregister
    }

    const response = await apiFetch(apiConfig.url(apiConfig.endpoints.fcm.unregister), {
      method: 'POST',
      silent: true,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: lastFcmToken }),
    });

    if (response.ok) {
      if (__DEV__) {
        console.log('[FCM] Token unregistered from backend successfully');
      }
      await storage.removeItem('@last_fcm_token');
      return true;
    }

    // If we reach here, the response was not OK. Queue it for later.
    await queueFailedUnregister(lastFcmToken, authToken);
    return false;
  } catch (error) {
    console.warn('[FCM] Failed to unregister token from backend:', error);
    try {
      const storage = (await import('./storage')).default;
      const authToken = await storage.getItem('@auth_token');
      const lastFcmToken = await storage.getItem('@last_fcm_token');
      if (lastFcmToken && authToken && authToken !== 'demo-token') {
        await queueFailedUnregister(lastFcmToken, authToken);
      }
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // Ignore errors during fallback queueing
    }
    return false;
  }
}

async function queueFailedUnregister(fcmToken, authToken) {
  try {
    const storage = (await import('./storage')).default;
    const pendingRaw = await storage.getItem('@pending_fcm_unregister');
    const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
    
    // Avoid duplicates
    if (!pending.some(p => p.token === fcmToken)) {
      pending.push({ token: fcmToken, authToken });
      await storage.setItem('@pending_fcm_unregister', JSON.stringify(pending));
    }
  } catch (err) {
    console.warn('[FCM] Could not queue failed unregister:', err);
  }
}

export async function flushPendingFCMUnregisters() {
  try {
    const storage = (await import('./storage')).default;
    const apiFetch = (await import('./apiFetch')).default;
    const apiConfig = (await import('../config/apiConfig')).default;

    const pendingRaw = await storage.getItem('@pending_fcm_unregister');
    if (!pendingRaw) return;
    
    const pending = JSON.parse(pendingRaw);
    if (!pending || pending.length === 0) return;

    const remaining = [];
    
    for (const item of pending) {
      try {
        const response = await apiFetch(apiConfig.url(apiConfig.endpoints.fcm.unregister), {
          method: 'POST',
          silent: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${item.authToken}`,
          },
          body: JSON.stringify({ token: item.token }),
        });

        if (!response.ok && response.status !== 401 && response.status !== 403) {
          // If it fails but NOT because of auth (e.g. 500 or network), keep it in queue
          remaining.push(item);
        }
      // eslint-disable-next-line no-unused-vars
      } catch (err) {
        remaining.push(item);
      }
    }

    if (remaining.length === 0) {
      await storage.removeItem('@pending_fcm_unregister');
    } else if (remaining.length !== pending.length) {
      await storage.setItem('@pending_fcm_unregister', JSON.stringify(remaining));
    }
  } catch (err) {
    console.warn('[FCM] Error flushing pending unregisters:', err);
  }
}

export default {
  getFCMToken,
  logFCMToken,
  registerFCMTokenWithBackend,
  unregisterFCMTokenFromBackend,
  flushPendingFCMUnregisters,
};
