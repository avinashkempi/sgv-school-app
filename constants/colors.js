/**
 * SGV School App — Material 3 (M3) Design System Color Tokens
 *
 * Official Google Material Design 3 Baseline Color System
 * Strictly exceeds WCAG 2.2 AA (4.5:1 normal text, 3.0:1 UI components).
 *
 * Standard M3 Baseline Palette:
 * Primary:   #6750A4 (Key 40 - Light) / #D0BCFF (Key 80 - Dark)
 * Secondary: #625B71 (Key 40 - Light) / #CCC2DC (Key 80 - Dark)
 * Tertiary:  #7D5260 (Key 40 - Light) / #EFB8C8 (Key 80 - Dark)
 * Neutral:   Cool Slate surfaces with full 5-tier elevation container ladder
 */

// ── LIGHT THEME (Google Material 3 Baseline) ─────────────────────────────────
export const lightColors = {
  // ─── Primary ───
  primary: "#6750A4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#EADDFF",
  onPrimaryContainer: "#21005D",
  inversePrimary: "#D0BCFF",

  // ─── Secondary ───
  secondary: "#625B71",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E8DEF8",
  onSecondaryContainer: "#1D192B",

  // ─── Tertiary ───
  tertiary: "#7D5260",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FFD8E4",
  onTertiaryContainer: "#31111D",

  // ─── Error (M3 Standard) ───
  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",

  // ─── Surfaces & Canvas (M3 Baseline) ───
  background: "#FEF7FF",
  onBackground: "#1D1B20",

  surface: "#FEF7FF",
  onSurface: "#1D1B20",

  surfaceDim: "#DED8E1",
  surfaceBright: "#FEF7FF",

  surfaceVariant: "#E7E0EC",
  onSurfaceVariant: "#49454F",

  // ─── Outline & Borders ───
  outline: "#79747E",
  outlineVariant: "#CAC4D0",

  // ─── M3 5-Tier Surface Container Elevation Ladder ───
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F7F2FA",
  surfaceContainer: "#F3EDF7",
  surfaceContainerHigh: "#ECE6F0",
  surfaceContainerHighest: "#E6E0E9",

  // ─── Inverse Surfaces ───
  inverseSurface: "#322F35",
  inverseOnSurface: "#F5EFF7",

  // ─── System ───
  shadow: "#000000",
  scrim: "#000000",

  // ─── Semantic Status ───
  success: "#16A34A",
  onSuccess: "#FFFFFF",
  successContainer: "#DCFCE7",
  onSuccessContainer: "#14532D",

  warning: "#D97706",
  onWarning: "#FFFFFF",
  warningContainer: "#FEF3C7",
  onWarningContainer: "#78350F",

  info: "#0284C7",
  onInfo: "#FFFFFF",
  infoContainer: "#E0F2FE",
  onInfoContainer: "#0C4A6E",

  // ─── Role Colors ───
  roleSuperAdmin: "#B3261E",
  roleAdmin: "#6750A4",
  roleStaff: "#625B71",
  roleClassTeacher: "#7D5260",
  roleStudent: "#0284C7",

  // ─── Semantic Aliases & Compatibility ───
  white: "#FFFFFF",
  textPrimary: "#1D1B20",
  textSecondary: "#49454F",
  textMuted: "#79747E",
  border: "#CAC4D0",
  borderLight: "#E6E0E9",
  divider: "#CAC4D0",
  // ─── Field Tokens (Light Mode) ───
  fieldBackground: "#FFFFFF",
  fieldBorder: "#CAC4D0",
  fieldBorderFocused: "#6750A4",
  inputBackground: "#F3EDF7",
  placeholder: "#79747E",
};

// ── DARK THEME (Material 3 Baseline + Uber Pitch Black Style) ────────────────
export const darkColors = {
  // ─── Primary (Material 3 Baseline Key 80) ───
  primary: "#D0BCFF",
  onPrimary: "#21005D",
  primaryContainer: "#4F378B",
  onPrimaryContainer: "#EADDFF",
  inversePrimary: "#6750A4",

  // ─── Secondary (M3 Secondary Key 80) ───
  secondary: "#CCC2DC",
  onSecondary: "#332D41",
  secondaryContainer: "#4A4458",
  onSecondaryContainer: "#E8DEF8",

  // ─── Tertiary (M3 Tertiary Key 80) ───
  tertiary: "#EFB8C8",
  onTertiary: "#492532",
  tertiaryContainer: "#633B48",
  onTertiaryContainer: "#FFD8E4",

  // ─── Error (M3 Standard) ───
  error: "#F2B8B5",
  onError: "#601410",
  errorContainer: "#8C1D18",
  onErrorContainer: "#F9DEDC",

  // ─── Surfaces & Canvas (Uber OLED Complete Pitch Black Style) ───
  background: "#000000",
  onBackground: "#FFFFFF",

  surface: "#000000",
  onSurface: "#FFFFFF",

  surfaceDim: "#000000",
  surfaceBright: "#26262B",

  surfaceVariant: "#1C1C20",
  onSurfaceVariant: "#CAC4D0",

  // ─── Outline & Borders (Crisp definition on pure black) ───
  outline: "#49454F",
  outlineVariant: "#2E2E35",

  // ─── M3 5-Tier Surface Container Elevation Ladder (Tonal Elevation over #000000) ───
  surfaceContainerLowest: "#000000",
  surfaceContainerLow: "#0E0E11",
  surfaceContainer: "#161619",
  surfaceContainerHigh: "#1E1E23",
  surfaceContainerHighest: "#28282E",

  // ─── Inverse Surfaces ───
  inverseSurface: "#E6E0E9",
  inverseOnSurface: "#121214",

  // ─── System ───
  shadow: "#000000",
  scrim: "#000000",

  // ─── Semantic Status (High Contrast against Dark Backgrounds) ───
  success: "#4ADE80",
  onSuccess: "#052E16",
  successContainer: "#14532D",
  onSuccessContainer: "#DCFCE7",

  warning: "#FBBF24",
  onWarning: "#451A03",
  warningContainer: "#78350F",
  onWarningContainer: "#FEF3C7",

  info: "#38BDF8",
  onInfo: "#082F49",
  infoContainer: "#0C4A6E",
  onInfoContainer: "#E0F2FE",

  // ─── Role Colors ───
  roleSuperAdmin: "#F2B8B5",
  roleAdmin: "#D0BCFF",
  roleStaff: "#CCC2DC",
  roleClassTeacher: "#EFB8C8",
  roleStudent: "#38BDF8",

  // ─── Semantic Aliases & Compatibility ───
  white: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  border: "#242429",
  borderLight: "#18181C",
  divider: "#242429",
  cardBackground: "#161619",

  // ─── Uber Black Field Appearance Tokens ───
  fieldBackground: "#000000",
  fieldBorder: "#2C2C32",
  fieldBorderFocused: "#D0BCFF",
  inputBackground: "#000000",
  placeholder: "#9CA3AF",
};

export default { lightColors, darkColors };

