import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color,
  onPress,
  loading = false,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const isPositive = trendValue >= 0;
  const trendColor = isPositive ? colors.success : colors.error;
  const cardColor = color || colors.primary;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    }
  };

  const content = (
    <View
      style={[
        {
          backgroundColor: isDark ? `${cardColor}16` : `${cardColor}0A`,
          borderRadius: 16,
          padding: 12,
          flex: 1,
          minWidth: 95,
          margin: 4,
          borderWidth: 1,
          borderColor: isDark ? `${cardColor}38` : `${cardColor}22`,
        },
      ]}
    >
      {loading ? (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            height: 75,
          }}
        >
          <MaterialCommunityIcons
            name="loading"
            size={22}
            color={colors.onSurfaceVariant}
          />
          <Text
            style={[
              {
                fontSize: FONT_SIZES.xs,
                fontFamily: FONTS.medium,
                marginTop: 6,
                color: colors.onSurfaceVariant,
              },
            ]}
          >
            Loading...
          </Text>
        </View>
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? `${cardColor}25` : `${cardColor}15`,
                padding: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDark ? `${cardColor}40` : `${cardColor}28`,
              }}
            >
              <MaterialCommunityIcons name={icon} size={16} color={cardColor} />
            </View>
            {trend && trendValue !== undefined && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? `${trendColor}25` : `${trendColor}15`,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <MaterialCommunityIcons
                  name={isPositive ? "arrow-up" : "arrow-down"}
                  size={10}
                  color={trendColor}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.micro,
                    color: trendColor,
                    fontFamily: FONTS.bold,
                    marginLeft: 1,
                  }}
                >
                  {Math.abs(trendValue)}%
                </Text>
              </View>
            )}
          </View>

          <Text
            style={{
              fontSize: FONT_SIZES.md,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              letterSpacing: -0.3,
              marginBottom: 1,
            }}
            numberOfLines={1}
          >
            {value}
          </Text>

          <Text
            style={{
              fontSize: FONT_SIZES.xs,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle && (
            <Text
              style={{
                fontSize: FONT_SIZES.micro,
                fontFamily: FONTS.regular,
                color: colors.onSurfaceVariant,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.75 : 1,
          flex: 1,
          minWidth: 95,
        })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

export default StatCard;
