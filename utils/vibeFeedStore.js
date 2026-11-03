import storage from "./storage";
import apiFetch from "./apiFetch";
import apiConfig from "../config/apiConfig";
import { prefetchMedia } from "./mediaCacheManager";

/**
 * Vibe Feed Store & Delta Sync Manager
 *
 * Implements intelligent incremental synchronization:
 * 1. Loads cached vibes from local storage instantly on launch (0ms network delay).
 * 2. On refresh / sync, sends the user's `lastSyncTimestamp` and `existingIds` to `POST /api/vibes/sync`.
 * 3. The server returns ONLY new vibes + updated interaction stats (likes/comments) for existing vibes.
 * 4. Existing images & videos are never fetched again from Cloudinary, conserving bandwidth & credits.
 * 5. Automatically kicks off background pre-caching for new media assets.
 */

const FEED_STORAGE_PREFIX = "@vibes_local_feed_v2_";
const SYNC_TIMESTAMP_PREFIX = "@vibes_last_sync_v2_";
const MAX_CACHED_VIBES = 120; // Keep up to 120 most recent vibes on local device

const getFeedKey = (userId) => `${FEED_STORAGE_PREFIX}${userId || "guest"}`;
const getSyncKey = (userId) => `${SYNC_TIMESTAMP_PREFIX}${userId || "guest"}`;

/**
 * Load cached feed and sync timestamp from local disk.
 */
export async function loadCachedFeed(userId) {
  try {
    const [rawFeed, lastSync] = await Promise.all([
      storage.getItem(getFeedKey(userId)),
      storage.getItem(getSyncKey(userId)),
    ]);

    const vibes = rawFeed ? JSON.parse(rawFeed) : [];
    return {
      vibes: Array.isArray(vibes) ? vibes : [],
      lastSync: lastSync || null,
    };
  } catch (error) {
    console.warn("[vibeFeedStore] Error loading cached feed:", error);
    return { vibes: [], lastSync: null };
  }
}

/**
 * Save cached feed and sync timestamp to local disk.
 */
export async function saveCachedFeed(userId, vibes, lastSync) {
  try {
    const trimmed = Array.isArray(vibes) ? vibes.slice(0, MAX_CACHED_VIBES) : [];
    const promises = [storage.setItem(getFeedKey(userId), JSON.stringify(trimmed))];
    if (lastSync) {
      promises.push(storage.setItem(getSyncKey(userId), lastSync));
    }
    await Promise.all(promises);
  } catch (error) {
    console.warn("[vibeFeedStore] Error saving feed:", error);
  }
}

/**
 * Perform bandwidth-optimized delta sync with the backend.
 *
 * @param {string} userId - Current user ID or "guest"
 * @param {Object} params
 * @param {Array} params.currentVibes - Currently loaded vibes
 * @param {string|null} params.lastSync - Timestamp of last sync
 * @param {string} [params.category] - Filter category
 * @param {string} [params.tag] - Filter tag
 * @param {string} [params.search] - Search text
 * @returns {Promise<{ vibes: Array, newCount: number, serverTime: string, success: boolean }>}
 */
export async function performDeltaSync(
  userId,
  {
    currentVibes = [],
    lastSync = null,
    category = "all",
    tag = "",
    search = "",
  } = {}
) {
  try {
    const existingIds = currentVibes.map((v) => v._id).filter(Boolean).slice(0, MAX_CACHED_VIBES);

    const syncUrl = `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.sync}`;
    const payload = {
      since: lastSync,
      existingIds,
      category: category && category !== "all" ? category : undefined,
      tag: tag || undefined,
      search: search ? search.trim() : undefined,
    };

    const response = await apiFetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sync failed with status: ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.message || "Sync failed");
    }

    const {
      newVibes = [],
      interactions = {},
      deletedIds = [],
      serverTime,
    } = json;

    const deletedSet = new Set(deletedIds.map((id) => String(id)));

    // 1. Update existing vibes in place with updated likes & comments
    const updatedExisting = currentVibes
      .filter((vibe) => !deletedSet.has(String(vibe._id)))
      .map((vibe) => {
        const idStr = String(vibe._id);
        const latestStats = interactions[idStr];
        if (latestStats) {
          return {
            ...vibe,
            likesCount: latestStats.likesCount,
            commentsCount: latestStats.commentsCount,
            isLiked: latestStats.isLiked,
            isBookmarked: latestStats.isBookmarked,
            isPinned: latestStats.isPinned ?? vibe.isPinned,
            isSpotlight: latestStats.isSpotlight ?? vibe.isSpotlight,
          };
        }
        return vibe;
      });

    // 2. Prepend newly fetched vibes (avoiding duplicates)
    const existingIdSet = new Set(updatedExisting.map((v) => String(v._id)));
    const freshVibes = newVibes.filter(
      (v) => !existingIdSet.has(String(v._id))
    );

    const mergedVibes = [...freshVibes, ...updatedExisting];

    // 3. Save to disk with updated server watermark timestamp
    await saveCachedFeed(userId, mergedVibes, serverTime);

    // 4. Background pre-warm media assets for fresh vibes so they are cached on disk
    if (freshVibes.length > 0) {
      const mediaUrlsToPrefetch = [];
      freshVibes.forEach((v) => {
        if (Array.isArray(v.images)) {
          v.images.forEach((img) => {
            if (img.url) mediaUrlsToPrefetch.push(img.url);
            if (img.thumbnailUrl) mediaUrlsToPrefetch.push(img.thumbnailUrl);
          });
        }
      });
      if (mediaUrlsToPrefetch.length > 0) {
        // Fire and forget in background
        prefetchMedia(mediaUrlsToPrefetch, { concurrency: 2 }).catch(() => {});
      }
    }

    return {
      vibes: mergedVibes,
      newCount: freshVibes.length,
      serverTime,
      success: true,
    };
  } catch (error) {
    console.warn("[vibeFeedStore] Delta sync error:", error?.message);
    return {
      vibes: currentVibes,
      newCount: 0,
      serverTime: lastSync,
      success: false,
    };
  }
}

export default {
  loadCachedFeed,
  saveCachedFeed,
  performDeltaSync,
};

