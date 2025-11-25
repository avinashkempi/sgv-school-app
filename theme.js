import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { StyleSheet, Appearance } from "react-native";
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
  cardBackground: "#fff",
  textPrimary: "#333",
  textSecondary: "#555",
  border: "#e0e0e0",
  shadow: "#000",
  error: "#FF4C4C",
  white: "#ffffff",
  roleSuperAdmin: "#FF6B6B",
  roleAdmin: "#4ECDC4",
  roleStaff: "#45B7D1",
  roleClassTeacher: "#96CEB4",
  roleStudent: "#FFEAA7",
  success: "#4CAF50",
};

const darkColors = {
  primary: "#5BA3FF",
  secondary: "#FF8C5A",
  background: "#0D1117",
  cardBackground: "#161B22",
  textPrimary: "#E6EDF3",
  textSecondary: "#A8B1BA",
  border: "#30363D",
  shadow: "#000",
  error: "#FF6B6B",
  white: "#ffffff",
  roleSuperAdmin: "#FF5757",
  roleAdmin: "#58D4B6",
  roleStaff: "#64C0FF",
  roleClassTeacher: "#79E89F",
  roleStudent: "#FFE348",
  success: "#4CAF50",
};

function createGlobalStyles(COLORS) {
  const shadowBase = {
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  };

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
    },
    headerTitle: {
      fontSize: 28,
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
    },
    label: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    text: {
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      lineHeight: 22,
      marginBottom: 10,
    },
    link: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: COLORS.primary,
      textDecorationLine: "underline",
    },
    iconLabel: {
      marginTop: 6,
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
    },
    buttonText: {
      fontSize: 16,
      fontFamily: FONTS.semiBold,
      color: COLORS.white,
      textAlign: "center",
    },
    errorText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
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
    },
    // Minimalist Card (primary card style)
    cardMinimal: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: COLORS.textPrimary,
      backgroundColor: COLORS.cardBackground,
    },
    // Minimalist Input
    inputMinimal: {
      backgroundColor: COLORS.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
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
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonSmall: {
      backgroundColor: COLORS.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
    },
    buttonIcon: {
      padding: 8,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 36,
      minHeight: 36,
    },
    buttonLarge: {
      backgroundColor: COLORS.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonSecondary: {
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    // Floating Action Button
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    backButton: {
      flexDirection: "row",
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 12,
    },
    heading: {
      fontSize: 22,
      fontFamily: FONTS.semiBold,
      color: COLORS.primary,
      textAlign: "center",
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    cardText: {
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: COLORS.textPrimary,
      lineHeight: 22,
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
      fontSize: 16,
      color: COLORS.textPrimary,
      fontFamily: FONTS.semiBold,
      marginBottom: 12,
    },
    empty: {
      fontSize: 16,
      color: COLORS.textSecondary,
      marginTop: 16,
      textAlign: "center",
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
  const styles = useMemo(() => createGlobalStyles(colors), [colors]);

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
      value={{ mode: mode || "light", toggle, colors, styles }}
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
