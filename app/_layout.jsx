import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider } from "./_utils/ToastProvider";
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
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider>
      <Inner />
    </ThemeProvider>
  );
}
