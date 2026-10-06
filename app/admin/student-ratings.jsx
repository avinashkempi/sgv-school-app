import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, RADIUS, SPACING } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
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
import { useLabel } from "../../context/LabelsContext";
import SubmissionTrackerView from "../../components/SubmissionTrackerView";

const MONTH_NAMES = [
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

const DATA_POINTS = [
  {
    key: "classEngagement",
    label: "Class Engagement",
    desc: "Attentiveness, listening, participation, and answering questions",
    icon: "record-voice-over",
    color: "#6750A4",
  },
  {
    key: "homeworkClasswork",
    label: "Homework & Classwork",
    desc: "Completes homework & classwork on time, regularly, responsibly",
    icon: "assignment-turned-in",
    color: "#16A34A",
  },
  {
    key: "behaviourSocial",
    label: "Behaviour & Social",
    desc: "Discipline, respectful behaviour, cooperation, teamwork",
    icon: "groups",
    color: "#8B5CF6",
  },
  {
    key: "englishComm",
    label: "English Communication",
    desc: "Speaks in English, expresses ideas clearly, communicates confidently",
    icon: "chat",
    color: "#D97706",
  },
];

const getRatingLabel = (score) => {
  if (!score || score <= 0) return { label: "Unrated", color: "#6B7280", variant: "neutral" };
  if (score < 2.0) return { label: "Needs Significant Imp.", color: "#DC2626", variant: "error" };
  if (score < 3.0) return { label: "Needs Improvement", color: "#EA580C", variant: "warning" };
  if (score < 4.0) return { label: "Meets Expectation", color: "#6750A4", variant: "primary" };
  if (score < 4.8) return { label: "Good", color: "#16A34A", variant: "success" };
  return { label: "Excellent", color: "#059669", variant: "success" };
};

export default function AdminStudentRatingsScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { t } = useLabel();

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'classes' | 'movers'
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [studentSortBy, setStudentSortBy] = useState("highest"); // 'highest' | 'lowest' | 'attention'
  const [searchQuery, setSearchQuery] = useState("");
  const [moversTab, setMoversTab] = useState("improving"); // 'improving' | 'declining'
  const [refreshing, setRefreshing] = useState(false);

  // Student drilldown modal state
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Month navigation logic
  const isCurrentMonth =
    selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();

  const canGoNext =
    selectedYear < now.getFullYear() ||
    (selectedYear === now.getFullYear() && selectedMonth < now.getMonth() + 1);

  const handlePrevMonth = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  }, [selectedMonth]);

  const handleNextMonth = useCallback(() => {
    if (!canGoNext) return;
    Haptics.selectionAsync().catch(() => {});
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  }, [canGoNext, selectedMonth]);

  const handleJumpToCurrent = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  }, [now]);

  // 1. Fetch School Summary
  const {
    data: schoolSummaryData,
    isLoading: loadingSchoolSummary,
    refetch: refetchSchoolSummary,
  } = useApiQuery(
    ["schoolRatingsSummary", selectedMonth, selectedYear],
    `${apiConfig.baseUrl}/student-ratings/school/summary?month=${selectedMonth}&year=${selectedYear}`,
    { ...CACHE_TIERS.MODERATE }
  );

  // 2. Fetch All Classes for filtering
  const { data: allClassesData } = useApiQuery(
    ["allClasses"],
    `${apiConfig.baseUrl}/classes`,
    { ...CACHE_TIERS.LONG }
  );

  const classesList = useMemo(() => {
    return allClassesData?.classes || allClassesData || [];
  }, [allClassesData]);

  // 3. Fetch Selected Class Summary (when in 'classes' tab and specific class selected)
  const isClassSpecific = selectedClassId !== "all" && !!selectedClassId;
  const {
    data: classSummaryData,
    isLoading: loadingClassSummary,
    refetch: refetchClassSummary,
  } = useApiQuery(
    ["classRatingsSummary", selectedClassId, selectedMonth, selectedYear],
    `${apiConfig.baseUrl}/student-ratings/class/${selectedClassId}/summary?month=${selectedMonth}&year=${selectedYear}`,
    {
      enabled: isClassSpecific,
      ...CACHE_TIERS.MODERATE,
    }
  );

  // 4. Fetch Movers (improving / declining)
  const {
    data: moversData,
    isLoading: loadingMovers,
    refetch: refetchMovers,
  } = useApiQuery(
    ["schoolRatingsMovers", selectedMonth, selectedYear, selectedClassId],
    `${apiConfig.baseUrl}/student-ratings/school/movers?month=${selectedMonth}&year=${selectedYear}${
      isClassSpecific ? `&classId=${selectedClassId}` : ""
    }`,
    { ...CACHE_TIERS.MODERATE }
  );

  // 5. Fetch Student Drilldown Details
  const { data: studentDetailsData, isLoading: loadingStudentDetails } =
    useApiQuery(
      ["studentRatingDetails", selectedStudentId, selectedMonth, selectedYear],
      `${apiConfig.baseUrl}/student-ratings/student/${selectedStudentId}/details?month=${selectedMonth}&year=${selectedYear}`,
      { enabled: !!selectedStudentId }
    );

  // 6. Fetch Student Monthly Trend
  const { data: studentTrendData, isLoading: loadingStudentTrend } = useApiQuery(
    ["studentRatingTrend", selectedStudentId],
    `${apiConfig.baseUrl}/student-ratings/student/${selectedStudentId}/trend?months=6`,
    { enabled: !!selectedStudentId }
  );

  // 7. Fetch Submission Tracker Data
  const {
    data: trackerData,
    isLoading: loadingTracker,
    refetch: refetchTracker,
  } = useApiQuery(
    ["ratingsSubmissionTracker", selectedMonth, selectedYear],
    `${apiConfig.baseUrl}/student-ratings/tracker?month=${selectedMonth}&year=${selectedYear}`,
    { ...CACHE_TIERS.MODERATE }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSchoolSummary(),
        refetchMovers(),
        refetchTracker(),
        isClassSpecific ? refetchClassSummary() : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ["schoolRatingsSummary"] }),
        queryClient.invalidateQueries({ queryKey: ["ratingsSubmissionTracker"] }),
      ]);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const monthName = MONTH_NAMES[selectedMonth - 1];
  const schoolAverage = schoolSummaryData?.schoolAverage;
  const schoolClasses = useMemo(
    () => schoolSummaryData?.classes || [],
    [schoolSummaryData]
  );

  // Compute school-wide criteria averages
  const schoolCriteriaAverages = useMemo(() => {
    if (schoolClasses.length === 0) {
      return { classEngagement: 0, homeworkClasswork: 0, behaviourSocial: 0, englishComm: 0 };
    }
    const total = schoolClasses.length;
    return {
      classEngagement: (
        schoolClasses.reduce((s, c) => s + (c.avgClassEngagement || 0), 0) / total
      ).toFixed(2),
      homeworkClasswork: (
        schoolClasses.reduce((s, c) => s + (c.avgHomeworkClasswork || 0), 0) / total
      ).toFixed(2),
      behaviourSocial: (
        schoolClasses.reduce((s, c) => s + (c.avgBehaviourSocial || 0), 0) / total
      ).toFixed(2),
      englishComm: (
        schoolClasses.reduce((s, c) => s + (c.avgEnglishComm || 0), 0) / total
      ).toFixed(2),
    };
  }, [schoolClasses]);

  // Students list for 'classes' tab
  const classStudents = useMemo(() => {
    let list = classSummaryData?.students || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.student?.name || "").toLowerCase();
        const regNo = (item.student?.regNo || "").toLowerCase();
        return name.includes(q) || regNo.includes(q);
      });
    }

    if (studentSortBy === "lowest") {
      list = [...list].sort((a, b) => a.overallAverage - b.overallAverage);
    } else if (studentSortBy === "attention") {
      list = list.filter((s) => s.overallAverage < 3.0);
    } else {
      // Highest first
      list = [...list].sort((a, b) => b.overallAverage - a.overallAverage);
    }

    return list;
  }, [classSummaryData, searchQuery, studentSortBy]);

  // Movers list
  const improvingMovers = moversData?.improving || [];
  const decliningMovers = moversData?.declining || [];
  const activeMoversList = moversTab === "improving" ? improvingMovers : decliningMovers;

  // ──────────────────────────────────────────────
  //  TAB 1: OVERVIEW
  // ──────────────────────────────────────────────
  const renderOverviewTab = () => (
    <View>
      {/* School Average Hero Card */}
      <Card
        variant="elevated"
        style={styles.heroCard}
        contentStyle={styles.heroCardContent}
      >
        <View style={styles.heroLeftCol}>
          <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
            {t("admin.schoolAverageRating", "School-wide Average Rating")}
          </Text>
          <View style={styles.heroScoreRow}>
            <Text style={[styles.heroScoreText, { color: colors.primary }]}>
              {schoolAverage ? schoolAverage.toFixed(2) : "--"}
            </Text>
            <Text style={[styles.heroScoreMax, { color: colors.onSurfaceVariant }]}>
              / 5.0
            </Text>
          </View>
          <View style={{ marginTop: 4 }}>
            {schoolAverage ? (
              <Badge
                variant={getRatingLabel(schoolAverage).variant}
                label={getRatingLabel(schoolAverage).label}
                size="md"
              />
            ) : (
              <Badge variant="neutral" label="No Ratings Yet" size="md" />
            )}
          </View>
        </View>

        <View style={styles.heroRightCol}>
          <View
            style={[
              styles.heroIconCircle,
              { backgroundColor: colors.primaryContainer || "#EADDFF" },
            ]}
          >
            <MaterialIcons name="auto-awesome" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroClassesCount, { color: colors.onSurfaceVariant }]}>
            {schoolClasses.length} Classes Rated
          </Text>
        </View>
      </Card>

      {/* 4 Core Data Points Averages */}
      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
        {t("admin.dataPointPerformance", "The 4 Evaluation Areas")}
      </Text>
      <View style={styles.criteriaGrid}>
        {DATA_POINTS.map((dp) => {
          const avg = schoolCriteriaAverages[dp.key] || 0;
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
                    { backgroundColor: `${dp.color}15` },
                  ]}
                >
                  <MaterialIcons name={dp.icon} size={20} color={dp.color} />
                </View>
                <Text style={[styles.criterionScore, { color: dp.color }]}>
                  {avg > 0 ? avg : "--"}
                </Text>
              </View>
              <Text
                style={[styles.criterionTitle, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {dp.label}
              </Text>
              <Text
                style={[styles.criterionDesc, { color: colors.onSurfaceVariant }]}
                numberOfLines={2}
              >
                {dp.desc}
              </Text>
              <View style={{ marginTop: 8 }}>
                <ProgressBar
                  progress={percent}
                  max={100}
                  progressColor={dp.color}
                  height={5}
                  borderRadius={3}
                />
              </View>
            </Card>
          );
        })}
      </View>

      {/* Class Comparison List */}
      <View style={styles.classComparisonHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 0 }]}>
          {t("admin.classComparison", "Class Benchmarks")}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceVariant }]}>
          {schoolClasses.length} Classes
        </Text>
      </View>

      {schoolClasses.length === 0 ? (
        <EmptyState
          icon="insights"
          title={t("admin.noClassRatings", "No Ratings Submitted This Month")}
          message={t(
            "admin.noClassRatingsDesc",
            "Teachers have not submitted any student ratings for this month yet."
          )}
        />
      ) : (
        schoolClasses.map((clsItem) => {
          const classLabel = formatClassName(
            clsItem.class?.name || clsItem.class?.label || clsItem.class?.value,
            clsItem.class?.section
          );
          const avgScore = clsItem.avgOverall || 0;
          const ratingInfo = getRatingLabel(avgScore);

          return (
            <Card
              key={clsItem.class?._id || clsItem.class?.label}
              variant="elevated"
              style={styles.classCard}
              onPress={() => {
                setSelectedClassId(clsItem.class?._id);
                setActiveTab("classes");
              }}
            >
              <View style={styles.classCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.classNameText, { color: colors.onSurface }]}>
                    {classLabel}
                  </Text>
                  <Text style={[styles.classStudentCount, { color: colors.onSurfaceVariant }]}>
                    {clsItem.studentCount} Students Evaluated
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={styles.scoreRow}>
                    <Text style={[styles.classScoreText, { color: ratingInfo.color }]}>
                      ★ {avgScore.toFixed(2)}
                    </Text>
                  </View>
                  <Badge
                    variant={ratingInfo.variant}
                    label={ratingInfo.label}
                    size="sm"
                  />
                </View>
              </View>

              {/* 4 Criteria Mini-bars */}
              <View style={styles.miniBarsContainer}>
                <View style={styles.miniBarItem}>
                  <Text style={[styles.miniBarLabel, { color: colors.onSurfaceVariant }]}>
                    Engagement
                  </Text>
                  <ProgressBar
                    progress={(clsItem.avgClassEngagement / 5) * 100}
                    max={100}
                    height={4}
                    variant="primary"
                  />
                  <Text style={[styles.miniBarVal, { color: colors.onSurface }]}>
                    {clsItem.avgClassEngagement}
                  </Text>
                </View>

                <View style={styles.miniBarItem}>
                  <Text style={[styles.miniBarLabel, { color: colors.onSurfaceVariant }]}>
                    Homework
                  </Text>
                  <ProgressBar
                    progress={(clsItem.avgHomeworkClasswork / 5) * 100}
                    max={100}
                    height={4}
                    variant="success"
                  />
                  <Text style={[styles.miniBarVal, { color: colors.onSurface }]}>
                    {clsItem.avgHomeworkClasswork}
                  </Text>
                </View>

                <View style={styles.miniBarItem}>
                  <Text style={[styles.miniBarLabel, { color: colors.onSurfaceVariant }]}>
                    Behaviour
                  </Text>
                  <ProgressBar
                    progress={(clsItem.avgBehaviourSocial / 5) * 100}
                    max={100}
                    height={4}
                    progressColor="#8B5CF6"
                  />
                  <Text style={[styles.miniBarVal, { color: colors.onSurface }]}>
                    {clsItem.avgBehaviourSocial}
                  </Text>
                </View>

                <View style={styles.miniBarItem}>
                  <Text style={[styles.miniBarLabel, { color: colors.onSurfaceVariant }]}>
                    English
                  </Text>
                  <ProgressBar
                    progress={(clsItem.avgEnglishComm / 5) * 100}
                    max={100}
                    height={4}
                    progressColor="#D97706"
                  />
                  <Text style={[styles.miniBarVal, { color: colors.onSurface }]}>
                    {clsItem.avgEnglishComm}
                  </Text>
                </View>
              </View>

              <View style={styles.classCardFooter}>
                <Text style={[styles.viewDetailsLink, { color: colors.primary }]}>
                  View Class Students & Rankings →
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );

  // ──────────────────────────────────────────────
  //  TAB 2: CLASSES & STUDENTS DRILLDOWN
  // ──────────────────────────────────────────────
  const renderClassesTab = () => (
    <View>
      {/* Class Selector Horizontal Scroll */}
      <Text style={[styles.selectorLabel, { color: colors.onSurfaceVariant }]}>
        Select Class:
      </Text>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.classPillsScroll}
      >
        {classesList.map((cls) => {
          const isSelected = selectedClassId === cls._id;
          const label = formatClassName(cls.name || cls.label || cls.value, cls.section);
          return (
            <TouchableOpacity
              key={cls._id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSelectedClassId(cls._id);
              }}
              style={[
                styles.classPill,
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
                  styles.classPillText,
                  {
                    color: isSelected
                      ? colors.onPrimary
                      : colors.onSurface,
                    fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedClassId === "all" ? (
        <View style={{ marginTop: 24 }}>
          <EmptyState
            icon="class"
            title="Select a Class"
            message="Choose a class from above to inspect individual student averages and performance rankings."
          />
        </View>
      ) : loadingClassSummary ? (
        <View style={{ marginTop: 40 }}>
          <LoadingState message="Loading class evaluation summary..." />
        </View>
      ) : classSummaryData?.students?.length === 0 ? (
        <View style={{ marginTop: 24 }}>
          <EmptyState
            icon="event-busy"
            title="No Ratings for this Class"
            message="No subject teachers have submitted ratings for this class in this month."
          />
        </View>
      ) : (
        <>
          {/* Class Summary Banner */}
          <Card
            variant="elevated"
            style={styles.classBannerCard}
            contentStyle={styles.classBannerContent}
          >
            <View style={styles.classBannerLeft}>
              <Text style={[styles.classBannerTitle, { color: colors.onSurface }]}>
                Class Average
              </Text>
              <Text style={[styles.classBannerSub, { color: colors.onSurfaceVariant }]}>
                {classSummaryData?.totalStudents || 0} students rated across subjects
              </Text>
            </View>
            <View style={styles.classBannerRight}>
              <Text style={[styles.classBannerScore, { color: colors.primary }]}>
                ★ {classSummaryData?.classAverage ? classSummaryData.classAverage.toFixed(2) : "--"}
              </Text>
            </View>
          </Card>

          {/* Search & Sort Controls */}
          <View style={styles.searchAndSortRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder="Search student by name or roll..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon="search"
                clearButton={true}
                size="sm"
              />
            </View>
          </View>

          {/* Sort Filter Pills */}
          <View style={styles.sortPillsRow}>
            {[
              { key: "highest", label: "Top Rank (High)" },
              { key: "lowest", label: "Lowest" },
              { key: "attention", label: "Needs Attention (< 3.0)" },
            ].map((pill) => {
              const isActive = studentSortBy === pill.key;
              return (
                <TouchableOpacity
                  key={pill.key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setStudentSortBy(pill.key);
                  }}
                  style={[
                    styles.sortPillBtn,
                    {
                      backgroundColor: isActive
                        ? colors.primaryContainer || "#EADDFF"
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

          {/* Students List */}
          <Text style={[styles.studentsCountLabel, { color: colors.onSurfaceVariant }]}>
            Showing {classStudents.length} Students (tap for full drilldown)
          </Text>

          {classStudents.map((item, index) => {
            const student = item.student;
            const avg = item.overallAverage;
            const ratingInfo = getRatingLabel(avg);

            return (
              <Card
                key={student?._id || index}
                variant="elevated"
                style={styles.studentCardItem}
                onPress={() => setSelectedStudentId(student?._id)}
              >
                <View style={styles.studentItemHeader}>
                  <View style={styles.studentItemLeft}>
                    <UserAvatar user={student} size={40} />
                    <View style={styles.studentItemDetails}>
                      <Text
                        style={[styles.studentItemName, { color: colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {student?.name || "Student"}
                      </Text>
                      <Text
                        style={[styles.studentItemSub, { color: colors.onSurfaceVariant }]}
                      >
                        {student?.regNo ? `Reg: ${student.regNo}` : "Student"} •{" "}
                        {item.subjectCount} Subjects Rated
                      </Text>
                    </View>
                  </View>

                  <View style={styles.studentItemRight}>
                    <Text style={[styles.studentItemScore, { color: ratingInfo.color }]}>
                      ★ {avg.toFixed(2)}
                    </Text>
                    <Badge
                      variant={ratingInfo.variant}
                      label={ratingInfo.label}
                      size="sm"
                    />
                  </View>
                </View>

                {/* Subject Variation Mini Preview */}
                <View style={styles.subjectMiniChipsRow}>
                  {item.subjects?.slice(0, 4).map((subj, sIdx) => (
                    <View
                      key={sIdx}
                      style={[
                        styles.subjectMiniChip,
                        {
                          backgroundColor:
                            colors.surfaceContainerHigh || "#EDEEF2",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectMiniChipText,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {subj.subject?.name}: {subj.averageScore.toFixed(1)}
                      </Text>
                    </View>
                  ))}
                  {item.subjects?.length > 4 && (
                    <Text
                      style={[
                        styles.moreSubjectsCount,
                        { color: colors.primary },
                      ]}
                    >
                      +{item.subjects.length - 4} more
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </View>
  );

  // ──────────────────────────────────────────────
  //  TAB 3: MOVERS (IMPROVING / DECLINING)
  // ──────────────────────────────────────────────
  const renderMoversTab = () => (
    <View>
      {/* Movers Summary Stats */}
      <View style={styles.moversStatGrid}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setMoversTab("improving");
          }}
          style={[
            styles.moversStatCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor:
                moversTab === "improving"
                  ? colors.success
                  : colors.outlineVariant,
              borderWidth: moversTab === "improving" ? 2 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons name="trending-up" size={24} color="#16A34A" />
            <Text style={[styles.moversCountText, { color: "#16A34A" }]}>
              {improvingMovers.length}
            </Text>
          </View>
          <Text style={[styles.moversLabelText, { color: colors.onSurface }]}>
            Improving Students
          </Text>
          <Text style={[styles.moversSubText, { color: colors.onSurfaceVariant }]}>
            Highest monthly gains
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setMoversTab("declining");
          }}
          style={[
            styles.moversStatCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor:
                moversTab === "declining"
                  ? colors.error
                  : colors.outlineVariant,
              borderWidth: moversTab === "declining" ? 2 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons name="trending-down" size={24} color="#DC2626" />
            <Text style={[styles.moversCountText, { color: "#DC2626" }]}>
              {decliningMovers.length}
            </Text>
          </View>
          <Text style={[styles.moversLabelText, { color: colors.onSurface }]}>
            Needs Attention
          </Text>
          <Text style={[styles.moversSubText, { color: colors.onSurfaceVariant }]}>
            Monthly score drops
          </Text>
        </TouchableOpacity>
      </View>

      {/* Movers List */}
      <Text style={[styles.sectionTitle, { color: colors.onSurface, marginTop: 16 }]}>
        {moversTab === "improving"
          ? "🚀 Students Showing Significant Growth"
          : "⚠️ Students Who Dropped Since Last Month"}
      </Text>

      {loadingMovers ? (
        <View style={{ marginTop: 40 }}>
          <LoadingState message="Calculating monthly movers..." />
        </View>
      ) : activeMoversList.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title={
            moversTab === "improving"
              ? "No High Gainers This Month"
              : "No Major Declines"
          }
          message="Student averages remained steady compared to the previous month, or previous month ratings have not been filed yet."
        />
      ) : (
        activeMoversList.map((item, index) => {
          const student = item.student;
          const isGain = item.change > 0;
          const classLabel = formatClassName(
            item.class?.label || item.class?.name,
            item.class?.section
          );

          return (
            <Card
              key={student?._id || index}
              variant="elevated"
              style={styles.moverCard}
              onPress={() => setSelectedStudentId(student?._id)}
            >
              <View style={styles.moverCardContent}>
                <UserAvatar user={student} size={42} />
                <View style={styles.moverCardTextCol}>
                  <Text
                    style={[styles.moverStudentName, { color: colors.onSurface }]}
                    numberOfLines={1}
                  >
                    {student?.name || "Student"}
                  </Text>
                  <Text
                    style={[styles.moverClassLabel, { color: colors.onSurfaceVariant }]}
                  >
                    {classLabel} • Reg: {student?.regNo || "--"}
                  </Text>
                  <View style={styles.moverScoresRow}>
                    <Text
                      style={[styles.moverScoreCompare, { color: colors.onSurfaceVariant }]}
                    >
                      Prev: {item.previousScore?.toFixed(2)} → Now:{" "}
                      <Text style={{ fontFamily: FONTS.bold, color: colors.onSurface }}>
                        {item.currentScore?.toFixed(2)}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Change Pill */}
                <View
                  style={[
                    styles.changePill,
                    {
                      backgroundColor: isGain
                        ? "#DCFCE7"
                        : "#FEE2E2",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isGain ? "arrow-upward" : "arrow-downward"}
                    size={16}
                    color={isGain ? "#16A34A" : "#DC2626"}
                  />
                  <Text
                    style={[
                      styles.changePillText,
                      { color: isGain ? "#16A34A" : "#DC2626" },
                    ]}
                  >
                    {isGain ? `+${item.change.toFixed(2)}` : item.change.toFixed(2)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <AppHeader
          title={t("admin.studentRatings", "Student Ratings & Analytics")}
          subtitle={t(
            "admin.studentRatingsSubtitle",
            "Monthly behavioral & academic evaluation insights"
          )}
          showBack={true}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Month Selector Bar */}
        <View
          style={[
            styles.monthSelectorCard,
            {
              backgroundColor: colors.surfaceContainerLow || colors.surface,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={[
              styles.navArrowButton,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="chevron-left"
              size={24}
              color={colors.onSurface}
            />
          </TouchableOpacity>

          <View style={styles.monthDisplayCenter}>
            <View style={styles.monthRow}>
              <MaterialIcons
                name="calendar-month"
                size={18}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.monthText, { color: colors.onSurface }]}>
                {monthName} {selectedYear}
              </Text>
            </View>
            {!isCurrentMonth && (
              <TouchableOpacity
                onPress={handleJumpToCurrent}
                style={[
                  styles.jumpCurrentPill,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <Text
                  style={[
                    styles.jumpCurrentText,
                    { color: colors.onPrimaryContainer },
                  ]}
                >
                  {t("common.currentMonth", "Jump to Current")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            disabled={!canGoNext}
            style={[
              styles.navArrowButton,
              {
                backgroundColor: colors.surfaceContainerHigh,
                opacity: canGoNext ? 1 : 0.3,
              },
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

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          {[
            { key: "overview", label: "Overview", icon: "dashboard" },
            { key: "classes", label: "Classes", icon: "people" },
            { key: "movers", label: "Movers", icon: "trending-up" },
            { key: "tracker", label: "Tracker", icon: "assignment-turned-in" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab(tab.key);
                }}
                style={[
                  styles.tabButton,
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
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: isActive
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                      fontFamily: isActive ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {loadingSchoolSummary && activeTab === "overview" ? (
          <View style={{ marginTop: 40 }}>
            <LoadingState message="Loading school ratings summary..." />
          </View>
        ) : (
          <>
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "classes" && renderClassesTab()}
            {activeTab === "movers" && renderMoversTab()}
            {activeTab === "tracker" && (
              <SubmissionTrackerView
                trackerData={trackerData}
                isLoading={loadingTracker}
                month={selectedMonth}
                year={selectedYear}
                onNavigateToSubject={(subj) => {
                  setSelectedClassId(subj.class?._id);
                  setActiveTab("classes");
                }}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ────────────────────────────────────────────── */}
      {/*  STUDENT DRILLDOWN MODAL                       */}
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
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.drilldownHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.drilldownSheetTitle, { color: colors.onSurface }]}>
                  Student Evaluation Detail
                </Text>
                <Text style={[styles.drilldownSheetSub, { color: colors.onSurfaceVariant }]}>
                  {monthName} {selectedYear}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedStudentId(null)}
                style={styles.drilldownCloseBtn}
              >
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {loadingStudentDetails || loadingStudentTrend ? (
              <View style={{ paddingVertical: 40 }}>
                <LoadingState message="Loading student breakdown & trend..." />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "88%" }}>
                {/* Student Hero Header */}
                <View
                  style={[
                    styles.studentDrilldownHero,
                    {
                      backgroundColor:
                        colors.surfaceContainer || "#F3F4F6",
                    },
                  ]}
                >
                  <UserAvatar
                    user={studentDetailsData?.student}
                    size={52}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.drilldownStudentName,
                        { color: colors.onSurface },
                      ]}
                    >
                      {studentDetailsData?.student?.name}
                    </Text>
                    <Text
                      style={[
                        styles.drilldownStudentSub,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Reg: {studentDetailsData?.student?.regNo || "--"} •{" "}
                      {studentDetailsData?.student?.gender || "Student"}
                    </Text>
                    <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text
                        style={[
                          styles.drilldownOverallAvg,
                          {
                            color: getRatingLabel(
                              studentDetailsData?.overallAverage
                            ).color,
                          },
                        ]}
                      >
                        ★ {studentDetailsData?.overallAverage ? studentDetailsData.overallAverage.toFixed(2) : "--"}
                      </Text>
                      <Badge
                        variant={
                          getRatingLabel(studentDetailsData?.overallAverage)
                            .variant
                        }
                        label={
                          getRatingLabel(studentDetailsData?.overallAverage)
                            .label
                        }
                        size="sm"
                      />
                    </View>
                  </View>
                </View>

                {/* Monthly Trend Section */}
                <Text
                  style={[
                    styles.drilldownSectionTitle,
                    { color: colors.onSurface },
                  ]}
                >
                  📈 6-Month Evolution Trend
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
                  <View style={styles.trendDirectionRow}>
                    <Text
                      style={[
                        styles.trendDirLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Trajectory:
                    </Text>
                    <Badge
                      variant={
                        studentTrendData?.trendDirection === "improving"
                          ? "success"
                          : studentTrendData?.trendDirection === "declining"
                          ? "error"
                          : "neutral"
                      }
                      icon={
                        studentTrendData?.trendDirection === "improving"
                          ? "trending-up"
                          : studentTrendData?.trendDirection === "declining"
                          ? "trending-down"
                          : "trending-flat"
                      }
                      label={
                        studentTrendData?.trendDirection === "improving"
                          ? "Improving"
                          : studentTrendData?.trendDirection === "declining"
                          ? "Declining"
                          : "Stable"
                      }
                      size="sm"
                    />
                  </View>

                  {/* Horizontal Bar Evolution */}
                  <View style={styles.trendBarsRow}>
                    {studentTrendData?.trend?.map((tItem, tIdx) => {
                      const tMonthName =
                        MONTH_NAMES[tItem.month - 1]?.substring(0, 3) || "";
                      const percent = (tItem.overallAverage / 5) * 100;
                      return (
                        <View key={tIdx} style={styles.trendBarCol}>
                          <Text
                            style={[
                              styles.trendBarScore,
                              { color: colors.onSurface },
                            ]}
                          >
                            {tItem.overallAverage.toFixed(1)}
                          </Text>
                          <View
                            style={[
                              styles.trendBarTrack,
                              {
                                backgroundColor:
                                  colors.surfaceContainerHigh || "#EDEEF2",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.trendBarFill,
                                {
                                  height: `${percent}%`,
                                  backgroundColor: colors.primary,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.trendBarMonth,
                              { color: colors.onSurfaceVariant },
                            ]}
                          >
                            {tMonthName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 4 Criteria Averages for this student */}
                <Text
                  style={[
                    styles.drilldownSectionTitle,
                    { color: colors.onSurface, marginTop: 16 },
                  ]}
                >
                  🎯 Performance Across 4 Areas
                </Text>
                <View style={styles.studentCriteriaList}>
                  {DATA_POINTS.map((dp) => {
                    const avg =
                      studentDetailsData?.dataPointAverages?.[dp.key] || 0;
                    const percent = (avg / 5) * 100;
                    return (
                      <View key={dp.key} style={styles.studentCriteriaRow}>
                        <View style={styles.studentCriteriaMeta}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <MaterialIcons
                              name={dp.icon}
                              size={18}
                              color={dp.color}
                            />
                            <Text
                              style={[
                                styles.studentCriteriaLabel,
                                { color: colors.onSurface },
                              ]}
                            >
                              {dp.label}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.studentCriteriaVal,
                              { color: dp.color },
                            ]}
                          >
                            ★ {avg.toFixed(2)}
                          </Text>
                        </View>
                        <ProgressBar
                          progress={percent}
                          max={100}
                          progressColor={dp.color}
                          height={6}
                          borderRadius={3}
                        />
                      </View>
                    );
                  })}
                </View>

                {/* Subject-Wise Variation */}
                <Text
                  style={[
                    styles.drilldownSectionTitle,
                    { color: colors.onSurface, marginTop: 16 },
                  ]}
                >
                  📚 Subject-Wise Breakdown
                </Text>

                {studentDetailsData?.subjectRatings?.map((sRating, sIdx) => (
                  <View
                    key={sIdx}
                    style={[
                      styles.subjectDetailCard,
                      {
                        backgroundColor:
                          colors.surfaceContainer || "#F3F4F6",
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.subjectDetailHeader}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.subjectDetailName,
                            { color: colors.onSurface },
                          ]}
                        >
                          {sRating.subject?.name || "Subject"}
                        </Text>
                        <Text
                          style={[
                            styles.subjectDetailTeacher,
                            { color: colors.onSurfaceVariant },
                          ]}
                        >
                          Teacher: {sRating.teacher?.name || "Subject Teacher"}
                        </Text>
                      </View>
                      <Badge
                        variant={getRatingLabel(sRating.averageScore).variant}
                        label={`★ ${sRating.averageScore.toFixed(2)}`}
                        size="md"
                      />
                    </View>

                    {/* 4 Points in this Subject */}
                    <View style={styles.subjectPointsRow}>
                      <View style={styles.pointChip}>
                        <Text style={styles.pointChipLabel}>Engagement</Text>
                        <Text style={styles.pointChipVal}>
                          {sRating.classEngagement} / 5
                        </Text>
                      </View>
                      <View style={styles.pointChip}>
                        <Text style={styles.pointChipLabel}>Homework</Text>
                        <Text style={styles.pointChipVal}>
                          {sRating.homeworkClasswork} / 5
                        </Text>
                      </View>
                      <View style={styles.pointChip}>
                        <Text style={styles.pointChipLabel}>Behaviour</Text>
                        <Text style={styles.pointChipVal}>
                          {sRating.behaviourSocial} / 5
                        </Text>
                      </View>
                      <View style={styles.pointChip}>
                        <Text style={styles.pointChipLabel}>English</Text>
                        <Text style={styles.pointChipVal}>
                          {sRating.englishComm} / 5
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <Button
              title="Close Details"
              variant="tonal"
              size="md"
              fullWidth={true}
              onPress={() => setSelectedStudentId(null)}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 40,
  },
  monthSelectorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 14,
  },
  navArrowButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDisplayCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  jumpCurrentPill: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  jumpCurrentText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  tabSwitcher: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: FONT_SIZES.xs,
  },
  heroCard: {
    marginBottom: 18,
  },
  heroCardContent: {
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLeftCol: {
    flex: 1,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
    marginBottom: 4,
  },
  heroScoreText: {
    fontSize: 38,
    fontFamily: FONTS.bold,
    lineHeight: 44,
  },
  heroScoreMax: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
  heroRightCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  heroClassesCount: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  criteriaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  criterionCard: {
    width: "48.5%",
    marginBottom: 0,
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
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  criterionScore: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  criterionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  criterionDesc: {
    fontSize: 11,
    lineHeight: 14,
    height: 28,
  },
  classComparisonHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  classCard: {
    marginBottom: 12,
  },
  classCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  classNameText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  classStudentCount: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  scoreRow: {
    marginBottom: 4,
  },
  classScoreText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  miniBarsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  miniBarItem: {
    flex: 1,
  },
  miniBarLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  miniBarVal: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    marginTop: 2,
    textAlign: "right",
  },
  classCardFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 8,
  },
  viewDetailsLink: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    textAlign: "right",
  },
  selectorLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  classPillsScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  classPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full || 20,
    borderWidth: 1,
  },
  classPillText: {
    fontSize: FONT_SIZES.xs,
  },
  classBannerCard: {
    marginBottom: 14,
  },
  classBannerContent: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  classBannerLeft: {
    flex: 1,
  },
  classBannerTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  classBannerSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  classBannerRight: {
    alignItems: "flex-end",
  },
  classBannerScore: {
    fontSize: 26,
    fontFamily: FONTS.bold,
  },
  searchAndSortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  sortPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  sortPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 11,
  },
  studentsCountLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginBottom: 10,
  },
  studentCardItem: {
    marginBottom: 10,
  },
  studentItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  studentItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  studentItemDetails: {
    flex: 1,
  },
  studentItemName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  studentItemSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  studentItemRight: {
    alignItems: "flex-end",
  },
  studentItemScore: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  subjectMiniChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 8,
    alignItems: "center",
  },
  subjectMiniChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  subjectMiniChipText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  moreSubjectsCount: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  moversStatGrid: {
    flexDirection: "row",
    gap: 12,
  },
  moversStatCard: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.lg,
  },
  moversCountText: {
    fontSize: 28,
    fontFamily: FONTS.bold,
  },
  moversLabelText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginTop: 6,
  },
  moversSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  moverCard: {
    marginBottom: 10,
  },
  moverCardContent: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moverCardTextCol: {
    flex: 1,
  },
  moverStudentName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  moverClassLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  moverScoresRow: {
    marginTop: 4,
  },
  moverScoreCompare: {
    fontSize: 11,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full || 20,
  },
  changePillText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  drilldownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  drilldownSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
  },
  drilldownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  drilldownSheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  drilldownSheetSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  drilldownCloseBtn: {
    padding: 4,
  },
  studentDrilldownHero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 16,
  },
  drilldownStudentName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  drilldownStudentSub: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  drilldownOverallAvg: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  drilldownSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginBottom: 10,
  },
  trendCard: {
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  trendDirectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  trendDirLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  trendBarsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
    paddingTop: 10,
  },
  trendBarCol: {
    alignItems: "center",
    flex: 1,
  },
  trendBarScore: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  trendBarTrack: {
    width: 14,
    height: 60,
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendBarFill: {
    width: "100%",
    borderRadius: 7,
  },
  trendBarMonth: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  studentCriteriaList: {
    gap: 12,
    marginBottom: 8,
  },
  studentCriteriaRow: {
    gap: 4,
  },
  studentCriteriaMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentCriteriaLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },
  studentCriteriaVal: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  subjectDetailCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  subjectDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subjectDetailName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  subjectDetailTeacher: {
    fontSize: 11,
    marginTop: 1,
  },
  subjectPointsRow: {
    flexDirection: "row",
    gap: 6,
  },
  pointChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  pointChipLabel: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: "#6B7280",
  },
  pointChipVal: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: "#111318",
    marginTop: 1,
  },
});
