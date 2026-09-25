import React, { useEffect, memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../../theme";

/**
 * Material 3 Animated Progress Bar
 * 
 * @param {number} progress - Value between 0 and 1 (or 0 and 100 if max=100)
 * @param {number} [max=1] - Maximum scale value (default: 1; set to 100 for percentage scale)
 * @param {'primary'|'secondary'|'success'|'warning'|'error'|'neutral'} [variant='primary']
 * @param {number} [height=6] - Thickness of the progress track
 * @param {number} [borderRadius] - Border radius for track & bar
 * @param {string} [trackColor] - Custom background track color
 * @param {string} [progressColor] - Custom progress fill color
 * @param {boolean} [animated=true] - Smooth animated transitions
 * @param {number} [duration=600] - Animation duration in ms
 * @param {boolean} [showLabel=false] - Show numerical % label
 * @param {'top'|'bottom'|'right'} [labelPosition='top'] - Position of percentage label
 * @param {Object} [style] - Track container style override
 */
const ProgressBar = memo(({
  progress = 0,
  max = 1,
  variant = "primary",
  height = 6,
  borderRadius,
  trackColor,
  progressColor,
  animated = true,
  duration = 600,
  showLabel = false,
  labelPosition = "top",
  style,
  ...props
}) => {
  const { colors } = useTheme();

  // Normalize progress to 0..1
  const normalized = Math.min(Math.max(progress / max, 0), 1);
  const percentage = Math.round(normalized * 100);

  const animatedProgress = useSharedValue(animated ? 0 : normalized);

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(normalized, {
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      animatedProgress.value = normalized;
    }
  }, [normalized, animated, duration, animatedProgress]);

  // Color Mapping
  const getFillColor = () => {
    if (progressColor) return progressColor;
    switch (variant) {
      case "secondary":
        return colors.brandBlue || colors.secondary || "#2F6CD4";
      case "success":
        return colors.success || "#16A34A";
      case "warning":
        return colors.warning || "#D97706";
      case "error":
        return colors.error || "#DC2626";
      case "neutral":
        return colors.textSecondary || "#6B7280";
      case "primary":
      default:
        return colors.primary || "#2F6CD4";
    }
  };

  const fillColor = getFillColor();
  const bgTrackColor =
    trackColor ||
    colors.surfaceContainerHighest ||
    colors.outlineVariant ||
    "#E5E7EB";

  const resolvedRadius = borderRadius ?? (RADIUS.full || height / 2);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const renderLabel = () => (
    <Text
      style={[
        styles.labelText,
        { color: colors.textSecondary || colors.onSurfaceVariant },
      ]}
    >
      {percentage}%
    </Text>
  );

  return (
    <View
      style={[
        styles.container,
        labelPosition === "right" && styles.rowContainer,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
      {...props}
    >
      {showLabel && labelPosition === "top" && (
        <View style={styles.topLabelContainer}>{renderLabel()}</View>
      )}

      <View
        style={[
          styles.track,
          {
            height,
            borderRadius: resolvedRadius,
            backgroundColor: bgTrackColor,
          },
          labelPosition === "right" && { flex: 1 },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              borderRadius: resolvedRadius,
              backgroundColor: fillColor,
            },
            barAnimatedStyle,
          ]}
        />
      </View>

      {showLabel && labelPosition === "bottom" && (
        <View style={styles.bottomLabelContainer}>{renderLabel()}</View>
      )}

      {showLabel && labelPosition === "right" && (
        <View style={styles.rightLabelContainer}>{renderLabel()}</View>
      )}
    </View>
  );
});

ProgressBar.displayName = "ProgressBar";

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  topLabelContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  bottomLabelContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  rightLabelContainer: {
    minWidth: 36,
  },
  labelText: {
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.semiBold || FONTS.medium,
  },
});

export default ProgressBar;
