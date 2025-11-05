import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { ToastProvider } from "./_utils/ToastProvider";
import HamburgerMenu from "./_utils/HamburgerMenu";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand: require("../assets/fonts/Quicksand-Regular.ttf"),
    "Quicksand-Medium": require("../assets/fonts/Quicksand-Medium.ttf"),
    "Quicksand-SemiBold": require("../assets/fonts/Quicksand-SemiBold.ttf"),
    "Quicksand-Bold": require("../assets/fonts/Quicksand-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      Text.defaultProps = {
        ...(Text.defaultProps || {}),
        style: {
          ...(Text.defaultProps?.style || {}),
          fontFamily: "Quicksand",
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
        <HamburgerMenu />
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider>
      <Inner />
    </ThemeProvider>
  );
}
