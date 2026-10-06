/**
 * SGV School App — Semantic Color Design Tokens
 *
 * Central single source of truth for all colors across the application.
 * Strictly follows official Material Design 3 (M3) design principles.
 *
 * M3 Baseline Palette:
 *   Primary:   #6750A4 (Light) / #D0BCFF (Dark) — Key actions, active tabs, brand expression
 *   Secondary: #625B71 (Light) / #CCC2DC (Dark) — Supporting components, filters, chips
 *   Tertiary:  #7D5260 (Light) / #EFB8C8 (Dark) — Contrasting accents, highlights, variety
 *   Surfaces:  #FEF7FF / #F3EDF7 (Light) / #141218 / #211F26 (Dark) — Tonal surface ladder
 */

// ── SGV BRAND & M3 PALETTE CONSTANTS ────────────────────────────────────────
export const SGV_BRAND = {
  purple: "#6750A4",        // Standard M3 Purple (Primary base)
  purpleDark: "#D0BCFF",    // M3 Purple for dark surfaces
  secondary: "#625B71",     // M3 Secondary Slate
  secondaryDark: "#CCC2DC",
  tertiary: "#7D5260",      // M3 Tertiary Rose
  tertiaryDark: "#EFB8C8",
  emerald: "#146C2E",       // M3 Forest Green
  emeraldDark: "#6DD58C",
  amber: "#8A5100",         // M3 Warm Amber
  amberDark: "#FFBA28",
  // Aliases for compatibility
  blue: "#6750A4",
  blueDark: "#D0BCFF",
  orange: "#7D5260",
  orangeDark: "#EFB8C8",
};

// ── LIGHT THEME ─────────────────────────────────────────────────────────────
export const lightColors = {
  // ─── Primary (Standard M3 Baseline Purple) ───
  primary: "#6750A4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#EADDFF",         // Soft M3 lavender tint
  onPrimaryContainer: "#21005D",
  inversePrimary: "#D0BCFF",

  // ─── Secondary (M3 Secondary Slate/Mauve) ───
  secondary: "#625B71",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E8DEF8",       // Soft muted purple/slate tint
  onSecondaryContainer: "#1D192B",

  // ─── Tertiary (M3 Warm Rose / Balanced Contrasting Accent) ───
  tertiary: "#7D5260",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FFD8E4",        // Soft warm rose tint
  onTertiaryContainer: "#31111D",

  // ─── Error (M3 Standard) ───
  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",

  // ─── Surfaces & Canvas (M3 Expressive Neutral Surfaces) ───
  background: "#FEF7FF",
  onBackground: "#1D1B20",

  surface: "#FEF7FF",
  onSurface: "#1D1B20",

  surfaceVariant: "#E7E0EC",
  onSurfaceVariant: "#49454F",

  // ─── Outline ───
  outline: "#79747E",
  outlineVariant: "#CAC4D0",

  // ─── Surface Elevation Ladder (M3 Tonal Surface Ladder) ───
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F7F2FA",
  surfaceContainer: "#F3EDF7",
  surfaceContainerHigh: "#ECE6F0",
  surfaceContainerHighest: "#E6E0E9",

  // ─── Inverse Surfaces ───
  inverseSurface: "#313033",
  inverseOnSurface: "#F4EFF4",

  // ─── System ───
  shadow: "#000000",
  scrim: "#000000",

  // ─── Semantic Status (M3 Tonal Green, Amber, Info) ───
  success: "#146C2E",
  onSuccess: "#FFFFFF",
  successContainer: "#C4EED0",
  onSuccessContainer: "#002107",

  warning: "#8A5100",
  onWarning: "#FFFFFF",
  warningContainer: "#FFDEAC",
  onWarningContainer: "#2C1600",

  info: "#00639B",
  onInfo: "#FFFFFF",
  infoContainer: "#C2E7FF",
  onInfoContainer: "#001D33",

  // ─── Role Colors (M3 Unified Roles) ───
  roleSuperAdmin: "#B3261E",
  roleAdmin: "#146C2E",
  roleStaff: "#6750A4",
  roleClassTeacher: "#7D5260",
  roleStudent: "#00639B",

  // ─── Legacy / Convenience Aliases ───
  white: "#FFFFFF",
  textPrimary: "#1D1B20",
  textSecondary: "#49454F",
  textMuted: "#79747E",
  border: "#CAC4D0",
  borderLight: "#E7E0EC",
  divider: "#E7E0EC",
  cardBackground: "#F3EDF7",

  // ─── Brand-specific & Compatibility Tokens ───
  brandPurple: "#6750A4",
  brandPurpleLight: "#EADDFF",
  brandPurpleContainer: "#EADDFF",
  brandBlue: "#6750A4",
  brandBlueLight: "#EADDFF",
  brandBlueContainer: "#EADDFF",
  brandEmerald: "#146C2E",
  brandEmeraldLight: "#C4EED0",
  brandGreen: "#146C2E",
  brandGreenLight: "#C4EED0",
  brandOrange: "#7D5260",
  brandOrangeLight: "#FFD8E4",
  brandOrangeContainer: "#FFD8E4",
};

// ── DARK THEME ──────────────────────────────────────────────────────────────
export const darkColors = {
  // ─── Primary (Standard M3 Purple — brightened for dark surfaces) ───
  primary: "#D0BCFF",
  onPrimary: "#381E72",
  primaryContainer: "#4F378B",
  onPrimaryContainer: "#EADDFF",
  inversePrimary: "#6750A4",

  // ─── Secondary (M3 Secondary Slate/Mauve — brightened) ───
  secondary: "#CCC2DC",
  onSecondary: "#332D41",
  secondaryContainer: "#4A4458",
  onSecondaryContainer: "#E8DEF8",

  // ─── Tertiary (M3 Warm Rose / Balanced Contrasting Accent) ───
  tertiary: "#EFB8C8",
  onTertiary: "#492532",
  tertiaryContainer: "#633B48",
  onTertiaryContainer: "#FFD8E4",

  // ─── Error (M3 Standard) ───
  error: "#F2B8B5",
  onError: "#601410",
  errorContainer: "#8C1D18",
  onErrorContainer: "#F9DEDC",

  // ─── Surfaces & Canvas (M3 Dark Palette) ───
  background: "#141218",
  onBackground: "#E6E1E5",

  surface: "#141218",
  onSurface: "#E6E1E5",

  surfaceVariant: "#49454F",
  onSurfaceVariant: "#CAC4D0",

  // ─── Outline ───
  outline: "#938F99",
  outlineVariant: "#49454F",

  // ─── Surface Elevation Ladder (M3 Tonal Surface Ladder) ───
  surfaceContainerLowest: "#0F0D13",
  surfaceContainerLow: "#1D1B20",
  surfaceContainer: "#211F26",
  surfaceContainerHigh: "#2B2930",
  surfaceContainerHighest: "#36343B",

  // ─── Inverse Surfaces ───
  inverseSurface: "#E6E1E5",
  inverseOnSurface: "#313033",

  // ─── System ───
  shadow: "#000000",
  scrim: "#000000",

  // ─── Semantic Status ───
  success: "#6DD58C",
  onSuccess: "#003910",
  successContainer: "#00531B",
  onSuccessContainer: "#C4EED0",

  warning: "#FFBA28",
  onWarning: "#472A00",
  warningContainer: "#653B00",
  onWarningContainer: "#FFDEAC",

  info: "#76D1FF",
  onInfo: "#003454",
  infoContainer: "#004B76",
  onInfoContainer: "#C2E7FF",

  // ─── Role Colors ───
  roleSuperAdmin: "#F2B8B5",
  roleAdmin: "#6DD58C",
  roleStaff: "#D0BCFF",
  roleClassTeacher: "#EFB8C8",
  roleStudent: "#76D1FF",

  // ─── Legacy / Convenience Aliases ───
  white: "#FFFFFF",
  textPrimary: "#E6E1E5",
  textSecondary: "#CAC4D0",
  textMuted: "#938F99",
  border: "#49454F",
  borderLight: "#2B2930",
  divider: "#2B2930",
  cardBackground: "#211F26",

  // ─── Brand-specific & Compatibility Tokens ───
  brandPurple: "#D0BCFF",
  brandPurpleLight: "#4F378B",
  brandPurpleContainer: "#4F378B",
  brandBlue: "#D0BCFF",
  brandBlueLight: "#4F378B",
  brandBlueContainer: "#4F378B",
  brandEmerald: "#6DD58C",
  brandEmeraldLight: "#00531B",
  brandGreen: "#6DD58C",
  brandGreenLight: "#00531B",
  brandOrange: "#EFB8C8",
  brandOrangeLight: "#633B48",
  brandOrangeContainer: "#633B48",
};

export default { lightColors, darkColors, SGV_BRAND };
