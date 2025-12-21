import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { StyleSheet, Appearance } from "react-native";
import storage from "./utils/storage";

const FONTS = {
  displayLarge: "DMSans-Bold",
  displayMedium: "DMSans-Bold",
  displaySmall: "DMSans-Bold",

  headlineLarge: "DMSans-Bold",
  headlineMedium: "DMSans-Bold",
  headlineSmall: "DMSans-Bold",

  titleLarge: "DMSans-Bold",
  titleMedium: "DMSans-Medium",
  titleSmall: "DMSans-Medium",

  labelLarge: "DMSans-Medium",
  labelMedium: "DMSans-Medium",
  labelSmall: "DMSans-Medium",

  bodyLarge: "DMSans-Regular",
  bodyMedium: "DMSans-Regular",
  bodySmall: "DMSans-Regular",

  // Legacy aliases
  bold: "DMSans-Bold",
  semiBold: "DMSans-SemiBold",
  medium: "DMSans-Medium",
  regular: "DMSans-Regular",
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
    },
    // Typography System
    displayLarge: {
      fontFamily: FONTS.displayLarge,
      fontSize: 57,
      lineHeight: 64,
      letterSpacing: -0.25,
      color: COLORS.onBackground,
    },
    displayMedium: {
      fontFamily: FONTS.displayMedium,
      fontSize: 45,
      lineHeight: 52,
      letterSpacing: 0,
      color: COLORS.onBackground,
    },
    displaySmall: {
      fontFamily: FONTS.displaySmall,
      fontSize: 36,
      lineHeight: 44,
      letterSpacing: 0,
      color: COLORS.onBackground,
    },
    headlineLarge: {
      fontFamily: FONTS.headlineLarge,
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: 0,
      color: COLORS.onBackground,
    },
    headlineMedium: {
      fontFamily: FONTS.headlineMedium,
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: 0,
      color: COLORS.onBackground,
    },
    headlineSmall: {
      fontFamily: FONTS.headlineSmall,
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: 0,
      color: COLORS.onBackground,
    },
    titleLarge: {
      fontFamily: FONTS.titleLarge,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: 0,
      color: COLORS.onBackground,
    },
    titleMedium: {
      fontFamily: FONTS.titleMedium,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.15,
      color: COLORS.onSurface,
    },
    titleSmall: {
      fontFamily: FONTS.titleSmall,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
      color: COLORS.onSurface,
    },
    bodyLarge: {
      fontFamily: FONTS.bodyLarge,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.5,
      color: COLORS.onSurfaceVariant,
    },
    bodyMedium: {
      fontFamily: FONTS.bodyMedium,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.25,
      color: COLORS.onSurfaceVariant,
    },
    bodySmall: {
      fontFamily: FONTS.bodySmall,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      color: COLORS.onSurfaceVariant,
    },
    labelLarge: {
      fontFamily: FONTS.labelLarge,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
      color: COLORS.onSurface,
    },
    labelMedium: {
      fontFamily: FONTS.labelMedium,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.5,
      color: COLORS.onSurface,
    },
    labelSmall: {
      fontFamily: FONTS.labelSmall,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 0.5,
      color: COLORS.onSurface,
    },

    // Legacy style support used in current files
    title: {
      fontFamily: FONTS.headlineMedium,
      fontSize: 28,
      color: COLORS.onBackground,
      marginBottom: 24,
      textAlign: "left",
    },
    headerTitle: {
      fontFamily: FONTS.titleLarge,
      fontSize: 22,
      color: COLORS.onBackground,
      marginBottom: 4,
    },
    subHeader: {
      fontFamily: FONTS.bodyLarge,
      fontSize: 16,
      color: COLORS.onSurfaceVariant,
      marginBottom: 24,
    },
    label: {
      fontFamily: FONTS.labelMedium,
      fontSize: 12,
      color: COLORS.onSurfaceVariant,
      marginBottom: 8,
    },
    text: {
      fontFamily: FONTS.bodyLarge,
      fontSize: 16,
      color: COLORS.onSurfaceVariant,
      lineHeight: 24,
      marginBottom: 12,
    },
    link: {
      fontFamily: FONTS.labelLarge, // Links should look like interactive labels
      fontSize: 16,
      color: COLORS.primary,
    },
    buttonText: {
      fontFamily: FONTS.labelLarge,
      fontSize: 14,
      color: COLORS.onPrimary,
      textAlign: "center",
    },
    errorText: {
      fontFamily: FONTS.bodySmall,
      color: COLORS.error,
      marginTop: 4,
      marginLeft: 4,
    },

    // Layout Utils
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    fullWidth: {
      width: "100%",
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.outlineVariant,
      marginVertical: 16,
    },
    glass: {
      backgroundColor: mode === 'dark' ? 'rgba(33, 33, 33, 0.8)' : 'rgba(243, 246, 252, 0.8)',
    },

    // Components (Legacy definitions for backwards compatibility until refactor is complete)
    card: {
      backgroundColor: COLORS.surfaceContainer,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.outline,
      borderRadius: 4,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: FONTS.bodyLarge,
      color: COLORS.onSurface,
      backgroundColor: 'transparent',
    },
    button: {
      backgroundColor: COLORS.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    contentPaddingBottom: {
      paddingBottom: 100,
    },
    smallLeftMargin: {
      marginLeft: 8,
    },
    sectionTitle: {
      fontSize: 18,
      color: COLORS.onSurface,
      fontFamily: FONTS.medium,
      marginBottom: 16,
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
      try { sub && sub.remove && sub.remove(); } catch (e) { }
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
    <ThemeContext.Provider value={{ mode: mode || "light", toggle, colors, styles, gradients }}>
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
