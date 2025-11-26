import React, { createContext, useContext, useState, useCallback } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import { useTheme } from "../theme";
import Animated, {
  SlideInDown,
  SlideOutUp,
  Layout
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const ToastContext = createContext({ showToast: (_msg, _type) => { } });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((msg, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="box-none">
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

function ToastItem({ msg, type, onDismiss }) {
  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          accentColor: '#10B981', // Green
        };
      case 'error':
        return {
          icon: 'alert-circle',
          accentColor: '#EF4444', // Red
        };
      case 'info':
      default:
        return {
          icon: 'info',
          accentColor: '#3B82F6', // Blue
        };
    }
  };

  const config = getToastConfig();

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20).stiffness(150)}
      exiting={SlideOutUp.springify().damping(20).stiffness(150)}
      layout={Layout.springify()}
      style={styles.toastWrapper}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <ToastContent msg={msg} config={config} />
        </BlurView>
      ) : (
        <View style={[styles.blurContainer, styles.androidBackground]}>
          <ToastContent msg={msg} config={config} />
        </View>
      )}
    </Animated.View>
  );
}

function ToastContent({ msg, config }) {
  return (
    <View style={styles.contentContainer}>
      <View style={[styles.iconContainer, { backgroundColor: config.accentColor + '15' }]}>
        <Feather name={config.icon} size={18} color={config.accentColor} />
      </View>
      <Text style={styles.text}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastWrapper: {
    width: '90%',
    maxWidth: 400,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  blurContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  androidBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans-Medium',
    color: '#1F2937', // Dark gray
    flex: 1,
  },
});
