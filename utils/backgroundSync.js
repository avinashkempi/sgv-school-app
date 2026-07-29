/**
 * Background Sync — Periodic background fetch task.
 *
 * Uses expo-background-fetch + expo-task-manager to periodically
 * sync critical data while the app is in the background.
 *
 * Prerequisites:
 *   npm install expo-background-fetch expo-task-manager
 *   (or: npx expo install expo-background-fetch expo-task-manager)
 *
 * Behaviour:
 *   - Runs every ~15 min (iOS minimum) / configurable on Android
 *   - Fetches notification count and stores in AsyncStorage
 *   - On next app open, data is immediately available from cache
 */
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import storage from './storage';
import apiConfig from '../config/apiConfig';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_DATA_SYNC';

/**
 * Define the background task.
 * This runs even when the app is closed/backgrounded.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const token = await storage.getItem('@auth_token');
    if (!token || token === 'demo-token') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Fetch notification count silently
    const response = await fetch(`${apiConfig.baseUrl}/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const unreadCount = data.unreadCount ?? (data.notifications || []).filter(n => !n.isRead).length;

      // Store for immediate access on app open
      await storage.setItem('@bg_notification_count', JSON.stringify({
        count: unreadCount,
        timestamp: Date.now(),
      }));

      console.log(`[BackgroundSync] Notification count synced: ${unreadCount}`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    console.error('[BackgroundSync] Task failed:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task.
 * Call this once during app initialization.
 */
export async function registerBackgroundSync() {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn('[BackgroundSync] Background fetch is denied by the OS');
      return false;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn('[BackgroundSync] Background fetch is restricted');
      return false;
    }

    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      console.log('[BackgroundSync] Task already registered');
      return true;
    }

    // Register with minimum interval (iOS enforces 15min minimum)
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes in seconds
      stopOnTerminate: false,    // Android: keep running after app is killed
      startOnBoot: true,         // Android: start on device boot
    });

    console.log('[BackgroundSync] Task registered successfully');
    return true;
  } catch (err) {
    console.error('[BackgroundSync] Registration failed:', err);
    return false;
  }
}

/**
 * Unregister the background sync task.
 * Call this on logout.
 */
export async function unregisterBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BackgroundSync] Task unregistered');
    }
  } catch (err) {
    console.error('[BackgroundSync] Unregister failed:', err);
  }
}

/**
 * Get the last background-synced notification count.
 * Returns null if no background sync has run yet.
 */
export async function getBackgroundNotificationCount() {
  try {
    const raw = await storage.getItem('@bg_notification_count');
    if (!raw) return null;
    const { count, timestamp } = JSON.parse(raw);
    // Only use if less than 1 hour old
    if (Date.now() - timestamp > 60 * 60 * 1000) return null;
    return count;
  } catch {
    return null;
  }
}
