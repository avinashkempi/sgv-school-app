import React from "react";
import { Text, Pressable, ActivityIndicator, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "../theme";

/**
 * Material 3 Expressive Button
 * 
 * Variants:
 * - filled: High emphasis (Primary solid background)
 * - tonal: Medium emphasis (Secondary container)
 * - outlined: Medium emphasis (Outline border)
 * - text: Low emphasis (Text only)
 * - elevated: High emphasis (Surface + soft shadow)
 * 
 * Sizes:
 * - sm: Compact for tables, chips, and dense rows (32px min-height)
 * - md: Standard button (40px min-height)
 * - lg: Hero/prominent CTA button (48px min-height)
 */
const Button = ({
  children,
  title,
  onPress,
  variant = "filled",
  size = "md",
  fullWidth = false,
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const { colors } = useTheme();

  // Determine Colors based on Variant
  const getColors = () => {
    if (disabled) {
      return {
        bg: colors.onSurface + "1F", // 12% opacity onSurface
        text: colors.onSurface + "61", // 38% opacity onSurface
        border: "transparent",
      };
    }

    switch (variant) {
      case "elevated":
        return {
          bg: colors.surfaceContainerLow,
          text: colors.primary,
          border: "transparent",
        };
      case "tonal":
        return {
          bg: colors.secondaryContainer,
          text: colors.onSecondaryContainer,
          border: "transparent",
        };
      case "outlined":
        return {
          bg: "transparent",
          text: colors.primary,
          border: colors.outlineVariant || colors.outline,
        };
      case "text":
        return {
          bg: "transparent",
          text: colors.primary,
          border: "transparent",
        };
      case "filled":
      default:
        return {
          bg: colors.primary,
          text: colors.onPrimary,
          border: "transparent",
        };
    }
  };

  const themeColors = getColors();

  // Standardized Size Tokens
  const sizeConfig = {
    sm: {
      paddingVertical: 6,
      paddingHorizontal: SPACING.lg,
      minHeight: 32,
      fontSize: FONT_SIZES.xs,
      lineHeight: LINE_HEIGHTS.xs,
      letterSpacing: LETTER_SPACINGS.xs,
      iconSize: ICON_SIZES.xs || 14,
      gap: SPACING.xs,
    },
    md: {
      paddingVertical: 10,
      paddingHorizontal: SPACING.xxl,
      minHeight: 40,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      letterSpacing: LETTER_SPACINGS.sm,
      iconSize: ICON_SIZES.sm || 18,
      gap: SPACING.sm,
    },
    lg: {
      paddingVertical: 14,
      paddingHorizontal: SPACING.xxxl,
      minHeight: 48,
      fontSize: FONT_SIZES.md,
      lineHeight: LINE_HEIGHTS.md,
      letterSpacing: LETTER_SPACINGS.md,
      iconSize: ICON_SIZES.md || 20,
      gap: SPACING.sm,
    },
  }[size] || {
    paddingVertical: 10,
    paddingHorizontal: SPACING.xxl,
    minHeight: 40,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    iconSize: 18,
    gap: SPACING.sm,
  };

  const containerStyle = [
    {
      backgroundColor: themeColors.bg,
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: RADIUS.full || 100,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: variant === "outlined" ? 1 : 0,
      borderColor: themeColors.border,
      minHeight: sizeConfig.minHeight,
    },
    fullWidth && { width: "100%" },
    variant === "elevated" &&
      !disabled &&
      Platform.select({
        web: {
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
        },
        default: {
          elevation: 2,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
        },
      }),
    style,
  ];

  const labelStyle = [
    {
      fontFamily: FONTS.medium,
      fontSize: sizeConfig.fontSize,
      lineHeight: sizeConfig.lineHeight,
      letterSpacing: sizeConfig.letterSpacing,
      color: themeColors.text,
      textAlign: "center",
      flexShrink: 1,
    },
    (icon || loading) && iconPosition === "left" && { marginLeft: sizeConfig.gap },
    (icon || loading) && iconPosition === "right" && { marginRight: sizeConfig.gap },
    textStyle,
  ];

  const handlePress = (e) => {
    if (!disabled && !loading && onPress) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Fallback for unsupported platforms
      }
      onPress(e);
    }
  };

  const renderIcon = () => {
    if (!icon || loading) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "string") {
      return (
        <MaterialIcons
          name={icon}
          size={sizeConfig.iconSize}
          color={themeColors.text}
        />
      );
    }
    return null;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={!disabled && !loading ? handlePress : null}
      style={({ pressed }) => [
        containerStyle,
        pressed &&
          !disabled && {
            opacity: 0.82,
            transform: [{ scale: 0.97 }],
          },
      ]}
      android_ripple={{
        color: themeColors.text,
        opacity: 0.12,
        borderless: false,
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={themeColors.text}
          style={{ marginRight: sizeConfig.gap }}
        />
      ) : null}

      {!loading && iconPosition === "left" && renderIcon()}

      <Text style={labelStyle}>{children ?? title}</Text>

      {!loading && iconPosition === "right" && renderIcon()}
    </Pressable>
  );
};

export default React.memo(Button);
