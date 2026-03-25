import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Dimensions
} from "react-native";
import { useTheme } from "../theme";
import Header from "./Header";
import ModernCalendar from "./ModernCalendar";

const { width } = Dimensions.get('window');
const _cellSize = (width - 80) / 7;

const MONTHLY_PAGE_SIZE = 3;

export default function AttendanceView({
    attendanceHistory,
    summary,
    loading,
    onRefresh,
    refreshing,
    onLoadMore,
    loadingMore = false,
    hasMore = false,
    title = "My Attendance",
    subtitle = "Track your attendance record"
}) {
    const { colors } = useTheme();
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0]);
    const [monthlyVisible, setMonthlyVisible] = useState(MONTHLY_PAGE_SIZE);

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

    const monthlyBreakdown = summary?.monthlyBreakdown || [];
    const visibleMonths = monthlyBreakdown.slice(0, monthlyVisible);
    const canShowMoreMonths = monthlyVisible < monthlyBreakdown.length;

    const ListHeader = (
        <View style={{ padding: 16, paddingTop: 24 }}>
            <Header title={title} subtitle={subtitle} />

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
                    {summary?.percentage || 0}%
                </Text>
                <View style={{ flexDirection: "row", gap: 24, marginTop: 16 }}>
                    <View style={{ alignItems: "center" }}>
                        <Text style={{ fontSize: 28, fontFamily: "DMSans-Bold", color: "#fff" }}>
                            {summary?.present || 0}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                            Present
                        </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                        <Text style={{ fontSize: 28, fontFamily: "DMSans-Bold", color: "#fff" }}>
                            {summary?.total || 0}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                            Total Days
                        </Text>
                    </View>
                </View>
            </View>

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
                    theme={{ calendarBackground: 'transparent' }}
                />
                {/* Legend */}
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
                    {canShowMoreMonths && (
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

            {/* Attendance History Header */}
            {attendanceHistory.length > 0 && (
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
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color, textTransform: 'capitalize' }}>
                        {item.status}
                    </Text>
                </View>
            </View>
        );
    };

    const ListFooter = (
        <View style={{ paddingBottom: 100 }}>
            {loadingMore && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
            )}
            {!hasMore && attendanceHistory.length > 0 && (
                <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 13, fontFamily: 'DMSans-Regular', marginVertical: 16 }}>
                    All records loaded
                </Text>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={attendanceHistory}
                keyExtractor={(item, index) => item._id?.toString() || index.toString()}
                renderItem={renderRecord}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooter}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                onEndReached={hasMore && onLoadMore ? onLoadMore : undefined}
                onEndReachedThreshold={0.3}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
