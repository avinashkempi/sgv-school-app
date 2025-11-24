import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/apiConfig';
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_EXPIRY } from '../utils/cache';
import apiFetch from '../utils/apiFetch';
import mockEventsData from '../utils/mockEvents.json';

// Global cache for events to persist across component re-mounts
let globalEvents = [];
let globalEventsLoading = true;
let globalEventsError = null;
let eventsFetched = false;

export default function useEvents() {
  const [events, setEvents] = useState(globalEvents);
  const [loading, setLoading] = useState(globalEventsLoading);
  const [error, setError] = useState(globalEventsError);

  // This function will be exposed and can be called to fetch events for a specific range
  const fetchEventsRange = async (startDate, endDate, callback) => {
    try {
      // setLoading(true); // Indicate loading for this specific range fetch
      setError(null); // Clear previous errors for this fetch

      const token = await AsyncStorage.getItem('@auth_token');

      const fetchOptions = {};
      if (token) {
        fetchOptions.headers = { Authorization: `Bearer ${token}` };
      }

      // Build query params manually to avoid URLSearchParams issues in some RN environments
      const queryParts = [];
      if (startDate) queryParts.push(`startDate=${encodeURIComponent(startDate)}`);
      if (endDate) queryParts.push(`endDate=${encodeURIComponent(endDate)}`);
      
      // Default to fetching 100 events if no date range (safety net)
      if (!startDate && !endDate) queryParts.push('limit=100');

      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

      console.log(`[EVENTS] Fetching fresh events from API... ${queryString}`);
      const response = await apiFetch(apiConfig.url(`${apiConfig.endpoints.events.list}${queryString}`), fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[EVENTS] API response success');

      const eventsData = data.event || [];
      console.log(`[EVENTS] Received ${eventsData.length} events from API`);

      // Validate the data structure
      if (!Array.isArray(eventsData)) {
        throw new Error('Invalid events data structure from API');
      }

      // Replace globalEvents entirely with fresh fetched data
      globalEvents = eventsData;
      
      setEvents(globalEvents);
      // Do not set globalEventsLoading/Error/eventsFetched here, as this is a range fetch, not initial load
      setError(null); // Clear error if successful

      // Cache the updated full list
      await setCachedData(CACHE_KEYS.EVENTS, globalEvents);
      console.log('[EVENTS] Fresh events cached successfully');
      if (typeof callback === 'function') {
        callback(null, eventsData.length);
      }
    } catch (err) {
      console.error('[EVENTS] Failed to fetch fresh events:', err.message);
      if (typeof callback === 'function') {
        callback(err);
      }
      // If API fails but we have mock data, use that without setting error prominently
      if (globalEvents.length > 0) {
        console.log('[EVENTS] Using mock/cached events. Fresh fetch failed.');
      } else {
        // Only set error if we don't have any data at all
        setError(err.message);
      }
    } finally {
      // setLoading(false); // Always set loading to false after fetch attempt
    }
  };

  useEffect(() => {
    if (eventsFetched) {
      // If already fetched, use cached data
      setEvents(globalEvents);
      setLoading(globalEventsLoading);
      setError(globalEventsError);
      return;
    }

    const fetchInitialEvents = async () => {
      try {
        // setLoading(true);
        setError(null);

        // Try to get cached data first
        const cachedEvents = await getCachedData(CACHE_KEYS.EVENTS, CACHE_EXPIRY.EVENTS);
        if (cachedEvents) {
          globalEvents = cachedEvents;
          setEvents(globalEvents);
          setLoading(false); // Ensure loading is set to false immediately
          globalEventsLoading = false;
          eventsFetched = true;
          
          // Fetch fresh data in background
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(); // Last month
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString(); // Next month
          fetchEventsRange(startOfMonth, endOfMonth);
          return;
        }

        // No cache, load mock data while fetching from API
        const mockEvents = (mockEventsData.event || []).map(event => ({
          ...event,
          isSchoolEvent: Boolean(event.isSchoolEvent)
        }));
        globalEvents = mockEvents;
        setEvents(globalEvents);
        setLoading(false); // Show mock data immediately
        console.log('[EVENTS] Loaded mock events data. Fetching fresh data from API...');

        // Fetch fresh data in background using the new fetchEventsRange
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(); // Last month
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString(); // Next month
        await fetchEventsRange(startOfMonth, endOfMonth);

        // After initial fetch (mock or fresh), update global states
        globalEventsLoading = false;
        globalEventsError = null;
        eventsFetched = true;

      } catch (err) {
        console.error('Failed to fetch events:', err.message);
        setError(err.message);
        globalEventsError = err.message;
        // If we already have mock data loaded, keep it; otherwise set empty
        if (!globalEvents.length) {
          const mockEvents = (mockEventsData.event || []).map(event => ({
            ...event,
            isSchoolEvent: Boolean(event.isSchoolEvent)
          }));
          globalEvents = mockEvents;
          setEvents(globalEvents);
        }
        setLoading(false);
        globalEventsLoading = false;
        eventsFetched = true;
      }
    };

    // Initial fetch logic moved to a separate effect or called here
    // We'll use a ref or just call it directly if we want to load on mount
    fetchInitialEvents();
  }, []);

  const addEvent = (newEvent) => {
    const normalized = { ...newEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;
    // Ensure isSchoolEvent is boolean
    normalized.isSchoolEvent = Boolean(normalized.isSchoolEvent);
    globalEvents = [...globalEvents, normalized];
    setEvents([...globalEvents]);
  };

  const updateEvent = (updatedEvent) => {
    const normalized = { ...updatedEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;
    globalEvents = globalEvents.map(event =>
      event._id === normalized._id ? normalized : event
    );
    setEvents([...globalEvents]);
  };

  const removeEvent = (eventId) => {
    globalEvents = globalEvents.filter(event => event._id !== eventId);
    setEvents(globalEvents);
  };

  return { events, loading, error, addEvent, updateEvent, removeEvent, fetchEventsRange };
}
