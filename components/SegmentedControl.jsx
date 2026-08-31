import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";

/**
 * Material 3 Segmented Control / Tab Bar
 * Replaces inline tab bar implementations across the app.
 *
 * @param {Array} tabs - Array of { key, label } objects
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
        { backgroundColor: colors.surfaceContainerHighest },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: isActive
                  ? colors.secondaryContainer
                  : pressed
                  ? colors.surfaceContainerHigh
                  : "transparent",
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive
                    ? colors.onSecondaryContainer
                    : colors.onSurfaceVariant,
                  fontFamily: isActive ? FONTS.bold : FONTS.medium,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    letterSpacing: LETTER_SPACINGS.xs,
  },
});

export default React.memo(SegmentedControl);
