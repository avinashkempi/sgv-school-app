import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import DateRangePicker from '../DateRangePicker';
import { LoadingState, ErrorState, EmptyState } from '../StateComponents';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useFocusEffect } from 'expo-router';

const StudentDashboard = () => {
    const router = useRouter();
    const { colors, styles } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState('thisMonth');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const fetchStats = async (range = dateRange) => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/dashboard/student?range=${range}`);
            if (response.ok) {
                const json = await response.json();
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch student stats", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [dateRange])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const handleDateRangeChange = (range) => {
        setDateRange(range);
        setLoading(true);
        fetchStats(range);
    };

    const getDateRangeLabel = () => {
        const labels = {
            today: 'Today',
            thisWeek: 'This Week',
            thisMonth: 'This Month',
            last30Days: 'Last 30 Days',
            thisYear: 'This Year',
            lastYear: 'Last Year',
            allTime: 'All Time'
        };
        return labels[dateRange] || 'This Month';
    };

    if (loading && !data) {
        return <LoadingState message="Loading dashboard..." />;
    }

    if (!data) {
        return <EmptyState icon="dashboard" title="No Data" message="Dashboard data is not available" />;
    }

    return (
        <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Date Range Selector */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
                <Text style={styles.titleLarge}>My Progress</Text>
                <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: colors.primaryContainer,
                        opacity: pressed ? 0.8 : 1
                    })}
                >
                    <MaterialIcons name="calendar-today" size={16} color={colors.onPrimaryContainer} />
                    <Text style={{
                        fontSize: 13,
                        fontFamily: 'DMSans-Bold',
                        color: colors.onPrimaryContainer,
                        marginLeft: 6
                    }}>
                        {getDateRangeLabel()}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={18} color={colors.onPrimaryContainer} />
                </Pressable>
            </View>

            {/* Stat Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                <StatCard
                    title="Attendance"
                    value={`${data.overview?.attendancePercentage || 0}%`}
                    icon="calendar-check"
                    color={colors.primary}
                    trend="up"
                    trendValue={data.overview?.attendanceTrend || 0}
                    onPress={() => router.push('/student/attendance')}
                    loading={refreshing}
                />
                <StatCard
                    title="Fees Due"
                    value={`₹${(data.overview?.dueAmount || 0).toLocaleString()}`}
                    icon="currency-inr"
                    color={data.overview?.dueAmount > 0 ? colors.error : colors.success}
                    onPress={() => router.push('/student/fees')}
                    loading={refreshing}
                />
                <StatCard
                    title="Next Exam"
                    value={data.overview?.nextExamDate || "N/A"}
                    icon="calendar-clock"
                    color={colors.tertiary}
                    onPress={() => router.push('/student/exam-schedule')}
                    loading={refreshing}
                />
            </View>

            <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 24 }]}>Performance</Text>

            {data.charts?.performanceTrend && data.charts.performanceTrend.length > 0 ? (
                <ChartCard
                    title="Performance Trend (Academic Year)"
                    chartType="line"
                    labels={data.charts.performanceTrend.map(d => d.subject?.substring(0, 3) || 'Sub')}
                    data={data.charts.performanceTrend.map(d => d.marks)}
                />
            ) : (
                <EmptyState
                    icon="show-chart"
                    title="No Performance Data"
                    message="Your performance data will appear here once exams are graded"
                />
            )}

            {/* Date Range Picker Modal */}
            <DateRangePicker
                visible={showDatePicker}
                selectedRange={dateRange}
                onRangeSelect={handleDateRangeChange}
                onClose={() => setShowDatePicker(false)}
            />
        </ScrollView>
    );
};

export default StudentDashboard;
