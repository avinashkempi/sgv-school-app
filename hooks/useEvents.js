import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiConfig from '../config/apiConfig';
import { useApiQuery } from './useApi';
import { CACHE_TIERS } from '../utils/cacheConfig';

/**
 * Fetches and caches events via React Query.
 *
 * Replaces the old dual-cache approach (manual AsyncStorage cache.js +
 * refresh locks + manual stale-while-revalidate) with a single React Query
 * query that handles all of this automatically.
 *
 * The hook fetches a 3-month window of events (previous month → next month)
 * and provides CRUD helpers that do optimistic updates via queryClient.setQueryData.
 */

import { getISTDateString } from '../utils/date';

const DEFAULT_QUERY_KEY = 'events';

function getDefaultDateRange() {
  const now = new Date();
  const startOfMonth = getISTDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const endOfMonth = getISTDateString(new Date(now.getFullYear(), now.getMonth() + 2, 0));
  return { startDate: startOfMonth, endDate: endOfMonth };
}

function buildEventsUrl(startDate, endDate) {
  const queryParts = [];
  if (startDate) queryParts.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) queryParts.push(`endDate=${encodeURIComponent(endDate)}`);
  if (!startDate && !endDate) queryParts.push('limit=100');
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiConfig.url(`${apiConfig.endpoints.events.list}${queryString}`);
}

export default function useEvents() {
  const queryClient = useQueryClient();

  const { startDate, endDate } = getDefaultDateRange();
  const eventsUrl = buildEventsUrl(startDate, endDate);

  const {
    data: events = [],
    isLoading: loading,
    error,
    refetch,
  } = useApiQuery(
    [DEFAULT_QUERY_KEY],
    eventsUrl,
    {
      ...CACHE_TIERS.MODERATE,
      select: (data) => {
        // API returns { event: [...] }
        const eventsData = data?.event || data || [];
        if (!Array.isArray(eventsData)) return [];
        return eventsData;
      },
    }
  );

  // Fetch events for a specific date range (used by calendar views)
  const fetchEventsRange = useCallback(async (start, end, callback, silent = false) => {
    try {
      const url = buildEventsUrl(start, end);
      // Prefetch into the same query key so data is unified
      await queryClient.prefetchQuery({
        queryKey: [DEFAULT_QUERY_KEY],
        queryFn: async () => {
          const { default: apiFetch } = await import('../utils/apiFetch');
          const response = await apiFetch(url, { silent });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        },
        staleTime: CACHE_TIERS.MODERATE.staleTime,
      });
      if (callback) callback(null, 0);
    } catch (err) {
      if (callback) callback(err);
    }
  }, [queryClient]);

  // ── CRUD helpers with optimistic updates ──

  const addEvent = useCallback((newEvent) => {
    const normalized = { ...newEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;
    if (typeof normalized.isSchoolEvent === 'string') {
      normalized.isSchoolEvent = normalized.isSchoolEvent === 'true';
    } else {
      normalized.isSchoolEvent = Boolean(normalized.isSchoolEvent);
    }

    queryClient.setQueryData([DEFAULT_QUERY_KEY], (old) => {
      const oldData = old?.event || old || [];
      return { event: [...oldData, normalized] };
    });
  }, [queryClient]);

  const updateEvent = useCallback((updatedEvent) => {
    const normalized = { ...updatedEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;

    queryClient.setQueryData([DEFAULT_QUERY_KEY], (old) => {
      const oldData = old?.event || old || [];
      return {
        event: oldData.map(event =>
          event._id === normalized._id ? normalized : event
        ),
      };
    });
  }, [queryClient]);

  const removeEvent = useCallback((eventId) => {
    queryClient.setQueryData([DEFAULT_QUERY_KEY], (old) => {
      const oldData = old?.event || old || [];
      return {
        event: oldData.filter(event => event._id !== eventId),
      };
    });
  }, [queryClient]);

  const refreshEvents = useCallback(async (silent = true) => {
    try {
      await refetch();
    } catch (err) {
      if (!silent) {
        console.warn('[useEvents] Refresh failed:', err);
      }
    }
  }, [refetch]);

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    removeEvent,
    fetchEventsRange,
    refreshEvents,
  };
}
