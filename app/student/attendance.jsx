import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import apiFetch from "../../utils/apiFetch";
import apiConfig from "../../config/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { useLabel } from "../../context/LabelsContext";
import AttendanceView from "../../components/AttendanceView";

const PAGE_SIZE = 30;

export default function StudentAttendanceScreen() {
  const { colors } = useTheme();
  const { t } = useLabel();
  const { user, userId: authUserId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [allHistory, setAllHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const userId = user?.id || user?._id || authUserId;

  // Fetch Attendance Summary
  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useApiQuery(
    ["studentAttendanceSummary", userId],
    `${apiConfig.baseUrl}/attendance/student/${userId}/summary`,
    { enabled: !!userId, ...CACHE_TIERS.MODERATE }
  );

  // Fetch Page 1 History with React Query (persisted offline)
  const {
    data: historyPage1Data,
    isLoading: loadingHistoryQuery,
    refetch: refetchHistoryQuery,
  } = useApiQuery(
    ["studentAttendanceHistory", userId],
    `${apiConfig.baseUrl}/attendance/student/${userId}?page=1&limit=${PAGE_SIZE}`,
    { enabled: !!userId, ...CACHE_TIERS.MODERATE }
  );

  useEffect(() => {
    if (historyPage1Data?.attendance) {
      setAllHistory(historyPage1Data.attendance);
      setHasMore(historyPage1Data.pagination?.hasMore || false);
      setPage(1);
    }
  }, [historyPage1Data]);

  // Fetch subsequent pages (> 1)
  const fetchNextHistoryPage = useCallback(
    async (targetPage) => {
      if (!userId || targetPage <= 1) return;
      try {
        const res = await apiFetch(
          `${apiConfig.baseUrl}/attendance/student/${userId}?page=${targetPage}&limit=${PAGE_SIZE}`
        );
        const data = await res.json();
        const records = data?.attendance || [];
        setAllHistory((prev) => [...prev, ...records]);
        setHasMore(data?.pagination?.hasMore || false);
        setPage(targetPage);
      } catch (e) {
        console.error("fetchNextHistoryPage error:", e);
      }
    },
    [userId]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchNextHistoryPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, fetchNextHistoryPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchHistoryQuery()]);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AttendanceView
        role="student"
        attendanceHistory={allHistory}
        summary={summary}
        subjectWise={summary?.subjectWise}
        holidays={summary?.holidays}
        loading={(loadingSummary || loadingHistoryQuery) && !summary && allHistory.length === 0}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
        hasMore={hasMore}
        title={t("student.myAttendanceTitle", "My Attendance")}
        subtitle={t(
          "student.myAttendanceSubtitle",
          "Track your attendance record"
        )}
      />
    </View>
  );
}
