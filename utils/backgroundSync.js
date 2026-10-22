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
import { Platform } from "react-native";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import storage from "./storage";
import apiConfig from "../config/apiConfig";
import { syncQueue } from "./offlineQueue";
import { queryClient } from "./queryClient";

export const BACKGROUND_SYNC_TASK = "BACKGROUND_DATA_SYNC";

/** Maximum time (ms) the background task is allowed to run before we force-return.
 *  Android's BroadcastReceiver times out at ~10s; we bail at 8s to stay safe. */
const TASK_TIMEOUT_MS = 8000;

/** Maximum time (ms) to wait for the notification fetch request. */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Define the background task.
 * This runs even when the app is closed/backgrounded.
 * Must be defined in the global scope outside React components.
 */
if (
  Platform.OS !== "web" &&
  TaskManager?.isTaskDefined &&
  !TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)
) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async ({ data, error }) => {
    // Guard: If the headless JS environment reports an error or isn't fully
    // initialized, bail out immediately to prevent native NPE crashes on
    // Android when the OS fires the task after the app process was killed.
    if (error) {
      console.error("[BackgroundSync] Task received error:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    try {
      // Wrap entire task body in a timeout race to prevent
      // BroadcastReceiver IllegalStateException (Android's ~10s limit)
      const taskPromise = (async () => {
        const token = await storage.getItem("@auth_token");
        if (!token || token === "demo-token") {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Sync any pending offline mutations (limit work to stay within timeout)
        try {
          await syncQueue(queryClient);
        } catch (queueErr) {
          console.warn("[BackgroundSync] Queue sync error:", queueErr);
        }

        // Fetch notification count silently with abort timeout
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
          const response = await fetch(`${apiConfig.baseUrl}/notifications`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          });
          clearTimeout(fetchTimer);

          if (response.ok) {
            const responseData = await response.json();
            const unreadCount =
              responseData.unreadCount ??
              (responseData.notifications || []).filter((n) => !n.isRead).length;

            // Store for immediate access on app open
            await storage.setItem(
              "@bg_notification_count",
              JSON.stringify({
                count: unreadCount,
                timestamp: Date.now(),
              })
            );

            console.log(`[BackgroundSync] Notification count synced: ${unreadCount}`);
            return BackgroundFetch.BackgroundFetchResult.NewData;
          }
        } catch (fetchErr) {
          clearTimeout(fetchTimer);
          console.warn("[BackgroundSync] Fetch error:", fetchErr?.message || fetchErr);
        }

        return BackgroundFetch.BackgroundFetchResult.NoData;
      })();

      // Race the task against the timeout to avoid BroadcastReceiver ISE
      const result = await Promise.race([
        taskPromise,
        new Promise((resolve) =>
          setTimeout(
            () => resolve(BackgroundFetch.BackgroundFetchResult.Failed),
            TASK_TIMEOUT_MS
          )
        ),
      ]);

      return result;
    } catch (err) {
      // Catch ANY error (including NPE from uninitialised JS env) to prevent
      // the native crash from propagating up to TaskBroadcastReceiver
      console.error("[BackgroundSync] Task failed:", err);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Register the background fetch task.
 * Call this once during app initialization.
 */
export async function registerBackgroundSync() {
  if (Platform.OS === "web") return false;
  try {
    // 1. Verify task is defined in TaskManager before attempting registration
    if (
      !TaskManager?.isTaskDefined ||
      !TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)
    ) {
      console.warn(
        `[BackgroundSync] Task '${BACKGROUND_SYNC_TASK}' is not defined. Skipping registration.`
      );
      return false;
    }

    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn("[BackgroundSync] Background fetch is denied by the OS");
      return false;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn("[BackgroundSync] Background fetch is restricted");
      return false;
    }

    // Unregister any previous registration so new lifecycle flags (stopOnTerminate: true) apply
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_SYNC_TASK
    );
    if (isRegistered && BackgroundFetch?.unregisterTaskAsync) {
      try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      } catch (_) {}
    }

    // Register with safe lifecycle options
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes in seconds
      stopOnTerminate: true, // Android: STOP when app is killed! Prevents headless TaskBroadcastReceiver NPE crashes
      startOnBoot: false, // Do NOT trigger on device boot when app is not running
    });

    console.log("[BackgroundSync] Task registered successfully");
    return true;
  } catch (err) {
    console.warn("[BackgroundSync] Registration skipped/failed:", err?.message || err);
    return false;
  }
}

/**
 * Unregister the background sync task.
 * Call this on logout.
 */
export async function unregisterBackgroundSync() {
  if (Platform.OS === "web") return;
  try {
    if (!TaskManager?.isTaskRegisteredAsync) return;
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_SYNC_TASK
    );
    if (isRegistered && BackgroundFetch?.unregisterTaskAsync) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log("[BackgroundSync] Task unregistered");
    }
  } catch (err) {
    console.warn("[BackgroundSync] Unregister note:", err?.message || err);
  }
}

/**
 * Get the last background-synced notification count.
 * Returns null if no background sync has run yet.
 */
export async function getBackgroundNotificationCount() {
  try {
    const raw = await storage.getItem("@bg_notification_count");
    if (!raw) return null;
    const { count, timestamp } = JSON.parse(raw);
    // Only use if less than 1 hour old
    if (Date.now() - timestamp > 60 * 60 * 1000) return null;
    return count;
  } catch {
    return null;
  }
}

// Auto-heal: Ensure any legacy persistent background tasks on Android are
// migrated to stopOnTerminate: true. Runs immediately (no setTimeout delay)
// to prevent race where Android kills the app before re-registration completes.
if (Platform.OS === "android") {
  (async () => {
    try {
      if (TaskManager?.isTaskRegisteredAsync && BackgroundFetch?.unregisterTaskAsync) {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (isRegistered) {
          // Force unregister the legacy registration, then re-register with safe options
          try {
            await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
          } catch (_) {}
          await registerBackgroundSync();
        }
      }
    } catch (_) {}
  })();
}
