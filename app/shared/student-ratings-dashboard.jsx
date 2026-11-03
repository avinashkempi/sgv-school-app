import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, RADIUS, SPACING } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery, keepPreviousData } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/ui/Badge";
import UserAvatar from "../../components/ui/UserAvatar";
import ProgressBar from "../../components/ui/ProgressBar";
import TextInput from "../../components/TextInput";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { LoadingState, EmptyState } from "../../components/StateComponents";
import { formatClassName } from "../../utils/formatClassName";

const DATA_POINTS = [
  {
    key: "classEngagement",
    label: "Class Engagement",
    desc: "Attentiveness, participation, and answering questions",
    icon: "record-voice-over",
    color: "#4F46E5",
  },
  {
    key: "homeworkClasswork",
    label: "Homework & Classwork",
    desc: "Completes homework & classwork on time responsibly",
    icon: "assignment-turned-in",
    color: "#16A34A",
  },
  {
    key: "behaviourSocial",
    label: "Behaviour & Social",
    desc: "Discipline, respectful conduct, and teamwork",
    icon: "groups",
    color: "#8B5CF6",
  },
  {
    key: "englishComm",
    label: "English / Communication",
    desc: "Expresses ideas clearly and communicates confidently",
    icon: "chat",
    color: "#D97706",
  },
];

const getRatingLabel = (score) => {
  if (!score || score <= 0)
    return { label: "Unrated", color: "#6B7280", variant: "neutral" };
  if (score < 2.0)
    return {
      label: "Needs Significant Imp.",
      color: "#DC2626",
      variant: "error",
    };
  if (score < 2.5)
    return { label: "Needs Improvement", color: "#EA580C", variant: "warning" };
  if (score < 3.5)
    return { label: "Meets Expectation", color: "#4F46E5", variant: "primary" };
  if (score < 4.5)
    return { label: "Good", color: "#16A34A", variant: "success" };
  return { label: "Excellent", color: "#059669", variant: "success" };
};

const getQuadrantDetails = (quadrantKey) => {
  switch (quadrantKey) {
    case "all_rounder":
      return {
        label: "All-Rounder",
        icon: "stars",
        color: "#D97706",
        bg: "#FEF3C7",
        desc: "Excels in both exams & conduct",
      };
    case "academic_star":
      return {
        label: "Academic Star",
        icon: "school",
        color: "#2563EB",
        bg: "#EFF6FF",
        desc: "High exam performance",
      };
    case "diligent_striver":
      return {
        label: "Diligent Striver",
        icon: "favorite",
        color: "#7C3AED",
        bg: "#F5F3FF",
        desc: "Exemplary conduct & discipline",
      };
    case "needs_support":
      return {
        label: "Support Focus",
        icon: "flag",
        color: "#DC2626",
        bg: "#FEF2F2",
        desc: "Needs holistic guidance",
      };
    default:
      return null;
  }
};

export default function SchoolStudentRatingsDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // Role verification: Strict quarantine for students
  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  const [mode, setMode] = useState("comprehensive"); // 'comprehensive' | 'marks' | 'ratings'
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [activeTier, setActiveTier] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("composite"); // 'composite' | 'marks' | 'ratings' | 'highest' | 'lowest' | 'name' | 'most_rated' | 'improving'
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch cumulative school-wide all students dashboard
  // Performance optimization: Scope query by classId and mode to cache the cohort.
  // Instant in-memory search, tier filtering, and sorting are executed client-side.
  const queryParams = new URLSearchParams();
  if (mode) queryParams.append("mode", mode);
  if (selectedClassId !== "all") queryParams.append("classId", selectedClassId);

  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useApiQuery(
    [
      "schoolAllStudentsRatingsDashboard",
      selectedClassId,
      mode,
    ],
    `${apiConfig.baseUrl}/student-ratings/school/all-students-dashboard?${queryParams.toString()}`,
    {
      enabled: !isStudent,
      placeholderData: keepPreviousData,
      ...CACHE_TIERS.MODERATE,
    }
  );

  // Fetch student drilldown trend & details when a student is selected
  const {
    data: studentTrendData,
    isLoading: loadingTrend,
  } = useApiQuery(
    ["studentRatingTrendDrilldown", selectedStudentId],
    `${apiConfig.baseUrl}/student-ratings/student/${selectedStudentId}/trend?months=8`,
    {
      enabled: !!selectedStudentId,
      placeholderData: keepPreviousData,
      ...CACHE_TIERS.MODERATE,
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      if (selectedStudentId) {
        await queryClient.invalidateQueries({
          queryKey: ["studentRatingTrendDrilldown", selectedStudentId],
        });
      }
    } catch (err) {
      console.error("Error refreshing dashboard:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const rawStudents = useMemo(
    () => dashboardData?.students || [],
    [dashboardData?.students]
  );

  const students = useMemo(() => {
    let result = [...rawStudents];

    // 1. In-memory search filter (name, regNo, rollNumber) - 0ms instant response
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) => {
        const name = (s.student?.name || "").toLowerCase();
        const regNo = (s.student?.regNo || "").toLowerCase();
        const roll = String(s.student?.rollNumber || "").toLowerCase();
        return name.includes(q) || regNo.includes(q) || roll.includes(q);
      });
    }

    // 2. In-memory Tier / Quadrant filter
    if (activeTier !== "all") {
      if (activeTier === "all_rounders") {
        result = result.filter((s) => s.quadrant === "all_rounder");
      } else if (activeTier === "academic_stars") {
        result = result.filter((s) => s.quadrant === "academic_star");
      } else if (activeTier === "diligent_strivers") {
        result = result.filter((s) => s.quadrant === "diligent_striver");
      } else if (activeTier === "needs_support") {
        result = result.filter((s) => s.quadrant === "needs_support");
      } else if (activeTier === "top_academics") {
        result = result.filter((s) => (s.marksScore || 0) >= 80);
      } else if (activeTier === "top_performers" || activeTier === "excellent") {
        result = result.filter((s) => (s.overallAverage || 0) >= 4.5);
      } else if (activeTier === "good") {
        result = result.filter(
          (s) => (s.overallAverage || 0) >= 3.5 && (s.overallAverage || 0) < 4.5
        );
      } else if (activeTier === "meets") {
        result = result.filter(
          (s) => (s.overallAverage || 0) >= 2.5 && (s.overallAverage || 0) < 3.5
        );
      } else if (activeTier === "attention" || activeTier === "needs_attention") {
        result = result.filter(
          (s) => s.overallAverage !== null && s.overallAverage < 3.0
        );
      } else if (activeTier === "needs_improvement") {
        result = result.filter(
          (s) =>
            s.overallAverage !== null &&
            s.overallAverage >= 2.0 &&
            s.overallAverage < 2.5
        );
      } else if (activeTier === "needs_significant_improvement") {
        result = result.filter(
          (s) => s.overallAverage !== null && s.overallAverage < 2.0
        );
      }
    }

    // 3. In-memory sorting
    const activeSort =
      sortBy ||
      (mode === "marks" ? "marks" : mode === "ratings" ? "ratings" : "composite");

    if (activeSort === "marks") {
      result.sort((a, b) => (b.marksScore ?? -1) - (a.marksScore ?? -1));
    } else if (activeSort === "ratings" || activeSort === "highest") {
      result.sort((a, b) => (b.overallAverage ?? -1) - (a.overallAverage ?? -1));
    } else if (activeSort === "lowest") {
      result.sort(
        (a, b) =>
          (a.compositeScore !== null ? a.compositeScore : 999) -
          (b.compositeScore !== null ? b.compositeScore : 999)
      );
    } else if (activeSort === "name") {
      result.sort((a, b) =>
        (a.student?.name || "").localeCompare(b.student?.name || "")
      );
    } else if (activeSort === "most_rated") {
      result.sort((a, b) => (b.totalRatings || 0) - (a.totalRatings || 0));
    } else if (activeSort === "least_rated") {
      result.sort((a, b) => (a.totalRatings || 0) - (b.totalRatings || 0));
    } else if (activeSort === "improving") {
      result.sort((a, b) => (b.trendChange || 0) - (a.trendChange || 0));
    } else if (activeSort === "composite") {
      result.sort((a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1));
    }

    return result;
  }, [rawStudents, searchQuery, activeTier, sortBy, mode]);
  const classes = useMemo(
    () => dashboardData?.classes || [],
    [dashboardData?.classes]
  );
  const schoolCriteria = useMemo(
    () =>
      dashboardData?.schoolCriteriaAverages || {
        classEngagement: 0,
        homeworkClasswork: 0,
        behaviourSocial: 0,
        englishComm: 0,
      },
    [dashboardData?.schoolCriteriaAverages]
  );
  const tierCounts = useMemo(
    () =>
      dashboardData?.tierCounts || {
        excellent: 0,
        good: 0,
        meets: 0,
        needs_improvement: 0,
        needs_significant_improvement: 0,
        unrated: 0,
      },
    [dashboardData?.tierCounts]
  );

  // Student selected object for drilldown
  const selectedStudentObj = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.student?._id === selectedStudentId);
  }, [selectedStudentId, students]);

  // If student role tries to view this screen, show privacy quarantine notice
  if (isStudent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader
          title="Student Ratings"
          showBack={true}
        />
        <View style={styles.accessDeniedBox}>
          <MaterialIcons name="lock-outline" size={56} color={colors.primary} />
          <Text
            style={[styles.accessDeniedTitle, { color: colors.onSurface }]}
          >
            Private Student Records
          </Text>
          <Text
            style={[
              styles.accessDeniedSubtitle,
              { color: colors.onSurfaceVariant },
            ]}
          >
            The school-wide leaderboard and peer ratings are strictly confidential
            for faculty and administration. You can view your personal evaluation
            and monthly progress on your Ratings page.
          </Text>
          <Button
            title="View My Ratings"
            icon="stars"
            variant="primary"
            style={{ marginTop: 20 }}
            onPress={() => router.replace("/student/ratings")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="School Ratings Leaderboard"
        showBack={true}
        rightAction={
          isAdmin ? (
            <TouchableOpacity
              onPress={() => router.push("/admin/student-ratings")}
              style={[
                styles.monthlyTrackerLink,
                {
                  backgroundColor: isDark
                    ? colors.surfaceContainerHigh
                    : colors.surfaceContainer,
                  borderColor: colors.outlineVariant,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Monthly Tracker"
            >
              <MaterialIcons name="event-note" size={16} color={colors.primary} />
              <Text style={[styles.monthlyTrackerText, { color: colors.primary }]}>
                Monthly Tracker
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Mode Selector Tabs: Holistic 50/50 | Academics (Marks) | Conduct & Discipline */}
        <View style={styles.modeTabsRow}>
          {[
            {
              key: "comprehensive",
              icon: "emoji-events",
              title: "Holistic 50/50",
              desc: "Marks + Ratings",
            },
            {
              key: "marks",
              icon: "school",
              title: "Academics",
              desc: "Class-Weighted Marks",
            },
            {
              key: "ratings",
              icon: "stars",
              title: "Conduct",
              desc: "Monthly Ratings",
            },
          ].map((tab) => {
            const isActive = mode === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setMode(tab.key);
                  setSortBy(
                    tab.key === "marks"
                      ? "marks"
                      : tab.key === "ratings"
                      ? "ratings"
                      : "composite"
                  );
                  setActiveTier("all");
                }}
                style={[
                  styles.modeTabBtn,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.surfaceContainer,
                    borderColor: isActive
                      ? colors.primary
                      : colors.outlineVariant,
                  },
                ]}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={15}
                  color={isActive ? colors.onPrimary : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.modeTabTitle,
                    {
                      color: isActive ? colors.onPrimary : colors.onSurface,
                      fontFamily: isActive ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Banner: School-Wide Cumulative Scope & Read-Only Notice */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark
                ? "rgba(99, 102, 241, 0.12)"
                : "#EEF2FF",
              borderColor: isDark
                ? "rgba(99, 102, 241, 0.25)"
                : "#C7D2FE",
            },
          ]}
        >
          <MaterialIcons name="leaderboard" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text
              style={[
                styles.infoBannerTitle,
                { color: isDark ? "#A5B4FC" : "#3730A3" },
              ]}
            >
              {mode === "comprehensive"
                ? "Holistic School Leaderboard (50% Marks + 50% Ratings)"
                : mode === "marks"
                ? "Academic Exam Leaderboard (Class-Specific Weightings)"
                : "Behavioral & Conduct Ratings Leaderboard"}
            </Text>
            <Text
              style={[
                styles.infoBannerSub,
                { color: isDark ? "#C7D2FE" : "#4338CA" },
              ]}
            >
              {mode === "comprehensive"
                ? "Harmonized ranking balancing academic exams with classroom conduct & engagement"
                : mode === "marks"
                ? "Standardized assessments normalized with class-specific distinct weights (FA1-SA2)"
                : "Aggregated across all evaluated months • Staff & Administration View"}
            </Text>
          </View>
        </View>

        {/* 1. Hero School KPI Card */}
        <Card
          variant="elevated"
          style={styles.heroCard}
          contentStyle={styles.heroCardContent}
        >
          <View style={styles.heroLeftCol}>
            <Text
              style={[
                styles.heroSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {mode === "comprehensive"
                ? "School Holistic Average"
                : mode === "marks"
                ? "School Academic Marks Average"
                : "School Cumulative Rating"}
            </Text>
            <View style={styles.heroScoreRow}>
              <Text style={[styles.heroScoreText, { color: colors.primary }]}>
                {mode === "comprehensive"
                  ? dashboardData?.schoolCompositeAverage !== null && dashboardData?.schoolCompositeAverage !== undefined
                    ? `${dashboardData.schoolCompositeAverage.toFixed(1)}%`
                    : "--"
                  : mode === "marks"
                  ? dashboardData?.schoolMarksAverage !== null && dashboardData?.schoolMarksAverage !== undefined
                    ? `${dashboardData.schoolMarksAverage.toFixed(1)}%`
                    : "--"
                  : dashboardData?.schoolAverage
                  ? dashboardData.schoolAverage.toFixed(2)
                  : "--"}
              </Text>
              {mode === "ratings" && (
                <Text
                  style={[styles.heroScoreMax, { color: colors.onSurfaceVariant }]}
                >
                  / 5.0
                </Text>
              )}
            </View>

            {mode === "comprehensive" ? (
              <View style={styles.heroSplitMetricsRow}>
                <View style={[styles.heroSplitPill, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF" }]}>
                  <Text style={[styles.heroSplitPillText, { color: colors.primary }]}>
                    📚 Marks: {dashboardData?.schoolMarksAverage !== null && dashboardData?.schoolMarksAverage !== undefined ? `${dashboardData.schoolMarksAverage.toFixed(1)}%` : "--"}
                  </Text>
                </View>
                <View style={[styles.heroSplitPill, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5" }]}>
                  <Text style={[styles.heroSplitPillText, { color: "#059669" }]}>
                    ⭐ Ratings: {dashboardData?.schoolAverage ? `${dashboardData.schoolAverage.toFixed(2)}★` : "--"}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                {dashboardData?.schoolAverage ? (
                  <Badge
                    variant={getRatingLabel(dashboardData.schoolAverage).variant}
                    label={getRatingLabel(dashboardData.schoolAverage).label}
                    size="md"
                  />
                ) : (
                  <Badge variant="neutral" label="No Evaluations Yet" size="md" />
                )}
              </View>
            )}
          </View>

          <View style={styles.heroRightCol}>
            <View
              style={[
                styles.heroIconCircle,
                {
                  backgroundColor: colors.primaryContainer || "#EEF2FF",
                },
              ]}
            >
              <MaterialIcons name="emoji-events" size={32} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.heroCoverageText,
                { color: colors.onSurface },
              ]}
            >
              {dashboardData?.totalEvaluatedStudents || 0} /{" "}
              {dashboardData?.totalEnrolledStudents || 0} Ranked
            </Text>
            <Text
              style={[
                styles.heroCoveragePercent,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {dashboardData?.evaluationCoveragePercent || 0}% Evaluated
            </Text>
          </View>
        </Card>

        {/* 2. 4 Core Evaluation Pillars Grid (Only in Ratings or Comprehensive Mode) */}
        {mode !== "marks" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              4 Core Evaluation Pillars (School-Wide Conduct)
            </Text>
            <View style={styles.criteriaGrid}>
              {DATA_POINTS.map((dp) => {
                const avg = schoolCriteria[dp.key] || 0;
                const percent = Math.min(Math.max((avg / 5) * 100, 0), 100);

                return (
                  <Card
                    key={dp.key}
                    variant="elevated"
                    style={styles.criterionCard}
                    contentStyle={styles.criterionCardContent}
                  >
                    <View style={styles.criterionHeader}>
                      <View
                        style={[
                          styles.criterionIconBox,
                          { backgroundColor: `${dp.color}18` },
                        ]}
                      >
                        <MaterialIcons name={dp.icon} size={20} color={dp.color} />
                      </View>
                      <Text style={[styles.criterionScore, { color: dp.color }]}>
                        {avg > 0 ? avg.toFixed(2) : "--"}
                      </Text>
                    </View>
                    <Text
                      style={[styles.criterionTitle, { color: colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {dp.label}
                    </Text>
                    <Text
                      style={[
                        styles.criterionDesc,
                        { color: colors.onSurfaceVariant },
                      ]}
                      numberOfLines={2}
                    >
                      {dp.desc}
                    </Text>
                    <View style={styles.criterionBarWrap}>
                      <ProgressBar
                        progress={percent / 100}
                        color={dp.color}
                        trackColor={isDark ? "#2A2A32" : "#E5E7EB"}
                        height={5}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* 3. Performance / Cohort Distribution Visualizer */}
        <Card
          variant="elevated"
          style={styles.tierDistCard}
          contentStyle={{ padding: 14 }}
        >
          <View style={styles.tierDistHeader}>
            <Text
              style={[styles.tierDistTitle, { color: colors.onSurface }]}
            >
              {mode === "comprehensive"
                ? "Holistic Cohort Quadrants (Marks vs Ratings)"
                : mode === "marks"
                ? "Academic Performance Cohorts"
                : "Performance Tier Distribution"}
            </Text>
            <Text
              style={[
                styles.tierDistSub,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {dashboardData?.totalEvaluatedStudents || 0} Students Evaluated
            </Text>
          </View>

          <View style={styles.tierPillsRow}>
            {mode === "comprehensive" ? (
              [
                {
                  key: "all_rounders",
                  label: "🌟 All-Rounders",
                  count: dashboardData?.quadrantCounts?.all_rounders || 0,
                  color: "#D97706",
                },
                {
                  key: "academic_stars",
                  label: "💡 Academic Stars",
                  count: dashboardData?.quadrantCounts?.academic_stars || 0,
                  color: "#2563EB",
                },
                {
                  key: "diligent_strivers",
                  label: "🤝 Diligent Strivers",
                  count: dashboardData?.quadrantCounts?.diligent_strivers || 0,
                  color: "#7C3AED",
                },
                {
                  key: "needs_support",
                  label: "🎯 Support Focus",
                  count: dashboardData?.quadrantCounts?.needs_support || 0,
                  color: "#DC2626",
                },
              ].map((tItem) => {
                const isSelected = activeTier === tItem.key;
                return (
                  <TouchableOpacity
                    key={tItem.key}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveTier(isSelected ? "all" : tItem.key);
                    }}
                    style={[
                      styles.tierPillBtn,
                      {
                        backgroundColor: isSelected
                          ? `${tItem.color}25`
                          : colors.surfaceContainer,
                        borderColor: isSelected
                          ? tItem.color
                          : colors.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.tierDot,
                        { backgroundColor: tItem.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.tierPillLabel,
                        {
                          color: isSelected ? tItem.color : colors.onSurface,
                          fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                        },
                      ]}
                    >
                      {tItem.label}:{" "}
                      <Text style={{ fontFamily: FONTS.bold }}>{tItem.count}</Text>
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : mode === "marks" ? (
              [
                {
                  key: "top_academics",
                  label: "Top Academics (≥80%)",
                  count: (students || []).filter((s) => (s.marksScore || 0) >= 80).length,
                  color: "#2563EB",
                },
                {
                  key: "academic_stars",
                  label: "Academic Aces",
                  count: dashboardData?.quadrantCounts?.academic_stars || 0,
                  color: "#059669",
                },
              ].map((tItem) => {
                const isSelected = activeTier === tItem.key;
                return (
                  <TouchableOpacity
                    key={tItem.key}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveTier(isSelected ? "all" : tItem.key);
                    }}
                    style={[
                      styles.tierPillBtn,
                      {
                        backgroundColor: isSelected
                          ? `${tItem.color}25`
                          : colors.surfaceContainer,
                        borderColor: isSelected
                          ? tItem.color
                          : colors.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.tierDot,
                        { backgroundColor: tItem.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.tierPillLabel,
                        {
                          color: isSelected ? tItem.color : colors.onSurface,
                          fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                        },
                      ]}
                    >
                      {tItem.label}:{" "}
                      <Text style={{ fontFamily: FONTS.bold }}>{tItem.count}</Text>
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              [
                {
                  key: "excellent",
                  label: "Excellent (≥4.5)",
                  count: tierCounts.excellent,
                  color: "#059669",
                },
                {
                  key: "good",
                  label: "Good (3.5–4.4)",
                  count: tierCounts.good,
                  color: "#16A34A",
                },
                {
                  key: "meets",
                  label: "Meets (2.5–3.4)",
                  count: tierCounts.meets,
                  color: "#4F46E5",
                },
                {
                  key: "attention",
                  label: "Needs Support (<3.0)",
                  count:
                    (tierCounts.needs_improvement || 0) +
                    (tierCounts.needs_significant_improvement || 0),
                  color: "#DC2626",
                },
              ].map((tItem) => {
                const isSelected = activeTier === tItem.key;
                return (
                  <TouchableOpacity
                    key={tItem.key}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveTier(isSelected ? "all" : tItem.key);
                    }}
                    style={[
                      styles.tierPillBtn,
                      {
                        backgroundColor: isSelected
                          ? `${tItem.color}25`
                          : colors.surfaceContainer,
                        borderColor: isSelected
                          ? tItem.color
                          : colors.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.tierDot,
                        { backgroundColor: tItem.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.tierPillLabel,
                        {
                          color: isSelected ? tItem.color : colors.onSurface,
                          fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                        },
                      ]}
                    >
                      {tItem.label}:{" "}
                      <Text style={{ fontFamily: FONTS.bold }}>{tItem.count}</Text>
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </Card>

        {/* 4. Controls: Class Filters & Search */}
        <View style={styles.controlsSection}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Master Student Leaderboard
          </Text>

          {/* Search Box */}
          <View style={{ marginBottom: 10 }}>
            <TextInput
              placeholder="Search student by name or registration number..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon="search"
              clearButton={true}
              size="sm"
            />
          </View>

          {/* Class Filter Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classFilterScroll}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSelectedClassId("all");
              }}
              style={[
                styles.classFilterPill,
                {
                  backgroundColor:
                    selectedClassId === "all"
                      ? colors.primary
                      : colors.surfaceContainer,
                  borderColor:
                    selectedClassId === "all"
                      ? colors.primary
                      : colors.outlineVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.classFilterPillText,
                  {
                    color:
                      selectedClassId === "all"
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                    fontFamily:
                      selectedClassId === "all" ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                All Classes ({dashboardData?.totalEnrolledStudents || 0})
              </Text>
            </TouchableOpacity>

            {classes.map((cls) => {
              const isSelected = selectedClassId === cls._id;
              const classLabel = formatClassName(
                cls.label || cls.name || cls.value,
                cls.section
              );
              return (
                <TouchableOpacity
                  key={cls._id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedClassId(cls._id);
                  }}
                  style={[
                    styles.classFilterPill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceContainer,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.classFilterPillText,
                      {
                        color: isSelected
                          ? colors.onPrimary
                          : colors.onSurfaceVariant,
                        fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                      },
                    ]}
                  >
                    {classLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sorting Filter Pills */}
          <View style={styles.sortPillsRow}>
            {(mode === "comprehensive"
              ? [
                  { key: "composite", label: "Holistic Rank" },
                  { key: "marks", label: "Top Marks" },
                  { key: "ratings", label: "Top Conduct" },
                  { key: "improving", label: "Most Improved" },
                  { key: "name", label: "Name (A–Z)" },
                  { key: "lowest", label: "Lowest Score" },
                ]
              : mode === "marks"
              ? [
                  { key: "marks", label: "Highest Marks" },
                  { key: "lowest", label: "Lowest Marks" },
                  { key: "name", label: "Name (A–Z)" },
                ]
              : [
                  { key: "ratings", label: "Rank (Highest)" },
                  { key: "lowest", label: "Lowest Score" },
                  { key: "improving", label: "Most Improved" },
                  { key: "name", label: "Name (A–Z)" },
                  { key: "most_rated", label: "Most Evaluations" },
                ]
            ).map((pill) => {
              const isActive = sortBy === pill.key;
              return (
                <TouchableOpacity
                  key={pill.key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSortBy(pill.key);
                  }}
                  style={[
                    styles.sortPillBtn,
                    {
                      backgroundColor: isActive
                        ? colors.primaryContainer || "#EEF2FF"
                        : colors.surfaceContainer,
                      borderColor: isActive
                        ? colors.primary
                        : colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortPillText,
                      {
                        color: isActive
                          ? colors.primary
                          : colors.onSurfaceVariant,
                        fontFamily: isActive ? FONTS.bold : FONTS.medium,
                      },
                    ]}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Master Student Leaderboard List */}
        {isLoading && !dashboardData ? (
          <View style={{ paddingVertical: 40 }}>
            <LoadingState message="Compiling school-wide ratings & rankings..." />
          </View>
        ) : students.length === 0 ? (
          <EmptyState
            icon="sentiment-dissatisfied"
            title="No Students Found"
            message={
              searchQuery || activeTier !== "all" || selectedClassId !== "all"
                ? "No evaluated students matched your search or filters."
                : "No student evaluations have been recorded in this academic year yet."
            }
          />
        ) : (
          <View style={styles.studentsListWrap}>
            <View style={styles.listHeaderRow}>
              <Text
                style={[
                  styles.listHeaderCount,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Showing {students.length} Students • Tap for holistic profile
              </Text>
            </View>

            {students.map((item, index) => {
              const student = item.student;
              const avg = item.overallAverage;
              const ratingInfo = getRatingLabel(avg);
              const rank = item.rank || index + 1;
              const qInfo = item.quadrant ? getQuadrantDetails(item.quadrant) : null;

              // Medal rendering for top 3
              const isTop3 = rank <= 3;
              const medalBadge =
                rank === 1 ? "🥇 #1" : rank === 2 ? "🥈 #2" : rank === 3 ? "🥉 #3" : `#${rank}`;

              const className = item.class
                ? formatClassName(
                    item.class.label || item.class.name,
                    item.class.section
                  )
                : "Class";

              return (
                <Card
                  key={student?._id || index}
                  variant="elevated"
                  style={[
                    styles.studentCard,
                    isTop3 && {
                      borderColor:
                        rank === 1
                          ? "#F59E0B"
                          : rank === 2
                          ? "#94A3B8"
                          : "#D97706",
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedStudentId(student?._id);
                  }}
                >
                  <View style={styles.studentCardContent}>
                    {/* Rank Badge Column */}
                    <View
                      style={[
                        styles.rankCol,
                        {
                          backgroundColor:
                            rank === 1
                              ? "#FEF3C7"
                              : rank === 2
                              ? "#F1F5F9"
                              : rank === 3
                              ? "#FFEDD5"
                              : isDark
                              ? colors.surfaceContainerHigh
                              : "#F3F4F6",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankColText,
                          {
                            color:
                              rank === 1
                                ? "#B45309"
                                : rank === 2
                                ? "#475569"
                                : rank === 3
                                ? "#C2410C"
                                : colors.onSurfaceVariant,
                            fontFamily: isTop3 ? FONTS.bold : FONTS.semiBold,
                          },
                        ]}
                      >
                        {medalBadge}
                      </Text>
                    </View>

                    {/* Student Info Column */}
                    <View style={styles.studentInfoCol}>
                      <UserAvatar user={student} size={42} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[
                            styles.studentNameText,
                            { color: colors.onSurface },
                          ]}
                          numberOfLines={1}
                        >
                          {student?.name || "Student"}
                        </Text>
                        <Text
                          style={[
                            styles.studentSubText,
                            { color: colors.onSurfaceVariant },
                          ]}
                          numberOfLines={1}
                        >
                          {className} • Reg: {student?.regNo || "--"}
                        </Text>

                        {mode === "comprehensive" ? (
                          <View style={styles.comprehensiveDualPillsRow}>
                            <View style={[styles.dualMetricBadge, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF" }]}>
                              <Text style={[styles.dualMetricText, { color: colors.primary }]}>
                                📚 {item.marksScore !== null && item.marksScore !== undefined ? `${item.marksScore.toFixed(1)}%` : "Awaiting Marks"}
                              </Text>
                            </View>
                            <View style={[styles.dualMetricBadge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5" }]}>
                              <Text style={[styles.dualMetricText, { color: "#059669" }]}>
                                ⭐ {item.overallAverage ? `${item.overallAverage.toFixed(2)}★` : "Awaiting Ratings"}
                              </Text>
                            </View>
                            {qInfo && (
                              <View style={[styles.quadrantTagPill, { backgroundColor: qInfo.bg }]}>
                                <Text style={[styles.quadrantTagText, { color: qInfo.color }]}>
                                  {qInfo.label}
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : mode === "marks" ? (
                          <View style={styles.pillarScoresRow}>
                            <Text style={[styles.pillarScoreItem, { color: colors.primary }]}>
                              {item.completedExamsCount || 0} Standardized Exams Completed
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pillarScoresRow}>
                            <Text
                              style={[
                                styles.pillarScoreItem,
                                { color: colors.onSurfaceVariant },
                              ]}
                            >
                              Engage: {item.avgClassEngagement?.toFixed(1) || "--"}
                            </Text>
                            <Text style={{ color: colors.outlineVariant }}>•</Text>
                            <Text
                              style={[
                                styles.pillarScoreItem,
                                { color: colors.onSurfaceVariant },
                              ]}
                            >
                              Behav: {item.avgBehaviourSocial?.toFixed(1) || "--"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Overall Score & Trajectory Column */}
                    <View style={styles.scoreCol}>
                      <View style={styles.scoreBadgeBox}>
                        <Text
                          style={[
                            styles.scoreBigText,
                            {
                              color:
                                mode === "comprehensive"
                                  ? colors.primary
                                  : mode === "marks"
                                  ? "#2563EB"
                                  : ratingInfo.color,
                            },
                          ]}
                        >
                          {mode === "comprehensive"
                            ? item.compositeScore !== null && item.compositeScore !== undefined
                              ? `${item.compositeScore.toFixed(1)}%`
                              : "--"
                            : mode === "marks"
                            ? item.marksScore !== null && item.marksScore !== undefined
                              ? `${item.marksScore.toFixed(1)}%`
                              : "--"
                            : `★ ${avg ? avg.toFixed(2) : "--"}`}
                        </Text>
                        {mode === "comprehensive" ? null : mode === "marks" ? (
                          <Badge
                            variant="secondary"
                            label="Class Weighted"
                            size="xs"
                          />
                        ) : (
                          <Badge
                            variant={ratingInfo.variant}
                            label={ratingInfo.label}
                            size="xs"
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.evalMetaText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {mode === "comprehensive"
                          ? item.evaluationStatus === "complete"
                            ? "Complete"
                            : item.evaluationStatus === "marks_only"
                            ? "Marks Only"
                            : item.evaluationStatus === "ratings_only"
                            ? "Ratings Only"
                            : "Unrated"
                          : mode === "marks"
                          ? `${item.completedExamsCount || 0} Exams`
                          : `${item.monthsCount || 1} mos • ${item.totalRatings || 0} evals`}
                      </Text>

                      {/* Trend Indicator */}
                      {item.trendDirection === "improving" && (
                        <View style={styles.trendRow}>
                          <MaterialIcons
                            name="trending-up"
                            size={14}
                            color="#16A34A"
                          />
                          <Text
                            style={[styles.trendText, { color: "#16A34A" }]}
                          >
                            +{item.trendChange?.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      {item.trendDirection === "declining" && (
                        <View style={styles.trendRow}>
                          <MaterialIcons
                            name="trending-down"
                            size={14}
                            color="#DC2626"
                          />
                          <Text
                            style={[styles.trendText, { color: "#DC2626" }]}
                          >
                            {item.trendChange?.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ────────────────────────────────────────────── */}
      {/*  STUDENT HOLISTIC DRILLDOWN MODAL (READ-ONLY)  */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedStudentId}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedStudentId(null)}
      >
        <View style={styles.drilldownOverlay}>
          <View
            style={[
              styles.drilldownSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.drilldownHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.drilldownSheetTitle,
                    { color: colors.onSurface },
                  ]}
                >
                  Student Holistic Evaluation
                </Text>
                <Text
                  style={[
                    styles.drilldownSheetSub,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  School Leaderboard Profile (Read-Only)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedStudentId(null)}
                style={styles.drilldownCloseBtn}
              >
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {loadingTrend && !studentTrendData ? (
              <View style={{ paddingVertical: 40 }}>
                <LoadingState message="Loading student evolution trend..." />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: "88%" }}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {/* Hero Student Profile */}
                <View
                  style={[
                    styles.drilldownHero,
                    {
                      backgroundColor:
                        colors.surfaceContainer || (isDark ? "#1E1E26" : "#F3F4F6"),
                    },
                  ]}
                >
                  <UserAvatar user={selectedStudentObj?.student} size={54} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.drilldownHeroName,
                        { color: colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedStudentObj?.student?.name}
                    </Text>
                    <Text
                      style={[
                        styles.drilldownHeroSub,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {selectedStudentObj?.class
                        ? formatClassName(
                            selectedStudentObj.class.label ||
                              selectedStudentObj.class.name,
                            selectedStudentObj.class.section
                          )
                        : "Class"}{" "}
                      • Reg: {selectedStudentObj?.student?.regNo || "--"}
                    </Text>
                    <View style={styles.drilldownHeroBadgeRow}>
                      <Text
                        style={[
                          styles.drilldownHeroScore,
                          {
                            color:
                              selectedStudentObj?.compositeScore !== null && selectedStudentObj?.compositeScore !== undefined
                                ? colors.primary
                                : getRatingLabel(selectedStudentObj?.overallAverage).color,
                          },
                        ]}
                      >
                        {selectedStudentObj?.compositeScore !== null && selectedStudentObj?.compositeScore !== undefined
                          ? `🏆 ${selectedStudentObj.compositeScore.toFixed(1)}%`
                          : `★ ${selectedStudentObj?.overallAverage ? selectedStudentObj.overallAverage.toFixed(2) : "--"}`}
                      </Text>
                      {selectedStudentObj?.quadrant && getQuadrantDetails(selectedStudentObj.quadrant) && (
                        <View style={[styles.quadrantTagPill, { backgroundColor: getQuadrantDetails(selectedStudentObj.quadrant).bg }]}>
                          <Text style={[styles.quadrantTagText, { color: getQuadrantDetails(selectedStudentObj.quadrant).color }]}>
                            {getQuadrantDetails(selectedStudentObj.quadrant).label}
                          </Text>
                        </View>
                      )}
                      <Badge
                        variant="neutral"
                        label={`Rank #${selectedStudentObj?.rank || "--"}`}
                        size="sm"
                      />
                    </View>
                  </View>
                </View>

                {/* 50/50 Holistic Evaluation Breakdown Card */}
                <View style={[styles.modalFormulaCard, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "#EEF2FF", borderColor: colors.outlineVariant }]}>
                  <View style={styles.modalFormulaHeader}>
                    <MaterialIcons name="calculate" size={18} color={colors.primary} />
                    <Text style={[styles.modalFormulaTitle, { color: colors.onSurface }]}>
                      Holistic Score Breakdown (50/50)
                    </Text>
                  </View>
                  <Text style={[styles.modalFormulaDesc, { color: colors.onSurfaceVariant }]}>
                    Synthesizes academic exams with classroom conduct & engagement
                  </Text>
                  <View style={styles.formulaEquationRow}>
                    <View style={[styles.formulaBox, { backgroundColor: colors.surfaceContainer }]}>
                      <Text style={[styles.formulaBoxLabel, { color: colors.onSurfaceVariant }]}>📚 Academics (50%)</Text>
                      <Text style={[styles.formulaBoxVal, { color: colors.primary }]}>
                        {selectedStudentObj?.marksScore !== null && selectedStudentObj?.marksScore !== undefined ? `${selectedStudentObj.marksScore.toFixed(1)}%` : "Awaiting"}
                      </Text>
                    </View>
                    <Text style={[styles.formulaOperator, { color: colors.onSurfaceVariant }]}>+</Text>
                    <View style={[styles.formulaBox, { backgroundColor: colors.surfaceContainer }]}>
                      <Text style={[styles.formulaBoxLabel, { color: colors.onSurfaceVariant }]}>⭐ Ratings (50%)</Text>
                      <Text style={[styles.formulaBoxVal, { color: "#059669" }]}>
                        {selectedStudentObj?.ratingsScore !== null && selectedStudentObj?.ratingsScore !== undefined ? `${selectedStudentObj.ratingsScore.toFixed(1)}%` : "Awaiting"}
                      </Text>
                    </View>
                    <Text style={[styles.formulaOperator, { color: colors.onSurfaceVariant }]}>=</Text>
                    <View style={[styles.formulaBox, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.25)" : "#E0E7FF" }]}>
                      <Text style={[styles.formulaBoxLabel, { color: colors.primary }]}>🏆 Composite</Text>
                      <Text style={[styles.formulaBoxVal, { color: colors.primary }]}>
                        {selectedStudentObj?.compositeScore !== null && selectedStudentObj?.compositeScore !== undefined ? `${selectedStudentObj.compositeScore.toFixed(1)}%` : "--"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Standardized Exams & Class Weights Breakdown */}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: colors.onSurface, marginTop: 14 },
                  ]}
                >
                  📚 Standardized Exams & Class Weights
                </Text>
                <Text style={[styles.modalSectionSub, { color: colors.onSurfaceVariant }]}>
                  Distinct exam weightings applied for this student's grade level
                </Text>
                <View
                  style={[
                    styles.examsTableWrap,
                    {
                      backgroundColor:
                        colors.surfaceContainerLowest || colors.surface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  {selectedStudentObj?.examBreakdown && selectedStudentObj.examBreakdown.length > 0 ? (
                    selectedStudentObj.examBreakdown.map((ex, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.examTableRow,
                          idx > 0 && {
                            borderTopWidth: 1,
                            borderTopColor: colors.outlineVariant,
                          },
                        ]}
                      >
                        <View style={styles.examTypeCol}>
                          <Text
                            style={[
                              styles.examTypeName,
                              { color: colors.onSurface },
                            ]}
                          >
                            {ex.type}
                          </Text>
                          <View
                            style={[
                              styles.examWeightPill,
                              {
                                backgroundColor: isDark
                                  ? "rgba(99, 102, 241, 0.15)"
                                  : "#EEF2FF",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.examWeightText,
                                { color: colors.primary },
                              ]}
                            >
                              Weight: {ex.weight || 0}%
                            </Text>
                          </View>
                        </View>
                        <View style={styles.examScoreCol}>
                          {ex.totalMax !== null ? (
                            <>
                              <Text
                                style={[
                                  styles.examScoreText,
                                  { color: colors.onSurface },
                                ]}
                              >
                                {ex.totalObtained} / {ex.totalMax} ({ex.percentage}%)
                              </Text>
                              <Badge
                                variant="success"
                                label="Completed"
                                size="xs"
                              />
                            </>
                          ) : (
                            <>
                              <Text
                                style={[
                                  styles.examPendingText,
                                  { color: colors.onSurfaceVariant },
                                ]}
                              >
                                Pending / Not Yet Taken
                              </Text>
                              <Badge
                                variant="neutral"
                                label="Scheduled"
                                size="xs"
                              />
                            </>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text
                      style={[
                        styles.noExamsText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      No standardized exams recorded for this academic year yet.
                    </Text>
                  )}
                </View>

                {/* 4 Pillars Cumulative Performance */}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: colors.onSurface, marginTop: 14 },
                  ]}
                >
                  ⭐ 4 Core Conduct Pillars (Cumulative)
                </Text>
                <View style={styles.modalCriteriaGrid}>
                  {DATA_POINTS.map((dp) => {
                    const studentKey =
                      dp.key === "classEngagement"
                        ? "avgClassEngagement"
                        : dp.key === "homeworkClasswork"
                        ? "avgHomeworkClasswork"
                        : dp.key === "behaviourSocial"
                        ? "avgBehaviourSocial"
                        : "avgEnglishComm";
                    const score = selectedStudentObj?.[studentKey] || 0;
                    const percent = Math.min(
                      Math.max((score / 5) * 100, 0),
                      100
                    );

                    return (
                      <View
                        key={dp.key}
                        style={[
                          styles.modalCriterionCard,
                          {
                            backgroundColor:
                              colors.surfaceContainerLowest || colors.surface,
                            borderColor: colors.outlineVariant,
                          },
                        ]}
                      >
                        <View style={styles.modalCriterionHeader}>
                          <Text
                            style={[
                              styles.modalCriterionLabel,
                              { color: colors.onSurface },
                            ]}
                            numberOfLines={1}
                          >
                            {dp.label}
                          </Text>
                          <Text
                            style={[
                              styles.modalCriterionScore,
                              { color: dp.color },
                            ]}
                          >
                            {score > 0 ? score.toFixed(2) : "--"}
                          </Text>
                        </View>
                        <ProgressBar
                          progress={percent / 100}
                          color={dp.color}
                          trackColor={isDark ? "#2A2A32" : "#E5E7EB"}
                          height={4}
                        />
                      </View>
                    );
                  })}
                </View>

                {/* Month-over-Month Evolution Trend */}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: colors.onSurface, marginTop: 18 },
                  ]}
                >
                  📈 Monthly Evolution Trend
                </Text>
                <View
                  style={[
                    styles.trendCard,
                    {
                      backgroundColor:
                        colors.surfaceContainerLowest || colors.surface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  {(!studentTrendData?.trend ||
                    studentTrendData.trend.length === 0) ? (
                    <Text
                      style={[
                        styles.noTrendText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      No historical month records found for this student.
                    </Text>
                  ) : (
                    <View style={styles.trendBarsRow}>
                      {studentTrendData.trend.map((tPoint, idx) => {
                        const score = tPoint.overallAverage || 0;
                        const heightPct = Math.min(
                          Math.max((score / 5) * 100, 10),
                          100
                        );
                        const label =
                          tPoint.label || `${tPoint.month}/${tPoint.year}`;
                        return (
                          <View key={idx} style={styles.trendBarCol}>
                            <Text
                              style={[
                                styles.trendBarVal,
                                {
                                  color: getRatingLabel(score).color,
                                },
                              ]}
                            >
                              {score.toFixed(1)}
                            </Text>
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barFill,
                                  {
                                    height: `${heightPct}%`,
                                    backgroundColor: getRatingLabel(score).color,
                                  },
                                ]}
                              />
                            </View>
                            <Text
                              style={[
                                styles.trendBarLabel,
                                { color: colors.onSurfaceVariant },
                              ]}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Read-Only Notice */}
                <View
                  style={[
                    styles.readOnlyNotice,
                    {
                      backgroundColor: isDark
                        ? "rgba(107, 114, 128, 0.15)"
                        : "#F3F4F6",
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={16}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.readOnlyNoticeText,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Teacher and staff access is read-only for educational
                    monitoring. Modification rights remain restricted to
                    Administrators.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: SPACING.md || 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoBannerTitle: {
    fontSize: FONT_SIZES.sm || 13,
    fontFamily: FONTS.bold,
  },
  infoBannerSub: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginTop: 1,
  },
  monthlyTrackerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm || 6,
    borderWidth: 1,
  },
  monthlyTrackerText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  heroLeftCol: {
    flex: 1,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  heroScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroScoreText: {
    fontSize: 34,
    fontFamily: FONTS.bold,
    lineHeight: 40,
  },
  heroScoreMax: {
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  heroRightCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 16,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  heroCoverageText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  heroCoveragePercent: {
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md || 15,
    fontFamily: FONTS.bold,
    marginBottom: 10,
  },
  criteriaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  criterionCard: {
    width: "48%",
    flexGrow: 1,
  },
  criterionCardContent: {
    padding: 12,
  },
  criterionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  criterionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  criterionScore: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  criterionTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  criterionDesc: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    lineHeight: 14,
    height: 28,
  },
  criterionBarWrap: {
    marginTop: 8,
  },
  tierDistCard: {
    marginBottom: 16,
  },
  tierDistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tierDistTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  tierDistSub: {
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  tierPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tierPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.full || 20,
    borderWidth: 1,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  tierPillLabel: {
    fontSize: 11,
  },
  controlsSection: {
    marginBottom: 12,
  },
  classFilterScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  classFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full || 20,
    borderWidth: 1,
  },
  classFilterPillText: {
    fontSize: 12,
  },
  sortPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  sortPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm || 6,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 11,
  },
  studentsListWrap: {
    gap: 10,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  listHeaderCount: {
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  studentCard: {
    borderRadius: RADIUS.md || 12,
  },
  studentCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  rankCol: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rankColText: {
    fontSize: 12,
    textAlign: "center",
  },
  studentInfoCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  studentNameText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  studentSubText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  pillarScoresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  pillarScoreItem: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  scoreCol: {
    alignItems: "flex-end",
    paddingLeft: 8,
  },
  scoreBadgeBox: {
    alignItems: "flex-end",
    gap: 2,
  },
  scoreBigText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  evalMetaText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  trendText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  accessDeniedBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginTop: 14,
    marginBottom: 8,
  },
  accessDeniedSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  drilldownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  drilldownSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 16,
    maxHeight: "90%",
  },
  drilldownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  drilldownSheetTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  drilldownSheetSub: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginTop: 1,
  },
  drilldownCloseBtn: {
    padding: 4,
  },
  drilldownHero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: RADIUS.md || 12,
    marginBottom: 14,
  },
  drilldownHeroName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  drilldownHeroSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  drilldownHeroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  drilldownHeroScore: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  modalCriteriaGrid: {
    gap: 8,
  },
  modalCriterionCard: {
    padding: 10,
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
  },
  modalCriterionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalCriterionLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  modalCriterionScore: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  trendCard: {
    padding: 12,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  noTrendText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "center",
    paddingVertical: 12,
  },
  trendBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 120,
    paddingTop: 16,
  },
  trendBarCol: {
    alignItems: "center",
    flex: 1,
  },
  trendBarVal: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 70,
    justifyContent: "flex-end",
    backgroundColor: "rgba(107, 114, 128, 0.12)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
  },
  trendBarLabel: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    marginTop: 6,
  },
  readOnlyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
    marginTop: 6,
  },
  readOnlyNoticeText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    lineHeight: 16,
  },
  modeTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
  },
  modeTabTitle: {
    fontSize: 12,
  },
  heroSplitMetricsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  heroSplitPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full || 12,
  },
  heroSplitPillText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  comprehensiveDualPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    flexWrap: "wrap",
  },
  dualMetricBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs || 4,
  },
  dualMetricText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  quadrantTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs || 4,
  },
  quadrantTagText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  modalFormulaCard: {
    padding: 12,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalFormulaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  modalFormulaTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  modalFormulaDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginBottom: 8,
  },
  formulaEquationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formulaBox: {
    flex: 1,
    padding: 8,
    borderRadius: RADIUS.sm || 6,
    alignItems: "center",
  },
  formulaBoxLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginBottom: 2,
  },
  formulaBoxVal: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  formulaOperator: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    paddingHorizontal: 4,
  },
  modalSectionSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginBottom: 8,
  },
  examsTableWrap: {
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  examTableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  examTypeCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  examTypeName: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  examWeightPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs || 4,
  },
  examWeightText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  examScoreCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  examScoreText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  examPendingText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  noExamsText: {
    padding: 16,
    textAlign: "center",
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
});
