import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '../utils/apiFetch';

/**
 * Wrapper around useQuery for API fetching
 * @param {Array} key - Query key
 * @param {string} url - API URL
 * @param {Object} options - Additional useQuery options
 */
export function useApiQuery(key, url, options = {}) {
    return useQuery({
        queryKey: key,
        queryFn: async () => {
            const response = await apiFetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Network response was not ok');
            }
            return response.json();
        },
        ...options,
    });
}

/**
 * Wrapper around useMutation for API updates
 * @param {Function} mutationFn - Function to perform the mutation
 * @param {Object} options - Additional useMutation options
 */
export function useApiMutation(options = {}) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        onSuccess: (...args) => {
            // Invalidate queries if specified
            if (options.invalidateKeys) {
                options.invalidateKeys.forEach((key) => {
                    queryClient.invalidateQueries({ queryKey: key });
                });
            }
            if (options.onSuccess) {
                options.onSuccess(...args);
            }
        },
    });
}

/**
 * Helper to create a mutation function for apiFetch
 * @param {string} url 
 * @param {string} method 
 */
export const createApiMutationFn = (url, method = 'POST') => async (data) => {
    const response = await apiFetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Network request failed');
    }

    return response.json();
};
