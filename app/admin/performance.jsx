import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import AppHeader from "../../components/Header";
import apiConfig from "../../config/apiConfig";


const { _width } = Dimensions.get('window');

const EXAM_COLORS = {
    'FA1': '#4CAF50',
    'FA2': '#2196F3',
    'SA1': '#FF9800',
    'FA3': '#9C27B0',
    'FA4': '#E91E63',
    'SA2': '#F44336'
};

export default function AdminPerformanceScreen() {
    const _router = useRouter();
    const { colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'classes' | 'subjects'

    // Fetch school-wide performance data
    const { data: performanceData, isLoading, refetch } = useApiQuery(
        ['schoolPerformance'],
        `${apiConfig.baseUrl}/exams/performance/school`
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

    const { examwisePerformance = [], classwiseSummary = [], subjectwiseSummary = [] } = performanceData;

    // Calculate school average
    const completedExams = examwisePerformance.filter(e => e.marksEntered > 0);
    const schoolAvg = completedExams.length > 0
        ? (completedExams.reduce((sum, e) => sum + e.avgPercentage, 0) / completedExams.length).toFixed(1)
        : 0;

    const renderOverview = () => (
        <View>
            {/* School Average Card */}
            <View style={{
                backgroundColor: colors.primary,
                borderRadius: 20,
                padding: 28,
                marginTop: 20,
                elevation: 4
            }}>
                <Text style={{ fontSize: 16, color: "#fff", opacity: 0.9, fontFamily: "DMSans-Medium", textAlign: "center" }}>
                    School-wide Average
                </Text>
                <Text style={{ fontSize: 64, fontFamily: "DMSans-Bold", color: "#fff", marginTop: 12, textAlign: "center" }}>
                    {schoolAvg}%
                </Text>
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: "#fff", marginTop: 4, textAlign: "center", opacity: 0.8 }}>
                    Across all assessments
                </Text>
            </View>

            {/* Quick Stats */}
            <View style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 20
            }}>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center"
                }}>
                    <MaterialIcons name="school" size={32} color={colors.primary} />
                    <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 8 }}>
                        {classwiseSummary.length}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                        Classes
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center"
                }}>
                    <MaterialIcons name="book" size={32} color={colors.success} />
                    <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 8 }}>
                        {subjectwiseSummary.length}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                        Subjects
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center"
                }}>
                    <MaterialIcons name="assessment" size={32} color={EXAM_COLORS.FA1} />
                    <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 8 }}>
                        {completedExams.length}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                        Completed
                    </Text>
                </View>
            </View>

            {/* Exam-wise Performance */}
            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 28, marginBottom: 12 }}>
                Assessment Performance
            </Text>

            {examwisePerformance.map((exam) => (
                <View
                    key={exam.examType}
                    style={{
                        backgroundColor: colors.cardBackground,
                        borderRadius: 16,
                        padding: 18,
                        marginBottom: 12,
                        borderLeftWidth: 5,
                        borderLeftColor: EXAM_COLORS[exam.examType]
                    }}
                >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {exam.examType}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular", marginTop: 2 }}>
                                {exam.examsCount} exam{exam.examsCount !== 1 ? 's' : ''} • {exam.marksEntered} mark entries
                            </Text>
                        </View>
                        <Text style={{
                            fontSize: 28,
                            fontFamily: "DMSans-Bold",
                            color: getGradeColor(exam.avgPercentage)
                        }}>
                            {exam.avgPercentage.toFixed(1)}%
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderClasses = () => (
        <View>
            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 20, marginBottom: 12 }}>
                Class-wise Performance
            </Text>

            {classwiseSummary
                .sort((a, b) => b.avgPercentage - a.avgPercentage)
                .map((cls, idx) => (
                    <View
                        key={cls.classId}
                        style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 18,
                            marginBottom: 12,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: idx < 3 ? colors.primary + '20' : colors.textSecondary + '10',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12
                            }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontFamily: "DMSans-Bold",
                                    color: idx < 3 ? colors.primary : colors.textSecondary
                                }}>
                                    #{idx + 1}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    {cls.className}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                    {cls.examsCount} exam{cls.examsCount !== 1 ? 's' : ''} completed
                                </Text>
                            </View>
                        </View>
                        <Text style={{
                            fontSize: 24,
                            fontFamily: "DMSans-Bold",
                            color: getGradeColor(cls.avgPercentage)
                        }}>
                            {cls.avgPercentage}%
                        </Text>
                    </View>
                ))}

            {classwiseSummary.length === 0 && (
                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                    <MaterialIcons name="school" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                        No class data available
                    </Text>
                </View>
            )}
        </View>
    );

    const renderSubjects = () => (
        <View>
            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 20, marginBottom: 12 }}>
                Subject-wise Performance
            </Text>

            {subjectwiseSummary
                .sort((a, b) => b.avgPercentage - a.avgPercentage)
                .map((subj, idx) => (
                    <View
                        key={subj.subjectId}
                        style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 18,
                            marginBottom: 12,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: idx < 3 ? colors.success + '20' : colors.textSecondary + '10',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12
                            }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontFamily: "DMSans-Bold",
                                    color: idx < 3 ? colors.success : colors.textSecondary
                                }}>
                                    #{idx + 1}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    {subj.subjectName}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                    {subj.examsCount} exam{subj.examsCount !== 1 ? 's' : ''} completed
                                </Text>
                            </View>
                        </View>
                        <Text style={{
                            fontSize: 24,
                            fontFamily: "DMSans-Bold",
                            color: getGradeColor(subj.avgPercentage)
                        }}>
                            {subj.avgPercentage}%
                        </Text>
                    </View>
                ))}

            {subjectwiseSummary.length === 0 && (
                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                    <MaterialIcons name="book" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                        No subject data available
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
                        title="School Performance"
                        subtitle="Comprehensive analytics dashboard"
                        showBack
                    />

                    {/* Tabs */}
                    <View style={{
                        flexDirection: "row",
                        backgroundColor: colors.cardBackground,
                        borderRadius: 12,
                        padding: 4,
                        marginTop: 20
                    }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === 'overview' ? colors.primary : 'transparent',
                                borderRadius: 10
                            }}
                            onPress={() => setActiveTab('overview')}
                        >
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                fontSize: 13,
                                color: activeTab === 'overview' ? "#fff" : colors.textSecondary
                            }}>
                                Overview
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === 'classes' ? colors.primary : 'transparent',
                                borderRadius: 10
                            }}
                            onPress={() => setActiveTab('classes')}
                        >
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                fontSize: 13,
                                color: activeTab === 'classes' ? "#fff" : colors.textSecondary
                            }}>
                                Classes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === 'subjects' ? colors.primary : 'transparent',
                                borderRadius: 10
                            }}
                            onPress={() => setActiveTab('subjects')}
                        >
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                fontSize: 13,
                                color: activeTab === 'subjects' ? "#fff" : colors.textSecondary
                            }}>
                                Subjects
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'classes' && renderClasses()}
                    {activeTab === 'subjects' && renderSubjects()}
                </View>
            </ScrollView>
        </View>
    );
}
