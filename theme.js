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
} from "./constants/typography";

export {
  FONT_FAMILIES,
  FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  TYPOGRAPHY,
};

// Material 3 Expressive Color Palette (Vibrant Blue/Indigo Base)
// Generated or approximated closest M3 values
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

  background: "#FEF7FF", // Very subtle tint
  onBackground: "#1D1B20",

  surface: "#FEF7FF",
  onSurface: "#1D1B20",

  surfaceVariant: "#E7E0EC",
  onSurfaceVariant: "#49454F",

  outline: "#79747E",
  outlineVariant: "#CAC4D0",

  // Surface Tones (Simulated elevation)
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F7F2FA",
  surfaceContainer: "#F3EDF7",
  surfaceContainerHigh: "#ECE6F0",
  surfaceContainerHighest: "#E6E0E9",

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
  border: "#CAC4D0",
  cardBackground: "#F3EDF7",
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

  background: "#141218",
  onBackground: "#E6E1E5",

  surface: "#141218",
  onSurface: "#E6E1E5",

  surfaceVariant: "#49454F",
  onSurfaceVariant: "#CAC4D0",

  outline: "#938F99",
  outlineVariant: "#49454F",

  surfaceContainerLowest: "#0F0D13",
  surfaceContainerLow: "#1D1B20",
  surfaceContainer: "#211F26",
  surfaceContainerHigh: "#2B2930",
  surfaceContainerHighest: "#36343B",

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
  cardBackground: "#1D1B20",
};

function createGlobalStyles(COLORS, mode) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: 16,
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
      marginVertical: 16,
    },
    // Elevations (Level 0 - 5 for Material 3 depth without expensive shadow calculations)
    elevation0: { elevation: 0, shadowOpacity: 0 },
    elevation1: {
      elevation: 1,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    elevation2: {
      elevation: 2,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
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
      backgroundColor: mode === 'dark' ? 'rgba(33, 31, 38, 0.88)' : 'rgba(254, 247, 255, 0.88)',
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
    },
    glass: {
      backgroundColor: mode === 'dark' ? 'rgba(33, 33, 33, 0.8)' : 'rgba(243, 246, 252, 0.8)',
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
      borderRadius: 16,
      backgroundColor: COLORS.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
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
