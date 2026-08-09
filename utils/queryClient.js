import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import storage from './storage';
import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Configure online status management
onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
        setOnline(!!state.isConnected);
    });
});

let globalRouter = null;
let globalShowToast = null;
let globalLogout = null;

export const setGlobalAuthHandler = (router, showToast, logout = null) => {
    globalRouter = router;
    globalShowToast = showToast;
    globalLogout = logout;
};

/**
 * Debounced auth error handler.
 * When multiple queries fail with 401 simultaneously (common on app open),
 * we only trigger logout once via the re-entrancy guard.
 */
let authErrorHandled = false;

function handleGlobalAuthError(error) {
    if (!error?.isAuthError || authErrorHandled) return;
    authErrorHandled = true;

    const message = error?.message || 'Session expired or invalid. Please log in again.';

    // Prefer AuthContext.logout if available (handles cache + FCM + state)
    if (globalLogout) {
        globalLogout(globalRouter, message, globalShowToast);
    } else {
        // Fallback to standalone logoutHandler
        const { logoutHandler } = require('./logoutHandler');
        logoutHandler(globalRouter, message, globalShowToast);
    }

    // Reset the flag after a delay so future genuine auth errors are still caught
    global.setTimeout(() => {
        authErrorHandled = false;
    }, 3000);
}

// Create a client with global 401 auth handling
export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            handleGlobalAuthError(error);
        }
    }),
    mutationCache: new MutationCache({
        onError: (error) => {
            handleGlobalAuthError(error);
        }
    }),
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: Infinity, // Permanent offline cache storage (like WhatsApp)
            retry: 2,
            networkMode: 'offlineFirst', // Run queries even if network seems offline
        },
    },
});

// Create a persister
export const persister = createAsyncStoragePersister({
    storage: storage,
    throttleTime: 3000, // Throttle saves to once every 3 seconds
});
