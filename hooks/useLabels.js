import { useCallback, useMemo } from 'react';
import apiConfig from '../config/apiConfig';
import LABELS from '../constants/labels/defaults';
import { useApiQuery } from './useApi';
import { CACHE_TIERS } from '../utils/cacheConfig';

/**
 * Deep merge two objects. Server values override local defaults.
 * Missing server keys fall back to the default value.
 */
function deepMerge(defaults, overrides) {
  if (!overrides || typeof overrides !== 'object') return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (
      overrides[key] &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      defaults[key] &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

/**
 * Safely access a nested value by dot-notation key.
 * Returns the value, the defaultValue, or the key itself as ultimate fallback.
 *
 * @param {Object} obj - The labels object
 * @param {string} key - Dot-notation key, e.g. 'common.cancel'
 * @param {string} [defaultValue] - Inline fallback value
 * @returns {string} The resolved label value
 */
function getByPath(obj, key, defaultValue) {
  const value = key.split('.').reduce((acc, k) => acc?.[k], obj);
  return value ?? defaultValue ?? key;
}

/**
 * Custom hook to fetch and cache UI labels from the server.
 *
 * Caching strategy:
 *  - STATIC tier: 24h staleTime, never garbage collected
 *  - Persisted to AsyncStorage via PersistQueryClientProvider
 *  - placeholderData = local defaults (instant render, no flash)
 *  - Server labels are deep-merged over local defaults
 *  - Version-based conditional fetching (HTTP 304)
 *
 * Usage:
 *   const { t, labels } = useLabels();
 *   <Text>{t('common.cancel', 'Cancel')}</Text>
 */
export default function useLabels() {
  const {
    data: serverLabels,
    isLoading,
    error,
    refetch,
  } = useApiQuery(
    ['appLabels'],
    `${apiConfig.baseUrl}/labels`,
    {
      ...CACHE_TIERS.STATIC,
      select: (result) => result?.data || null,
      placeholderData: { data: null }, // Don't wait for server — use defaults
      retry: 1,
    }
  );

  // Deep merge: server overrides local defaults, missing keys fall back to defaults
  const labels = useMemo(
    () => (serverLabels ? deepMerge(LABELS, serverLabels) : LABELS),
    [serverLabels]
  );

  // t() accessor: dot-notation path → string value
  const t = useCallback(
    (key, defaultValue) => getByPath(labels, key, defaultValue),
    [labels]
  );

  return {
    t,
    labels,
    isLoading,
    error,
    refetch,
  };
}
