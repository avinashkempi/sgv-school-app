import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
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
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState(ROUTES.HOME);
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();

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
  }, [pathname]);

  const navigationItems = useMemo(() => [
    {
      route: ROUTES.HOME,
      label: "Home",
      icon: "home-filled", // M3 uses filled icons for active state usually, but consistent icons are fine
      inactiveIcon: "home",
    },
    ...(user && user.role === 'student' ? [{
      route: ROUTES.STUDENT_CLASS,
      label: "Class",
      icon: "school",
      inactiveIcon: "school", // outlined version if available
    }] : []),
    ...(user && (user.role === 'class teacher' || user.role === 'teacher' || user.role === 'staff') ? [{
      route: ROUTES.TEACHER_CLASSES,
      label: "Teach",
      icon: "school",
      inactiveIcon: "school",
    }] : []),
    ...(user && (user.role === 'admin' || user.role === 'super admin') ? [{
      route: ROUTES.ADMIN,
      label: "Admin",
      icon: "admin-panel-settings",
      inactiveIcon: "admin-panel-settings",
    }, {
      route: "/admin/classes",
      label: "Classes",
      icon: "class",
      inactiveIcon: "class",
    }] : []),
    ...(user && (user.role === 'student' || user.role === 'class teacher' || user.role === 'teacher' || user.role === 'staff' || user.role === 'admin' || user.role === 'super admin') ? [{
      route: "/requests",
      label: "Requests",
      icon: "assignment",
      inactiveIcon: "assignment",
    }] : []),
    {
      route: "/menu",
      label: "Menu",
      icon: "grid-view",
      inactiveIcon: "grid-view",
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

  const handleTabPress = useCallback((route) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    if (pathname === route) return;

    requestAnimationFrame(() => {
      setActiveTab(route);
      router.replace(route);
    });
  }, [pathname, router]);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surfaceContainer,
        paddingBottom: insets.bottom,
        borderTopColor: colors.outlineVariant,
        borderTopWidth: 0, // M3 usually doesn't have a border if elevation/surface diff is sufficient, but can keep for separation
        elevation: 8, // Subtle shadow for lifting nav bar
        shadowColor: colors.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: -2 }
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
          />
        );
      })}
    </View>
  );
}

const TabItem = memo(({ item, isActive, onPress, colors }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const activeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: isActive ? 1 : 0,
      duration: 250, // Slightly slower for more "expressive" feel
      useNativeDriver: true,
    }).start();
  }, [isActive]);

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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
        <View style={styles.iconContainer}>
          {/* Active Pill */}
          <Animated.View style={[
            StyleSheet.absoluteFill,
            styles.activePill,
            {
              backgroundColor: colors.secondaryContainer,
              opacity: activeAnim,
              transform: [{
                scaleX: activeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1] // Start narrower
                })
              }, {
                scaleY: activeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }
          ]} />

          <MaterialIcons
            name={isActive ? item.icon : (item.inactiveIcon || item.icon)}
            size={24}
            color={isActive ? colors.onSecondaryContainer : colors.onSurfaceVariant}
          />
        </View>

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
export default memo(BottomNavigation);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12, // Increased top padding for floating feel
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 64,
  },
  iconContainer: {
    width: 64, // Standard M3 Pill Width
    height: 32, // Standard M3 Pill Height
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden', // Contain the pill background
  },
  activePill: {
    borderRadius: 16,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 4,
  },
});
