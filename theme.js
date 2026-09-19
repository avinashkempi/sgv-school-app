import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { StyleSheet, Appearance } from "react-native";
import storage from "./utils/storage";

import {
  FONT_FAMILIES,
  FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  TYPOGRAPHY,
  CANONICAL_TYPOGRAPHY,
  WEIGHT,
} from "./constants/typography";

import {
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "./constants/spacing";

export {
  FONT_FAMILIES,
  FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  TYPOGRAPHY,
  CANONICAL_TYPOGRAPHY,
  WEIGHT,
  SPACING,
  RADIUS,
  ICON_SIZES,
};

// Material 3 Minimalist Color Palette — Warm surfaces, accent-only color
const lightColors = {
  primary: "#4F378B", // Deep distinct purple/indigo
  onPrimary: "#FFFFFF",
  primaryContainer: "#EADDFF",
  onPrimaryContainer: "#21005D",

  secondary: "#625B71",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E8DEF8",
  onSecondaryContainer: "#1D192B",

  tertiary: "#7D5260", // Expressive pinkish tone
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FFD8E4",
  onTertiaryContainer: "#31111D",

  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",

  background: "#FEFCF9", // Warm ivory — morning sunlight, not fluorescent
  onBackground: "#1D1B20",

  surface: "#FFFFFF", // Pure white cards still pop against warm background
  onSurface: "#1D1B20",

  surfaceVariant: "#EBE8E4",
  onSurfaceVariant: "#49454F",

  outline: "#79747E",
  outlineVariant: "#E5E0D8", // Warm borders that disappear into background

  // Surface Tones (Warm elevation ladder)
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#FDFBF8",
  surfaceContainer: "#F7F5F2",
  surfaceContainerHigh: "#F0EDE8",
  surfaceContainerHighest: "#E8E4DE",

  shadow: "#000000",
  scrim: "#000000",

  // Role Colors
  roleSuperAdmin: "#B3261E",
  roleAdmin: "#146C2E",       // Green
  roleStaff: "#4F378B",       // Primary
  roleClassTeacher: "#7D5260",// Tertiary
  roleStudent: "#E27200",     // Orange

  success: "#146C2E",

  // Legacy support
  white: "#FFFFFF",
  textPrimary: "#1D1B20",
  textSecondary: "#49454F",
  border: "#E5E0D8",
  cardBackground: "#F7F5F2",
};

const darkColors = {
  primary: "#D0BCFF",
  onPrimary: "#381E72",
  primaryContainer: "#4F378B",
  onPrimaryContainer: "#EADDFF",

  secondary: "#CCC2DC",
  onSecondary: "#332D41",
  secondaryContainer: "#4A4458",
  onSecondaryContainer: "#E8DEF8",

  tertiary: "#EFB8C8",
  onTertiary: "#492532",
  tertiaryContainer: "#633B48",
  onTertiaryContainer: "#FFD8E4",

  error: "#F2B8B5",
  onError: "#601410",
  errorContainer: "#8C1D18",
  onErrorContainer: "#F9DEDC",

  background: "#111113", // Slightly bluer-black, less purple — night sky feel
  onBackground: "#E6E1E5",

  surface: "#111113",
  onSurface: "#E6E1E5",

  surfaceVariant: "#49454F",
  onSurfaceVariant: "#CAC4D0",

  outline: "#938F99",
  outlineVariant: "#49454F",

  surfaceContainerLowest: "#0D0D10",
  surfaceContainerLow: "#1B1B1F",
  surfaceContainer: "#1A1A1E", // Less purple cast
  surfaceContainerHigh: "#232328",
  surfaceContainerHighest: "#2E2E34",

  shadow: "#000000",
  scrim: "#000000",

  // Role Colors
  roleSuperAdmin: "#F2B8B5",
  roleAdmin: "#6DD58C",
  roleStaff: "#D0BCFF",
  roleClassTeacher: "#EFB8C8",
  roleStudent: "#FFB74D",

  success: "#6DD58C",

  // Legacy support
  white: "#FFFFFF",
  textPrimary: "#E6E1E5",
  textSecondary: "#CAC4D0",
  border: "#49454F",
  cardBackground: "#1B1B1F",
};

function createGlobalStyles(COLORS, mode) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.lg, // 16 — standard consistent margin across entire app
      paddingTop: 12,
      paddingBottom: 32,
    },
    // Typography System (with flexShrink: 1 to automatically prevent flex container text overflow)
    displayHero: {
      fontFamily: FONTS.bold,
      fontSize: FONT_SIZES.jumbo,
      lineHeight: LINE_HEIGHTS.jumbo,
      letterSpacing: LETTER_SPACINGS.jumbo,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    displayLarge: {
      fontFamily: FONTS.displayLarge,
      fontSize: FONT_SIZES.display,
      lineHeight: LINE_HEIGHTS.display,
      letterSpacing: LETTER_SPACINGS.display,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    displayMedium: {
      fontFamily: FONTS.displayMedium,
      fontSize: FONT_SIZES.display,
      lineHeight: LINE_HEIGHTS.display,
      letterSpacing: LETTER_SPACINGS.display,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    displaySmall: {
      fontFamily: FONTS.displaySmall,
      fontSize: FONT_SIZES.xl,
      lineHeight: LINE_HEIGHTS.xl,
      letterSpacing: LETTER_SPACINGS.xl,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    headlineLarge: {
      fontFamily: FONTS.headlineLarge,
      fontSize: FONT_SIZES.xl,
      lineHeight: LINE_HEIGHTS.xl,
      letterSpacing: LETTER_SPACINGS.xl,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    headlineMedium: {
      fontFamily: FONTS.headlineMedium,
      fontSize: FONT_SIZES.lg,
      lineHeight: LINE_HEIGHTS.lg,
      letterSpacing: LETTER_SPACINGS.lg,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    headlineSmall: {
      fontFamily: FONTS.headlineSmall,
      fontSize: FONT_SIZES.lg,
      lineHeight: LINE_HEIGHTS.lg,
      letterSpacing: LETTER_SPACINGS.lg,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    titleLarge: {
      fontFamily: FONTS.titleLarge,
      fontSize: FONT_SIZES.lg,
      lineHeight: LINE_HEIGHTS.lg,
      letterSpacing: LETTER_SPACINGS.lg,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    screenTitle: {
      fontFamily: FONTS.bold,
      fontSize: FONT_SIZES.xl,
      lineHeight: LINE_HEIGHTS.xl,
      letterSpacing: LETTER_SPACINGS.xl,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    sectionTitle: {
      fontFamily: FONTS.bold,
      fontSize: FONT_SIZES.md,
      lineHeight: LINE_HEIGHTS.md,
      letterSpacing: LETTER_SPACINGS.md,
      color: COLORS.onBackground,
      flexShrink: 1,
    },
    cardTitle: {
      fontFamily: FONTS.bold,
      fontSize: FONT_SIZES.md,
      lineHeight: LINE_HEIGHTS.md,
      letterSpacing: LETTER_SPACINGS.md,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    titleMedium: {
      fontFamily: FONTS.titleMedium,
      fontSize: FONT_SIZES.md,
      lineHeight: LINE_HEIGHTS.md,
      letterSpacing: LETTER_SPACINGS.md,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    titleSmall: {
      fontFamily: FONTS.titleSmall,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      letterSpacing: LETTER_SPACINGS.sm,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    cardHeader: {
      fontFamily: FONTS.bold,
      fontSize: FONT_SIZES.md,
      lineHeight: LINE_HEIGHTS.md,
      letterSpacing: LETTER_SPACINGS.md,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    bodyLarge: {
      fontFamily: FONTS.bodyLarge,
      fontSize: FONT_SIZES.md,
      lineHeight: LINE_HEIGHTS.md,
      letterSpacing: LETTER_SPACINGS.md,
      color: COLORS.onSurfaceVariant,
      flexShrink: 1,
    },
    bodyMedium: {
      fontFamily: FONTS.bodyMedium,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      letterSpacing: LETTER_SPACINGS.sm,
      color: COLORS.onSurfaceVariant,
      flexShrink: 1,
    },
    bodyDense: {
      fontFamily: FONTS.bodyMedium,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      letterSpacing: LETTER_SPACINGS.sm,
      color: COLORS.onSurfaceVariant,
      flexShrink: 1,
    },
    bodySmall: {
      fontFamily: FONTS.bodySmall,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      letterSpacing: LETTER_SPACINGS.sm,
      color: COLORS.onSurfaceVariant,
      flexShrink: 1,
    },
    labelLarge: {
      fontFamily: FONTS.labelLarge,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      letterSpacing: LETTER_SPACINGS.sm,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    labelMedium: {
      fontFamily: FONTS.labelMedium,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      letterSpacing: LETTER_SPACINGS.sm,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    labelSmall: {
      fontFamily: FONTS.labelSmall,
      fontSize: FONT_SIZES.xs,
      lineHeight: LINE_HEIGHTS.xs,
      letterSpacing: LETTER_SPACINGS.xs,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    caption: {
      fontFamily: FONTS.medium,
      fontSize: FONT_SIZES.xs,
      lineHeight: LINE_HEIGHTS.xs,
      letterSpacing: LETTER_SPACINGS.xs,
      color: COLORS.onSurfaceVariant,
      flexShrink: 1,
    },
    badge: {
      fontFamily: FONTS.bold,
      fontSize: FONT_SIZES.micro,
      lineHeight: LINE_HEIGHTS.micro,
      letterSpacing: LETTER_SPACINGS.micro,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    badgeText: {
      fontFamily: FONTS.bold,
      fontSize: FONT_SIZES.micro,
      lineHeight: LINE_HEIGHTS.micro,
      letterSpacing: LETTER_SPACINGS.micro,
      color: COLORS.onSurface,
      flexShrink: 1,
    },
    microText: {
      fontFamily: FONTS.regular,
      fontSize: FONT_SIZES.micro,
      lineHeight: LINE_HEIGHTS.micro,
      letterSpacing: LETTER_SPACINGS.micro,
      color: COLORS.onSurfaceVariant,
      flexShrink: 1,
    },
    monoText: {
      fontFamily: FONT_FAMILIES.mono,
      fontSize: FONT_SIZES.sm,
      lineHeight: LINE_HEIGHTS.sm,
      color: COLORS.onSurface,
      flexShrink: 1,
    },

    // Legacy style support used in current files

    // Layout Utils
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    shrink: {
      flexShrink: 1,
      minWidth: 0,
    },
    noShrink: {
      flexShrink: 0,
    },
    flex1: {
      flex: 1,
      minWidth: 0,
    },
    fullWidth: {
      width: "100%",
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.outlineVariant,
      marginVertical: 20,
    },
    // Elevations (Level 0 - 5 for Material 3 depth without expensive shadow calculations)
    elevation0: { elevation: 0, shadowOpacity: 0 },
    elevation1: {
      elevation: 1,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    elevation2: {
      elevation: 2,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 6,
    },
    elevation3: {
      elevation: 3,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 6,
    },
    elevation4: {
      elevation: 4,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    elevation5: {
      elevation: 6,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.24,
      shadowRadius: 12,
    },

    // Fast Frosted Surface (1px outline + high opacity background to prevent GPU overdraw)
    glassSurface: {
      backgroundColor: mode === 'dark' ? 'rgba(26, 26, 30, 0.90)' : 'rgba(254, 252, 249, 0.92)',
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
    },
    glass: {
      backgroundColor: mode === 'dark' ? 'rgba(26, 26, 30, 0.82)' : 'rgba(247, 245, 242, 0.82)',
    },

    // Layout Helpers
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    contentPaddingBottom: {
      paddingBottom: 24,
    },

    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: COLORS.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
  });
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const stored = await storage.getItem("@theme_mode");
        if (mounted) {
          if (stored === "light" || stored === "dark") {
            setMode(stored);
          } else {
            // System default
            const sys = Appearance.getColorScheme();
            setMode(sys === "dark" ? "dark" : "light");
          }
        }
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        const sys = Appearance.getColorScheme();
        if (mounted) setMode(sys === "dark" ? "dark" : "light");
      } finally {
        if (mounted) setIsHydrated(true);
      }
    }
    load();

    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      storage.getItem("@theme_mode").then((stored) => {
        if (!stored || stored === "system") {
          setMode(colorScheme === "dark" ? "dark" : "light");
        }
      });
    });

    return () => {
      mounted = false;
      try { sub && sub.remove && sub.remove(); } catch (e) {
        console.warn('Theme listener cleanup failed:', e);
      }
    };
  }, []);

  const colors = useMemo(() => (mode === "dark" ? darkColors : lightColors), [mode]);
  const styles = useMemo(() => createGlobalStyles(colors, mode), [colors, mode]);

  const gradients = useMemo(() => ({
    primary: mode === 'dark' ? [colors.primary, '#9A82DB'] : [colors.primary, '#6750A4'],
    card: mode === 'dark' ? [colors.surfaceContainer, colors.surfaceContainerHigh] : [colors.surfaceContainer, colors.surfaceContainerLow],
    warm: mode === 'dark' ? ['#4F378B', '#3B2D6B'] : ['#F5E6D3', '#FEFCF9'],
    subtleGlow: mode === 'dark' ? ['rgba(208, 188, 255, 0.06)', 'transparent'] : ['rgba(79, 55, 139, 0.03)', 'transparent'],
  }), [colors, mode]);

  const toggle = () => {
    const newMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
    storage.setItem("@theme_mode", newMode).catch(() => { });
  };

  return (
    <ThemeContext.Provider
      value={{
        mode: mode || "light",
        toggle,
        toggleTheme: toggle,
        toggleeTheme: toggle,
        colors,
        styles,
        gradients,
        spacing: SPACING,
        radius: RADIUS,
        iconSizes: ICON_SIZES,
      }}
    >
      {isHydrated ? children : null}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export default ThemeContext;
