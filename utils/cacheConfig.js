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
  /** 24 h stale, 48 h memory storage */
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    refetchOnMount: false,
  },

  /** 30 min stale, 4 h memory storage */
  STABLE: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 4 * 60 * 60 * 1000, // 4 hours
    refetchOnMount: false,
  },

  /** 5 min stale, 30 min memory storage */
  MODERATE: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },

  /** 30 s stale, 5 min memory storage */
  REAL_TIME: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },

  /** Vibes Feed: 2 min freshness with 2 hours cache persistence for fast/offline browsing */
  VIBES_FEED: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  },

  /** Vibes Home Widgets: 1 min freshness with 1 hour cache for stories tray & spotlight */
  VIBES_HOME: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  /** Vibes Realtime: 15s freshness with 10 min cache for comments & active interactions */
  VIBES_REALTIME: {
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
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
