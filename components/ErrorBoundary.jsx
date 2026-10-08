import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FONT_SIZES, FONTS, ThemeContext } from "../theme";

class ErrorBoundaryClass extends React.Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleTryAgain = this.handleTryAgain.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.handleGoBack = this.handleGoBack.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        console.warn("Error in ErrorBoundary onError prop:", e);
      }
    }
  }

  handleTryAgain() {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn("Error in ErrorBoundary onReset prop:", e);
      }
    }
  }

  handleGoHome() {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      router.replace("/");
    } catch (e) {
      console.warn("Failed to navigate to home from ErrorBoundary:", e);
    }
  }

  handleGoBack() {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (e) {
      try {
        router.replace("/");
      } catch (err) {
        console.warn("Navigation failed:", err);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const themeColors = this.context?.colors;
      const isDark = this.context?.mode === "dark";

      // Theme-aware styles adhering to dark mode (Uber-style black)
      const bgColor = themeColors?.background || (isDark ? "#000000" : "#F8FAFC");
      const surfaceColor = themeColors?.surface || (isDark ? "#121214" : "#FFFFFF");
      const textColor = themeColors?.onSurface || (isDark ? "#FFFFFF" : "#1E293B");
      const subtextColor = themeColors?.onSurfaceVariant || (isDark ? "#94A3B8" : "#64748B");
      const primaryColor = themeColors?.primary || "#4F46E5";
      const borderColor = themeColors?.outlineVariant || (isDark ? "#222225" : "#E2E8F0");
      const debugBg = isDark ? "#161619" : "#F1F5F9";
      const debugText = isDark ? "#F87171" : "#DC2626";

      return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="error-outline" size={48} color="#EF4444" />
            </View>

            <Text style={[styles.title, { color: textColor }]}>
              {this.props.title || "Something went wrong"}
            </Text>

            <Text style={[styles.subtitle, { color: subtextColor }]}>
              {this.props.message ||
                "An unexpected issue occurred on this screen. Don't worry, your data and session are safe."}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: primaryColor }]}
                onPress={this.handleTryAgain}
                activeOpacity={0.8}
              >
                <MaterialIcons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.buttonTextPrimary}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor }]}
                onPress={this.handleGoBack}
                activeOpacity={0.8}
              >
                <MaterialIcons name="arrow-back" size={18} color={textColor} style={{ marginRight: 6 }} />
                <Text style={[styles.buttonTextSecondary, { color: textColor }]}>Go Back</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.homeLink}
              onPress={this.handleGoHome}
              activeOpacity={0.7}
            >
              <MaterialIcons name="home" size={16} color={primaryColor} style={{ marginRight: 4 }} />
              <Text style={[styles.homeLinkText, { color: primaryColor }]}>Return to Home</Text>
            </TouchableOpacity>

            {/* Debug trace in development */}
            {/* eslint-disable-next-line no-undef */}
            {__DEV__ && this.state.error && (
              <ScrollView style={[styles.debugBox, { backgroundColor: debugBg, borderColor }]}>
                <Text style={[styles.debugText, { color: debugText }]}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={[styles.debugStack, { color: subtextColor }]}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    alignItems: "center",
    maxWidth: 440,
    width: "100%",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
    marginBottom: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    elevation: 2,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  buttonTextPrimary: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  buttonTextSecondary: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  homeLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  homeLinkText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  debugBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    maxHeight: 180,
  },
  debugText: {
    fontFamily: "monospace",
    fontSize: FONT_SIZES.xs,
    fontWeight: "bold",
    marginBottom: 4,
  },
  debugStack: {
    fontFamily: "monospace",
    fontSize: 10,
    lineHeight: 14,
  },
});

export default ErrorBoundaryClass;
