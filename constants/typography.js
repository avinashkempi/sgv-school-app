import { Platform, StyleSheet } from "react-native";

/**
 * SGV School App - Global Typography Design System
 * 
 * Central Single Source of Truth for all typography across the entire application.
 * 8-step font size scale following Material Design 3 / Apple HIG conventions.
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

// ── 2. STANDARDIZED FONT SIZES (8-Step Scale) ──────────────────────────────
//
// Each step is visually distinct (≥2px body, ≥4px headings).
// Previous 14-step scale had 1px increments (13→14→15→16→17) that were
// barely distinguishable and caused visual inconsistency.
//
export const FONT_SIZES = {
  micro:   11,   // Badges, status pills, sub-info, dense charts
  xs:      12,   // Captions, metadata, chips, tab labels, micro-dates
  sm:      14,   // Body text, inputs, buttons, descriptions, timestamps
  md:      16,   // Card headers, subheadings, nav items, prominent labels
  lg:      20,   // Screen/section titles, large headings, dialog titles
  xl:      24,   // Page headlines, hero tags, major titles
  display: 30,   // Login titles, hero headings, display text
  jumbo:   40,   // Celebrations, giant counters, attendance percentage
};

// ── 3. MATCHING LINE HEIGHTS ────────────────────────────────────────────────
export const LINE_HEIGHTS = {
  micro:   15,
  xs:      17,
  sm:      20,
  md:      23,
  lg:      26,
  xl:      30,
  display: 36,
  jumbo:   48,
};

// ── 4. MATCHING LETTER SPACINGS ─────────────────────────────────────────────
export const LETTER_SPACINGS = {
  micro:    0.3,
  xs:       0.2,
  sm:       0,
  md:       0.1,
  lg:      -0.1,
  xl:      -0.2,
  display: -0.5,
  jumbo:   -1.0,
};

// ── 5. COMPOSITE TYPOGRAPHY PRESETS ─────────────────────────────────────────
export const TYPOGRAPHY = StyleSheet.create({
  // Micro & Badges (11px)
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

  // Captions & Small Labels (12px)
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

  // Body Text (14px)
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
  bodyDense: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  bodyDenseMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  bodyDenseBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  bodyMediumBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  labelLarge: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  titleSmall: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },
  titleSmallBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    letterSpacing: LETTER_SPACINGS.sm,
    flexShrink: 1,
  },

  // Card Headers & Subheadings (16px)
  cardHeader: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  cardHeaderMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  bodyLarge: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  titleMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  titleMediumBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },

  // Screen / Section Titles (20px)
  titleLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  sectionTitleLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },
  cardTitle: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    letterSpacing: LETTER_SPACINGS.md,
    flexShrink: 1,
  },
  headlineSmall: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },
  subheading: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },
  headlineMedium: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    letterSpacing: LETTER_SPACINGS.lg,
    flexShrink: 1,
  },

  // Page Headlines (24px)
  screenTitle: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
    letterSpacing: LETTER_SPACINGS.xl,
    flexShrink: 1,
  },
  headlineLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
    letterSpacing: LETTER_SPACINGS.xl,
    flexShrink: 1,
  },

  // Display & Hero (30px, 40px)
  displaySmall: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.display,
    lineHeight: LINE_HEIGHTS.display,
    letterSpacing: LETTER_SPACINGS.display,
    flexShrink: 1,
  },
  displayMedium: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.display,
    lineHeight: LINE_HEIGHTS.display,
    letterSpacing: LETTER_SPACINGS.display,
    flexShrink: 1,
  },
  displayLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.jumbo,
    lineHeight: LINE_HEIGHTS.jumbo,
    letterSpacing: LETTER_SPACINGS.jumbo,
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
