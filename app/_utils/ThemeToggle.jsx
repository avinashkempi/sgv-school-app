import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export default function ThemeToggle({ size = 20 }) {
  const { mode, toggle, colors } = useTheme();
  const rotate = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // animate rotate & fade when mode changes
    Animated.sequence([
      Animated.parallel([
        Animated.timing(rotate, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.6, duration: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(rotate, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]),
    ]).start();
  }, [mode]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        onPress={toggle}
        accessibilityLabel="Toggle theme"
        hitSlop={8}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.cardBackground || colors.background, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
      >
        <Animated.View style={{ opacity: fade, transform: [{ rotate: spin }] }}>
          {mode === "dark" ? (
            <MaterialCommunityIcons name="weather-night" size={size} color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="weather-sunny" size={size} color={colors.primary} />
          )}
        </Animated.View>
      </Pressable>

      {/* toasts are provided by ToastProvider now */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    position: "absolute",
    top: 44,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
});
