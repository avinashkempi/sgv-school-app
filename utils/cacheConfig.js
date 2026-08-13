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
  /** 24 h stale, permanent offline storage */
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000,      // 24 hours
    gcTime: Infinity,                     // Never automatically delete
    refetchOnMount: false,
  },

  /** 30 min stale, permanent offline storage */
  STABLE: {
    staleTime: 30 * 60 * 1000,            // 30 minutes
    gcTime: Infinity,                     // Never automatically delete
    refetchOnMount: false,
  },

  /** 5 min stale, permanent offline storage */
  MODERATE: {
    staleTime: 5 * 60 * 1000,             // 5 minutes
    gcTime: Infinity,                     // Never automatically delete
  },

  /** 30 s stale, permanent offline storage */
  REAL_TIME: {
    staleTime: 30 * 1000,                 // 30 seconds
    gcTime: Infinity,                     // Never automatically delete
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
