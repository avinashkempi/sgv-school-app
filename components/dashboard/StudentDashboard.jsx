import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../../theme";
import PerformanceTrendCard from "./PerformanceTrendCard";
import { LoadingState, EmptyState } from "../StateComponents";
import Badge from "../ui/Badge";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import HomeModuleContainer from "../home/HomeModuleContainer";
import DayGlanceCard from "../home/DayGlanceCard";

const StudentDashboard = () => {
  const router = useRouter();
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const {
    data,
    isLoading: loading,
  } = useApiQuery(
    ["studentDashboard"],
    `${apiConfig.baseUrl}/dashboard/student`,
    { ...CACHE_TIERS.MODERATE }
  );

  const skyAccent = isDark ? "#38BDF8" : "#0284C7";
  const ratingAccent = isDark ? "#A78BFA" : "#6366F1";

  if (loading && !data) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!data) {
    return (
      <EmptyState
        icon="dashboard"
        title="No Data"
        message="Dashboard data is not available"
      />
    );
  }

  const ratingData = data?.overview?.rating;
  const currentMonthData = ratingData?.currentMonth;
  const classComparison = ratingData?.classComparison;

  // Rating presence checks
  const hasCumulative = Boolean(ratingData && (ratingData.cumulativeAverage != null || ratingData.average != null || ratingData.averageScore != null));
  const hasCurrentMonthProvisional = Boolean(currentMonthData && currentMonthData.provisionalAverage != null);
  const hasRating = hasCumulative || hasCurrentMonthProvisional;

  // Headline score: prefer cumulative rating across the academic year; fallback to provisional or month average
  const displayAvg = ratingData?.cumulativeAverage ?? currentMonthData?.provisionalAverage ?? ratingData?.average ?? ratingData?.averageScore;
  const isProvisional = ratingData?.cumulativeAverage == null && hasCurrentMonthProvisional;
  const displayLabel = ratingData?.cumulativeLabel || (isProvisional ? `${currentMonthData?.label || "In Progress"}` : ratingData?.label || "Meets Expectation");
  const displayVariant = ratingData?.cumulativeVariant || currentMonthData?.variant || ratingData?.variant || "primary";
  const displayCount = ratingData?.cumulativeCount ?? ratingData?.ratedCount ?? ratingData?.ratedSubjectCount ?? 0;

  const criteriaData = ratingData?.criteriaAverages || (ratingData?.classEngagement != null ? ratingData : null);

  return (
    <View>
      {/* ═════════════════════════════════════════════════════════════ */}
      {/* HERO: Today's Snapshot                                        */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <DayGlanceCard role="student" data={data} />

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* CARD 2: Holistic Student Rating (Cumulative + Class Standing) */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <HomeModuleContainer
        title="Student Holistic Rating"
        icon="stars"
        accentColor={ratingAccent}
        actionText="View 3-Tab Report"
        onActionPress={() => router.push("/student/ratings")}
        lightBg="rgba(99, 102, 241, 0.04)"
        darkBg="rgba(167, 139, 250, 0.07)"
        lightBorder="rgba(99, 102, 241, 0.14)"
        darkBorder="rgba(167, 139, 250, 0.18)"
      >
        {hasRating ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/student/ratings")}
            style={[
              styles.ratingCardContent,
              {
                backgroundColor: colors.surfaceContainerLow || colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            {/* Top Score Banner */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreMain}>
                <View
                  style={[
                    styles.scoreBadgeCircle,
                    {
                      backgroundColor: isDark
                        ? displayVariant === "success"
                          ? "rgba(74, 222, 128, 0.16)"
                          : displayVariant === "warning"
                          ? "rgba(251, 191, 36, 0.16)"
                          : "rgba(167, 139, 250, 0.16)"
                        : displayVariant === "success"
                        ? "#DCFCE7"
                        : displayVariant === "warning"
                        ? "#FEF3C7"
                        : "#EEF2FF",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreNumber,
                      {
                        color: isDark
                          ? displayVariant === "success"
                            ? "#4ADE80"
                            : displayVariant === "warning"
                            ? "#FBBF24"
                            : ratingAccent
                          : displayVariant === "success"
                          ? "#16A34A"
                          : displayVariant === "warning"
                          ? "#D97706"
                          : colors.primary,
                      },
                    ]}
                  >
                    ★ {displayAvg}
                  </Text>
                </View>
                <View style={styles.scoreMeta}>
                  <View style={styles.labelBadgeRow}>
                    <Badge
                      variant={displayVariant}
                      label={displayLabel}
                      size="sm"
                    />
                    {isProvisional && (
                      <View style={{ marginLeft: 6 }}>
                        <Badge
                          variant="warning"
                          label="Provisional"
                          size="sm"
                        />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.scoreSubtext,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Academic Year Cumulative • {displayCount}{" "}
                    evaluation{displayCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              <MaterialIcons
                name="chevron-right"
                size={24}
                color={colors.onSurfaceVariant}
              />
            </View>

            {/* Class Peer Comparison Strip */}
            {classComparison && (
              <View
                style={[
                  styles.comparisonStrip,
                  {
                    backgroundColor: isDark
                      ? "rgba(99, 102, 241, 0.12)"
                      : "rgba(99, 102, 241, 0.06)",
                    borderColor: isDark
                      ? "rgba(167, 139, 250, 0.25)"
                      : "rgba(99, 102, 241, 0.18)",
                  },
                ]}
              >
                <View style={styles.comparisonLeft}>
                  <MaterialIcons
                    name="leaderboard"
                    size={18}
                    color={ratingAccent}
                  />
                  <Text
                    style={[
                      styles.comparisonLabelText,
                      { color: colors.onSurface },
                    ]}
                  >
                    {classComparison.standingLabel || "Class Standing"}
                  </Text>
                  {classComparison.rank && (
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor:
                            classComparison.rank <= 3
                              ? isDark
                                ? "rgba(251, 191, 36, 0.2)"
                                : "#FEF3C7"
                              : isDark
                              ? "rgba(255, 255, 255, 0.08)"
                              : "#F1F5F9",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankBadgeText,
                          {
                            color:
                              classComparison.rank <= 3
                                ? isDark
                                  ? "#FBBF24"
                                  : "#D97706"
                                : colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        Rank #{classComparison.rank}
                        {classComparison.totalStudentsRated
                          ? ` of ${classComparison.totalStudentsRated}`
                          : ""}
                      </Text>
                    </View>
                  )}
                </View>

                {classComparison.classCumulativeAverage != null && (
                  <Text
                    style={[
                      styles.comparisonDiffText,
                      {
                        color:
                          classComparison.difference != null &&
                          classComparison.difference >= 0
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
                      ? `+${classComparison.difference} vs Class Avg (★ ${classComparison.classCumulativeAverage})`
                      : `${classComparison.difference} vs Class Avg (★ ${classComparison.classCumulativeAverage})`}
                  </Text>
                )}
              </View>
            )}

            {/* Current Month Real-Time Status Banner */}
            {currentMonthData && (
              <View
                style={[
                  styles.currentMonthBanner,
                  {
                    backgroundColor:
                      currentMonthData.status === "completed"
                        ? isDark
                          ? "rgba(34, 197, 94, 0.12)"
                          : "#F0FDF4"
                        : currentMonthData.status === "in_progress"
                        ? isDark
                          ? "rgba(245, 158, 11, 0.12)"
                          : "#FFFBEB"
                        : isDark
                        ? "rgba(148, 163, 184, 0.1)"
                        : "#F8FAFC",
                    borderColor:
                      currentMonthData.status === "completed"
                        ? isDark
                          ? "rgba(34, 197, 94, 0.25)"
                          : "#BBF7D0"
                        : currentMonthData.status === "in_progress"
                        ? isDark
                          ? "rgba(245, 158, 11, 0.25)"
                          : "#FDE68A"
                        : colors.outlineVariant,
                  },
                ]}
              >
                <View style={styles.currentMonthHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons
                      name={
                        currentMonthData.status === "completed"
                          ? "check-circle"
                          : currentMonthData.status === "in_progress"
                          ? "pending-actions"
                          : "schedule"
                      }
                      size={16}
                      color={
                        currentMonthData.status === "completed"
                          ? isDark
                            ? "#4ADE80"
                            : "#16A34A"
                          : currentMonthData.status === "in_progress"
                          ? isDark
                            ? "#FBBF24"
                            : "#D97706"
                          : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={[
                        styles.currentMonthTitle,
                        { color: colors.onSurface },
                      ]}
                    >
                      {currentMonthData.monthName} {currentMonthData.year}
                    </Text>
                  </View>

                  <Badge
                    variant={
                      currentMonthData.status === "completed"
                        ? "success"
                        : currentMonthData.status === "in_progress"
                        ? "warning"
                        : "neutral"
                    }
                    label={
                      currentMonthData.status === "completed"
                        ? "Complete"
                        : currentMonthData.status === "in_progress"
                        ? "In Progress"
                        : "Evaluating"
                    }
                    size="sm"
                  />
                </View>

                <Text
                  style={[
                    styles.currentMonthSubtext,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {currentMonthData.status === "completed"
                    ? `All ${currentMonthData.totalSubjects} subjects evaluated • Final Rating: ★ ${currentMonthData.provisionalAverage}`
                    : currentMonthData.status === "in_progress"
                    ? `${currentMonthData.ratedCount} of ${currentMonthData.totalSubjects} subjects evaluated • Provisional: ★ ${currentMonthData.provisionalAverage}`
                    : `Teachers are submitting evaluations for this month (${currentMonthData.totalSubjects} ratable subjects).`}
                </Text>

                {/* Progress Bar for Current Month */}
                {currentMonthData.totalSubjects > 0 && (
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
                              : ratingAccent,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Criteria Mini Pills Grid */}
            {criteriaData && (
              <View style={styles.criteriaGrid}>
                {[
                  {
                    key: "classEngagement",
                    label: "Engagement",
                    val: criteriaData.classEngagement,
                  },
                  {
                    key: "homeworkClasswork",
                    label: "Homework",
                    val: criteriaData.homeworkClasswork,
                  },
                  {
                    key: "behaviourSocial",
                    label: "Behaviour",
                    val: criteriaData.behaviourSocial,
                  },
                  {
                    key: "englishComm",
                    label: "Communication",
                    val: criteriaData.englishComm,
                  },
                ].map((crit) => (
                  <View
                    key={crit.key}
                    style={[
                      styles.criteriaPill,
                      {
                        backgroundColor:
                          colors.surfaceContainerHighest || colors.surface,
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.criteriaPillLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                      numberOfLines={1}
                    >
                      {crit.label}
                    </Text>
                    <Text
                      style={[
                        styles.criteriaPillScore,
                        { color: colors.onSurface },
                      ]}
                    >
                      {crit.val ? `★ ${crit.val}` : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.detailsLinkRow}>
              <Text style={[styles.detailsLinkText, { color: ratingAccent }]}>
                View 3-tab report: Cumulative, Monthly & Subjects →
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/student/ratings")}
            style={[
              styles.ratingCardContent,
              {
                backgroundColor: colors.surfaceContainerLow || colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="grade" size={28} color={ratingAccent} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.onSurface },
                  ]}
                >
                  {currentMonthData
                    ? `${currentMonthData.monthName} ${currentMonthData.year} Ratings in Progress`
                    : "Ratings in Progress"}
                </Text>
                <Text
                  style={[
                    styles.scoreSubtext,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Teachers are evaluating monthly classroom participation and assignments. Tap to view the rating guide and criteria.
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>
        )}
      </HomeModuleContainer>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* CARD 3: Academic Performance (Pastel Sky / Cyan Theme)       */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <HomeModuleContainer
        title="Academic Performance"
        icon="insights"
        accentColor={skyAccent}
        actionText="Reports"
        onActionPress={() => router.push("/student/report-card")}
        lightBg="rgba(2, 132, 199, 0.045)"
        darkBg="rgba(56, 189, 248, 0.07)"
        lightBorder="rgba(2, 132, 199, 0.14)"
        darkBorder="rgba(56, 189, 248, 0.18)"
      >
        {data.charts?.performanceTrend &&
        data.charts.performanceTrend.length > 0 ? (
          <PerformanceTrendCard
            embedded={true}
            data={data.charts.performanceTrend}
            onViewReport={() => router.push("/student/report-card")}
          />
        ) : (
          <EmptyState
            icon="show-chart"
            title="No Performance Data"
            message="Your performance data will appear here once exam marks are published"
          />
        )}
      </HomeModuleContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  ratingCardContent: {
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  scoreBadgeCircle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  scoreMeta: {
    flex: 1,
  },
  labelBadgeRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  scoreSubtext: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  criteriaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  criteriaPill: {
    flex: 1,
    minWidth: "46%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
  },
  criteriaPillLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  criteriaPillScore: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    marginLeft: 4,
  },
  detailsLinkRow: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  detailsLinkText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    marginBottom: 2,
  },
  comparisonStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    marginTop: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  comparisonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  comparisonLabelText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm || 6,
  },
  rankBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  comparisonDiffText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  currentMonthBanner: {
    padding: 10,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    marginTop: 10,
  },
  currentMonthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  currentMonthTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  currentMonthSubtext: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    lineHeight: 15,
  },
  currentMonthProgressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  currentMonthProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
});

export default StudentDashboard;
