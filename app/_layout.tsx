// app/_layout.tsx
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text, View } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins: require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Set default font for all Text components
      (Text as any).defaultProps = {
        ...(Text as any).defaultProps,
        style: {
          ...(Text as any).defaultProps?.style,
          fontFamily: "Poppins",
        },
      };

      // Optional: For View, although font doesn't apply unless it's nested with text
      (View as any).defaultProps = {
        ...(View as any).defaultProps,
        style: {
          ...(View as any).defaultProps?.style,
          fontFamily: "Poppins",
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
