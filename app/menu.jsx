import React, { useRef, useState, useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, SPACING } from "../theme";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useLabel } from "../context/LabelsContext";
import useTabScrollToTop from "../hooks/useTabScrollToTop";
import useDoubleBackToExit from "../hooks/useDoubleBackToExit";

// Clean Subcomponents
import MenuHeroProfile from "../components/menu/MenuHeroProfile";
import MenuCategorySection from "../components/menu/MenuCategorySection";
import SchoolContactSection from "../components/menu/SchoolContactSection";
import SchoolInfoModal from "../components/menu/SchoolInfoModal";
import LogoutConfirmModal from "../components/menu/LogoutConfirmModal";
import MenuPreferences from "../components/menu/MenuPreferences";
import MenuFooter from "../components/menu/MenuFooter";

export default function MenuScreen() {
  const router = useRouter();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const { t } = useLabel();
  const scrollRef = useRef(null);

  // Modals state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Mobile standard gestures
  useTabScrollToTop(scrollRef, "/menu");
  useDoubleBackToExit(true);

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      await logout(router, null, showToast);
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // ONLY items that are NOT present in any bottom navigation tabs or headers
  const exclusiveMenuItems = useMemo(() => {
    const items = [
      {
        id: "events",
        title: t("menu.events", "Events & Calendar"),
        subtitle: t(
          "menu.eventsSubtitle",
          "School calendar, activities & upcoming holidays"
        ),
        icon: "event",
        color: colors.tertiary || "#6D28D9",
        route: "/events",
      },
    ];

    // Complaints & Grievances (not in any other tab)
    if (user) {
      items.push({
        id: "complaints",
        title: t("menu.complaints", "Complaints & Feedback"),
        subtitle: t(
          "menu.complaintsSubtitle",
          "Raise issues or track resolutions"
        ),
        icon: "feedback",
        color: colors.error || "#EF4444",
        route: "/complaints",
      });

      if (user.role === "student") {
        items.push({
          id: "student-ratings",
          title: t("menu.myRatings", "Monthly Ratings"),
          subtitle: t(
            "menu.myRatingsSubtitle",
            "Teacher evaluations, scores & monthly trends"
          ),
          icon: "stars",
          color: colors.primary || "#6366F1",
          route: "/student/ratings",
        });
      }

      if (
        user.role === "teacher" ||
        user.role === "staff" ||
        user.role === "support_staff"
      ) {
        items.push({
          id: "school-ratings-dashboard",
          title: t("menu.schoolRatingsLeaderboard", "School Ratings Leaderboard"),
          subtitle: t(
            "menu.schoolRatingsLeaderboardSubtitle",
            "School-wide student ratings, cumulative averages & rankings"
          ),
          icon: "leaderboard",
          color: colors.tertiary || "#8B5CF6",
          route: "/shared/student-ratings-dashboard",
        });
      }

      if (user.role === "teacher") {
        items.push({
          id: "teacher-ratings",
          title: t("menu.teacherRatings", "Monthly Student Ratings"),
          subtitle: t(
            "menu.teacherRatingsSubtitle",
            "Evaluate monthly classroom engagement & progress"
          ),
          icon: "rate-review",
          color: colors.primary || "#6366F1",
          route: "/teacher/monthly-ratings",
        });
      }

      if (user.role === "admin" || user.role === "super admin") {
        items.push({
          id: "admin-school-ratings",
          title: t("menu.schoolRatingsLeaderboard", "School Ratings Leaderboard"),
          subtitle: t(
            "menu.schoolRatingsLeaderboardSubtitle",
            "Cumulative ratings & rankings across all students"
          ),
          icon: "leaderboard",
          color: colors.tertiary || "#8B5CF6",
          route: "/shared/student-ratings-dashboard",
        });

        items.push({
          id: "admin-ratings",
          title: t("menu.adminRatings", "Student Ratings & Tracker"),
          subtitle: t(
            "menu.adminRatingsSubtitle",
            "Monthly evaluations, movers & submission tracker"
          ),
          icon: "stars",
          color: colors.primary || "#6366F1",
          route: "/admin/student-ratings",
        });

        items.push({
          id: "admin-teaching-ratings",
          title: t("menu.rateTeachingSubjects", "Rate My Subjects"),
          subtitle: t(
            "menu.rateTeachingSubjectsSubtitle",
            "Evaluate students for subjects you teach"
          ),
          icon: "rate-review",
          color: colors.secondary || "#10B981",
          route: "/teacher/monthly-ratings",
        });
      }
    }

    return items;
  }, [colors.error, colors.tertiary, colors.secondary, colors.primary, t, user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header */}
      <View style={localStyles.headerWrapper}>
        <Header
          title={t("menu.title", "Menu")}
          subtitle={t("menu.subtitle", "Settings & More")}
          variant="root"
        />
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.contentPaddingBottom,
          localStyles.scrollContainer,
        ]}
      >
        {/* 1. User Profile Card (if logged in) or Guest Welcome Banner */}
        <MenuHeroProfile user={user} />

        {/* 2. Exclusive School Features (Events, Complaints, Vibes Approvals) */}
        <View style={{ marginTop: 4 }}>
          <MenuCategorySection
            title="School Services"
            icon="auto-awesome"
            iconColor={colors.primary}
            items={exclusiveMenuItems}
          />
        </View>

        {/* 3. Preferences */}
        <MenuPreferences />

        {/* 4. School Information, Mission & Direct Connect */}
        <SchoolContactSection onOpenAbout={() => setShowAboutModal(true)} />

        {/* 5. Logout / Login & Official School Brand Identity */}
        <MenuFooter
          user={user}
          onLogoutPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
            setShowLogoutModal(true);
          }}
          onLoginPress={() => router.push("/login")}
        />
      </ScrollView>

      {/* Modals */}
      <SchoolInfoModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <LogoutConfirmModal
        visible={showLogoutModal}
        isLoading={isLoggingOut}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  headerWrapper: {
    paddingHorizontal: SPACING.screenPaddingH || 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  scrollContainer: {
    paddingHorizontal: SPACING.screenPaddingH || 16,
    paddingTop: 8,
  },
});
