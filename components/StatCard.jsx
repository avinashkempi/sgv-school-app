import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import Card from "./Card";
import { LinearGradient } from "expo-linear-gradient";

/**
 * StatCard Component
 * Displays a statistic with icon, value, label, and optional trend with Moti spring entrance
 *
 * @param {String} label - Stat label
 * @param {String|Number} value - Main value to display
 * @param {String} icon - MaterialIcons icon name
 * @param {String} color - Primary color for the card
 * @param {String} trend - Optional trend indicator ('up', 'down', 'neutral')
 * @param {String|Number} trendValue - Optional trend value to display
 * @param {String} subtitle - Optional subtitle text
 * @param {Boolean} gradient - Whether to use gradient background
 * @param {String} variant - 'default', 'compact', 'large'
 * @param {Number} index - Stagger animation index
 */
export default function StatCard({
  label,
  value,
  icon = "analytics",
  color = "#2196F3",
  trend,
  trendValue,
  subtitle,
  gradient = false,
  variant = "default",
  index = 0,
}) {
  const { colors } = useTheme();

  const getTrendIcon = () => {
    if (trend === "up") return "trending-up";
    if (trend === "down") return "trending-down";
    return "trending-flat";
  };

  const getTrendColor = () => {
    if (trend === "up") return colors.success;
    if (trend === "down") return colors.error;
    return colors.onSurfaceVariant;
  };

  const getSize = () => {
    if (variant === "compact") {
      return {
        iconSize: 20,
        valueSize: FONT_SIZES.xxl,
        labelSize: FONT_SIZES.xs,
        subtitleSize: FONT_SIZES.micro,
        padding: 12,
      };
    }
    if (variant === "large") {
      return {
        iconSize: 32,
        valueSize: FONT_SIZES.displayMd,
        labelSize: FONT_SIZES.base,
        subtitleSize: FONT_SIZES.sm,
        padding: 20,
      };
    }
    return {
      iconSize: 24,
      valueSize: FONT_SIZES.headline,
      labelSize: FONT_SIZES.sm,
      subtitleSize: FONT_SIZES.xs,
      padding: 16,
    };
  };

  const size = getSize();

  if (gradient) {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95, translateY: 8 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 18,
          stiffness: 140,
          delay: index * 60,
        }}
        style={{ flex: 1, minWidth: variant === "compact" ? 140 : 160 }}
      >
        <Card
          variant="elevated"
          style={{ flex: 1, overflow: "hidden" }}
          contentStyle={{ padding: 0 }}
        >
          <LinearGradient
            colors={[color, color + "CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 12 }}
          >
            <View style={{ padding: size.padding }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: size.labelSize,
                      fontFamily: FONTS.medium,
                      color: "#FFFFFF",
                      marginBottom: 8,
                      opacity: 0.9,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontSize: size.valueSize,
                      fontFamily: FONTS.bold,
                      color: "#FFFFFF",
                      marginBottom: subtitle || trend ? 6 : 0,
                    }}
                  >
                    {value}
                  </Text>
                  {subtitle && (
                    <Text
                      style={{
                        fontSize: size.subtitleSize,
                        fontFamily: FONTS.regular,
                        color: "#FFFFFF",
                        opacity: 0.8,
                      }}
                    >
                      {subtitle}
                    </Text>
                  )}
                  {trend && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      <MaterialIcons
                        name={getTrendIcon()}
                        size={14}
                        color="#FFFFFF"
                      />
                      {trendValue && (
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: FONTS.bold,
                            color: "#FFFFFF",
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
                    backgroundColor: "rgba(255,255,255,0.2)",
                    width: size.iconSize + 16,
                    height: size.iconSize + 16,
                    borderRadius: (size.iconSize + 16) / 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons
                    name={icon}
                    size={size.iconSize}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Card>
      </MotiView>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95, translateY: 8 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{
        type: "spring",
        damping: 18,
        stiffness: 140,
        delay: index * 60,
      }}
      style={{ flex: 1, minWidth: variant === "compact" ? 140 : 160 }}
    >
      <Card
        variant="elevated"
        style={{ flex: 1 }}
        contentStyle={{ padding: 0 }}
      >
        <View style={{ padding: size.padding }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: size.labelSize,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                  marginBottom: 8,
                }}
              >
                {label}
              </Text>
              <Text
                style={{
                  fontSize: size.valueSize,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  marginBottom: subtitle || trend ? 6 : 0,
                }}
              >
                {value}
              </Text>
              {subtitle && (
                <Text
                  style={{
                    fontSize: size.subtitleSize,
                    fontFamily: FONTS.regular,
                    color: colors.onSurfaceVariant,
                    opacity: 0.7,
                  }}
                >
                  {subtitle}
                </Text>
              )}
              {trend && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  <MaterialIcons
                    name={getTrendIcon()}
                    size={14}
                    color={getTrendColor()}
                  />
                  {trendValue && (
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.bold,
                        color: getTrendColor(),
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
                backgroundColor: color + "15",
                width: size.iconSize + 16,
                height: size.iconSize + 16,
                borderRadius: (size.iconSize + 16) / 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name={icon} size={size.iconSize} color={color} />
            </View>
          </View>
        </View>
      </Card>
    </MotiView>
  );
}
