/**
 * Centralized cache tier configuration for React Query.
 *
 * Every useApiQuery call should use one of these presets instead of
 * ad-hoc staleTime / gcTime values. This keeps cache behaviour
 * consistent and predictable across the whole app.
 *
 * Tier guide:
 *   STATIC    – Data that almost never changes (school info, academic year list)
 *   STABLE    – Data that changes infrequently within a day (timetable, fee structure)
 *   MODERATE  – Data that can change several times a day (dashboards, attendance summary)
 *   REAL_TIME – Data that changes very frequently (live attendance marking, notification counts)
 */

export const CACHE_TIERS = {
  /** 24 h stale, 48 h cache retention */
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    refetchOnMount: false,
  },

  /** 30 min stale, 24 h cache retention */
  STABLE: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: false,
  },

  /** 5 min stale, 24 h cache retention */
  MODERATE: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },

  /** 30 s stale, 24 h cache retention */
  REAL_TIME: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },

  /** Vibes Feed: 24 hours freshness (once a day), 48 hours cache retention, no background refetch on mount */
  VIBES_FEED: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (refreshed at most once a day on open or on manual pull)
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache retention for offline browsing
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /** Vibes Home / Stories / Spotlight: 24 hours freshness with 48 hours cache retention */
  VIBES_HOME: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (once a day)
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /** Vibes Realtime: 15s freshness with 24 hours cache retention */
  VIBES_REALTIME: {
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * Convenience: merge a tier with any per-query overrides.
 * Example: `withTier(CACHE_TIERS.STABLE, { enabled: !!id })`
 */
export const withTier = (tier, overrides = {}) => ({
  ...tier,
  ...overrides,
});
