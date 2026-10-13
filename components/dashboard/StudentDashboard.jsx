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

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
  const ratingMonthName =
    ratingData?.month ? MONTH_NAMES[ratingData.month - 1] : "";

  return (
    <View>
      {/* ═════════════════════════════════════════════════════════════ */}
      {/* HERO: Today's Snapshot                                        */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <DayGlanceCard role="student" data={data} />

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* CARD 2: Holistic Student Rating (Monthly Cadence)            */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <HomeModuleContainer
        title="Monthly Teacher Ratings"
        icon="stars"
        accentColor={ratingAccent}
        actionText="View Details"
        onActionPress={() => router.push("/student/ratings")}
        lightBg="rgba(99, 102, 241, 0.04)"
        darkBg="rgba(167, 139, 250, 0.07)"
        lightBorder="rgba(99, 102, 241, 0.14)"
        darkBorder="rgba(167, 139, 250, 0.18)"
      >
        {ratingData && ratingData.average ? (
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
                        ? ratingData.variant === "success"
                          ? "rgba(74, 222, 128, 0.16)"
                          : ratingData.variant === "warning"
                          ? "rgba(251, 191, 36, 0.16)"
                          : "rgba(167, 139, 250, 0.16)"
                        : ratingData.variant === "success"
                        ? "#DCFCE7"
                        : ratingData.variant === "warning"
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
                          ? ratingData.variant === "success"
                            ? "#4ADE80"
                            : ratingData.variant === "warning"
                            ? "#FBBF24"
                            : ratingAccent
                          : ratingData.variant === "success"
                          ? "#16A34A"
                          : ratingData.variant === "warning"
                          ? "#D97706"
                          : colors.primary,
                      },
                    ]}
                  >
                    ★ {ratingData.average}
                  </Text>
                </View>
                <View style={styles.scoreMeta}>
                  <View style={styles.labelBadgeRow}>
                    <Badge
                      variant={ratingData.variant || "primary"}
                      label={ratingData.label || "Meets Expectation"}
                      size="sm"
                    />
                  </View>
                  <Text
                    style={[
                      styles.scoreSubtext,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {ratingMonthName} {ratingData.year} • {ratingData.ratedCount}{" "}
                    subject{ratingData.ratedCount !== 1 ? "s" : ""} evaluated
                  </Text>
                </View>
              </View>

              <MaterialIcons
                name="chevron-right"
                size={24}
                color={colors.onSurfaceVariant}
              />
            </View>

            {/* Criteria Mini Pills Grid */}
            {ratingData.criteriaAverages && (
              <View style={styles.criteriaGrid}>
                {[
                  {
                    key: "classEngagement",
                    label: "Engagement",
                    val: ratingData.criteriaAverages.classEngagement,
                  },
                  {
                    key: "homeworkClasswork",
                    label: "Homework",
                    val: ratingData.criteriaAverages.homeworkClasswork,
                  },
                  {
                    key: "behaviourSocial",
                    label: "Behaviour",
                    val: ratingData.criteriaAverages.behaviourSocial,
                  },
                  {
                    key: "englishComm",
                    label: "Communication",
                    val: ratingData.criteriaAverages.englishComm,
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
                View full month trend & subject breakdown →
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
                  Ratings in progress
                </Text>
                <Text
                  style={[
                    styles.scoreSubtext,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Teachers are evaluating monthly classroom ratings. Tap to view past records.
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
});

export default StudentDashboard;
