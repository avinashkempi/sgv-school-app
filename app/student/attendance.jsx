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
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Fetch history page 1 when userId becomes available
  const fetchHistoryPage = useCallback(
    async (targetPage, replace = false) => {
      if (!userId) return;
      if (targetPage === 1) setHistoryLoading(true);
      try {
        const res = await apiFetch(
          `${apiConfig.baseUrl}/attendance/student/${userId}?page=${targetPage}&limit=${PAGE_SIZE}`
        );
        const data = await res.json();
        const records = data?.attendance || [];
        if (replace) {
          setAllHistory(records);
        } else {
          setAllHistory((prev) => [...prev, ...records]);
        }
        setHasMore(data?.pagination?.hasMore || false);
        setPage(targetPage);
      } catch (e) {
        console.error("fetchHistoryPage error:", e);
      } finally {
        if (targetPage === 1) setHistoryLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (userId) {
      fetchHistoryPage(1, true);
    }
  }, [userId, fetchHistoryPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchHistoryPage(page + 1, false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, fetchHistoryPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), fetchHistoryPage(1, true)]);
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
        loading={(loadingSummary || historyLoading) && !summary}
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
