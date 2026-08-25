import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import useFade from "../hooks/useFade";
import { useTheme } from "../theme";
import useSchoolInfo from "../hooks/useSchoolInfo";
import useTabScrollToTop from "../hooks/useTabScrollToTop";
import useDoubleBackToExit from "../hooks/useDoubleBackToExit";
import AppRefreshControl from "../components/ui/AppRefreshControl";
import { ROUTES } from "../constants/routes";
import Header from "../components/Header";
import Card from "../components/Card";
import VibeStoriesTray from "../components/vibes/VibeStoriesTray";
import VibeSpotlightCard from "../components/vibes/VibeSpotlightCard";
import UpcomingEventsCard from "../components/UpcomingEventsCard";
import CreateVibeModal from "../components/vibes/CreateVibeModal";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";

import { useToast } from "../components/ToastProvider";
import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { useAuth } from "../context/AuthContext";
import { useLabel } from "../context/LabelsContext";

export default function HomeScreen() {
  const router = useRouter();
  const fadeStyle = useFade();
  const { styles: themeStyles, colors } = useTheme();
  const { schoolInfo: SCHOOL, refresh: refreshSchoolInfo } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { updateUser, isAuthenticated } = useAuth();
  const { t } = useLabel();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);

  // Mobile standard gestures
  useTabScrollToTop(scrollRef, "/");
  useTabScrollToTop(scrollRef, ROUTES.HOME);
  useDoubleBackToExit(true);

  // Create Vibe Modal state
  const [showCreateVibe, setShowCreateVibe] = useState(false);

  const { data: userData, refetch: refetchUser } = useApiQuery(
    ["currentUser"],
    `${apiConfig.baseUrl}/auth/me`,
    {
      ...CACHE_TIERS.STABLE,
      enabled: isAuthenticated,
      retry: false,
      select: (data) => data.user,
    }
  );

  const isAdmin =
    userData?.role === "admin" || userData?.role === "super admin";

  // Guard: skip redundant updateUser calls to avoid full-tree context re-renders
  const lastUserIdRef = useRef(null);
  useEffect(() => {
    if (userData && userData._id !== lastUserIdRef.current) {
      lastUserIdRef.current = userData._id;
      updateUser(userData);
    }
  }, [userData, updateUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshSchoolInfo(true),
        refetchUser(),
        queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] }),
        queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["studentDashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["adminDashboard"] }),
      ]);
    } catch {
      // Suppress error
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenCreateVibe = useCallback(() => {
    if (!isAuthenticated) {
      showToast("Please log in to post SGV Vibes", "info");
      router.push("/login");
      return;
    }
    setShowCreateVibe(true);
  }, [isAuthenticated, showToast, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          themeStyles.contentPaddingBottom,
          { paddingHorizontal: 16, paddingTop: 16 },
        ]}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Large M3 Welcome Header with Academic Year & Notifications */}
        <Header
          title={SCHOOL.name || "SGV English Medium School"}
          subtitle={
            userData?.name
              ? `Welcome back, ${userData.name.split(" ")[0]}`
              : "Welcome"
          }
          variant="welcome"
        />

        {/* ═══════════ 1. Campus Stories & Highlights Tray ═══════════ */}
        <VibeStoriesTray onOpenCreate={handleOpenCreateVibe} />

        {/* ═══════════ 2. Role-Based Dynamic Dashboard ═══════════ */}
        <View style={{ marginBottom: 16 }}>
          {userData?.role === "admin" || userData?.role === "super admin" ? (
            <AdminDashboard />
          ) : userData?.role === "teacher" ? (
            <TeacherDashboard />
          ) : userData?.role === "student" ? (
            <StudentDashboard />
          ) : null}
        </View>

        {/* ═══════════ 3. Campus Spotlight / Featured Achievement ═══════════ */}
        <VibeSpotlightCard />

        {/* ═══════════ 4. Upcoming Events Calendar Peek ═══════════ */}
        <UpcomingEventsCard />

        {/* ═══════════ 5. School Overview & Identity ═══════════ */}
        <Animated.View style={fadeStyle}>
          {/* About School */}
          <Card variant="filled" style={{ marginBottom: 16 }}>
            <View style={localStyles.sectionHeaderRow}>
              <View
                style={[
                  localStyles.headerIconCircle,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <MaterialIcons
                  name="apartment"
                  size={22}
                  color={colors.onPrimaryContainer}
                />
              </View>
              <Text style={[themeStyles.titleLarge, { marginBottom: 0 }]}>
                {t("home.aboutUs", "About Our School")}
              </Text>
            </View>
            <Text
              style={[
                themeStyles.bodyLarge,
                {
                  color: colors.onSurfaceVariant,
                  lineHeight: 22,
                  marginBottom: 0,
                },
              ]}
            >
              {SCHOOL.about ||
                "Dedicated to nurturing knowledge, character, and holistic growth in every student."}
            </Text>
          </Card>

          {/* Branches Section */}
          <Card variant="filled" style={{ marginBottom: 16 }}>
            <View style={localStyles.sectionHeaderRow}>
              <View
                style={[
                  localStyles.headerIconCircle,
                  { backgroundColor: colors.secondaryContainer },
                ]}
              >
                <MaterialIcons
                  name="school"
                  size={22}
                  color={colors.onSecondaryContainer}
                />
              </View>
              <Text style={[themeStyles.titleLarge, { marginBottom: 0 }]}>
                {t("home.branches", "Our Branches")}
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              <View style={localStyles.branchItem}>
                <View
                  style={[
                    localStyles.bulletDot,
                    { backgroundColor: colors.secondary },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      themeStyles.titleMedium,
                      { color: colors.onSurface, marginBottom: 2 },
                    ]}
                  >
                    {t("home.branchMangasuli", "Mangasuli Campus")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.onSurfaceVariant,
                      fontFamily: "DMSans-Regular",
                      lineHeight: 18,
                    }}
                  >
                    {t(
                      "home.branchMangasuliDesc",
                      "Primary & High School Campus offering state-of-the-art academic & sports facilities."
                    )}
                  </Text>
                </View>
              </View>

              <View style={localStyles.branchItem}>
                <View
                  style={[
                    localStyles.bulletDot,
                    { backgroundColor: colors.secondary },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      themeStyles.titleMedium,
                      { color: colors.onSurface, marginBottom: 2 },
                    ]}
                  >
                    {t("home.branchUgarKhurd", "Ugar Khurd Campus")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.onSurfaceVariant,
                      fontFamily: "DMSans-Regular",
                      lineHeight: 18,
                    }}
                  >
                    {t(
                      "home.branchUgarKhurdDesc",
                      "Pre-Primary & Primary education fostering holistic early childhood development."
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Mission Section */}
          <Card variant="filled" style={{ marginBottom: 20 }}>
            <View style={localStyles.sectionHeaderRow}>
              <View
                style={[
                  localStyles.headerIconCircle,
                  { backgroundColor: colors.tertiaryContainer },
                ]}
              >
                <MaterialIcons
                  name="flag"
                  size={22}
                  color={colors.onTertiaryContainer}
                />
              </View>
              <Text style={[themeStyles.titleLarge, { marginBottom: 0 }]}>
                {t("home.ourMission", "Our Mission")}
              </Text>
            </View>
            <Text
              style={[
                themeStyles.bodyLarge,
                {
                  color: colors.onSurfaceVariant,
                  lineHeight: 22,
                  marginBottom: 0,
                },
              ]}
            >
              {SCHOOL.mission ||
                "Empowering students through quality education, discipline, leadership, and lifelong ethical values."}
            </Text>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button for Quick Post (All verified users or Admins) */}
      {isAdmin && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {}
            );
            handleOpenCreateVibe();
          }}
          style={({ pressed }) => [
            localStyles.fab,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create SGV Vibe"
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      {/* Create / Post Vibe Modal with Cloudinary Video & Photo Upload */}
      <CreateVibeModal
        visible={showCreateVibe}
        onClose={() => setShowCreateVibe(false)}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  branchItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
