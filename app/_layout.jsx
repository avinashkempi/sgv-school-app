import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider } from "../components/ToastProvider";
import LoadingProvider from "../components/LoadingProvider";
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
          console.log('[Notifications] Setting up FCM...');
          const token = await getFCMToken();
          if (token) {
            await registerFCMTokenWithBackend(token);
            console.log('[Notifications] FCM token registered with backend');
          }

          // Listen for foreground notifications
          notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('[Notifications] Received in foreground:', notification.request.content);
          });

          // Listen for notification taps (when user clicks notification)
          responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('[Notifications] User tapped notification:', response.notification.request.content);
            // You can add navigation logic here if needed
            // e.g., navigate to news page when news notification is tapped
          });
        } catch (error) {
          console.error('[Notifications] Setup failed:', error);
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
        <LoadingProvider>
          <ToastProvider>
            <NetworkStatusProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animationEnabled: true,
                  animationTypeForReplace: 'push',
                  // Enable gesture navigation
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                  // Detach inactive screens for better memory usage
                  detachInactiveScreens: true,
                  // Optimized for speed and smoothness
                  transitionSpec: {
                    open: {
                      animation: 'spring',
                      config: {
                        stiffness: 1000,
                        damping: 500,
                        mass: 1, // Reduced from 3 for faster animations
                        overshootClamping: true,
                        restDisplacementThreshold: 0.01,
                        restSpeedThreshold: 0.01,
                      },
                    },
                    close: {
                      animation: 'timing',
                      config: {
                        duration: 150, // Reduced from 200ms for snappier feel
                        useNativeDriver: true,
                      },
                    },
                  },
                  // Simplified interpolator for better performance
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.width, 0],
                            }),
                          },
                        ],
                        // Simplified opacity for smoother rendering
                        opacity: current.progress.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, 0.5, 1],
                        }),
                      },
                    };
                  },
                }}
              />
              <BottomNavigation />
            </NetworkStatusProvider>
          </ToastProvider>
        </LoadingProvider>
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Inner />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
