import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../../theme";

/**
 * HomeModuleContainer - Standardized module wrapper with pastel transparent styling
 * 
 * @param {string} title - Module title
 * @param {string} icon - MaterialIcons name for header icon
 * @param {string} accentColor - Dominant color token (e.g. '#4F378B', '#0E7490', '#146C2E')
 * @param {string} lightBg - Optional custom pastel background for light mode
 * @param {string} darkBg - Optional custom pastel background for dark mode
 * @param {string} lightBorder - Optional custom border for light mode
 * @param {string} darkBorder - Optional custom border for dark mode
 * @param {string} actionText - Optional right-side action link (e.g. "All Vibes", "Calendar")
 * @param {function} onActionPress - Callback when action link is pressed
 * @param {string} badge - Optional badge text next to title
 * @param {React.ReactNode} headerRight - Custom component for the right side of the header (e.g. Date picker)
 * @param {React.ReactNode} children - Module content
 * @param {object} style - Extra container style
 * @param {object} contentStyle - Extra content style
 * @param {boolean} noPadding - Whether to remove content padding for full-width cards
 */
const HomeModuleContainer = ({
  title,
  icon,
  accentColor,
  lightBg: _lightBg,
  darkBg: _darkBg,
  lightBorder: _lightBorder,
  darkBorder: _darkBorder,
  actionText,
  onActionPress,
  badge,
  headerRight,
  children,
  style,
  contentStyle,
  noPadding = false,
}) => {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const resolvedAccent = accentColor || colors.primary;

  // Minimalist: no per-module color tinting — neutral surface only
  const backgroundColor = isDark
    ? colors.surfaceContainerLow
    : "transparent";

  const borderColor = isDark
    ? colors.outlineVariant + "40"
    : "transparent";

  const handleActionPress = () => {
    if (onActionPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onActionPress();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {/* Module Header Row */}
      {(title || icon || actionText || headerRight) && (
        <View style={styles.headerRow}>
          {/* Left: Icon Badge + Title + Optional Badge */}
          <View style={styles.headerLeft}>
            {icon && (
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark
                      ? `${resolvedAccent}20`
                      : `${resolvedAccent}0F`,
                    borderColor: "transparent",
                  },
                ]}
              >
                <MaterialIcons name={icon} size={15} color={resolvedAccent} />
              </View>
            )}

            <View style={styles.titleWrapper}>
              <Text
                style={[
                  styles.titleText,
                  { color: isDark ? colors.onBackground : colors.onSurface },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {badge && (
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor: isDark
                        ? `${resolvedAccent}35`
                        : `${resolvedAccent}18`,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: resolvedAccent }]}>
                    {badge}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: Custom Component or Standard Action Link */}
          {headerRight ? (
            <View style={styles.headerRight}>{headerRight}</View>
          ) : actionText ? (
            <Pressable
              onPress={handleActionPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={actionText}
            >
              <Text style={[styles.actionText, { color: resolvedAccent }]}>
                {actionText}
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={14}
                color={resolvedAccent}
                style={{ marginLeft: 2 }}
              />
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Module Content */}
      <View
        style={[
          styles.content,
          noPadding && styles.contentNoPadding,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 0,
    marginBottom: 20,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 9,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    flexShrink: 0,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  titleText: {
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.15,
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: FONT_SIZES.micro,
    lineHeight: LINE_HEIGHTS.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexShrink: 0,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    fontFamily: FONTS.medium,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentNoPadding: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
});

export default memo(HomeModuleContainer);
