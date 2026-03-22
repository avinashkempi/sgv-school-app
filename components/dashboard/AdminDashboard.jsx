import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import DateRangePicker from '../DateRangePicker';
import { LoadingState, ErrorState, EmptyState } from '../StateComponents';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useApiQuery } from '../../hooks/useApi';
import { useFocusEffect } from 'expo-router';

const AdminDashboard = () => {
    const router = useRouter();
    const { colors, styles } = useTheme();
    const [dateRange, setDateRange] = useState('thisMonth');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { data, isLoading: loading, error: queryError, refetch } = useApiQuery(
        ['adminDashboard', dateRange],
        `${apiConfig.baseUrl}/dashboard/admin?range=${dateRange}`,
        { 
            staleTime: 1000 * 60 * 5 // Cache for 5 minutes
        }
    );

    const error = queryError ? queryError.message : null;

    useFocusEffect(
        useCallback(() => {
            // Silently refetch in background when focused
            refetch();
        }, [refetch])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleDateRangeChange = (range) => {
        setDateRange(range);
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

    if (error && !data) {
        return <ErrorState message={error} onRetry={refetch} />;
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
                <Text style={styles.titleLarge}>Overview</Text>
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

            {/* Quick Actions */}
            <View style={{ marginBottom: 24 }}>
                <Text style={[styles.titleMedium, { marginBottom: 12 }]}>Quick Actions</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    <QuickActionButton
                        title="Import Data"
                        icon="cloud-upload"
                        color={colors.primary}
                        onPress={() => router.push('/admin/import-data')}
                    />
                    <QuickActionButton
                        title="Missing Tracker"
                        icon="event-busy"
                        color={colors.error}
                        onPress={() => router.push({ pathname: '/admin/attendance', params: { tab: 'tracker' } })}
                    />

                </ScrollView>
            </View>

            {/* Stat Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>

                <StatCard
                    title="Attendance"
                    value={`${data.overview?.attendancePercentage || 0}%`}
                    icon="calendar-check"
                    color={colors.tertiary}
                    trend="up"
                    trendValue={data.overview?.attendanceTrend || 0}
                    onPress={() => router.push('/admin/attendance')}
                    loading={refreshing}
                />
                <StatCard
                    title="Fees Collected"
                    value={`₹${(data.overview?.totalCollected || 0).toLocaleString()}`}
                    icon="currency-inr"
                    color={colors.success}
                    trendValue={data.overview?.feeCollectionTrend || 0}
                    trend="up"
                    onPress={() => router.push('/admin/fees')}
                    loading={refreshing}
                />
                <StatCard
                    title="School Timetable"
                    value="View"
                    icon="calendar-today"
                    color={colors.tertiary}
                    onPress={() => router.push('/admin/timetable')}
                    loading={refreshing}
                />
            </View>

            <Text style={[styles.titleLarge, { marginBottom: 16, marginTop: 24 }]}>Trends</Text>

            {
                data.charts?.feeTrend && data.charts.feeTrend.length > 0 ? (
                    <Pressable
                        onPress={() => router.push('/admin/fees')}
                        style={({ pressed }) => ({
                            backgroundColor: colors.surfaceContainer,
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                            opacity: pressed ? 0.85 : 1
                        })}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={styles.titleMedium}>Fee Collection (Academic Year)</Text>
                            <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, paddingTop: 20 }}>
                            {(() => {
                                const maxAmount = Math.max(...data.charts.feeTrend.map(d => d.amount), 1);
                                return data.charts.feeTrend.map((d, i) => {
                                    const barHeight = Math.max((d.amount / maxAmount) * 110, 4);
                                    const hasValue = d.amount > 0;
                                    return (
                                        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                            {hasValue && (
                                                <Text style={{
                                                    fontSize: 7,
                                                    fontFamily: 'DMSans-Bold',
                                                    color: colors.onSurfaceVariant,
                                                    marginBottom: 3
                                                }}>
                                                    {d.amount >= 100000
                                                        ? `${(d.amount / 100000).toFixed(1)}L`
                                                        : d.amount >= 1000
                                                            ? `${(d.amount / 1000).toFixed(0)}K`
                                                            : d.amount}
                                                </Text>
                                            )}
                                            <View style={{
                                                width: '60%',
                                                maxWidth: 22,
                                                height: barHeight,
                                                borderRadius: 5,
                                                backgroundColor: hasValue ? colors.primary : colors.outlineVariant,
                                                opacity: hasValue ? 1 : 0.3
                                            }} />
                                            <Text style={{
                                                fontSize: 9,
                                                fontFamily: 'DMSans-Medium',
                                                color: colors.onSurfaceVariant,
                                                marginTop: 5
                                            }}>
                                                {d.month.substring(0, 3)}
                                            </Text>
                                        </View>
                                    );
                                });
                            })()}
                        </View>
                    </Pressable>
                ) : (
                    <EmptyState
                        icon="bar-chart"
                        title="No Fee Data"
                        message="Fee collection data is not available for the selected period"
                    />
                )
            }

            {/* Detailed Attendance Summary */}
            {data.charts?.attendance ? (
                <View style={{
                    backgroundColor: colors.surfaceContainer,
                    borderRadius: 24,
                    padding: 20,
                    marginBottom: 16
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={styles.titleMedium}>Daily Attendance Summary</Text>
                        <MaterialIcons name="date-range" size={22} color={colors.primary} />
                    </View>

                    {/* Student Attendance Bar */}
                    <View style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontFamily: 'DMSans-Medium', color: colors.onSurface, fontSize: 14 }}>Students</Text>
                            <Text style={{ fontFamily: 'DMSans-Bold', color: colors.onSurface, fontSize: 14 }}>
                                {data.charts.attendance.student?.present || 0} / {data.charts.attendance.student?.total || 0}
                            </Text>
                        </View>
                        <View style={{ height: 12, backgroundColor: colors.outlineVariant, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
                            <View style={{
                                width: `${data.charts.attendance.student?.total > 0 ? ((data.charts.attendance.student.present / data.charts.attendance.student.total) * 100) : 0}%`,
                                backgroundColor: colors.primary,
                                height: '100%'
                            }} />
                        </View>
                    </View>

                    {/* Teacher Attendance Bar */}
                    <View style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontFamily: 'DMSans-Medium', color: colors.onSurface, fontSize: 14 }}>Teachers</Text>
                            <Text style={{ fontFamily: 'DMSans-Bold', color: colors.onSurface, fontSize: 14 }}>
                                {data.charts.attendance.teacher?.present || 0} / {data.charts.attendance.teacher?.total || 0}
                            </Text>
                        </View>
                        <View style={{ height: 12, backgroundColor: colors.outlineVariant, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
                            <View style={{
                                width: `${data.charts.attendance.teacher?.total > 0 ? ((data.charts.attendance.teacher.present / data.charts.attendance.teacher.total) * 100) : 0}%`,
                                backgroundColor: colors.tertiary,
                                height: '100%'
                            }} />
                        </View>
                    </View>

                    {/* Classes Marked Stat */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryContainer, padding: 12, borderRadius: 12 }}>
                        <MaterialIcons name="fact-check" size={24} color={colors.onPrimaryContainer} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={{ fontFamily: 'DMSans-Medium', color: colors.onPrimaryContainer, fontSize: 13 }}>Classes Marked Today</Text>
                            <Text style={{ fontFamily: 'DMSans-Bold', color: colors.onPrimaryContainer, fontSize: 16 }}>
                                {data.charts.attendance.classesMarked?.count || 0} out of {data.charts.attendance.classesMarked?.total || 0}
                            </Text>
                        </View>
                    </View>
                </View>
            ) : (
                <EmptyState icon="event" title="No Attendance Data" message="Attendance data is not available" />
            )}

            {/* Date Range Picker Modal */}
            <DateRangePicker
                visible={showDatePicker}
                selectedRange={dateRange}
                onRangeSelect={handleDateRangeChange}
                onClose={() => setShowDatePicker(false)}
            />
        </ScrollView >
    );
};

const QuickActionButton = ({ title, icon, color, onPress }) => {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
                opacity: pressed ? 0.7 : 1,
                minWidth: 140
            })}
        >
            <View style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: color + '15', // 15 hex = ~8% opacity
                marginRight: 12
            }}>
                <MaterialIcons name={icon} size={20} color={color} />
            </View>
            <Text style={{
                fontFamily: 'DMSans-Medium',
                color: colors.onSurface,
                fontSize: 14
            }}>
                {title}
            </Text>
        </Pressable>
    );
};

export default AdminDashboard;
