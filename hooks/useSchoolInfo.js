import { useState, useEffect,} from 'react';
import apiConfig from '../config/apiConfig';
import apiFetch from '../utils/apiFetch';
import { SCHOOL as FALLBACK_SCHOOL } from '../constants/basic-info';
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_EXPIRY } from '../utils/cache';
import { useNetworkStatus } from '../components/NetworkStatusProvider';

// Global cache for school info to persist across component re-mounts
let globalSchoolInfo = null;
let globalLoading = true;
let globalError = null;
let isFetched = false;

export default function useSchoolInfo() {
  const [schoolInfo, setSchoolInfo] = useState(globalSchoolInfo || FALLBACK_SCHOOL);
  const [loading, setLoading] = useState(globalLoading);
  const [error, setError] = useState(globalError);

  const { isConnected, registerOnlineCallback } = useNetworkStatus();

  useEffect(() => {
    if (isFetched) {
      // If already fetched, use cached data
      setSchoolInfo(globalSchoolInfo);
      setLoading(globalLoading);
      setError(globalError);

      // If we have data but it might be stale, try to refresh silently if connected
      if (isConnected) {
        fetchFreshSchoolInfo(true);
      }
      return;
    }

    const fetchSchoolInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get cached data first
        const cachedSchoolInfo = await getCachedData(CACHE_KEYS.SCHOOL_INFO, CACHE_EXPIRY.SCHOOL_INFO);
        if (cachedSchoolInfo) {
          globalSchoolInfo = cachedSchoolInfo;
          setSchoolInfo(cachedSchoolInfo);
          setLoading(false);
          globalLoading = false;
          isFetched = true;

          // Fetch fresh data in background if connected
          if (isConnected) {
            fetchFreshSchoolInfo(true);
          }
          return;
        }

        // No cache, fetch from API if connected
        if (isConnected) {
          await fetchFreshSchoolInfo(true);
        } else {
          // Offline and no cache, use fallback

          globalSchoolInfo = FALLBACK_SCHOOL;
          setLoading(false);
          globalLoading = false;
          isFetched = true;
        }
      } catch (err) {

        // setError(err.message); // Suppress error
        // globalError = err.message;
        // Keep the fallback data already set in state
        globalSchoolInfo = FALLBACK_SCHOOL;
        setLoading(false);
        globalLoading = false;
        isFetched = true;
      }
    };

    fetchSchoolInfo();
  }, [isConnected]);

  const fetchFreshSchoolInfo = async (silent = false) => {
    if (!isConnected) return;

    try {

      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.schoolInfo.get), { silent });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Transform the data to match the expected structure
        const transformedData = {
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
          photoUrl: result.data.photoUrl || []
        };

        globalSchoolInfo = transformedData;
        setSchoolInfo(transformedData);

        // Cache the fresh data
        await setCachedData(CACHE_KEYS.SCHOOL_INFO, transformedData);
      } else {
        // If backend doesn't have data, keep fallback

        if (!globalSchoolInfo) globalSchoolInfo = FALLBACK_SCHOOL;
      }
    } catch (err) {

      // Don't override existing cached data if fetch fails
      if (!globalSchoolInfo) {
        // setError(err.message); // Suppress error
        // globalError = err.message;
        globalSchoolInfo = FALLBACK_SCHOOL;
      }
    }
  };

  // Register online callback
  useEffect(() => {
    const unsubscribe = registerOnlineCallback(() => {

      fetchFreshSchoolInfo(true);
    });
    return unsubscribe;
  }, [registerOnlineCallback]);

  return { schoolInfo, loading, error, refresh: fetchFreshSchoolInfo };
}
