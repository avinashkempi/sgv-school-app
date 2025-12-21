import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../theme';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useFocusEffect } from 'expo-router';

const AdminDashboard = () => {
    const { colors, styles } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        try {
            setError(null);
            const response = await apiFetch(`${apiConfig.baseUrl}/dashboard/admin`);
            if (response.ok) {
                const json = await response.json();
                setData(json);
            } else {
                const errJson = await response.json().catch(() => ({}));
                setError(errJson.message || `Error ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to fetch admin stats", error);
            setError(error.message || "An unexpected error occurred");
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
        return (
            <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={styles.bodyMedium}>Loading dashboard...</Text>
            </View>
        );
    }

    if (error && !data) {
        return (
            <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={[styles.bodyMedium, { color: colors.error, marginBottom: 16 }]}>{error}</Text>
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                <Text style={styles.bodySmall}>Pull down to retry</Text>
            </View>
        );
    }

    if (!data) return null;

    return (
        <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
            <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 8 }]}>Overview</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                <StatCard
                    title="Total Students"
                    value={data.overview?.totalStudents || 0}
                    icon="account-group"
                    color={colors.primary}
                />
                <StatCard
                    title="Total Teachers"
                    value={data.overview?.totalTeachers || 0}
                    icon="human-lecture"
                    color={colors.secondary}
                />
                <StatCard
                    title="Attendance"
                    value={`${data.overview?.attendancePercentage || 0}%`}
                    icon="calendar-check"
                    color={colors.tertiary}
                    trend="up"
                    trendValue={2.5} // Mock trend for now
                />
                <StatCard
                    title="Fees Collected"
                    value={`₹${(data.overview?.totalCollected || 0).toLocaleString()}`}
                    icon="currency-inr"
                    color={colors.success}
                />
            </View>

            <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 24 }]}>Trends</Text>

            {data.charts?.feeTrend && (
                <ChartCard
                    title="Fee Collection (Academic Year)"
                    chartType="line"
                    labels={data.charts.feeTrend.map(d => `${d.month}`)} // Simplified month label
                    data={data.charts.feeTrend.map(d => d.amount)}
                />
            )}

            {data.charts?.attendance && (
                <ChartCard
                    title="Today's Attendance"
                    chartType="pie"
                    data={[
                        { name: 'Present', value: data.charts.attendance.present || 0 },
                        { name: 'Absent', value: data.charts.attendance.absent || 0 }
                    ]}
                    height={200}
                />
            )}

        </ScrollView>
    );
};

export default AdminDashboard;
