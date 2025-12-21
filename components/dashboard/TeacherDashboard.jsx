import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../theme';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useFocusEffect } from 'expo-router';

const TeacherDashboard = () => {
    const { colors, styles } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/dashboard/teacher`);
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
                    title="My Classes"
                    value={data.overview?.classesToday || 0}
                    icon="human-male-board"
                    color={colors.primary}
                />
                <StatCard
                    title="Pending Homework"
                    value={data.overview?.pendingHomework || 0}
                    icon="book-open-variant"
                    color={colors.secondary}
                />
                <StatCard
                    title="Low Attendance"
                    value={data.overview?.lowAttendanceCount || 0}
                    icon="account-alert"
                    color={colors.error}
                />
            </View>

            {data.charts?.performance && (
                <ChartCard
                    title="Class Performance (Avg Marks)"
                    chartType="bar"
                    labels={data.charts.performance.labels}
                    data={data.charts.performance.data}
                />
            )}

            {data.charts?.attendanceWait && (
                <ChartCard
                    title="Attendance Trend (Academic Year)"
                    chartType="line"
                    labels={["W1", "W2", "W3", "W4"]}
                    data={data.charts.attendanceWait}
                    secondary
                />
            )}
        </ScrollView>
    );
};

export default TeacherDashboard;
