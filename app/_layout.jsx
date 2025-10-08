import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Text } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { globalStyles } from "../globalStyles";

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

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
