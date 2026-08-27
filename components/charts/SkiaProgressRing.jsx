import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Canvas,
  Path,
  Skia,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  withTiming,
  useDerivedValue,
  Easing,
} from "react-native-reanimated";
import { useTheme, FONTS } from "../../theme";

/**
 * SkiaProgressRing - Ultra-smooth 60 FPS GPU-accelerated circular progress gauge
 *
 * @param {number} progress - value between 0 and 100
 * @param {number} size - diameter in pixels (default 120)
 * @param {number} strokeWidth - ring thickness (default 10)
 * @param {Array<string>} colors - gradient colors for the ring
 * @param {string} label - optional center label (e.g. "Attendance")
 */
export default function SkiaProgressRing({
  progress = 0,
  size = 120,
  strokeWidth = 10,
  colors: customColors,
  label,
  showValue = true,
}) {
  const { colors: themeColors, mode } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Background track path
  const bgPath = Skia.Path.Make();
  bgPath.addCircle(center, center, radius);

  // Animated progress value (0 to 1)
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(
      Math.min(Math.max(progress, 0), 100) / 100,
      {
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }
    );
  }, [progress, animatedProgress]);

  // Derived progress path
  const progressPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const sweepAngle = animatedProgress.value * 360;
    p.addArc(
      {
        x: strokeWidth / 2,
        y: strokeWidth / 2,
        width: size - strokeWidth,
        height: size - strokeWidth,
      },
      -90,
      sweepAngle
    );
    return p;
  });

  const gradientColors =
    customColors ||
    (mode === "dark"
      ? [themeColors.primary, "#EADDFF", themeColors.primary]
      : [themeColors.primary, "#6750A4", themeColors.primary]);

  const trackColor =
    mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        {/* Background Track */}
        <Path
          path={bgPath}
          color={trackColor}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
        />

        {/* Animated Gradient Progress Stroke */}
        <Path
          path={progressPath}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
        >
          <SweepGradient
            c={vec(center, center)}
            colors={gradientColors}
            start={0}
            end={360}
          />
        </Path>
      </Canvas>

      {/* Center Label / Percentage */}
      <View style={[StyleSheet.absoluteFillObject, styles.centerContent]}>
        {showValue && (
          <Text
            style={[
              styles.valueText,
              {
                color: themeColors.onSurface,
                fontSize: size * 0.22,
              },
            ]}
          >
            {Math.round(progress)}%
          </Text>
        )}
        {label && (
          <Text
            style={[
              styles.labelText,
              {
                color: themeColors.onSurfaceVariant,
                fontSize: size * 0.09,
              },
            ]}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontFamily: FONTS.bold,
    includeFontPadding: false,
  },
  labelText: {
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
});
