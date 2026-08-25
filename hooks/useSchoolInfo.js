import { useCallback } from "react";
import apiConfig from "../config/apiConfig";
import { SCHOOL as FALLBACK_SCHOOL } from "../constants/basic-info";
import { useApiQuery } from "./useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Fetches and caches school info via React Query.
 *
 * Replaces the old dual-cache approach (manual AsyncStorage + global vars)
 * with a single React Query query that:
 *  - Persists to AsyncStorage via PersistQueryClientProvider
 *  - Stale-while-revalidates automatically
 *  - Uses FALLBACK_SCHOOL as placeholder while loading
 *  - Survives app restarts (30-day gcTime via STATIC tier)
 */

const normalizePhotos = (data) => {
  if (!data) return [];
  const raw = data.photoUrl ?? data.photoUrls ?? data.photourls ?? [];
  if (Array.isArray(raw)) {
    return raw
      .map((p) => (typeof p === "string" ? p.trim() : p?.url || ""))
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((p) => (typeof p === "string" ? p.trim() : p?.url || ""))
          .filter(Boolean);
      }
    } catch {
      // Not JSON, continue to delimiter split
    }
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const transformSchoolData = (result) => {
  if (result?.success && result?.data) {
    const photos = normalizePhotos(result.data);
    return {
      name: result.data.name,
      address: result.data.address,
      phone: result.data.phone,
      email: result.data.email,
      mapUrl: result.data.mapUrl,
      mapAppUrl: result.data.mapAppUrl,
      mission: result.data.mission,
      about: result.data.about,
      socials: result.data.socials,
      news: result.data.news || [],
      photoUrl: photos,
      photoUrls: photos,
    };
  }
  return null;
};

export default function useSchoolInfo() {
  const queryClient = useQueryClient();

  const {
    data: schoolInfo,
    isLoading: loading,
    error,
    refetch,
  } = useApiQuery(
    ["schoolInfo"],
    apiConfig.url(apiConfig.endpoints.schoolInfo.get),
    {
      ...CACHE_TIERS.STATIC,
      select: transformSchoolData,
      placeholderData: FALLBACK_SCHOOL,
      retry: 1,
    }
  );

  const refresh = useCallback(
    async (silent = false) => {
      try {
        await queryClient.invalidateQueries({ queryKey: ["schoolInfo"] });
        await refetch();
      } catch (err) {
        // Suppress errors on silent refresh
        if (!silent) {
          console.warn("[useSchoolInfo] Refresh failed:", err);
        }
      }
    },
    [queryClient, refetch]
  );

  return {
    schoolInfo: schoolInfo || FALLBACK_SCHOOL,
    loading,
    error,
    refresh,
  };
}
