import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import { useApiQuery } from "../../../hooks/useApi";
import AppHeader from "../../../components/Header";
import apiConfig from "../../../config/apiConfig";
import {} from "react-native-chart-kit";

const { _width } = Dimensions.get('window');

const EXAM_COLORS = {
    'FA1': '#4CAF50',
    'FA2': '#2196F3',
    'SA1': '#FF9800',
    'FA3': '#9C27B0',
    'FA4': '#E91E63',
    'SA2': '#F44336'
};

export default function SubjectPerformanceScreen() {
    const _router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();
    const { subjectId } = params;

    const [refreshing, setRefreshing] = useState(false);

    // Fetch subject performance data
    const { data: performanceData, isLoading, refetch } = useApiQuery(
        ['subjectPerformance', subjectId],
        `${apiConfig.baseUrl}/exams/performance/subject/${subjectId}`,
        { enabled: !!subjectId }
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

    const { performance = [] } = performanceData;

    // Calculate overall stats
    const totalExamsWithData = performance.filter(p => p.overallAvgPercentage > 0).length;
    const overallAvg = totalExamsWithData > 0
        ? (performance.reduce((sum, p) => sum + p.overallAvgPercentage, 0) / totalExamsWithData).toFixed(1)
        : 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
                        title="Subject Performance"
                        subtitle="Exam-wise analytics across all classes"
                        showBack
                    />

                    {/* Overall Subject Stats */}
                    <View style={{
                        backgroundColor: colors.primary,
                        borderRadius: 20,
                        padding: 24,
                        marginTop: 20,
                        elevation: 4
                    }}>
                        <Text style={{ fontSize: 16, color: "#fff", opacity: 0.9, fontFamily: "DMSans-Medium", textAlign: "center" }}>
                            Overall Subject Average
                        </Text>
                        <Text style={{ fontSize: 56, fontFamily: "DMSans-Bold", color: "#fff", marginTop: 8, textAlign: "center" }}>
                            {overallAvg}%
                        </Text>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: "#fff", marginTop: 4, textAlign: "center", opacity: 0.8 }}>
                            Across {totalExamsWithData} completed assessments
                        </Text>
                    </View>

                    {/* Exam-wise Performance */}
                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 28, marginBottom: 12 }}>
                        Assessment Performance
                    </Text>

                    {performance.map((exam) => (
                        <View
                            key={exam.examType}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 16,
                                padding: 18,
                                marginBottom: 16,
                                elevation: 2
                            }}
                        >
                            {/* Exam Header */}
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                                <View style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    backgroundColor: EXAM_COLORS[exam.examType] + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12
                                }}>
                                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: EXAM_COLORS[exam.examType] }}>
                                        {exam.examType}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                        {exam.examType === 'FA1' && 'Formative Assessment 1'}
                                        {exam.examType === 'FA2' && 'Formative Assessment 2'}
                                        {exam.examType === 'SA1' && 'Summative Assessment 1'}
                                        {exam.examType === 'FA3' && 'Formative Assessment 3'}
                                        {exam.examType === 'FA4' && 'Formative Assessment 4'}
                                        {exam.examType === 'SA2' && 'Summative Assessment 2'}
                                    </Text>
                                    <Text style={{
                                        fontSize: 20,
                                        fontFamily: "DMSans-Bold",
                                        color: getGradeColor(exam.overallAvgPercentage),
                                        marginTop: 4
                                    }}>
                                        {exam.overallAvgPercentage.toFixed(1)}% avg
                                    </Text>
                                </View>
                            </View>

                            {/* Class-wise Breakdown */}
                            {exam.classwiseData && exam.classwiseData.length > 0 && (
                                <>
                                    <View style={{ height: 1, backgroundColor: colors.textSecondary + '20', marginBottom: 12 }} />
                                    <Text style={{ fontSize: 14, fontFamily: "DMSans-SemiBold", color: colors.textPrimary, marginBottom: 12 }}>
                                        Class-wise Performance
                                    </Text>
                                    {exam.classwiseData.map((classData, idx) => (
                                        <View
                                            key={idx}
                                            style={{
                                                backgroundColor: colors.background,
                                                borderRadius: 12,
                                                padding: 12,
                                                marginBottom: 8,
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center"
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                    {classData.className}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                                    {classData.studentsCount} student{classData.studentsCount !== 1 ? 's' : ''}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: "flex-end" }}>
                                                <Text style={{
                                                    fontSize: 18,
                                                    fontFamily: "DMSans-Bold",
                                                    color: getGradeColor(classData.avgPercentage)
                                                }}>
                                                    {classData.avgPercentage}%
                                                </Text>
                                                <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                                                    <Text style={{ fontSize: 10, color: colors.success, fontFamily: "DMSans-Regular" }}>
                                                        H: {classData.highest}%
                                                    </Text>
                                                    <Text style={{ fontSize: 10, color: colors.error, fontFamily: "DMSans-Regular" }}>
                                                        L: {classData.lowest}%
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}

                            {(!exam.classwiseData || exam.classwiseData.length === 0) && (
                                <View style={{ alignItems: "center", paddingVertical: 20, opacity: 0.5 }}>
                                    <MaterialIcons name="info-outline" size={32} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>
                                        No data yet for this assessment
                                    </Text>
                                </View>
                            )}
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
