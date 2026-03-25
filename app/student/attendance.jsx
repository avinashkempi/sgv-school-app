import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import storage from "../../utils/storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import apiFetch from "../../utils/apiFetch";
import Header from "../../components/Header";
import ModernCalendar from "../../components/ModernCalendar";
import apiConfig from "../../config/apiConfig";

const PAGE_SIZE = 30;
const MONTHLY_PAGE_SIZE = 3;

export default function StudentAttendanceScreen() {
    const _router = useRouter();
    const { colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0]);

    // Pagination state
    const [page, setPage] = useState(1);
    const [allHistory, setAllHistory] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Monthly summary pagination
    const [monthlyVisible, setMonthlyVisible] = useState(MONTHLY_PAGE_SIZE);

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await storage.getItem("@auth_user");
            if (storedUser) setUser(JSON.parse(storedUser));
        };
        loadUser();
    }, []);

    const userId = user?.id || user?._id;

    // Fetch Attendance Summary (always full — not paginated)
    const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useApiQuery(
        ['studentAttendanceSummary', userId],
        `${apiConfig.baseUrl}/attendance/student/${userId}/summary`,
        { enabled: !!userId, staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 }
    );

    // Fetch history page 1 when userId becomes available
    const fetchHistoryPage = useCallback(async (targetPage, replace = false) => {
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
                setAllHistory(prev => [...prev, ...records]);
            }
            setHasMore(data?.pagination?.hasMore || false);
            setPage(targetPage);
        } catch (e) {
            console.error('fetchHistoryPage error:', e);
        } finally {
            if (targetPage === 1) setHistoryLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchHistoryPage(1, true);
        }
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
        await Promise.all([
            refetchSummary(),
            fetchHistoryPage(1, true)
        ]);
        setMonthlyVisible(MONTHLY_PAGE_SIZE);
        setRefreshing(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return colors.success;
            case 'absent': return colors.error;
            case 'late': return '#FF9800';
            case 'excused': return '#2196F3';
            default: return colors.textSecondary;
        }
    };

    // Calculated overall stats from summary
    const displayStats = useMemo(() => {
        if (summary?.overall?.total > 0) {
            return {
                present: summary.overall.present,
                total: summary.overall.total,
                percentage: summary.overall.percentage
            };
        }
        // Fallback: compute from loaded history
        const total = allHistory.length;
        const present = allHistory.filter(r => r.status === 'present').length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        return { present, total, percentage };
    }, [summary, allHistory]);

    const markedDates = useMemo(() => {
        const marks = {};
        allHistory.forEach(record => {
            const dateStr = new Date(record.date).toISOString().split('T')[0];
            const color = getStatusColor(record.status);
            marks[dateStr] = {
                customStyles: {
                    container: {
                        backgroundColor: color + '20',
                        borderWidth: 1,
                        borderColor: color,
                        borderRadius: 8,
                    },
                    text: { color, fontFamily: 'DMSans-Bold' }
                }
            };
        });
        return marks;
    }, [allHistory, colors]);

    const monthlyBreakdown = summary?.monthlyBreakdown || [];
    const visibleMonths = monthlyBreakdown.slice(0, monthlyVisible);

    const loading = loadingSummary || historyLoading;

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const ListHeader = (
        <View style={{ padding: 16, paddingTop: 24 }}>
            <Header title="My Attendance" subtitle="Track your attendance record" />

            {/* Overall Percentage */}
            <View style={{
                backgroundColor: colors.primary,
                borderRadius: 20,
                padding: 24,
                marginTop: 20,
                alignItems: "center",
                elevation: 4
            }}>
                <Text style={{ fontSize: 16, color: "#fff", opacity: 0.9, fontFamily: "DMSans-Medium" }}>
                    Overall Attendance
                </Text>
                <Text style={{ fontSize: 64, fontFamily: "DMSans-Bold", color: "#fff", marginTop: 8 }}>
                    {displayStats.percentage}%
                </Text>
                <View style={{ flexDirection: "row", gap: 24, marginTop: 16 }}>
                    <View style={{ alignItems: "center" }}>
                        <Text style={{ fontSize: 28, fontFamily: "DMSans-Bold", color: "#fff" }}>{displayStats.present}</Text>
                        <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>Present</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                        <Text style={{ fontSize: 28, fontFamily: "DMSans-Bold", color: "#fff" }}>{displayStats.total}</Text>
                        <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>Total Days</Text>
                    </View>
                </View>
            </View>

            {/* Subject-wise Breakdown */}
            {summary?.subjectWise && summary.subjectWise.length > 0 && (
                <View style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 12 }}>
                        Subject-wise Attendance
                    </Text>
                    {summary.subjectWise.map((subject) => (
                        <View
                            key={subject.subjectId}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 10,
                                elevation: 1
                            }}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                        {subject.name}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, fontFamily: "DMSans-Regular" }}>
                                        {subject.present} / {subject.total} classes
                                    </Text>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text style={{
                                        fontSize: 24,
                                        fontFamily: "DMSans-Bold",
                                        color: parseFloat(subject.percentage) >= 75 ? colors.success : colors.error
                                    }}>
                                        {subject.percentage}%
                                    </Text>
                                    {parseFloat(subject.percentage) < 75 && (
                                        <View style={{ backgroundColor: colors.error + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                            <Text style={{ fontSize: 10, color: colors.error, fontFamily: "DMSans-Bold" }}>LOW</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Calendar */}
            <View style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 16,
                padding: 16,
                marginTop: 24,
                elevation: 2
            }}>
                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
                    Attendance Calendar
                </Text>
                <ModernCalendar
                    current={selectedMonth}
                    markedDates={markedDates}
                    onMonthChange={(month) => {
                        if (month.dateString !== selectedMonth) setSelectedMonth(month.dateString);
                    }}
                    markingType={'custom'}
                    theme={{ calendarBackground: 'transparent' }}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16, justifyContent: "center" }}>
                    {[
                        { label: 'Present', color: colors.success },
                        { label: 'Absent', color: colors.error },
                        { label: 'Late', color: '#FF9800' },
                        { label: 'Excused', color: '#2196F3' },
                    ].map(({ label, color }) => (
                        <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: color + "40" }} />
                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>{label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Monthly Summary */}
            {visibleMonths.length > 0 && (
                <View style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 12 }}>
                        Monthly Summary
                    </Text>
                    {visibleMonths.map((month) => (
                        <View
                            key={month.month}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 8,
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                elevation: 1
                            }}
                        >
                            <View>
                                <Text style={{ fontSize: 15, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>{month.month}</Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                    {month.present} / {month.total} days
                                </Text>
                            </View>
                            <Text style={{
                                fontSize: 20,
                                fontFamily: "DMSans-Bold",
                                color: parseFloat(month.percentage) >= 75 ? colors.success : colors.error
                            }}>
                                {month.percentage}%
                            </Text>
                        </View>
                    ))}
                    {monthlyVisible < monthlyBreakdown.length && (
                        <TouchableOpacity
                            onPress={() => setMonthlyVisible(v => v + MONTHLY_PAGE_SIZE)}
                            style={{
                                alignItems: 'center',
                                paddingVertical: 10,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: colors.primary + '50',
                                marginTop: 4,
                            }}
                        >
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-SemiBold', color: colors.primary }}>
                                Show More Months
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {allHistory.length > 0 && (
                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 24, marginBottom: 12 }}>
                    Attendance History
                </Text>
            )}
        </View>
    );

    const renderRecord = ({ item }) => {
        const color = getStatusColor(item.status);
        return (
            <View style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                marginHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeftWidth: 4,
                borderLeftColor: color,
                elevation: 1,
            }}>
                <View>
                    <Text style={{ fontSize: 14, fontFamily: 'DMSans-SemiBold', color: colors.textPrimary }}>
                        {new Date(item.date).toDateString()}
                    </Text>
                    {item.remarks ? (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: 'DMSans-Regular' }}>
                            {item.remarks}
                        </Text>
                    ) : null}
                </View>
                <View style={{ backgroundColor: color + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color, textTransform: 'capitalize' }}>{item.status}</Text>
                </View>
            </View>
        );
    };

    const ListFooter = (
        <View style={{ paddingBottom: 100 }}>
            {loadingMore && <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />}
            {!hasMore && allHistory.length > 0 && (
                <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 13, fontFamily: 'DMSans-Regular', marginVertical: 16 }}>
                    All records loaded
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                onEndReached={hasMore ? loadMore : undefined}
                onEndReachedThreshold={0.3}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
