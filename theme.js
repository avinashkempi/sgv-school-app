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

// Modern, Premium Color Palette
const lightColors = {
  primary: "#2563EB", // Vibrant Blue (Inter-like)
  secondary: "#F97316", // Modern Orange
  background: "#F8FAFC", // Cool Gray 50
  cardBackground: "#FFFFFF",
  textPrimary: "#0F172A", // Slate 900
  textSecondary: "#64748B", // Slate 500
  border: "#E2E8F0", // Slate 200
  shadow: "#64748B",
  error: "#EF4444", // Red 500
  white: "#FFFFFF",
  roleSuperAdmin: "#F43F5E", // Rose 500
  roleAdmin: "#10B981", // Emerald 500
  roleStaff: "#0EA5E9", // Sky 500
  roleClassTeacher: "#8B5CF6", // Violet 500
  roleStudent: "#F59E0B", // Amber 500
  success: "#22C55E", // Green 500
  // Surface variants for pills/backgrounds
  primaryLight: "#EFF6FF", // Blue 50
  successLight: "#F0FDF4", // Green 50
  errorLight: "#FEF2F2", // Red 50
  warningLight: "#FFFBEB", // Amber 50
};

const darkColors = {
  primary: "#3B82F6", // Blue 500
  secondary: "#FB923C", // Orange 400
  background: "#0F172A", // Slate 900
  cardBackground: "#1E293B", // Slate 800
  textPrimary: "#F1F5F9", // Slate 100
  textSecondary: "#94A3B8", // Slate 400
  border: "#334155", // Slate 700
  shadow: "#000000",
  error: "#F87171", // Red 400
  white: "#FFFFFF",
  roleSuperAdmin: "#FB7185", // Rose 400
  roleAdmin: "#34D399", // Emerald 400
  roleStaff: "#38BDF8", // Sky 400
  roleClassTeacher: "#A78BFA", // Violet 400
  roleStudent: "#FBBF24", // Amber 400
  success: "#4ADE80", // Green 400
  // Surface variants
  primaryLight: "rgba(59, 130, 246, 0.15)",
  successLight: "rgba(74, 222, 128, 0.15)",
  errorLight: "rgba(248, 113, 113, 0.15)",
  warningLight: "rgba(251, 191, 36, 0.15)",
};

function createGlobalStyles(COLORS, mode) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: 20, // Increased padding
      paddingTop: 24,
      paddingBottom: 32,
    },
    title: {
      fontSize: 32, // Larger title
      fontFamily: FONTS.bold,
      color: COLORS.textPrimary, // Use textPrimary instead of primary for cleaner look
      marginBottom: 24,
      textAlign: "left", // Left align for modern feel
      letterSpacing: -1,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: FONTS.bold,
      color: COLORS.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    subHeader: {
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      marginBottom: 32,
      lineHeight: 24,
    },
    label: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    text: {
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      lineHeight: 26,
      marginBottom: 12,
    },
    link: {
      fontSize: 16,
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
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: COLORS.error,
      marginTop: 8,
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
      marginVertical: 24,
    },
    // Premium Card Style
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 24, // More rounded
      padding: 24,
      marginBottom: 20,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 8 }, // Deeper shadow
      shadowOpacity: mode === 'dark' ? 0.4 : 0.08,
      shadowRadius: 16,
      elevation: 6,
      borderWidth: 1,
      borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    // Legacy support for cardMinimal (aliased to card for consistency)
    cardMinimal: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: mode === 'dark' ? 0.3 : 0.05,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    // Glassmorphism Utility
    glass: {
      backgroundColor: mode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 16, // More rounded
      paddingVertical: 16,
      paddingHorizontal: 20,
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.textPrimary,
      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    },
    inputMinimal: {
      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      fontSize: 16,
      color: COLORS.textPrimary,
      borderWidth: 0,
    },
    inputFocused: {
      borderWidth: 2,
      borderColor: COLORS.primary,
      backgroundColor: COLORS.cardBackground,
    },
    inputError: {
      borderWidth: 2,
      borderColor: COLORS.error,
    },
    button: {
      backgroundColor: COLORS.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    buttonSmall: {
      backgroundColor: COLORS.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
    },
    buttonIcon: {
      padding: 12,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 48,
      minHeight: 48,
      backgroundColor: COLORS.primaryLight,
    },
    buttonLarge: {
      backgroundColor: COLORS.primary,
      paddingVertical: 18,
      paddingHorizontal: 32,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 60,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: COLORS.border,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    fab: {
      position: "absolute",
      bottom: 100,
      right: 24,
      backgroundColor: COLORS.primary,
      width: 64, // Slightly larger
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 10,
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
      fontSize: 24,
      fontFamily: FONTS.bold,
      color: COLORS.primary,
      textAlign: "left",
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    cardText: {
      fontSize: 16,
      fontFamily: FONTS.regular,
      color: COLORS.textPrimary,
      lineHeight: 26,
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
      paddingBottom: 120,
    },
    sectionTitle: {
      fontSize: 20,
      color: COLORS.textPrimary,
      fontFamily: FONTS.bold,
      marginBottom: 20,
      letterSpacing: -0.5,
    },
    empty: {
      fontSize: 16,
      color: COLORS.textSecondary,
      marginTop: 32,
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
      ? [colors.primary, '#60A5FA'] // Lighter blue for dark mode
      : [colors.primary, '#1D4ED8'], // Darker blue for light mode
    card: mode === 'dark'
      ? [colors.cardBackground, '#1E293B']
      : [colors.cardBackground, '#F8FAFC'],
    success: ['#22C55E', '#16A34A'],
    error: ['#EF4444', '#DC2626'],
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
