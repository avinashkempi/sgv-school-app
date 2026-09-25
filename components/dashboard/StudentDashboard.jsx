import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import PerformanceTrendCard from "./PerformanceTrendCard";
import { LoadingState, EmptyState } from "../StateComponents";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import HomeModuleContainer from "../home/HomeModuleContainer";
import DayGlanceCard from "../home/DayGlanceCard";

const StudentDashboard = () => {
  const router = useRouter();
  const { mode } = useTheme();
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
    <View>
      {/* ═════════════════════════════════════════════════════════════ */}
      {/* HERO: Today's Snapshot                                        */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <DayGlanceCard role="student" data={data} />


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

export default StudentDashboard;
