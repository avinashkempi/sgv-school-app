import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import StatCard from "./StatCard";
import DateRangePicker from "../DateRangePicker";
import { LoadingState, ErrorState, EmptyState } from "../StateComponents";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import HomeModuleContainer from "../home/HomeModuleContainer";

const AdminDashboard = () => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const [dateRange, setDateRange] = useState("thisMonth");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useApiQuery(
    ["adminDashboard", dateRange],
    `${apiConfig.baseUrl}/dashboard/admin?range=${dateRange}`,
    { ...CACHE_TIERS.MODERATE }
  );

  const error = queryError ? queryError.message : null;

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
    return labels[dateRange] || "This Month";
  };

  const indigoAccent = colors.primary;
  const cardSurface = isDark ? colors.surfaceContainer : "#FFFFFF";
  const subBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  if (loading && !data) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={refetch} />;
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
      title="Admin Hub"
      icon="admin-panel-settings"
      accentColor={indigoAccent}
      headerRight={datePickerTrigger}
      lightBg="rgba(79, 55, 139, 0.045)"
      darkBg="rgba(208, 188, 255, 0.07)"
      lightBorder="rgba(79, 55, 139, 0.14)"
      darkBorder="rgba(208, 188, 255, 0.18)"
    >
      {/* Quick Actions Scroll */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
        >
          <QuickActionButton
            title="Vibes Approvals"
            icon="verified-user"
            color="#2E7D32"
            onPress={() => router.push("/admin/vibe-approvals")}
          />
          <QuickActionButton
            title="Import Data"
            icon="cloud-upload"
            color={colors.primary}
            onPress={() => router.push("/admin/import-data")}
          />
          <QuickActionButton
            title="Missing Tracker"
            icon="event-busy"
            color={colors.error}
            onPress={() =>
              router.push({
                pathname: "/admin/attendance",
                params: { tab: "tracker" },
              })
            }
          />
        </ScrollView>
      </View>

      {/* Stat Cards Grid */}
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}
      >
        <StatCard
          title="Attendance"
          value={`${data.overview?.attendancePercentage || 0}%`}
          icon="calendar-check"
          color={colors.tertiary}
          trend="up"
          trendValue={data.overview?.attendanceTrend || 0}
          onPress={() => router.push("/admin/attendance")}
        />
        <StatCard
          title="Fees Collected"
          value={`₹${(data.overview?.totalCollected || 0).toLocaleString()}`}
          icon="currency-inr"
          color={colors.success}
          trendValue={data.overview?.feeCollectionTrend || 0}
          trend="up"
          onPress={() => router.push("/admin/fees")}
        />
        <StatCard
          title="School Timetable"
          value="View"
          icon="calendar-today"
          color={colors.tertiary}
          onPress={() => router.push("/admin/timetable")}
        />
      </View>

      {/* Fee Trend Chart */}
      <View style={{ marginTop: 12 }}>
        <View style={localStyles.sectionHeader}>
          <MaterialIcons name="trending-up" size={17} color={indigoAccent} />
          <Text style={[localStyles.sectionTitle, { color: colors.onSurface }]}>
            Trends & Insights
          </Text>
        </View>

        {data.charts?.feeTrend && data.charts.feeTrend.length > 0 ? (
          <Pressable
            onPress={() => router.push("/admin/fees")}
            style={({ pressed }) => [
              localStyles.chartCard,
              {
                backgroundColor: cardSurface,
                borderColor: subBorder,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={localStyles.chartHeaderRow}>
              <Text style={[localStyles.chartTitle, { color: colors.onSurface }]}>
                Fee Collection (Academic Year)
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.onSurfaceVariant}
              />
            </View>
            <View style={localStyles.chartBarContainer}>
              {(() => {
                const maxAmount = Math.max(
                  ...data.charts.feeTrend.map((d) => d.amount),
                  1
                );
                return data.charts.feeTrend.map((d, i) => {
                  const barHeight = Math.max((d.amount / maxAmount) * 95, 4);
                  const hasValue = d.amount > 0;
                  return (
                    <View key={i} style={localStyles.barCol}>
                      {hasValue && (
                        <Text
                          style={[
                            localStyles.barValueText,
                            { color: colors.onSurfaceVariant },
                          ]}
                        >
                          {d.amount >= 100000
                            ? `${(d.amount / 100000).toFixed(1)}L`
                            : d.amount >= 1000
                            ? `${(d.amount / 1000).toFixed(0)}K`
                            : d.amount}
                        </Text>
                      )}
                      <View
                        style={{
                          width: "60%",
                          maxWidth: 20,
                          height: barHeight,
                          borderRadius: 4,
                          backgroundColor: hasValue
                            ? colors.primary
                            : isDark
                            ? "rgba(255,255,255,0.1)"
                            : colors.outlineVariant,
                          opacity: hasValue ? 1 : 0.3,
                        }}
                      />
                      <Text
                        style={[
                          localStyles.barMonthLabel,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {d.month.substring(0, 3)}
                      </Text>
                    </View>
                  );
                });
              })()}
            </View>
          </Pressable>
        ) : (
          <EmptyState
            icon="bar-chart"
            title="No Fee Data"
            message="Fee collection data is not available for the selected period"
          />
        )}
      </View>

      {/* Detailed Daily Attendance Summary */}
      {data.charts?.attendance && (
        <View
          style={[
            localStyles.chartCard,
            {
              backgroundColor: cardSurface,
              borderColor: subBorder,
              marginTop: 10,
            },
          ]}
        >
          <View style={localStyles.chartHeaderRow}>
            <Text style={[localStyles.chartTitle, { color: colors.onSurface }]}>
              Daily Attendance Summary
            </Text>
            <MaterialIcons name="date-range" size={19} color={colors.primary} />
          </View>

          {/* Student Attendance Bar */}
          <View style={{ marginBottom: 14 }}>
            <View style={localStyles.progressLabelRow}>
              <Text
                style={[
                  localStyles.progressLabel,
                  { color: colors.onSurface },
                ]}
              >
                Students
              </Text>
              <Text
                style={[
                  localStyles.progressValue,
                  { color: colors.onSurface },
                ]}
              >
                {data.charts.attendance.student?.present || 0} /{" "}
                {data.charts.attendance.student?.total || 0}
              </Text>
            </View>
            <View
              style={[
                localStyles.progressBarTrack,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  width: `${
                    data.charts.attendance.student?.total > 0
                      ? (data.charts.attendance.student.present /
                          data.charts.attendance.student.total) *
                        100
                      : 0
                  }%`,
                  backgroundColor: colors.primary,
                  height: "100%",
                }}
              />
            </View>
          </View>

          {/* Teacher Attendance Bar */}
          <View style={{ marginBottom: 14 }}>
            <View style={localStyles.progressLabelRow}>
              <Text
                style={[
                  localStyles.progressLabel,
                  { color: colors.onSurface },
                ]}
              >
                Teachers
              </Text>
              <Text
                style={[
                  localStyles.progressValue,
                  { color: colors.onSurface },
                ]}
              >
                {data.charts.attendance.teacher?.present || 0} /{" "}
                {data.charts.attendance.teacher?.total || 0}
              </Text>
            </View>
            <View
              style={[
                localStyles.progressBarTrack,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  width: `${
                    data.charts.attendance.teacher?.total > 0
                      ? (data.charts.attendance.teacher.present /
                          data.charts.attendance.teacher.total) *
                        100
                      : 0
                  }%`,
                  backgroundColor: colors.tertiary,
                  height: "100%",
                }}
              />
            </View>
          </View>

          {/* Classes Marked Stat Tile */}
          <View
            style={[
              localStyles.classesMarkedTile,
              {
                backgroundColor: isDark
                  ? "rgba(208, 188, 255, 0.12)"
                  : colors.primaryContainer,
              },
            ]}
          >
            <MaterialIcons
              name="fact-check"
              size={20}
              color={isDark ? colors.primary : colors.onPrimaryContainer}
              style={{ marginRight: 10 }}
            />
            <View>
              <Text
                style={{
                  fontFamily: FONTS.medium,
                  color: isDark ? colors.onSurface : colors.onPrimaryContainer,
                  fontSize: FONT_SIZES.sm,
                }}
              >
                Classes Marked Today
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  color: isDark ? colors.primary : colors.onPrimaryContainer,
                  fontSize: FONT_SIZES.mdLg,
                }}
              >
                {data.charts.attendance.classesMarked?.count || 0} out of{" "}
                {data.charts.attendance.classesMarked?.total || 0}
              </Text>
            </View>
          </View>
        </View>
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

const QuickActionButton = ({ title, icon, color, onPress }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const btnColor = color || colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: btnColor + "30",
        opacity: pressed ? 0.75 : 1,
        gap: 8,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: btnColor + "18",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: btnColor + "30",
        }}
      >
        <MaterialIcons name={icon} size={16} color={btnColor} />
      </View>
      <Text
        style={{
          fontFamily: FONTS.bold,
          color: colors.onSurface,
          fontSize: FONT_SIZES.md,
        }}
      >
        {title}
      </Text>
    </Pressable>
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    letterSpacing: 0.1,
  },
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  chartBarContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 130,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
  },
  barValueText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  barMonthLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
  },
  progressValue: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.md,
  },
  progressBarTrack: {
    height: 9,
    borderRadius: 5,
    overflow: "hidden",
    flexDirection: "row",
  },
  classesMarkedTile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
  },
});

export default AdminDashboard;
