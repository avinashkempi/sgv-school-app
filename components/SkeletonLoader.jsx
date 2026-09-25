import React, { useEffect, useState, memo } from "react";
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
const SkeletonLoader = memo(({
  width = "100%",
  height = 20,
  style,
  borderRadius = 10,
}) => {
  const { colors, mode } = useTheme();
  const animatedValue = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(200);

  useEffect(() => {
    animatedValue.value = withRepeat(
      withTiming(1, {
        duration: 1350,
        easing: Easing.bezier(0.25, 0, 0.75, 1),
      }),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseColor =
    mode === "dark"
      ? colors.surfaceContainerHigh || "rgba(255,255,255,0.06)"
      : colors.surfaceContainer || "#F0F1F5";

  const highlightColor =
    mode === "dark" ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.65)";

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
});

SkeletonLoader.displayName = "SkeletonLoader";

/**
 * Convenience circular skeleton for avatars/icons
 */
export const SkeletonCircle = memo(({ size = 40, style }) => (
  <SkeletonLoader
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
  />
));
SkeletonCircle.displayName = "SkeletonCircle";

/**
 * Convenience multi-line skeleton for paragraphs
 */
export const SkeletonText = memo(({ lines = 3, lineHeight = 14, gap = 8, style }) => (
  <View style={[{ gap }, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLoader
        key={i}
        height={lineHeight}
        width={i === lines - 1 && lines > 1 ? "60%" : "100%"}
        borderRadius={lineHeight / 2}
      />
    ))}
  </View>
));
SkeletonText.displayName = "SkeletonText";

export default SkeletonLoader;
