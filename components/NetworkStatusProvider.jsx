import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import { ToastAndroid, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import storage from "../utils/storage";
import { syncQueue } from "../utils/offlineQueue";

const NetworkStatusContext = createContext({
  isConnected: true,
  isInternetReachable: true,
  registerOnlineCallback: () => () => {},
});

export const useNetworkStatus = () => useContext(NetworkStatusContext);

export default function NetworkStatusProvider({ children }) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [onlineCallbacks, setOnlineCallbacks] = useState(new Set());
  const wasOfflineRef = useRef(false);

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
      const isConnectedBool = !!state.isConnected;
      const isReachableBool = state.isInternetReachable !== false;
      const isOnline = isConnectedBool && isReachableBool;

      setIsConnected(isConnectedBool);
      setIsInternetReachable(!!state.isInternetReachable);

      // If device is offline, mark it in ref
      if (!isOnline) {
        wasOfflineRef.current = true;
      } else if (wasOfflineRef.current) {
        // Device just transitioned from offline to online!
        wasOfflineRef.current = false;

        if (Platform.OS === "android") {
          ToastAndroid.show("Back online", ToastAndroid.SHORT);
        }

        // Check if user is authenticated before running callbacks
        storage
          .getItem("@auth_token")
          .then((token) => {
            if (token) {
              // Automatically sync any queued offline actions
              syncQueue(queryClient).catch((syncErr) => {
                console.warn("[NETWORK] Offline queue sync error:", syncErr);
              });

              // User is authenticated, safe to run callbacks
              onlineCallbacks.forEach((callback) => {
                try {
                  callback();
                } catch (err) {
                  console.error("[NETWORK] Error in online callback:", err);
                }
              });
            } else {
              console.log(
                "[NETWORK] Device online but user not authenticated, skipping callbacks"
              );
            }
          })
          .catch((err) => {
            console.error("[NETWORK] Error checking auth token:", err);
          });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onlineCallbacks, queryClient]);

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
