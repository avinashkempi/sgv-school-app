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
import * as Haptics from 'expo-haptics';
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
    // eslint-disable-next-line no-unused-vars
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedExamType, setSelectedExamType] = useState(null); // null = all exams
    // eslint-disable-next-line no-unused-vars
    const [selectedClass, setSelectedClass] = useState(params.classId || null);

    // Fetch class analytics with keepPreviousData
    const { data: analyticsData, isLoading, isFetching, refetch } = useApiQuery(
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

    const handleSelectExamType = (type) => {
        Haptics.selectionAsync();
        setSelectedExamType(type);
    };

    // Grade color mapping helper
    const getGradeColor = (grade) => {
        const gradeColors = {
            'A+': '#4CAF50',
            'A': '#2196F3',
            'B+': '#FF9800',
            'B': '#FF5722',
            'C': '#F44336'
        };
        return gradeColors[grade] || colors.onSurfaceVariant;
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
        const total = Object.values(dist).reduce((sum, count) => sum + count, 0);
        
        // If no grades yet, return null to not render the chart
        if (total === 0) return null;

        // eslint-disable-next-line no-unused-vars
        return Object.keys(dist).map((grade, index) => ({
            name: grade,
            value: dist[grade],
            color: getGradeColor(grade),
            legendFontColor: colors.onSurface
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const [expandedStudentId, setExpandedStudentId] = useState(null);

    const renderOverview = () => {
        if (!analyticsData) return null;

        const stats = analyticsData?.statistics;

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
                        value={analyticsData?.totalStudents ?? 0}
                        icon="people"
                        color="#2196F3"
                        gradient
                        variant="compact"
                    />
                    <StatCard
                        label="Avg Score"
                        value={stats?.average != null ? `${stats.average.toFixed(1)}%` : 'N/A'}
                        icon="insights"
                        color="#4CAF50"
                        gradient
                        variant="compact"
                    />
                    <StatCard
                        label="Total Marks"
                        value={`${analyticsData?.totalMarksObtained || 0}/${analyticsData?.totalMarksEvaluated || 0}`}
                        icon="assignment"
                        color="#9C27B0"
                        gradient
                        variant="compact"
                    />
                    <StatCard
                        label="Highest"
                        value={stats?.highest != null ? `${stats.highest.toFixed(1)}%` : 'N/A'}
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
        if (!gradeDistributionData) return null;

        return (
            <View style={{ marginBottom: 20 }}>
                <PerformanceChart
                    type="pie"
                    data={gradeDistributionData}
                    title="Grade Distribution"
                    subtitle="Distribution across performance bands"
                />
            </View>
        );
    };

    const renderPerformanceTrends = () => {
        if (!trendChartData || trendChartData.labels.length === 0) return null;

        return (
            <View style={{ marginBottom: 20 }}>
                <PerformanceChart
                    type="line"
                    data={trendChartData}
                    title="Performance Trends"
                    subtitle="Exam-wise average progression"
                    yAxisSuffix="%"
                />
            </View>
        );
    };

    const renderTopPerformers = () => {
        if (!topPerformersData || topPerformersData.labels.length === 0) return null;

        return (
            <View style={{ marginBottom: 20 }}>
                <PerformanceChart
                    type="bar"
                    data={topPerformersData}
                    title="Top Performers"
                    subtitle="Top 5 students in the class"
                    yAxisSuffix="%"
                />
            </View>
        );
    };

    const renderStudentRankings = () => {
        const rankings = analyticsData?.studentRankings || [];
        if (rankings.length === 0) return null;

        return (
            <View style={{ marginBottom: 20 }}>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                }}>
                    <Text style={{
                        fontSize: 18,
                        fontFamily: 'DMSans-Bold',
                        color: colors.onSurface
                    }}>
                        Student Rankings
                    </Text>
                    <Text style={{
                        fontSize: 13,
                        fontFamily: 'DMSans-Medium',
                        color: colors.onSurfaceVariant
                    }}>
                        {rankings.length} Students
                    </Text>
                </View>

                {rankings.map((student) => {
                    const isTop3 = student.rank <= 3;
                    const rankColors = {
                        1: '#FFD700',
                        2: '#C0C0C0',
                        3: '#CD7F32'
                    };

                    const isExpanded = expandedStudentId === (student.studentId || student._id);
                    const subjectScores = student.subjectScores || [];

                    return (
                        <Pressable
                            key={student.studentId || student._id}
                            onPress={() => setExpandedStudentId(isExpanded ? null : (student.studentId || student._id))}
                            style={({ pressed }) => ({
                                backgroundColor: colors.surfaceContainerLow,
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 10,
                                opacity: pressed ? 0.95 : 1,
                                borderWidth: 1,
                                borderColor: isExpanded ? colors.primary + '60' : colors.outlineVariant + '40',
                                elevation: isExpanded ? 2 : 0
                            })}
                        >
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                {/* Rank & Info */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: isTop3 ? rankColors[student.rank] + '20' : colors.surfaceContainerHighest,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: isTop3 ? 2 : 0,
                                        borderColor: rankColors[student.rank]
                                    }}>
                                        {isTop3 ? (
                                            <MaterialIcons
                                                name="emoji-events"
                                                size={18}
                                                color={rankColors[student.rank]}
                                            />
                                        ) : (
                                            <Text style={{
                                                fontSize: 14,
                                                fontFamily: 'DMSans-Bold',
                                                color: colors.onSurface
                                            }}>
                                                {student.rank}
                                            </Text>
                                        )}
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
                                            fontFamily: 'DMSans-Medium',
                                            color: colors.primary,
                                            marginTop: 2
                                        }}>
                                            Scored: {student.totalObtained} / {student.totalMax} Marks ({student.percentage}%)
                                        </Text>
                                    </View>
                                </View>

                                {/* Grade & Percentage */}
                                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                                    <View style={{
                                        backgroundColor: getGradeColor(student.grade) + '20',
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        marginBottom: 4
                                    }}>
                                        <Text style={{
                                            fontSize: 12,
                                            fontFamily: 'DMSans-Bold',
                                            color: getGradeColor(student.grade)
                                        }}>
                                            {student.grade}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <Text style={{
                                            fontSize: 11,
                                            fontFamily: 'DMSans-Medium',
                                            color: colors.onSurfaceVariant
                                        }}>
                                            {subjectScores.length} subjects
                                        </Text>
                                        <MaterialIcons
                                            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                            size={16}
                                            color={colors.onSurfaceVariant}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Expandable Subject-wise Score Chips */}
                            {isExpanded && subjectScores.length > 0 && (
                                <View style={{
                                    marginTop: 12,
                                    paddingTop: 12,
                                    borderTopWidth: 1,
                                    borderTopColor: colors.outlineVariant + '30'
                                }}>
                                    <Text style={{
                                        fontSize: 11,
                                        fontFamily: 'DMSans-Bold',
                                        color: colors.onSurfaceVariant,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        marginBottom: 8
                                    }}>
                                        Subject Breakdown
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                        {subjectScores.map((subj, sIdx) => (
                                            <View
                                                key={subj.examId || sIdx}
                                                style={{
                                                    backgroundColor: colors.surfaceContainerHighest,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 5,
                                                    borderRadius: 8,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontFamily: 'DMSans-Bold',
                                                    color: colors.onSurface
                                                }}>
                                                    {subj.subjectName}:
                                                </Text>
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontFamily: 'DMSans-Bold',
                                                    color: getGradeColor(subj.grade)
                                                }}>
                                                    {subj.marksObtained}/{subj.totalMarks}
                                                </Text>
                                                <Text style={{
                                                    fontSize: 10,
                                                    fontFamily: 'DMSans-Medium',
                                                    color: colors.onSurfaceVariant
                                                }}>
                                                    ({subj.percentage}%)
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </View>
        );
    };

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
                contentContainerStyle={{ paddingBottom: 24 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Class Reports"
                        subtitle="Performance analytics and insights"
                        showBack
                    />

                    {/* Exam Type Filter */}
                    <View style={{ marginTop: 20, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{
                                fontSize: 13,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurfaceVariant
                            }}>
                                Filter by Exam Type
                            </Text>
                            {isFetching && !isLoading && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.primary }}>
                                        Updating...
                                    </Text>
                                </View>
                            )}
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Pressable
                                    onPress={() => handleSelectExamType(null)}
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
                                        onPress={() => handleSelectExamType(type)}
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

                    {/* Content area: initial loading, empty, or loaded data */}
                    {isLoading && !analyticsData ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurfaceVariant,
                                marginTop: 12
                            }}>
                                Loading class analytics...
                            </Text>
                        </View>
                    ) : !selectedClass || !analyticsData ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialIcons name="insert-chart" size={56} color={colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
                            <Text style={{
                                fontSize: 15,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurfaceVariant,
                                marginTop: 12,
                                textAlign: 'center'
                            }}>
                                {!selectedClass ? 'Select a class to view reports' : 'No data available'}
                            </Text>
                        </View>
                    ) : (
                        <View style={{ opacity: isFetching && !isLoading ? 0.85 : 1 }}>
                            {renderOverview()}
                            {renderGradeDistribution()}
                            {renderPerformanceTrends()}
                            {renderTopPerformers()}
                            {renderStudentRankings()}
                        </View>
                    )}
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
