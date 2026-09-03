import { useEffect, useRef } from "react";
import { InteractionManager } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import apiFetch from "../utils/apiFetch";
import apiConfig from "../config/apiConfig";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { useAuth } from "../context/AuthContext";

// Minimum interval between prefetch runs (5 minutes)
const PREFETCH_COOLDOWN_MS = 5 * 60 * 1000;

export default function useOfflinePrefetch() {
  const queryClient = useQueryClient();
  const lastPrefetchRef = useRef(0);
  // eslint-disable-next-line no-unused-vars
  const { isAuthenticated, isDemo, userId, token } = useAuth();

  useEffect(() => {
    // Don't prefetch if not authenticated or in demo mode
    if (!isAuthenticated || isDemo || !userId) return;

    let isMounted = true;

    const prefetchAll = async () => {
      // Cooldown check — don't prefetch if we did it recently
      const now = Date.now();
      if (now - lastPrefetchRef.current < PREFETCH_COOLDOWN_MS) {
        return;
      }
      lastPrefetchRef.current = now;

      try {
        // Helper to prefetch a single endpoint with proper cache tier
        const prefetch = (key, path, tier = CACHE_TIERS.MODERATE) => {
          queryClient.prefetchQuery({
            queryKey: key,
            queryFn: async () => {
              const response = await apiFetch(`${apiConfig.baseUrl}${path}`, {
                silent: true,
              });
              if (!response.ok) {
                throw new Error("Network error during prefetch");
              }
              return response.json();
            },
            staleTime: tier.staleTime,
            retry: false, // Don't retry failed prefetches
          });
        };

        // Prefetch common core data (school-wide, not user-scoped)
        prefetch(["events"], "/events", CACHE_TIERS.MODERATE);
        prefetch(
          ["schoolInfo"],
          apiConfig.endpoints.schoolInfo.get,
          CACHE_TIERS.STATIC
        );

        // Prefetch Vibes highlights, spotlight & categories for instantaneous home loading
        prefetch(
          ["vibeHighlights"],
          apiConfig.endpoints.vibes.highlights,
          CACHE_TIERS.VIBES_HOME
        );
        prefetch(
          ["vibeSpotlight"],
          apiConfig.endpoints.vibes.spotlight,
          CACHE_TIERS.VIBES_HOME
        );
        prefetch(
          ["vibeCategories"],
          apiConfig.endpoints.vibes.categories,
          CACHE_TIERS.STATIC
        );

        // Prefetch user-scoped notifications (both context badge and notification center)
        prefetch(
          ["notifications", userId],
          "/notifications",
          CACHE_TIERS.REAL_TIME
        );
        prefetch(
          ["notificationCenter", userId, "all", "all"],
          "/notifications?limit=50",
          CACHE_TIERS.REAL_TIME
        );

        // Fetch user info to determine role for role-specific prefetching
        const meRes = await apiFetch(`${apiConfig.baseUrl}/auth/me`, {
          silent: true,
        });
        if (!isMounted || !meRes.ok) return;
        const meData = await meRes.json();
        const role = meData?.user?.role;

        if (!role) return;

        // Pre-fetch based on role to avoid triggering 403 Forbidden errors
        if (role === "student") {
          // Both key variants for StudentDashboard
          prefetch(["studentDashboard"], "/dashboard/student", CACHE_TIERS.MODERATE);
          prefetch(
            ["studentDashboard", userId],
            "/dashboard/student",
            CACHE_TIERS.MODERATE
          );
          // Leaves query keys matching student/leaves.jsx
          prefetch(
            ["studentLeaves", userId, "all", "all"],
            "/leaves/my-leaves",
            CACHE_TIERS.MODERATE
          );
          prefetch(
            ["studentAllLeavesSummary", userId, "all"],
            "/leaves/my-leaves?academicYear=all",
            CACHE_TIERS.MODERATE
          );
          prefetch(
            ["studentTimetable", userId],
            "/timetable/my-timetable",
            CACHE_TIERS.STABLE
          );
          if (userId && userId !== "undefined") {
            prefetch(
              ["studentFees", userId],
              `/fees/student/${userId}`,
              CACHE_TIERS.STABLE
            );
            prefetch(
              ["studentAttendanceSummary", userId],
              `/attendance/student/${userId}/summary`,
              CACHE_TIERS.MODERATE
            );
            prefetch(
              ["studentAttendanceHistory", userId],
              `/attendance/student/${userId}?page=1&limit=30`,
              CACHE_TIERS.MODERATE
            );
          }
          prefetch(
            ["studentExamSchedule", userId],
            "/exams/schedule/student",
            CACHE_TIERS.STABLE
          );
        } else if (role === "teacher") {
          // Home screen TeacherDashboard uses dateRange ("today")
          prefetch(
            ["teacherDashboard", "today"],
            "/dashboard/teacher?range=today",
            CACHE_TIERS.MODERATE
          );
          // Standalone teacher dashboard uses userId
          prefetch(
            ["teacherDashboard", userId],
            "/teachers/my-classes-and-subjects",
            CACHE_TIERS.MODERATE
          );
          prefetch(
            ["teacherClasses", userId],
            "/classes/my-classes",
            CACHE_TIERS.STABLE
          );
          prefetch(
            ["teacherMyLeaves", userId, "all"],
            "/leaves/my-leaves",
            CACHE_TIERS.MODERATE
          );
          prefetch(
            ["teacherAttendance"],
            "/attendance/my-attendance?page=1&limit=30",
            CACHE_TIERS.MODERATE
          );
          prefetch(["schoolTimetable"], "/timetable/all", CACHE_TIERS.STABLE);
        } else if (role === "admin" || role === "super admin") {
          // Home screen AdminDashboard uses dateRange ("thisMonth")
          prefetch(
            ["adminDashboard", "thisMonth"],
            "/dashboard/admin?range=thisMonth",
            CACHE_TIERS.MODERATE
          );
          prefetch(
            ["adminDashboard", "today"],
            "/dashboard/admin?range=today",
            CACHE_TIERS.MODERATE
          );
          prefetch(
            ["adminClassesInit"],
            "/classes/admin/init",
            CACHE_TIERS.STABLE
          );
        }
      } catch (err) {
        console.log("[Prefetch] Failed to execute offline prefetching:", err);
      }
    };

    // Wait for all navigation and animations to finish before prefetching
    // to avoid frame drops on Android
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (isMounted) {
        prefetchAll();
      }
    });

    return () => {
      isMounted = false;
      interactionTask.cancel();
    };
  }, [queryClient, isAuthenticated, isDemo, userId]);
}
