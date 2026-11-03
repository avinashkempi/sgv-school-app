import { useState, useEffect, useRef } from "react";
import { getLocalMediaUri, getCachedUriSync } from "../utils/mediaCacheManager";

/**
 * useCachedMedia
 *
 * Hook to resolve a Cloudinary remote URL to a permanently cached local file URI.
 * - If already cached on disk, returns `uri: file://...` on mount (0ms delay).
 * - If not yet cached, initiates background download and seamlessly flips `uri` to `file://...`
 *   once saved.
 * - Guarantees zero redundant Cloudinary network requests.
 *
 * @param {string} remoteUrl - Cloudinary image or video URL
 * @param {Object} [options]
 * @param {boolean} [options.isVideo=false] - Whether the asset is a video
 * @returns {{ uri: string, isLocal: boolean, isLoading: boolean }}
 */
export function useCachedMedia(remoteUrl, { isVideo = false } = {}) {
  const syncUri = getCachedUriSync(remoteUrl);
  const [uri, setUri] = useState(syncUri || remoteUrl || "");
  const [isLocal, setIsLocal] = useState(Boolean(syncUri && syncUri.startsWith("file://")));
  const [isLoading, setIsLoading] = useState(!syncUri && Boolean(remoteUrl));
  const activeUrlRef = useRef(remoteUrl);

  useEffect(() => {
    activeUrlRef.current = remoteUrl;
    if (!remoteUrl) {
      setUri("");
      setIsLocal(false);
      setIsLoading(false);
      return;
    }

    // Check synchronous memory cache first
    const memoryUri = getCachedUriSync(remoteUrl);
    if (memoryUri && memoryUri.startsWith("file://")) {
      setUri(memoryUri);
      setIsLocal(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getLocalMediaUri(remoteUrl, { isVideo })
      .then((resolvedUri) => {
        if (isMounted && activeUrlRef.current === remoteUrl) {
          setUri(resolvedUri);
          setIsLocal(Boolean(resolvedUri && resolvedUri.startsWith("file://")));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted && activeUrlRef.current === remoteUrl) {
          setUri(remoteUrl);
          setIsLocal(false);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [remoteUrl, isVideo]);

  return { uri, isLocal, isLoading };
}

export default useCachedMedia;

