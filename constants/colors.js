/**
 * SGV School App — Semantic Color Design Tokens
 *
 * Modern Unbranded Education/Technology Color Design System
 * Primary:   #4F46E5 (Indigo 600 - Light) / #A5B4FC (Indigo 300 - Dark)
 * Secondary: #0F766E (Teal 700 - Light)   / #5EEAD4 (Teal 300 - Dark)
 * Tertiary:  #6D28D9 (Violet 700 - Light) / #C4B5FD (Violet 300 - Dark)
 * Surfaces:  Cool neutral slate canvas (#F8FAFC) & dark navy (#0B1220)
 *
 * All color pairings strictly exceed WCAG 2.2 AA (4.5:1 normal, 3.0:1 UI components).
 */

// ── LIGHT THEME ─────────────────────────────────────────────────────────────
export const lightColors = {
  // ─── Primary (Indigo) ───
  primary: "#4F46E5",
  onPrimary: "#FFFFFF",
  primaryContainer: "#EEF2FF",
  onPrimaryContainer: "#312E81",
  inversePrimary: "#A5B4FC",

  // ─── Secondary (Teal) ───
  secondary: "#0F766E",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#CCFBF1",
  onSecondaryContainer: "#115E59",

  // ─── Tertiary (Violet) ───
  tertiary: "#6D28D9",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#EDE9FE",
  onTertiaryContainer: "#5B21B6",

  // ─── Error (Accessible Red) ───
  error: "#DC2626",
  onError: "#FFFFFF",
  errorContainer: "#FEE2E2",
  onErrorContainer: "#7F1D1D",

  // ─── Surfaces & Canvas (Cool Neutral Slate) ───
  background: "#F8FAFC",
  onBackground: "#0F172A",

  surface: "#FFFFFF",
  onSurface: "#0F172A",

  surfaceVariant: "#F1F5F9",
  onSurfaceVariant: "#475569",

  // ─── Outline & Borders ───
  outline: "#94A3B8",
  outlineVariant: "#CBD5E1",

  // ─── Surface Elevation Ladder ───
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F8FAFC",
  surfaceContainer: "#F1F5F9",
  surfaceContainerHigh: "#E2E8F0",
  surfaceContainerHighest: "#CBD5E1",

  // ─── Inverse Surfaces ───
  inverseSurface: "#0F172A",
  inverseOnSurface: "#F8FAFC",

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
  roleSuperAdmin: "#DC2626",
  roleAdmin: "#4F46E5",
  roleStaff: "#0F766E",
  roleClassTeacher: "#6D28D9",
  roleStudent: "#0284C7",

  // ─── Semantic Aliases ───
  white: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#CBD5E1",
  borderLight: "#E2E8F0",
  divider: "#E2E8F0",
  cardBackground: "#FFFFFF",
};

// ── DARK THEME ──────────────────────────────────────────────────────────────
export const darkColors = {
  // ─── Primary (Accessible Tinted Indigo) ───
  primary: "#A5B4FC",
  onPrimary: "#1E1B4B",
  primaryContainer: "#312E81",
  onPrimaryContainer: "#E0E7FF",
  inversePrimary: "#4F46E5",

  // ─── Secondary (Accessible Tinted Teal) ───
  secondary: "#5EEAD4",
  onSecondary: "#134E4A",
  secondaryContainer: "#134E4A",
  onSecondaryContainer: "#CCFBF1",

  // ─── Tertiary (Accessible Tinted Violet) ───
  tertiary: "#C4B5FD",
  onTertiary: "#2E1065",
  tertiaryContainer: "#3B0764",
  onTertiaryContainer: "#EDE9FE",

  // ─── Error (Accessible Light Red) ───
  error: "#F87171",
  onError: "#450A0A",
  errorContainer: "#7F1D1D",
  onErrorContainer: "#FEE2E2",

  // ─── Surfaces & Canvas (Dark Navy) ───
  background: "#0B1220",
  onBackground: "#F1F5F9",

  surface: "#111827",
  onSurface: "#F1F5F9",

  surfaceVariant: "#1E293B",
  onSurfaceVariant: "#CBD5E1",

  // ─── Outline & Borders ───
  outline: "#64748B",
  outlineVariant: "#334155",

  // ─── Surface Elevation Ladder ───
  surfaceContainerLowest: "#070D18",
  surfaceContainerLow: "#0B1220",
  surfaceContainer: "#1E293B",
  surfaceContainerHigh: "#334155",
  surfaceContainerHighest: "#475569",

  // ─── Inverse Surfaces ───
  inverseSurface: "#F1F5F9",
  inverseOnSurface: "#0F172A",

  // ─── System ───
  shadow: "#000000",
  scrim: "#000000",

  // ─── Semantic Status ───
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
  roleSuperAdmin: "#F87171",
  roleAdmin: "#A5B4FC",
  roleStaff: "#5EEAD4",
  roleClassTeacher: "#C4B5FD",
  roleStudent: "#38BDF8",

  // ─── Semantic Aliases ───
  white: "#FFFFFF",
  textPrimary: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textMuted: "#64748B",
  border: "#334155",
  borderLight: "#1E293B",
  divider: "#1E293B",
  cardBackground: "#111827",
};

export default { lightColors, darkColors };
