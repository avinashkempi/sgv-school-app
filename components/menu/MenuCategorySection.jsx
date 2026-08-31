import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import Card from "../Card";

export default function MenuCategorySection({
  title,
  icon,
  iconColor,
  items = [],
}) {
  const router = useRouter();
  const { colors } = useTheme();

  if (!items || items.length === 0) return null;

  const handlePress = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route);
    }
  };

  return (
    <View style={localStyles.container}>
      {/* Category Header */}
      <View style={localStyles.categoryHeader}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={18}
            color={iconColor || colors.primary}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[localStyles.categoryTitle, { color: colors.onSurface }]}>
          {title}
        </Text>
      </View>

      {/* Grouped Card Container */}
      <Card
        variant="elevated"
        style={localStyles.card}
        contentStyle={localStyles.cardContent}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const itemColor = item.color || colors.primary;

          return (
            <React.Fragment key={item.id || item.title || index}>
              <Pressable
                onPress={() => handlePress(item)}
                style={({ pressed }) => [
                  localStyles.itemRow,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceContainerHighest
                      : "transparent",
                  },
                ]}
                android_ripple={{
                  color: colors.onSurface + "10",
                }}
              >
                {/* Left Icon */}
                <View
                  style={[
                    localStyles.iconContainer,
                    { backgroundColor: itemColor + "15" },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon || "arrow-forward"}
                    size={22}
                    color={itemColor}
                  />
                </View>

                {/* Content: Title & Subtitle */}
                <View style={localStyles.textCol}>
                  <Text
                    style={[
                      localStyles.itemTitle,
                      { color: colors.onSurface },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text
                      style={[
                        localStyles.itemSubtitle,
                        { color: colors.onSurfaceVariant },
                      ]}
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>

                {/* Optional Badge */}
                {item.badge ? (
                  <View
                    style={[
                      localStyles.badgeWrap,
                      {
                        backgroundColor: item.badgeColor || colors.error,
                      },
                    ]}
                  >
                    <Text style={localStyles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}

                {/* Chevron */}
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={colors.onSurfaceVariant}
                  style={localStyles.chevron}
                />
              </Pressable>

              {!isLast && (
                <View
                  style={[
                    localStyles.divider,
                    {
                      backgroundColor:
                        colors.outlineVariant || "rgba(0,0,0,0.06)",
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </Card>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.sm,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 20,
    marginBottom: 0,
    overflow: "hidden",
  },
  cardContent: {
    padding: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.md,
  },
  itemSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: LINE_HEIGHTS.sm,
  },
  badgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: "#ffffff",
  },
  chevron: {
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 74,
  },
});
