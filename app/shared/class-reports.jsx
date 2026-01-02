import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import PerformanceChart from '../../components/PerformanceChart';

/**
 * Class Reports Dashboard
 * Shared component for Admin and Teachers to view comprehensive class analytics
 */
export default function ClassReportsDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedExamType, setSelectedExamType] = useState(null); // null = all exams
    const [selectedClass, setSelectedClass] = useState(params.classId || null);

    // Fetch class analytics
    const { data: analyticsData, isLoading, refetch } = useApiQuery(
        ['classAnalytics', selectedClass, selectedExamType],
        `${apiConfig.baseUrl}/marks/analytics/class/${selectedClass}${selectedExamType ? `?examType=${selectedExamType}` : ''}`,
        { enabled: !!selectedClass }
    );

    // Fetch subject-wise analysis
    const { data: subjectData } = useApiQuery(
        ['subjectAnalysis', selectedClass],
        `${apiConfig.baseUrl}/marks/class/${selectedClass}/summary`,
        { enabled: !!selectedClass }
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Prepare chart data
    const trendChartData = useMemo(() => {
        if (!subjectData?.summary) return null;

        return {
            labels: subjectData.summary.map(s => s.examType),
            datasets: [{
                data: subjectData.summary.map(s => parseFloat(s.avgPercentage) || 0),
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                strokeWidth: 3
            }]
        };
    }, [subjectData]);

    const gradeDistributionData = useMemo(() => {
        if (!analyticsData?.gradeDistribution) return null;

        const dist = analyticsData.gradeDistribution;
        return Object.keys(dist).map((grade, index) => ({
            name: grade,
            value: dist[grade],
            color: getGradeColor(grade),
            legendFontColor: colors.onSurface
        }));
    }, [analyticsData, colors.onSurface]);

    const topPerformersData = useMemo(() => {
        if (!analyticsData?.studentRankings) return null;

        return {
            labels: analyticsData.studentRankings.slice(0, 5).map((s, i) => `#${i + 1}`),
            datasets: [{
                data: analyticsData.studentRankings.slice(0, 5).map(s => s.percentage)
            }]
        };
    }, [analyticsData]);

    const getGradeColor = (grade) => {
        const gradeColors = {
            'A+': '#4CAF50',
            'A': '#66BB6A',
            'B+': '#2196F3',
            'B': '#42A5F5',
            'C': '#FF9800',
            'D': '#FF5722',
            'F': '#F44336'
        };
        return gradeColors[grade] || colors.onSurfaceVariant;
    };

    const renderOverview = () => {
        if (!analyticsData) return null;

        const stats = analyticsData.statistics;

        return (
            <View>
                <Text style={{
                    fontSize: 18,
                    fontFamily: 'DMSans-Bold',
                    color: colors.onSurface,
                    marginBottom: 16
                }}>
                    Overview
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                    <StatCard
                        label="Students"
                        value={analyticsData.totalStudents}
                        icon="people"
                        color="#2196F3"
                        gradient
                        variant="compact"
                    />
                    <StatCard
                        label="Avg Score"
                        value={`${stats.average.toFixed(1)}%`}
                        icon="insights"
                        color="#4CAF50"
                        gradient
                        variant="compact"
                    />
                    <StatCard
                        label="Highest"
                        value={`${stats.highest.toFixed(1)}%`}
                        icon="arrow-upward"
                        color="#FF9800"
                        gradient
                        variant="compact"
                    />
                </View>
            </View>
        );
    };

    const renderGradeDistribution = () => {
        if (!gradeDistributionData || gradeDistributionData.length === 0) return null;

        return (
            <PerformanceChart
                type="pie"
                data={gradeDistributionData}
                title="Grade Distribution"
                height={240}
            />
        );
    };

    const renderPerformanceTrends = () => {
        if (!trendChartData) return null;

        return (
            <PerformanceChart
                type="line"
                data={trendChartData}
                title="Performance Trend Across Exams"
                height={220}
            />
        );
    };

    const renderTopPerformers = () => {
        if (!topPerformersData) return null;

        return (
            <PerformanceChart
                type="bar"
                data={topPerformersData}
                title="Top 5 Performers"
                height={220}
            />
        );
    };

    const renderStudentRankings = () => {
        if (!analyticsData?.studentRankings) return null;

        return (
            <View>
                <Text style={{
                    fontSize: 18,
                    fontFamily: 'DMSans-Bold',
                    color: colors.onSurface,
                    marginBottom: 16
                }}>
                    Student Rankings
                </Text>

                {analyticsData.studentRankings.slice(0, 10).map((student, index) => (
                    <View
                        key={student.studentId}
                        style={{
                            backgroundColor: index < 3
                                ? colors.primaryContainer
                                : colors.surfaceContainerLow,
                            borderRadius: 12,
                            padding: 14,
                            marginBottom: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderLeftWidth: 3,
                            borderLeftColor: index < 3 ? colors.primary : colors.outlineVariant
                        }}
                    >
                        <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: index < 3 ? colors.primary : colors.surfaceContainerHigh,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                        }}>
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'DMSans-Bold',
                                color: index < 3 ? '#FFFFFF' : colors.onSurface
                            }}>
                                {student.rank}
                            </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: 15,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurface
                            }}>
                                {student.studentName}
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                fontFamily: 'DMSans-Regular',
                                color: colors.onSurfaceVariant,
                                marginTop: 2
                            }}>
                                {student.examsAttempted}/{student.totalExams} exams
                            </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{
                                fontSize: 20,
                                fontFamily: 'DMSans-Bold',
                                color: colors.primary
                            }}>
                                {student.percentage.toFixed(1)}%
                            </Text>
                            <View style={{
                                backgroundColor: getGradeColor(student.grade) + '20',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                marginTop: 4
                            }}>
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'DMSans-Bold',
                                    color: getGradeColor(student.grade)
                                }}>
                                    {student.grade}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!selectedClass || !analyticsData) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <MaterialIcons name="insert-chart" size={64} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                <Text style={{
                    fontSize: 16,
                    fontFamily: 'DMSans-Medium',
                    color: colors.onSurfaceVariant,
                    marginTop: 16,
                    textAlign: 'center'
                }}>
                    {!selectedClass ? 'Select a class to view reports' : 'No data available'}
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Class Reports"
                        subtitle="Performance analytics and insights"
                        showBack
                    />

                    {/* Exam Type Filter */}
                    <View style={{ marginTop: 20, marginBottom: 20 }}>
                        <Text style={{
                            fontSize: 13,
                            fontFamily: 'DMSans-Medium',
                            color: colors.onSurfaceVariant,
                            marginBottom: 10
                        }}>
                            Filter by Exam Type
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Pressable
                                    onPress={() => setSelectedExamType(null)}
                                    style={({ pressed }) => ({
                                        backgroundColor: !selectedExamType
                                            ? colors.primary
                                            : (pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest),
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        borderRadius: 20
                                    })}
                                >
                                    <Text style={{
                                        fontSize: 13,
                                        fontFamily: 'DMSans-Bold',
                                        color: !selectedExamType ? '#FFFFFF' : colors.onSurface
                                    }}>
                                        All Exams
                                    </Text>
                                </Pressable>

                                {['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'].map(type => (
                                    <Pressable
                                        key={type}
                                        onPress={() => setSelectedExamType(type)}
                                        style={({ pressed }) => ({
                                            backgroundColor: selectedExamType === type
                                                ? colors.primary
                                                : (pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest),
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 20
                                        })}
                                    >
                                        <Text style={{
                                            fontSize: 13,
                                            fontFamily: 'DMSans-Bold',
                                            color: selectedExamType === type ? '#FFFFFF' : colors.onSurface
                                        }}>
                                            {type}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {renderOverview()}
                    {renderGradeDistribution()}
                    {renderPerformanceTrends()}
                    {renderTopPerformers()}
                    {renderStudentRankings()}
                </View>
            </ScrollView>

            {/* Export FAB */}
            <Pressable
                onPress={() => {
                    // TODO: Implement export functionality
                }}
                style={({ pressed }) => ({
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: pressed ? colors.secondary + 'DD' : colors.secondary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4
                })}
            >
                <MaterialIcons name="file-download" size={28} color="#FFFFFF" />
            </Pressable>
        </View>
    );
}
