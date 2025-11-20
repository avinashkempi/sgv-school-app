import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider } from "./_utils/ToastProvider";
import LoadingProvider from "./_utils/LoadingProvider";
import BottomNavigation from "./_utils/BottomNavigation";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora: require("../assets/fonts/Lora-Regular.ttf"),
    "Lora-Medium": require("../assets/fonts/Lora-Medium.ttf"),
    "Lora-SemiBold": require("../assets/fonts/Lora-SemiBold.ttf"),
    "Lora-Bold": require("../assets/fonts/Lora-Bold.ttf"),
    "Lora-Italic": require("../assets/fonts/Lora-Italic.ttf"),
    "Lora-MediumItalic": require("../assets/fonts/Lora-MediumItalic.ttf"),
    "Lora-SemiBoldItalic": require("../assets/fonts/Lora-SemiBoldItalic.ttf"),
    "Lora-BoldItalic": require("../assets/fonts/Lora-BoldItalic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      Text.defaultProps = {
        ...(Text.defaultProps || {}),
        style: {
          ...(Text.defaultProps?.style || {}),
          fontFamily: "Lora",
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
                animationTypeForReplace: true,
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
      <Inner />
    </ThemeProvider>
  );
}
