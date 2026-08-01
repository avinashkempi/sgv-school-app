import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { Text, Platform, ActivityIndicator } from "react-native";
import { useEffect, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider, useToast } from "../components/ToastProvider";

import NetworkStatusProvider from "../components/NetworkStatusProvider";
import BottomNavigation from "../components/BottomNavigation";
import ErrorBoundary from "../components/ErrorBoundary";
import * as Notifications from 'expo-notifications';
import { getFCMToken, registerFCMTokenWithBackend } from '../utils/fcm';
import { NavigationProvider } from "../context/NavigationContext";
import { NotificationProvider } from "../context/NotificationContext";
import { AcademicYearProvider, useAcademicYear } from "../contexts/AcademicYearContext";

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister, setGlobalAuthHandler } from '../utils/queryClient';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

import DemoBanner from "../components/DemoBanner";
import storage from "../utils/storage";
import { useState } from "react";
import useOfflinePrefetch from "../hooks/useOfflinePrefetch";
import { setupAppStateRefresh } from "../utils/appStateRefresh";

/**
 * Decode a base64url-encoded string (works in React Native without atob/Buffer).
 */
function base64UrlDecode(str) {
  // Replace URL-safe chars
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' to make length a multiple of 4
  while (base64.length % 4 !== 0) base64 += '=';

  // Try atob first (available in most environments)
  if (typeof atob === 'function') {
    return atob(base64);
  }
  // Fallback for environments without atob
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  // If neither is available, throw so caller can handle gracefully
  throw new Error('No base64 decoder available');
}

function isTokenExpired(token) {
  if (!token || token === 'demo-token') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch (err) {
    // If parsing fails, don't block the user — fall back to backend 401 handling
    return false;
  }
}

// separate component so we can use useTheme inside ThemeProvider
function Inner() {
  const { styles, colors } = useTheme();
  const [isDemo, setIsDemo] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const { syncYear } = useAcademicYear();
  const { showToast } = useToast();

  useOfflinePrefetch();

  // Wire AppState to React Query's focusManager so stale queries
  // auto-refetch when the app comes back to the foreground
  useEffect(() => {
    const cleanup = setupAppStateRefresh();
    return cleanup;
  }, []);

  useEffect(() => {
    setGlobalAuthHandler(router, showToast);
  }, [router, showToast]);

  // Ref to track whether the initial auth check has completed
  const initialAuthDone = useRef(false);

  // ── Effect 1: ONE-TIME initial auth check on mount ──
  // Validates token, handles expiry, sets demo mode, syncs academic year.
  // Runs ONLY ONCE — does NOT depend on segments, so navigation changes won't re-trigger.
  useEffect(() => {
    const initialAuthCheck = async () => {
      const token = await storage.getItem('@auth_token');

      if (token && isTokenExpired(token)) {
        await storage.multiRemove(['@auth_token', '@auth_user']);
        if (showToast) {
          showToast('Session expired. Please log in again.', 'error', 3500);
        }
        router.replace('/login');
        initialAuthDone.current = true;
        setIsReady(true);
        return;
      }

      setIsDemo(token === 'demo-token');

      const inLoginGroup = segments[0] === 'login';

      if (!token && !inLoginGroup) {
        // No token — silently redirect to login (no alarming toast for first-time users)
        router.replace('/login');
      } else if (token && inLoginGroup) {
        // Token exists and on login page -> Redirect to home
        router.replace('/');
      } else if (token && !inLoginGroup) {
        // Logged in, sync academic year context
        syncYear();
      }

      initialAuthDone.current = true;
      setIsReady(true);
    };

    initialAuthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — run only once on mount

  // ── Effect 2: Lightweight navigation guard ──
  // After initial auth is done, only prevents unauthenticated access to protected routes.
  // Does NOT re-validate the token or re-sync academic year on every navigation.
  useEffect(() => {
    if (!initialAuthDone.current) return; // Wait for initial check to complete

    const guardNavigation = async () => {
      const token = await storage.getItem('@auth_token');
      const inLoginGroup = segments[0] === 'login';

      setIsDemo(token === 'demo-token');

      if (!token && !inLoginGroup) {
        router.replace('/login');
      } else if (token && inLoginGroup) {
        router.replace('/');
      }
    };

    guardNavigation();
  }, [segments, router]);

  // Setup push notifications
  useEffect(() => {
    let notificationSubscription;
    let responseSubscription;

    const setupNotifications = async () => {
      if (Platform.OS === 'web') return;

      try {
        // Get and register FCM token
        const token = await getFCMToken();
        if (token) {
          await registerFCMTokenWithBackend(token);
        }

        // Listen for foreground notifications
        notificationSubscription = Notifications.addNotificationReceivedListener(_notification => {
          // Handle foreground notification
        });

        // Listen for notification taps (when user clicks notification)
        responseSubscription = Notifications.addNotificationResponseReceivedListener(_response => {
          // You can add navigation logic here if needed
          // e.g., navigate to news page when news notification is tapped
        });
      } catch (error) {
        // Don't throw - app should work even if notifications fail
      }
    };

    setupNotifications();

    // Cleanup subscriptions on unmount
    return () => {
      notificationSubscription?.remove();
      responseSubscription?.remove();
    };
  }, []);

  // Check for store app updates on mount
  useEffect(() => {
    try {
      const { checkAppUpdate } = require('../utils/inAppUpdates');
      checkAppUpdate();
    } catch (err) {
      console.warn('Failed to initialize app update check:', err);
    }
  }, []);

  if (!isReady) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2F6CD4" />
      </SafeAreaView>
    );
  }

  const isLogin = segments[0] === 'login';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <NetworkStatusProvider>
        <NavigationProvider>
          <NotificationProvider>
            {isDemo && !isLogin && <DemoBanner />}
            <Stack
              screenOptions={{
                headerShown: false,
                // Enable gesture navigation
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                // Detach inactive screens for better memory usage
                detachInactiveScreens: true,
              }}
            />
            {!isLogin && <BottomNavigation />}
          </NotificationProvider>
        </NavigationProvider>
      </NetworkStatusProvider>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // DMSans - Primary font family
    'DMSans-Regular': require("../assets/fonts/DMSans-Regular.ttf"),
    'DMSans-Medium': require("../assets/fonts/DMSans-Medium.ttf"),
    'DMSans-SemiBold': require("../assets/fonts/DMSans-SemiBold.ttf"),
    'DMSans-Bold': require("../assets/fonts/DMSans-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      Text.defaultProps = {
        ...(Text.defaultProps || {}),
        style: {
          ...(Text.defaultProps?.style || {}),
          fontFamily: "DMSans-Regular",
        },
      };
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: Infinity }}
    >
      <ThemeProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AcademicYearProvider>
              <Inner />
            </AcademicYearProvider>
          </ErrorBoundary>
        </ToastProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
