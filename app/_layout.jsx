import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider } from "../components/ToastProvider";

import NetworkStatusProvider from "../components/NetworkStatusProvider";
import BottomNavigation from "../components/BottomNavigation";
import ErrorBoundary from "../components/ErrorBoundary";
import * as Notifications from 'expo-notifications';
import { getFCMToken, registerFCMTokenWithBackend } from '../utils/fcm';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// separate component so we can use useTheme inside ThemeProvider
function Inner() {
  const { styles } = useTheme();

  // Setup push notifications
  useEffect(() => {
    let notificationSubscription;
    let responseSubscription;

    const setupNotifications = async () => {
      try {
        // Get and register FCM token
        const token = await getFCMToken();
        if (token) {
          await registerFCMTokenWithBackend(token);
        }

        // Listen for foreground notifications
        notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
          // Handle foreground notification
        });

        // Listen for notification taps (when user clicks notification)
        responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ToastProvider>
        <NetworkStatusProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animationEnabled: false, // Disable animations
              animation: 'none', // Ensure no animation
              // Enable gesture navigation
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              // Detach inactive screens for better memory usage
              detachInactiveScreens: true,
            }}
          />
          <BottomNavigation />
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
    <ThemeProvider>
      <ErrorBoundary>
        <Inner />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
