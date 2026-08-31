import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import StatCard from "./StatCard";
import TeacherAttendanceTrendCard from "./TeacherAttendanceTrendCard";
import TeacherPerformanceCard from "./TeacherPerformanceCard";
import DateRangePicker from "../DateRangePicker";
import { LoadingState, EmptyState } from "../StateComponents";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { formatClassName } from "../../utils/formatClassName";
import { getISTDateString, getISTToday } from "../../utils/date";
import HomeModuleContainer from "../home/HomeModuleContainer";

const TeacherDashboard = () => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const [dateRange, setDateRange] = useState("thisWeek");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dashboard Stats Query
  const {
    data,
    isLoading: loading,
  } = useApiQuery(
    ["teacherDashboard", dateRange],
    `${apiConfig.baseUrl}/dashboard/teacher?range=${dateRange}`,
    { staleTime: 1000 * 60 * 5 }
  );

  // Missing Attendance Query
  const todayStr = getISTToday();
  const { data: missingData } = useApiQuery(
    ["teacherMissingAttendance", todayStr],
    (() => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);
      return `${
        apiConfig.baseUrl
      }/attendance/missing-tracker?startDate=${getISTDateString(
        startDate
      )}&endDate=${getISTDateString(endDate)}`;
    })(),
    { staleTime: 1000 * 60 * 5 }
  );

  const missingDays =
    missingData?.success && missingData.missingDays
      ? missingData.missingDays
      : [];
  const missingClassId =
    missingData?.success && missingData.classId ? missingData.classId : null;
  const missingClassName =
    missingData?.success && missingData.className
      ? missingData.className
      : null;

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const getDateRangeLabel = () => {
    const labels = {
      today: "Today",
      thisWeek: "This Week",
      thisMonth: "This Month",
      last30Days: "Last 30 Days",
      thisYear: "This Year",
      lastYear: "Last Year",
      allTime: "All Time",
    };
    return labels[dateRange] || "This Week";
  };

  const indigoAccent = colors.primary;
  const cardSurface = isDark ? colors.surfaceContainer : "#FFFFFF";
  const subBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

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

  const datePickerTrigger = (
    <Pressable
      onPress={() => setShowDatePicker(true)}
      style={({ pressed }) => [
        localStyles.datePickerBtn,
        {
          backgroundColor: isDark
            ? "rgba(208, 188, 255, 0.2)"
            : colors.primaryContainer,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Select date range"
    >
      <MaterialIcons
        name="calendar-today"
        size={13}
        color={colors.onPrimaryContainer}
      />
      <Text
        style={[
          localStyles.datePickerBtnText,
          { color: colors.onPrimaryContainer },
        ]}
      >
        {getDateRangeLabel()}
      </Text>
      <MaterialIcons
        name="arrow-drop-down"
        size={16}
        color={colors.onPrimaryContainer}
      />
    </Pressable>
  );

  return (
    <HomeModuleContainer
      title="Teacher Space"
      icon="co-present"
      accentColor={indigoAccent}
      badge={
        data.overview?.className
          ? `Class: ${formatClassName(data.overview.className)}`
          : undefined
      }
      headerRight={datePickerTrigger}
      lightBg="rgba(79, 55, 139, 0.045)"
      darkBg="rgba(208, 188, 255, 0.07)"
      lightBorder="rgba(79, 55, 139, 0.14)"
      darkBorder="rgba(208, 188, 255, 0.18)"
    >
      {/* Missing Attendance Alert */}
      {missingDays.length > 0 && (
        <View
          style={[
            localStyles.missingAlertCard,
            {
              backgroundColor: isDark
                ? "rgba(242, 184, 181, 0.12)"
                : "rgba(179, 38, 30, 0.08)",
              borderColor: isDark
                ? "rgba(242, 184, 181, 0.3)"
                : "rgba(179, 38, 30, 0.25)",
            },
          ]}
        >
          <View style={localStyles.missingHeaderRow}>
            <MaterialIcons
              name="warning"
              size={20}
              color={colors.error}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  localStyles.missingTitle,
                  { color: colors.error },
                ]}
              >
                Missing Attendance!
              </Text>
              <Text
                style={[
                  localStyles.missingSubtitle,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {missingClassName ? `${missingClassName} — ` : ""}
                {missingDays.length} day{missingDays.length > 1 ? "s" : ""} not
                marked
              </Text>
            </View>
          </View>

          {/* Missed dates list */}
          <View style={localStyles.missedChipsRow}>
            {missingDays.slice(0, 7).map((day) => {
              const d = new Date(day + "T00:00:00");
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const yesterday = new Date(today);
              yesterday.setDate(today.getDate() - 1);
              let label;
              if (d.getTime() === today.getTime()) label = "Today";
              else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
              else
                label = d.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                });
              return (
                <Pressable
                  key={day}
                  onPress={() =>
                    missingClassId &&
                    router.push({
                      pathname: "/teacher/class/attendance",
                      params: { classId: missingClassId, date: day },
                    })
                  }
                  style={({ pressed }) => [
                    localStyles.dateChip,
                    {
                      backgroundColor: isDark
                        ? "rgba(242, 184, 181, 0.18)"
                        : "rgba(179, 38, 30, 0.10)",
                      borderColor: isDark
                        ? "rgba(242, 184, 181, 0.35)"
                        : "rgba(179, 38, 30, 0.25)",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.dateChipText,
                      { color: colors.error },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            {missingDays.length > 7 && (
              <View
                style={[
                  localStyles.dateChip,
                  {
                    backgroundColor: isDark
                      ? "rgba(242, 184, 181, 0.18)"
                      : "rgba(179, 38, 30, 0.10)",
                    borderColor: isDark
                      ? "rgba(242, 184, 181, 0.35)"
                      : "rgba(179, 38, 30, 0.25)",
                  },
                ]}
              >
                <Text
                  style={[
                    localStyles.dateChipText,
                    { color: colors.error },
                  ]}
                >
                  +{missingDays.length - 7} more
                </Text>
              </View>
            )}
          </View>

          {/* Mark Now button */}
          <Pressable
            onPress={() =>
              missingClassId &&
              router.push({
                pathname: "/teacher/class/attendance",
                params: { classId: missingClassId },
              })
            }
            style={({ pressed }) => [
              localStyles.markNowBtn,
              {
                backgroundColor: colors.error,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MaterialIcons name="edit" size={16} color="#fff" />
            <Text style={localStyles.markNowBtnText}>
              Mark Attendance Now
            </Text>
          </Pressable>
        </View>
      )}

      {/* Class Attendance Today Card */}
      {data.classAttendance ? (
        <View
          style={[
            localStyles.innerCard,
            {
              backgroundColor: cardSurface,
              borderColor: subBorder,
              marginBottom: 12,
            },
          ]}
        >
          <Text
            style={[
              localStyles.cardHeaderTitle,
              { color: colors.onSurface, marginBottom: 12 },
            ]}
          >
            Class Attendance Today
          </Text>
          {data.classAttendance.marked === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <MaterialIcons
                name="event-busy"
                size={28}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                  marginTop: 6,
                }}
              >
                Attendance not marked yet today
              </Text>
            </View>
          ) : (
            <>
              {/* Progress Bar */}
              <View
                style={[
                  localStyles.progressBarTrack,
                  {
                    backgroundColor: isDark
                      ? "rgba(242, 184, 181, 0.25)"
                      : "rgba(179, 38, 30, 0.15)",
                    marginBottom: 12,
                  },
                ]}
              >
                <View
                  style={{
                    height: "100%",
                    backgroundColor: colors.success,
                    borderRadius: 4,
                    width: `${
                      data.classAttendance.total > 0
                        ? (data.classAttendance.present /
                            data.classAttendance.total) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </View>
              {/* Stats Row */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View
                  style={[
                    localStyles.statTile,
                    {
                      backgroundColor: isDark
                        ? "rgba(109, 213, 140, 0.15)"
                        : "rgba(20, 108, 46, 0.09)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.statNumber,
                      { color: colors.success },
                    ]}
                  >
                    {data.classAttendance.present}
                  </Text>
                  <Text
                    style={[
                      localStyles.statLabel,
                      { color: colors.success },
                    ]}
                  >
                    Present
                  </Text>
                </View>
                <View
                  style={[
                    localStyles.statTile,
                    {
                      backgroundColor: isDark
                        ? "rgba(242, 184, 181, 0.15)"
                        : "rgba(179, 38, 30, 0.09)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.statNumber,
                      { color: colors.error },
                    ]}
                  >
                    {data.classAttendance.absent}
                  </Text>
                  <Text
                    style={[
                      localStyles.statLabel,
                      { color: colors.error },
                    ]}
                  >
                    Absent
                  </Text>
                </View>
                <View
                  style={[
                    localStyles.statTile,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 183, 77, 0.15)"
                        : "rgba(226, 114, 0, 0.09)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.statNumber,
                      { color: isDark ? "#FFB74D" : "#D97706" },
                    ]}
                  >
                    {data.classAttendance.late}
                  </Text>
                  <Text
                    style={[
                      localStyles.statLabel,
                      { color: isDark ? "#FFB74D" : "#D97706" },
                    ]}
                  >
                    Late
                  </Text>
                </View>
                <View
                  style={[
                    localStyles.statTile,
                    {
                      backgroundColor: isDark
                        ? "rgba(208, 188, 255, 0.15)"
                        : "rgba(79, 55, 139, 0.09)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.statNumber,
                      { color: colors.primary },
                    ]}
                  >
                    {data.classAttendance.total}
                  </Text>
                  <Text
                    style={[
                      localStyles.statLabel,
                      { color: colors.primary },
                    ]}
                  >
                    Total
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      ) : (
        !data.overview?.className && (
          <View
            style={[
              localStyles.innerCard,
              {
                backgroundColor: cardSurface,
                borderColor: subBorder,
                marginBottom: 12,
                alignItems: "center",
                paddingVertical: 14,
              },
            ]}
          >
            <MaterialIcons
              name="info-outline"
              size={24}
              color={colors.onSurfaceVariant}
            />
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              Not assigned as class teacher.
            </Text>
          </View>
        )
      )}

      {/* Stat Cards Grid */}
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}
      >
        <StatCard
          title="Classes Today"
          value={data.overview?.classesToday || 0}
          icon="human-male-board"
          color={colors.primary}
          onPress={() => router.push("/teacher/timetable")}
        />
        <StatCard
          title="My Students"
          value={data.overview?.myStudents || 0}
          icon="account-group"
          color={colors.tertiary}
          onPress={() => router.push("/teacher/classes")}
        />
        <StatCard
          title="Low Attendance"
          value={data.overview?.lowAttendanceCount || 0}
          icon="account-alert"
          color={colors.error}
          onPress={() =>
            missingClassId
              ? router.push({
                  pathname: "/teacher/class/attendance",
                  params: { classId: missingClassId },
                })
              : router.push("/teacher/classes")
          }
        />
        <StatCard
          title="Total Classes"
          value={data.overview?.totalClassesTaught || 0}
          icon="school"
          color={colors.secondary || colors.primary}
          onPress={() => router.push("/teacher/classes")}
        />
      </View>

      {/* Insights & Analytics Header */}
      <View style={localStyles.sectionHeader}>
        <MaterialIcons name="insights" size={18} color={indigoAccent} />
        <Text style={[localStyles.sectionTitle, { color: colors.onSurface }]}>
          Insights & Analytics
        </Text>
      </View>

      {data.charts?.attendanceTrend &&
      data.charts.attendanceTrend.data?.length > 0 ? (
        <TeacherAttendanceTrendCard
          title="Attendance Trend (7 Days)"
          subtitle="Daily student presence rate"
          labels={data.charts.attendanceTrend.labels}
          data={data.charts.attendanceTrend.data}
          classId={missingClassId}
        />
      ) : (
        <EmptyState
          icon="show-chart"
          title="No Attendance Trend"
          message="Attendance trend data is not available yet"
        />
      )}

      {data.charts?.performance && data.charts.performance.data?.length > 0 ? (
        <TeacherPerformanceCard
          title="Subject Performance"
          subtitle="Average marks scored by subject"
          labels={data.charts.performance.labels}
          data={data.charts.performance.data}
        />
      ) : (
        <EmptyState
          icon="bar-chart"
          title="No Performance Data"
          message="Student performance data is not available yet"
        />
      )}

      {/* Date Range Picker Modal */}
      <DateRangePicker
        visible={showDatePicker}
        selectedRange={dateRange}
        onRangeSelect={handleDateRangeChange}
        onClose={() => setShowDatePicker(false)}
      />
    </HomeModuleContainer>
  );
};

const localStyles = StyleSheet.create({
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 3,
  },
  datePickerBtnText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  missingAlertCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  missingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  missingTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm,
  },
  missingSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    marginTop: 1,
  },
  missedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 10,
  },
  dateChip: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dateChipText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  markNowBtn: {
    borderRadius: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  markNowBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: "#fff",
  },
  innerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  statTile: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  statNumber: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: 0.1,
  },
});

export default TeacherDashboard;
