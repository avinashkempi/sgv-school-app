import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import apiFetch from "../../utils/apiFetch";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import ModernCalendar from "../../components/ModernCalendar";
import { LoadingState } from "../../components/StateComponents";
import apiConfig from "../../config/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { getISTDateString, getISTToday } from "../../utils/date";

const PAGE_SIZE = 30;
const MONTHLY_PAGE_SIZE = 3;

export default function StudentAttendanceScreen() {
  const _router = useRouter();
  const { _styles, colors } = useTheme();
  const { t } = useLabel();
  const { user, userId: authUserId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [allHistory, setAllHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Monthly summary pagination
  const [monthlyVisible, setMonthlyVisible] = useState(MONTHLY_PAGE_SIZE);

  const [selectedMonth, setSelectedMonth] = useState(getISTToday());

  const userId = user?.id || user?._id || authUserId;

  // Fetch Attendance Summary (always full — not paginated)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
    setMonthlyVisible(MONTHLY_PAGE_SIZE);
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return colors.success;
      case "absent":
        return colors.error;
      case "late":
        return "#FF9800";
      case "excused":
        return "#2196F3";
      default:
        return colors.onSurfaceVariant;
    }
  };

  // Calculated overall stats from summary
  const displayStats = useMemo(() => {
    if (summary?.overall?.total > 0) {
      return {
        present: summary.overall.present,
        total: summary.overall.total,
        percentage: summary.overall.percentage,
      };
    }
    // Fallback: compute from loaded history
    // Count late, excused, half-day as present to match backend & monthly breakdown calculations
    const PRESENT_STATUSES = ["present", "late", "excused", "half-day"];
    const total = allHistory.length;
    const present = allHistory.filter((r) =>
      PRESENT_STATUSES.includes(r.status)
    ).length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    return { present, total, percentage };
  }, [summary, allHistory]);

  const markedDates = useMemo(() => {
    const marks = {};
    allHistory.forEach((record) => {
      const dateStr = getISTDateString(record.date);
      const color = getStatusColor(record.status);
      marks[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: color + "20",
            borderWidth: 1,
            borderColor: color,
            borderRadius: 8,
          },
          text: { color, fontFamily: FONTS.bold },
        },
      };
    });
    return marks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHistory, colors]);

  const monthlyBreakdown = summary?.monthlyBreakdown || [];
  const visibleMonths = monthlyBreakdown.slice(0, monthlyVisible);

  const loading = (loadingSummary || historyLoading) && !summary;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: 16, paddingTop: 24 }}>
          <Header
            title={t("student.myAttendance", "My Attendance")}
            subtitle={t(
              "student.trackAttendanceRecord",
              "Track your attendance record"
            )}
          />
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <LoadingState
            message={t(
              "student.loadingAttendance",
              "Loading attendance records..."
            )}
          />
        </View>
      </View>
    );
  }

  const ListHeader = (
    <View style={{ padding: 16, paddingTop: 24 }}>
      <Header title="My Attendance" subtitle="Track your attendance record" />

      {/* Overall Percentage */}
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: 20,
          padding: 24,
          marginTop: 20,
          alignItems: "center",
          elevation: 4,
        }}
      >
        <Text
          style={{
            fontSize: FONT_SIZES.lg,
            color: "#fff",
            opacity: 0.9,
            fontFamily: FONTS.medium,
          }}
        >
          {t("student.overallAttendance", "Overall Attendance")}
        </Text>
        <Text
          style={{
            fontSize: 64,
            fontFamily: FONTS.bold,
            color: "#fff",
            marginTop: 8,
          }}
        >
          {displayStats.percentage}%
        </Text>
        <View style={{ flexDirection: "row", gap: 24, marginTop: 16 }}>
          <View style={{ alignItems: "center" }}>
            <Text
              style={{ fontSize: FONT_SIZES.displaySm, fontFamily: FONTS.bold, color: "#fff" }}
            >
              {displayStats.present}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                color: "#fff",
                opacity: 0.8,
                fontFamily: FONTS.regular,
              }}
            >
              {t("common.present", "Present")}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text
              style={{ fontSize: FONT_SIZES.displaySm, fontFamily: FONTS.bold, color: "#fff" }}
            >
              {displayStats.total}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                color: "#fff",
                opacity: 0.8,
                fontFamily: FONTS.regular,
              }}
            >
              {t("student.totalDays", "Total Days")}
            </Text>
          </View>
        </View>
      </View>

      {/* Subject-wise Breakdown */}
      {summary?.subjectWise && summary.subjectWise.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: FONT_SIZES.xl,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              marginBottom: 12,
            }}
          >
            {t("student.subjectWiseAttendance", "Subject-wise Attendance")}
          </Text>
          {summary.subjectWise.map((subject) => (
            <View
              key={subject.subjectId}
              style={{
                backgroundColor: colors.surfaceContainer,
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
                elevation: 1,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.semiBold,
                      color: colors.onSurface,
                    }}
                  >
                    {subject.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      color: colors.onSurfaceVariant,
                      marginTop: 4,
                      fontFamily: FONTS.regular,
                    }}
                  >
                    {subject.present} / {subject.total}{" "}
                    {t("student.classesCount", "classes")}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.headline,
                      fontFamily: FONTS.bold,
                      color:
                        parseFloat(subject.percentage) >= 75
                          ? colors.success
                          : colors.error,
                    }}
                  >
                    {subject.percentage}%
                  </Text>
                  {parseFloat(subject.percentage) < 75 && (
                    <View
                      style={{
                        backgroundColor: colors.error + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.micro,
                          color: colors.error,
                          fontFamily: FONTS.bold,
                        }}
                      >
                        {t("student.lowStatus", "LOW")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Calendar */}
      <View
        style={{
          backgroundColor: colors.surfaceContainer,
          borderRadius: 16,
          padding: 16,
          marginTop: 24,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: FONT_SIZES.xl,
            fontFamily: FONTS.bold,
            color: colors.onSurface,
            marginBottom: 4,
          }}
        >
          {t("student.attendanceCalendar", "Attendance Calendar")}
        </Text>
        <ModernCalendar
          current={selectedMonth}
          markedDates={markedDates}
          onMonthChange={(month) => {
            if (month.dateString !== selectedMonth)
              setSelectedMonth(month.dateString);
          }}
          markingType={"custom"}
          theme={{ calendarBackground: "transparent" }}
        />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 16,
            justifyContent: "center",
          }}
        >
          {[
            { label: t("common.present", "Present"), color: colors.success },
            { label: t("common.absent", "Absent"), color: colors.error },
            { label: t("common.late", "Late"), color: "#FF9800" },
            { label: t("common.excused", "Excused"), color: "#2196F3" },
          ].map(({ label, color }) => (
            <View
              key={label}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: color + "40",
                }}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  color: colors.onSurfaceVariant,
                  fontFamily: FONTS.medium,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* {t('student.monthlySummary', 'Monthly Summary')} */}
      {visibleMonths.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: FONT_SIZES.xl,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              marginBottom: 12,
            }}
          >
            Monthly Summary
          </Text>
          {visibleMonths.map((month) => (
            <View
              key={month.month}
              style={{
                backgroundColor: colors.surfaceContainer,
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                elevation: 1,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: FONT_SIZES.mdLg,
                    fontFamily: FONTS.semiBold,
                    color: colors.onSurface,
                  }}
                >
                  {month.month}
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                    fontFamily: FONTS.regular,
                  }}
                >
                  {month.present} / {month.total} {t("common.days", "days")}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.xxl,
                  fontFamily: FONTS.bold,
                  color:
                    parseFloat(month.percentage) >= 75
                      ? colors.success
                      : colors.error,
                }}
              >
                {month.percentage}%
              </Text>
            </View>
          ))}
          {monthlyVisible < monthlyBreakdown.length && (
            <TouchableOpacity
              onPress={() => setMonthlyVisible((v) => v + MONTHLY_PAGE_SIZE)}
              style={{
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.primary + "50",
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.base,
                  fontFamily: FONTS.semiBold,
                  color: colors.primary,
                }}
              >
                {t("student.showMoreMonths", "Show More Months")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {allHistory.length > 0 && (
        <Text
          style={{
            fontSize: FONT_SIZES.xl,
            fontFamily: FONTS.bold,
            color: colors.onSurface,
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          {t("student.attendanceHistory", "Attendance History")}
        </Text>
      )}
    </View>
  );

  const renderRecord = ({ item }) => {
    const color = getStatusColor(item.status);
    return (
      <View
        style={{
          backgroundColor: colors.surfaceContainer,
          borderRadius: 12,
          padding: 14,
          marginBottom: 8,
          marginHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderLeftWidth: 4,
          borderLeftColor: color,
          elevation: 1,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: FONT_SIZES.base,
              fontFamily: FONTS.semiBold,
              color: colors.onSurface,
            }}
          >
            {new Date(item.date).toDateString()}
          </Text>
          {item.remarks ? (
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                color: colors.onSurfaceVariant,
                marginTop: 2,
                fontFamily: FONTS.regular,
              }}
            >
              {item.remarks}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            backgroundColor: color + "20",
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.bold,
              color,
              textTransform: "capitalize",
            }}
          >
            {t("common." + item.status, item.status)}
          </Text>
        </View>
      </View>
    );
  };

  const ListFooter = (
    <View style={{ paddingBottom: 24 }}>
      {loadingMore && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginVertical: 16 }}
        />
      )}
      {!hasMore && allHistory.length > 0 && (
        <Text
          style={{
            textAlign: "center",
            color: colors.onSurfaceVariant,
            fontSize: FONT_SIZES.md,
            fontFamily: FONTS.regular,
            marginVertical: 16,
          }}
        >
          {t("student.allRecordsLoaded", "All records loaded")}
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={allHistory}
        keyExtractor={(item, index) => item._id?.toString() || index.toString()}
        renderItem={renderRecord}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
