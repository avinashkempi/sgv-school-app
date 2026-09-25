import React from "react";
import { View, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme, RADIUS, SPACING } from "../theme";

/**
 * Material 3 Card Component
 * 
 * Variants:
 * - filled: Higher contrast background tone, no elevation (default, recommended for minimal/clean)
 * - elevated: Pure surface tone + soft elevation shadow
 * - outlined: Pure surface background + 1px crisp outline border
 * 
 * Props:
 * - compact: boolean (tighter 12px radius and 12px padding for dense listings)
 * - noMargin: boolean (removes default 16px bottom margin for custom grid/flex layouts)
 * - elevationLevel: 'none' | 'sm' | 'md' | 'lg' (for elevated variant)
 * - haptic: boolean (trigger light haptic on press, default true)
 */
const Card = ({
  children,
  variant = "filled",
  compact = false,
  noMargin = false,
  elevationLevel = "sm",
  haptic = true,
  onPress,
  style,
  contentStyle,
  ...props
}) => {
  const { colors, elevations } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "elevated":
        return colors.surface || "#FFFFFF";
      case "outlined":
        return colors.surface || "#FFFFFF";
      case "filled":
      default:
        return colors.surfaceContainer || "#F0F1F5";
    }
  };

  const getBorder = () => {
    if (variant === "outlined") {
      return {
        borderWidth: 1,
        borderColor: colors.outlineVariant || colors.border || "#E5E7EB",
      };
    }
    return {};
  };

  const getElevation = () => {
    if (variant === "elevated") {
      if (elevations && elevations[elevationLevel]) {
        return elevations[elevationLevel];
      }
      return Platform.select({
        web: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        },
        default: {
          elevation: 2,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
      });
    }
    return { elevation: 0 };
  };

  const cardContainerStyle = [
    {
      backgroundColor: getBackgroundColor(),
      borderRadius: compact ? (RADIUS.md || 14) : (RADIUS.lg || 20),
      overflow: "hidden",
      marginBottom: noMargin ? 0 : (SPACING.cardGap || SPACING.lg || 16),
    },
    getBorder(),
    getElevation(),
    style,
  ];

  const defaultPadding = compact ? (SPACING.md || 12) : (SPACING.lg || 16);
  const InnerComponent = onPress ? Pressable : View;

  const handlePress = (e) => {
    if (onPress) {
      if (haptic) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // Haptics fallback
        }
      }
      onPress(e);
    }
  };

  return (
    <View style={cardContainerStyle} {...props}>
      <InnerComponent
        accessibilityRole={onPress ? "button" : undefined}
        onPress={onPress ? handlePress : undefined}
        android_ripple={
          onPress ? { color: colors.onSurface, opacity: 0.08 } : undefined
        }
        style={
          onPress
            ? ({ pressed }) => [
                { padding: defaultPadding },
                contentStyle,
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
              ]
            : [{ padding: defaultPadding }, contentStyle]
        }
      >
        {children}
      </InnerComponent>
    </View>
  );
};

export default React.memo(Card);
