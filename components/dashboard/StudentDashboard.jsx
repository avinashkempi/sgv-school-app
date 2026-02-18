import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import { LoadingState, EmptyState } from '../StateComponents';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useFocusEffect } from 'expo-router';

const StudentDashboard = () => {
    const router = useRouter();
    const { colors, styles } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/dashboard/student`);
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
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
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
            <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 8 }]}>My Progress</Text>

            {/* Stat Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                <StatCard
                    title="Attendance"
                    subtitle="Academic Year"
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
                    subtitle={data.overview?.nextExamName || undefined}
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
        </ScrollView>
    );
};

export default StudentDashboard;
