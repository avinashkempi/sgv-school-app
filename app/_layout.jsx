import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider } from "../components/ToastProvider";
import LoadingProvider from "../components/LoadingProvider";
import BottomNavigation from "../components/BottomNavigation";
import ErrorBoundary from "../components/ErrorBoundary";

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
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingProvider>
          <ToastProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animationEnabled: true,
                animationTypeForReplace: 'push',
                transitionSpec: {
                  open: {
                    animation: 'timing',
                    config: {
                      duration: 400,
                      useNativeDriver: true,
                    },
                  },
                  close: {
                    animation: 'timing',
                    config: {
                      duration: 300,
                      useNativeDriver: true,
                    },
                  },
                },
                cardStyleInterpolator: ({ current, next, layouts }) => {
                  return {
                    cardStyle: {
                      transform: [
                        {
                          translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width, 0],
                          }),
                        },
                        {
                          scale: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                      opacity: current.progress.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0.7, 0.85, 1],
                      }),
                    },
                    overlayStyle: {
                      opacity: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.08],
                      }),
                    },
                  };
                },
              }}
            />
          </ToastProvider>
          <BottomNavigation />
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
