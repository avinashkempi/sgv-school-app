import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/apiConfig';
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_EXPIRY } from '../utils/cache';
import apiFetch from '../_utils/apiFetch';
import mockEventsData from '../_utils/mockEvents.json';

// Global cache for events to persist across component re-mounts
let globalEvents = [];
let globalEventsLoading = true;
let globalEventsError = null;
let eventsFetched = false;

export default function useEvents() {
  const [events, setEvents] = useState(globalEvents);
  const [loading, setLoading] = useState(globalEventsLoading);
  const [error, setError] = useState(globalEventsError);

  useEffect(() => {
    if (eventsFetched) {
      // If already fetched, use cached data
      setEvents(globalEvents);
      setLoading(globalEventsLoading);
      setError(globalEventsError);
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get cached data first
        const cachedEvents = await getCachedData(CACHE_KEYS.EVENTS, CACHE_EXPIRY.EVENTS);
        if (cachedEvents) {
          globalEvents = cachedEvents;
          setEvents(globalEvents);
          setLoading(false);
          globalEventsLoading = false;
          eventsFetched = true;
          // Fetch fresh data in background
          fetchFreshEvents();
          return;
        }

        // No cache, load mock data while fetching from API
        const mockEvents = (mockEventsData.event || []).map(event => ({
          ...event,
          isSchoolEvent: Boolean(event.isSchoolEvent)
        }));
        globalEvents = mockEvents;
        setEvents(globalEvents);
        console.log('[EVENTS] Loaded mock events data. Fetching fresh data from API...');

        // Fetch fresh data in background
        await fetchFreshEvents();
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

    const fetchFreshEvents = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');

        const fetchOptions = {};
        if (token) {
          fetchOptions.headers = { Authorization: `Bearer ${token}` };
        }

        console.log('[EVENTS] Fetching fresh events from API...');
        const response = await apiFetch(apiConfig.url(apiConfig.endpoints.events.list), fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('[EVENTS] API response:', data);

        const eventsData = data.event || [];
        console.log(`[EVENTS] Received ${eventsData.length} events from API`);

        // Validate the data structure
        if (!Array.isArray(eventsData)) {
          throw new Error('Invalid events data structure from API');
        }

        globalEvents = eventsData;
        setEvents(globalEvents);
        setLoading(false);
        globalEventsLoading = false;
        globalEventsError = null;
        setError(null);
        eventsFetched = true;

        // Cache the fresh data
        await setCachedData(CACHE_KEYS.EVENTS, eventsData);
        console.log('[EVENTS] Fresh events cached successfully');
      } catch (err) {
        console.error('[EVENTS] Failed to fetch fresh events:', err.message);
        // If API fails but we have mock data, use that without setting error prominently
        if (globalEvents.length > 0) {
          console.log('[EVENTS] Using mock/cached events. Fresh fetch failed.');
        } else {
          // Only set error if we don't have any data at all
          setError(err.message);
          globalEventsError = err.message;
        }
        setLoading(false);
        globalEventsLoading = false;
        eventsFetched = true;
      }
    };

    fetchEvents();
  }, []);

  const addEvent = (newEvent) => {
    const normalized = { ...newEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;
    globalEvents = [...globalEvents, normalized];
    setEvents(globalEvents);
  };

  const updateEvent = (updatedEvent) => {
    const normalized = { ...updatedEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;
    globalEvents = globalEvents.map(event =>
      event._id === normalized._id ? normalized : event
    );
    setEvents(globalEvents);
  };

  const removeEvent = (eventId) => {
    globalEvents = globalEvents.filter(event => event._id !== eventId);
    setEvents(globalEvents);
  };

  return { events, loading, error, addEvent, updateEvent, removeEvent };
}
