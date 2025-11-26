import { useState, useEffect, useCallback, useRef } from 'react';
import apiConfig from '../config/apiConfig';
import {
  getCachedData,
  setCachedData,
  isCacheStale,
  isRefreshing,
  setRefreshLock,
  clearRefreshLock,
  CACHE_KEYS,
  CACHE_EXPIRY,
  STALE_TIME
} from '../utils/cache';
import apiFetch from '../utils/apiFetch';
import { useNetworkStatus } from '../components/NetworkStatusProvider';

export default function useNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const { isConnected, registerOnlineCallback } = useNetworkStatus();

  // Fetch news from API
  const fetchNewsFromAPI = useCallback(async (silent = false) => {


    const response = await apiFetch(apiConfig.url(apiConfig.endpoints.news.list), { silent });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.news) {
      if (!Array.isArray(result.news)) {
        throw new Error('Invalid news data structure from API');
      }

      return result.news;
    }

    return [];
  }, []);

  // Refresh news with caching
  const refreshNews = useCallback(async (silent = false) => {
    const cacheKey = CACHE_KEYS.NEWS;

    // If offline, just return (we rely on cache)
    if (!isConnected) {
      return;
    }

    if (isRefreshing(cacheKey)) {
      return;
    }

    try {
      setRefreshLock(cacheKey);

      const newsData = await fetchNewsFromAPI(silent);

      if (isMountedRef.current) {
        setNews(newsData);
        setError(null);
      }

      await setCachedData(cacheKey, newsData);

    } catch (err) {
      // Suppress network errors as requested
    } finally {
    }
  }, [fetchNewsFromAPI, isConnected]);

  // Initial load with cache-first strategy
  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      const cacheKey = CACHE_KEYS.NEWS;

      try {
        // Step 1: Try to load from cache first
        const cachedNews = await getCachedData(cacheKey, CACHE_EXPIRY.NEWS);

        if (cachedNews && !cancelled) {

          setNews(cachedNews);
          setLoading(false);

          // Step 2: Check if cache is stale
          const isStale = await isCacheStale(cacheKey, STALE_TIME.NEWS);

          if (isStale && isConnected) {
            refreshNews(true); // silent=true
          }
        } else {
          // Step 3: No cache, fetch from API
          await refreshNews(true); // silent=true

          if (!cancelled) {
            setLoading(false);
          }
        }
      } catch (err) {

        if (!cancelled) {
          // setError(err.message); // Suppress error
          setLoading(false);
        }
      }
    };

    loadNews();

    return () => {
      cancelled = true;
    };
  }, [refreshNews, isConnected]);

  // Register online callback
  useEffect(() => {
    const unsubscribe = registerOnlineCallback(() => {
      refreshNews(true); // silent refresh
    });
    return unsubscribe;
  }, [registerOnlineCallback, refreshNews]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper for adding news
  const addNews = useCallback((newNewsItem) => {
    setNews(prev => {
      const updated = [newNewsItem, ...prev];
      setCachedData(CACHE_KEYS.NEWS, updated);
      return updated;
    });
  }, []);

  // Helper for updating news
  const updateNews = useCallback((updatedNewsItem) => {
    setNews(prev => {
      const updated = prev.map(item =>
        item._id === updatedNewsItem._id ? updatedNewsItem : item
      );
      setCachedData(CACHE_KEYS.NEWS, updated);
      return updated;
    });
  }, []);

  // Helper for deleting news
  const deleteNews = useCallback((newsId) => {
    setNews(prev => {
      const updated = prev.filter(item => item._id !== newsId);
      setCachedData(CACHE_KEYS.NEWS, updated);
      return updated;
    });
  }, []);

  return {
    news,
    loading,
    error,
    refreshNews,
    addNews,
    updateNews,
    deleteNews
  };
}
