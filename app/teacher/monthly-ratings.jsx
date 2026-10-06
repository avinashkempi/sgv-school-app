import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
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
import ProgressBar from "../../components/ui/ProgressBar";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { EmptyState, LoadingState } from "../../components/StateComponents";
import { formatClassName } from "../../utils/formatClassName";
import { useLabel } from "../../context/LabelsContext";
import { useAuth } from "../../context/AuthContext";
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

export default function MonthlyRatingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { t } = useLabel();

  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [screenMode, setScreenMode] = useState("subjects"); // 'subjects' | 'tracker'
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'pending' | 'submitted'
  const [refreshing, setRefreshing] = useState(false);

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

  // Query teacher's subjects and their rating statuses for selected month/year
  const {
    data: ratingsData,
    isLoading,
    refetch,
  } = useApiQuery(
    ["teacherRatingsSubjects", selectedMonth, selectedYear],
    `${apiConfig.baseUrl}/student-ratings/my-subjects?month=${selectedMonth}&year=${selectedYear}`,
    {
      ...CACHE_TIERS.MODERATE,
    }
  );

  // Query teacher's submission tracker status
  const {
    data: myStatusData,
    isLoading: loadingTracker,
    refetch: refetchTracker,
  } = useApiQuery(
    ["teacherRatingTrackerMyStatus", selectedMonth, selectedYear],
    `${apiConfig.baseUrl}/student-ratings/tracker/my-status?month=${selectedMonth}&year=${selectedYear}`,
    {
      enabled: screenMode === "tracker",
      ...CACHE_TIERS.MODERATE,
    }
  );

  const formattedTrackerData = useMemo(() => {
    if (!myStatusData) return null;
    return {
      overall: {
        total: myStatusData.total,
        completed: myStatusData.completed,
        pending: myStatusData.pending,
        percentage: myStatusData.percentage,
      },
      teachers: [
        {
          teacher: {
            _id: user?._id || user?.userId || "me",
            name: user?.name || "Me",
            designation: "Subject Teacher",
          },
          total: myStatusData.total,
          completed: myStatusData.completed,
          pending: myStatusData.pending,
          subjects: myStatusData.subjects,
        },
      ],
    };
  }, [myStatusData, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        screenMode === "tracker" ? refetchTracker() : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: ["teacherRatingsSubjects", selectedMonth, selectedYear],
        }),
        queryClient.invalidateQueries({
          queryKey: ["teacherRatingTrackerMyStatus", selectedMonth, selectedYear],
        }),
      ]);
    } catch (err) {
      console.error("Error refreshing ratings subjects:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const subjects = useMemo(() => ratingsData?.subjects || [], [ratingsData]);
  const summary = useMemo(
    () => ratingsData?.summary || { total: 0, completed: 0, pending: 0 },
    [ratingsData]
  );

  const completionPercent = useMemo(() => {
    if (!summary.total) return 0;
    return Math.round((summary.completed / summary.total) * 100);
  }, [summary]);

  const filteredSubjects = useMemo(() => {
    if (activeFilter === "pending") {
      return subjects.filter((s) => s.status === "pending");
    }
    if (activeFilter === "submitted") {
      return subjects.filter((s) => s.status === "submitted");
    }
    return subjects;
  }, [subjects, activeFilter]);

  const monthName = MONTH_NAMES[selectedMonth - 1];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <AppHeader
          title={t("teacher.monthlyRatings", "Student Ratings")}
          subtitle={t(
            "teacher.monthlyRatingsSubtitle",
            "Monthly behavioral & academic evaluations"
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
        {/* Month Selector Bar — Material 3 Elevated Banner */}
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
            accessibilityLabel="Previous Month"
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
            accessibilityLabel="Next Month"
          >
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.onSurface}
            />
          </TouchableOpacity>
        </View>

        {/* Tab Toggle: My Subjects vs Tracker */}
        <View style={styles.screenModeTabsRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setScreenMode("subjects");
            }}
            style={[
              styles.screenModeTabBtn,
              {
                backgroundColor:
                  screenMode === "subjects"
                    ? colors.primary
                    : colors.surfaceContainer,
                borderColor:
                  screenMode === "subjects"
                    ? colors.primary
                    : colors.outlineVariant,
              },
            ]}
          >
            <MaterialIcons
              name="school"
              size={16}
              color={
                screenMode === "subjects"
                  ? colors.onPrimary
                  : colors.onSurfaceVariant
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.screenModeTabText,
                {
                  color:
                    screenMode === "subjects"
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                  fontFamily:
                    screenMode === "subjects" ? FONTS.bold : FONTS.medium,
                },
              ]}
            >
              My Subjects
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setScreenMode("tracker");
            }}
            style={[
              styles.screenModeTabBtn,
              {
                backgroundColor:
                  screenMode === "tracker"
                    ? colors.primary
                    : colors.surfaceContainer,
                borderColor:
                  screenMode === "tracker"
                    ? colors.primary
                    : colors.outlineVariant,
              },
            ]}
          >
            <MaterialIcons
              name="assignment-turned-in"
              size={16}
              color={
                screenMode === "tracker"
                  ? colors.onPrimary
                  : colors.onSurfaceVariant
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.screenModeTabText,
                {
                  color:
                    screenMode === "tracker"
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                  fontFamily:
                    screenMode === "tracker" ? FONTS.bold : FONTS.medium,
                },
              ]}
            >
              Submission Tracker
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confidentiality Notice Pill */}
        <View
          style={[
            styles.privacyNotice,
            {
              backgroundColor: colors.surfaceContainer || "#F3F4F6",
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <MaterialIcons
            name="lock-outline"
            size={16}
            color={colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.privacyNoticeText,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {t(
              "teacher.ratingsConfidentialNotice",
              "Private teacher evaluations for Principal & Management review. Hidden from students & parents."
            )}
          </Text>
        </View>

        {screenMode === "tracker" ? (
          <SubmissionTrackerView
            trackerData={formattedTrackerData}
            isLoading={loadingTracker}
            month={selectedMonth}
            year={selectedYear}
            onNavigateToSubject={(subj) => {
              setScreenMode("subjects");
              const classLabel = formatClassName(
                subj.class?.name || subj.class?.label || subj.class?.value,
                subj.class?.section
              );
              router.push({
                pathname: "/teacher/rate-students",
                params: {
                  subjectId: subj.subject?._id || subj.subject,
                  subjectName: subj.subject?.name,
                  className: classLabel,
                  month: selectedMonth,
                  year: selectedYear,
                  totalStudents: String(subj.totalStudents),
                  ratedCount: String(subj.ratedCount),
                },
              });
            }}
          />
        ) : isLoading ? (
          <View style={{ marginTop: 40 }}>
            <LoadingState
              message={t("teacher.loadingSubjects", "Loading subjects...")}
            />
          </View>
        ) : subjects.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState
              icon="school"
              title={t("teacher.noAssignedSubjects", "No Subjects Assigned")}
              message={t(
                "teacher.noAssignedSubjectsDesc",
                "You do not have any subjects assigned in this academic year to rate."
              )}
            />
          </View>
        ) : (
          <>
            {/* Progress Summary Card */}
            <Card
              variant="elevated"
              style={styles.summaryCard}
              contentStyle={styles.summaryCardContent}
            >
              <View style={styles.summaryHeader}>
                <View>
                  <Text
                    style={[styles.summaryTitle, { color: colors.onSurface }]}
                  >
                    {t("teacher.monthlyProgress", "Monthly Submission Status")}
                  </Text>
                  <Text
                    style={[
                      styles.summarySubtitle,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {summary.completed} of {summary.total} subjects submitted (
                    {completionPercent}%)
                  </Text>
                </View>
                <Badge
                  variant={completionPercent === 100 ? "success" : "warning"}
                  label={
                    completionPercent === 100
                      ? t("common.completed", "Completed")
                      : t("common.pending", "Pending")
                  }
                  size="md"
                />
              </View>

              <View style={{ marginTop: 12, marginBottom: 14 }}>
                <ProgressBar
                  progress={completionPercent}
                  max={100}
                  variant={completionPercent === 100 ? "success" : "primary"}
                  height={8}
                  borderRadius={4}
                />
              </View>

              <View style={styles.statPillsRow}>
                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor:
                        colors.surfaceContainerHigh || "#EDEEF2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statPillLabel,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[styles.statPillValue, { color: colors.onSurface }]}
                  >
                    {summary.total}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor:
                        colors.successContainer || "#DCFCE7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statPillLabel,
                      { color: colors.success || "#16A34A" },
                    ]}
                  >
                    Submitted
                  </Text>
                  <Text
                    style={[
                      styles.statPillValue,
                      { color: colors.success || "#16A34A" },
                    ]}
                  >
                    {summary.completed}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor:
                        colors.tertiaryContainer || "#FEF3C7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statPillLabel,
                      { color: colors.tertiary || "#D97706" },
                    ]}
                  >
                    Pending
                  </Text>
                  <Text
                    style={[
                      styles.statPillValue,
                      { color: colors.tertiary || "#D97706" },
                    ]}
                  >
                    {summary.pending}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
              {[
                { key: "all", label: `All (${summary.total})` },
                { key: "pending", label: `Pending (${summary.pending})` },
                { key: "submitted", label: `Submitted (${summary.completed})` },
              ].map((tab) => {
                const isActive = activeFilter === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveFilter(tab.key);
                    }}
                    style={[
                      styles.filterTab,
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
                    <Text
                      style={[
                        styles.filterTabText,
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
                  </Pressable>
                );
              })}
            </View>

            {/* Subjects List */}
            {filteredSubjects.length === 0 ? (
              <View style={{ marginTop: 24 }}>
                <EmptyState
                  icon="check-circle"
                  title={t("teacher.noSubjectsFound", "No Subjects in this tab")}
                  message={
                    activeFilter === "pending"
                      ? t(
                          "teacher.allSubjectsCompleted",
                          "Great job! All subjects have been submitted for this month."
                        )
                      : t(
                          "teacher.noSubmittedSubjects",
                          "No subjects have been submitted yet."
                        )
                  }
                />
              </View>
            ) : (
              filteredSubjects.map((subj) => {
                const isComplete = subj.status === "submitted";
                const ratedCount = subj.ratedCount || 0;
                const totalStudents = subj.totalStudents || 0;
                const classLabel = formatClassName(
                  subj.class?.name || subj.class,
                  subj.class?.section
                );
                const subjPercent =
                  totalStudents > 0
                    ? Math.round((ratedCount / totalStudents) * 100)
                    : 0;

                return (
                  <Card
                    key={subj._id}
                    variant="elevated"
                    style={styles.subjectCard}
                    onPress={() => {
                      router.push({
                        pathname: "/teacher/rate-students",
                        params: {
                          subjectId: subj._id,
                          subjectName: subj.name,
                          className: classLabel,
                          month: selectedMonth,
                          year: selectedYear,
                          totalStudents: String(totalStudents),
                          ratedCount: String(ratedCount),
                        },
                      });
                    }}
                  >
                    <View style={styles.subjectCardHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={styles.subjectTitleRow}>
                          <Text
                            style={[
                              styles.subjectName,
                              { color: colors.onSurface },
                            ]}
                            numberOfLines={1}
                          >
                            {subj.name}
                          </Text>
                        </View>
                        <View style={styles.classBadgeRow}>
                          <View
                            style={[
                              styles.classBadge,
                              {
                                backgroundColor:
                                  colors.primaryContainer || "#EEF2FF",
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="class"
                              size={13}
                              color={colors.primary}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.classBadgeText,
                                { color: colors.primary },
                              ]}
                            >
                              {classLabel}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {isComplete ? (
                        <Badge
                          variant="success"
                          icon="check-circle"
                          label={t("common.submitted", "Submitted")}
                          size="md"
                        />
                      ) : ratedCount > 0 ? (
                        <Badge
                          variant="warning"
                          icon="schedule"
                          label={`${ratedCount}/${totalStudents} Rated`}
                          size="md"
                        />
                      ) : (
                        <Badge
                          variant="neutral"
                          icon="hourglass-empty"
                          label={t("common.notStarted", "Not Started")}
                          size="md"
                        />
                      )}
                    </View>

                    {/* Progress Bar for this subject */}
                    <View style={styles.subjectProgressContainer}>
                      <View style={styles.subjectProgressMeta}>
                        <Text
                          style={[
                            styles.subjectProgressText,
                            { color: colors.onSurfaceVariant },
                          ]}
                        >
                          {ratedCount} of {totalStudents} students rated
                        </Text>
                        <Text
                          style={[
                            styles.subjectProgressPercent,
                            {
                              color: isComplete
                                ? colors.success
                                : colors.onSurface,
                            },
                          ]}
                        >
                          {subjPercent}%
                        </Text>
                      </View>
                      <ProgressBar
                        progress={subjPercent}
                        max={100}
                        variant={isComplete ? "success" : "primary"}
                        height={6}
                        borderRadius={3}
                      />
                    </View>

                    {/* Action Row */}
                    <View style={styles.subjectActionRow}>
                      <Button
                        title={
                          isComplete
                            ? t("teacher.editRatings", "Review / Edit Ratings")
                            : ratedCount > 0
                            ? t("teacher.continueRating", "Continue Rating")
                            : t("teacher.startRating", "Rate Students")
                        }
                        variant={isComplete ? "outlined" : "filled"}
                        size="sm"
                        icon={isComplete ? "edit" : "rate-review"}
                        onPress={() => {
                          router.push({
                            pathname: "/teacher/rate-students",
                            params: {
                              subjectId: subj._id,
                              subjectName: subj.name,
                              className: classLabel,
                              month: selectedMonth,
                              year: selectedYear,
                              totalStudents: String(totalStudents),
                              ratedCount: String(ratedCount),
                            },
                          });
                        }}
                      />
                      <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={colors.onSurfaceVariant}
                      />
                    </View>
                  </Card>
                );
              })
            )}
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
    marginBottom: 12,
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
  privacyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  privacyNoticeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryCardContent: {
    padding: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  statPillsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  statPillLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginBottom: 2,
  },
  statPillValue: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  filterTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabText: {
    fontSize: FONT_SIZES.xs,
  },
  subjectCard: {
    marginBottom: 12,
  },
  subjectCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  subjectTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  subjectName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  classBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  classBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },
  subjectProgressContainer: {
    marginBottom: 14,
  },
  subjectProgressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  subjectProgressText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  subjectProgressPercent: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  subjectActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 12,
  },
  screenModeTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  screenModeTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  screenModeTabText: {
    fontSize: FONT_SIZES.xs,
  },
});
