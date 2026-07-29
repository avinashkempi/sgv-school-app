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

export const setGlobalAuthHandler = (router, showToast) => {
    globalRouter = router;
    globalShowToast = showToast;
};

// Create a client with global 401 auth handling
export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            if (error?.isAuthError) {
                const { logoutHandler } = require('./logoutHandler');
                logoutHandler(
                    globalRouter,
                    error?.message || 'Session expired or invalid. Please log in again.',
                    globalShowToast
                );
            }
        }
    }),
    mutationCache: new MutationCache({
        onError: (error) => {
            if (error?.isAuthError) {
                const { logoutHandler } = require('./logoutHandler');
                logoutHandler(
                    globalRouter,
                    error?.message || 'Session expired or invalid. Please log in again.',
                    globalShowToast
                );
            }
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
