import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import { useApiQuery } from "../../../hooks/useApi";
import AppHeader from "../../../components/Header";
import apiConfig from "../../../config/apiConfig";
import { LineChart,} from "react-native-chart-kit";

const { width } = Dimensions.get('window');

const EXAM_COLORS = {
    'FA1': '#4CAF50',
    'FA2': '#2196F3',
    'SA1': '#FF9800',
    'FA3': '#9C27B0',
    'FA4': '#E91E63',
    'SA2': '#F44336'
};

export default function ClassPerformanceScreen() {
    const _router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();
    const { classId } = params;

    const [refreshing, setRefreshing] = useState(false);

    // Fetch class performance data
    const { data: performanceData, isLoading, refetch } = useApiQuery(
        ['classPerformance', classId],
        `${apiConfig.baseUrl}/exams/performance/class/${classId}`,
        { enabled: !!classId }
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const getGradeColor = (percentage) => {
        if (percentage >= 90) return colors.success;
        if (percentage >= 75) return '#2196F3';
        if (percentage >= 60) return '#FF9800';
        if (percentage >= 40) return '#FF5722';
        return colors.error;
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!performanceData) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <MaterialIcons name="info-outline" size={64} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, textAlign: 'center' }}>
                    No performance data available
                </Text>
            </View>
        );
    }

    const { performance = [], totalStudents = 0 } = performanceData;

    // Prepare chart data
    const completedExams = performance.filter(p => p.avgPercentage > 0);
    const chartLabels = completedExams.map(p => p.examType);
    const chartData = completedExams.map(p => p.avgPercentage);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
                        title="Class Performance"
                        subtitle={`Exam-wise analytics for ${totalStudents} students`}
                        showBack
                    />

                    {/* Overall Stats */}
                    <View style={{
                        backgroundColor: colors.cardBackground,
                        borderRadius: 16,
                        padding: 20,
                        marginTop: 20,
                        elevation: 2
                    }}>
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>
                            Overall Statistics
                        </Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                            <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 32, fontFamily: "DMSans-Bold", color: colors.primary }}>
                                    {totalStudents}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                    Students
                                </Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 32, fontFamily: "DMSans-Bold", color: colors.success }}>
                                    {performance.filter(p => p.isComplete).length}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                    Completed
                                </Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 32, fontFamily: "DMSans-Bold", color: colors.textSecondary }}>
                                    {6 - performance.filter(p => p.isComplete).length}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                    Pending
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Performance Trend Chart */}
                    {completedExams.length > 0 && (
                        <View style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 20,
                            elevation: 2
                        }}>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>
                                Performance Trend
                            </Text>
                            <LineChart
                                data={{
                                    labels: chartLabels,
                                    datasets: [{ data: chartData }]
                                }}
                                width={width - 64}
                                height={220}
                                yAxisSuffix="%"
                                chartConfig={{
                                    backgroundColor: colors.cardBackground,
                                    backgroundGradientFrom: colors.cardBackground,
                                    backgroundGradientTo: colors.cardBackground,
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => colors.primary,
                                    labelColor: (_opacity = 1) => colors.textSecondary,
                                    style: { borderRadius: 16 },
                                    propsForDots: {
                                        r: "6",
                                        strokeWidth: "2",
                                        stroke: colors.primary
                                    }
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </View>
                    )}

                    {/* Exam-wise Cards */}
                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 24, marginBottom: 12 }}>
                        Exam-wise Breakdown
                    </Text>

                    {performance.map((exam) => (
                        <View
                            key={exam.examType}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 16,
                                padding: 18,
                                marginBottom: 12,
                                borderLeftWidth: 4,
                                borderLeftColor: EXAM_COLORS[exam.examType],
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <View>
                                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                        {exam.examType}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular", marginTop: 2 }}>
                                        {exam.subjectsCount} subject{exam.subjectsCount !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                                {exam.isComplete ? (
                                    <View style={{
                                        backgroundColor: colors.success + '20',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8
                                    }}>
                                        <Text style={{ color: colors.success, fontFamily: "DMSans-Bold", fontSize: 11 }}>
                                            COMPLETE
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{
                                        backgroundColor: colors.textSecondary + '20',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8
                                    }}>
                                        <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Bold", fontSize: 11 }}>
                                            {exam.studentsWithMarks}/{totalStudents}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ height: 1, backgroundColor: colors.textSecondary + '20', marginVertical: 12 }} />

                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                        Class Average
                                    </Text>
                                    <Text style={{
                                        fontSize: 24,
                                        fontFamily: "DMSans-Bold",
                                        color: getGradeColor(exam.avgPercentage)
                                    }}>
                                        {exam.avgPercentage.toFixed(1)}%
                                    </Text>
                                </View>
                                <View style={{ flex: 1, alignItems: "center" }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                        Highest
                                    </Text>
                                    <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.success }}>
                                        {exam.highest.toFixed(1)}%
                                    </Text>
                                </View>
                                <View style={{ flex: 1, alignItems: "flex-end" }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                        Lowest
                                    </Text>
                                    <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.error }}>
                                        {exam.lowest.toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}

                    {performance.length === 0 && (
                        <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                            <MaterialIcons name="assessment" size={64} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, textAlign: 'center' }}>
                                No exam data available yet.{'\n'}Initialize exams to see performance.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
