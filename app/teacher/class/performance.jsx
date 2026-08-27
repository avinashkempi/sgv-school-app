import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Pressable,
  TextInput as RNTextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../../theme";
import { useApiQuery } from "../../../hooks/useApi";
import AppHeader from "../../../components/Header";
import Card from "../../../components/Card";
import SegmentedControl from "../../../components/SegmentedControl";
import UserDetailModal from "../../../components/UserDetailModal";
import UserAvatar from "../../../components/ui/UserAvatar";
import { formatUserName } from "../../../utils/userFormatters";
import apiConfig from "../../../config/apiConfig";
import { LineChart } from "react-native-chart-kit";
import { useLabel } from "../../../context/LabelsContext";

const { width } = Dimensions.get("window");

const EXAM_COLORS = {
  FA1: "#4CAF50",
  FA2: "#2196F3",
  SA1: "#FF9800",
  FA3: "#9C27B0",
  FA4: "#E91E63",
  SA2: "#F44336",
};

const GRADE_COLORS = {
  "A+": "#146C2E",
  A: "#2196F3",
  "B+": "#FF9800",
  B: "#E65100",
  C: "#B3261E",
  "-": "#79747E",
};

export default function ClassPerformanceScreen() {
  const _router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { t } = useLabel();
  const { classId } = params;

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "subjects" | "students"
  const [selectedExamFilter, setSelectedExamFilter] = useState("ALL"); // "ALL" | "FA1" | "FA2" ...
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("all"); // "all" | "top" | "average" | "attention"
  const [sortBy, setSortBy] = useState("rank"); // "rank" | "name" | "score_desc" | "score_asc"
  const [expandedExams, setExpandedExams] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

  const {
    data: performanceData,
    isLoading,
    isFetching,
    refetch,
  } = useApiQuery(
    ["classPerformance", classId],
    `${apiConfig.baseUrl}/exams/performance/class/${classId}`,
    { enabled: !!classId }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getGradeColor = (percentage) => {
    if (percentage === null || percentage === undefined)
      return colors.onSurfaceVariant;
    if (percentage >= 90) return colors.success;
    if (percentage >= 70) return "#2196F3";
    if (percentage >= 50) return "#FF9800";
    if (percentage >= 35) return "#E65100";
    return colors.error;
  };

  const {
    className = "",
    totalStudents = 0,
    performance = [],
    subjectWise = [],
    students = [],
    insights = {},
  } = performanceData || {};

  const toggleExamExpand = (examType) => {
    setExpandedExams((prev) => ({ ...prev, [examType]: !prev[examType] }));
  };

  const toggleStudentExpand = (studentId) => {
    setExpandedStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const toggleSubjectExpand = (subjectId) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  // Filter and Sort Students
  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];

    let result = [...students];

    // Search query filter (name, rollNumber, regNo)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.rollNumber && s.rollNumber.toString().toLowerCase().includes(q)) ||
          (s.regNo && s.regNo.toString().toLowerCase().includes(q)) ||
          (s.satsNumber && s.satsNumber.toString().toLowerCase().includes(q))
      );
    }

    // Category filter
    if (studentFilter === "top") {
      result = result.filter((s) => s.overallPercentage >= 80);
    } else if (studentFilter === "average") {
      result = result.filter(
        (s) => s.overallPercentage >= 50 && s.overallPercentage < 80
      );
    } else if (studentFilter === "attention") {
      result = result.filter((s) => s.overallPercentage < 50);
    }

    // Specific exam filter if active in students tab
    if (selectedExamFilter !== "ALL") {
      result = result.filter(
        (s) =>
          s.examWise &&
          s.examWise[selectedExamFilter] &&
          s.examWise[selectedExamFilter].percentage !== null
      );
    }

    // Sorting
    if (sortBy === "rank") {
      result.sort((a, b) => (a.rank || 999) - (b.rank || 999));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "score_desc") {
      result.sort(
        (a, b) => (b.overallPercentage || 0) - (a.overallPercentage || 0)
      );
    } else if (sortBy === "score_asc") {
      result.sort(
        (a, b) => (a.overallPercentage || 0) - (b.overallPercentage || 0)
      );
    }

    return result;
  }, [students, searchQuery, studentFilter, selectedExamFilter, sortBy]);

  // Prepare chart data
  const completedExams = performance.filter((p) => p.avgPercentage > 0);
  const chartLabels = completedExams.map((p) => p.examType);
  const chartData = completedExams.map((p) => p.avgPercentage);

  const examTypes = ["ALL", "FA1", "FA2", "SA1", "FA3", "FA4", "SA2"];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={{ padding: 16, paddingTop: 24 }}>
          <AppHeader
            title={
              className
                ? `${className} • ${t("teacher.performance", "Performance")}`
                : t("teacher.classPerformance", "Class Performance")
            }
            subtitle={
              totalStudents > 0
                ? t(
                    "teacher.performanceAnalyticsWithCount",
                    "Comprehensive analytics for {{count}} students"
                  ).replace("{{count}}", totalStudents)
                : t(
                    "teacher.performanceMarksAnalytics",
                    "Performance & Marks Analytics"
                  )
            }
            showBack
          />

          {isLoading && !performanceData ? (
            <View
              style={{
                paddingVertical: 64,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  marginTop: 16,
                  fontSize: FONT_SIZES.base,
                  fontFamily: FONTS.medium,
                }}
              >
                {t(
                  "teacher.loadingPerformanceAnalytics",
                  "Loading class performance analytics..."
                )}
              </Text>
            </View>
          ) : !performanceData ? (
            <View
              style={{
                paddingVertical: 64,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name="info-outline"
                size={56}
                color={colors.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  marginTop: 16,
                  fontSize: FONT_SIZES.mdLg,
                  fontFamily: FONTS.medium,
                  textAlign: "center",
                }}
              >
                {t(
                  "teacher.noPerformanceData",
                  "No performance data available for this class"
                )}
              </Text>
            </View>
          ) : (
            <View style={{ opacity: isFetching && !isLoading ? 0.85 : 1 }}>
              {/* Top Executive KPI Row */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                {/* Class {t('common.avg', 'Avg')} Card */}
                <Card
                  variant="elevated"
                  style={{ flex: 1, minWidth: "47%" }}
                  contentStyle={{ padding: 16 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t("teacher.classAverage", "Class Average")}
                    </Text>
                    <View
                      style={{
                        backgroundColor:
                          (insights.grade
                            ? GRADE_COLORS[insights.grade] || colors.primary
                            : colors.primary) + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.bold,
                          color: insights.grade
                            ? GRADE_COLORS[insights.grade] || colors.primary
                            : colors.primary,
                        }}
                      >
                        {insights.grade || "-"}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 26,
                      fontFamily: FONTS.bold,
                      color: getGradeColor(insights.classAverage),
                      marginTop: 6,
                    }}
                  >
                    {insights.classAverage !== undefined
                      ? `${insights.classAverage}%`
                      : "0%"}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                      marginTop: 2,
                    }}
                  >
                    {t(
                      "teacher.acrossCompletedExams",
                      "Across completed exams"
                    )}
                  </Text>
                </Card>

                {/* {t('teacher.passRate', 'Pass Rate')} Card */}
                <Card
                  variant="elevated"
                  style={{ flex: 1, minWidth: "47%" }}
                  contentStyle={{ padding: 16 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t("teacher.passRateLimit", "Pass Rate (≥35%)")}
                    </Text>
                    <MaterialIcons
                      name="verified"
                      size={16}
                      color={colors.success}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 26,
                      fontFamily: FONTS.bold,
                      color: colors.success,
                      marginTop: 6,
                    }}
                  >
                    {insights.passingRate !== undefined
                      ? `${insights.passingRate}%`
                      : "0%"}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                      marginTop: 2,
                    }}
                  >
                    {students.filter((s) => s.overallPercentage >= 35).length}{" "}
                    {t("common.of", "of")} {totalStudents}{" "}
                    {t("common.students", "students")}
                  </Text>
                </Card>

                {/* Top Scorer Card */}
                <Card
                  variant="elevated"
                  style={{ flex: 1, minWidth: "47%" }}
                  contentStyle={{ padding: 16 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t("teacher.topPerformer", "Top Performer")}
                    </Text>
                    <Text style={{ fontSize: FONT_SIZES.lg }}>🥇</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: FONT_SIZES.xl,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                      marginTop: 6,
                    }}
                  >
                    {insights.topPerformer?.name || t("common.na", "N/A")}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      color: colors.success,
                      fontFamily: FONTS.bold,
                      marginTop: 2,
                    }}
                  >
                    {insights.topPerformer?.percentage
                      ? `${insights.topPerformer.percentage}%`
                      : "0%"}{" "}
                    ({t("common.grade", "Grade")}{" "}
                    {insights.topPerformer?.grade || "-"})
                  </Text>
                </Card>

                {/* Total Subjects / Exams Card */}
                <Card
                  variant="elevated"
                  style={{ flex: 1, minWidth: "47%" }}
                  contentStyle={{ padding: 16 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t("teacher.subjectsAndExams", "Subjects & Exams")}
                    </Text>
                    <MaterialIcons
                      name="menu-book"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 26,
                      fontFamily: FONTS.bold,
                      color: colors.primary,
                      marginTop: 6,
                    }}
                  >
                    {subjectWise.length}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                      marginTop: 2,
                    }}
                  >
                    {performance.filter((p) => p.isComplete).length}/6{" "}
                    {t("teacher.examCyclesDone", "Exam Cycles Done")}
                  </Text>
                </Card>
              </View>

              {/* Main Navigation Segmented Control */}
              <SegmentedControl
                tabs={[
                  {
                    key: "overview",
                    label: "📊 " + t("common.overview", "Overview"),
                  },
                  {
                    key: "subjects",
                    label:
                      "📚 " +
                      t("teacher.subjects", "Subjects") +
                      ` (${subjectWise.length})`,
                  },
                  {
                    key: "students",
                    label:
                      "🎓 " +
                      t("common.students", "Students") +
                      ` (${students.length})`,
                  },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                style={{ marginTop: 20, marginBottom: 16 }}
              />

              {/* TAB 1: OVERVIEW & EXAMS */}
              {activeTab === "overview" && (
                <View>
                  {/* {t('teacher.performanceTrend', 'Performance Trend')} Chart */}
                  {completedExams.length > 0 && (
                    <Card
                      variant="elevated"
                      style={{ marginBottom: 16 }}
                      contentStyle={{ padding: 16 }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.bold,
                              color: colors.onSurface,
                            }}
                          >
                            Performance Trend
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              fontFamily: FONTS.regular,
                              marginTop: 2,
                            }}
                          >
                            {t(
                              "teacher.averageScoreProgression",
                              "Average score progression across standardized exams"
                            )}
                          </Text>
                        </View>
                        <MaterialIcons
                          name="show-chart"
                          size={22}
                          color={colors.primary}
                        />
                      </View>
                      <LineChart
                        data={{
                          labels: chartLabels,
                          datasets: [{ data: chartData }],
                        }}
                        width={width - 64}
                        height={210}
                        yAxisSuffix="%"
                        chartConfig={{
                          backgroundColor: colors.surfaceContainer,
                          backgroundGradientFrom: colors.surfaceContainer,
                          backgroundGradientTo: colors.surfaceContainer,
                          decimalPlaces: 0,
                          color: (_opacity = 1) => colors.primary,
                          labelColor: (_opacity = 1) => colors.onSurfaceVariant,
                          style: { borderRadius: 16 },
                          propsForDots: {
                            r: "6",
                            strokeWidth: "2",
                            stroke: colors.primary,
                          },
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                      />
                    </Card>
                  )}

                  {/* {t('teacher.gradeDistribution', 'Grade Distribution')} Breakdown */}
                  {insights.gradeDistribution && (
                    <Card
                      variant="elevated"
                      style={{ marginBottom: 16 }}
                      contentStyle={{ padding: 16 }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.lg,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                          marginBottom: 12,
                        }}
                      >
                        Grade Distribution
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 6,
                        }}
                      >
                        {Object.entries(insights.gradeDistribution).map(
                          ([grade, count]) => {
                            const pct =
                              totalStudents > 0
                                ? ((count / totalStudents) * 100).toFixed(0)
                                : 0;
                            const gradeColor =
                              GRADE_COLORS[grade] || colors.primary;
                            return (
                              <View
                                key={grade}
                                style={{
                                  flex: 1,
                                  backgroundColor: colors.surfaceContainerLow,
                                  borderRadius: 12,
                                  padding: 10,
                                  alignItems: "center",
                                  borderTopWidth: 3,
                                  borderTopColor: gradeColor,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.md,
                                    fontFamily: FONTS.bold,
                                    color: gradeColor,
                                  }}
                                >
                                  {grade}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.xl,
                                    fontFamily: FONTS.bold,
                                    color: colors.onSurface,
                                    marginTop: 4,
                                  }}
                                >
                                  {count}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.micro,
                                    color: colors.onSurfaceVariant,
                                    fontFamily: FONTS.regular,
                                  }}
                                >
                                  {pct}%
                                </Text>
                              </View>
                            );
                          }
                        )}
                      </View>
                    </Card>
                  )}

                  {/* Exam-wise Breakdown Cards with Expandable Subjects */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 8,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xl,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                      }}
                    >
                      {t(
                        "teacher.standardizedExamCycles",
                        "Standardized Exam Cycles"
                      )}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t("teacher.tapCardForSubjects", "Tap card for subjects")}
                    </Text>
                  </View>

                  {performance.map((exam) => {
                    const isExpanded = !!expandedExams[exam.examType];
                    const examColor =
                      EXAM_COLORS[exam.examType] || colors.primary;

                    return (
                      <Card
                        key={exam.examType}
                        variant="elevated"
                        style={{ marginBottom: 12 }}
                        contentStyle={{ padding: 16 }}
                      >
                        <Pressable
                          onPress={() => toggleExamExpand(exam.examType)}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  backgroundColor: examColor + "20",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: examColor,
                                    fontFamily: FONTS.bold,
                                    fontSize: FONT_SIZES.md,
                                  }}
                                >
                                  {exam.examType}
                                </Text>
                              </View>
                              <View>
                                <Text
                                  style={{
                                    fontSize: 17,
                                    fontFamily: FONTS.bold,
                                    color: colors.onSurface,
                                  }}
                                >
                                  {exam.examType}{" "}
                                  {t("teacher.examination", "Examination")}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.sm,
                                    color: colors.onSurfaceVariant,
                                    fontFamily: FONTS.regular,
                                    marginTop: 2,
                                  }}
                                >
                                  {exam.subjectsCount}{" "}
                                  {exam.subjectsCount !== 1
                                    ? t("common.subjects", "subjects")
                                    : t("common.subject", "subject")}{" "}
                                  • {exam.studentsWithMarks}/{totalStudents}{" "}
                                  {t("teacher.evaluated", "evaluated")}
                                </Text>
                              </View>
                            </View>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              {exam.isComplete ? (
                                <View
                                  style={{
                                    backgroundColor: colors.success + "20",
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 8,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: colors.success,
                                      fontFamily: FONTS.bold,
                                      fontSize: FONT_SIZES.xs,
                                    }}
                                  >
                                    {t("common.complete", "COMPLETE")}
                                  </Text>
                                </View>
                              ) : (
                                <View
                                  style={{
                                    backgroundColor:
                                      colors.onSurfaceVariant + "20",
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 8,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: colors.onSurfaceVariant,
                                      fontFamily: FONTS.bold,
                                      fontSize: FONT_SIZES.xs,
                                    }}
                                  >
                                    {t("common.pending", "PENDING")}
                                  </Text>
                                </View>
                              )}
                              <MaterialIcons
                                name={
                                  isExpanded
                                    ? "keyboard-arrow-up"
                                    : "keyboard-arrow-down"
                                }
                                size={24}
                                color={colors.onSurfaceVariant}
                              />
                            </View>
                          </View>

                          <View
                            style={{
                              height: 1,
                              backgroundColor: colors.outlineVariant,
                              marginVertical: 12,
                              opacity: 0.5,
                            }}
                          />

                          {/* Scores Row */}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  color: colors.onSurfaceVariant,
                                  fontFamily: FONTS.medium,
                                }}
                              >
                                Class Average
                              </Text>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.title,
                                  fontFamily: FONTS.bold,
                                  color: getGradeColor(exam.avgPercentage),
                                }}
                              >
                                {exam.avgPercentage?.toFixed(1) || "0.0"}%
                              </Text>
                            </View>
                            <View style={{ flex: 1, alignItems: "center" }}>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  color: colors.onSurfaceVariant,
                                  fontFamily: FONTS.medium,
                                }}
                              >
                                Highest
                              </Text>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xl,
                                  fontFamily: FONTS.bold,
                                  color: colors.success,
                                }}
                              >
                                {exam.highest?.toFixed(1) || "0.0"}%
                              </Text>
                            </View>
                            <View style={{ flex: 1, alignItems: "flex-end" }}>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  color: colors.onSurfaceVariant,
                                  fontFamily: FONTS.medium,
                                }}
                              >
                                Lowest
                              </Text>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xl,
                                  fontFamily: FONTS.bold,
                                  color: colors.error,
                                }}
                              >
                                {exam.lowest?.toFixed(1) || "0.0"}%
                              </Text>
                            </View>
                          </View>
                        </Pressable>

                        {/* Expandable Subject Breakdown for this Exam */}
                        {isExpanded &&
                          exam.subjects &&
                          exam.subjects.length > 0 && (
                            <View
                              style={{
                                marginTop: 14,
                                paddingTop: 12,
                                borderTopWidth: 1,
                                borderTopColor: colors.outlineVariant,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.md,
                                  fontFamily: FONTS.bold,
                                  color: colors.onSurface,
                                  marginBottom: 8,
                                }}
                              >
                                {t(
                                  "teacher.subjectBreakdownFor",
                                  "Subject Breakdown for"
                                )}{" "}
                                {exam.examType}
                              </Text>
                              {exam.subjects.map((sub) => (
                                <View
                                  key={sub.examId || sub.subjectId}
                                  style={{
                                    backgroundColor: colors.surfaceContainerLow,
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.base,
                                        fontFamily: FONTS.bold,
                                        color: colors.onSurface,
                                      }}
                                    >
                                      {sub.subjectName}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.base,
                                        fontFamily: FONTS.bold,
                                        color: getGradeColor(sub.avgPercentage),
                                      }}
                                    >
                                      {sub.avgPercentage}% Avg
                                    </Text>
                                  </View>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      marginTop: 6,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.xs,
                                        color: colors.onSurfaceVariant,
                                        fontFamily: FONTS.regular,
                                      }}
                                    >
                                      {t("common.max", "Max")}: {sub.totalMarks}{" "}
                                      {t("teacher.marks", "marks")} •{" "}
                                      {t("teacher.evaluated", "Evaluated")}:{" "}
                                      {sub.marksEntered}/{sub.totalStudents}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.xs,
                                        color: colors.onSurfaceVariant,
                                        fontFamily: FONTS.regular,
                                      }}
                                    >
                                      {t("common.high", "High")}:{" "}
                                      <Text
                                        style={{
                                          color: colors.success,
                                          fontFamily: FONTS.bold,
                                        }}
                                      >
                                        {sub.highest}%
                                      </Text>{" "}
                                      • {t("common.low", "Low")}:{" "}
                                      <Text
                                        style={{
                                          color: colors.error,
                                          fontFamily: FONTS.bold,
                                        }}
                                      >
                                        {sub.lowest}%
                                      </Text>
                                    </Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                      </Card>
                    );
                  })}

                  {performance.length === 0 && (
                    <View
                      style={{
                        alignItems: "center",
                        marginTop: 40,
                        opacity: 0.6,
                      }}
                    >
                      <MaterialIcons
                        name="assessment"
                        size={64}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={{
                          color: colors.onSurfaceVariant,
                          marginTop: 16,
                          fontSize: FONT_SIZES.mdLg,
                          textAlign: "center",
                        }}
                      >
                        {t(
                          "teacher.noExamCyclesYet",
                          "No exam cycles available yet."
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* TAB 2: SUBJECT-WISE BREAKDOWN */}
              {activeTab === "subjects" && (
                <View>
                  {/* Subject Highlights Banner */}
                  {(insights.bestSubject || insights.weakestSubject) && (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        marginBottom: 16,
                      }}
                    >
                      {insights.bestSubject && (
                        <Card
                          variant="elevated"
                          style={{
                            flex: 1,
                            backgroundColor: colors.success + "10",
                            borderColor: colors.success + "30",
                            borderWidth: 1,
                          }}
                          contentStyle={{ padding: 12 }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Text style={{ fontSize: FONT_SIZES.base }}>🌟</Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                fontFamily: FONTS.bold,
                                color: colors.success,
                              }}
                            >
                              {t("teacher.topSubject", "TOP SUBJECT")}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.mdLg,
                              fontFamily: FONTS.bold,
                              color: colors.onSurface,
                              marginTop: 4,
                            }}
                          >
                            {insights.bestSubject.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.success,
                              fontFamily: FONTS.medium,
                              marginTop: 2,
                            }}
                          >
                            {insights.bestSubject.avgPercentage}%{" "}
                            {t("teacher.classAvg", "Class Avg")}
                          </Text>
                        </Card>
                      )}

                      {insights.weakestSubject && (
                        <Card
                          variant="elevated"
                          style={{
                            flex: 1,
                            backgroundColor: colors.error + "10",
                            borderColor: colors.error + "30",
                            borderWidth: 1,
                          }}
                          contentStyle={{ padding: 12 }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Text style={{ fontSize: FONT_SIZES.base }}>⚠️</Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                fontFamily: FONTS.bold,
                                color: colors.error,
                              }}
                            >
                              {t("teacher.needsFocus", "NEEDS FOCUS")}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.mdLg,
                              fontFamily: FONTS.bold,
                              color: colors.onSurface,
                              marginTop: 4,
                            }}
                          >
                            {insights.weakestSubject.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.error,
                              fontFamily: FONTS.medium,
                              marginTop: 2,
                            }}
                          >
                            {insights.weakestSubject.avgPercentage}% Class Avg
                          </Text>
                        </Card>
                      )}
                    </View>
                  )}

                  {/* Subjects List */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xl,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                      }}
                    >
                      {t("teacher.subjectAnalytics", "Subject Analytics")} (
                      {subjectWise.length})
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t("teacher.rankedByAverage", "Ranked by Average")}
                    </Text>
                  </View>

                  {subjectWise.map((subject, index) => {
                    const isExpanded = !!expandedSubjects[subject.subjectId];
                    const gradeColor =
                      GRADE_COLORS[subject.grade] || colors.primary;

                    return (
                      <Card
                        key={subject.subjectId || index}
                        variant="elevated"
                        style={{ marginBottom: 12 }}
                        contentStyle={{ padding: 16 }}
                      >
                        <Pressable
                          onPress={() => toggleSubjectExpand(subject.subjectId)}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                flex: 1,
                              }}
                            >
                              <View
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 10,
                                  backgroundColor: colors.primaryContainer,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <MaterialIcons
                                  name="auto-stories"
                                  size={20}
                                  color={colors.onPrimaryContainer}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.lg,
                                    fontFamily: FONTS.bold,
                                    color: colors.onSurface,
                                  }}
                                >
                                  {subject.subjectName}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.sm,
                                    color: colors.onSurfaceVariant,
                                    fontFamily: FONTS.regular,
                                    marginTop: 2,
                                  }}
                                >
                                  {subject.examsConducted}{" "}
                                  {t(
                                    "teacher.examsConducted",
                                    "Exams Conducted"
                                  )}{" "}
                                  • {subject.passPercentage}% Pass Rate
                                </Text>
                              </View>
                            </View>

                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <View
                                style={{
                                  backgroundColor: gradeColor + "20",
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.sm,
                                    fontFamily: FONTS.bold,
                                    color: gradeColor,
                                  }}
                                >
                                  {t("common.grade", "Grade")} {subject.grade}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xxl,
                                  fontFamily: FONTS.bold,
                                  color: getGradeColor(subject.avgPercentage),
                                }}
                              >
                                {subject.avgPercentage}%
                              </Text>
                            </View>
                          </View>

                          {/* Progress Gauge Bar */}
                          <View
                            style={{
                              height: 8,
                              backgroundColor: colors.surfaceContainerHighest,
                              borderRadius: 4,
                              marginTop: 12,
                              overflow: "hidden",
                            }}
                          >
                            <View
                              style={{
                                width: `${Math.min(
                                  subject.avgPercentage,
                                  100
                                )}%`,
                                height: "100%",
                                backgroundColor: getGradeColor(
                                  subject.avgPercentage
                                ),
                                borderRadius: 4,
                              }}
                            />
                          </View>

                          {/* Quick Stats Footnote */}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              marginTop: 10,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                fontFamily: FONTS.regular,
                              }}
                            >
                              {t("common.highest", "Highest")}:{" "}
                              <Text
                                style={{
                                  color: colors.success,
                                  fontFamily: FONTS.bold,
                                }}
                              >
                                {subject.highest}%
                              </Text>
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                fontFamily: FONTS.regular,
                              }}
                            >
                              {t("common.lowest", "Lowest")}:{" "}
                              <Text
                                style={{
                                  color: colors.error,
                                  fontFamily: FONTS.bold,
                                }}
                              >
                                {subject.lowest}%
                              </Text>
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  color: colors.primary,
                                  fontFamily: FONTS.bold,
                                }}
                              >
                                {isExpanded
                                  ? t(
                                      "teacher.hideCycleHistory",
                                      "Hide Cycle History"
                                    )
                                  : t(
                                      "teacher.viewCycleHistory",
                                      "View Cycle History"
                                    )}
                              </Text>
                              <MaterialIcons
                                name={
                                  isExpanded
                                    ? "keyboard-arrow-up"
                                    : "keyboard-arrow-down"
                                }
                                size={16}
                                color={colors.primary}
                              />
                            </View>
                          </View>
                        </Pressable>

                        {/* Expandable Exam History for this Subject */}
                        {isExpanded && subject.examScores && (
                          <View
                            style={{
                              marginTop: 14,
                              paddingTop: 12,
                              borderTopWidth: 1,
                              borderTopColor: colors.outlineVariant,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.md,
                                fontFamily: FONTS.bold,
                                color: colors.onSurface,
                                marginBottom: 8,
                              }}
                            >
                              {t(
                                "teacher.examProgressionFor",
                                "Exam Progression for"
                              )}{" "}
                              {subject.subjectName}
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              {subject.examScores.map((es) => (
                                <View
                                  key={es.examType}
                                  style={{
                                    flex: 1,
                                    minWidth: 90,
                                    backgroundColor: colors.surfaceContainerLow,
                                    borderRadius: 8,
                                    padding: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: FONT_SIZES.xs,
                                      fontFamily: FONTS.bold,
                                      color:
                                        EXAM_COLORS[es.examType] ||
                                        colors.primary,
                                    }}
                                  >
                                    {es.examType}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: FONT_SIZES.mdLg,
                                      fontFamily: FONTS.bold,
                                      color:
                                        es.conducted &&
                                        es.avgPercentage !== null
                                          ? getGradeColor(es.avgPercentage)
                                          : colors.onSurfaceVariant,
                                      marginTop: 2,
                                    }}
                                  >
                                    {es.conducted && es.avgPercentage !== null
                                      ? `${es.avgPercentage}%`
                                      : "-"}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      color: colors.onSurfaceVariant,
                                      fontFamily: FONTS.regular,
                                      marginTop: 1,
                                    }}
                                  >
                                    {es.conducted
                                      ? `${es.marksEntered} ${t(
                                          "teacher.evaluated",
                                          "evaluated"
                                        )}`
                                      : t("teacher.notHeld", "Not Held")}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </Card>
                    );
                  })}

                  {subjectWise.length === 0 && (
                    <View
                      style={{
                        alignItems: "center",
                        marginTop: 40,
                        opacity: 0.6,
                      }}
                    >
                      <MaterialIcons
                        name="menu-book"
                        size={64}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={{
                          color: colors.onSurfaceVariant,
                          marginTop: 16,
                          fontSize: FONT_SIZES.mdLg,
                          textAlign: "center",
                        }}
                      >
                        {t(
                          "teacher.noSubjectsFoundClass",
                          "No subjects found for this class."
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* TAB 3: STUDENT-WISE BREAKDOWN & LEADERBOARD */}
              {activeTab === "students" && (
                <View>
                  {/* Search and Controls Bar */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.surfaceContainerHigh,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      height: 48,
                      marginBottom: 12,
                    }}
                  >
                    <MaterialIcons
                      name="search"
                      size={22}
                      color={colors.onSurfaceVariant}
                    />
                    <RNTextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder={t(
                        "teacher.searchStudentsPlaceholder",
                        "Search student name, roll or reg no..."
                      )}
                      placeholderTextColor={colors.onSurfaceVariant + "80"}
                      style={{
                        flex: 1,
                        paddingHorizontal: 10,
                        color: colors.onSurface,
                        fontSize: FONT_SIZES.base,
                        fontFamily: FONTS.regular,
                      }}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery("")}>
                        <MaterialIcons
                          name="close"
                          size={20}
                          color={colors.onSurfaceVariant}
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Filter Chips Bar (Performance Tier) */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 12 }}
                  >
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {[
                        {
                          id: "all",
                          label: `${t("common.all", "All")} (${
                            students.length
                          })`,
                        },
                        {
                          id: "top",
                          label: `🌟 ${t("teacher.topPercent", "Top (>80%)")}`,
                        },
                        {
                          id: "average",
                          label: `📈 ${t(
                            "teacher.averagePercent",
                            "Average (50-80%)"
                          )}`,
                        },
                        {
                          id: "attention",
                          label: `⚠️ ${t(
                            "teacher.needsHelpPercent",
                            "Needs Help (<50%)"
                          )}`,
                        },
                      ].map((chip) => {
                        const isActive = studentFilter === chip.id;
                        return (
                          <Pressable
                            key={chip.id}
                            onPress={() => setStudentFilter(chip.id)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: isActive
                                ? colors.primary
                                : colors.surfaceContainerHigh,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                fontFamily: isActive
                                  ? FONTS.bold
                                  : FONTS.medium,
                                color: isActive
                                  ? colors.onPrimary
                                  : colors.onSurfaceVariant,
                              }}
                            >
                              {chip.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Exam Filter Chips (Filter by Exam Cycle) */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          color: colors.onSurfaceVariant,
                          fontFamily: FONTS.medium,
                          marginRight: 4,
                        }}
                      >
                        {t("teacher.examCycleLabel", "Exam Cycle:")}
                      </Text>
                      {examTypes.map((type) => {
                        const isActive = selectedExamFilter === type;
                        return (
                          <Pressable
                            key={type}
                            onPress={() => setSelectedExamFilter(type)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 14,
                              backgroundColor: isActive
                                ? EXAM_COLORS[type] || colors.primary
                                : colors.surfaceContainerLow,
                              borderWidth: 1,
                              borderColor: isActive
                                ? EXAM_COLORS[type] || colors.primary
                                : colors.outlineVariant,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                fontFamily: isActive
                                  ? FONTS.bold
                                  : FONTS.medium,
                                color: isActive
                                  ? "#FFFFFF"
                                  : colors.onSurfaceVariant,
                              }}
                            >
                              {type}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Sort Selector and Result Count */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.md,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t("common.showing", "Showing")} {filteredStudents.length}{" "}
                      {t("common.of", "of")} {students.length}{" "}
                      {t("common.students", "students")}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable
                        onPress={() =>
                          setSortBy((prev) =>
                            prev === "rank"
                              ? "name"
                              : prev === "name"
                              ? "score_desc"
                              : "rank"
                          )
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: colors.surfaceContainerLow,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <MaterialIcons
                          name="sort"
                          size={16}
                          color={colors.primary}
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: FONTS.bold,
                            color: colors.primary,
                          }}
                        >
                          {t("common.sort", "Sort")}:{" "}
                          {sortBy === "rank"
                            ? t("teacher.classRank", "Class Rank")
                            : sortBy === "name"
                            ? t("common.name", "Name (A-Z)")
                            : t("teacher.score", "Score")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Students List */}
                  {filteredStudents.map((student) => {
                    const isExpanded =
                      !!expandedStudents[student._id || student.studentId];
                    const gradeColor =
                      GRADE_COLORS[student.grade] || colors.primary;
                    const rank = student.rank;
                    const rankEmoji =
                      rank === 1
                        ? "🥇"
                        : rank === 2
                        ? "🥈"
                        : rank === 3
                        ? "🥉"
                        : `#${rank}`;

                    return (
                      <Card
                        key={student._id || student.studentId}
                        variant="elevated"
                        style={{ marginBottom: 12 }}
                        contentStyle={{ padding: 16 }}
                      >
                        <Pressable
                          onPress={() =>
                            toggleStudentExpand(
                              student._id || student.studentId
                            )
                          }
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <View
                              style={{ flexDirection: "row", gap: 12, flex: 1 }}
                            >
                              {/* Rank Badge */}
                              <View
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 20,
                                  backgroundColor:
                                    rank <= 3
                                      ? "#FFD700" + "25"
                                      : colors.surfaceContainerHighest,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderWidth: rank <= 3 ? 1.5 : 0,
                                  borderColor:
                                    rank === 1
                                      ? "#FFD700"
                                      : rank === 2
                                      ? "#C0C0C0"
                                      : "#CD7F32",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: rank <= 3 ? 18 : 13,
                                    fontFamily: FONTS.bold,
                                    color: colors.onSurface,
                                  }}
                                >
                                  {rankEmoji}
                                </Text>
                              </View>

                              {/* Student Avatar */}
                              <UserAvatar
                                photoUrl={student.profilePhoto}
                                name={formatUserName(student.name)}
                                role="student"
                                size={40}
                              />

                              {/* Student Info */}
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.lg,
                                    fontFamily: FONTS.bold,
                                    color: colors.onSurface,
                                  }}
                                >
                                  {formatUserName(student.name)}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.sm,
                                    color: colors.onSurfaceVariant,
                                    fontFamily: FONTS.regular,
                                    marginTop: 2,
                                  }}
                                >
                                  {student.rollNumber
                                    ? `${t("common.roll", "Roll")}: ${
                                        student.rollNumber
                                      }`
                                    : student.regNo
                                    ? `${t("common.reg", "Reg")}: ${
                                        student.regNo
                                      }`
                                    : ""}
                                  {student.gender ? ` • ${student.gender}` : ""}
                                </Text>

                                {/* Highlight Chips (Strong / Weak Subject) */}
                                <View
                                  style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 6,
                                    marginTop: 6,
                                  }}
                                >
                                  {student.topSubject && (
                                    <View
                                      style={{
                                        backgroundColor: colors.success + "15",
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        borderRadius: 6,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: FONT_SIZES.micro,
                                          fontFamily: FONTS.medium,
                                          color: colors.success,
                                        }}
                                      >
                                        🌟 {student.topSubject.name} (
                                        {student.topSubject.percentage}%)
                                      </Text>
                                    </View>
                                  )}
                                  {student.weakSubject &&
                                    student.weakSubject.percentage < 50 && (
                                      <View
                                        style={{
                                          backgroundColor: colors.error + "15",
                                          paddingHorizontal: 8,
                                          paddingVertical: 2,
                                          borderRadius: 6,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: FONT_SIZES.micro,
                                            fontFamily: FONTS.medium,
                                            color: colors.error,
                                          }}
                                        >
                                          ⚠️ {student.weakSubject.name} (
                                          {student.weakSubject.percentage}%)
                                        </Text>
                                      </View>
                                    )}
                                </View>
                              </View>
                            </View>

                            {/* Percentage & Grade */}
                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <View
                                style={{
                                  backgroundColor: gradeColor + "20",
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.sm,
                                    fontFamily: FONTS.bold,
                                    color: gradeColor,
                                  }}
                                >
                                  {t("common.grade", "Grade")} {student.grade}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xxl,
                                  fontFamily: FONTS.bold,
                                  color: getGradeColor(
                                    student.overallPercentage
                                  ),
                                }}
                              >
                                {student.overallPercentage}%
                              </Text>
                            </View>
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: 12,
                              paddingTop: 8,
                              borderTopWidth: 1,
                              borderTopColor: colors.outlineVariant,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                color: colors.onSurfaceVariant,
                                fontFamily: FONTS.regular,
                              }}
                            >
                              {student.examsAttempted}{" "}
                              {t("teacher.examsEvaluated", "exams evaluated")} •{" "}
                              {t("common.total", "Total")}:{" "}
                              {student.totalObtained}/{student.totalMax}{" "}
                              {t("teacher.marks", "marks")}
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  color: colors.primary,
                                  fontFamily: FONTS.bold,
                                }}
                              >
                                {isExpanded
                                  ? t("common.hideDetails", "Hide Details")
                                  : t(
                                      "teacher.viewSubjectBreakdown",
                                      "View Subject Breakdown"
                                    )}
                              </Text>
                              <MaterialIcons
                                name={
                                  isExpanded
                                    ? "keyboard-arrow-up"
                                    : "keyboard-arrow-down"
                                }
                                size={16}
                                color={colors.primary}
                              />
                            </View>
                          </View>
                        </Pressable>

                        {/* Expanded Breakdown: All Subjects & Exam History */}
                        {isExpanded && (
                          <View
                            style={{
                              marginTop: 12,
                              paddingTop: 10,
                              borderTopWidth: 1,
                              borderTopColor: colors.outlineVariant,
                            }}
                          >
                            {/* Subject wise marks table */}
                            <Text
                              style={{
                                fontSize: FONT_SIZES.md,
                                fontFamily: FONTS.bold,
                                color: colors.onSurface,
                                marginBottom: 8,
                              }}
                            >
                              {t(
                                "teacher.subjectWisePerformance",
                                "Subject-wise Performance"
                              )}
                            </Text>
                            {student.subjectBreakdown &&
                            student.subjectBreakdown.length > 0 ? (
                              student.subjectBreakdown.map((sub) => (
                                <View
                                  key={sub.subjectId}
                                  style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    paddingVertical: 8,
                                    paddingHorizontal: 10,
                                    backgroundColor: colors.surfaceContainerLow,
                                    borderRadius: 8,
                                    marginBottom: 6,
                                  }}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.md,
                                        fontFamily: FONTS.bold,
                                        color: colors.onSurface,
                                      }}
                                    >
                                      {sub.subjectName}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.xs,
                                        color: colors.onSurfaceVariant,
                                        fontFamily: FONTS.regular,
                                      }}
                                    >
                                      {t("teacher.obtained", "Obtained")}:{" "}
                                      {sub.obtainedMarks}/{sub.maxMarks}{" "}
                                      {t("teacher.marks", "marks")}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: "flex-end" }}>
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.base,
                                        fontFamily: FONTS.bold,
                                        color:
                                          sub.percentage !== null
                                            ? getGradeColor(sub.percentage)
                                            : colors.onSurfaceVariant,
                                      }}
                                    >
                                      {sub.percentage !== null
                                        ? `${sub.percentage}%`
                                        : "-"}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.micro,
                                        color:
                                          GRADE_COLORS[sub.grade] ||
                                          colors.onSurfaceVariant,
                                        fontFamily: FONTS.bold,
                                      }}
                                    >
                                      {t("common.grade", "Grade")} {sub.grade}
                                    </Text>
                                  </View>
                                </View>
                              ))
                            ) : (
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.sm,
                                  color: colors.onSurfaceVariant,
                                  fontStyle: "italic",
                                }}
                              >
                                {t(
                                  "teacher.noSubjectMarksYet",
                                  "No subject marks recorded yet."
                                )}
                              </Text>
                            )}

                            {/* Exam-wise score row */}
                            <Text
                              style={{
                                fontSize: FONT_SIZES.md,
                                fontFamily: FONTS.bold,
                                color: colors.onSurface,
                                marginTop: 12,
                                marginBottom: 8,
                              }}
                            >
                              Standardized Exam Cycles
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {["FA1", "FA2", "SA1", "FA3", "FA4", "SA2"].map(
                                (type) => {
                                  const examData =
                                    student.examWise && student.examWise[type];
                                  const pct =
                                    examData && examData.percentage !== null
                                      ? examData.percentage
                                      : null;
                                  return (
                                    <View
                                      key={type}
                                      style={{
                                        flex: 1,
                                        minWidth: 80,
                                        backgroundColor:
                                          colors.surfaceContainerLow,
                                        borderRadius: 8,
                                        padding: 6,
                                        alignItems: "center",
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: FONT_SIZES.micro,
                                          fontFamily: FONTS.bold,
                                          color:
                                            EXAM_COLORS[type] || colors.primary,
                                        }}
                                      >
                                        {type}
                                      </Text>
                                      <Text
                                        style={{
                                          fontSize: FONT_SIZES.md,
                                          fontFamily: FONTS.bold,
                                          color:
                                            pct !== null
                                              ? getGradeColor(pct)
                                              : colors.onSurfaceVariant,
                                          marginTop: 1,
                                        }}
                                      >
                                        {pct !== null ? `${pct}%` : "-"}
                                      </Text>
                                      <Text
                                        style={{
                                          fontSize: 8,
                                          color: colors.onSurfaceVariant,
                                          fontFamily: FONTS.regular,
                                        }}
                                      >
                                        {examData
                                          ? `${examData.marksEntered}/${
                                              examData.totalSubjects
                                            } ${t("common.done", "done")}`
                                          : "-"}
                                      </Text>
                                    </View>
                                  );
                                }
                              )}
                            </View>

                            {/* View Details Modal button */}
                            <Pressable
                              onPress={() => setSelectedUserForModal(student)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                backgroundColor: colors.primaryContainer,
                                paddingVertical: 8,
                                borderRadius: 8,
                                marginTop: 12,
                              }}
                            >
                              <MaterialIcons
                                name="person"
                                size={16}
                                color={colors.onPrimaryContainer}
                              />
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.sm,
                                  fontFamily: FONTS.bold,
                                  color: colors.onPrimaryContainer,
                                }}
                              >
                                {t(
                                  "teacher.viewStudentProfile",
                                  "View Student Profile"
                                )}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </Card>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <View
                      style={{
                        alignItems: "center",
                        marginTop: 32,
                        padding: 16,
                      }}
                    >
                      <MaterialIcons
                        name="person-search"
                        size={56}
                        color={colors.onSurfaceVariant}
                        style={{ opacity: 0.5 }}
                      />
                      <Text
                        style={{
                          color: colors.onSurfaceVariant,
                          marginTop: 12,
                          fontSize: FONT_SIZES.mdLg,
                          fontFamily: FONTS.medium,
                          textAlign: "center",
                        }}
                      >
                        {t(
                          "teacher.noStudentsMatchCriteria",
                          "No students match your search or filter criteria."
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Student Profile Detail Modal */}
      <UserDetailModal
        visible={!!selectedUserForModal}
        onClose={() => setSelectedUserForModal(null)}
        user={selectedUserForModal}
      />
    </View>
  );
}
