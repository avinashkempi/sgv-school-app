import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../theme";
import Animated, {
  SlideInUp,
  SlideOutUp,
  Layout,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

const ToastContext = createContext({ showToast: (_msg, _type) => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { _colors } = useTheme();
  const insets = useSafeAreaInsets();
  const recentToastsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (msg, type = "info", duration = 3000) => {
      if (!msg) return;

      const now = Date.now();
      const key = `${type}:${msg}`;
      const lastShown = recentToastsRef.current.get(key) || 0;

      // Deduplicate: If identical toast message was shown in the last 10 seconds, suppress it
      if (now - lastShown < 10000) {
        return;
      }

      recentToastsRef.current.set(key, now);

      // Clean up old entries from recentToastsRef map periodically
      if (recentToastsRef.current.size > 50) {
        for (const [k, timestamp] of recentToastsRef.current.entries()) {
          if (now - timestamp > 30000) {
            recentToastsRef.current.delete(k);
          }
        }
      }

      const id = Date.now().toString() + Math.random().toString();

      setToasts((prev) => {
        // Prevent duplicate toasts from stacking
        if (prev.some((t) => t.msg === msg && t.type === type)) {
          return prev;
        }
        return [...prev, { id, msg, type }];
      });

      if (duration > 0) {
        global.setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={[styles.container, { top: insets.top + 10 }]}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            {...toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ msg, type, _onDismiss }) {
  const { mode, colors: themeColors, elevations } = useTheme();

  const getToastConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: "check-circle",
          accentColor: themeColors.success || "#16A34A",
          bgTone: themeColors.successContainer || "rgba(22, 163, 74, 0.12)",
        };
      case "error":
        return {
          icon: "alert-circle",
          accentColor: themeColors.error || "#DC2626",
          bgTone: themeColors.errorContainer || "rgba(220, 38, 38, 0.12)",
        };
      case "warning":
        return {
          icon: "alert-triangle",
          accentColor: themeColors.warning || "#D97706",
          bgTone: themeColors.warningContainer || "rgba(217, 119, 6, 0.12)",
        };
      case "info":
      default:
        return {
          icon: "info",
          accentColor: themeColors.brandBlue || themeColors.secondary || "#2F6CD4",
          bgTone: themeColors.brandBlueContainer || "rgba(47, 108, 212, 0.12)",
        };
    }
  };

  const config = getToastConfig();

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(20).stiffness(150)}
      exiting={SlideOutUp.springify().damping(20).stiffness(150)}
      layout={Layout.springify()}
      style={[
        styles.toastWrapper,
        elevations?.lg || {},
        {
          borderColor:
            mode === "dark"
              ? themeColors.border || "rgba(255,255,255,0.08)"
              : themeColors.outlineVariant || "rgba(0,0,0,0.06)",
        },
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={85}
          tint={mode === "dark" ? "dark" : "light"}
          style={styles.blurContainer}
        >
          <ToastContent
            msg={msg}
            config={config}
            textColor={themeColors.textPrimary || themeColors.onSurface}
          />
        </BlurView>
      ) : (
        <View
          style={[
            styles.blurContainer,
            {
              backgroundColor:
                mode === "dark"
                  ? themeColors.surface || "rgba(20, 22, 26, 0.96)"
                  : themeColors.surface || "rgba(255, 255, 255, 0.98)",
            },
          ]}
        >
          <ToastContent
            msg={msg}
            config={config}
            textColor={themeColors.textPrimary || themeColors.onSurface}
          />
        </View>
      )}
    </Animated.View>
  );
}

function ToastContent({ msg, config, textColor }) {
  const displayText =
    typeof msg === "string"
      ? msg
      : typeof msg === "number"
      ? String(msg)
      : msg?.message || (typeof msg === "object" ? JSON.stringify(msg) : String(msg || ""));

  return (
    <View style={styles.contentContainer}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: config.bgTone },
        ]}
      >
        <Feather name={config.icon} size={17} color={config.accentColor} />
      </View>
      <Text style={[styles.text, { color: textColor || "#111318" }]}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toastWrapper: {
    width: "92%",
    maxWidth: 420,
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 8,
      },
    }),
  },
  blurContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  text: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    lineHeight: LINE_HEIGHTS.sm,
    flex: 1,
  },
});
