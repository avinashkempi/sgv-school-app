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
      throw new Error('Permission to access notifications was denied');
    }

    // Get the device-specific push token (FCM on Android, APNs on iOS)
    const devicePushToken = await Notifications.getDevicePushTokenAsync();

    console.log('[FCM] Device Push Token:', devicePushToken.data);
    console.log('[FCM] Token Type:', devicePushToken.type); // 'ios' or 'android'

    return devicePushToken.data; // This is the actual FCM token on Android
  } catch (error) {
    console.error('[FCM] Failed to get token:', error);
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
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('FCM REGISTRATION TOKEN:');
    console.log(token);
    console.log('═══════════════════════════════════════════════════════════════');
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
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const apiFetch = (await import('./apiFetch')).default;
    const apiConfig = (await import('../config/apiConfig')).default;

    const authToken = await AsyncStorage.getItem('@auth_token');
    const storedUser = await AsyncStorage.getItem('@auth_user');

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

    console.log('[FCM] Registering token with backend...', { userId, isAuthenticated, platform: Platform.OS });

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
      throw new Error(errorData.message || 'Failed to register FCM token');
    }

    const result = await response.json();
    console.log('[FCM] Token registered successfully:', result);
    return true;
  } catch (error) {
    console.error('[FCM] Failed to register token with backend:', error);
    // Don't throw - failing to register token shouldn't break the app
    return false;
  }
}

export default {
  getFCMToken,
  logFCMToken,
  registerFCMTokenWithBackend,
};
