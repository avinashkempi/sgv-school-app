import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../../theme";

/**
 * Material 3 Semantic Badge Component
 * 
 * @param {'primary'|'secondary'|'success'|'warning'|'error'|'neutral'|'outline'} [variant='neutral']
 * @param {'tonal'|'filled'|'outline'} [type='tonal']
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {boolean} [dot=false] - Show only a circular status dot
 * @param {number} [count] - Numerical badge value
 * @param {number} [maxCount=99] - Max count before formatting to '99+'
 * @param {string|React.ReactNode} [icon] - Left icon name or element
 * @param {string} [label] - Badge text label
 * @param {React.ReactNode} [children] - Content fallback
 * @param {Object} [style] - Container style override
 * @param {Object} [textStyle] - Label style override
 */
const Badge = memo(({
  variant = "neutral",
  type = "tonal",
  size = "md",
  dot = false,
  count,
  maxCount = 99,
  icon,
  label,
  children,
  style,
  textStyle,
  ...props
}) => {
  const { colors } = useTheme();

  // Color Mapping
  const getColorScheme = () => {
    switch (variant) {
      case "primary":
        if (type === "filled") {
          return { bg: colors.primary, text: colors.onPrimary, border: "transparent" };
        }
        return {
          bg: colors.primaryContainer || "#E0ECFF",
          text: colors.primary || "#2F6CD4",
          border: "transparent",
        };
      case "secondary":
        if (type === "filled") {
          return { bg: colors.secondary, text: colors.onSecondary, border: "transparent" };
        }
        return {
          bg: colors.brandBlueContainer || colors.secondaryContainer || "#EBF2FF",
          text: colors.brandBlue || colors.secondary || "#2F6CD4",
          border: "transparent",
        };
      case "success":
        if (type === "filled") {
          return { bg: colors.success, text: colors.onPrimary || "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.successContainer || "#ECFDF5",
          text: colors.success || "#16A34A",
          border: "transparent",
        };
      case "warning":
        if (type === "filled") {
          return { bg: colors.warning, text: "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.warningContainer || "#FFFBEB",
          text: colors.warning || "#D97706",
          border: "transparent",
        };
      case "error":
      case "danger":
        if (type === "filled") {
          return { bg: colors.error, text: colors.onError || "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.errorContainer || "#FEF2F2",
          text: colors.error || "#DC2626",
          border: "transparent",
        };
      case "outline":
        return {
          bg: "transparent",
          text: colors.textSecondary || colors.onSurfaceVariant,
          border: colors.outlineVariant || colors.border || "#E5E7EB",
        };
      case "neutral":
      default:
        if (type === "filled") {
          return {
            bg: colors.surfaceContainerHighest || "#E2E4E9",
            text: colors.textPrimary || colors.onSurface,
            border: "transparent",
          };
        }
        return {
          bg: colors.surfaceContainer || colors.surfaceContainerHigh || "#F0F1F5",
          text: colors.textSecondary || colors.onSurfaceVariant || "#6B7280",
          border: "transparent",
        };
    }
  };

  const scheme = getColorScheme();

  // Status Dot
  if (dot) {
    const dotSizes = { sm: 6, md: 8, lg: 10 };
    const dSize = dotSizes[size] || 8;
    return (
      <View
        style={[
          {
            width: dSize,
            height: dSize,
            borderRadius: dSize / 2,
            backgroundColor: scheme.text,
          },
          style,
        ]}
        accessibilityRole="none"
        {...props}
      />
    );
  }

  // Size Configuration
  const sizeConfig = {
    sm: {
      paddingVertical: 2,
      paddingHorizontal: 6,
      fontSize: 10,
      iconSize: 11,
      gap: 3,
      minHeight: 18,
    },
    md: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      fontSize: FONT_SIZES.xs || 11,
      iconSize: 13,
      gap: 4,
      minHeight: 22,
    },
    lg: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      fontSize: FONT_SIZES.sm || 13,
      iconSize: 15,
      gap: 5,
      minHeight: 26,
    },
  }[size] || {
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 11,
    iconSize: 13,
    gap: 4,
    minHeight: 22,
  };

  // Content text
  let content = label ?? children;
  if (count !== undefined && count !== null) {
    content = count > maxCount ? `${maxCount}+` : String(count);
  }

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "string") {
      return (
        <MaterialIcons
          name={icon}
          size={sizeConfig.iconSize}
          color={scheme.text}
        />
      );
    }
    return null;
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
          borderWidth: scheme.border !== "transparent" ? 1 : 0,
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          minHeight: sizeConfig.minHeight,
          gap: sizeConfig.gap,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={typeof content === "string" ? content : "Badge"}
      {...props}
    >
      {renderIcon()}
      {content !== undefined && content !== null && (
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeConfig.fontSize,
              color: scheme.text,
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {content}
        </Text>
      )}
    </View>
  );
});

Badge.displayName = "Badge";

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full || 9999,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: FONTS.bold || FONTS.semiBold,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
});

export default Badge;
