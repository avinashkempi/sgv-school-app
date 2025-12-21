import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../theme';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useFocusEffect } from 'expo-router';

const StudentDashboard = () => {
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

    if (!data) return null;

    return (
        <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                <StatCard
                    title="Attendance"
                    value={`${data.overview?.attendancePercentage || 0}%`}
                    icon="calendar-check"
                    color={colors.primary}
                    trend="up"
                    trendValue={0} // To be implemented
                />
                <StatCard
                    title="Fees Due"
                    value={`₹${(data.overview?.dueAmount || 0).toLocaleString()}`}
                    icon="currency-inr"
                    color={data.overview?.dueAmount > 0 ? colors.error : colors.success}
                />
                <StatCard
                    title="Next Exam"
                    value={data.overview?.nextExamDate || "N/A"}
                    icon="calendar-clock"
                    color={colors.tertiary}
                />
            </View>

            {data.charts?.performanceTrend && (
                <ChartCard
                    title="Performance Trend (Academic Year)"
                    chartType="line"
                    labels={data.charts.performanceTrend.map(d => d.subject.substring(0, 3) || 'Sub')}
                    data={data.charts.performanceTrend.map(d => d.marks)}
                />
            )}
        </ScrollView>
    );
};

export default StudentDashboard;
