import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

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
      console.log('Permission denied');
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
    console.log('Push Token:', token);

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
    Alert.alert('Push Notification Error', 'Failed to get push token: ' + error.message);
    throw error;
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
      console.log('[FCM] Skipping token registration in demo mode');
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

    const response = await apiFetch(apiConfig.url(apiConfig.endpoints.fcm.register), {
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
    console.log('[FCM] Token registered with backend successfully');

    return true;
  } catch (error) {
    console.error('[FCM] Failed to register token with backend:', error);
    // Silent fail to avoid annoying user, but logged to console
    return false;
  }
}

export default {
  getFCMToken,
  logFCMToken,
  registerFCMTokenWithBackend,
};
