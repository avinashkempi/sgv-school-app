import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";

/**
 * SkeletonLoader - GPU-accelerated shimmer placeholder
 *
 * @param {string|number} width
 * @param {string|number} height
 * @param {number} borderRadius
 * @param {object} style
 */
export default function SkeletonLoader({
  width = "100%",
  height = 20,
  style,
  borderRadius = 8,
}) {
  const { colors, mode } = useTheme();
  const animatedValue = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(200);

  useEffect(() => {
    animatedValue.value = withRepeat(
      withTiming(1, {
        duration: 1100,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
      }),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseColor =
    mode === "dark"
      ? colors.surfaceContainerHigh || "rgba(255,255,255,0.06)"
      : colors.surfaceContainer || "rgba(0,0,0,0.06)";

  const highlightColor =
    mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)";

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animatedValue.value,
      [0, 1],
      [-containerWidth, containerWidth]
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
      style={[
        {
          width,
          height,
          backgroundColor: baseColor,
          borderRadius,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
        <LinearGradient
          colors={["transparent", highlightColor, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}
