import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { ROUTES } from "../constants/routes";
import storage from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState(ROUTES.HOME);
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();

  // Load user only on mount - no need to reload on every pathname change
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await storage.getItem('@auth_user');
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
      icon: "home", // MD3 uses filled/outlined variants usually, but standard icons work
    },
    // Show My Class menu if user is a student
    ...(user && user.role === 'student' ? [{
      route: ROUTES.STUDENT_CLASS,
      label: "Class",
      icon: "school",
    }] : []),
    // Show My Teach menu if user is a teacher
    ...(user && (user.role === 'class teacher' || user.role === 'teacher' || user.role === 'staff') ? [{
      route: ROUTES.TEACHER_CLASSES,
      label: "Teach",
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
      label: "Requests",
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

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surfaceContainer, // MD3 standard bottom nav background
        paddingBottom: insets.bottom,
        borderTopColor: colors.outlineVariant,
        borderTopWidth: 0.5, // Subtle separator
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
  );
}

// Separate TabItem component for better performance and animations
const TabItem = memo(({ item, isActive, onPress, colors, _mode }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const activeAnim = useRef(new Animated.Value(0)).current;

  // Animate on press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  };

  // Animate active state
  useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
        {/* Icon Container with Pill Background */}
        <View style={styles.iconContainer}>
          {/* Active Pill Background */}
          <Animated.View style={[
            StyleSheet.absoluteFill,
            styles.activePill,
            {
              backgroundColor: colors.secondaryContainer,
              opacity: activeAnim,
              transform: [{
                scaleX: activeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1]
                })
              }]
            }
          ]} />

          <MaterialIcons
            name={item.icon}
            size={24}
            color={isActive ? colors.onSecondaryContainer : colors.onSurfaceVariant}
          />
        </View>

        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: isActive ? colors.onSurface : colors.onSurfaceVariant,
              fontFamily: isActive ? "DMSans-Bold" : "DMSans-Medium",
            }
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

TabItem.displayName = 'TabItem';

// Export memoized component to prevent unnecessary re-renders
export default memo(BottomNavigation);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12,
    paddingHorizontal: 8,
    elevation: 0, // No shadow for MD3 bottom nav usually, or very subtle
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 60, // Fixed height for touch target
  },
  iconContainer: {
    width: 64, // Pill width
    height: 32, // Pill height
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden', // Clip the pill background
    position: 'relative',
  },
  activePill: {
    borderRadius: 16,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
