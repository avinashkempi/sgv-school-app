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

const lightColors = {
  primary: "#2F6CD4",
  secondary: "#FF5E1C",
  background: "#f7f8fc",
  cardBackground: "#ffffff",
  textPrimary: "#1A1D1E",
  textSecondary: "#6C7278",
  border: "#EEEFFF",
  shadow: "#1A1D1E",
  error: "#FF4C4C",
  white: "#ffffff",
  roleSuperAdmin: "#FF6B6B",
  roleAdmin: "#4ECDC4",
  roleStaff: "#45B7D1",
  roleClassTeacher: "#96CEB4",
  roleStudent: "#FFEAA7",
  success: "#4CAF50",
  // Surface variants for pills/backgrounds
  primaryLight: "#2F6CD415",
  successLight: "#4CAF5015",
  errorLight: "#FF4C4C15",
  warningLight: "#FF980015",
};

const darkColors = {
  primary: "#5BA3FF",
  secondary: "#FF8C5A",
  background: "#0D1117",
  cardBackground: "#161B22",
  textPrimary: "#E6EDF3",
  textSecondary: "#8B949E",
  border: "#30363D",
  shadow: "#000000",
  error: "#FF6B6B",
  white: "#ffffff",
  roleSuperAdmin: "#FF5757",
  roleAdmin: "#58D4B6",
  roleStaff: "#64C0FF",
  roleClassTeacher: "#79E89F",
  roleStudent: "#FFE348",
  success: "#4CAF50",
  // Surface variants
  primaryLight: "#5BA3FF20",
  successLight: "#4CAF5020",
  errorLight: "#FF6B6B20",
  warningLight: "#FF980020",
};

function createGlobalStyles(COLORS, mode) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 24,
    },
    title: {
      fontSize: 28,
      fontFamily: FONTS.bold,
      color: COLORS.primary,
      marginBottom: 24,
      textAlign: "center",
      letterSpacing: -0.5,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: FONTS.bold,
      color: COLORS.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    subHeader: {
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
    },
    label: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    text: {
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      lineHeight: 24,
      marginBottom: 10,
    },
    link: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: COLORS.primary,
    },
    iconLabel: {
      marginTop: 6,
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: COLORS.textSecondary,
    },
    buttonText: {
      fontSize: 16,
      fontFamily: FONTS.semiBold,
      color: COLORS.white,
      textAlign: "center",
      letterSpacing: 0.3,
    },
    errorText: {
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: COLORS.error,
      marginTop: 6,
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
      backgroundColor: COLORS.border,
      marginVertical: 16,
      opacity: 0.6,
    },
    // Premium Card Style
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: mode === 'dark' ? 0.3 : 0.06,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    // Legacy support for cardMinimal (aliased to card for consistency)
    cardMinimal: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: mode === 'dark' ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    // Glassmorphism Utility
    glass: {
      backgroundColor: mode === 'dark' ? 'rgba(22, 27, 34, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
      borderWidth: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: COLORS.textPrimary,
      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8F9FA',
    },
    inputMinimal: {
      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F5F7FA',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: COLORS.textPrimary,
      borderWidth: 0,
    },
    inputFocused: {
      borderWidth: 1.5,
      borderColor: COLORS.primary,
      backgroundColor: COLORS.cardBackground,
    },
    inputError: {
      borderWidth: 1.5,
      borderColor: COLORS.error,
    },
    button: {
      backgroundColor: COLORS.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonSmall: {
      backgroundColor: COLORS.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
    },
    buttonIcon: {
      padding: 10,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 40,
      minHeight: 40,
      backgroundColor: COLORS.primaryLight,
    },
    buttonLarge: {
      backgroundColor: COLORS.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 56,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: COLORS.border,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    fab: {
      position: "absolute",
      bottom: 100,
      right: 24,
      backgroundColor: COLORS.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
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
      fontFamily: FONTS.bold,
      color: COLORS.primary,
      textAlign: "center",
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    cardText: {
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: COLORS.textPrimary,
      lineHeight: 24,
    },
    cardGroup: {
      marginBottom: 32,
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
      color: COLORS.textPrimary,
      fontFamily: FONTS.bold,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    empty: {
      fontSize: 16,
      color: COLORS.textSecondary,
      marginTop: 24,
      textAlign: "center",
      fontFamily: FONTS.medium,
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

  // Gradient Constants
  const gradients = useMemo(() => ({
    primary: mode === 'dark'
      ? [colors.primary, '#4A90E2']
      : [colors.primary, '#1976D2'],
    card: mode === 'dark'
      ? [colors.cardBackground, '#1C2128']
      : [colors.cardBackground, '#F8F9FA'],
    success: ['#4CAF50', '#43A047'],
    error: ['#FF4C4C', '#D32F2F'],
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
