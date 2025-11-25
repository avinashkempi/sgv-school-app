import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // Fetch events from API  
  const fetchEventsFromAPI = useCallback(async (startDate, endDate) => {
    const token = await AsyncStorage.getItem('@auth_token');
    const fetchOptions = {};
    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
    }

    const queryParts = [];
    if (startDate) queryParts.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) queryParts.push(`endDate=${encodeURIComponent(endDate)}`);
    if (!startDate && !endDate) queryParts.push('limit=100');

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    console.log(`[EVENTS] Fetching from API... ${queryString}`);
    const response = await apiFetch(
      apiConfig.url(`${apiConfig.endpoints.events.list}${queryString}`),
      fetchOptions
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const eventsData = data.event || [];

    if (!Array.isArray(eventsData)) {
      throw new Error('Invalid events data structure from API');
    }

    console.log(`[EVENTS] Received ${eventsData.length} events from API`);
    return eventsData;
  }, []);

  // Fetch events with smart caching
  const fetchEventsRange = useCallback(async (startDate, endDate, callback) => {
    const cacheKey = CACHE_KEYS.EVENTS;

    // Prevent duplicate fetches
    if (isRefreshing(cacheKey)) {
      console.log('[EVENTS] Refresh already in progress, skipping');
      if (callback) callback(null, 0);
      return;
    }

    try {
      setRefreshLock(cacheKey);

      const eventsData = await fetchEventsFromAPI(startDate, endDate);

      if (isMountedRef.current) {
        setEvents(eventsData);
        setError(null);
      }

      await setCachedData(cacheKey, eventsData);
      console.log('[EVENTS] Cached successfully');

      if (callback) callback(null, eventsData.length);
    } catch (err) {
      console.error('[EVENTS] Failed to fetch:', err.message);
      if (isMountedRef.current) {
        setError(err.message);
      }
      if (callback) callback(err);
    } finally {
      clearRefreshLock(cacheKey);
    }
  }, [fetchEventsFromAPI]);

  // Initial load with cache-first strategy
  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      const cacheKey = CACHE_KEYS.EVENTS;

      try {
        // Step 1: Try to load from cache first
        const cachedEvents = await getCachedData(cacheKey, CACHE_EXPIRY.EVENTS);

        if (cachedEvents && cachedEvents.length > 0 && !cancelled) {
          console.log(`[EVENTS] Loaded ${cachedEvents.length} events from cache`);
          setEvents(cachedEvents);
          setLoading(false);

          // Step 2: Check if cache is stale
          const isStale = await isCacheStale(cacheKey, STALE_TIME.EVENTS);

          if (isStale) {
            console.log('[EVENTS] Cache is stale, refreshing in background');
            // Refresh in background without showing loader
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
            fetchEventsRange(startOfMonth, endOfMonth);
          }
        } else {
          // Step 3: No cache, fetch from API
          console.log('[EVENTS] No cache found, fetching from API');
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

          await fetchEventsRange(startOfMonth, endOfMonth);

          if (!cancelled) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[EVENTS] Load error:', err);
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [fetchEventsRange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper functions for CRUD operations
  const addEvent = useCallback((newEvent) => {
    const normalized = { ...newEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;
    normalized.isSchoolEvent = Boolean(normalized.isSchoolEvent);

    setEvents(prev => {
      const updated = [...prev, normalized];
      // Update cache in background
      setCachedData(CACHE_KEYS.EVENTS, updated);
      return updated;
    });
  }, []);

  const updateEvent = useCallback((updatedEvent) => {
    const normalized = { ...updatedEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;

    setEvents(prev => {
      const updated = prev.map(event =>
        event._id === normalized._id ? normalized : event
      );
      // Update cache in background
      setCachedData(CACHE_KEYS.EVENTS, updated);
      return updated;
    });
  }, []);

  const removeEvent = useCallback((eventId) => {
    setEvents(prev => {
      const updated = prev.filter(event => event._id !== eventId);
      // Update cache in background
      setCachedData(CACHE_KEYS.EVENTS, updated);
      return updated;
    });
  }, []);

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    removeEvent,
    fetchEventsRange
  };
}
