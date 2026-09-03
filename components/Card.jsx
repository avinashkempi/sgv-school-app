import React from "react";
import { View, Pressable, Platform } from "react-native";
import { useTheme, RADIUS, SPACING } from "../theme";

/**
 * Material 3 Card Component
 * 
 * Variants:
 * - filled: Higher contrast background tone, no elevation (default, recommended for minimal/clean)
 * - elevated: Subtle surface tone + soft shadow
 * - outlined: Surface background + 1px crisp outline border
 * 
 * Props:
 * - compact: boolean (tighter 12px radius and 12px padding for dense listings)
 * - noMargin: boolean (removes default 16px bottom margin for custom grid/flex layouts)
 */
const Card = ({
  children,
  variant = "filled",
  compact = false,
  noMargin = false,
  onPress,
  style,
  contentStyle,
  ...props
}) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "elevated":
        return colors.surfaceContainerLow;
      case "outlined":
        return colors.surface;
      case "filled":
      default:
        return colors.surfaceContainer; // Highest contrast for content
    }
  };

  const getBorder = () => {
    if (variant === "outlined") {
      return {
        borderWidth: 0.5,
        borderColor: colors.outlineVariant,
      };
    }
    return {};
  };

  const getElevation = () => {
    if (variant === "elevated") {
      return Platform.select({
        web: {
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
        },
        default: {
          elevation: 1,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },
      });
    }
    return { elevation: 0 };
  };

  const cardContainerStyle = [
    {
      backgroundColor: getBackgroundColor(),
      borderRadius: compact ? (RADIUS.md + 2 || 14) : (RADIUS.xl || 20),
      overflow: "hidden",
      marginBottom: noMargin ? 0 : (SPACING.lg || 16),
    },
    getBorder(),
    getElevation(),
    style,
  ];

  const defaultPadding = compact ? (SPACING.md + 2 || 14) : (SPACING.xl || 20);
  const InnerComponent = onPress ? Pressable : View;

  return (
    <View style={cardContainerStyle} {...props}>
      <InnerComponent
        accessibilityRole={onPress ? "button" : undefined}
        onPress={onPress}
        android_ripple={
          onPress ? { color: colors.onSurface, opacity: 0.08 } : undefined
        }
        style={
          onPress
            ? ({ pressed }) => [
                { padding: defaultPadding },
                contentStyle,
                pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
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
