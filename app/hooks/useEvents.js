import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/apiConfig';
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_EXPIRY } from '../utils/cache';

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

        // No cache, fetch from API
        await fetchFreshEvents();
      } catch (err) {
        console.error('Failed to fetch events:', err.message);
        setError(err.message);
        globalEventsError = err.message;
        globalEvents = [];
        setEvents([]);
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

        const response = await fetch(apiConfig.url(apiConfig.endpoints.events.list), fetchOptions);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch events');
        }

        const eventsData = data.event || [];
        globalEvents = eventsData;
        setEvents(globalEvents);

        // Cache the fresh data
        await setCachedData(CACHE_KEYS.EVENTS, eventsData);
      } catch (err) {
        console.error('Failed to fetch fresh events:', err.message);
        // Don't override existing cached data if fetch fails
        if (!globalEvents.length) {
          setError(err.message);
          globalEventsError = err.message;
        }
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
