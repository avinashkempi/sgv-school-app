import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../theme";
import useSchoolInfo from "../hooks/useSchoolInfo";
import useTabScrollToTop from "../hooks/useTabScrollToTop";
import useDoubleBackToExit from "../hooks/useDoubleBackToExit";
import AppRefreshControl from "../components/ui/AppRefreshControl";
import { ROUTES } from "../constants/routes";
import Header from "../components/Header";
import VibeSpotlightCard from "../components/vibes/VibeSpotlightCard";
import UpcomingEventsCard from "../components/UpcomingEventsCard";
import TodayTimetableCard from "../components/home/TodayTimetableCard";
import CreateVibeModal from "../components/vibes/CreateVibeModal";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";

import { useToast } from "../components/ToastProvider";
import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { useAuth } from "../context/AuthContext";

export default function HomeScreen() {
  const router = useRouter();
  const { styles: themeStyles, colors } = useTheme();
  const { schoolInfo: SCHOOL, refresh: refreshSchoolInfo } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { updateUser, isAuthenticated } = useAuth();
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
        queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["myTimetable"] }),
        queryClient.invalidateQueries({ queryKey: ["teacherSchedule"] }),
        queryClient.invalidateQueries({ queryKey: ["studentDashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["adminDashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] }),
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
          { paddingHorizontal: 16, paddingTop: 12 },
        ]}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Creative & Stylish Welcome Header (Without Role Tag) */}
        <Header
          title={SCHOOL.name || "Shri Guru Vidya English Medium School"}
          userName={userData?.name}
          variant="welcome"
        />

        {/* ═══════════ 1. Role-Based Dynamic Dashboard (Module 1) ═══════════ */}
        {userData?.role === "admin" || userData?.role === "super admin" ? (
          <AdminDashboard />
        ) : userData?.role === "teacher" ? (
          <TeacherDashboard />
        ) : userData?.role === "student" ? (
          <StudentDashboard />
        ) : null}

        {/* ═══════════ 2. Today's Timetable / Schedule (Teachers, Admins, Guests) ═══════════ */}
        {userData?.role !== "student" && <TodayTimetableCard />}

        {/* ═══════════ 3. Campus Spotlight (Admin-Selected) ═══════════ */}
        <VibeSpotlightCard />

        {/* ═══════════ 4. Upcoming Events Calendar ═══════════ */}
        <UpcomingEventsCard />
      </ScrollView>

      {/* Floating Action Button for Quick Post (Admins) */}
      {isAdmin && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => { }
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
