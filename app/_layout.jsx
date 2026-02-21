import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { Text, Platform, View, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider } from "../components/ToastProvider";

import NetworkStatusProvider from "../components/NetworkStatusProvider";
import BottomNavigation from "../components/BottomNavigation";
import ErrorBoundary from "../components/ErrorBoundary";
import * as Notifications from 'expo-notifications';
import { getFCMToken, registerFCMTokenWithBackend } from '../utils/fcm';
import { NavigationProvider } from "../context/NavigationContext";
import { NotificationProvider } from "../context/NotificationContext";

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from '../utils/queryClient';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

import DemoBanner from "../components/DemoBanner";
import storage from "../utils/storage";
import { useState } from "react";

// separate component so we can use useTheme inside ThemeProvider
function Inner() {
  const { styles, colors } = useTheme();
  const [isDemo, setIsDemo] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await storage.getItem('@auth_token');
      setIsDemo(token === 'demo-token');

      const inLoginGroup = segments[0] === 'login';

      if (!token && !inLoginGroup) {
        // No token and not on login page -> Redirect to login
        router.replace('/login');
      } else if (token && inLoginGroup) {
        // Token exists and on login page -> Redirect to home
        router.replace('/');
      }

      setIsReady(true);
    };

    checkAuth();
  }, [segments]);

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
      <ToastProvider>
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
      </ToastProvider>
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
      persistOptions={{ persister }}
    >
      <ThemeProvider>
        <ErrorBoundary>
          <Inner />
        </ErrorBoundary>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
