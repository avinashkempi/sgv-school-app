/**
 * SGV School App — Semantic Color Design Tokens
 *
 * Central single source of truth for all colors across the application.
 * Follows Material 3 structure with SGV brand identity.
 *
 * Distribution:  ~85% neutral surfaces
 *                ~10% typography / dark elements
 *                ~5%  SGV brand colors (blue primary, emerald secondary)
 *
 * Brand Colors:
 *   Blue    #2F6CD4 — Campus base color, primary actions, active tabs, identity & trust
 *   Emerald #16A34A — Secondary actions, success states, growth & academics
 *   Amber   #D97706 — Achievements, awards, pending alerts, warm tertiary
 */

// ── SGV BRAND CONSTANTS ─────────────────────────────────────────────────────
export const SGV_BRAND = {
  blue: "#2F6CD4",        // SGV Brand Blue (Primary base)
  blueDark: "#4D83E8",    // Brightened blue for dark surfaces
  emerald: "#16A34A",     // Campus Emerald Green (Secondary support)
  emeraldDark: "#22C55E", // Vibrant emerald for dark mode
  orange: "#FF5E1C",      // Legacy brand reference
  orangeDark: "#FF6A2A",
};

// ── LIGHT THEME ─────────────────────────────────────────────────────────────
export const lightColors = {
  // ─── Brand Base (Primary = SGV Brand Blue) ───
  primary: "#2F6CD4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#E0ECFF",         // Soft fresh blue tint
  onPrimaryContainer: "#0A1F40",

  // ─── Secondary (Campus Emerald Green) ───
  secondary: "#16A34A",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#DCFCE7",       // Soft emerald tint
  onSecondaryContainer: "#052E16",

  // ─── Tertiary (Warm Amber / Achievement / Gold tone for balance) ───
  tertiary: "#D97706",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FEF3C7",
  onTertiaryContainer: "#451A03",

  // ─── Error ───
  error: "#DC2626",
  onError: "#FFFFFF",
  errorContainer: "#FEF2F2",
  onErrorContainer: "#7F1D1D",

  // ─── Surfaces ───
  background: "#F7F8FA",              // Cool neutral canvas
  onBackground: "#111318",

  surface: "#FFFFFF",                  // Card surface
  onSurface: "#111318",

  surfaceVariant: "#EDEEF2",
  onSurfaceVariant: "#6B7280",

  // ─── Outline ───
  outline: "#9CA3AF",
  outlineVariant: "#E5E7EB",

  // ─── Surface Elevation Ladder ───
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F9FAFB",
  surfaceContainer: "#F3F4F6",
  surfaceContainerHigh: "#EDEEF2",
  surfaceContainerHighest: "#E5E7EB",

  // ─── System ───
  shadow: "#000000",
  scrim: "#000000",

  // ─── Semantic Status ───
  success: "#16A34A",
  successContainer: "#ECFDF5",
  onSuccess: "#FFFFFF",

  warning: "#D97706",
  warningContainer: "#FFFBEB",

  // ─── Role Colors (M3 unified) ───
  roleSuperAdmin: "#DC2626",
  roleAdmin: "#16A34A",
  roleStaff: "#0284C7",
  roleClassTeacher: "#7D5260",
  roleStudent: "#2F6CD4",

  // ─── Legacy / Convenience Aliases ───
  white: "#FFFFFF",
  textPrimary: "#111318",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  divider: "#F0F1F4",
  cardBackground: "#F3F4F6",

  // ─── Brand-specific tokens for targeted usage ───
  brandBlue: "#2F6CD4",
  brandBlueLight: "#E0ECFF",
  brandBlueContainer: "#E0ECFF",
  brandEmerald: "#16A34A",
  brandEmeraldLight: "#DCFCE7",
  brandGreen: "#16A34A",
  brandGreenLight: "#DCFCE7",
  // Aliases for smooth compatibility
  brandOrange: "#2F6CD4",
  brandOrangeLight: "#E0ECFF",
  brandOrangeContainer: "#E0ECFF",
};

// ── DARK THEME ──────────────────────────────────────────────────────────────
export const darkColors = {
  // ─── Brand Base (Primary = SGV Brand Blue — brightened) ───
  primary: "#4D83E8",
  onPrimary: "#0A1F40",
  primaryContainer: "#1A3A6B",
  onPrimaryContainer: "#C5D8FF",

  // ─── Secondary (Campus Emerald Green — brightened) ───
  secondary: "#22C55E",
  onSecondary: "#052E16",
  secondaryContainer: "#0F4220",
  onSecondaryContainer: "#BBF7D0",

  // ─── Tertiary (Warm Amber / Achievement tone) ───
  tertiary: "#F59E0B",
  onTertiary: "#451A03",
  tertiaryContainer: "#78350F",
  onTertiaryContainer: "#FEF3C7",

  // ─── Error ───
  error: "#EF4444",
  onError: "#7F1D1D",
  errorContainer: "#450A0A",
  onErrorContainer: "#FECACA",

  // ─── Surfaces ───
  background: "#090A0C",              // Deep near-black
  onBackground: "#F5F5F5",

  surface: "#14161A",                  // Dark card surface
  onSurface: "#F5F5F5",

  surfaceVariant: "#2A2D32",
  onSurfaceVariant: "#A1A1AA",

  // ─── Outline ───
  outline: "#6B7280",
  outlineVariant: "#2A2D32",

  // ─── Surface Elevation Ladder ───
  surfaceContainerLowest: "#060708",
  surfaceContainerLow: "#111318",
  surfaceContainer: "#1A1C20",
  surfaceContainerHigh: "#232528",
  surfaceContainerHighest: "#2E3034",

  // ─── System ───
  shadow: "#000000",
  scrim: "#000000",

  // ─── Semantic Status ───
  success: "#22C55E",
  successContainer: "#0A2A1B",
  onSuccess: "#FFFFFF",

  warning: "#F59E0B",
  warningContainer: "#2A1E0A",

  // ─── Role Colors ───
  roleSuperAdmin: "#FCA5A5",
  roleAdmin: "#6DD58C",
  roleStaff: "#38BDF8",
  roleClassTeacher: "#EFB8C8",
  roleStudent: "#4D83E8",

  // ─── Legacy / Convenience Aliases ───
  white: "#FFFFFF",
  textPrimary: "#F5F5F5",
  textSecondary: "#A1A1AA",
  textMuted: "#6B7280",
  border: "#2A2D32",
  borderLight: "#1A1C20",
  divider: "#1A1C20",
  cardBackground: "#1A1C20",

  // ─── Brand-specific tokens for targeted usage ───
  brandBlue: "#4D83E8",
  brandBlueLight: "#1A3A6B",
  brandBlueContainer: "#1A3A6B",
  brandEmerald: "#22C55E",
  brandEmeraldLight: "#0F4220",
  brandGreen: "#22C55E",
  brandGreenLight: "#0F4220",
  // Aliases for smooth compatibility
  brandOrange: "#4D83E8",
  brandOrangeLight: "#1A3A6B",
  brandOrangeContainer: "#1A3A6B",
};

export default { lightColors, darkColors, SGV_BRAND };
