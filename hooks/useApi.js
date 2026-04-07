import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '../utils/apiFetch';

/**
 * Custom error class to track auth vs network errors
 */
class ApiError extends Error {
    constructor(message, status, isAuthError = false) {
        super(message);
        this.status = status;
        this.isAuthError = isAuthError;
    }
}

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
            try {
                const response = await apiFetch(url);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const isAuthError = response.status === 401;
                    const error = new ApiError(
                        errorData.message || 'Network response was not ok',
                        response.status,
                        isAuthError
                    );
                    throw error;
                }
                return response.json();
            } catch (error) {
                // Wrap pure native network errors defensively
                if (error instanceof TypeError && error.message.includes('Network request failed')) {
                    if (options.silent) {
                        return null; // Gracefully degrade if requested
                    }
                    throw new ApiError('You are currently offline', 0, false);
                }
                throw error;
            }
        },
        // Prevent retry on auth errors (401)
        // For other errors, retry as per default or passed options
        retry: (failureCount, error) => {
            if (error?.isAuthError) {
                return false; // Don't retry 401 errors
            }
            // For other errors, use default retry logic or passed retry option
            if (options.retry === false) {
                return false;
            }
            if (typeof options.retry === 'number') {
                return failureCount < options.retry;
            }
            // Default retry 2 times for non-auth errors
            return failureCount < 2;
        },
        ...options,
    });
}

/**
 * Wrapper around useInfiniteQuery for API fetching with pagination
 */
import { useInfiniteQuery } from '@tanstack/react-query';

export function useApiInfiniteQuery(key, urlFn, options = {}) {
    return useInfiniteQuery({
        queryKey: key,
        queryFn: async ({ pageParam = 1 }) => {
            try {
                const url = urlFn(pageParam);
                const response = await apiFetch(url);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const isAuthError = response.status === 401;
                    const error = new ApiError(
                        errorData.message || 'Network response was not ok',
                        response.status,
                        isAuthError
                    );
                    throw error;
                }
                return response.json();
            } catch (error) {
                // Wrap pure native network errors defensively
                if (error instanceof TypeError && error.message.includes('Network request failed')) {
                    if (options.silent) {
                        return null; // Gracefully degrade if requested
                    }
                    throw new ApiError('You are currently offline', 0, false);
                }
                throw error;
            }
        },
        // Prevent retry on auth errors (401)
        retry: (failureCount, error) => {
            if (error?.isAuthError) {
                return false;
            }
            if (options.retry === false) {
                return false;
            }
            if (typeof options.retry === 'number') {
                return failureCount < options.retry;
            }
            return failureCount < 2;
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
        const isAuthError = response.status === 401;
        const error = new ApiError(
            errorData.message || 'Network request failed',
            response.status,
            isAuthError
        );
        throw error;
    }

    return response.json();
};
