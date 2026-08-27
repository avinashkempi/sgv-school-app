import React, { memo } from "react";
import { Text as RNText } from "react-native";
import { useTheme } from "../../theme";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  TYPOGRAPHY,
} from "../../constants/typography";

/**
 * AppText - Unified Global Typography Component
 * 
 * Guarantees consistent typography, line-heights, letter-spacing, and font-families.
 * 
 * @example
 * <AppText variant="titleMedium" color="primary">Title</AppText>
 * <AppText size="sm" color="onSurfaceVariant">Secondary</AppText>
 * <AppText size="micro" weight="bold" color="error">ALERT</AppText>
 */
const AppText = ({
  variant,
  size,
  weight,
  color,
  align,
  transform,
  numberOfLines,
  ellipsizeMode,
  style,
  children,
  ...props
}) => {
  const { colors } = useTheme();

  // Resolve base style from variant or fallback to bodyMedium
  let baseStyle = TYPOGRAPHY.bodyMedium;
  if (variant && TYPOGRAPHY[variant]) {
    baseStyle = TYPOGRAPHY[variant];
  } else if (variant === "title") {
    baseStyle = TYPOGRAPHY.titleMedium;
  } else if (variant === "body") {
    baseStyle = TYPOGRAPHY.bodyMedium;
  } else if (variant === "display") {
    baseStyle = TYPOGRAPHY.displaySmall;
  } else if (variant === "displayHero") {
    baseStyle = TYPOGRAPHY.displayLarge;
  } else if (variant === "headline") {
    baseStyle = TYPOGRAPHY.headlineSmall;
  }

  // Resolve custom size override
  const customFontSize = size ? FONT_SIZES[size] || size : undefined;
  const customLineHeight = size ? LINE_HEIGHTS[size] : undefined;
  const customLetterSpacing = size ? LETTER_SPACINGS[size] : undefined;

  // Resolve custom weight override
  let customFontFamily = undefined;
  if (weight) {
    customFontFamily = FONT_FAMILIES[weight] || weight;
  }

  // Resolve color
  let textColor = colors.onSurface;
  if (color) {
    textColor = colors[color] || color;
  }

  const composedStyle = [
    baseStyle,
    customFontSize ? { fontSize: customFontSize } : null,
    customLineHeight ? { lineHeight: customLineHeight } : null,
    customLetterSpacing !== undefined ? { letterSpacing: customLetterSpacing } : null,
    customFontFamily ? { fontFamily: customFontFamily } : null,
    textColor ? { color: textColor } : null,
    align ? { textAlign: align } : null,
    transform ? { textTransform: transform } : null,
    style,
  ];

  return (
    <RNText
      style={composedStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default memo(AppText);
