import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import apiFetch from "../utils/apiFetch";
import { enqueueAction } from "../utils/offlineQueue";

export { keepPreviousData };

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
  const { placeholderData = keepPreviousData, ...restOptions } = options;

  return useQuery({
    queryKey: key,
    placeholderData,
    queryFn: async () => {
      if (
        !url ||
        typeof url !== "string" ||
        url.includes("/undefined") ||
        url.includes("/null")
      ) {
        return null;
      }
      try {
        const response = await apiFetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const isAuthError =
            response.status === 401 ||
            (response.status === 403 &&
              errorData.message === "Invalid or expired token");
          const error = new ApiError(
            errorData.message || "Network response was not ok",
            response.status,
            isAuthError
          );
          throw error;
        }
        return response.json();
      } catch (error) {
        // Wrap pure native network errors defensively
        const isNetErr =
          (error instanceof TypeError &&
            (error.message.includes("Network request failed") ||
              error.message.includes("Failed to fetch") ||
              error.message.includes("Network request timed out"))) ||
          error?.name === "AbortError";

        if (isNetErr) {
          if (options.silent) {
            return null; // Gracefully degrade if requested
          }
          throw new ApiError("You are currently offline", 0, false);
        }
        throw error;
      }
    },
    // Prevent retry on auth errors (401)
    // For other errors, retry as per default or passed options
    retry: (failureCount, error) => {
      if (error?.isAuthError || (error?.status >= 400 && error?.status < 500)) {
        return false; // Don't retry 4xx client errors (like 401, 403, 404)
      }
      // For other errors, use default retry logic or passed retry option
      if (options.retry === false) {
        return false;
      }
      if (typeof options.retry === "number") {
        return failureCount < options.retry;
      }
      // Default retry 2 times for non-auth errors
      return failureCount < 2;
    },
    ...restOptions,
  });
}

export function useApiInfiniteQuery(key, urlFn, options = {}) {
  const queryClient = useQueryClient();

  // Guard against legacy non-infinite cached data shapes from previous app versions
  if (key) {
    const existingData = queryClient.getQueryData(key);
    if (existingData && !Array.isArray(existingData?.pages)) {
      queryClient.removeQueries({ queryKey: key, exact: true });
    }
  }

  const {
    initialPageParam = 1,
    getNextPageParam = (lastPage, allPages) => {
      if (lastPage?.pagination?.hasMore) {
        const pageNum = Number(lastPage?.pagination?.page);
        if (!isNaN(pageNum) && pageNum > 0) {
          return pageNum + 1;
        }
        const pagesCount = Array.isArray(allPages) ? allPages.length : 1;
        return pagesCount + 1;
      }
      if (
        lastPage?.pagination &&
        typeof lastPage.pagination.page === "number" &&
        typeof lastPage.pagination.pages === "number" &&
        lastPage.pagination.page < lastPage.pagination.pages
      ) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    ...restOptions
  } = options;

  return useInfiniteQuery({
    queryKey: key,
    initialPageParam,
    getNextPageParam,
    queryFn: async ({ pageParam = initialPageParam }) => {
      if (typeof urlFn !== "function") {
        return null;
      }
      try {
        const url = urlFn(pageParam);
        if (
          !url ||
          typeof url !== "string" ||
          url.includes("/undefined") ||
          url.includes("/null")
        ) {
          return null;
        }
        const response = await apiFetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const isAuthError =
            response.status === 401 ||
            (response.status === 403 &&
              errorData.message === "Invalid or expired token");
          const error = new ApiError(
            errorData.message || "Network response was not ok",
            response.status,
            isAuthError
          );
          throw error;
        }
        return response.json();
      } catch (error) {
        // Wrap pure native network errors defensively
        const isNetErr =
          (error instanceof TypeError &&
            (error.message.includes("Network request failed") ||
              error.message.includes("Failed to fetch") ||
              error.message.includes("Network request timed out"))) ||
          error?.name === "AbortError";

        if (isNetErr) {
          if (options.silent) {
            return null; // Gracefully degrade if requested
          }
          throw new ApiError("You are currently offline", 0, false);
        }
        throw error;
      }
    },
    // Prevent retry on auth errors (401)
    retry: (failureCount, error) => {
      if (error?.isAuthError || (error?.status >= 400 && error?.status < 500)) {
        return false; // Don't retry 4xx client errors
      }
      if (options.retry === false) {
        return false;
      }
      if (typeof options.retry === "number") {
        return failureCount < options.retry;
      }
      return failureCount < 2;
    },
    ...restOptions,
  });
}

/**
 * Wrapper around useMutation for API updates with optional Offline Queue support
 * @param {Object} options - Additional useMutation options
 * @param {Object} [options.offlineQueue] - Offline queue configuration
 * @param {string} options.offlineQueue.type - Action type identifier (e.g. 'MARK_ATTENDANCE')
 * @param {string|Function} [options.offlineQueue.tag] - Deduplication tag
 * @param {string|Function} [options.offlineQueue.description] - User-facing description
 * @param {string|Function} [options.offlineQueue.url] - Endpoint URL
 * @param {string} [options.offlineQueue.method='POST'] - HTTP method
 * @param {Function} [options.offlineQueue.onOptimisticUpdate] - Callback(variables, queryClient) for instant UI updates
 */
export function useApiMutation(options = {}) {
  const queryClient = useQueryClient();
  const {
    offlineQueue: queueConfig,
    mutationFn,
    onSuccess,
    onError,
    ...restOptions
  } = options;

  const handleOfflineEnqueue = async (variables) => {
    const type = queueConfig.type || "MUTATION";
    const tag =
      typeof queueConfig.tag === "function"
        ? queueConfig.tag(variables)
        : queueConfig.tag || null;
    const description =
      typeof queueConfig.description === "function"
        ? queueConfig.description(variables)
        : queueConfig.description || type;
    const url =
      typeof queueConfig.url === "function"
        ? queueConfig.url(variables)
        : queueConfig.url;
    const method = queueConfig.method || "POST";
    const body =
      typeof queueConfig.transformBody === "function"
        ? queueConfig.transformBody(variables)
        : variables;
    const headers =
      typeof queueConfig.headers === "function"
        ? queueConfig.headers(variables)
        : queueConfig.headers || {};
    const invalidateKeys =
      queueConfig.invalidateKeys || options.invalidateKeys || [];

    const enqueuedItem = await enqueueAction({
      type,
      tag,
      description,
      url,
      method,
      body,
      headers,
      invalidateKeys,
    });

    // Run optimistic cache updates if specified
    if (typeof queueConfig.onOptimisticUpdate === "function") {
      try {
        queueConfig.onOptimisticUpdate(variables, queryClient);
      } catch (optErr) {
        console.warn("[useApiMutation] onOptimisticUpdate error:", optErr);
      }
    }

    return {
      offlineQueued: true,
      queueItem: enqueuedItem,
      message: "Action saved offline. Will sync automatically when connected.",
    };
  };

  const wrappedMutationFn = async (variables) => {
    // If offlineQueue is enabled, check current network status before making request
    if (queueConfig) {
      try {
        const netState = await NetInfo.fetch();
        const isOffline =
          !netState.isConnected || netState.isInternetReachable === false;
        if (isOffline) {
          return await handleOfflineEnqueue(variables);
        }
      } catch {
        // Fall through to standard mutationFn
      }
    }

    try {
      return await mutationFn(variables);
    } catch (err) {
      // If mutation fails due to network error and offlineQueue is enabled, enqueue it!
      const isNetErr =
        err?.status === 0 ||
        err?.message?.includes("offline") ||
        (err instanceof TypeError &&
          (err.message.includes("Network request failed") ||
            err.message.includes("Failed to fetch") ||
            err.message.includes("Network request timed out"))) ||
        err?.name === "AbortError";

      if (queueConfig && isNetErr) {
        return await handleOfflineEnqueue(variables);
      }
      throw err;
    }
  };

  return useMutation({
    mutationFn: queueConfig ? wrappedMutationFn : mutationFn,
    onSuccess: (data, variables, context) => {
      const isOfflineQueued = !!data?.offlineQueued;

      // Only invalidate queries from options when synced live with backend
      // (Offline queued mutations will invalidate upon successful sync)
      if (!isOfflineQueued && options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({
            queryKey: Array.isArray(key) ? key : [key],
          });
        });
      }

      if (onSuccess) {
        onSuccess(data, variables, context, isOfflineQueued);
      }
    },
    onError: (error, variables, context) => {
      if (onError) {
        onError(error, variables, context);
      }
    },
    ...restOptions,
  });
}

/**
 * Helper to create a mutation function for apiFetch
 * @param {string} url
 * @param {string} method
 */
export const createApiMutationFn =
  (url, method = "POST") =>
  async (data) => {
    const response = await apiFetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Do not treat login 401 as a token expiration error
      const isLoginEndpoint = url.includes("/auth/login");
      const isAuthError =
        !isLoginEndpoint &&
        (response.status === 401 ||
          (response.status === 403 &&
            errorData.message === "Invalid or expired token"));

      const error = new ApiError(
        errorData.message || "Network request failed",
        response.status,
        isAuthError
      );
      throw error;
    }

    return response.json();
  };
