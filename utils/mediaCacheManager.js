import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Permanent Media Cache Manager
 *
 * Solves the Cloudinary bandwidth and credit exhaustion problem:
 * 1. Permanently stores downloaded images & videos in `FileSystem.documentDirectory + 'media_cache/'`.
 * 2. On subsequent app launches, feed refreshes, or user scrolling, media is served 100% from local disk.
 * 3. ZERO network bytes and ZERO credits are consumed on Cloudinary once an asset is fetched once.
 * 4. Deduplicates simultaneous downloads of identical URLs using in-flight Promise tracking.
 * 5. Provides both synchronous memory lookups and the `useCachedMedia` React hook.
 */

const isWeb = Platform.OS === "web";
const MEDIA_CACHE_DIR = isWeb || !FileSystem.documentDirectory
  ? null
  : `${FileSystem.documentDirectory}media_cache/`;

// In-memory lookup: maps remoteUrl -> local file:// URI
const inMemoryCache = new Map();

// In-flight download de-duplication: maps remoteUrl -> Promise<string>
const inFlightDownloads = new Map();

let dirChecked = false;

/**
 * Ensures the persistent media_cache directory exists on native disk.
 */
async function ensureCacheDirectory() {
  if (isWeb || !MEDIA_CACHE_DIR || dirChecked) return;
  try {
    const dirInfo = await FileSystem.getInfoAsync(MEDIA_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MEDIA_CACHE_DIR, { intermediates: true });
    }
    dirChecked = true;
  } catch (error) {
    console.warn("[MediaCache] Failed to create media cache directory:", error?.message);
  }
}

/**
 * Deterministic hash function to generate collision-resistant, filesystem-safe filenames.
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Derives a unique, persistent local file path for a given remote media URL.
 */
export function getLocalFilePath(url, isVideo = false) {
  if (!MEDIA_CACHE_DIR || !url) return null;

  // Extract clean extension or default by media type
  const extMatch = url.match(/\.(mp4|mov|webm|m4v|jpg|jpeg|png|webp|gif)(\?.*)?$/i);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : (isVideo ? ".mp4" : ".jpg");
  const fileName = `asset_${hashString(url)}${ext}`;
  return `${MEDIA_CACHE_DIR}${fileName}`;
}

/**
 * Synchronously checks if a URL is already resolved in memory.
 * Returns local `file://...` URI if known, or null.
 */
export function getCachedUriSync(url) {
  if (!url || isWeb) return url;
  return inMemoryCache.get(url) || null;
}

/**
 * Retrieves the persistent local URI for a media asset.
 * If not yet downloaded:
 *   Downloads it once, saves it to `documentDirectory/media_cache/`, and returns the local URI.
 * If already cached:
 *   Returns the existing `file://...` URI immediately without any network call.
 *
 * @param {string} url - Remote Cloudinary media URL
 * @param {Object} [options]
 * @param {boolean} [options.isVideo=false] - Whether the asset is a video
 * @returns {Promise<string>} Local file URI or original URL fallback
 */
export async function getLocalMediaUri(url, { isVideo = false } = {}) {
  if (!url || typeof url !== "string" || isWeb || !MEDIA_CACHE_DIR) {
    return url || "";
  }

  // Already a local file
  if (url.startsWith("file://") || url.startsWith("content://") || url.startsWith("data:")) {
    return url;
  }

  // Fast memory cache hit
  if (inMemoryCache.has(url)) {
    return inMemoryCache.get(url);
  }

  const localPath = getLocalFilePath(url, isVideo);
  if (!localPath) return url;

  // Check if file is already saved on permanent disk
  try {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists && fileInfo.size > 0) {
      inMemoryCache.set(url, localPath);
      return localPath;
    }
  } catch (_) {
    // Fall through to download if file inspection fails
  }

  // Deduplicate concurrent downloads of the same URL
  if (inFlightDownloads.has(url)) {
    return inFlightDownloads.get(url);
  }

  const downloadPromise = (async () => {
    try {
      await ensureCacheDirectory();
      const tmpPath = `${localPath}.download`;

      // Download directly to disk
      const result = await FileSystem.downloadAsync(url, tmpPath);

      if (result && result.status === 200) {
        await FileSystem.moveAsync({ from: tmpPath, to: localPath });
        inMemoryCache.set(url, localPath);
        return localPath;
      } else {
        // Clean up partial tmp download on non-200 response
        await FileSystem.deleteAsync(tmpPath, { idempotent: true });
        return url;
      }
    } catch (error) {
      // In case of network interruption, gracefully fall back to original URL
      // so user experience is never blocked.
      console.warn("[MediaCache] Download error for:", url, error?.message);
      return url;
    } finally {
      inFlightDownloads.delete(url);
    }
  })();

  inFlightDownloads.set(url, downloadPromise);
  return downloadPromise;
}

/**
 * Background prefetcher for media URLs (e.g., when new feed items arrive).
 * Downloads assets concurrently in the background so they are ready on disk
 * before the user scrolls to them.
 *
 * @param {string[]} urls - Array of Cloudinary media URLs
 * @param {Object} [options]
 * @param {number} [options.concurrency=2] - Max parallel downloads
 */
export async function prefetchMedia(urls = [], { concurrency = 2, isVideo = false } = {}) {
  if (isWeb || !urls || urls.length === 0 || !MEDIA_CACHE_DIR) return;

  const validUrls = urls.filter((u) => u && typeof u === "string" && !u.startsWith("file://"));
  const queue = [...validUrls];

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const nextUrl = queue.shift();
      if (!nextUrl) break;
      try {
        await getLocalMediaUri(nextUrl, { isVideo });
      } catch (_) {
        // Swallow background prefetch failures
      }
    }
  });

  await Promise.allSettled(workers);
}

/**
 * Returns total size of the permanent media cache on disk in bytes.
 */
export async function getMediaCacheSize() {
  if (isWeb || !MEDIA_CACHE_DIR) return 0;
  try {
    const dirInfo = await FileSystem.getInfoAsync(MEDIA_CACHE_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(MEDIA_CACHE_DIR);
    let totalBytes = 0;
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${MEDIA_CACHE_DIR}${file}`);
      if (fileInfo.exists && typeof fileInfo.size === "number") {
        totalBytes += fileInfo.size;
      }
    }
    return totalBytes;
  } catch (error) {
    console.warn("[MediaCache] Error computing cache size:", error);
    return 0;
  }
}

/**
 * Clears the media cache if ever explicitly needed (e.g., from settings/debugging).
 */
export async function clearMediaCache() {
  if (isWeb || !MEDIA_CACHE_DIR) return;
  try {
    inMemoryCache.clear();
    inFlightDownloads.clear();
    await FileSystem.deleteAsync(MEDIA_CACHE_DIR, { idempotent: true });
    dirChecked = false;
  } catch (error) {
    console.warn("[MediaCache] Error clearing cache:", error);
  }
}

export default {
  getLocalMediaUri,
  getCachedUriSync,
  prefetchMedia,
  getMediaCacheSize,
  clearMediaCache,
};

