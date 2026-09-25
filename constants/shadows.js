import { Platform } from "react-native";

/**
 * SGV School App — Shadow / Elevation Design Tokens
 *
 * Central single source of truth for all shadow and elevation styles.
 * Follows Material 3 elevation system with softened opacity for
 * the SGV neutral palette.
 *
 * Guidelines:
 *   - Use subtle shadows that elevate without heavy black boxes
 *   - Cards should feel elevated without looking like floating blocks
 *   - Shadows primarily for: Cards, bottom sheets, floating elements, modals
 *   - Dark mode uses reduced shadow opacity (surfaces distinguish via color)
 */

/**
 * Create elevation styles for a given shadow color.
 * @param {string} shadowColor - The shadow color (typically colors.shadow)
 * @returns {Object} Map of elevation level objects
 */
export function createElevations(shadowColor = "#000000") {
  return {
    // Level 0: Flat, no elevation
    none: {
      elevation: 0,
      shadowOpacity: 0,
    },

    // Level 1: Subtle lift (resting cards, list items)
    sm: {
      elevation: 1,
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      ...Platform.select({
        web: { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)" },
        default: {},
      }),
    },

    // Level 2: Moderate lift (interactive cards, dropdowns)
    md: {
      elevation: 2,
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      ...Platform.select({
        web: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)" },
        default: {},
      }),
    },

    // Level 3: Prominent lift (bottom sheets, FABs)
    lg: {
      elevation: 4,
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      ...Platform.select({
        web: { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" },
        default: {},
      }),
    },

    // Level 4: High emphasis (modals, overlays)
    xl: {
      elevation: 6,
      shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      ...Platform.select({
        web: { boxShadow: "0 6px 16px rgba(0, 0, 0, 0.10)" },
        default: {},
      }),
    },

    // Level 5: Maximum elevation (dialog, navigation drawer)
    xxl: {
      elevation: 8,
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      ...Platform.select({
        web: { boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)" },
        default: {},
      }),
    },
  };
}

/**
 * Semantic elevation aliases for common use cases.
 */
export const ELEVATION_USES = {
  card: "sm",           // Default resting card
  cardHovered: "md",    // Card on hover/press
  bottomNav: "md",      // Bottom navigation bar
  fab: "lg",            // Floating action button
  bottomSheet: "lg",    // Bottom sheet handle area
  modal: "xl",          // Modal/dialog overlay
  tooltip: "md",        // Tooltip popup
};

export default { createElevations, ELEVATION_USES };
