import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  LETTER_SPACINGS,
  SPACING,
  RADIUS,
} from "../theme";

/**
 * Material 3 Modern Segmented Control / Tab Switcher
 *
 * @param {Array} tabs - Array of { key, label, count } objects
 * @param {string} activeTab - Currently active tab key
 * @param {function} onTabChange - Callback with tab key
 * @param {object} style - Optional container style override
 */
const SegmentedControl = ({ tabs, activeTab, onTabChange, style }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: RADIUS.md || 12,
          padding: 3,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const hasCount = tab.count !== undefined && tab.count !== null;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              {
                borderRadius: RADIUS.sm || 8,
                backgroundColor: isActive
                  ? colors.surface
                  : pressed
                  ? colors.surfaceContainerHighest
                  : "transparent",
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label}${hasCount ? ` (${tab.count})` : ""}`}
          >
            <View style={styles.tabContent}>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive
                      ? colors.onSurface
                      : colors.onSurfaceVariant,
                    fontFamily: isActive ? FONTS.bold : FONTS.medium,
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {hasCount && (
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isActive
                        ? colors.onSurface
                        : colors.onSurfaceVariant,
                      fontFamily: isActive ? FONTS.bold : FONTS.regular,
                      opacity: isActive ? 1 : 0.8,
                      marginLeft: SPACING.xs || 4,
                    },
                  ]}
                  numberOfLines={1}
                >
                  ({tab.count})
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: FONT_SIZES.sm,
    letterSpacing: LETTER_SPACINGS.xs,
    textAlign: "center",
  },
  countText: {
    fontSize: FONT_SIZES.xs,
    textAlign: "center",
  },
});

export default React.memo(SegmentedControl);
