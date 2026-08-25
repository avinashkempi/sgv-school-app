import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import StatCard from "./StatCard";
import PerformanceTrendCard from "./PerformanceTrendCard";
import { LoadingState, EmptyState } from "../StateComponents";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";

const StudentDashboard = () => {
  const router = useRouter();
  const { colors, styles } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["studentDashboard"],
    `${apiConfig.baseUrl}/dashboard/student`,
    { ...CACHE_TIERS.MODERATE }
  );

  // React Query handles stale-while-revalidate based on CACHE_TIERS.MODERATE
  // Manual refetch is only needed on pull-to-refresh (onRefresh)

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 8 }]}>
        My Progress
      </Text>

      {/* Quick Actions */}
      <View style={{ marginBottom: 20 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          <QuickActionButton
            title="Past Reports"
            icon="history"
            color={colors.primary}
            onPress={() => router.push("/student/history")}
          />
          <QuickActionButton
            title="Report Card"
            icon="assignment"
            color={colors.tertiary || colors.primary}
            onPress={() => router.push("/student/report-card")}
          />
          <QuickActionButton
            title="Exam Schedule"
            icon="event-note"
            color={colors.secondary || colors.primary}
            onPress={() => router.push("/student/exam-schedule")}
          />
        </ScrollView>
      </View>

      {/* Stat Cards */}
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}
      >
        <StatCard
          title="Attendance"
          subtitle="Academic Year"
          value={`${data.overview?.attendancePercentage || 0}%`}
          icon="calendar-check"
          color={colors.primary}
          trend="up"
          trendValue={data.overview?.attendanceTrend || 0}
          onPress={() => router.push("/student/attendance")}
          loading={refreshing}
        />
        <StatCard
          title="Fees Due"
          value={`₹${(data.overview?.dueAmount || 0).toLocaleString()}`}
          icon="currency-inr"
          color={data.overview?.dueAmount > 0 ? colors.error : colors.success}
          onPress={() => router.push("/student/fees")}
          loading={refreshing}
        />
        <StatCard
          title="Next Exam"
          value={data.overview?.nextExamDate || "N/A"}
          subtitle={data.overview?.nextExamName || undefined}
          icon="calendar-clock"
          color={colors.tertiary}
          onPress={() => router.push("/student/exam-schedule")}
          loading={refreshing}
        />
      </View>

      <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 24 }]}>
        Academic Performance
      </Text>

      {data.charts?.performanceTrend &&
      data.charts.performanceTrend.length > 0 ? (
        <PerformanceTrendCard
          title="Performance Trend (Academic Year)"
          subtitle="Avg % across all subjects per exam"
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
    </ScrollView>
  );
};

const QuickActionButton = ({ title, icon, color, onPress }) => {
  const { colors } = useTheme();
  return (
    <React.Fragment>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          opacity: pressed ? 0.7 : 1,
          minWidth: 140,
        })}
      >
        <View
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: color + "15",
            marginRight: 12,
          }}
        >
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
        <Text
          style={{
            fontFamily: "DMSans-Medium",
            color: colors.onSurface,
            fontSize: 14,
          }}
        >
          {title}
        </Text>
      </Pressable>
    </React.Fragment>
  );
};

export default StudentDashboard;
