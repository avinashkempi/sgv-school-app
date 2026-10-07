/**
 * SGV School App - Spacing, Radius & Layout Design Tokens
 * 
 * Standardized 4px Base-8 Spatial Scale and Elevation/Border Radius tokens.
 * Single source of truth for spatial relationships across components and layouts.
 */

export const SPACING = {
  xxs: 2,    // Micro gaps (badge padding, micro margins)
  xs:  4,    // Tight padding (pill interiors, chip gaps, small badges)
  sm:  8,    // Standard gap (icon-to-label, list item gaps, compact paddings)
  md:  12,   // Medium gaps (card internal elements, sub-headers)
  lg:  16,   // Standard container & screen horizontal padding, card margins
  xl:  20,   // Elevated section gaps, dialog padding
  xxl: 24,   // Major section breaks, header bottoms, hero paddings
  xxxl: 32,  // Page-level vertical breathing room
  xxxxl: 40, // Hero vertical margins, empty state spacing
  // Standardized layout tokens
  sectionGap: 24,       // Standard section gap
  screenPaddingH: 16,   // Standard app-wide horizontal margins (16px)
  cardInnerPadding: 16, // Balanced card interior padding
  cardInset: 16,        // Standard card inset
  cardGap: 12,          // Gap between adjacent cards in a section
  formGap: 16,          // Vertical gap between form fields
  listItemGap: 8,       // Gap between list items
  headerBottom: 16,     // Space below screen headers
  contentTop: 8,        // Top padding for main scroll content
};

export const RADIUS = {
  none: 0,          // Full-bleed containers
  xs: 4,            // Backward-compat alias
  extraSmall: 4,    // M3 Extra Small: Snackbars, micro status badges
  sm: 8,            // Backward-compat alias
  small: 8,         // M3 Small: Chips, segmented buttons, inputs
  md: 12,           // Backward-compat alias
  medium: 12,       // M3 Medium: Standard cards, mini dialogs
  lg: 16,           // Backward-compat alias
  large: 16,        // M3 Large: Large cards, navigation drawer items, search views
  xl: 24,           // Elevated banners
  xxl: 28,          // Backward-compat alias
  extraLarge: 28,   // M3 Extra Large: Dialogs, bottom sheets, large FABs, hero sheets
  full: 9999,       // M3 Full: Pill buttons, circular avatars, toggle switches, filter chips
};

export const ICON_SIZES = {
  xs: 14,    // Micro trend indicators, inline status icons
  sm: 18,    // Button icons, dense list icons, compact actions
  md: 24,    // Standard header icons, bottom navigation, input icons
  lg: 28,    // Prominent section icons, modal headers
  xl: 36,    // Empty state icons, hero badges, stat avatars
  hero: 48,  // Full screen placeholders, large celebrations
};

export default {
  SPACING,
  RADIUS,
  ICON_SIZES,
};
