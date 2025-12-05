import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator
} from "react-native";
import { } from "@expo/vector-icons";
import storage from "../../utils/storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import Header from "../../components/Header";
import apiConfig from "../../config/apiConfig";
import { LineChart } from "react-native-chart-kit";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function StudentReportCardScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'insights'

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await storage.getItem("@auth_user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        };
        loadUser();
    }, []);

    const userId = user?.id || user?._id;

    // Fetch Standardized Report Card
    const { data: reportCard, isLoading: _loading, refetch } = useApiQuery(
        ['studentReportCard', userId],
        `${apiConfig.baseUrl}/reports/student/${userId}`,
        { enabled: !!userId }
    );

    // Fetch Insights
    const { data: insights, isLoading: loadingInsights, refetch: refetchInsights } = useApiQuery(
        ['studentInsights', userId],
        `${apiConfig.baseUrl}/reports/insights/${userId}`,
        { enabled: !!userId && activeTab === 'insights' }
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchInsights()]);
        setRefreshing(false);
    };

    const getGradeColor = (grade) => {
        if (grade === 'A+' || grade === 'A') return colors.success;
        if (grade === 'B+' || grade === 'B') return '#2196F3';
        if (grade === 'C') return '#FF9800';
        if (grade === 'D') return '#FF5722';
        return colors.error;
    };

    const renderOverview = () => (
        <View>
            {/* Overall Stats */}
            <LinearGradient
                colors={[colors.primary, '#3b5998']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    borderRadius: 24,
                    padding: 24,
                    marginTop: 20,
                    elevation: 8,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    alignItems: 'center'
                }}
            >
                <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", fontFamily: "DMSans-Medium", marginBottom: 4 }}>
                    Overall Performance
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginVertical: 8 }}>
                    <Text style={{ fontSize: 64, fontFamily: "DMSans-Bold", color: "#fff", lineHeight: 70 }}>
                        {reportCard?.overall?.percentage}
                    </Text>
                    <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: "rgba(255,255,255,0.8)", marginBottom: 12, marginLeft: 4 }}>
                        %
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                        <Text style={{ color: '#fff', fontFamily: "DMSans-Bold" }}>Grade {reportCard?.overall?.grade}</Text>
                    </View>
                    {reportCard?.overall?.classRank && (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                            <Text style={{ color: '#fff', fontFamily: "DMSans-Bold" }}>Rank {reportCard.overall.classRank}</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>

            {/* Exam Wise Summary */}
            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 32, marginBottom: 16, paddingHorizontal: 4 }}>
                Exam Results
            </Text>

            {reportCard?.exams?.map((exam, _index) => (
                <View
                    key={exam.examType}
                    style={{
                        backgroundColor: colors.cardBackground,
                        borderRadius: 20,
                        padding: 16,
                        marginBottom: 16,
                        elevation: 0,
                        borderWidth: 1,
                        borderColor: colors.borderColor,
                        opacity: exam.isCompleted ? 1 : 0.8
                    }}
                >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <View>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {exam.examType}
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "DMSans-Medium", marginTop: 2 }}>
                                {exam.isCompleted ? "Completed" : "Scheduled"}
                            </Text>
                        </View>
                        {exam.isCompleted && (
                            <View style={{ alignItems: "flex-end" }}>
                                <View style={{ backgroundColor: getGradeColor(exam.grade) + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: getGradeColor(exam.grade) }}>
                                        {exam.percentage}%
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Subjects List for this Exam */}
                    {exam.isCompleted && (
                        <View style={{ gap: 16 }}>
                            {exam.subjects.map((sub, idx) => {
                                const percentage = sub.maxMarks > 0 ? (sub.obtainedMarks / sub.maxMarks) * 100 : 0;
                                return (
                                    <View key={idx}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>
                                                {sub.subject}
                                            </Text>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                                    {sub.obtainedMarks}/{sub.maxMarks}
                                                </Text>
                                                <Text style={{ fontSize: 14, color: getGradeColor(sub.grade), fontFamily: "DMSans-Bold", width: 24, textAlign: 'right' }}>
                                                    {sub.grade}
                                                </Text>
                                            </View>
                                        </View>
                                        {/* Progress Bar */}
                                        <View style={{ height: 6, backgroundColor: colors.surfaceVariant, borderRadius: 3, overflow: 'hidden' }}>
                                            <View style={{
                                                height: '100%',
                                                width: `${percentage}%`,
                                                backgroundColor: getGradeColor(sub.grade),
                                                borderRadius: 3
                                            }} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            ))}
        </View>
    );

    const renderInsights = () => {
        if (loadingInsights) {
            return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
        }

        if (!insights) return null;

        const examLabels = insights.examTrends.map(e => e.exam);
        const examData = insights.examTrends.map(e => parseFloat(e.percentage));

        return (
            <View>
                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 24, marginBottom: 16 }}>
                    Performance Trend
                </Text>

                <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, elevation: 2 }}>
                    <LineChart
                        data={{
                            labels: examLabels,
                            datasets: [{ data: examData }]
                        }}
                        width={width - 64} // from react-native
                        height={220}
                        yAxisSuffix="%"
                        chartConfig={{
                            backgroundColor: colors.cardBackground,
                            backgroundGradientFrom: colors.cardBackground,
                            backgroundGradientTo: colors.cardBackground,
                            decimalPlaces: 0,
                            color: (_opacity = 1) => colors.primary,
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

                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 32, marginBottom: 16 }}>
                    Subject Analysis
                </Text>

                {Object.entries(insights.subjectTrends).map(([subject, trends]) => (
                    <View key={subject} style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary, marginBottom: 8 }}>
                            {subject}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {trends.map((t, i) => (
                                <View key={i} style={{ marginRight: 16, alignItems: "center" }}>
                                    <View style={{
                                        height: 100,
                                        width: 40,
                                        justifyContent: "flex-end",
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 20,
                                        overflow: "hidden"
                                    }}>
                                        <View style={{
                                            height: `${t.percentage}%`,
                                            backgroundColor: getGradeColor(getGrade(t.percentage)),
                                            width: "100%",
                                            borderRadius: 20
                                        }} />
                                    </View>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{t.exam}</Text>
                                    <Text style={{ fontSize: 10, color: colors.textPrimary, fontFamily: "DMSans-Bold" }}>{t.percentage}%</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                ))}
            </View>
        );
    };

    // Helper for subject analysis chart color
    const getGrade = (percentage) => {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C';
        if (percentage >= 40) return 'D';
        return 'F';
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="My Report Card"
                        subtitle={reportCard?.student?.class?.name ? `${reportCard.student.class.name} ${reportCard.student.class.section || ''}` : "Academic Performance"}
                    />

                    {/* Tabs */}
                    <View style={{ flexDirection: "row", marginTop: 20, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 4 }}>
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
                            <Text style={{ fontFamily: "DMSans-Bold", color: activeTab === 'overview' ? "#fff" : colors.textSecondary }}>Overview</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === 'insights' ? colors.primary : 'transparent',
                                borderRadius: 10
                            }}
                            onPress={() => setActiveTab('insights')}
                        >
                            <Text style={{ fontFamily: "DMSans-Bold", color: activeTab === 'insights' ? "#fff" : colors.textSecondary }}>Insights</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'overview' ? renderOverview() : renderInsights()}

                </View>
            </ScrollView>
        </View>
    );
}
