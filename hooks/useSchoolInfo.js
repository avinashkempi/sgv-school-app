import { useState, useEffect, useRef } from 'react';
import apiConfig from '../config/apiConfig';
import apiFetch from '../utils/apiFetch';
import { SCHOOL as FALLBACK_SCHOOL } from '../constants/basic-info';
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_EXPIRY } from '../utils/cache';

// Global cache for school info to persist across component re-mounts
let globalSchoolInfo = null;
let globalLoading = true;
let globalError = null;
let isFetched = false;

export default function useSchoolInfo() {
  const [schoolInfo, setSchoolInfo] = useState(globalSchoolInfo || FALLBACK_SCHOOL);
  const [loading, setLoading] = useState(globalLoading);
  const [error, setError] = useState(globalError);

  useEffect(() => {
    if (isFetched) {
      // If already fetched, use cached data
      setSchoolInfo(globalSchoolInfo);
      setLoading(globalLoading);
      setError(globalError);
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
          // Fetch fresh data in background
          fetchFreshSchoolInfo();
          return;
        }

        // No cache, fetch from API
        await fetchFreshSchoolInfo();
      } catch (err) {
        console.warn('Failed to fetch school info from backend, using fallback:', err.message);
        setError(err.message);
        globalError = err.message;
        // Keep the fallback data already set in state
        globalSchoolInfo = FALLBACK_SCHOOL;
        setLoading(false);
        globalLoading = false;
        isFetched = true;
      }
    };

    const fetchFreshSchoolInfo = async () => {
      try {
        const response = await apiFetch(apiConfig.url(apiConfig.endpoints.schoolInfo.get));

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
            news: result.data.news || []
          };

          globalSchoolInfo = transformedData;
          setSchoolInfo(transformedData);

          // Cache the fresh data
          await setCachedData(CACHE_KEYS.SCHOOL_INFO, transformedData);
        } else {
          // If backend doesn't have data, keep fallback
          console.warn('Backend returned no school info data, using fallback');
          globalSchoolInfo = FALLBACK_SCHOOL;
        }
      } catch (err) {
        console.warn('Failed to fetch fresh school info:', err.message);
        // Don't override existing cached data if fetch fails
        if (!globalSchoolInfo) {
          setError(err.message);
          globalError = err.message;
          globalSchoolInfo = FALLBACK_SCHOOL;
        }
      }
    };

    fetchSchoolInfo();
  }, []);

  return { schoolInfo, loading, error };
}
