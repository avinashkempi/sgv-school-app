import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

const { width } = Dimensions.get('window');

export default function StudentReportCardScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [reportCard, setReportCard] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const storedUser = await AsyncStorage.getItem("@auth_user");

            if (!storedUser) {
                router.replace("/login");
                return;
            }

            const parsedUser = JSON.parse(storedUser);
            console.log("[Report Card] Parsed user:", parsedUser);
            setUser(parsedUser);

            // Get user ID - handle both id and _id for backward compatibility
            const userId = parsedUser.id || parsedUser._id;
            console.log("[Report Card] User ID:", userId);

            if (!userId) {
                console.error("[Report Card] No user ID found in stored user data");
                showToast("Please log in again", "error");
                router.replace("/login");
                return;
            }

            // Load report card
            const response = await apiFetch(
                `${apiConfig.baseUrl}/marks/student/${userId}/report-card`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setReportCard(data);
            } else {
                showToast("Failed to load report card", "error");
            }
        } catch (error) {
            console.error("[Report Card] Error:", error);
            showToast("Error loading report card", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getGradeColor = (grade) => {
        if (grade === 'A+' || grade === 'A') return colors.success;
        if (grade === 'B+' || grade === 'B') return '#2196F3';
        if (grade === 'C') return '#FF9800';
        if (grade === 'D') return '#FF5722';
        return colors.error;
    };

    const getPerformanceMessage = (percentage) => {
        if (percentage >= 90) return { text: "Outstanding Performance!", icon: "emoji-events", color: "#FFD700" };
        if (percentage >= 75) return { text: "Excellent Work!", icon: "star", color: colors.success };
        if (percentage >= 60) return { text: "Good Job!", icon: "thumb-up", color: "#2196F3" };
        if (percentage >= 40) return { text: "Keep Improving!", icon: "trending-up", color: "#FF9800" };
        return { text: "Need to Work Harder", icon: "warning", color: colors.error };
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!reportCard || !reportCard.subjectWise || reportCard.subjectWise.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                    contentContainerStyle={{ flex: 1, padding: 16, paddingTop: 24 }}
                >
                    <Header
                        title="My Report Card"
                        subtitle="Academic Performance Report"
                    />
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <MaterialIcons name="assessment" size={80} color={colors.textSecondary} />
                        <Text style={{ fontSize: 18, fontFamily: "DMSans-SemiBold", color: colors.textPrimary, marginTop: 20, textAlign: "center" }}>
                            No Marks Available Yet
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center", paddingHorizontal: 40 }}>
                            Your report card will appear here once your teachers enter exam marks
                        </Text>
                    </View>
                </ScrollView>
            </View>
        );
    }

    const performance = getPerformanceMessage(reportCard.overall.percentage);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="My Report Card"
                        subtitle={reportCard.student.class ? `${reportCard.student.class.name} ${reportCard.student.class.section}` : "Academic Performance"}
                    />

                    {/* Performance Banner */}
                    <View style={{
                        backgroundColor: performance.color + "15",
                        borderRadius: 16,
                        padding: 20,
                        marginTop: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 16,
                        borderWidth: 2,
                        borderColor: performance.color + "40"
                    }}>
                        <MaterialIcons name={performance.icon} size={40} color={performance.color} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: performance.color }}>
                                {performance.text}
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, fontFamily: "DMSans-Regular" }}>
                                Overall Performance
                            </Text>
                        </View>
                    </View>

                    {/* Overall Stats Card */}
                    <View style={{
                        backgroundColor: colors.primary,
                        borderRadius: 20,
                        padding: 24,
                        marginTop: 20,
                        elevation: 4
                    }}>
                        <Text style={{ fontSize: 16, color: "#fff", opacity: 0.9, fontFamily: "DMSans-Medium", textAlign: "center" }}>
                            Overall Percentage
                        </Text>
                        <Text style={{ fontSize: 64, fontFamily: "DMSans-Bold", color: "#fff", marginTop: 8, textAlign: "center" }}>
                            {reportCard.overall.percentage.toFixed(1)}%
                        </Text>

                        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#fff30" }}>
                            <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 11, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                    Grade
                                </Text>
                                <Text style={{ fontSize: 32, fontFamily: "DMSans-Bold", color: "#fff", marginTop: 4 }}>
                                    {reportCard.overall.grade}
                                </Text>
                            </View>

                            {reportCard.overall.rank && (
                                <View style={{ alignItems: "center" }}>
                                    <Text style={{ fontSize: 11, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                        Class Rank
                                    </Text>
                                    <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                                        <Text style={{ fontSize: 32, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                            {reportCard.overall.rank}
                                        </Text>
                                        <Text style={{ fontSize: 16, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Medium", marginLeft: 4 }}>
                                            {reportCard.overall.rank === 1 ? 'st' : reportCard.overall.rank === 2 ? 'nd' : reportCard.overall.rank === 3 ? 'rd' : 'th'}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 11, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                    Total Marks
                                </Text>
                                <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: "#fff", marginTop: 4 }}>
                                    {reportCard.overall.totalMarksObtained}/{reportCard.overall.totalMaxMarks}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Subject-wise Performance */}
                    <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 32, marginBottom: 16 }}>
                        Subject-wise Performance
                    </Text>

                    {reportCard.subjectWise.map((subject, index) => (
                        <View
                            key={subject.subjectId}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 16,
                                padding: 18,
                                marginBottom: 14,
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                        {subject.subjectName}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, fontFamily: "DMSans-Regular" }}>
                                        {subject.totalObtained} / {subject.totalMax} marks
                                    </Text>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text style={{
                                        fontSize: 28,
                                        fontFamily: "DMSans-Bold",
                                        color: getGradeColor(subject.grade)
                                    }}>
                                        {subject.percentage}%
                                    </Text>
                                    <View style={{
                                        backgroundColor: getGradeColor(subject.grade) + "20",
                                        paddingHorizontal: 12,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        marginTop: 4
                                    }}>
                                        <Text style={{
                                            fontSize: 14,
                                            fontFamily: "DMSans-Bold",
                                            color: getGradeColor(subject.grade)
                                        }}>
                                            Grade {subject.grade}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Individual Exam Breakdown */}
                            {subject.exams && subject.exams.length > 0 && (
                                <View style={{ marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.textSecondary + "20" }}>
                                    <Text style={{ fontSize: 13, fontFamily: "DMSans-SemiBold", color: colors.textSecondary, marginBottom: 10 }}>
                                        Exam Details:
                                    </Text>
                                    {subject.exams.map((exam, examIndex) => (
                                        <View
                                            key={examIndex}
                                            style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                paddingVertical: 8,
                                                borderBottomWidth: examIndex < subject.exams.length - 1 ? 1 : 0,
                                                borderBottomColor: colors.textSecondary + "10"
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                    {exam.examName}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular", textTransform: "capitalize" }}>
                                                    {exam.examType.replace('-', ' ')}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                                    {exam.marksObtained}/{exam.totalMarks}
                                                </Text>
                                                <View style={{
                                                    backgroundColor: getGradeColor(exam.grade) + "20",
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    minWidth: 36,
                                                    alignItems: "center"
                                                }}>
                                                    <Text style={{ fontSize: 12, fontFamily: "DMSans-Bold", color: getGradeColor(exam.grade) }}>
                                                        {exam.grade}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}

                    {/* Performance Insights */}
                    <View style={{
                        backgroundColor: colors.cardBackground,
                        borderRadius: 16,
                        padding: 20,
                        marginTop: 16,
                        elevation: 1
                    }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <MaterialIcons name="lightbulb" size={24} color={colors.primary} />
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                Performance Insights
                            </Text>
                        </View>

                        <View style={{ gap: 10 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <MaterialIcons name="check-circle" size={18} color={colors.success} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, fontFamily: "DMSans-Regular" }}>
                                    Completed {reportCard.subjectWise.reduce((acc, s) => acc + s.exams.length, 0)} exams across {reportCard.subjectWise.length} subjects
                                </Text>
                            </View>

                            {reportCard.subjectWise.filter(s => parseFloat(s.percentage) >= 90).length > 0 && (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <MaterialIcons name="star" size={18} color="#FFD700" />
                                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, fontFamily: "DMSans-Regular" }}>
                                        Excellent performance in {reportCard.subjectWise.filter(s => parseFloat(s.percentage) >= 90).length} subject(s)
                                    </Text>
                                </View>
                            )}

                            {reportCard.subjectWise.filter(s => parseFloat(s.percentage) < 60).length > 0 && (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <MaterialIcons name="trending-up" size={18} color={colors.error} />
                                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, fontFamily: "DMSans-Regular" }}>
                                        Room for improvement in {reportCard.subjectWise.filter(s => parseFloat(s.percentage) < 60).length} subject(s)
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
