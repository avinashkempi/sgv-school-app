import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, RADIUS, SPACING } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery, keepPreviousData } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import TextInput from "../../components/TextInput";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { LoadingState, EmptyState } from "../../components/StateComponents";
import { useLabel } from "../../context/LabelsContext";
import { getISTMonthYear, getPreviousMonthYear } from "../../utils/date";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CRITERIA_DEFINITIONS = [
  {
    key: "classEngagement",
    label: "Class Engagement",
    desc: "Attentiveness, participation, asking and answering questions",
    icon: "record-voice-over",
    accent: "#4F46E5",
  },
  {
    key: "homeworkClasswork",
    label: "Homework & Classwork",
    desc: "Completing daily assignments and class tasks responsibly",
    icon: "assignment-turned-in",
    accent: "#0284C7",
  },
  {
    key: "behaviourSocial",
    label: "Behaviour & Social",
    desc: "Respectful conduct, teamwork, and classroom discipline",
    icon: "groups",
    accent: "#16A34A",
  },
  {
    key: "englishComm",
    label: "English/Subject Communication",
    desc: "Expressing ideas clearly and confidently in English or subject language",
    icon: "chat",
    accent: "#D97706",
  },
];

const SCALE_MAP = {
  1: { label: "Needs significant improvement", color: "#DC2626" },
  2: { label: "Needs improvement", color: "#EA580C" },
  3: { label: "Meets expectation", color: "#4F46E5" },
  4: { label: "Good", color: "#16A34A" },
  5: { label: "Excellent", color: "#059669" },
};

const TABS = [
  { id: "cumulative", label: "Cumulative", icon: "stars" },
  { id: "monthly", label: "Month-by-Month", icon: "calendar-month" },
  { id: "subjects", label: "By Subject & Feedback", icon: "rate-review" },
];

export default function StudentRatingsScreen() {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { t } = useLabel();

  const currentMY = useMemo(() => getISTMonthYear(), []);
  const defaultMY = useMemo(() => getPreviousMonthYear(), []);
  const [selectedMonth, setSelectedMonth] = useState(defaultMY.month);
  const [selectedYear, setSelectedYear] = useState(defaultMY.year);
  const [activeTab, setActiveTab] = useState("cumulative"); // 'cumulative' (default) | 'monthly' | 'subjects'
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  // Fetch student self-service ratings
  const {
    data: ratingsData,
    isLoading,
    isRefetching,
    refetch,
  } = useApiQuery(
    ["myStudentRatings", selectedMonth, selectedYear],
    `${apiConfig.baseUrl}/student-ratings/my-ratings?month=${selectedMonth}&year=${selectedYear}`,
    {
      placeholderData: keepPreviousData,
      ...CACHE_TIERS.MODERATE,
    }
  );

  const monthName = MONTHS[selectedMonth - 1] || `Month ${selectedMonth}`;

  const isCurrentMonth =
    selectedMonth === currentMY.month && selectedYear === currentMY.year;

  const canGoNext =
    selectedYear < currentMY.year ||
    (selectedYear === currentMY.year && selectedMonth < currentMY.month);

  const handlePrevMonth = () => {
    Haptics.selectionAsync().catch(() => {});
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    Haptics.selectionAsync().catch(() => {});
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const jumpToCurrentMonth = () => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedMonth(currentMY.month);
    setSelectedYear(currentMY.year);
    setActiveTab("monthly");
  };

  // Monthly Metrics
  const overallAvg = ratingsData?.overallAverage;
  const classBenchmark = ratingsData?.classBenchmark;
  const dpAverages = ratingsData?.dataPointAverages || {};
  const subjects = useMemo(() => ratingsData?.subjects || [], [ratingsData?.subjects]);
  const monthStatus = ratingsData?.monthStatus || "finalized";

  // Cumulative Metrics
  const cumulativeAvg = ratingsData?.cumulativeAverage ?? ratingsData?.yearAverage;
  const cumulativeCount = ratingsData?.cumulativeCount || 0;
  const cumulativeEval = ratingsData?.cumulativeEvaluation;
  const cumulativeDataPoints = ratingsData?.cumulativeDataPoints || {};
  const classComparison = ratingsData?.classComparison;

  // Real-time Current Month Status
  const currentMonthData = ratingsData?.currentMonth;

  // Tab 3 Data: Cumulative Subjects & Teacher Remarks
  const cumulativeSubjects = useMemo(
    () => ratingsData?.cumulativeSubjects || [],
    [ratingsData?.cumulativeSubjects]
  );
  const teacherRemarksFeed = useMemo(
    () => ratingsData?.teacherRemarksFeed || [],
    [ratingsData?.teacherRemarksFeed]
  );
  const trend = useMemo(() => ratingsData?.trend || [], [ratingsData?.trend]);

  const ratedSubjectsCount = useMemo(
    () => subjects.filter((s) => s.isRated).length,
    [subjects]
  );

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase().trim();
    return subjects.filter((s) => (s.subjectName || "").toLowerCase().includes(q));
  }, [subjects, searchQuery]);

  const filteredCumulativeSubjects = useMemo(() => {
    if (!searchQuery.trim()) return cumulativeSubjects;
    const q = searchQuery.toLowerCase().trim();
    return cumulativeSubjects.filter((s) => (s.subjectName || "").toLowerCase().includes(q));
  }, [cumulativeSubjects, searchQuery]);

  // Overall rating label and status for selected month
  const monthlyRatingStatus = useMemo(() => {
    if (ratingsData?.evaluation && ratingsData.evaluation.label !== "Unrated") {
      return ratingsData.evaluation;
    }
    if (!overallAvg) {
      return isCurrentMonth
        ? { label: "In Progress", variant: "warning" }
        : { label: "Not Rated", variant: "neutral" };
    }
    if (overallAvg >= 4.5) return { label: "Excellent", variant: "success" };
    if (overallAvg >= 3.5) return { label: "Good", variant: "success" };
    if (overallAvg >= 2.5) return { label: "Meets Expectation", variant: "primary" };
    if (overallAvg >= 2.0) return { label: "Needs Improvement", variant: "warning" };
    return { label: "Needs Significant Imp.", variant: "danger" };
  }, [overallAvg, ratingsData?.evaluation, isCurrentMonth]);

  // Cumulative performance tier
  const cumulativeRatingStatus = useMemo(() => {
    if (cumulativeEval && cumulativeEval.label !== "Unrated") {
      return cumulativeEval;
    }
    if (!cumulativeAvg) return { label: "Not Rated", variant: "neutral" };
    if (cumulativeAvg >= 4.5) return { label: "Excellent", variant: "success" };
    if (cumulativeAvg >= 3.5) return { label: "Good", variant: "success" };
    if (cumulativeAvg >= 2.5) return { label: "Meets Expectation", variant: "primary" };
    if (cumulativeAvg >= 2.0) return { label: "Needs Improvement", variant: "warning" };
    return { label: "Needs Significant Imp.", variant: "danger" };
  }, [cumulativeAvg, cumulativeEval]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* App Header */}
      <AppHeader
        title={t("student.ratingsTitle", "Student Ratings")}
        subtitle={
          activeTab === "cumulative"
            ? "Academic Year Cumulative"
            : activeTab === "monthly"
            ? `${monthName} ${selectedYear}`
            : "Subject Standings & Feedback"
        }
        showBack={true}
      />

      {/* 3-Tab Segmented View Bar */}
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: colors.surfaceContainerLow || colors.surface,
            borderBottomColor: colors.outlineVariant,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab(tab.id);
              }}
              style={[
                styles.tabItem,
                isActive && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 3,
                },
              ]}
            >
              <MaterialIcons
                name={tab.icon}
                size={18}
                color={isActive ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabItemText,
                  {
                    color: isActive ? colors.primary : colors.onSurfaceVariant,
                    fontFamily: isActive ? FONTS.bold : FONTS.medium,
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Month Navigation Strip (Displayed when Monthly Tab is active) */}
      {activeTab === "monthly" && (
        <View
          style={[
            styles.monthPickerBar,
            {
              backgroundColor: colors.surfaceContainerLow || colors.surface,
              borderBottomColor: colors.outlineVariant,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={styles.monthNavBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="chevron-left"
              size={24}
              color={colors.onSurface}
            />
          </TouchableOpacity>

          <View style={styles.monthLabelContainer}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.monthLabelText, { color: colors.onSurface }]}>
                {monthName} {selectedYear}
              </Text>
              {isCurrentMonth ? (
                <Badge
                  variant={monthStatus === "completed" ? "success" : "warning"}
                  label={monthStatus === "completed" ? "Current" : "In Progress"}
                  size="sm"
                />
              ) : (
                <TouchableOpacity
                  onPress={jumpToCurrentMonth}
                  style={[
                    styles.jumpCurrentPill,
                    { backgroundColor: colors.primaryContainer || "#EEF2FF" },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.jumpCurrentText,
                      { color: colors.onPrimaryContainer || colors.primary },
                    ]}
                  >
                    {t("common.currentMonth", "Jump to Current")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[
                styles.monthSubLabel,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {ratedSubjectsCount} of {subjects.length} Ratable Subjects Evaluated
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            disabled={!canGoNext}
            style={[
              styles.monthNavBtn,
              { opacity: canGoNext ? 1 : 0.3 },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.onSurface}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Scroll Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading && !ratingsData ? (
          <View style={{ marginTop: 60 }}>
            <LoadingState message="Loading your ratings..." />
          </View>
        ) : activeTab === "cumulative" ? (
          /* ═════════════════════════════════════════════════════════════ */
          /* TAB 1: CUMULATIVE VIEW (DEFAULT)                              */
          /* ═════════════════════════════════════════════════════════════ */
          <>
            {/* Hero Cumulative KPI Card */}
            <Card
              variant="elevated"
              style={[styles.heroCard, { backgroundColor: colors.surfaceContainerLow || colors.surface }]}
              contentStyle={styles.heroCardContent}
            >
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
                    Academic Year Cumulative Rating
                  </Text>
                  <View style={styles.heroScoreRow}>
                    <Text
                      style={[
                        styles.heroScoreLarge,
                        { color: cumulativeAvg ? colors.primary : colors.onSurfaceVariant },
                      ]}
                    >
                      {cumulativeAvg ? `★ ${cumulativeAvg}` : "—"}
                    </Text>
                    <Text style={[styles.heroScoreMax, { color: colors.onSurfaceVariant }]}>
                      / 5.0
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <Badge
                      variant={cumulativeRatingStatus.variant}
                      label={cumulativeRatingStatus.label}
                      size="sm"
                    />
                    <Text style={[styles.heroEvalCountText, { color: colors.onSurfaceVariant }]}>
                      {cumulativeCount} evaluation{cumulativeCount !== 1 ? "s" : ""} across {trend.length} month{trend.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.heroIconCircle,
                    {
                      backgroundColor: isDark
                        ? "rgba(99, 102, 241, 0.18)"
                        : "#EEF2FF",
                    },
                  ]}
                >
                  <MaterialIcons name="stars" size={32} color={colors.primary} />
                </View>
              </View>

              {/* Class Peer Comparison Section */}
              {classComparison && (
                <View
                  style={[
                    styles.classComparisonBox,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(0, 0, 0, 0.025)",
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.classComparisonHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="leaderboard" size={18} color={colors.primary} />
                      <Text style={[styles.classComparisonTitle, { color: colors.onSurface }]}>
                        Class Peer Standing
                      </Text>
                    </View>
                    <Badge
                      variant={
                        classComparison.difference != null && classComparison.difference >= 0
                          ? "success"
                          : "neutral"
                      }
                      label={classComparison.standingLabel || "On Par with Class"}
                      size="sm"
                    />
                  </View>

                  <View style={styles.classComparisonGrid}>
                    <View style={styles.classComparisonItem}>
                      <Text style={[styles.classComparisonItemLabel, { color: colors.onSurfaceVariant }]}>
                        Class Average
                      </Text>
                      <Text style={[styles.classComparisonItemValue, { color: colors.onSurface }]}>
                        ★ {classComparison.classCumulativeAverage ?? "—"}
                      </Text>
                    </View>

                    <View style={styles.classComparisonItem}>
                      <Text style={[styles.classComparisonItemLabel, { color: colors.onSurfaceVariant }]}>
                        Difference
                      </Text>
                      <Text
                        style={[
                          styles.classComparisonItemValue,
                          {
                            color:
                              classComparison.difference != null && classComparison.difference >= 0
                                ? isDark
                                  ? "#4ADE80"
                                  : "#16A34A"
                                : isDark
                                ? "#F87171"
                                : "#DC2626",
                          },
                        ]}
                      >
                        {classComparison.difference != null && classComparison.difference >= 0
                          ? `+${classComparison.difference}`
                          : `${classComparison.difference ?? "0.0"}`}
                      </Text>
                    </View>

                    {classComparison.rank && (
                      <View style={styles.classComparisonItem}>
                        <Text style={[styles.classComparisonItemLabel, { color: colors.onSurfaceVariant }]}>
                          Class Rank
                        </Text>
                        <Text style={[styles.classComparisonItemValue, { color: colors.primary }]}>
                          #{classComparison.rank}
                          <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: colors.onSurfaceVariant }}>
                            /{classComparison.totalStudents}
                          </Text>
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </Card>

            {/* Current Month Live In-Progress Card */}
            {currentMonthData && (
              <Card
                variant="outlined"
                style={[
                  styles.currentMonthHeroCard,
                  {
                    backgroundColor:
                      currentMonthData.status === "completed"
                        ? isDark
                          ? "rgba(34, 197, 94, 0.08)"
                          : "#F0FDF4"
                        : currentMonthData.status === "in_progress"
                        ? isDark
                          ? "rgba(245, 158, 11, 0.08)"
                          : "#FFFBEB"
                        : isDark
                        ? "rgba(99, 102, 241, 0.08)"
                        : "#EEF2FF",
                    borderColor:
                      currentMonthData.status === "completed"
                        ? isDark
                          ? "rgba(34, 197, 94, 0.3)"
                          : "#86EFAC"
                        : currentMonthData.status === "in_progress"
                        ? isDark
                          ? "rgba(245, 158, 11, 0.3)"
                          : "#FCD34D"
                        : isDark
                        ? "rgba(99, 102, 241, 0.3)"
                        : "#C7D2FE",
                  },
                ]}
                contentStyle={styles.currentMonthHeroCardContent}
              >
                <View style={styles.currentMonthHeroTopRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <MaterialIcons
                      name={
                        currentMonthData.status === "completed"
                          ? "check-circle"
                          : currentMonthData.status === "in_progress"
                          ? "pending-actions"
                          : "schedule"
                      }
                      size={22}
                      color={
                        currentMonthData.status === "completed"
                          ? isDark
                            ? "#4ADE80"
                            : "#16A34A"
                          : currentMonthData.status === "in_progress"
                          ? isDark
                            ? "#FBBF24"
                            : "#D97706"
                          : colors.primary
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.currentMonthHeroTitle, { color: colors.onSurface }]}>
                        Current Month: {currentMonthData.monthName} {currentMonthData.year}
                      </Text>
                      <Text style={[styles.currentMonthHeroStatusSub, { color: colors.onSurfaceVariant }]}>
                        {currentMonthData.status === "completed"
                          ? "All monthly subjects evaluated"
                          : currentMonthData.status === "in_progress"
                          ? `Evaluation in progress (${currentMonthData.ratedCount} of ${currentMonthData.totalSubjects} rated)`
                          : `Evaluation period open (${currentMonthData.totalSubjects} ratable subjects)`}
                      </Text>
                    </View>
                  </View>

                  <Badge
                    variant={
                      currentMonthData.status === "completed"
                        ? "success"
                        : currentMonthData.status === "in_progress"
                        ? "warning"
                        : "primary"
                    }
                    label={
                      currentMonthData.status === "completed"
                        ? `Complete • ★ ${currentMonthData.provisionalAverage}`
                        : currentMonthData.status === "in_progress"
                        ? `★ ${currentMonthData.provisionalAverage} Provisional`
                        : "Evaluating"
                    }
                    size="md"
                  />
                </View>

                {/* Progress Bar for Current Month */}
                {currentMonthData.totalSubjects > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <View
                      style={[
                        styles.currentMonthProgressTrack,
                        {
                          backgroundColor: isDark
                            ? "rgba(255, 255, 255, 0.12)"
                            : "rgba(0, 0, 0, 0.08)",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.currentMonthProgressFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.round(
                                (currentMonthData.ratedCount /
                                  currentMonthData.totalSubjects) *
                                  100
                              )
                            )}%`,
                            backgroundColor:
                              currentMonthData.status === "completed"
                                ? isDark
                                  ? "#4ADE80"
                                  : "#16A34A"
                                : currentMonthData.status === "in_progress"
                                ? isDark
                                  ? "#FBBF24"
                                  : "#D97706"
                                : colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Jump to Month Details Button */}
                <TouchableOpacity
                  onPress={jumpToCurrentMonth}
                  style={styles.currentMonthJumpBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.currentMonthJumpBtnText, { color: colors.primary }]}>
                    View {currentMonthData.monthName} subject breakdown & remarks →
                  </Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* 4 Evaluation Criteria (Cumulative Academic Year) */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="fact-check" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  Cumulative Criteria (Academic Year)
                </Text>
              </View>

              {CRITERIA_DEFINITIONS.map((crit) => {
                const score = cumulativeDataPoints[crit.key];
                const roundedScore = score ? Math.round(score) : null;
                const scaleInfo = roundedScore ? SCALE_MAP[roundedScore] : null;

                return (
                  <Card
                    key={crit.key}
                    variant="elevated"
                    style={styles.criteriaCard}
                    contentStyle={styles.criteriaCardContent}
                  >
                    <View style={styles.criteriaTopRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View
                          style={[
                            styles.criteriaIconBox,
                            { backgroundColor: `${crit.accent}15` },
                          ]}
                        >
                          <MaterialIcons
                            name={crit.icon}
                            size={20}
                            color={crit.accent}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.criteriaName,
                              { color: colors.onSurface },
                            ]}
                          >
                            {crit.label}
                          </Text>
                          <Text
                            style={[
                              styles.criteriaDescText,
                              { color: colors.onSurfaceVariant },
                            ]}
                            numberOfLines={1}
                          >
                            {crit.desc}
                          </Text>
                        </View>
                      </View>

                      {/* Score Badge */}
                      <View style={styles.criteriaScoreCol}>
                        <Text
                          style={[
                            styles.criteriaScoreVal,
                            { color: score ? colors.onSurface : colors.onSurfaceVariant },
                          ]}
                        >
                          {score ? `★ ${score}` : "—"}
                        </Text>
                        {scaleInfo && (
                          <Text
                            style={[
                              styles.criteriaScaleLabel,
                              { color: scaleInfo.color },
                            ]}
                          >
                            {scaleInfo.label}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ marginTop: 10 }}>
                      <ProgressBar
                        progress={score ? Math.round((score / 5) * 100) : 0}
                        max={100}
                        variant={score >= 4 ? "success" : score >= 3 ? "primary" : "warning"}
                        height={6}
                        borderRadius={3}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>

            {/* Academic Year Monthly Trend Section */}
            {trend.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="trending-up" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                    Academic Year Trend
                  </Text>
                </View>

                <Card variant="elevated" style={styles.trendCard} contentStyle={styles.trendCardContent}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendBarRow}>
                    {trend.map((tItem) => {
                      const tMonthShort = MONTHS[tItem.month - 1]?.slice(0, 3) || `M${tItem.month}`;
                      const isCurrent = tItem.month === currentMY.month && tItem.year === currentMY.year;
                      const barHeight = Math.max(20, Math.round((tItem.averageScore / 5) * 100));

                      return (
                        <TouchableOpacity
                          key={`${tItem.year}-${tItem.month}`}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            setSelectedMonth(tItem.month);
                            setSelectedYear(tItem.year);
                            setActiveTab("monthly");
                          }}
                          style={[
                            styles.trendBarCol,
                            isCurrent && {
                              backgroundColor: colors.primaryContainer || "#EEF2FF",
                              borderRadius: RADIUS.md,
                            },
                          ]}
                        >
                          <Text style={[styles.trendBarScore, { color: isCurrent ? colors.primary : colors.onSurface }]}>
                            ★ {tItem.averageScore}
                          </Text>
                          <View style={styles.trendBarTrack}>
                            <View
                              style={[
                                styles.trendBarFill,
                                {
                                  height: barHeight,
                                  backgroundColor: isCurrent ? colors.primary : colors.secondary || "#818CF8",
                                },
                              ]}
                            />
                          </View>
                          <View style={{ alignItems: "center" }}>
                            <Text
                              style={[
                                styles.trendBarLabel,
                                {
                                  color: isCurrent ? colors.primary : colors.onSurfaceVariant,
                                  fontFamily: isCurrent ? FONTS.bold : FONTS.medium,
                                },
                              ]}
                            >
                              {tMonthShort}
                            </Text>
                            {isCurrent && (
                              <Text style={{ fontSize: 9, color: colors.primary, fontFamily: FONTS.semiBold }}>
                                Live
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </Card>
              </View>
            )}

            {/* Guidance Info Banner */}
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: colors.surfaceContainerLow || colors.surface,
                  borderColor: colors.outlineVariant,
                },
              ]}
            >
              <MaterialIcons name="lightbulb-outline" size={20} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.onSurfaceVariant }]}>
                Cumulative ratings reflect your holistic academic standing across all months. Tap any month in the trend or switch to "Month-by-Month" to inspect individual subject scores!
              </Text>
            </View>
          </>
        ) : activeTab === "monthly" ? (
          /* ═════════════════════════════════════════════════════════════ */
          /* TAB 2: MONTH-BY-MONTH VIEW                                   */
          /* ═════════════════════════════════════════════════════════════ */
          <>
            {/* In-Progress Notification for Current Month */}
            {isCurrentMonth && monthStatus !== "completed" && (
              <View
                style={[
                  styles.inProgressNoticeCard,
                  {
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
                    borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#FDE68A",
                  },
                ]}
              >
                <MaterialIcons
                  name="hourglass-top"
                  size={20}
                  color={isDark ? "#FBBF24" : "#D97706"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.inProgressNoticeTitle,
                      { color: isDark ? "#FDE68A" : "#92400E" },
                    ]}
                  >
                    {monthName} Evaluation in Progress
                  </Text>
                  <Text
                    style={[
                      styles.inProgressNoticeSub,
                      { color: isDark ? "#FCD34D" : "#B45309" },
                    ]}
                  >
                    {ratedSubjectsCount > 0
                      ? `${ratedSubjectsCount} of ${subjects.length} subjects evaluated. This score is provisional and will update as teachers submit.`
                      : "Subject teachers are currently submitting their ratings. Your evaluation will update as teachers submit."}
                  </Text>
                </View>
              </View>
            )}

            {/* KPI Cards Row */}
            <View style={styles.kpiRow}>
              {/* Monthly Average Card */}
              <Card
                variant="elevated"
                style={[styles.kpiCard, { flex: 1.2 }]}
                contentStyle={styles.kpiCardContent}
              >
                <Text style={[styles.kpiTitle, { color: colors.onSurfaceVariant }]}>
                  {isCurrentMonth && monthStatus !== "completed" ? "Provisional Avg" : "Monthly Average"}
                </Text>
                <View style={styles.kpiScoreRow}>
                  <Text
                    style={[
                      styles.kpiLargeScore,
                      { color: overallAvg ? colors.primary : colors.onSurfaceVariant },
                    ]}
                  >
                    {overallAvg ? `★ ${overallAvg}` : isCurrentMonth ? "Pending" : "—"}
                  </Text>
                  {overallAvg != null && (
                    <Text style={[styles.kpiMaxScore, { color: colors.onSurfaceVariant }]}>
                      / 5.0
                    </Text>
                  )}
                </View>
                <View style={{ marginTop: 4 }}>
                  <Badge
                    variant={monthlyRatingStatus.variant}
                    label={monthlyRatingStatus.label}
                    size="sm"
                  />
                </View>
              </Card>

              {/* Class Benchmark Card */}
              <Card
                variant="outlined"
                style={[styles.kpiCard, { flex: 1, borderColor: colors.outlineVariant }]}
                contentStyle={styles.kpiCardContent}
              >
                <Text style={[styles.kpiTitle, { color: colors.onSurfaceVariant }]}>
                  Class Benchmark
                </Text>
                <View style={styles.kpiScoreRow}>
                  <Text style={[styles.kpiScoreMedium, { color: colors.onSurface }]}>
                    {classBenchmark ? `★ ${classBenchmark}` : "—"}
                  </Text>
                </View>
                {overallAvg && classBenchmark ? (
                  <Text
                    style={[
                      styles.kpiDiffText,
                      {
                        color:
                          overallAvg >= classBenchmark
                            ? colors.success
                            : colors.warning || "#D97706",
                      },
                    ]}
                  >
                    {overallAvg >= classBenchmark
                      ? `+${(overallAvg - classBenchmark).toFixed(2)} vs class`
                      : `${(overallAvg - classBenchmark).toFixed(2)} vs class`}
                  </Text>
                ) : (
                  <Text style={[styles.kpiDiffText, { color: colors.onSurfaceVariant }]}>
                    Class Average
                  </Text>
                )}
              </Card>

              {/* Year Average Card */}
              <Card
                variant="outlined"
                style={[styles.kpiCard, { flex: 1, borderColor: colors.outlineVariant }]}
                contentStyle={styles.kpiCardContent}
              >
                <Text style={[styles.kpiTitle, { color: colors.onSurfaceVariant }]}>
                  Academic Year
                </Text>
                <View style={styles.kpiScoreRow}>
                  <Text style={[styles.kpiScoreMedium, { color: colors.onSurface }]}>
                    {cumulativeAvg ? `★ ${cumulativeAvg}` : "—"}
                  </Text>
                </View>
                <Text style={[styles.kpiDiffText, { color: colors.onSurfaceVariant }]}>
                  Cumulative
                </Text>
              </Card>
            </View>

            {/* Criteria Detailed Breakdown for Selected Month */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="fact-check" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  Evaluation Criteria ({monthName})
                </Text>
              </View>

              {CRITERIA_DEFINITIONS.map((crit) => {
                const score = dpAverages[crit.key];
                const roundedScore = score ? Math.round(score) : null;
                const scaleInfo = roundedScore ? SCALE_MAP[roundedScore] : null;

                return (
                  <Card
                    key={crit.key}
                    variant="elevated"
                    style={styles.criteriaCard}
                    contentStyle={styles.criteriaCardContent}
                  >
                    <View style={styles.criteriaTopRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View
                          style={[
                            styles.criteriaIconBox,
                            { backgroundColor: `${crit.accent}15` },
                          ]}
                        >
                          <MaterialIcons
                            name={crit.icon}
                            size={20}
                            color={crit.accent}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.criteriaName, { color: colors.onSurface }]}>
                            {crit.label}
                          </Text>
                          <Text
                            style={[styles.criteriaDescText, { color: colors.onSurfaceVariant }]}
                            numberOfLines={1}
                          >
                            {crit.desc}
                          </Text>
                        </View>
                      </View>

                      {/* Score Badge */}
                      <View style={styles.criteriaScoreCol}>
                        <Text
                          style={[
                            styles.criteriaScoreVal,
                            { color: score ? colors.onSurface : colors.onSurfaceVariant },
                          ]}
                        >
                          {score ? `★ ${score}` : "—"}
                        </Text>
                        {scaleInfo && (
                          <Text style={[styles.criteriaScaleLabel, { color: scaleInfo.color }]}>
                            {scaleInfo.label}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ marginTop: 10 }}>
                      <ProgressBar
                        progress={score ? Math.round((score / 5) * 100) : 0}
                        max={100}
                        variant={score >= 4 ? "success" : score >= 3 ? "primary" : "warning"}
                        height={6}
                        borderRadius={3}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>

            {/* Subject Breakdown for Selected Month */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="menu-book" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  Subjects Evaluated ({monthName})
                </Text>
              </View>

              {/* Search Input */}
              <View style={{ marginBottom: 12 }}>
                <TextInput
                  placeholder={t("student.searchSubjects", "Search subjects...")}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  leftIcon="search"
                  clearButton={true}
                  size="sm"
                />
              </View>

              {filteredSubjects.length === 0 ? (
                <EmptyState
                  icon="menu-book"
                  title={t("student.noSubjectsFound", "No subjects found")}
                  message={t(
                    "student.noSubjectsDesc",
                    "No ratable subjects match your query for this class."
                  )}
                />
              ) : (
                filteredSubjects.map((sub) => {
                  const isExpanded = expandedSubjectId === sub.subjectId;

                  return (
                    <Card
                      key={sub.subjectId}
                      variant="elevated"
                      style={styles.subjectCard}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setExpandedSubjectId(isExpanded ? null : sub.subjectId);
                      }}
                    >
                      <View style={styles.subjectCardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={[
                              styles.subjectNameText,
                              { color: colors.onSurface },
                            ]}
                            numberOfLines={1}
                          >
                            {sub.subjectName}
                          </Text>
                          <Text
                            style={[
                              styles.subjectStatusSub,
                              { color: colors.onSurfaceVariant },
                            ]}
                          >
                            {sub.isExempt
                              ? "Exempt / On Leave"
                              : sub.isRated
                              ? `${monthName} Evaluation Complete`
                              : isCurrentMonth
                              ? "Evaluation underway"
                              : "Not evaluated this month"}
                          </Text>
                        </View>

                        {sub.isExempt ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Badge
                              variant="neutral"
                              icon="pause-circle-filled"
                              label="Exempt"
                              size="md"
                            />
                            <MaterialIcons
                              name={isExpanded ? "expand-less" : "expand-more"}
                              size={22}
                              color={colors.onSurfaceVariant}
                            />
                          </View>
                        ) : sub.isRated ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Badge
                              variant="success"
                              icon="check-circle"
                              label={`★ ${sub.averageScore}`}
                              size="md"
                            />
                            <MaterialIcons
                              name={isExpanded ? "expand-less" : "expand-more"}
                              size={22}
                              color={colors.onSurfaceVariant}
                            />
                          </View>
                        ) : (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Badge
                              variant={isCurrentMonth ? "warning" : "neutral"}
                              icon={isCurrentMonth ? "hourglass-empty" : "history"}
                              label={isCurrentMonth ? "Pending" : "Not Rated"}
                              size="sm"
                            />
                          </View>
                        )}
                      </View>

                      {/* Expanded 4 Criteria Breakdown & Remarks */}
                      {isExpanded && sub.isRated && (
                        <View
                          style={[
                            styles.subjectExpandedDetails,
                            {
                              borderTopColor: colors.outlineVariant,
                              backgroundColor: colors.surfaceContainerLow || colors.surface,
                            },
                          ]}
                        >
                          {[
                            {
                              label: "Class Engagement",
                              val: sub.classEngagement,
                              icon: "record-voice-over",
                            },
                            {
                              label: "Homework & Classwork",
                              val: sub.homeworkClasswork,
                              icon: "assignment-turned-in",
                            },
                            {
                              label: "Behaviour & Social",
                              val: sub.behaviourSocial,
                              icon: "groups",
                            },
                            {
                              label: "English/Subject Communication",
                              val: sub.englishComm,
                              icon: "chat",
                            },
                          ].map((item) => (
                            <View key={item.label} style={styles.criteriaDetailRow}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                                <MaterialIcons
                                  name={item.icon}
                                  size={16}
                                  color={colors.primary}
                                />
                                <Text
                                  style={[
                                    styles.criteriaDetailLabel,
                                    { color: colors.onSurface },
                                  ]}
                                >
                                  {item.label}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.criteriaDetailScore,
                                  { color: colors.onSurface },
                                ]}
                              >
                                {item.val ? `★ ${item.val} / 5` : "—"}
                              </Text>
                            </View>
                          ))}

                          {/* Teacher Remarks if present */}
                          {sub.remarks ? (
                            <View
                              style={[
                                styles.subjectRemarkBox,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(99, 102, 241, 0.12)"
                                    : "#EEF2FF",
                                  borderColor: colors.outlineVariant,
                                },
                              ]}
                            >
                              <MaterialIcons name="format-quote" size={18} color={colors.primary} />
                              <Text style={[styles.subjectRemarkText, { color: colors.onSurface }]}>
                                {sub.remarks}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </Card>
                  );
                })
              )}
            </View>
          </>
        ) : (
          /* ═════════════════════════════════════════════════════════════ */
          /* TAB 3: BY SUBJECT & TEACHER FEEDBACK                          */
          /* ═════════════════════════════════════════════════════════════ */
          <>
            {/* Subject-Wise Cumulative Standings */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="auto-stories" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  Cumulative Performance by Subject
                </Text>
              </View>

              {/* Search Input */}
              <View style={{ marginBottom: 12 }}>
                <TextInput
                  placeholder={t("student.searchSubjects", "Search subjects...")}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  leftIcon="search"
                  clearButton={true}
                  size="sm"
                />
              </View>

              {filteredCumulativeSubjects.length === 0 ? (
                <EmptyState
                  icon="menu-book"
                  title="No Subjects Found"
                  message="No ratable subjects match your query."
                />
              ) : (
                filteredCumulativeSubjects.map((sub) => {
                  const isExpanded = expandedSubjectId === sub.subjectId;
                  const crit = sub.criteriaAverages || {};

                  return (
                    <Card
                      key={sub.subjectId}
                      variant="elevated"
                      style={styles.subjectCard}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setExpandedSubjectId(isExpanded ? null : sub.subjectId);
                      }}
                    >
                      <View style={styles.subjectCardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={[
                              styles.subjectNameText,
                              { color: colors.onSurface },
                            ]}
                            numberOfLines={1}
                          >
                            {sub.subjectName}
                          </Text>
                          <Text
                            style={[
                              styles.subjectStatusSub,
                              { color: colors.onSurfaceVariant },
                            ]}
                          >
                            {sub.evaluatedMonthsCount > 0
                              ? `Evaluated in ${sub.evaluatedMonthsCount} month${sub.evaluatedMonthsCount !== 1 ? "s" : ""}`
                              : "No evaluations yet this year"}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Badge
                            variant={sub.cumulativeAverage ? sub.evaluation?.variant || "primary" : "neutral"}
                            icon={sub.cumulativeAverage ? "stars" : "history"}
                            label={sub.cumulativeAverage ? `★ ${sub.cumulativeAverage}` : "Not Rated"}
                            size="md"
                          />
                          <MaterialIcons
                            name={isExpanded ? "expand-less" : "expand-more"}
                            size={22}
                            color={colors.onSurfaceVariant}
                          />
                        </View>
                      </View>

                      {/* Expanded Criteria Breakdown for this Subject */}
                      {isExpanded && sub.evaluatedMonthsCount > 0 && (
                        <View
                          style={[
                            styles.subjectExpandedDetails,
                            {
                              borderTopColor: colors.outlineVariant,
                              backgroundColor: colors.surfaceContainerLow || colors.surface,
                            },
                          ]}
                        >
                          <Text style={[styles.criteriaDetailHeader, { color: colors.onSurfaceVariant }]}>
                            Cumulative Criteria Average
                          </Text>
                          {[
                            { label: "Class Engagement", val: crit.classEngagement, icon: "record-voice-over" },
                            { label: "Homework & Classwork", val: crit.homeworkClasswork, icon: "assignment-turned-in" },
                            { label: "Behaviour & Social", val: crit.behaviourSocial, icon: "groups" },
                            { label: "Communication", val: crit.englishComm, icon: "chat" },
                          ].map((item) => (
                            <View key={item.label} style={styles.criteriaDetailRow}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                                <MaterialIcons name={item.icon} size={16} color={colors.primary} />
                                <Text style={[styles.criteriaDetailLabel, { color: colors.onSurface }]}>
                                  {item.label}
                                </Text>
                              </View>
                              <Text style={[styles.criteriaDetailScore, { color: colors.onSurface }]}>
                                {item.val ? `★ ${item.val} / 5` : "—"}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Card>
                  );
                })
              )}
            </View>

            {/* Qualitative Teacher Remarks & Feedback Feed */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="rate-review" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  Teacher Remarks & Feedback ({teacherRemarksFeed.length})
                </Text>
              </View>

              {teacherRemarksFeed.length === 0 ? (
                <EmptyState
                  icon="rate-review"
                  title="No Teacher Remarks Yet"
                  message="When teachers include written observations or feedback with their ratings, they will appear here chronologically."
                />
              ) : (
                teacherRemarksFeed.map((item) => (
                  <Card
                    key={item.id}
                    variant="elevated"
                    style={styles.remarkFeedCard}
                    contentStyle={styles.remarkFeedCardContent}
                  >
                    <View style={styles.remarkFeedHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.remarkFeedSubject, { color: colors.onSurface }]}>
                          {item.subjectName}
                        </Text>
                        <Text style={[styles.remarkFeedMonth, { color: colors.onSurfaceVariant }]}>
                          {item.monthName} {item.year}
                        </Text>
                      </View>
                      {item.averageScore != null && (
                        <Badge
                          variant="success"
                          icon="stars"
                          label={`★ ${item.averageScore}`}
                          size="sm"
                        />
                      )}
                    </View>

                    <View
                      style={[
                        styles.remarkFeedBody,
                        {
                          backgroundColor: isDark
                            ? "rgba(99, 102, 241, 0.12)"
                            : "#EEF2FF",
                        },
                      ]}
                    >
                      <MaterialIcons name="format-quote" size={18} color={colors.primary} />
                      <Text style={[styles.remarkFeedText, { color: colors.onSurface }]}>
                        {item.remarks}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  monthPickerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  monthNavBtn: {
    padding: 8,
    borderRadius: RADIUS.full || 20,
  },
  monthLabelContainer: {
    alignItems: "center",
  },
  monthLabelText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  monthSubLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  jumpCurrentPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  jumpCurrentText: {
    fontSize: FONT_SIZES.xs || 11,
    fontFamily: FONTS.medium,
  },
  tabBarContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabItemText: {
    fontSize: FONT_SIZES.xs,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: RADIUS.lg,
    marginBottom: 16,
  },
  heroCardContent: {
    padding: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  heroScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroScoreLarge: {
    fontSize: 34,
    fontFamily: FONTS.bold,
    lineHeight: 40,
  },
  heroScoreMax: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  heroEvalCountText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  classComparisonBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  classComparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  classComparisonTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },
  classComparisonGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  classComparisonItem: {
    flex: 1,
    alignItems: "center",
  },
  classComparisonItemLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginBottom: 2,
  },
  classComparisonItemValue: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  currentMonthHeroCard: {
    borderRadius: RADIUS.lg,
    marginBottom: 16,
  },
  currentMonthHeroCardContent: {
    padding: 14,
  },
  currentMonthHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  currentMonthHeroTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  currentMonthHeroStatusSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  currentMonthProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  currentMonthProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  currentMonthJumpBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
  },
  currentMonthJumpBtnText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },
  inProgressNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  inProgressNoticeTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  inProgressNoticeSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: 15,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    padding: 10,
    borderRadius: RADIUS.lg,
  },
  kpiCardContent: {
    padding: 10,
  },
  kpiTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  kpiScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  kpiLargeScore: {
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  kpiScoreMedium: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  kpiMaxScore: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  kpiDiffText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  criteriaCard: {
    borderRadius: RADIUS.lg,
    marginBottom: 10,
  },
  criteriaCardContent: {
    padding: 12,
  },
  criteriaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  criteriaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  criteriaName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
  },
  criteriaDescText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  criteriaScoreCol: {
    alignItems: "flex-end",
  },
  criteriaScoreVal: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  criteriaScaleLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  trendCard: {
    borderRadius: RADIUS.lg,
  },
  trendCardContent: {
    padding: 12,
  },
  trendBarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingVertical: 8,
  },
  trendBarCol: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  trendBarScore: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  trendBarTrack: {
    width: 24,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendBarFill: {
    width: "100%",
    borderRadius: 12,
  },
  trendBarLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 6,
  },
  noticeText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 16,
  },
  subjectCard: {
    borderRadius: RADIUS.md,
    marginBottom: 8,
  },
  subjectCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  subjectNameText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
  },
  subjectStatusSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  subjectExpandedDetails: {
    borderTopWidth: 1,
    padding: 12,
  },
  criteriaDetailHeader: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    marginBottom: 8,
  },
  criteriaDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  criteriaDetailLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  criteriaDetailScore: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  subjectRemarkBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginTop: 8,
  },
  subjectRemarkText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    flex: 1,
    fontStyle: "italic",
    lineHeight: 16,
  },
  remarkFeedCard: {
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  remarkFeedCardContent: {
    padding: 12,
  },
  remarkFeedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  remarkFeedSubject: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  remarkFeedMonth: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  remarkFeedBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
  },
  remarkFeedText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 17,
  },
});
