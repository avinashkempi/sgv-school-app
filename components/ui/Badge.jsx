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
      case "brand":
      case "primary":
        if (type === "filled") {
          return { bg: colors.primary, text: colors.onPrimary, border: "transparent" };
        }
        return {
          bg: colors.primaryContainer || "#EADDFF",
          text: colors.onPrimaryContainer || colors.primary,
          border: "transparent",
        };
      case "secondary":
        if (type === "filled") {
          return { bg: colors.secondary, text: colors.onSecondary, border: "transparent" };
        }
        return {
          bg: colors.secondaryContainer || "#E8DEF8",
          text: colors.onSecondaryContainer || colors.secondary,
          border: "transparent",
        };
      case "tertiary":
        if (type === "filled") {
          return { bg: colors.tertiary, text: colors.onTertiary || "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.tertiaryContainer || "#FFD8E4",
          text: colors.onTertiaryContainer || colors.tertiary,
          border: "transparent",
        };
      case "info":
        if (type === "filled") {
          return { bg: colors.info || "#0284C7", text: colors.onInfo || "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.infoContainer || "#E0F2FE",
          text: colors.onInfoContainer || colors.info,
          border: "transparent",
        };
      case "success":
        if (type === "filled") {
          return { bg: colors.success, text: colors.onSuccess || "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.successContainer || "#DCFCE7",
          text: colors.onSuccessContainer || colors.success,
          border: "transparent",
        };
      case "warning":
        if (type === "filled") {
          return { bg: colors.warning, text: colors.onWarning || "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.warningContainer || "#FEF3C7",
          text: colors.onWarningContainer || colors.warning,
          border: "transparent",
        };
      case "error":
      case "danger":
        if (type === "filled") {
          return { bg: colors.error, text: colors.onError || "#FFFFFF", border: "transparent" };
        }
        return {
          bg: colors.errorContainer || "#F9DEDC",
          text: colors.onErrorContainer || colors.error,
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

  // Content text
  let content = label ?? children;
  if (count !== undefined && count !== null) {
    content = count > maxCount ? `${maxCount}+` : String(count);
  }

  // Standalone Status Dot (only when dot=true AND no content text is provided)
  if (dot && (content === undefined || content === null || content === "")) {
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
      paddingHorizontal: 7,
      fontSize: FONT_SIZES.micro || 11,
      iconSize: 11,
      dotSize: 5,
      gap: 4,
      minHeight: 18,
    },
    md: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      fontSize: FONT_SIZES.xs || 12,
      iconSize: 13,
      dotSize: 6,
      gap: 4,
      minHeight: 22,
    },
    lg: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      fontSize: FONT_SIZES.sm || 14,
      iconSize: 15,
      dotSize: 8,
      gap: 5,
      minHeight: 26,
    },
  }[size] || {
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: FONT_SIZES.xs || 12,
    iconSize: 13,
    dotSize: 6,
    gap: 4,
    minHeight: 22,
  };

  const renderIconOrDot = () => {
    if (dot) {
      return (
        <View
          style={{
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: sizeConfig.dotSize / 2,
            backgroundColor: scheme.text,
          }}
        />
      );
    }
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
      {renderIconOrDot()}
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
