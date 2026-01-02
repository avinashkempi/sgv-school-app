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

const TeacherDashboard = () => {
    const router = useRouter();
    const { colors, styles } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState('thisWeek');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const fetchStats = async (range = dateRange) => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/dashboard/teacher?range=${range}`);
            if (response.ok) {
                const json = await response.json();
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch teacher stats", error);
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
        return labels[dateRange] || 'This Week';
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
                <Text style={styles.titleLarge}>My Dashboard</Text>
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
                    title="My Classes"
                    value={data.overview?.classesToday || 0}
                    icon="human-male-board"
                    color={colors.primary}
                    onPress={() => router.push('/teacher/classes')}
                    loading={refreshing}
                />
                <StatCard
                    title="Pending Homework"
                    value={data.overview?.pendingHomework || 0}
                    icon="book-open-variant"
                    color={colors.secondary}
                    loading={refreshing}
                />
                <StatCard
                    title="Low Attendance"
                    value={data.overview?.lowAttendanceCount || 0}
                    icon="account-alert"
                    color={colors.error}
                    onPress={() => router.push('/teacher/attendance')}
                    loading={refreshing}
                />
            </View>

            <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 24 }]}>Insights</Text>

            {data.charts?.performance && data.charts.performance.data?.length > 0 ? (
                <ChartCard
                    title="Class Performance (Avg Marks)"
                    chartType="bar"
                    labels={data.charts.performance.labels}
                    data={data.charts.performance.data}
                />
            ) : (
                <EmptyState
                    icon="bar-chart"
                    title="No Performance Data"
                    message="Student performance data is not available yet"
                />
            )}

            {data.charts?.attendanceWait && data.charts.attendanceWait.length > 0 ? (
                <ChartCard
                    title="Attendance Trend (Academic Year)"
                    chartType="line"
                    labels={["W1", "W2", "W3", "W4"]}
                    data={data.charts.attendanceWait}
                    secondary
                />
            ) : (
                <EmptyState
                    icon="show-chart"
                    title="No Attendance Trend"
                    message="Attendance trend data is not available yet"
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

export default TeacherDashboard;
