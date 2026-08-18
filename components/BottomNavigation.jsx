import React, { useMemo, useCallback, memo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useTheme } from "../theme";
import { ROUTES } from "../constants/routes";
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// eslint-disable-next-line no-unused-vars
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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
    ...(user && (user.role === 'teacher' || user.role === 'staff') ? [{
      route: ROUTES.TEACHER_CLASSES,
      label: "Dashboard",
      icon: "dashboard",
      inactiveIcon: "dashboard",
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
    ...(user && (user.role === 'student' || user.role === 'teacher' || user.role === 'staff' || user.role === 'admin' || user.role === 'super admin') ? [{
      route: "/requests",
      label: "Attendance",
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

  // Derive active route from pathname
  const activeRoute = useMemo(() => {
    const matchingItem = navigationItems
      .filter(item => item.route === '/' ? pathname === '/' : pathname.startsWith(item.route))
      .sort((a, b) => b.route.length - a.route.length)[0];
    return matchingItem?.route || ROUTES.HOME;
  }, [pathname, navigationItems]);

  const handleTabPress = useCallback((route) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    if (pathname === route) return;

    requestAnimationFrame(() => {
      router.replace(route);
    });
  }, [pathname, router]);

  const Container = Platform.OS === 'android' ? View : BlurView;

  return (
    <Container intensity={80} tint={mode === 'dark' ? 'dark' : 'light'} style={[
      styles.container,
      {
        backgroundColor: colors.surfaceContainer + 'CC', // 80% opacity for frosted glass effect
        paddingBottom: insets.bottom,
        borderTopColor: colors.outlineVariant,
        borderTopWidth: StyleSheet.hairlineWidth, // Crisp glass edge
        elevation: 0, // Elevation on Android breaks BlurView transparency
        shadowColor: colors.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -4 }
      }
    ]}>
      {navigationItems.map((item) => {
        const isActive = activeRoute === item.route;
        return (
          <TabItem
            key={item.label}
            item={item}
            isActive={isActive}
            onPress={handleTabPress}
            colors={colors}
          />
        );
      })}
    </Container>
  );
}

const TabItem = memo(({ item, isActive, onPress, colors }) => {
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 250 });
  }, [isActive, activeProgress]);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = useCallback(() => {
    onPress(item.route);
  }, [onPress, item.route]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [
      {
        scaleX: interpolate(
          activeProgress.value,
          [0, 1],
          [0.4, 1],
          Extrapolation.CLAMP,
        ),
      },
      {
        scaleY: interpolate(
          activeProgress.value,
          [0, 1],
          [0.8, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={[{ alignItems: 'center' }, containerStyle]}>
        <View style={styles.iconContainer}>
          {/* Active Pill */}
          <Animated.View style={[
            StyleSheet.absoluteFill,
            styles.activePill,
            { backgroundColor: colors.secondaryContainer },
            pillStyle,
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
