import React, { createContext, useContext, useState, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

const ToastContext = createContext({ showToast: (_msg) => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();

  const showToast = useCallback((msg, duration = 1400) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <View pointerEvents="none" style={styles.wrapper}>
          <View
            style={[
              styles.toast,
              { backgroundColor: colors.cardBackground || colors.background },
            ]}
          >
            <Text style={{ color: colors.textSecondary }}>{message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  toast: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
  },
});
