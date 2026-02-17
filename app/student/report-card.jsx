import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Animated
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../../utils/storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import Header from "../../components/Header";
import apiConfig from "../../config/apiConfig";
import { LineChart } from "react-native-chart-kit";
import { LinearGradient } from 'expo-linear-gradient';
import Card from "../../components/Card";

const { width } = Dimensions.get('window');

// Animated counter component
function AnimatedPercentage({ value, color, fontSize = 64 }) {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animValue, {
            toValue: parseFloat(value) || 0,
            duration: 1200,
            useNativeDriver: false,
        }).start();
    }, [value]);

    const [displayValue, setDisplayValue] = useState('0');

    useEffect(() => {
        const listener = animValue.addListener(({ value: v }) => {
            setDisplayValue(v.toFixed(1));
        });
        return () => animValue.removeListener(listener);
    }, []);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={{ fontSize, fontFamily: "DMSans-Bold", color, lineHeight: fontSize + 6 }}>
                {displayValue}
            </Text>
            <Text style={{ fontSize: fontSize * 0.37, fontFamily: "DMSans-Bold", color, marginBottom: fontSize * 0.18, marginLeft: 4, opacity: 0.8 }}>
                %
            </Text>
        </View>
    );
}

export default function StudentReportCardScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Entrance animation
    const heroAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(heroAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
    }, []);

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

    // Fetch Standardized Report Card (now includes classRank + totalInClass)
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
            {/* Overall Stats Hero Card */}
            <Animated.View style={{
                marginTop: 20,
                borderRadius: 20,
                overflow: 'hidden',
                opacity: heroAnim,
                transform: [{
                    scale: heroAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1]
                    })
                }]
            }}>
                <Card variant="elevated" style={{ padding: 0, overflow: 'hidden', borderBottomWidth: 0 }}>
                    <LinearGradient
                        colors={[colors.onPrimaryContainer, colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ padding: 24, alignItems: 'center' }}
                    >
                        <Text style={{
                            fontSize: 12,
                            color: colors.onPrimary,
                            fontFamily: "DMSans-Bold",
                            opacity: 0.7,
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            marginBottom: 4
                        }}>
                            Overall Performance
                        </Text>

                        <AnimatedPercentage
                            value={reportCard?.overall?.percentage}
                            color={colors.onPrimary}
                            fontSize={60}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {/* Grade Badge */}
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 100,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                <MaterialIcons name="grade" size={16} color={colors.onPrimary} />
                                <Text style={{ color: colors.onPrimary, fontFamily: "DMSans-Bold", fontSize: 14 }}>
                                    Grade {reportCard?.overall?.grade}
                                </Text>
                            </View>

                            {/* Class Rank Badge */}
                            {reportCard?.overall?.classRank && (
                                <View style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 100,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <MaterialIcons name="emoji-events" size={16} color={colors.onPrimary} />
                                    <Text style={{ color: colors.onPrimary, fontFamily: "DMSans-Bold", fontSize: 14 }}>
                                        Rank {reportCard.overall.classRank}
                                        {reportCard.overall.totalInClass && (
                                            <Text style={{ opacity: 0.7, fontFamily: "DMSans-Medium" }}>
                                                {' '}/ {reportCard.overall.totalInClass}
                                            </Text>
                                        )}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </Card>
            </Animated.View>

            {/* Exam Wise Summary */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.onBackground }}>
                    Exam Results
                </Text>
                <View style={{ backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>
                        {reportCard?.exams?.length || 0} Exams
                    </Text>
                </View>
            </View>

            {reportCard?.exams?.map((exam, _index) => (
                <Card
                    key={exam.examType}
                    variant={exam.isCompleted ? "elevated" : "filled"}
                    style={{ marginBottom: 16 }}
                    contentStyle={{ padding: 20 }}
                >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                {exam.examType}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: exam.isCompleted ? colors.success : colors.outline, marginRight: 6 }} />
                                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>
                                    {exam.isCompleted ? "Completed" : "Results Pending"}
                                </Text>
                            </View>
                        </View>
                        {exam.isCompleted && (
                            <View style={{ backgroundColor: getGradeColor(exam.grade) + '15', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
                                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: getGradeColor(exam.grade) }}>
                                    {exam.percentage}%
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Subjects List for this Exam */}
                    {exam.isCompleted && (
                        <View style={{ gap: 18 }}>
                            {exam.subjects.map((sub, idx) => {
                                const percentage = sub.maxMarks > 0 ? (sub.obtainedMarks / sub.maxMarks) * 100 : 0;
                                return (
                                    <View key={idx}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 15, color: colors.onSurface, fontFamily: "DMSans-Medium", flex: 1 }}>
                                                {sub.subject}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, fontFamily: "DMSans-Regular" }}>
                                                    {sub.obtainedMarks}<Text style={{ opacity: 0.5 }}>/{sub.maxMarks}</Text>
                                                </Text>
                                                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: getGradeColor(sub.grade) + '12', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 12, color: getGradeColor(sub.grade), fontFamily: "DMSans-Bold" }}>
                                                        {sub.grade}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={{ height: 6, backgroundColor: colors.surfaceContainerHighest, borderRadius: 10, overflow: 'hidden' }}>
                                            <View style={{
                                                height: '100%',
                                                width: `${percentage}%`,
                                                backgroundColor: getGradeColor(sub.grade),
                                                borderRadius: 10
                                            }} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </Card>
            ))}
        </View>
    );

    const renderInsights = () => {
        if (loadingInsights) {
            return (
                <View style={{ marginTop: 60, alignItems: 'center', gap: 16 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: 'DMSans-Medium', letterSpacing: 1 }}>
                        GATHERING INSIGHTS...
                    </Text>
                </View>
            );
        }

        if (!insights) return null;

        const examLabels = insights.examTrends.map(e => e.exam);
        const examData = insights.examTrends.map(e => parseFloat(e.percentage));

        // Ensure we have valid data for the chart
        const validExamData = examData.some(d => d > 0) ? examData : [0];
        const validExamLabels = examData.some(d => d > 0) ? examLabels : ['No data'];

        return (
            <View>
                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.onBackground, marginTop: 24, marginBottom: 16 }}>
                    Performance Trend
                </Text>

                <Card variant="filled" style={{ padding: 16 }}>
                    <LineChart
                        data={{
                            labels: validExamLabels,
                            datasets: [{ data: validExamData }]
                        }}
                        width={width - 64}
                        height={220}
                        yAxisSuffix="%"
                        chartConfig={{
                            backgroundColor: 'transparent',
                            backgroundGradientFrom: colors.surfaceContainer,
                            backgroundGradientTo: colors.surfaceContainer,
                            decimalPlaces: 0,
                            color: (_opacity = 1) => colors.primary,
                            labelColor: (_opacity = 1) => colors.onSurfaceVariant,
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
                </Card>

                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.onBackground, marginTop: 32, marginBottom: 16 }}>
                    Subject Analysis
                </Text>

                {Object.entries(insights.subjectTrends).map(([subject, trends]) => (
                    <Card key={subject} variant="outlined" style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 20 }}>
                            {subject}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 20 }}>
                                {trends.map((t, i) => (
                                    <View key={i} style={{ alignItems: "center" }}>
                                        <View style={{
                                            height: 120,
                                            width: 44,
                                            justifyContent: "flex-end",
                                            backgroundColor: colors.surfaceContainerHighest,
                                            borderRadius: 22,
                                            padding: 4
                                        }}>
                                            <View style={{
                                                height: `${t.percentage}%`,
                                                backgroundColor: getGradeColor(getGrade(t.percentage)),
                                                width: "100%",
                                                borderRadius: 18,
                                                minHeight: 36,
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Text style={{ fontSize: 10, color: '#fff', fontFamily: 'DMSans-Bold' }}>{t.percentage}%</Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 8, fontFamily: 'DMSans-Medium' }}>{t.exam}</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </Card>
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
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                <Header
                    title="My Report Card"
                    subtitle={reportCard?.student?.class ? reportCard.student.class : "Academic Performance"}
                    showBack
                />

                {/* Material 3 Segmented Button / Tabs */}
                <View style={{
                    flexDirection: "row",
                    marginTop: 24,
                    backgroundColor: colors.surfaceContainerHigh,
                    borderRadius: 100,
                    padding: 4,
                    height: 48
                }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: activeTab === 'overview' ? colors.primary : 'transparent',
                            borderRadius: 100,
                        }}
                        onPress={() => setActiveTab('overview')}
                        activeOpacity={0.8}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="grid-view" size={18} color={activeTab === 'overview' ? "#fff" : colors.onSurfaceVariant} />
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                fontSize: 14,
                                color: activeTab === 'overview' ? "#fff" : colors.onSurfaceVariant
                            }}>
                                Overview
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: activeTab === 'insights' ? colors.primary : 'transparent',
                            borderRadius: 100,
                        }}
                        onPress={() => setActiveTab('insights')}
                        activeOpacity={0.8}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="analytics" size={18} color={activeTab === 'insights' ? "#fff" : colors.onSurfaceVariant} />
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                fontSize: 14,
                                color: activeTab === 'insights' ? "#fff" : colors.onSurfaceVariant
                            }}>
                                Insights
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {activeTab === 'overview' ? renderOverview() : renderInsights()}

            </ScrollView>
        </View>
    );
}
