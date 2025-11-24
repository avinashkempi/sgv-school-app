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

export default function useNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // Fetch news from API
  const fetchNewsFromAPI = useCallback(async () => {
    console.log('[NEWS] Fetching from API...');
    const response = await apiFetch(apiConfig.url(apiConfig.endpoints.news.list));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.news) {
      if (!Array.isArray(result.news)) {
        throw new Error('Invalid news data structure from API');
      }
      console.log(`[NEWS] Received ${result.news.length} news items from API`);
      return result.news;
    }
    
    return [];
  }, []);

  // Refresh news with caching
  const refreshNews = useCallback(async () => {
    const cacheKey = CACHE_KEYS.NEWS;

    if (isRefreshing(cacheKey)) {
      console.log('[NEWS] Refresh already in progress, skipping');
      return;
    }

    try {
      setRefreshLock(cacheKey);
      
      const newsData = await fetchNewsFromAPI();
      
      if (isMountedRef.current) {
        setNews(newsData);
        setError(null);
      }

      await setCachedData(cacheKey, newsData);
      console.log('[NEWS] Cached successfully');
    } catch (err) {
      console.error('[NEWS] Failed to fetch:', err.message);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      clearRefreshLock(cacheKey);
    }
  }, [fetchNewsFromAPI]);

  // Initial load with cache-first strategy
  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      const cacheKey = CACHE_KEYS.NEWS;

      try {
        // Step 1: Try to load from cache first
        const cachedNews = await getCachedData(cacheKey, CACHE_EXPIRY.NEWS);
        
        if (cachedNews && !cancelled) {
          console.log(`[NEWS] Loaded ${cachedNews.length} news items from cache`);
          setNews(cachedNews);
          setLoading(false);

          // Step 2: Check if cache is stale
          const isStale = await isCacheStale(cacheKey, STALE_TIME.NEWS);
          
          if (isStale) {
            console.log('[NEWS] Cache is stale, refreshing in background');
            refreshNews();
          }
        } else {
          // Step 3: No cache, fetch from API
          console.log('[NEWS] No cache found, fetching from API');
          await refreshNews();
          
          if (!cancelled) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[NEWS] Load error:', err);
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadNews();

    return () => {
      cancelled = true;
    };
  }, [refreshNews]);

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
