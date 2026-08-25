import React from "react";
import { View, Pressable, Platform } from "react-native";
import { useTheme } from "../theme";

/**
 * Material 3 Card Component
 * Variants:
 * - elevated: Shadow, lower background tone
 * - filled: No shadow, higher background tone (default)
 * - outlined: Border, transparent/surface background
 */
const Card = ({
  children,
  variant = "filled",
  onPress,
  style,
  contentStyle,
  ...props
}) => {
  // eslint-disable-next-line no-unused-vars
  const { colors, styles } = useTheme();

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
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      };
    }
    return {};
  };

  const getElevation = () => {
    if (variant === "elevated") {
      return Platform.select({
        web: {
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
        },
        default: {
          elevation: 1,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
        },
      });
    }
    return { elevation: 0 };
  };

  const cardContainerStyle = [
    {
      backgroundColor: getBackgroundColor(),
      borderRadius: 16,
      overflow: "hidden", // Ensure ripples don't overflow
      marginBottom: 16,
    },
    getBorder(),
    getElevation(),
    style,
  ];

  const InnerComponent = onPress ? Pressable : View;

  return (
    <View style={cardContainerStyle} {...props}>
      <InnerComponent
        onPress={onPress}
        android_ripple={
          onPress ? { color: colors.onSurface, opacity: 0.12 } : undefined
        }
        style={
          onPress
            ? ({ pressed }) => [
                { padding: 16 },
                contentStyle,
                pressed && { opacity: 0.9 }, // Fallback for iOS highlight
              ]
            : [{ padding: 16 }, contentStyle]
        }
      >
        {children}
      </InnerComponent>
    </View>
  );
};

export default React.memo(Card);
