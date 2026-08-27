import React, { useRef, useState, useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
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
import PrivacyPolicyModal from "../components/menu/PrivacyPolicyModal";
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
        color: "#E11D48",
        route: "/events",
      },
    ];

    // Admin / Super Admin moderation tool (not in bottom tabs or admin page)
    if (user && (user.role === "admin" || user.role === "super admin")) {
      items.push({
        id: "vibe_approvals",
        title: t("menu.vibeApprovals", "Vibes Approvals"),
        subtitle: t(
          "menu.vibeApprovalsSubtitle",
          "Review & moderate community posts"
        ),
        icon: "verified-user",
        color: "#15803D",
        route: "/admin/vibe-approvals",
      });
    }

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
        color: "#EF4444",
        route: "/complaints",
      });
    }

    return items;
  }, [user, t]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header */}
      <View style={localStyles.headerWrapper}>
        <Header
          title={t("menu.title", "Menu")}
          subtitle={t("menu.subtitle", "Settings & More")}
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

        {/* 3. Preferences & Privacy */}
        <MenuPreferences
          onOpenPrivacyPolicy={() => setShowPrivacyModal(true)}
        />

        {/* 4. School Information, Mission & Direct Connect */}
        <SchoolContactSection onOpenAbout={() => setShowAboutModal(true)} />

        {/* 5. Logout / Login & Official School Brand Identity */}
        <MenuFooter
          user={user}
          onLogoutPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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

      <PrivacyPolicyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
