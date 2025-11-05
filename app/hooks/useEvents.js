import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/apiConfig';

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

        globalEvents = data.event || [];
        setEvents(globalEvents);
      } catch (err) {
        console.error('Failed to fetch events:', err.message);
        setError(err.message);
        globalEventsError = err.message;
        globalEvents = [];
        setEvents([]);
      } finally {
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

  return { events, loading, error, addEvent };
}
