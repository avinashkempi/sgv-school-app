import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, RADIUS, SPACING } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import TextInput from "../../components/TextInput";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { LoadingState, EmptyState } from "../../components/StateComponents";
import { useLabel } from "../../context/LabelsContext";

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
    label: "English Communication",
    desc: "Expressing ideas clearly and confidently in English",
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

export default function StudentRatingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLabel();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'subjects'
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
      keepPreviousData: true,
    }
  );

  const monthName = MONTHS[selectedMonth - 1];

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
    Haptics.selectionAsync().catch(() => {});
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const overallAvg = ratingsData?.overallAverage;
  const classBenchmark = ratingsData?.classBenchmark;
  const yearAvg = ratingsData?.yearAverage;
  const dpAverages = ratingsData?.dataPointAverages || {};
  const subjects = useMemo(
    () => ratingsData?.subjects || [],
    [ratingsData?.subjects]
  );
  const trend = useMemo(
    () => ratingsData?.trend || [],
    [ratingsData?.trend]
  );

  const ratedSubjectsCount = useMemo(
    () => subjects.filter((s) => s.isRated).length,
    [subjects]
  );

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase().trim();
    return subjects.filter((s) => (s.subjectName || "").toLowerCase().includes(q));
  }, [subjects, searchQuery]);

  // Overall rating label and status
  const ratingStatus = useMemo(() => {
    if (!overallAvg) return { label: "Not Rated", variant: "neutral" };
    if (overallAvg >= 4.5) return { label: "Excellent", variant: "success" };
    if (overallAvg >= 3.5) return { label: "Good", variant: "success" };
    if (overallAvg >= 2.5) return { label: "Meets Expectation", variant: "primary" };
    if (overallAvg >= 2.0) return { label: "Needs Improvement", variant: "warning" };
    return { label: "Needs Attention", variant: "danger" };
  }, [overallAvg]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* App Header */}
      <AppHeader
        title={t("student.monthlyRatings", "Monthly Ratings")}
        subtitle={`${monthName} ${selectedYear}`}
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Month Navigation Strip */}
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
          accessibilityRole="button"
          accessibilityLabel="Previous Month"
        >
          <MaterialIcons
            name="chevron-left"
            size={24}
            color={colors.onSurface}
          />
        </TouchableOpacity>

        <View style={styles.monthLabelContainer}>
          <Text style={[styles.monthLabelText, { color: colors.onSurface }]}>
            {monthName} {selectedYear}
          </Text>
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
          style={styles.monthNavBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Next Month"
        >
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      {/* Segmented View Tabs */}
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: colors.surfaceContainerLow || colors.surface,
            borderBottomColor: colors.outlineVariant,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab("overview");
          }}
          accessibilityRole="tab"
          accessibilityLabel="Overview and Trend"
          style={[
            styles.tabItem,
            activeTab === "overview" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
        >
          <MaterialIcons
            name="insights"
            size={18}
            color={activeTab === "overview" ? colors.primary : colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.tabItemText,
              {
                color: activeTab === "overview" ? colors.primary : colors.onSurfaceVariant,
                fontFamily: activeTab === "overview" ? FONTS.bold : FONTS.medium,
              },
            ]}
          >
            Overview & Trend
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab("subjects");
          }}
          accessibilityRole="tab"
          accessibilityLabel="Subjects"
          style={[
            styles.tabItem,
            activeTab === "subjects" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
        >
          <MaterialIcons
            name="menu-book"
            size={18}
            color={activeTab === "subjects" ? colors.primary : colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.tabItemText,
              {
                color: activeTab === "subjects" ? colors.primary : colors.onSurfaceVariant,
                fontFamily: activeTab === "subjects" ? FONTS.bold : FONTS.medium,
              },
            ]}
          >
            Subjects ({subjects.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
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
        ) : activeTab === "overview" ? (
          <>
            {/* KPI Cards Row */}
            <View style={styles.kpiRow}>
              {/* Monthly Average Card */}
              <Card
                variant="elevated"
                style={[styles.kpiCard, { flex: 1.2 }]}
                contentStyle={styles.kpiCardContent}
              >
                <Text
                  style={[styles.kpiTitle, { color: colors.onSurfaceVariant }]}
                >
                  Monthly Average
                </Text>
                <View style={styles.kpiScoreRow}>
                  <Text
                    style={[
                      styles.kpiLargeScore,
                      { color: overallAvg ? colors.primary : colors.onSurfaceVariant },
                    ]}
                  >
                    {overallAvg ? `★ ${overallAvg}` : "—"}
                  </Text>
                  <Text style={[styles.kpiMaxScore, { color: colors.onSurfaceVariant }]}>
                    / 5.0
                  </Text>
                </View>
                <View style={{ marginTop: 4 }}>
                  <Badge
                    variant={ratingStatus.variant}
                    label={ratingStatus.label}
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
                <Text
                  style={[styles.kpiTitle, { color: colors.onSurfaceVariant }]}
                >
                  Class Benchmark
                </Text>
                <View style={styles.kpiScoreRow}>
                  <Text
                    style={[
                      styles.kpiScoreMedium,
                      { color: colors.onSurface },
                    ]}
                  >
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
                <Text
                  style={[styles.kpiTitle, { color: colors.onSurfaceVariant }]}
                >
                  Academic Year
                </Text>
                <View style={styles.kpiScoreRow}>
                  <Text
                    style={[
                      styles.kpiScoreMedium,
                      { color: colors.onSurface },
                    ]}
                  >
                    {yearAvg ? `★ ${yearAvg}` : "—"}
                  </Text>
                </View>
                <Text style={[styles.kpiDiffText, { color: colors.onSurfaceVariant }]}>
                  Cumulative
                </Text>
              </Card>
            </View>

            {/* Criteria Detailed Breakdown */}
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

            {/* 6-Month Trend Section */}
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
                      const isSelected = tItem.month === selectedMonth && tItem.year === selectedYear;
                      const barHeight = Math.max(20, Math.round((tItem.averageScore / 5) * 100));

                      return (
                        <TouchableOpacity
                          key={`${tItem.year}-${tItem.month}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${tMonthShort}`}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            setSelectedMonth(tItem.month);
                            setSelectedYear(tItem.year);
                          }}
                          style={[
                            styles.trendBarCol,
                            isSelected && {
                              backgroundColor: colors.primaryContainer || "#EEF2FF",
                              borderRadius: RADIUS.md,
                            },
                          ]}
                        >
                          <Text style={[styles.trendBarScore, { color: isSelected ? colors.primary : colors.onSurface }]}>
                            ★ {tItem.averageScore}
                          </Text>
                          <View style={styles.trendBarTrack}>
                            <View
                              style={[
                                styles.trendBarFill,
                                {
                                  height: barHeight,
                                  backgroundColor: isSelected ? colors.primary : colors.secondary || "#818CF8",
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.trendBarLabel,
                              {
                                color: isSelected ? colors.primary : colors.onSurfaceVariant,
                                fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                              },
                            ]}
                          >
                            {tMonthShort}
                          </Text>
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
                Ratings reflect teacher observations on classroom engagement and study habits. Use them to identify strengths and areas of growth!
              </Text>
            </View>
          </>
        ) : (
          /* Tab 2: Subject Breakdown */
          <>
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
                          {sub.isRated
                            ? `${monthName} Evaluation Complete`
                            : "Not evaluated this month"}
                        </Text>
                      </View>

                      {sub.isRated ? (
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
                            variant="neutral"
                            icon="history"
                            label="Not Rated"
                            size="sm"
                          />
                        </View>
                      )}
                    </View>

                    {/* Expanded 4 Criteria Breakdown */}
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
                            label: "English Communication",
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
                      </View>
                    )}
                  </Card>
                );
              })
            )}

            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: colors.surfaceContainerLow || colors.surface,
                  borderColor: colors.outlineVariant,
                  marginTop: 16,
                },
              ]}
            >
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.onSurfaceVariant }]}>
                Only designated evaluative subjects are shown. Teachers rate students monthly; missing a rating month carries no penalty.
              </Text>
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
    fontSize: FONT_SIZES.sm,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
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
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
  },
  kpiMaxScore: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  kpiScoreMedium: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  kpiDiffText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
    marginTop: 4,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  criteriaCard: {
    marginBottom: 10,
  },
  criteriaCardContent: {
    padding: 12,
  },
  criteriaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  criteriaIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  criteriaName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  criteriaDescText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  criteriaScoreCol: {
    alignItems: "flex-end",
  },
  criteriaScoreVal: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  criteriaScaleLabel: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    marginTop: 1,
  },
  trendCard: {
    padding: 12,
  },
  trendCardContent: {
    padding: 10,
  },
  trendBarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  trendBarCol: {
    alignItems: "center",
    padding: 6,
    minWidth: 50,
  },
  trendBarScore: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    marginBottom: 6,
  },
  trendBarTrack: {
    width: 24,
    height: 100,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 6,
  },
  trendBarFill: {
    width: 14,
    borderRadius: 7,
  },
  trendBarLabel: {
    fontSize: FONT_SIZES.xs,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 16,
  },
  subjectCard: {
    marginBottom: 10,
  },
  subjectCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  subjectNameText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  subjectStatusSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  subjectExpandedDetails: {
    padding: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  criteriaDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  criteriaDetailLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  criteriaDetailScore: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
});
