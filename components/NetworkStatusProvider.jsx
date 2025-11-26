import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { ToastAndroid, Platform } from 'react-native';

const NetworkStatusContext = createContext({
    isConnected: true,
    isInternetReachable: true,
    registerOnlineCallback: () => () => { },
});

export const useNetworkStatus = () => useContext(NetworkStatusContext);

export default function NetworkStatusProvider({ children }) {
    const [isConnected, setIsConnected] = useState(true);
    const [isInternetReachable, setIsInternetReachable] = useState(true);
    const [onlineCallbacks, setOnlineCallbacks] = useState(new Set());

    // Register a callback to be fired when the device comes online
    const registerOnlineCallback = useCallback((callback) => {
        setOnlineCallbacks((prev) => {
            const newSet = new Set(prev);
            newSet.add(callback);
            return newSet;
        });

        // Return cleanup function
        return () => {
            setOnlineCallbacks((prev) => {
                const newSet = new Set(prev);
                newSet.delete(callback);
                return newSet;
            });
        };
    }, []);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const wasOffline = !isConnected;
            const isNowOnline = state.isConnected && state.isInternetReachable;

            setIsConnected(!!state.isConnected);
            setIsInternetReachable(!!state.isInternetReachable);

            // If we just came online, trigger callbacks
            if (wasOffline && isNowOnline) {

                if (Platform.OS === 'android') {
                    ToastAndroid.show('Back online', ToastAndroid.SHORT);
                }

                // Execute all registered callbacks
                onlineCallbacks.forEach((callback) => {
                    try {
                        callback();
                    } catch (err) {
                        console.error('[NETWORK] Error in online callback:', err);
                    }
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [isConnected, onlineCallbacks]);

    return (
        <NetworkStatusContext.Provider
            value={{
                isConnected,
                isInternetReachable,
                registerOnlineCallback,
            }}
        >
            {children}
        </NetworkStatusContext.Provider>
    );
}
