/**
 * Offline Mutation Queue Manager
 *
 * Implements a persistent, WhatsApp-style outbox queue for write actions
 * performed while the device is offline (e.g. marking attendance, applying for leave,
 * submitting exam marks).
 *
 * Features:
 * - Persistent storage via AsyncStorage
 * - Smart deduplication by `tag` (e.g. updating attendance for the same class+date replaces the pending item)
 * - Sequential queue execution with concurrency mutex
 * - Automatic background syncing when network is restored
 * - Query cache invalidation upon successful sync
 * - Pub/Sub subscription and React hook for live UI reactivity
 */
import { useState, useEffect, useCallback } from "react";
import { Platform, ToastAndroid } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import storage from "./storage";
import apiFetch from "./apiFetch";
import { queryClient as defaultQueryClient } from "./queryClient";

const QUEUE_STORAGE_KEY = "@school_app_offline_queue";

// In-memory cache of the queue to avoid repeated disk reads
let memoryQueue = null;
let isSyncing = false;
const listeners = new Set();

const notifyListeners = () => {
  const currentQueue = memoryQueue ? [...memoryQueue] : [];
  listeners.forEach((listener) => {
    try {
      listener(currentQueue);
    } catch (err) {
      console.error("[OfflineQueue] Listener error:", err);
    }
  });
};

/**
 * Load queue from AsyncStorage into memory cache.
 */
export async function loadQueue() {
  if (memoryQueue !== null) return memoryQueue;
  try {
    const raw = await storage.getItem(QUEUE_STORAGE_KEY);
    memoryQueue = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("[OfflineQueue] Failed to load queue from storage:", err);
    memoryQueue = [];
  }
  return memoryQueue;
}

/**
 * Persist in-memory queue to AsyncStorage.
 */
async function persistQueue() {
  try {
    await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(memoryQueue || []));
  } catch (err) {
    console.error("[OfflineQueue] Failed to persist queue:", err);
  }
  notifyListeners();
}

/**
 * Add or update an action in the offline queue.
 *
 * @param {Object} item
 * @param {string} item.type - Type identifier (e.g. 'MARK_ATTENDANCE', 'APPLY_LEAVE')
 * @param {string} [item.tag] - Optional dedupe key. If a pending item has the same tag, it is updated in-place.
 * @param {string} item.description - Human readable description shown in UI
 * @param {string} item.url - Target API endpoint
 * @param {string} [item.method='POST'] - HTTP method
 * @param {Object} item.body - Request payload
 * @param {Object} [item.headers] - Additional custom headers (e.g. x-academic-year)
 * @param {Array} [item.invalidateKeys] - React Query keys to invalidate upon successful sync
 * @returns {Promise<Object>} The enqueued item
 */
export async function enqueueAction({
  type,
  tag = null,
  description,
  url,
  method = "POST",
  body = {},
  headers = {},
  invalidateKeys = [],
}) {
  await loadQueue();

  const id = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newItem = {
    id,
    tag,
    type,
    description: description || type,
    url,
    method,
    body,
    headers,
    invalidateKeys,
    createdAt: new Date().toISOString(),
    status: "pending", // 'pending' | 'syncing' | 'failed'
    retryCount: 0,
    lastError: null,
  };

  // Check for deduplication: if item with same tag is already queued (and not currently in-flight), replace it
  if (tag) {
    const existingIndex = memoryQueue.findIndex(
      (item) => item.tag === tag && item.status !== "syncing"
    );
    if (existingIndex >= 0) {
      // Replace with latest payload, keeping original createdAt
      memoryQueue[existingIndex] = {
        ...newItem,
        id: memoryQueue[existingIndex].id,
        createdAt: memoryQueue[existingIndex].createdAt,
        updatedAt: newItem.createdAt,
      };
      await persistQueue();
      return memoryQueue[existingIndex];
    }
  }

  memoryQueue.push(newItem);
  await persistQueue();
  return newItem;
}

/**
 * Remove an item from the queue by ID.
 */
export async function removeQueueItem(id) {
  await loadQueue();
  memoryQueue = memoryQueue.filter((item) => item.id !== id);
  await persistQueue();
}

/**
 * Clear the entire offline queue (in-memory and persistent storage).
 * Called on user logout to prevent data leaking into subsequent sessions.
 */
export async function resetOfflineQueue() {
  memoryQueue = [];
  try {
    await storage.removeItem(QUEUE_STORAGE_KEY);
  } catch (err) {
    console.error("[OfflineQueue] Failed to reset queue storage:", err);
  }
  notifyListeners();
}

/**
 * Clear all failed items from the queue.
 */
export async function clearFailedQueueItems() {
  await loadQueue();
  memoryQueue = memoryQueue.filter((item) => item.status !== "failed");
  await persistQueue();
}

/**
 * Get the current queue.
 */
export async function getQueue() {
  return await loadQueue();
}

/**
 * Get count of pending or failed items.
 */
export async function getQueueCount() {
  const q = await loadQueue();
  const pending = q.filter((i) => i.status === "pending" || i.status === "syncing").length;
  const failed = q.filter((i) => i.status === "failed").length;
  return { total: q.length, pending, failed };
}

/**
 * Sync all pending items in the queue with the backend.
 * Uses a mutex guard to avoid concurrent sync runs.
 *
 * @param {Object} [passedQueryClient] - React Query client instance for cache invalidations (defaults to global queryClient)
 * @param {Function} [onItemSynced] - Callback(item) invoked when an item syncs
 * @param {Object} [options] - Sync options
 * @param {boolean} [options.retryFailed=false] - Whether to re-attempt failed items (manual retry)
 * @returns {Promise<{ syncedCount: number, failedCount: number }>}
 */
export async function syncQueue(
  passedQueryClient = null,
  onItemSynced = null,
  options = {}
) {
  if (isSyncing) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const qc = passedQueryClient || defaultQueryClient;
  const retryFailed = !!options.retryFailed;

  // Verify network is available before proceeding
  // Note: Do NOT treat isInternetReachable === null as offline!
  const netState = await NetInfo.fetch();
  if (!netState.isConnected || netState.isInternetReachable === false) {
    return { syncedCount: 0, failedCount: 0 };
  }

  // Verify authentication
  const token = await storage.getItem("@auth_token");
  if (!token) {
    return { syncedCount: 0, failedCount: 0 };
  }

  isSyncing = true;
  notifyListeners();

  let syncedCount = 0;
  let failedCount = 0;

  try {
    await loadQueue();

    // Snapshot candidate IDs to prevent index shifting race conditions
    const candidateIds = memoryQueue
      .filter((item) => item.status === "pending" || (retryFailed && item.status === "failed"))
      .map((item) => item.id);

    for (const itemId of candidateIds) {
      const itemIndex = memoryQueue.findIndex((q) => q.id === itemId);
      if (itemIndex < 0) continue;
      const item = memoryQueue[itemIndex];

      item.status = "syncing";
      notifyListeners();

      try {
        const response = await apiFetch(item.url, {
          method: item.method || "POST",
          headers: {
            "Content-Type": "application/json",
            ...(item.headers || {}),
          },
          body: item.body ? JSON.stringify(item.body) : undefined,
          silent: true,
        });

        if (response.ok) {
          // Success! Remove this item from the queue
          memoryQueue = memoryQueue.filter((q) => q.id !== item.id);
          syncedCount++;

          // Invalidate associated React Query keys to pull fresh server state
          if (qc && Array.isArray(item.invalidateKeys)) {
            item.invalidateKeys.forEach((key) => {
              if (key) {
                qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
              }
            });
          }

          if (typeof onItemSynced === "function") {
            onItemSynced(item);
          }
        } else {
          // Response not OK
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.message || `Server returned ${response.status}`;

          // Client errors (4xx like 400 Bad Request, 403 Forbidden) won't succeed on automatic retry
          if (response.status >= 400 && response.status < 500) {
            item.status = "failed";
            item.lastError = errMsg;
            failedCount++;
          } else {
            // Server error (5xx) - leave as pending to retry later
            item.status = "pending";
            item.retryCount = (item.retryCount || 0) + 1;
            item.lastError = errMsg;
          }
        }
      } catch (networkErr) {
        console.warn(`[OfflineQueue] Network error syncing item ${item.id}:`, networkErr);
        item.status = "pending";
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = networkErr.message || "Network request failed";
        // Stop the sync pass if network dropped mid-sync
        break;
      }

      await persistQueue();
    }

    if (syncedCount > 0 && Platform.OS === "android") {
      ToastAndroid.show(
        `Synced ${syncedCount} offline ${syncedCount === 1 ? "change" : "changes"}`,
        ToastAndroid.SHORT
      );
    }
  } catch (err) {
    console.error("[OfflineQueue] Error during queue sync:", err);
  } finally {
    isSyncing = false;
    await persistQueue();
  }

  return { syncedCount, failedCount };
}

/**
 * React Hook to subscribe to offline queue changes.
 */
export function useOfflineQueue(passedQueryClient = null) {
  const qc = passedQueryClient || defaultQueryClient;
  const [queue, setQueue] = useState(memoryQueue || []);
  const [syncing, setSyncing] = useState(isSyncing);

  useEffect(() => {
    let isMounted = true;
    loadQueue().then((q) => {
      if (isMounted) {
        setQueue([...q]);
        setSyncing(isSyncing);
      }
    });

    const listener = (newQueue) => {
      if (isMounted) {
        setQueue([...newQueue]);
        setSyncing(isSyncing);
      }
    };

    listeners.add(listener);
    return () => {
      isMounted = false;
      listeners.delete(listener);
    };
  }, []);

  const pendingItems = queue.filter((i) => i.status === "pending" || i.status === "syncing");
  const failedItems = queue.filter((i) => i.status === "failed");

  const syncNow = useCallback(
    async (options = {}) => {
      return await syncQueue(qc, null, options);
    },
    [qc]
  );

  const remove = useCallback(async (id) => {
    await removeQueueItem(id);
  }, []);

  const clearFailed = useCallback(async () => {
    await clearFailedQueueItems();
  }, []);

  return {
    queue,
    pendingItems,
    failedItems,
    pendingCount: pendingItems.length,
    failedCount: failedItems.length,
    totalCount: queue.length,
    isSyncing: syncing,
    syncNow,
    removeItem: remove,
    clearFailed,
  };
}

export default {
  loadQueue,
  enqueueAction,
  removeQueueItem,
  resetOfflineQueue,
  clearFailedQueueItems,
  getQueue,
  getQueueCount,
  syncQueue,
  useOfflineQueue,
};
