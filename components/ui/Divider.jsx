import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, FONTS, FONT_SIZES, SPACING } from "../../theme";

/**
 * Material 3 Divider Component
 * 
 * Clean separator for lists, sections, and forms with optional inline label.
 * 
 * @param {'horizontal'|'vertical'} [orientation='horizontal']
 * @param {number} [thickness=1]
 * @param {boolean|number} [inset=false] - Inset margin from edges
 * @param {string} [label] - Optional centered text label (e.g. 'OR')
 * @param {string} [color] - Custom divider line color
 * @param {number} [spacing] - Vertical margin (horizontal) or horizontal margin (vertical)
 * @param {Object} [style] - Container style overrides
 * @param {Object} [labelStyle] - Text label overrides
 */
const Divider = memo(({
  orientation = "horizontal",
  thickness = 1,
  inset = false,
  label,
  color,
  spacing,
  style,
  labelStyle,
  ...props
}) => {
  const { colors } = useTheme();

  const dividerColor =
    color || colors.divider || colors.outlineVariant || colors.border || "#E5E7EB";

  const isHorizontal = orientation === "horizontal";

  // Inset calculation
  const insetMargin =
    typeof inset === "number"
      ? inset
      : inset
      ? (SPACING.lg || 16)
      : 0;

  // Labeled Divider (Horizontal Only)
  if (label && isHorizontal) {
    return (
      <View
        style={[
          styles.labelContainer,
          {
            marginVertical: spacing ?? (SPACING.md || 12),
            marginHorizontal: insetMargin,
          },
          style,
        ]}
        accessibilityRole="separator"
        {...props}
      >
        <View
          style={[
            styles.line,
            { height: thickness, backgroundColor: dividerColor },
          ]}
        />
        <Text
          style={[
            styles.labelText,
            {
              color: colors.textMuted || colors.onSurfaceVariant,
              backgroundColor: "transparent",
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.line,
            { height: thickness, backgroundColor: dividerColor },
          ]}
        />
      </View>
    );
  }

  // Standard Divider
  if (isHorizontal) {
    return (
      <View
        style={[
          {
            height: thickness,
            backgroundColor: dividerColor,
            marginVertical: spacing ?? 0,
            marginHorizontal: insetMargin,
            width: inset ? undefined : "100%",
          },
          style,
        ]}
        accessibilityRole="separator"
        {...props}
      />
    );
  }

  // Vertical Divider
  return (
    <View
      style={[
        {
          width: thickness,
          backgroundColor: dividerColor,
          marginHorizontal: spacing ?? 0,
          marginVertical: insetMargin,
          alignSelf: "stretch",
        },
        style,
      ]}
      accessibilityRole="separator"
      {...props}
    />
  );
});

Divider.displayName = "Divider";

const styles = StyleSheet.create({
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  line: {
    flex: 1,
  },
  labelText: {
    paddingHorizontal: 12,
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.medium,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

export default Divider;
