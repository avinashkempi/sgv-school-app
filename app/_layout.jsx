import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { Text, Platform, ActivityIndicator } from "react-native";
import { useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider, useToast } from "../components/ToastProvider";
import { StatusBar } from "expo-status-bar";

import NetworkStatusProvider from "../components/NetworkStatusProvider";
import BottomNavigation from "../components/BottomNavigation";
import ErrorBoundary from "../components/ErrorBoundary";
import * as Notifications from 'expo-notifications';
import { NavigationProvider } from "../context/NavigationContext";
import { NotificationProvider } from "../context/NotificationContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AcademicYearProvider, useAcademicYear } from "../context/AcademicYearContext";
import { LabelsProvider } from "../context/LabelsContext";

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister, setGlobalAuthHandler } from '../utils/queryClient';
import DemoBanner from "../components/DemoBanner";
import useOfflinePrefetch from "../hooks/useOfflinePrefetch";
import { setupAppStateRefresh } from "../utils/appStateRefresh";

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// separate component so we can use useTheme inside ThemeProvider
function Inner() {
  const { styles, colors, mode } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const { syncYear } = useAcademicYear();
  const { showToast } = useToast();
  // eslint-disable-next-line no-unused-vars
  const { isReady, isAuthenticated, isDemo, token, user, logout } = useAuth();

  useOfflinePrefetch();

  // Wire AppState to React Query's focusManager so stale queries
  // auto-refetch when the app comes back to the foreground
  useEffect(() => {
    const cleanup = setupAppStateRefresh();
    return cleanup;
  }, []);

  // Wire global auth error handler (for 401s from React Query)
  useEffect(() => {
    // Pass a logout-aware handler so 401 errors trigger AuthContext.logout
    setGlobalAuthHandler(router, showToast, logout);
  }, [router, showToast, logout]);

  // Ref to track whether the initial routing has completed
  const initialRoutingDone = useRef(false);

  // ── Effect 1: ONE-TIME initial routing on mount (after AuthContext is ready) ──
  useEffect(() => {
    if (!isReady || initialRoutingDone.current) return;

    const inLoginGroup = segments[0] === 'login';

    if (!token && !inLoginGroup) {
      // No token — redirect to login
      router.replace('/login');
    } else if (token && inLoginGroup) {
      // Token exists and on login page -> Redirect to home
      router.replace('/');
    } else if (token && !inLoginGroup) {
      // Logged in, sync academic year context
      syncYear();
    }

    initialRoutingDone.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]); // Runs when AuthContext finishes loading

  // ── Effect 2: Lightweight navigation guard ──
  // After initial routing is done, prevents unauthenticated access to protected routes.
  useEffect(() => {
    if (!initialRoutingDone.current || !isReady) return;

    const inLoginGroup = segments[0] === 'login';

    if (!token && !inLoginGroup) {
      router.replace('/login');
    } else if (token && inLoginGroup) {
      router.replace('/');
    }
  }, [segments, router, token, isReady]);

  // Setup push notification listeners (FCM registration is now handled by AuthContext.login)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let notificationSubscription;
    let responseSubscription;

    // Listen for foreground notifications
    notificationSubscription = Notifications.addNotificationReceivedListener(_notification => {
      // Foreground notification received
    });

    // Listen for notification taps
    responseSubscription = Notifications.addNotificationResponseReceivedListener(_response => {
      // Notification tap handling
    });

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
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
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
                fullScreenGestureEnabled: true,
                // Native-driven fast transitions (Android: fade_from_bottom is smooth & fast)
                animation: 'fade_from_bottom',
                animationDuration: 200,
                // Freeze off-screen screens to save CPU/GPU cycles
                freezeOnBlur: true,
                // Prevent Android view hierarchy synchronization crash during screen transitions
                detachInactiveScreens: false,
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
    // Icon fonts - bundled for offline support
    ...require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') && { 'MaterialIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') },
    ...require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') && { 'FontAwesome': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') },
    ...require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') && { 'Material Design Icons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') },
    ...require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') && { 'Feather': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') },
    ...require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') && { 'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') },
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: Infinity }}
      >
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AuthProvider>
                <AcademicYearProvider>
                  <LabelsProvider>
                    <Inner />
                  </LabelsProvider>
                </AcademicYearProvider>
              </AuthProvider>
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
