import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { StyleSheet, Appearance, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FONTS = {
  bold: "DMSans-Bold",
  semiBold: "DMSans-SemiBold",
  medium: "DMSans-Medium",
  regular: "DMSans-Regular",
};

// Google Material Design 3 Color Palette
const lightColors = {
  primary: "#0B57D0", // Google Blue
  onPrimary: "#FFFFFF",
  primaryContainer: "#D3E3FD",
  onPrimaryContainer: "#041E49",

  secondary: "#00639B",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#C2E7FF",
  onSecondaryContainer: "#001D35",

  tertiary: "#146C2E", // Google Greenish
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#C4EED0",
  onTertiaryContainer: "#072711",

  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",

  background: "#FFFFFF", // Pure white for light mode
  onBackground: "#1F1F1F",

  surface: "#F9F9F9", // Slightly off-white
  onSurface: "#1F1F1F",

  surfaceVariant: "#E1E3E1",
  onSurfaceVariant: "#444746",

  outline: "#747775",
  outlineVariant: "#C4C7C5",

  // Surface Containers for Cards/Modals (Tonal Elevation)
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F7F9FC",
  surfaceContainer: "#F3F6FC",
  surfaceContainerHigh: "#ECEFF1",
  surfaceContainerHighest: "#E1E3E1",

  // Role Colors (kept for logic but updated to match MD3 tones)
  roleSuperAdmin: "#B3261E",
  roleAdmin: "#146C2E",
  roleStaff: "#00639B",
  roleClassTeacher: "#6E56CF",
  roleStudent: "#E27200",

  success: "#146C2E",

  // Legacy support
  white: "#FFFFFF",
  textPrimary: "#1F1F1F",
  textSecondary: "#444746",
  border: "#E1E3E1",
  cardBackground: "#F3F6FC", // surfaceContainer
  shadow: "#000000",
};

const darkColors = {
  primary: "#A8C7FA", // Lighter blue for dark mode
  onPrimary: "#041E49",
  primaryContainer: "#0842A0",
  onPrimaryContainer: "#D3E3FD",

  secondary: "#7FCFFF",
  onSecondary: "#003355",
  secondaryContainer: "#004A77",
  onSecondaryContainer: "#C2E7FF",

  tertiary: "#6DD58C",
  onTertiary: "#072711",
  tertiaryContainer: "#0F5223",
  onTertiaryContainer: "#C4EED0",

  error: "#F2B8B5",
  onError: "#601410",
  errorContainer: "#8C1D18",
  onErrorContainer: "#F9DEDC",

  background: "#121212", // True dark
  onBackground: "#E3E3E3",

  surface: "#121212",
  onSurface: "#E3E3E3",

  surfaceVariant: "#444746",
  onSurfaceVariant: "#C4C7C5",

  outline: "#8E918F",
  outlineVariant: "#444746",

  // Surface Containers (Tonal Elevation)
  surfaceContainerLowest: "#0F0F0F",
  surfaceContainerLow: "#1D1B20",
  surfaceContainer: "#212121",
  surfaceContainerHigh: "#2B2930",
  surfaceContainerHighest: "#36343B",

  roleSuperAdmin: "#F2B8B5",
  roleAdmin: "#6DD58C",
  roleStaff: "#7FCFFF",
  roleClassTeacher: "#D0BCFF",
  roleStudent: "#FFB74D",

  success: "#6DD58C",

  // Legacy support
  white: "#FFFFFF",
  textPrimary: "#E3E3E3",
  textSecondary: "#C4C7C5",
  border: "#444746",
  cardBackground: "#1D1B20", // surfaceContainerLow
  shadow: "#000000",
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
    title: {
      fontSize: 32,
      fontFamily: FONTS.regular, // Google uses simpler weights often
      color: COLORS.onBackground,
      marginBottom: 24,
      textAlign: "left",
      letterSpacing: 0,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: FONTS.regular,
      color: COLORS.onBackground,
      marginBottom: 4,
    },
    subHeader: {
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.onSurfaceVariant,
      marginBottom: 24,
      lineHeight: 24,
    },
    label: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: COLORS.onSurfaceVariant,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    text: {
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.onSurfaceVariant,
      lineHeight: 24,
      marginBottom: 12,
    },
    link: {
      fontSize: 16,
      fontFamily: FONTS.medium,
      color: COLORS.primary,
    },
    iconLabel: {
      marginTop: 4,
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: COLORS.onSurfaceVariant,
    },
    buttonText: {
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: COLORS.onPrimary,
      textAlign: "center",
      letterSpacing: 0.1,
    },
    errorText: {
      fontSize: 14,
      fontFamily: FONTS.regular,
      color: COLORS.error,
      marginTop: 4,
      marginLeft: 4,
    },
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
    // MD3 Card Style - Filled
    card: {
      backgroundColor: COLORS.surfaceContainer, // Tonal surface
      borderRadius: 16, // Standard MD3 corner radius
      padding: 16,
      marginBottom: 16,
      // No shadow by default in MD3 filled cards, just tonal difference
      // But we can add very subtle shadow for depth if needed
      elevation: 0,
      borderWidth: 0,
    },
    // MD3 Card Style - Outlined
    cardOutlined: {
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
      elevation: 0,
    },
    // MD3 Card Style - Elevated
    cardElevated: {
      backgroundColor: COLORS.surfaceContainerLow,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    // Legacy support
    cardMinimal: {
      backgroundColor: COLORS.surfaceContainer,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 0,
    },
    glass: {
      backgroundColor: mode === 'dark' ? 'rgba(33, 33, 33, 0.8)' : 'rgba(243, 246, 252, 0.8)',
      borderColor: 'transparent',
      borderWidth: 0,
    },
    // MD3 Input Field (Outlined)
    input: {
      borderWidth: 1,
      borderColor: COLORS.outline,
      borderRadius: 4, // MD3 text fields have smaller radius usually, but 8-12 is fine for modern feel
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.onSurface,
      backgroundColor: 'transparent',
    },
    // MD3 Input Field (Filled)
    inputFilled: {
      backgroundColor: COLORS.surfaceContainerHighest,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.onSurfaceVariant,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.onSurface,
    },
    inputMinimal: {
      backgroundColor: COLORS.surfaceContainerHigh,
      borderRadius: 24, // Pill shape for search bars etc
      paddingHorizontal: 20,
      paddingVertical: 12,
      fontSize: 16,
      color: COLORS.onSurface,
      borderWidth: 0,
    },
    inputFocused: {
      borderColor: COLORS.primary,
      borderWidth: 2,
    },
    inputError: {
      borderColor: COLORS.error,
    },
    // MD3 Filled Button
    button: {
      backgroundColor: COLORS.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 100, // Pill shape
      alignItems: "center",
      justifyContent: "center",
      elevation: 0, // Flat by default
    },
    // MD3 Tonal Button
    buttonTonal: {
      backgroundColor: COLORS.secondaryContainer,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonTonalText: {
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: COLORS.onSecondaryContainer,
      textAlign: "center",
      letterSpacing: 0.1,
    },
    buttonSmall: {
      backgroundColor: COLORS.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 36,
    },
    buttonIcon: {
      padding: 12,
      borderRadius: 16, // Squircle or Circle
      alignItems: "center",
      justifyContent: "center",
      minWidth: 48,
      minHeight: 48,
      backgroundColor: COLORS.surfaceContainerHigh,
    },
    buttonLarge: {
      backgroundColor: COLORS.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 56,
      elevation: 2,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: COLORS.outline,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonSecondaryText: {
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: COLORS.primary,
      textAlign: "center",
      letterSpacing: 0.1,
    },
    fab: {
      position: "absolute",
      bottom: 88, // Adjusted for bottom nav
      right: 16,
      backgroundColor: COLORS.primaryContainer,
      width: 56,
      height: 56,
      borderRadius: 16, // MD3 FAB is slightly squarish
      justifyContent: "center",
      alignItems: "center",
      elevation: 3,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    backButton: {
      flexDirection: "row",
      alignItems: 'center',
      padding: 8,
      marginLeft: -8,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 12,
    },
    heading: {
      fontSize: 22,
      fontFamily: FONTS.regular,
      color: COLORS.onBackground,
      textAlign: "left",
      marginBottom: 16,
    },
    cardText: {
      fontSize: 14,
      fontFamily: FONTS.regular,
      color: COLORS.onSurfaceVariant,
      lineHeight: 20,
    },
    cardGroup: {
      marginBottom: 24,
    },
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    smallLeftMargin: {
      marginLeft: 8,
    },
    contentPaddingBottom: {
      paddingBottom: 100,
    },
    sectionTitle: {
      fontSize: 18,
      color: COLORS.onSurface,
      fontFamily: FONTS.medium,
      marginBottom: 16,
    },
    empty: {
      fontSize: 16,
      color: COLORS.onSurfaceVariant,
      marginTop: 32,
      textAlign: "center",
      fontFamily: FONTS.regular,
    },
  });
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(null); // null = not yet loaded
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved preference or system preference on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const stored = await AsyncStorage.getItem("@theme_mode");
        if (mounted) {
          if (stored === "light" || stored === "dark") {
            setMode(stored);
          } else if (stored === "system") {
            // Use system preference
            const sys = Appearance.getColorScheme();
            setMode(sys === "dark" ? "dark" : "light");
          } else {
            // No stored preference, use system and set to "system" mode
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
      // If user hasn't chosen yet (no stored pref) or has chosen "system", update with system changes
      AsyncStorage.getItem("@theme_mode").then((stored) => {
        if (!stored || stored === "system") {
          setMode(colorScheme === "dark" ? "dark" : "light");
        }
      });
    });

    return () => {
      mounted = false;
      try {
        sub && sub.remove && sub.remove();
      } catch (e) {
        // ignore remove errors during unmount, but log in dev
        if (typeof console !== "undefined")
          console.warn("Appearance listener remove failed", e);
      }
    };
  }, []);

  const colors = useMemo(
    () => (mode === "dark" ? darkColors : lightColors),
    [mode]
  );

  // Pass mode to createGlobalStyles to handle conditional styles
  const styles = useMemo(() => createGlobalStyles(colors, mode), [colors, mode]);

  // Gradient Constants - Updated for MD3 feel (subtler)
  const gradients = useMemo(() => ({
    primary: mode === 'dark'
      ? [colors.primary, '#7Cacf8']
      : [colors.primary, '#0842A0'],
    card: mode === 'dark'
      ? [colors.surfaceContainer, colors.surfaceContainerHigh]
      : [colors.surfaceContainer, colors.surfaceContainerLow],
    success: ['#146C2E', '#0F5223'],
    error: ['#B3261E', '#8C1D18'],
  }), [colors, mode]);

  const setAndPersist = (newMode) => {
    // Update state immediately for instant UI feedback
    setMode(newMode);

    // Persist to storage in the background
    if (newMode === "system") {
      AsyncStorage.removeItem("@theme_mode").catch(() => {
        // ignore persistence error
      });
    } else {
      AsyncStorage.setItem("@theme_mode", newMode).catch(() => {
        // ignore persistence error
      });
    }
  };

  const toggle = () => setAndPersist(mode === "dark" ? "light" : "dark");

  // While hydrating, render nothing to avoid flicker. Child components may expect useTheme to exist, so
  // keep provider but return null for children until hydrated.
  return (
    <ThemeContext.Provider
      value={{ mode: mode || "light", toggle, colors, styles, gradients }}
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
