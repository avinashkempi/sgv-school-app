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
import { formatClassName } from '../../utils/formatClassName';

const TeacherDashboard = () => {
    const router = useRouter();
    const { colors, styles } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState('thisWeek');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [missingDays, setMissingDays] = useState([]);
    const [missingClassId, setMissingClassId] = useState(null);
    const [missingClassName, setMissingClassName] = useState(null);

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

    const fetchMissingAttendance = async () => {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 14); // Check last 14 days

            const response = await apiFetch(`${apiConfig.baseUrl}/attendance/missing-tracker?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
            if (response.ok) {
                const json = await response.json();
                if (json.success && json.missingDays) {
                    setMissingDays(json.missingDays);
                    setMissingClassId(json.classId || null);
                    setMissingClassName(json.className || null);
                }
            }
        } catch (err) {
            console.error("Failed to fetch missing attendance", err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStats();
            fetchMissingAttendance();
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
                <View>
                    <Text style={styles.titleLarge}>My Dashboard</Text>
                    {data.overview?.className && (
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.textSecondary, marginTop: 2 }}>
                            Class Teacher — {formatClassName(data.overview.className)}
                        </Text>
                    )}
                </View>
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

            {/* Missing Attendance Alert */}
            {missingDays.length > 0 && (
                <View style={{
                    backgroundColor: colors.error + '10',
                    borderWidth: 1,
                    borderColor: colors.error + '40',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <MaterialIcons name="warning" size={22} color={colors.error} style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'DMSans-Bold', color: colors.error, fontSize: 15 }}>Missing Attendance!</Text>
                            <Text style={{ fontFamily: 'DMSans-Medium', color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                {missingClassName ? `${missingClassName} — ` : ''}{missingDays.length} day{missingDays.length > 1 ? 's' : ''} not marked
                            </Text>
                        </View>
                    </View>

                    {/* Missed dates list */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {missingDays.slice(0, 7).map((day) => {
                            const d = new Date(day + 'T00:00:00');
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                            let label;
                            if (d.getTime() === today.getTime()) label = 'Today';
                            else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
                            else label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                            return (
                                <Pressable
                                    key={day}
                                    onPress={() => missingClassId && router.push({ pathname: '/teacher/class/attendance', params: { classId: missingClassId, date: day } })}
                                    style={({ pressed }) => ({
                                        backgroundColor: colors.error + '18',
                                        borderWidth: 1,
                                        borderColor: colors.error + '30',
                                        borderRadius: 8,
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                        opacity: pressed ? 0.7 : 1
                                    })}
                                >
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: colors.error }}>{label}</Text>
                                </Pressable>
                            );
                        })}
                        {missingDays.length > 7 && (
                            <View style={{ backgroundColor: colors.error + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: colors.error }}>+{missingDays.length - 7} more</Text>
                            </View>
                        )}
                    </View>

                    {/* Mark Now button */}
                    <Pressable
                        onPress={() => missingClassId && router.push({ pathname: '/teacher/class/attendance', params: { classId: missingClassId } })}
                        style={({ pressed }) => ({
                            backgroundColor: colors.error,
                            borderRadius: 10,
                            paddingVertical: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            opacity: pressed ? 0.8 : 1
                        })}
                    >
                        <MaterialIcons name="edit" size={18} color="#fff" />
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: '#fff' }}>Mark Attendance Now</Text>
                    </Pressable>
                </View>
            )}

            {/* Class Attendance Today Card */}
            {data.classAttendance ? (
                <View style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    elevation: 2
                }}>
                    <Text style={{ fontSize: 17, fontFamily: 'DMSans-Bold', color: colors.textPrimary, marginBottom: 16 }}>
                        Class Attendance Today
                    </Text>
                    {data.classAttendance.marked === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                            <MaterialIcons name="event-busy" size={32} color={colors.textSecondary} />
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.textSecondary, marginTop: 8 }}>
                                Attendance not marked yet today
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Progress Bar */}
                            <View style={{ height: 8, backgroundColor: colors.error + '30', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
                                <View style={{
                                    height: '100%',
                                    backgroundColor: colors.success,
                                    borderRadius: 4,
                                    width: `${data.classAttendance.total > 0 ? ((data.classAttendance.present / data.classAttendance.total) * 100) : 0}%`
                                }} />
                            </View>
                            {/* Stats Row */}
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1, backgroundColor: colors.success + '15', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 22, fontFamily: 'DMSans-Bold', color: colors.success }}>{data.classAttendance.present}</Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.success }}>Present</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: colors.error + '15', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 22, fontFamily: 'DMSans-Bold', color: colors.error }}>{data.classAttendance.absent}</Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.error }}>Absent</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: '#FF9800' + '15', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 22, fontFamily: 'DMSans-Bold', color: '#FF9800' }}>{data.classAttendance.late}</Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: '#FF9800' }}>Late</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: colors.primary + '15', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 22, fontFamily: 'DMSans-Bold', color: colors.primary }}>{data.classAttendance.total}</Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.primary }}>Total</Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            ) : !data.overview?.className && (
                <View style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    elevation: 2,
                    alignItems: 'center'
                }}>
                    <MaterialIcons name="info-outline" size={32} color={colors.textSecondary} />
                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Medium', color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                        You are not assigned as a class teacher.{'\n'}Class attendance summary is not available.
                    </Text>
                </View>
            )}

            {/* Stat Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                <StatCard
                    title="Classes Today"
                    value={data.overview?.classesToday || 0}
                    icon="human-male-board"
                    color={colors.primary}
                    onPress={() => router.push('/teacher/timetable')}
                    loading={refreshing}
                />
                <StatCard
                    title="My Students"
                    value={data.overview?.myStudents || 0}
                    icon="account-group"
                    color={colors.tertiary}
                    onPress={() => router.push('/teacher/classes')}
                    loading={refreshing}
                />
                <StatCard
                    title="Low Attendance"
                    value={data.overview?.lowAttendanceCount || 0}
                    icon="account-alert"
                    color={colors.error}
                    onPress={() => missingClassId ? router.push({ pathname: '/teacher/class/attendance', params: { classId: missingClassId } }) : router.push('/teacher/classes')}
                    loading={refreshing}
                />
                <StatCard
                    title="Total Classes"
                    value={data.overview?.totalClassesTaught || 0}
                    icon="school"
                    color={colors.secondary || colors.primary}
                    onPress={() => router.push('/teacher/classes')}
                    loading={refreshing}
                />
            </View>

            <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 24 }]}>Insights</Text>

            {data.charts?.attendanceTrend && data.charts.attendanceTrend.data?.length > 0 ? (
                <ChartCard
                    title="Attendance Trend (Last 7 Days)"
                    chartType="line"
                    labels={data.charts.attendanceTrend.labels}
                    data={data.charts.attendanceTrend.data}
                    secondary
                />
            ) : (
                <EmptyState
                    icon="show-chart"
                    title="No Attendance Trend"
                    message="Attendance trend data is not available yet"
                />
            )}

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
