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
};

export const RADIUS = {
  xs: 4,     // Subtle rounding (progress bars, micro indicators)
  sm: 8,     // Small interactive elements (chips, segmented control items)
  md: 12,    // Medium elements (text inputs, modal action buttons, small cards)
  lg: 16,    // Standard cards, bottom sheet top edges, dialogs
  xl: 24,    // Hero cards, prominent banners, container envelopes
  full: 9999,// Circular buttons, avatar containers, pill badges
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
