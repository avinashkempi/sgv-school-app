import { useRef, useCallback } from "react";
import { BackHandler, ToastAndroid, Platform } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * Standard Android UX pattern:
 * When on a root/tab screen, pressing back once warns "Press back again to exit".
 * Pressing back a second time within 2 seconds cleanly exits the app.
 *
 * @param {boolean} enabled - Whether double-back-to-exit is active on this screen (default: true)
 * @param {string} exitMessage - Message to show on first back press (default: "Press back again to exit")
 */
export default function useDoubleBackToExit(
  enabled = true,
  exitMessage = "Press back again to exit"
) {
  const lastBackPressRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || !enabled) return;

      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }

        lastBackPressRef.current = now;
        ToastAndroid.show(exitMessage, ToastAndroid.SHORT);
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [enabled, exitMessage])
  );
}
