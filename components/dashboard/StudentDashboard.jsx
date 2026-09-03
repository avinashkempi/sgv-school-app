import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import PerformanceTrendCard from "./PerformanceTrendCard";
import { LoadingState, EmptyState } from "../StateComponents";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import HomeModuleContainer from "../home/HomeModuleContainer";
import TodayTimetableCard from "../home/TodayTimetableCard";

const formatNextExamDate = (dateStr) => {
  if (!dateStr || dateStr === "N/A") return "None";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

const StudentDashboard = () => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const {
    data,
    isLoading: loading,
  } = useApiQuery(
    ["studentDashboard"],
    `${apiConfig.baseUrl}/dashboard/student`,
    { ...CACHE_TIERS.MODERATE }
  );

  const indigoAccent = colors.primary;
  const skyAccent = isDark ? "#38BDF8" : "#0284C7";

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

  const rawAttendance = data.overview?.attendancePercentage;
  const attendanceNum = parseFloat(rawAttendance);
  const attendanceDisplay =
    !isNaN(attendanceNum) && attendanceNum > 0 ? `${attendanceNum}%` : "0%";
  const attendanceTrend = data.overview?.attendanceTrend;

  const dueAmount = data.overview?.dueAmount || 0;
  const dueDisplay =
    dueAmount > 0 ? `₹${Number(dueAmount).toLocaleString()}` : "₹0";
  const dueStatus = dueAmount > 0 ? "Due" : "No Dues";

  const rawExamDate = data.overview?.nextExamDate;
  const examDisplay = formatNextExamDate(rawExamDate);
  const examName = data.overview?.nextExamName;

  return (
    <View>
      {/* ═════════════════════════════════════════════════════════════ */}
      {/* CARD 1: My Academics (Pastel Indigo Theme)                   */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <HomeModuleContainer
        title="My Academics"
        icon="school"
        accentColor={indigoAccent}
        lightBg="rgba(79, 55, 139, 0.045)"
        darkBg="rgba(208, 188, 255, 0.07)"
        lightBorder="rgba(79, 55, 139, 0.14)"
        darkBorder="rgba(208, 188, 255, 0.18)"
      >
        {/* Minimal 1-Row Stat Cards: Attendance, Fees Due, Next Exam */}
        <View style={localStyles.minimalStatsRow}>
          {/* Attendance Tile */}
          <MinimalStatTile
            title="Attendance"
            value={attendanceDisplay}
            icon="calendar-check"
            color={colors.primary}
            trendValue={attendanceTrend}
            onPress={() => router.push("/student/attendance")}
          />

          {/* Fees Due Tile */}
          <MinimalStatTile
            title="Fees Due"
            value={dueDisplay}
            subBadge={dueStatus}
            subBadgeColor={dueAmount > 0 ? colors.error : colors.success}
            icon="currency-inr"
            color={dueAmount > 0 ? colors.error : colors.success}
            onPress={() => router.push("/student/fees")}
          />

          {/* Next Exam Tile */}
          <MinimalStatTile
            title="Next Exam"
            value={examDisplay}
            subBadge={examName ? examName.slice(0, 10) : undefined}
            subBadgeColor={colors.tertiary}
            icon="calendar-clock"
            color={colors.tertiary}
            onPress={() => router.push("/student/exam-schedule")}
          />
        </View>
      </HomeModuleContainer>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* CARD 2: Today's Timetable (Second Section)                   */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <TodayTimetableCard />

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

/**
 * Minimal Compact Stat Tile for 1-Row 3-Column Layout
 */
const MinimalStatTile = ({
  title,
  value,
  subBadge,
  subBadgeColor,
  icon,
  color,
  trendValue,
  onPress,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const tileAccent = color || colors.primary;

  const hasTrend = typeof trendValue === "number" && trendValue !== 0;
  const isPositive = hasTrend && trendValue > 0;
  const trendColor = isPositive ? colors.success : colors.error;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        localStyles.minimalTile,
        {
          backgroundColor: isDark ? colors.surfaceContainer : colors.surface,
          borderColor: isDark ? `${colors.outlineVariant}50` : colors.outlineVariant,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
    >
      {/* Top Row: Mini Icon + Trend / Status Badge */}
      <View style={localStyles.tileTopRow}>
        <View
          style={[
            localStyles.miniIconWrap,
            {
              backgroundColor: isDark
                ? `${tileAccent}20`
                : `${tileAccent}10`,
              borderColor: "transparent",
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={14} color={tileAccent} />
        </View>

        {hasTrend ? (
          <View
            style={[
              localStyles.miniTrendBadge,
              {
                backgroundColor: isDark
                  ? `${trendColor}20`
                  : `${trendColor}12`,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isPositive ? "arrow-up" : "arrow-down"}
              size={10}
              color={trendColor}
            />
            <Text style={[localStyles.miniTrendText, { color: trendColor }]}>
              {Math.abs(trendValue)}%
            </Text>
          </View>
        ) : subBadge ? (
          <View
            style={[
              localStyles.miniSubBadge,
              {
                backgroundColor: isDark
                  ? `${subBadgeColor || colors.primary}20`
                  : `${subBadgeColor || colors.primary}12`,
              },
            ]}
          >
            <Text
              style={[
                localStyles.miniSubBadgeText,
                { color: subBadgeColor || colors.primary },
              ]}
              numberOfLines={1}
            >
              {subBadge}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Metric Value */}
      <Text
        style={[
          localStyles.metricValue,
          { color: colors.onSurface },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>

      {/* Metric Label */}
      <Text
        style={[
          localStyles.metricLabel,
          { color: colors.onSurfaceVariant },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const localStyles = StyleSheet.create({
  minimalStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  minimalTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 12,
    justifyContent: "space-between",
  },
  tileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 4,
  },
  miniIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    flexShrink: 0,
  },
  miniTrendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
    flexShrink: 0,
  },
  miniTrendText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.semiBold,
  },
  miniSubBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 1,
  },
  miniSubBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
  },
  metricValue: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
});

export default StudentDashboard;
