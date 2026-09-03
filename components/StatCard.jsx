import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "../theme";
import Card from "./Card";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Modern StatCard Component
 * Displays key statistical metric with icon badge, primary value, label, and trend with spring entrance.
 *
 * @param {String} label - Stat descriptor
 * @param {String|Number} value - Highlight numeric value
 * @param {String} icon - MaterialIcons glyph name
 * @param {String} color - Accent tint (defaults to theme primary)
 * @param {String} trend - Trend direction ('up', 'down', 'neutral')
 * @param {String|Number} trendValue - Trend delta percentage or value
 * @param {String} subtitle - Secondary description
 * @param {Boolean} gradient - Whether to render with a vibrant gradient wash
 * @param {String} variant - 'default' | 'compact' | 'large'
 * @param {Number} index - Spring animation sequence index
 */
export default function StatCard({
  label,
  value,
  icon = "analytics",
  color: customColor,
  trend,
  trendValue,
  subtitle,
  gradient = false,
  variant = "default",
  index = 0,
}) {
  const { colors } = useTheme();
  const color = customColor || colors.primary;

  const getTrendIcon = () => {
    if (trend === "up") return "trending-up";
    if (trend === "down") return "trending-down";
    return "trending-flat";
  };

  const getTrendColor = (isGrad) => {
    if (isGrad) return "#FFFFFF";
    if (trend === "up") return colors.success;
    if (trend === "down") return colors.error;
    return colors.onSurfaceVariant;
  };

  const getSize = () => {
    if (variant === "compact") {
      return {
        iconSize: ICON_SIZES.sm || 18,
        valueSize: FONT_SIZES.lg,
        labelSize: FONT_SIZES.xs,
        subtitleSize: FONT_SIZES.micro,
        padding: SPACING.md || 12,
        badgeSize: 32,
      };
    }
    if (variant === "large") {
      return {
        iconSize: ICON_SIZES.lg || 28,
        valueSize: FONT_SIZES.display,
        labelSize: FONT_SIZES.sm,
        subtitleSize: FONT_SIZES.sm,
        padding: SPACING.xl || 20,
        badgeSize: 48,
      };
    }
    return {
      iconSize: ICON_SIZES.md || 22,
      valueSize: FONT_SIZES.xl,
      labelSize: FONT_SIZES.sm,
      subtitleSize: FONT_SIZES.xs,
      padding: SPACING.lg || 16,
      badgeSize: 40,
    };
  };

  const size = getSize();

  const renderContent = (isGrad) => {
    const textColor = isGrad ? "#FFFFFF" : colors.onSurface;
    const labelColor = isGrad ? "rgba(255,255,255,0.9)" : colors.onSurfaceVariant;
    const subColor = isGrad ? "rgba(255,255,255,0.75)" : colors.onSurfaceVariant;
    const badgeBg = isGrad ? "rgba(255,255,255,0.2)" : color + "0F"; // 6% tint — barely there
    const iconColor = isGrad ? "#FFFFFF" : color;

    return (
      <View style={{ padding: size.padding }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, minWidth: 0, marginRight: SPACING.sm }}>
            <Text
              style={{
                fontSize: size.labelSize,
                fontFamily: FONTS.medium,
                color: labelColor,
                marginBottom: SPACING.xs || 4,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
            <Text
              style={{
                fontSize: size.valueSize,
                fontFamily: FONTS.semiBold,
                color: textColor,
                marginBottom: subtitle || trend ? (SPACING.xs || 4) : 0,
                letterSpacing: -0.5,
              }}
              numberOfLines={1}
            >
              {value}
            </Text>
            {subtitle && (
              <Text
                style={{
                  fontSize: size.subtitleSize,
                  fontFamily: FONTS.regular,
                  color: subColor,
                  opacity: isGrad ? 1 : 0.8,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
            {trend && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING.xs || 4,
                  marginTop: SPACING.xs || 4,
                }}
              >
                <MaterialIcons
                  name={getTrendIcon()}
                  size={14}
                  color={getTrendColor(isGrad)}
                />
                {trendValue && (
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.bold,
                      color: getTrendColor(isGrad),
                    }}
                  >
                    {trendValue}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View
            style={{
              backgroundColor: badgeBg,
              width: size.badgeSize,
              height: size.badgeSize,
              borderRadius: RADIUS.md || 12,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MaterialIcons name={icon} size={size.iconSize} color={iconColor} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        type: "timing",
        duration: 300,
        delay: index * 40,
      }}
      style={{ flex: 1, minWidth: variant === "compact" ? 130 : 150 }}
    >
      <Card
        variant="elevated"
        style={{ flex: 1, overflow: "hidden" }}
        contentStyle={{ padding: 0 }}
      >
        {gradient ? (
          <LinearGradient
            colors={[color, color + "CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: RADIUS.lg || 16 }}
          >
            {renderContent(true)}
          </LinearGradient>
        ) : (
          renderContent(false)
        )}
      </Card>
    </MotiView>
  );
}
