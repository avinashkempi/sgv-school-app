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
import { useRouter, usePathname, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../theme";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../context/AuthContext";
import { useNavigationContext } from "../context/NavigationContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLabel } from "../context/LabelsContext";

// eslint-disable-next-line no-unused-vars
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Resolves any child screen, sub-flow, or action item across the application
 * to its parent bottom navigation tab route.
 */
function resolveActiveTab(pathname, userRole, searchParams = {}) {
  if (!pathname) return ROUTES.HOME;

  // 1. Vibes Tab
  if (pathname === "/vibes" || pathname.startsWith("/vibes/")) {
    return ROUTES.VIBES;
  }

  // 2. Menu Items & Modals (Events, Complaints, Profile, Vibe Approvals from Menu)
  if (
    pathname === "/menu" ||
    pathname.startsWith("/menu/") ||
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/complaints" ||
    pathname.startsWith("/complaints/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/admin/vibe-approvals" ||
    pathname.startsWith("/admin/vibe-approvals/")
  ) {
    return "/menu";
  }

  // 3. Attendance Hub, Leaves & Attendance Sub-Screens (All Roles)
  if (
    pathname === "/requests" ||
    pathname.startsWith("/requests/") ||
    pathname === "/student/leaves" ||
    pathname.startsWith("/student/leaves/") ||
    pathname === "/teacher/leaves" ||
    pathname.startsWith("/teacher/leaves/") ||
    pathname === "/admin/leaves" ||
    pathname.startsWith("/admin/leaves/") ||
    pathname === "/student/attendance" ||
    pathname.startsWith("/student/attendance/") ||
    pathname === "/teacher/attendance" ||
    pathname.startsWith("/teacher/attendance/") ||
    pathname === "/admin/attendance" ||
    pathname.startsWith("/admin/attendance/") ||
    pathname === "/teacher/class/attendance" ||
    pathname.startsWith("/teacher/class/attendance/") ||
    (pathname === "/teacher/classes" && searchParams?.action === "attendance")
  ) {
    return "/requests";
  }

  // 4. Student Academics & Class Screens
  if (userRole === "student") {
    if (
      pathname === "/student/class" ||
      pathname.startsWith("/student/class/") ||
      pathname === "/subjects" ||
      pathname.startsWith("/subjects/") ||
      pathname === "/student/timetable" ||
      pathname.startsWith("/student/timetable/") ||
      pathname === "/student/exam-schedule" ||
      pathname.startsWith("/student/exam-schedule/") ||
      pathname === "/student/report-card" ||
      pathname.startsWith("/student/report-card/") ||
      pathname === "/student/fees" ||
      pathname.startsWith("/student/fees/") ||
      pathname === "/student/history" ||
      pathname.startsWith("/student/history/") ||
      pathname === "/history" ||
      pathname.startsWith("/history/")
    ) {
      return ROUTES.STUDENT_CLASS;
    }
  }

  // 5. Teacher Dashboard, Classes, Subjects & Academics
  if (
    userRole === "teacher" ||
    userRole === "staff" ||
    userRole === "support_staff"
  ) {
    if (
      pathname === "/teacher/dashboard" ||
      pathname.startsWith("/teacher/dashboard/") ||
      pathname === "/teacher/classes" ||
      pathname.startsWith("/teacher/classes/") ||
      pathname === "/teacher/class" ||
      pathname.startsWith("/teacher/class/") ||
      pathname === "/teacher/timetable" ||
      pathname.startsWith("/teacher/timetable/") ||
      pathname === "/teacher/schedule" ||
      pathname.startsWith("/teacher/schedule/") ||
      pathname === "/teacher/exams-dashboard" ||
      pathname.startsWith("/teacher/exams-dashboard/") ||
      pathname === "/teacher/marks-entry" ||
      pathname.startsWith("/teacher/marks-entry/") ||
      pathname === "/teacher/exam/enter-marks" ||
      pathname.startsWith("/teacher/exam/enter-marks/") ||
      pathname === "/teacher/subject/create-exam" ||
      pathname.startsWith("/teacher/subject/create-exam/") ||
      pathname === "/teacher/subject/performance" ||
      pathname.startsWith("/teacher/subject/performance/") ||
      pathname === "/teacher/assessments" ||
      pathname.startsWith("/teacher/assessments/") ||
      pathname === "/shared/class-reports" ||
      pathname.startsWith("/shared/class-reports/")
    ) {
      return ROUTES.TEACHER_CLASSES;
    }
  }

  // 6. Admin & Super Admin Tools
  if (userRole === "admin" || userRole === "super admin") {
    if (
      pathname === "/admin/classes" ||
      pathname.startsWith("/admin/classes/")
    ) {
      return "/admin/classes";
    }

    if (
      pathname === "/admin" ||
      (pathname.startsWith("/admin/") &&
        pathname !== "/admin/classes" &&
        !pathname.startsWith("/admin/classes/")) ||
      pathname.startsWith("/super-admin")
    ) {
      return ROUTES.ADMIN;
    }
  }

  // 7. Default Home
  return ROUTES.HOME;
}

function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useLocalSearchParams();
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const { emitScrollToTop } = useNavigationContext() || {};
  const insets = useSafeAreaInsets();
  const { t } = useLabel();

  const navigationItems = useMemo(
    () => [
      {
        route: ROUTES.HOME,
        label: t("nav.home"),
        icon: "home-filled", // M3 uses filled icons for active state usually, but consistent icons are fine
        inactiveIcon: "home",
      },
      {
        route: ROUTES.VIBES,
        label: "Vibes",
        icon: "auto-awesome",
        inactiveIcon: "auto-awesome",
      },
      ...(user && user.role === "student"
        ? [
            {
              route: ROUTES.STUDENT_CLASS,
              label: t("nav.class"),
              icon: "school",
              inactiveIcon: "school", // outlined version if available
            },
          ]
        : []),
      ...(user && (user.role === "teacher" || user.role === "staff")
        ? [
            {
              route: ROUTES.TEACHER_CLASSES,
              label: t("nav.dashboard"),
              icon: "dashboard",
              inactiveIcon: "dashboard",
            },
          ]
        : []),
      ...(user && (user.role === "admin" || user.role === "super admin")
        ? [
            {
              route: ROUTES.ADMIN,
              label: t("nav.admin"),
              icon: "admin-panel-settings",
              inactiveIcon: "admin-panel-settings",
            },
            {
              route: "/admin/classes",
              label: t("nav.classes"),
              icon: "class",
              inactiveIcon: "class",
            },
          ]
        : []),
      ...(user &&
      (user.role === "student" ||
        user.role === "teacher" ||
        user.role === "staff" ||
        user.role === "admin" ||
        user.role === "super admin")
        ? [
            {
              route: "/requests",
              label: t("nav.attendance"),
              icon: "assignment",
              inactiveIcon: "assignment",
            },
          ]
        : []),
      {
        route: "/menu",
        label: t("nav.menu"),
        icon: "grid-view",
        inactiveIcon: "grid-view",
      },
    ],
    [user, t]
  );

  // Derive active route from pathname and route hierarchy mapping
  const activeRoute = useMemo(() => {
    const resolvedRoute = resolveActiveTab(pathname, user?.role, searchParams);
    const isItemAvailable = navigationItems.some(
      (item) => item.route === resolvedRoute
    );
    return isItemAvailable ? resolvedRoute : ROUTES.HOME;
  }, [pathname, user?.role, searchParams, navigationItems]);

  const handleTabPress = useCallback(
    (route) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (pathname === route || (route === ROUTES.HOME && pathname === "/")) {
        // Standard mobile behavior: tapping active tab scrolls feed/screen to top
        if (emitScrollToTop) {
          emitScrollToTop(route);
        }
        return;
      }

      requestAnimationFrame(() => {
        router.replace(route);
      });
    },
    [pathname, router, emitScrollToTop]
  );

  const Container = Platform.OS === "android" ? View : BlurView;

  return (
    <Container
      intensity={80}
      tint={mode === "dark" ? "dark" : "light"}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainer + "CC", // 80% opacity for frosted glass effect
          paddingBottom: insets.bottom,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: StyleSheet.hairlineWidth, // Crisp glass edge
          elevation: 0, // Elevation on Android breaks BlurView transparency
          ...Platform.select({
            web: {
              boxShadow: "0 -4px 10px rgba(0, 0, 0, 0.05)",
            },
            default: {
              shadowColor: colors.shadow,
              shadowOpacity: 0.1,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: -4 },
            },
          }),
        },
      ]}
    >
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
          [0.65, 1],
          Extrapolation.CLAMP
        ),
      },
      {
        scaleY: interpolate(
          activeProgress.value,
          [0, 1],
          [0.85, 1],
          Extrapolation.CLAMP
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
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      <Animated.View style={[{ alignItems: "center" }, containerStyle]}>
        <View style={styles.iconContainer}>
          {/* Active Pill */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.activePill,
              { backgroundColor: colors.secondaryContainer },
              pillStyle,
            ]}
          />

          <MaterialIcons
            name={isActive ? item.icon : item.inactiveIcon || item.icon}
            size={24}
            color={
              isActive ? colors.onSecondaryContainer : colors.onSurfaceVariant
            }
          />
        </View>

        <Text
          style={[
            styles.label,
            {
              color: isActive ? colors.onSurface : colors.onSurfaceVariant,
              fontFamily: isActive ? FONTS.semiBold : FONTS.medium,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

TabItem.displayName = "TabItem";
export default memo(BottomNavigation);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    paddingHorizontal: 1,
  },
  iconContainer: {
    width: 52,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    position: "relative",
    overflow: "hidden",
  },
  activePill: {
    borderRadius: 14,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
    letterSpacing: LETTER_SPACINGS.xs,
    textAlign: "center",
    marginTop: 2,
  },
});
