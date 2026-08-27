import { Platform, StyleSheet } from "react-native";

/**
 * SGV School App - Global Typography Design System
 * 
 * Central Single Source of Truth for all typography across the entire application.
 * All font sizes, line heights, letter spacings, and font weights are strictly defined here.
 */

// ── 1. FONT FAMILIES ─────────────────────────────────────────────────────────
export const FONT_FAMILIES = {
  regular: "DMSans-Regular",
  medium: "DMSans-Medium",
  semiBold: "DMSans-SemiBold",
  bold: "DMSans-Bold",
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};

// Aliases for compatibility with theme.js
export const FONTS = {
  displayLarge: FONT_FAMILIES.bold,
  displayMedium: FONT_FAMILIES.bold,
  displaySmall: FONT_FAMILIES.bold,

  headlineLarge: FONT_FAMILIES.bold,
  headlineMedium: FONT_FAMILIES.bold,
  headlineSmall: FONT_FAMILIES.bold,

  titleLarge: FONT_FAMILIES.bold,
  titleMedium: FONT_FAMILIES.medium,
  titleSmall: FONT_FAMILIES.medium,

  labelLarge: FONT_FAMILIES.medium,
  labelMedium: FONT_FAMILIES.medium,
  labelSmall: FONT_FAMILIES.medium,

  bodyLarge: FONT_FAMILIES.regular,
  bodyMedium: FONT_FAMILIES.regular,
  bodySmall: FONT_FAMILIES.regular,

  // Weight-based aliases
  regular: FONT_FAMILIES.regular,
  medium: FONT_FAMILIES.medium,
  semiBold: FONT_FAMILIES.semiBold,
  bold: FONT_FAMILIES.bold,
  mono: FONT_FAMILIES.mono,
};

// ── 2. STANDARDIZED FONT SIZES (14-Step Scale) ──────────────────────────────
export const FONT_SIZES = {
  micro: 10,     // Badges, micro tags, status pills, sub-badges, dense charts
  xs: 11,        // Captions, micro-dates, tab labels, subtle metadata, chips
  sm: 12,        // Secondary descriptions, timestamps, helper notes, subtext
  md: 13,        // Dense body, table cell text, card descriptions, read more
  base: 14,      // Standard body, input text, button labels, event titles
  mdLg: 15,      // Prominent card headers, navigation list items, subheaders
  lg: 16,        // Section titles, large inputs, modal subheads, user names
  xl: 18,        // Card headers, subheadings, dialog titles, exam headings
  xxl: 20,       // Page subheadings, metric highlights, modal titles
  title: 22,     // Prominent screen titles, primary stats
  headline: 24,  // Major section titles, large banners, hero tags
  displaySm: 28, // Login titles, hero headings
  displayMd: 32, // Large display headers, big counters
  displayLg: 40, // Jumbo celebrations, attendance percentage
};

// ── 3. MATCHING LINE HEIGHTS ────────────────────────────────────────────────
export const LINE_HEIGHTS = {
  micro: 14,
  xs: 16,
  sm: 16,
  md: 18,
  base: 20,
  mdLg: 22,
  lg: 24,
  xl: 26,
  xxl: 28,
  title: 28,
  headline: 32,
  displaySm: 36,
  displayMd: 40,
  displayLg: 48,
};

// ── 4. MATCHING LETTER SPACINGS ─────────────────────────────────────────────
export const LETTER_SPACINGS = {
  micro: 0.3,
  xs: 0.2,
  sm: 0.1,
  md: 0.05,
  base: 0,
  mdLg: 0.1,
  lg: 0,
  xl: -0.1,
  xxl: -0.2,
  title: -0.2,
  headline: -0.3,
  displaySm: -0.5,
  displayMd: -0.8,
  displayLg: -1.0,
};

// ── 5. COMPOSITE TYPOGRAPHY PRESETS ─────────────────────────────────────────
export const TYPOGRAPHY = StyleSheet.create({
  // Micro & Badges (10px)
  badge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.micro,
    lineHeight: LINE_HEIGHTS.micro,
    letterSpacing: LETTER_SPACINGS.micro,
    flexShrink: 1,
  },
  microRegular: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.micro,
    lineHeight: LINE_HEIGHTS.micro,
    letterSpacing: LETTER_SPACINGS.micro,
    flexShrink: 1,
  },
  microMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.micro,
    lineHeight: LINE_HEIGHTS.micro,
    letterSpacing: LETTER_SPACINGS.micro,
    flexShrink: 1,
  },

  // Captions & Small Labels (11px)
  caption: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
    letterSpacing: LETTER_SPACINGS.xs,
    flexShrink: 1,
  },
  captionBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
    letterSpacing: LETTER_SPACINGS.xs,
    flexShrink: 1,
  },
  labelSmall: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
    letterSpacing: LETTER_SPACINGS.xs,
    flexShrink: 1,
  },

  // Small Body & Metadata (12px)
  bodySmall: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  bodySmallMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  bodySmallBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  labelMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },

  // Dense Body & Card Content (13px)
  bodyDense: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  bodyDenseMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  bodyDenseBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },

  // Base Body & Standard Inputs (14px)
  bodyMedium: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    letterSpacing: LETTER_SPACINGS.base,
    flexShrink: 1,
  },
  bodyMediumBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    letterSpacing: LETTER_SPACINGS.base,
    flexShrink: 1,
  },
  labelLarge: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    letterSpacing: LETTER_SPACINGS.base,
    flexShrink: 1,
  },
  titleSmall: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    letterSpacing: LETTER_SPACINGS.base,
    flexShrink: 1,
  },
  titleSmallBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    letterSpacing: LETTER_SPACINGS.base,
    flexShrink: 1,
  },

  // Medium Large Card Header (15px)
  cardHeader: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.mdLg,
    lineHeight: LINE_HEIGHTS.mdLg,
    letterSpacing: LETTER_SPACINGS.mdLg,
    flexShrink: 1,
  },
  cardHeaderMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.mdLg,
    lineHeight: LINE_HEIGHTS.mdLg,
    letterSpacing: LETTER_SPACINGS.mdLg,
    flexShrink: 1,
  },

  // Large Body & Titles (16px)
  bodyLarge: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },
  titleMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },
  titleMediumBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },

  // Extra Large Titles & Subheadings (18px)
  titleLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
    letterSpacing: LETTER_SPACINGS.xl,
    flexShrink: 1,
  },
  headlineSmall: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
    letterSpacing: LETTER_SPACINGS.xl,
    flexShrink: 1,
  },

  // Subheadings & Metric Highlights (20px)
  subheading: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xxl,
    lineHeight: LINE_HEIGHTS.xxl,
    letterSpacing: LETTER_SPACINGS.xxl,
    flexShrink: 1,
  },
  headlineMedium: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xxl,
    lineHeight: LINE_HEIGHTS.xxl,
    letterSpacing: LETTER_SPACINGS.xxl,
    flexShrink: 1,
  },

  // Primary Screen Titles (22px - 24px)
  screenTitle: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.title,
    lineHeight: LINE_HEIGHTS.title,
    letterSpacing: LETTER_SPACINGS.title,
    flexShrink: 1,
  },
  headlineLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.headline,
    lineHeight: LINE_HEIGHTS.headline,
    letterSpacing: LETTER_SPACINGS.headline,
    flexShrink: 1,
  },

  // Displays & Hero (28px, 32px, 40px)
  displaySmall: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.displaySm,
    lineHeight: LINE_HEIGHTS.displaySm,
    letterSpacing: LETTER_SPACINGS.displaySm,
    flexShrink: 1,
  },
  displayMedium: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.displayMd,
    lineHeight: LINE_HEIGHTS.displayMd,
    letterSpacing: LETTER_SPACINGS.displayMd,
    flexShrink: 1,
  },
  displayLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.displayLg,
    lineHeight: LINE_HEIGHTS.displayLg,
    letterSpacing: LETTER_SPACINGS.displayLg,
    flexShrink: 1,
  },

  // Monospace (Code / ID / Numbers)
  mono: {
    fontFamily: FONT_FAMILIES.mono,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: 0,
    flexShrink: 1,
  },
});

export default {
  FONT_FAMILIES,
  FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  TYPOGRAPHY,
};
