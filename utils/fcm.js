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

export default {
  getFCMToken,
  logFCMToken,
};
