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
  bold: "Lora-Bold",
  semiBold: "Lora-SemiBold",
  regular: "Lora",
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
    label: {
      fontSize: 18,
      fontFamily: FONTS.semiBold,
      color: COLORS.textPrimary,
      textTransform: "uppercase",
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
    column: {
      flexDirection: "column",
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    fullWidth: {
      width: "100%",
    },
    fullHeight: {
      height: "100%",
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.border,
      marginVertical: 16,
    },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
      ...shadowBase,
    },
    shadowBox: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 12,
      padding: 16,
      ...shadowBase,
    },
    socialIconBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: COLORS.cardBackground,
      ...shadowBase,
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
    buttonLarge: {
      backgroundColor: COLORS.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
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
    navCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.cardBackground,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: COLORS.primary,
      ...shadowBase,
    },
    cardText: {
      fontSize: 16,
      fontFamily: FONTS.semiBold,
      color: COLORS.textPrimary,
      marginLeft: 12,
    },
    iconBox: {
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: COLORS.cardBackground,
      elevation: 3,
      shadowColor: COLORS.shadow,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
    },
    socialContainer: {
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 20,
      flexDirection: "row",
      justifyContent: "space-around",
      paddingBottom: 20,
    },
    socialIconWrapper: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
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
    socialTransformWrapper: {
      alignItems: "center",
      justifyContent: "center",
    },
    highlight: {
      fontFamily: FONTS.bold,
    },
    badge: {
      backgroundColor: COLORS.primary,
      borderRadius: 6,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    badgeText: {
      fontSize: 12,
      color: "#fff",
      fontFamily: FONTS.semiBold,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    newsText: {
      fontSize: 16,
      color: COLORS.textPrimary,
      fontFamily: FONTS.semiBold,
      lineHeight: 24,
    },
    sectionTitle: {
      fontSize: 16,
      color: COLORS.textPrimary,
      fontFamily: FONTS.semiBold,
      marginBottom: 12,
    },
    newsDescription: {
      fontSize: 14,
      color: COLORS.textSecondary,
      fontFamily: FONTS.regular,
      lineHeight: 20,
      marginTop: 8,
    },
    newsFile: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      marginTop: 8,
    },
    privateNews: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontFamily: FONTS.regular,
    },
    empty: {
      fontSize: 16,
      color: COLORS.textSecondary,
      marginTop: 16,
      textAlign: "center",
    },
    cardCompact: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginTop: 8,
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

  const setAndPersist = async (newMode) => {
    try {
      if (newMode === "system") {
        await AsyncStorage.removeItem("@theme_mode");
      } else {
        await AsyncStorage.setItem("@theme_mode", newMode);
      }
    } catch (e) {
      // ignore persistence error
    }
    setMode(newMode);
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
