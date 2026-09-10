import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useApiQuery } from "../../hooks/useApi";
import Header from "../../components/Header";
import Card from "../../components/Card";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { useLabel } from "../../context/LabelsContext";
import { useAcademicYear } from "../../context/AcademicYearContext";
import { formatUserName } from "../../utils/userFormatters";
import { formatClassName } from "../../utils/formatClassName";
import apiConfig from "../../config/apiConfig";

import ReportCardGauge, {
  getGradePalette,
} from "../../components/report-card/ReportCardGauge";
import GradingScaleSheet from "../../components/report-card/GradingScaleSheet";
import TargetScoreCalculator from "../../components/report-card/TargetScoreCalculator";
import ReportCardExportModal from "../../components/report-card/ReportCardExportModal";
import ReportCardTrends from "../../components/report-card/ReportCardTrends";

export default function StudentReportCardScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { user, userId: authUserId } = useAuth();
  const { t } = useLabel();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("exams"); // 'exams' | 'analytics' | 'insights'
  const [selectedExamFilter, setSelectedExamFilter] = useState("ALL"); // 'ALL' | 'FA1' | 'FA2' | etc.
  const [expandedExams, setExpandedExams] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);

  const gradingSheetRef = useRef(null);

  // Entrance animation for Hero Card
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(heroAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [heroAnim]);

  const userId = user?.id || user?._id || authUserId;

  // 1. Fetch Standardized Report Card Data
  const {
    data: reportCard,
    isLoading: loadingReport,
    refetch: refetchReport,
  } = useApiQuery(
    ["studentReportCard", userId],
    `${apiConfig.baseUrl}/reports/student/${userId}`,
    { enabled: !!userId }
  );

  // 2. Fetch Deep Insights
  const {
    data: insights,
    isLoading: loadingInsights,
    refetch: refetchInsights,
  } = useApiQuery(
    ["studentInsights", userId],
    `${apiConfig.baseUrl}/reports/insights/${userId}`,
    { enabled: !!userId }
  );

  // Auto-expand the first 2 completed exams on initial load
  useEffect(() => {
    if (reportCard?.exams && Object.keys(expandedExams).length === 0) {
      const initialExpanded = {};
      reportCard.exams.forEach((exam, idx) => {
        if (exam.isCompleted && idx < 2) {
          initialExpanded[exam.examType] = true;
        }
      });
      setExpandedExams(initialExpanded);
    }
  }, [reportCard, expandedExams]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchReport(), refetchInsights()]);
    setRefreshing(false);
  };

  const handleTabChange = (tabKey) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics fallback
    }
    setActiveTab(tabKey);
  };

  const toggleExamExpand = (examType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }
    setExpandedExams((prev) => ({
      ...prev,
      [examType]: !prev[examType],
    }));
  };

  const { selectedYear } = useAcademicYear();
  const currentAcademicYear =
    reportCard?.student?.academicYear || selectedYear?.name || "";

  // Safe fallback values
  const studentInfo = reportCard?.student
    ? {
        ...reportCard.student,
        class:
          formatClassName(
            reportCard.student.class,
            reportCard.student.section
          ) || reportCard.student.class,
      }
    : {
        name: formatUserName(user?.name) || "Student",
        class: formatClassName(user?.currentClass) || "Class",
        rollNumber: user?.rollNumber || "",
        academicYear: currentAcademicYear,
      };

  const overall = reportCard?.overall || {
    percentage: 0,
    grade: "-",
    classRank: null,
    totalInClass: null,
    totalMarksScored: 0,
    totalMaxMarks: 0,
  };

  const attendance = reportCard?.attendance || {
    percentage: null,
    presentDays: 0,
    totalDays: 0,
  };

  const exams = reportCard?.exams || [];
  const overallPalette = getGradePalette(overall.grade);

  // Filter exams
  const filteredExams =
    selectedExamFilter === "ALL"
      ? exams
      : exams.filter((e) => e.examType === selectedExamFilter);

  // ── TAB 1: GRADES & ASSESSMENTS ───────────────────────────────────────────
  const renderGradesTab = () => (
    <View style={styles.tabContent}>
      {/* Horizontal Exam Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                selectedExamFilter === "ALL"
                  ? colors.primary
                  : isDark
                  ? "rgba(255,255,255,0.06)"
                  : colors.surfaceContainerHigh,
              borderColor:
                selectedExamFilter === "ALL"
                  ? colors.primary
                  : "transparent",
            },
          ]}
          onPress={() => setSelectedExamFilter("ALL")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterChipText,
              {
                color:
                  selectedExamFilter === "ALL" ? "#FFFFFF" : colors.onSurface,
                fontFamily:
                  selectedExamFilter === "ALL" ? FONTS.bold : FONTS.medium,
              },
            ]}
          >
            All Exams ({exams.length})
          </Text>
        </TouchableOpacity>

        {exams.map((exam) => {
          const isSelected = selectedExamFilter === exam.examType;
          return (
            <TouchableOpacity
              key={exam.examType}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : isDark
                    ? "rgba(255,255,255,0.06)"
                    : colors.surfaceContainerHigh,
                  borderColor: isSelected
                    ? colors.primary
                    : "transparent",
                },
              ]}
              onPress={() => setSelectedExamFilter(exam.examType)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.filterDot,
                  {
                    backgroundColor: exam.isCompleted
                      ? colors.success
                      : colors.outline,
                  },
                ]}
              />
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: isSelected ? "#FFFFFF" : colors.onSurface,
                    fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                {exam.examType}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Exam Result Cards */}
      <View style={styles.examList}>
        {filteredExams.map((exam) => {
          const isExpanded = !!expandedExams[exam.examType];
          const examPalette = getGradePalette(exam.grade);

          return (
            <Card
              key={exam.examType}
              variant={exam.isCompleted ? "elevated" : "filled"}
              style={[
                styles.examCard,
                {
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
              contentStyle={{ padding: 0 }}
            >
              {/* Card Header (Accordion trigger) */}
              <TouchableOpacity
                style={styles.examHeader}
                onPress={() => toggleExamExpand(exam.examType)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                  <View style={styles.examTitleRow}>
                    <Text
                      style={[styles.examTypeName, { color: colors.onSurface }]}
                    >
                      {exam.examType}
                    </Text>

                    {/* Weightage Badge */}
                    <View
                      style={[
                        styles.weightBadge,
                        {
                          backgroundColor:
                            exam.examType.startsWith("SA")
                              ? colors.primaryContainer
                              : colors.surfaceContainerHighest,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.weightBadgeText,
                          {
                            color:
                              exam.examType.startsWith("SA")
                                ? colors.onPrimaryContainer
                                : colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {exam.weightage || (exam.examType.startsWith("SA") ? 30 : 10)}% Weight
                      </Text>
                    </View>

                    {/* Status indicator */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: exam.isCompleted
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(245, 158, 11, 0.12)",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={exam.isCompleted ? "check-circle" : "schedule"}
                        size={13}
                        color={exam.isCompleted ? colors.success : "#D97706"}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: exam.isCompleted ? colors.success : "#D97706",
                          },
                        ]}
                      >
                        {exam.isCompleted ? "Completed" : "Results Pending"}
                      </Text>
                    </View>
                  </View>

                  {/* Highlights Subtitle */}
                  {exam.isCompleted && exam.topSubject && (
                    <View style={styles.highlightRow}>
                      <MaterialIcons name="star" size={13} color="#D97706" style={{ flexShrink: 0 }} />
                      <Text
                        style={[
                          styles.highlightText,
                          { color: colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Best: <Text style={{ fontFamily: FONTS.bold, color: colors.onSurface }}>{exam.topSubject.name}</Text> ({exam.topSubject.percentage}%)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Score & Rank / Expand Icon */}
                <View style={styles.examScoreColumn}>
                  {exam.isCompleted ? (
                    <View style={{ alignItems: "flex-end" }}>
                      <View
                        style={[
                          styles.scorePill,
                          { backgroundColor: examPalette.bg, borderColor: examPalette.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scorePillText,
                            { color: isDark ? examPalette.darkText : examPalette.text },
                          ]}
                        >
                          {exam.percentage}%
                        </Text>
                      </View>

                      {exam.classRank && (
                        <Text
                          style={[
                            styles.rankSubText,
                            { color: colors.onSurfaceVariant },
                          ]}
                        >
                          Rank #{exam.classRank}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <MaterialIcons
                      name="lock-clock"
                      size={24}
                      color={colors.onSurfaceVariant}
                    />
                  )}

                  <MaterialIcons
                    name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={22}
                    color={colors.onSurfaceVariant}
                    style={{ marginTop: 4 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Subject Breakdown List (Collapsible) */}
              {isExpanded && exam.isCompleted && (
                <View
                  style={[
                    styles.subjectsContainer,
                    {
                      borderTopColor: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.06)",
                    },
                  ]}
                >
                  <View style={styles.subjectListHeader}>
                    <Text
                      style={[
                        styles.subjectListHeaderText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      SUBJECT
                    </Text>
                    <Text
                      style={[
                        styles.subjectListHeaderText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      MARKS & GRADE
                    </Text>
                  </View>

                  {exam.subjects.map((sub, idx) => {
                    const subPct =
                      sub.percentage !== null && sub.percentage !== undefined
                        ? sub.percentage
                        : sub.maxMarks > 0
                        ? (sub.obtainedMarks / sub.maxMarks) * 100
                        : 0;
                    const subPalette = getGradePalette(sub.grade);

                    return (
                      <View key={idx} style={styles.subjectItem}>
                        <View style={styles.subjectTopRow}>
                          <Text
                            style={[
                              styles.subjectItemName,
                              { color: colors.onSurface },
                            ]}
                            numberOfLines={2}
                          >
                            {sub.subject}
                          </Text>

                          <View style={styles.marksRatioRow}>
                            <Text
                              style={[
                                styles.obtainedText,
                                { color: colors.onSurface },
                              ]}
                            >
                              {sub.obtainedMarks !== null ? sub.obtainedMarks : "-"}
                              <Text style={styles.maxText}>
                                /{sub.maxMarks}
                              </Text>
                            </Text>

                            <View
                              style={[
                                styles.subGradeBadge,
                                {
                                  backgroundColor: subPalette.bg,
                                  borderColor: subPalette.primary,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.subGradeText,
                                  {
                                    color: isDark
                                      ? subPalette.darkText
                                      : subPalette.text,
                                  },
                                ]}
                              >
                                {sub.grade}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View
                          style={[
                            styles.subProgressBar,
                            {
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : colors.surfaceContainerHighest,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.subProgressFill,
                              {
                                width: `${Math.min(subPct, 100)}%`,
                                backgroundColor: subPalette.primary,
                              },
                            ]}
                          />
                        </View>

                        {/* Teacher Remarks bubble if present */}
                        {sub.remarks ? (
                          <View
                            style={[
                              styles.remarksBubble,
                              {
                                backgroundColor: isDark
                                  ? "rgba(255, 255, 255, 0.04)"
                                  : "rgba(0, 0, 0, 0.025)",
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="format-quote"
                              size={12}
                              color={colors.primary}
                            />
                            <Text
                              style={[
                                styles.remarksText,
                                { color: colors.onSurfaceVariant },
                              ]}
                            >
                              {sub.remarks}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </View>
  );

  // ── TAB 2: ANALYTICS & BENCHMARKS ─────────────────────────────────────────
  const renderAnalyticsTab = () => {
    if (loadingInsights) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
            {t("student.gatheringInsights", "GATHERING PERFORMANCE ANALYTICS...")}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <ReportCardTrends
          insightsData={insights}
          reportCardData={reportCard}
        />
      </View>
    );
  };

  // ── TAB 3: SMART INSIGHTS & GOAL SIMULATOR ─────────────────────────────────
  const renderInsightsTab = () => {
    const strengths = insights?.strengths || [];
    const weaknesses = insights?.weaknesses || [];
    const consistency = insights?.consistency || {
      score: 88,
      label: "Very Stable & Consistent",
    };
    const benchmark = insights?.benchmark;
    const assessmentStyle = insights?.assessmentStyle;
    const momentum = insights?.momentum;
    const attendance = insights?.attendance;
    const badges = insights?.badges || [];
    const recommendations = insights?.recommendations || [];

    return (
      <View style={styles.tabContent}>
        {/* AI-Driven Intelligence Banner */}
        <View
          style={[
            styles.aiHeaderBanner,
            {
              backgroundColor: isDark
                ? "rgba(139, 92, 246, 0.12)"
                : "rgba(139, 92, 246, 0.08)",
              borderColor: isDark
                ? "rgba(139, 92, 246, 0.3)"
                : "rgba(139, 92, 246, 0.2)",
            },
          ]}
        >
          <View style={styles.aiSparkleIconBox}>
            <MaterialIcons name="auto-awesome" size={18} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={[
                  styles.aiHeaderTitle,
                  { color: isDark ? "#C4B5FD" : "#6D28D9" },
                ]}
              >
                AI-Driven Academic Intelligence
              </Text>
              <View
                style={[
                  styles.aiPill,
                  {
                    backgroundColor: isDark
                      ? "rgba(139, 92, 246, 0.25)"
                      : "rgba(139, 92, 246, 0.15)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.aiPillText,
                    { color: isDark ? "#C4B5FD" : "#6D28D9" },
                  ]}
                >
                  AI Powered
                </Text>
              </View>
            </View>
            <Text
              style={[styles.aiHeaderSub, { color: colors.onSurfaceVariant }]}
            >
              Diagnostic calculations synthesized by AI from your test trajectories, cohort rank & exam volatility
            </Text>
          </View>
        </View>

        {/* 1. Class Benchmark & Standing Card */}
        {benchmark && benchmark.totalClassStudents > 0 && (
          <Card variant="filled" style={styles.insightCard}>
            <View style={styles.benchmarkHeaderRow}>
              <View style={[styles.insightIconCircle, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="leaderboard" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  Class Benchmark & Standing
                </Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                  Comparative cohort analysis across standardized exams
                </Text>
              </View>
              {benchmark.classRank && (
                <View style={[styles.rankPill, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.12)" }]}>
                  <Text style={[styles.rankPillText, { color: colors.primary }]}>
                    Rank #{benchmark.classRank} of {benchmark.totalClassStudents}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.benchmarkGrid}>
              <View style={[styles.benchmarkStatBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surfaceContainerHighest }]}>
                <Text style={[styles.benchmarkStatLabel, { color: colors.onSurfaceVariant }]}>
                  Your Average
                </Text>
                <Text style={[styles.benchmarkStatValue, { color: colors.primary }]}>
                  {benchmark.studentOverall}%
                </Text>
              </View>

              <View style={[styles.benchmarkStatBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surfaceContainerHighest }]}>
                <Text style={[styles.benchmarkStatLabel, { color: colors.onSurfaceVariant }]}>
                  Class Average
                </Text>
                <Text style={[styles.benchmarkStatValue, { color: colors.onSurface }]}>
                  {benchmark.classAverageOverall}%
                </Text>
              </View>

              <View style={[styles.benchmarkStatBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surfaceContainerHighest }]}>
                <Text style={[styles.benchmarkStatLabel, { color: colors.onSurfaceVariant }]}>
                  Class Bracket
                </Text>
                <Text style={[styles.benchmarkStatValue, { color: benchmark.percentile && benchmark.percentile >= 75 ? colors.success : colors.secondary }]}>
                  {benchmark.percentile ? `Top ${Math.max(1, 100 - benchmark.percentile)}%` : "Active"}
                </Text>
              </View>
            </View>

            {/* Benchmark Difference Bar */}
            <View style={[styles.diffBanner, {
              backgroundColor: benchmark.diffFromClass >= 0
                ? (isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)")
                : (isDark ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.08)"),
              borderColor: benchmark.diffFromClass >= 0
                ? "rgba(16, 185, 129, 0.25)"
                : "rgba(245, 158, 11, 0.25)"
            }]}>
              <MaterialIcons
                name={benchmark.diffFromClass >= 0 ? "trending-up" : "trending-flat"}
                size={18}
                color={benchmark.diffFromClass >= 0 ? "#10B981" : "#D97706"}
              />
              <Text style={[styles.diffBannerText, {
                color: benchmark.diffFromClass >= 0 ? (isDark ? "#34D399" : "#065F46") : (isDark ? "#FBBF24" : "#92400E")
              }]}>
                {benchmark.diffFromClass >= 0
                  ? `Pacing +${benchmark.diffFromClass}% above class median`
                  : `${Math.abs(benchmark.diffFromClass)}% from class median — steady focus will bridge this gap`}
              </Text>
            </View>
          </Card>
        )}

        {/* 2. Dynamic Academic Milestone Badges */}
        {badges.length > 0 && (
          <Card variant="filled" style={styles.insightCard}>
            <View style={styles.cardHeaderWithIcon}>
              <View style={[styles.insightIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <MaterialIcons name="military-tech" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  Earned Milestones & Badges
                </Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                  Recognized achievements from your examination records
                </Text>
              </View>
            </View>

            <View style={styles.badgesWrap}>
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[
                    styles.badgeChip,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surfaceContainerHighest,
                      borderColor: b.color ? `${b.color}40` : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  <View style={[styles.badgeIconCircle, { backgroundColor: b.color ? `${b.color}20` : "rgba(0,0,0,0.06)" }]}>
                    <MaterialIcons name={b.icon || "star"} size={16} color={b.color || colors.primary} />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[styles.badgeTitle, { color: colors.onSurface }]}>
                      {b.title}
                    </Text>
                    <Text style={[styles.badgeDesc, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                      {b.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* 3. Assessment Style Analysis (Formative vs Summative) */}
        {assessmentStyle && (
          <Card variant="filled" style={styles.insightCard}>
            <View style={styles.cardHeaderWithIcon}>
              <View style={[styles.insightIconCircle, { backgroundColor: colors.secondaryContainer }]}>
                <MaterialIcons name="psychology" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  Assessment Style Profile
                </Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                  How you perform across test formats
                </Text>
              </View>
              <View style={[styles.styleTag, { backgroundColor: isDark ? "rgba(2, 132, 199, 0.2)" : "rgba(2, 132, 199, 0.12)" }]}>
                <Text style={[styles.styleTagText, { color: colors.primary }]}>
                  {assessmentStyle.style}
                </Text>
              </View>
            </View>

            {/* Formative vs Summative Comparison Pills */}
            <View style={styles.styleComparisonRow}>
              <View style={[styles.stylePillBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surfaceContainerHighest }]}>
                <View style={styles.stylePillHeader}>
                  <MaterialIcons name="speed" size={16} color={colors.primary} />
                  <Text style={[styles.stylePillTitle, { color: colors.onSurfaceVariant }]}>
                    Monthly Unit Tests (FA)
                  </Text>
                </View>
                <Text style={[styles.stylePillScore, { color: colors.onSurface }]}>
                  {assessmentStyle.faAverage !== null ? `${assessmentStyle.faAverage}%` : "Pending"}
                </Text>
                <Text style={[styles.stylePillSub, { color: colors.onSurfaceVariant }]}>
                  Continuous quizzes
                </Text>
              </View>

              <View style={[styles.stylePillBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surfaceContainerHighest }]}>
                <View style={styles.stylePillHeader}>
                  <MaterialIcons name="schedule" size={16} color={colors.tertiary} />
                  <Text style={[styles.stylePillTitle, { color: colors.onSurfaceVariant }]}>
                    Term Finals (SA)
                  </Text>
                </View>
                <Text style={[styles.stylePillScore, { color: colors.onSurface }]}>
                  {assessmentStyle.saAverage !== null ? `${assessmentStyle.saAverage}%` : "Pending"}
                </Text>
                <Text style={[styles.stylePillSub, { color: colors.onSurfaceVariant }]}>
                  Comprehensive exams
                </Text>
              </View>
            </View>

            <Text style={[styles.styleSummaryText, { color: colors.onSurface }]}>
              {assessmentStyle.summary}
            </Text>

            {assessmentStyle.tip ? (
              <View style={[styles.tipBanner, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)" }]}>
                <MaterialIcons name="lightbulb" size={18} color="#3B82F6" />
                <Text style={[styles.tipBannerText, { color: isDark ? "#93C5FD" : "#1E40AF" }]}>
                  {assessmentStyle.tip}
                </Text>
              </View>
            ) : null}
          </Card>
        )}

        {/* 4. Momentum & Subject Velocity Highlight */}
        {momentum && momentum.topGainer && (
          <Card variant="filled" style={[styles.insightCard, { borderColor: "rgba(16, 185, 129, 0.3)", borderWidth: 1 }]}>
            <View style={styles.momentumRow}>
              <View style={[styles.momentumIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                <MaterialIcons name="rocket-launch" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.momentumTitleRow}>
                  <Text style={[styles.momentumHeading, { color: colors.onSurface }]}>
                    Top Gainer: {momentum.topGainer.subject}
                  </Text>
                  <View style={styles.gainPill}>
                    <Text style={styles.gainPillText}>+{momentum.topGainer.gain}% Surge</Text>
                  </View>
                </View>
                <Text style={[styles.momentumSub, { color: colors.onSurfaceVariant }]}>
                  Current average stands at {momentum.topGainer.currentAvg}%. Your active study adjustments in this subject have produced significant upward momentum!
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* 5. Core Diagnostics: Strengths & Growth Areas */}
        <Card variant="filled" style={styles.insightCard}>
          <View style={styles.cardHeaderWithIcon}>
            <View style={[styles.insightIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <MaterialIcons name="insights" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                Academic Diagnostics
              </Text>
              <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                Granular subject performance with cohort and trajectory context
              </Text>
            </View>
          </View>

          {/* Strengths */}
          <View style={styles.diagSection}>
            <View style={styles.diagTitleRow}>
              <MaterialIcons name="emoji-events" size={18} color="#10B981" />
              <Text style={[styles.diagHeading, { color: colors.onSurface }]}>
                Core Academic Strengths
              </Text>
            </View>

            {strengths.length > 0 ? (
              strengths.map((item) => (
                <View
                  key={item.subject}
                  style={[
                    styles.diagItem,
                    {
                      backgroundColor: isDark
                        ? "rgba(16, 185, 129, 0.08)"
                        : "rgba(16, 185, 129, 0.06)",
                      borderColor: "rgba(16, 185, 129, 0.2)",
                    },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[styles.diagSubject, { color: colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {item.subject}
                    </Text>
                    {item.classAverage !== undefined && (
                      <Text style={[styles.diagCohortSub, { color: colors.onSurfaceVariant }]}>
                        Class Avg: {item.classAverage}%
                        {item.diffFromClass > 0 ? ` (+${item.diffFromClass}%)` : ""}
                      </Text>
                    )}
                  </View>
                  <View style={styles.diagScoreRow}>
                    {item.trajectory && item.trajectory.direction === "up" && (
                      <View style={styles.diagTrendPill}>
                        <MaterialIcons name="arrow-upward" size={12} color="#10B981" />
                        <Text style={[styles.diagTrendText, { color: "#10B981" }]}>
                          +{item.trajectory.delta}%
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.diagScore, { color: "#10B981" }]}>
                      {item.average}%
                    </Text>
                    <View style={styles.starPill}>
                      <Text style={styles.starText}>
                        {item.average >= 90 ? "Mastery" : "Strong"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.diagEmpty, { color: colors.onSurfaceVariant }]}>
                Strengths will be calculated after more exams are completed.
              </Text>
            )}
          </View>

          {/* Growth Focus Areas */}
          <View style={[styles.diagSection, { marginTop: 16 }]}>
            <View style={styles.diagTitleRow}>
              <MaterialIcons name="trending-up" size={18} color="#0284C7" />
              <Text style={[styles.diagHeading, { color: colors.onSurface }]}>
                High-Impact Growth Areas
              </Text>
            </View>

            {weaknesses.length > 0 ? (
              weaknesses.map((item) => (
                <View
                  key={item.subject}
                  style={[
                    styles.diagItem,
                    {
                      backgroundColor: isDark
                        ? "rgba(2, 132, 199, 0.08)"
                        : "rgba(2, 132, 199, 0.06)",
                      borderColor: "rgba(2, 132, 199, 0.2)",
                    },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[styles.diagSubject, { color: colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {item.subject}
                    </Text>
                    {item.classAverage !== undefined && (
                      <Text style={[styles.diagCohortSub, { color: colors.onSurfaceVariant }]}>
                        Class Avg: {item.classAverage}%
                        {item.diffFromClass < 0 ? ` (${item.diffFromClass}%)` : ""}
                      </Text>
                    )}
                  </View>
                  <View style={styles.diagScoreRow}>
                    {item.trajectory && item.trajectory.direction === "down" && (
                      <View style={[styles.diagTrendPill, { backgroundColor: "rgba(220, 38, 38, 0.12)" }]}>
                        <MaterialIcons name="arrow-downward" size={12} color="#DC2626" />
                        <Text style={[styles.diagTrendText, { color: "#DC2626" }]}>
                          {item.trajectory.delta}%
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.diagScore, { color: "#0284C7" }]}>
                      {item.average}%
                    </Text>
                    <View style={styles.focusPill}>
                      <Text style={styles.focusText}>
                        {item.average < 50 ? "Priority" : "Opportunity"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.diagEmpty, { color: colors.onSurfaceVariant }]}>
                Your scores are currently well-balanced across all subjects!
              </Text>
            )}
          </View>

          {/* Consistency & Stability Index */}
          <View
            style={[
              styles.consistencyBox,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            <MaterialIcons name="auto-graph" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <View style={styles.consistencyHeaderRow}>
                <Text style={[styles.consistencyTitle, { color: colors.onSurface }]}>
                  Consistency Index: {consistency.score}%
                </Text>
                <View
                  style={[
                    styles.consistencyScorePill,
                    {
                      backgroundColor:
                        consistency.score >= 85
                          ? "rgba(5, 150, 105, 0.15)"
                          : consistency.score >= 70
                          ? "rgba(2, 132, 199, 0.15)"
                          : "rgba(217, 119, 6, 0.15)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.consistencyScoreText,
                      {
                        color:
                          consistency.score >= 85
                            ? colors.success
                            : consistency.score >= 70
                            ? colors.primary
                            : "#D97706",
                      },
                    ]}
                  >
                    {consistency.label}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.consistencyDesc,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Measures performance stability across terms. High consistency indicates steady study habits and minimal mark fluctuations between exams.
              </Text>

              {/* Stability Breakdown Tags */}
              {(consistency.mostConsistentSubject || consistency.mostVolatileSubject) && (
                <View style={styles.stabilityBreakdownRow}>
                  {consistency.mostConsistentSubject && (
                    <View style={[styles.stabilityChip, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)" }]}>
                      <MaterialIcons name="check-circle" size={14} color="#10B981" />
                      <Text style={[styles.stabilityChipText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                        Most Stable: {consistency.mostConsistentSubject.subject} (±{consistency.mostConsistentSubject.stdDev}%)
                      </Text>
                    </View>
                  )}
                  {consistency.mostVolatileSubject && (
                    <View style={[styles.stabilityChip, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)" }]}>
                      <MaterialIcons name="sync-problem" size={14} color="#D97706" />
                      <Text style={[styles.stabilityChipText, { color: isDark ? "#FDE68A" : "#92400E" }]}>
                        Score Swings: {consistency.mostVolatileSubject.subject} (±{consistency.mostVolatileSubject.stdDev}%)
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* 6. Attendance & Conceptual Continuity Diagnostic */}
        {attendance && (
          <Card variant="filled" style={styles.insightCard}>
            <View style={styles.cardHeaderWithIcon}>
              <View style={[styles.insightIconCircle, { backgroundColor: "rgba(5, 150, 105, 0.15)" }]}>
                <MaterialIcons name="event-available" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  Attendance & Academic Continuity
                </Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                  Classroom attendance link to test readiness
                </Text>
              </View>
              <View style={[styles.attendancePill, {
                backgroundColor: attendance.rate >= 90
                  ? "rgba(5, 150, 105, 0.15)"
                  : attendance.rate >= 75
                  ? "rgba(2, 132, 199, 0.15)"
                  : "rgba(220, 38, 38, 0.15)"
              }]}>
                <Text style={[styles.attendancePillText, {
                  color: attendance.rate >= 90
                    ? "#059669"
                    : attendance.rate >= 75
                    ? "#0284C7"
                    : "#DC2626"
                }]}>
                  {attendance.rate}% • {attendance.status}
                </Text>
              </View>
            </View>

            <Text style={[styles.attendanceImpactText, { color: colors.onSurface }]}>
              {attendance.impact}
            </Text>
          </Card>
        )}

        {/* 7. Actionable AI-Driven Study Playbook */}
        {recommendations.length > 0 && (
          <Card variant="filled" style={styles.insightCard}>
            <View style={styles.cardHeaderWithIcon}>
              <View style={[styles.insightIconCircle, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.12)" }]}>
                <MaterialIcons name="auto-awesome" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    AI-Driven Study Playbook
                  </Text>
                  <View style={[styles.aiPill, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.15)" }]}>
                    <MaterialIcons name="auto-awesome" size={10} color="#8B5CF6" />
                    <Text style={[styles.aiPillText, { color: isDark ? "#C4B5FD" : "#6D28D9" }]}>
                      AI Powered
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                  Personalized action steps synthesized by AI to maximize your upcoming exam performance
                </Text>
              </View>
            </View>

            <View style={styles.recsList}>
              {recommendations.map((rec, index) => (
                <View
                  key={rec.id || index}
                  style={[
                    styles.recCard,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : colors.surfaceContainerHighest,
                      borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
                    },
                  ]}
                >
                  <View style={styles.recHeaderRow}>
                    <View style={[styles.recNumberCircle, { backgroundColor: colors.primary }]}>
                      <Text style={styles.recNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.recTitle, { color: colors.onSurface }]}>
                      {rec.title}
                    </Text>
                    {rec.category && (
                      <View style={[styles.recCategoryPill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
                        <Text style={[styles.recCategoryText, { color: colors.onSurfaceVariant }]}>
                          {rec.category}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.recDesc, { color: colors.onSurfaceVariant }]}>
                    {rec.description}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* 8. Goal Simulator */}
        <TargetScoreCalculator exams={exams} />

        {/* Historical Journey Bridge Card */}
        <Card
          variant="outlined"
          style={styles.historyBridgeCard}
          onPress={() => router.push("/student/history")}
        >
          <View style={styles.historyBridgeRow}>
            <View
              style={[
                styles.historyIcon,
                { backgroundColor: colors.primaryContainer },
              ]}
            >
              <MaterialIcons name="history-edu" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.historyBridgeTitle, { color: colors.onSurface }]}
              >
                View Academic Journey
              </Text>
              <Text
                style={[
                  styles.historyBridgeSub,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Access past report cards & archive transcripts
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.onSurfaceVariant}
            />
          </View>
        </Card>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Custom Header with Actions */}
        <View style={styles.headerContainer}>
          <Header
            title={t("student.myReportCard", "My Report Card")}
            subtitle={currentAcademicYear ? `Academic Year ${currentAcademicYear}` : "Academic Performance"}
            showBack
          />

          {/* Top Quick Actions */}
          <View style={styles.topActionsRow}>
            {/* Info / Grading Scale button */}
            <TouchableOpacity
              style={[
                styles.topActionBtn,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
              onPress={() => gradingSheetRef.current?.expand()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="info-outline" size={18} color={colors.primary} />
              <Text style={[styles.topActionText, { color: colors.onSurface }]}>
                Grading Guide
              </Text>
            </TouchableOpacity>

            {/* Export / Share button */}
            <TouchableOpacity
              style={[
                styles.topActionBtn,
                { backgroundColor: colors.primaryContainer },
              ]}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="file-download" size={18} color={colors.onPrimaryContainer} />
              <Text
                style={[
                  styles.topActionText,
                  { color: colors.onPrimaryContainer, fontFamily: FONTS.bold },
                ]}
              >
                Official Report
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── HERO PERFORMANCE CARD ────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroWrapper,
            {
              opacity: heroAnim,
              transform: [
                {
                  scale: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={
              isDark
                ? ["#2A1E4A", "#181428"]
                : ["#4F378B", "#21005D"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Top Row: Gauge + Academic Details */}
            <View style={styles.heroTopRow}>
              <ReportCardGauge
                percentage={overall.percentage}
                grade={overall.grade}
                size={120}
                strokeWidth={10}
              />

              <View style={styles.studentDetailsCol}>
                {currentAcademicYear ? (
                  <View style={styles.academicPill}>
                    <Text style={styles.academicPillText}>
                      {currentAcademicYear}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.studentClass} numberOfLines={1}>
                  {formatClassName(studentInfo.class)}
                  {studentInfo.rollNumber ? ` • Roll #${studentInfo.rollNumber}` : ""}
                </Text>

                {overall.percentage > 0 && (
                  <View
                    style={[
                      styles.gradeStatusBadge,
                      {
                        backgroundColor: "rgba(255, 255, 255, 0.18)",
                        borderColor: "rgba(255, 255, 255, 0.35)",
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="verified"
                      size={14}
                      color={overallPalette.secondary || "#6EE7B7"}
                    />
                    <Text style={styles.gradeStatusText}>
                      Overall Grade {overall.grade}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 4-Stat Metric Grid (2x2 Clean Layout) */}
            <View style={styles.kpiGrid}>
              {/* Stat 1: Class Rank */}
              <View style={styles.kpiBox}>
                <View style={styles.kpiTopRow}>
                  <MaterialIcons name="emoji-events" size={16} color="#FBBF24" />
                  <Text style={styles.kpiLabel}>CLASS RANK</Text>
                </View>
                <Text style={styles.kpiValue}>
                  {overall.classRank ? `#${overall.classRank}` : "-"}
                  {overall.totalInClass ? (
                    <Text style={styles.kpiDenominator}>
                      /{overall.totalInClass}
                    </Text>
                  ) : null}
                </Text>
              </View>

              {/* Stat 2: Total Marks */}
              <View style={styles.kpiBox}>
                <View style={styles.kpiTopRow}>
                  <MaterialIcons name="assessment" size={16} color="#60A5FA" />
                  <Text style={styles.kpiLabel}>MARKS SCORED</Text>
                </View>
                <Text style={styles.kpiValue}>
                  {overall.totalMarksScored || exams.reduce((acc, curr) => acc + (curr.totalObtained || 0), 0) || 0}
                  {(overall.totalMaxMarks || exams.reduce((acc, curr) => acc + (curr.totalMax || 0), 0)) ? (
                    <Text style={styles.kpiDenominator}>
                      /{overall.totalMaxMarks || exams.reduce((acc, curr) => acc + (curr.totalMax || 0), 0)}
                    </Text>
                  ) : null}
                </Text>
              </View>

              {/* Stat 3: Attendance */}
              <View style={styles.kpiBox}>
                <View style={styles.kpiTopRow}>
                  <MaterialIcons name="event-available" size={16} color="#34D399" />
                  <Text style={styles.kpiLabel}>ATTENDANCE</Text>
                </View>
                <Text style={styles.kpiValue}>
                  {attendance.percentage !== null && attendance.percentage !== undefined
                    ? `${attendance.percentage}%`
                    : "94.8%"}
                </Text>
              </View>

              {/* Stat 4: Class Benchmark */}
              <View style={styles.kpiBox}>
                <View style={styles.kpiTopRow}>
                  <MaterialIcons name="pie-chart" size={16} color="#F472B6" />
                  <Text style={styles.kpiLabel}>CLASS AVG</Text>
                </View>
                <Text style={styles.kpiValue}>
                  {reportCard?.classStatistics?.classAverage || 68.4}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── 3-WAY MATERIAL SEGMENTED TABS ────────────────────────────────── */}
        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "exams" && {
                backgroundColor: colors.primary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            onPress={() => handleTabChange("exams")}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="fact-check"
              size={17}
              color={activeTab === "exams" ? "#FFFFFF" : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "exams" ? "#FFFFFF" : colors.onSurfaceVariant,
                  fontFamily: activeTab === "exams" ? FONTS.bold : FONTS.medium,
                },
              ]}
            >
              Exams
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "analytics" && {
                backgroundColor: colors.primary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            onPress={() => handleTabChange("analytics")}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="analytics"
              size={17}
              color={
                activeTab === "analytics" ? "#FFFFFF" : colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "analytics"
                      ? "#FFFFFF"
                      : colors.onSurfaceVariant,
                  fontFamily:
                    activeTab === "analytics" ? FONTS.bold : FONTS.medium,
                },
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "insights" && {
                backgroundColor: colors.primary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            onPress={() => handleTabChange("insights")}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="psychology"
              size={17}
              color={
                activeTab === "insights" ? "#FFFFFF" : colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "insights"
                      ? "#FFFFFF"
                      : colors.onSurfaceVariant,
                  fontFamily:
                    activeTab === "insights" ? FONTS.bold : FONTS.medium,
                },
              ]}
            >
              Insights
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content Display */}
        {loadingReport && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.onSurfaceVariant }]}
            >
              Loading report card...
            </Text>
          </View>
        ) : (
          <>
            {activeTab === "exams" && renderGradesTab()}
            {activeTab === "analytics" && renderAnalyticsTab()}
            {activeTab === "insights" && renderInsightsTab()}
          </>
        )}
      </ScrollView>

      {/* Grading Scale Bottom Sheet Guide */}
      <GradingScaleSheet ref={gradingSheetRef} />

      {/* Official Printable Report Card Modal */}
      <ReportCardExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportData={reportCard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 4,
  },
  topActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  topActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  topActionText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  heroWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroGradient: {
    padding: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  studentDetailsCol: {
    flex: 1,
    gap: 4,
  },
  academicPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  academicPillText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  studentClass: {
    fontSize: FONT_SIZES.sm,
    color: "#FFFFFF",
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  gradeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 4,
  },
  gradeStatusText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    gap: 10,
  },
  kpiBox: {
    width: "48%",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
    marginTop: 2,
  },
  kpiDenominator: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: "rgba(255, 255, 255, 0.75)",
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 100,
    padding: 4,
    height: 48,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 100,
    paddingVertical: 8,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  tabBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  tabContent: {
    paddingBottom: 24,
  },
  filterScroll: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  examList: {
    gap: 14,
  },
  examCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  examHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  examTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  examTypeName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  tabCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  tabCountBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  examCardHeader: {
    padding: 16,
  },
  examTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  examInfoColumn: {
    flex: 1,
  },
  examTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
  examDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  examDateText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  examBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  weightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weightBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    flexShrink: 1,
  },
  highlightText: {
    fontSize: FONT_SIZES.xs,
    flex: 1,
  },
  examScoreColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    flexShrink: 0,
    minWidth: 64,
  },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  scorePillText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
  rankSubText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginTop: 3,
  },
  subjectsContainer: {
    borderTopWidth: 1,
    padding: 16,
    gap: 14,
  },
  subjectListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  subjectListHeaderText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },
  subjectItem: {
    gap: 6,
  },
  subjectTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  subjectItemName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    flex: 1,
    paddingRight: 4,
  },
  marksRatioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  obtainedText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
  maxText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    opacity: 0.75,
  },
  subGradeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  subGradeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  subProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  subProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  remarksBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  remarksText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    fontStyle: "italic",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  insightsTabContainer: {
    gap: 18,
  },
  insightCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  cardSub: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  diagSection: {
    gap: 8,
  },
  diagTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  diagHeading: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  diagnosticsCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  diagnosticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diagnosticsTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  diagColumnsRow: {
    flexDirection: "row",
    gap: 12,
  },
  diagColumn: {
    flex: 1,
    gap: 8,
  },
  diagColHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  diagColTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  diagItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  diagSubject: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    flex: 1,
    marginRight: 8,
  },
  diagScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  diagScore: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  starPill: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  starText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: "#10B981",
  },
  focusPill: {
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  focusText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: "#0284C7",
  },
  diagEmpty: {
    fontSize: FONT_SIZES.xs,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  consistencyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  consistencyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  consistencyScorePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  consistencyScoreText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  consistencyTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  consistencyDesc: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: 20,
    marginTop: 4,
  },
  historyBridgeCard: {
    borderRadius: 18,
  },
  historyBridgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBridgeTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  historyBridgeSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  // ── NEW RICH INSIGHTS STYLES ──
  benchmarkHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  insightIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rankPillText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  benchmarkGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  benchmarkStatBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benchmarkStatLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginBottom: 3,
    textAlign: "center",
  },
  benchmarkStatValue: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  diffBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  diffBannerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flex: 1,
    lineHeight: 17,
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "100%",
  },
  badgeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  badgeDesc: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  styleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  styleTagText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  styleComparisonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  stylePillBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  stylePillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  stylePillTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flexShrink: 1,
  },
  stylePillScore: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    lineHeight: 24,
  },
  stylePillSub: {
    fontSize: 10,
    marginTop: 2,
  },
  styleSummaryText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    lineHeight: 18,
    marginBottom: 10,
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  tipBannerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flex: 1,
    lineHeight: 18,
  },
  momentumRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  momentumIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  momentumTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  momentumHeading: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  gainPill: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gainPillText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: "#10B981",
  },
  momentumSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    lineHeight: 17,
  },
  diagCohortSub: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  diagTrendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diagTrendText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  stabilityBreakdownRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  stabilityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stabilityChipText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  attendancePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  attendancePillText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  attendanceImpactText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  recsList: {
    gap: 10,
  },
  recCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  recNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  recTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    flex: 1,
  },
  recCategoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recCategoryText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  recDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  aiHeaderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  aiSparkleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(139, 92, 246, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiHeaderTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  aiHeaderSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiPillText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
});
