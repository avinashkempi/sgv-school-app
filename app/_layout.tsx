// app/_layout.tsx
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text, View } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand: require("../assets/fonts/Quicksand-Regular.ttf"),
    "Quicksand-Medium": require("../assets/fonts/Quicksand-Medium.ttf"),
    "Quicksand-SemiBold": require("../assets/fonts/Quicksand-SemiBold.ttf"),
    "Quicksand-Bold": require("../assets/fonts/Quicksand-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Set default font for all Text components
      (Text as any).defaultProps = {
        ...(Text as any).defaultProps,
        style: {
          ...(Text as any).defaultProps?.style,
          fontFamily: "Quicksand",
        },
      };

      // Optional: For View, although font doesn't apply unless it's nested with text
      (View as any).defaultProps = {
        ...(View as any).defaultProps,
        style: {
          ...(View as any).defaultProps?.style,
          fontFamily: "Quicksand",
        },
      };
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
