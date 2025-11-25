import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { View, Text, Pressable, StyleSheet, InteractionManager } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { ROUTES } from "../constants/routes";
import AsyncStorage from '@react-native-async-storage/async-storage';

function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState(ROUTES.HOME);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  // Load user only on mount - no need to reload on every pathname change
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@auth_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn('Failed to load user', e);
        setUser(null);
      }
    };
    loadUser();
  }, [pathname]); // Reload user when route changes (e.g. login/logout)

  // Memoize navigation items to prevent recalculation on every render
  const navigationItems = useMemo(() => [
    {
      route: ROUTES.HOME,
      label: "Home",
      icon: "home",
    },
    {
      route: ROUTES.EVENTS,
      label: "Events",
      icon: "event",
    },
    {
      route: ROUTES.NEWS,
      label: "News",
      icon: "article",
    },
    {
      route: ROUTES.PROFILE,
      label: "Menu",
      icon: "menu",
    },
    // Show My Class menu if user is a student
    ...(user && user.role === 'student' ? [{
      route: ROUTES.STUDENT_CLASS,
      label: "My Class",
      icon: "school",
    }] : []),
    // Show Classes menu if user is a teacher
    ...(user && (user.role === 'class teacher' || user.role === 'staff') ? [{
      route: ROUTES.TEACHER_CLASSES,
      label: "Classes",
      icon: "class",
    }] : []),
    // Show Admin menu if user role is admin or super admin
    ...(user && (user.role === 'admin' || user.role === 'super admin') ? [{
      route: ROUTES.ADMIN,
      label: "Admin",
      icon: "admin-panel-settings",
    }] : []),
  ], [user]); // Only recalculate when user changes

  // Memoize handleTabPress to prevent creating new function on every render
  const handleTabPress = useCallback((route) => {
    if (route === activeTab) return;

    // Haptic feedback for better UX
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    // Defer state update to avoid blocking the UI
    InteractionManager.runAfterInteractions(() => {
      setActiveTab(route);
      router.push(route);
    });
  }, [activeTab, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      {/* Top border */}
      <View style={[styles.topBorder, { backgroundColor: colors.border }]} />

      {navigationItems.map((item, index) => {
        const isActive = activeTab === item.route;
        return (
          <Pressable
            key={item.route}
            onPress={() => handleTabPress(item.route)}
            style={({ pressed }) => [
              styles.tabItem,
              { opacity: pressed ? 0.6 : 1 }
            ]}
            // Optimize hit slop for better tap response
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {/* Active indicator */}
            {isActive && (
              <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
            )}

            {/* Icon */}
            <MaterialIcons
              name={item.icon}
              size={24}
              color={isActive ? colors.primary : colors.textSecondary}
              style={{ marginBottom: 4 }}
            />

            {/* Label */}
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontFamily: isActive ? "DMSans-Bold" : "DMSans-Medium",
                }
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default memo(BottomNavigation);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
