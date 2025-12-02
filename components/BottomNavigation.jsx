import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { ROUTES } from "../constants/routes";
import AsyncStorage from '@react-native-async-storage/async-storage';

function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState(ROUTES.HOME);
  const [user, setUser] = useState(null);

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
    // Show My Class menu if user is a student
    ...(user && user.role === 'student' ? [{
      route: ROUTES.STUDENT_CLASS,
      label: "My Class",
      icon: "school",
    }] : []),
    // Show My Teach menu if user is a teacher
    ...(user && (user.role === 'class teacher' || user.role === 'teacher' || user.role === 'staff') ? [{
      route: ROUTES.TEACHER_CLASSES,
      label: "My Teach",
      icon: "school",
    }] : []),
    // Admin gets Admin tab first, then Classes tab
    ...(user && (user.role === 'admin' || user.role === 'super admin') ? [{
      route: ROUTES.ADMIN,
      label: "Admin",
      icon: "admin-panel-settings",
    }, {
      route: "/admin/classes",
      label: "Classes",
      icon: "class",
    }] : []),
    // Requests Tab - for logged-in students and teachers
    ...(user && (user.role === 'student' || user.role === 'class teacher' || user.role === 'teacher' || user.role === 'staff' || user.role === 'admin' || user.role === 'super admin') ? [{
      route: "/requests",
      label: "Attendance",
      icon: "assignment",
    }] : []),

    // Menu Tab
    {
      route: "/menu",
      label: "Menu",
      icon: "grid-view",
    },
  ], [user]);

  useEffect(() => {
    const matchingItem = navigationItems
      .filter(item => item.route === '/' ? pathname === '/' : pathname.startsWith(item.route))
      .sort((a, b) => b.route.length - a.route.length)[0];

    if (matchingItem) {
      setActiveTab(matchingItem.route);
    }
  }, [pathname, navigationItems]);

  // Memoize handleTabPress to prevent creating new function on every render
  const handleTabPress = useCallback((route) => {
    // Haptic feedback for better UX
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    if (pathname === route) return;

    // Use requestAnimationFrame to ensure the UI update (ripple effect) happens
    // before the heavy navigation work starts
    requestAnimationFrame(() => {
      setActiveTab(route);
      // Use replace instead of push to prevent stack buildup and memory leaks
      router.replace(route);
    });
  }, [pathname, router]);

  // Glassmorphism background color
  const glassBackground = mode === 'dark'
    ? 'rgba(30, 41, 59, 0.9)' // Darker slate
    : 'rgba(255, 255, 255, 0.9)';

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.container,
        {
          backgroundColor: glassBackground,
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        {navigationItems.map((item) => {
          const isActive = activeTab === item.route;
          return (
            <TabItem
              key={item.label}
              item={item}
              isActive={isActive}
              onPress={() => handleTabPress(item.route)}
              colors={colors}
              mode={mode}
            />
          );
        })}
      </View>
    </View>
  );
}

// Separate TabItem component for better performance and animations
const TabItem = memo(({ item, isActive, onPress, colors, _mode }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  // Animate on press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Animate icon when active state changes
  useEffect(() => {
    Animated.sequence([
      Animated.spring(iconScaleAnim, {
        toValue: isActive ? 1.15 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
    ]).start();
  }, [isActive]);

  const activePillBackground = colors.primaryLight;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tabItem}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        {/* Active Pill Background */}
        {isActive && (
          <View style={[
            styles.activePill,
            { backgroundColor: activePillBackground }
          ]} />
        )}

        {/* Icon with glow effect */}
        <Animated.View
          style={[
            styles.iconContainer,
            isActive && {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 4,
            },
            { transform: [{ scale: iconScaleAnim }] }
          ]}
        >
          <MaterialIcons
            name={item.icon}
            size={24}
            color={isActive ? colors.primary : colors.textSecondary}
          />
        </Animated.View>

        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: isActive ? colors.primary : colors.textSecondary,
              fontFamily: isActive ? "DMSans-Bold" : "DMSans-Regular",
              opacity: isActive ? 1 : 0.7,
            }
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

TabItem.displayName = 'TabItem';

// Export memoized component to prevent unnecessary re-renders
export default memo(BottomNavigation);

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    // Enhanced shadow for floating effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    // Backdrop blur simulation
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: 0,
    left: -4,
    right: -4,
    bottom: 0,
    borderRadius: 16,
    zIndex: 0,
  },
  iconContainer: {
    marginBottom: 4,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
    textAlign: 'center',
    zIndex: 1,
  },
});
