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
  const studentInfo = reportCard?.student || {
    name: formatUserName(user?.name) || "Student",
    class: user?.currentClass?.name
      ? `${user.currentClass.name} ${user.currentClass.section || ""}`.trim()
      : "Class",
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
            All Assessments ({exams.length})
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
                <View style={{ flex: 1 }}>
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
                      <MaterialIcons name="star" size={13} color="#D97706" />
                      <Text
                        style={[
                          styles.highlightText,
                          { color: colors.onSurfaceVariant },
                        ]}
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

    return (
      <View style={styles.tabContent}>
        {/* Diagnostics Card */}
        <Card variant="filled" style={styles.insightCard}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                Academic Diagnostics
              </Text>
              <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                AI-driven analysis of your performance patterns
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
                  <Text style={[styles.diagSubject, { color: colors.onSurface }]}>
                    {item.subject}
                  </Text>
                  <View style={styles.diagScoreRow}>
                    <Text style={[styles.diagScore, { color: "#10B981" }]}>
                      {item.average}% Avg
                    </Text>
                    <View style={styles.starPill}>
                      <Text style={styles.starText}>Mastery</Text>
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
                  <Text style={[styles.diagSubject, { color: colors.onSurface }]}>
                    {item.subject}
                  </Text>
                  <View style={styles.diagScoreRow}>
                    <Text style={[styles.diagScore, { color: "#0284C7" }]}>
                      {item.average}% Avg
                    </Text>
                    <View style={styles.focusPill}>
                      <Text style={styles.focusText}>Opportunity</Text>
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

          {/* Consistency Badge */}
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
            </View>
          </View>
        </Card>

        {/* Goal Simulator */}
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
                  {studentInfo.class}
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
              Assessments
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
  },
  highlightText: {
    fontSize: FONT_SIZES.xs,
  },
  examScoreColumn: {
    alignItems: "flex-end",
    gap: 2,
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
  },
  subjectItemName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  marksRatioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    color: "#065F46",
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
    color: "#075985",
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
});
