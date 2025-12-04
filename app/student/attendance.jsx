import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from "react-native";
import { } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import Header from "../../components/Header";
import ModernCalendar from "../../components/ModernCalendar";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";

const { width } = Dimensions.get('window');
const _cellSize = (width - 80) / 7; // 7 days in a week, accounting for padding

export default function StudentAttendanceScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { _showToast } = useToast();

    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem("@auth_user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        };
        loadUser();
    }, []);

    const userId = user?.id || user?._id;

    // Fetch Attendance Summary
    const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useApiQuery(
        ['studentAttendanceSummary', userId],
        `${apiConfig.baseUrl}/attendance/student/${userId}/summary`,
        { enabled: !!userId }
    );

    // Fetch Attendance History
    const { data: historyData, isLoading: loadingHistory, refetch: refetchHistory } = useApiQuery(
        ['studentAttendanceHistory', userId],
        `${apiConfig.baseUrl}/attendance/student/${userId}`,
        { enabled: !!userId }
    );

    const attendanceHistory = historyData?.attendance || [];

    // Calculate attendance stats from history as fallback
    const calculatedStats = useMemo(() => {
        if (!attendanceHistory || attendanceHistory.length === 0) return { present: 0, total: 0, percentage: 0 };

        const total = attendanceHistory.length;
        const present = attendanceHistory.filter(r => r.status === 'present').length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

        return { present, total, percentage };
    }, [attendanceHistory]);

    // Use summary if available and non-zero, otherwise use calculated stats
    const displayStats = useMemo(() => {
        if (summary?.overall?.total > 0) {
            return {
                present: summary.overall.present,
                total: summary.overall.total,
                percentage: summary.overall.percentage
            };
        }
        return calculatedStats;
    }, [summary, calculatedStats]);

    const loading = loadingSummary || loadingHistory;

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchSummary(), refetchHistory()]);
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

    const markedDates = useMemo(() => {
        const marks = {};
        attendanceHistory.forEach(record => {
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
                    text: {
                        color: color,
                        fontFamily: 'DMSans-Bold',
                    }
                }
            };
        });
        return marks;
    }, [attendanceHistory, colors]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="My Attendance"
                        subtitle="Track your attendance record"
                    />

                    {/* Overall Percentage - Big Display */}
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
                                <Text style={{ fontSize: 28, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    {displayStats.present}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                    Present
                                </Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 28, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    {displayStats.total}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                    Total Days
                                </Text>
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
                                                    <Text style={{ fontSize: 10, color: colors.error, fontFamily: "DMSans-Bold" }}>
                                                        LOW
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Calendar View */}
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
                            onMonthChange={(month) => setSelectedMonth(month.dateString)}
                            markingType={'custom'}
                            theme={{
                                calendarBackground: 'transparent',
                            }}
                        />

                        {/* Legend */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16, justifyContent: "center" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: colors.success + "40" }} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Present</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: colors.error + "40" }} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Absent</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#FF9800" + "40" }} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Late</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#2196F3" + "40" }} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Excused</Text>
                            </View>
                        </View>
                    </View>

                    {/* Monthly Summary */}
                    {summary?.monthlyBreakdown && summary.monthlyBreakdown.length > 0 && (
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 12 }}>
                                Monthly Summary
                            </Text>
                            {summary.monthlyBreakdown.slice(0, 6).map((month) => (
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
                                        <Text style={{ fontSize: 15, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                            {month.month}
                                        </Text>
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
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
