import React, { useState, } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import Header from "../../components/Header";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";

export default function StudentExamScheduleScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { _showToast } = useToast();

    const [refreshing, setRefreshing] = useState(false);

    // Fetch Exam Schedule
    const { data: examsData, isLoading: loading, refetch } = useApiQuery(
        ['studentExamSchedule'],
        `${apiConfig.baseUrl}/exams/schedule/student`
    );
    const exams = examsData || [];

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const getDaysRemaining = (examDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exam = new Date(examDate);
        exam.setHours(0, 0, 0, 0);

        const diffTime = exam - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        return `In ${diffDays} days`;
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header title="Exam Schedule" subtitle="Upcoming Examinations" showBack />

                    {exams.length === 0 ? (
                        <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                            <MaterialIcons name="event-available" size={64} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                No upcoming exams scheduled.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginTop: 16 }}>
                            {exams.map((exam) => (
                                <View
                                    key={exam._id}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        flexDirection: "column",
                                        gap: 12,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 1,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
                                                {exam.subject?.name}
                                            </Text>
                                            <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                                {exam.name} • {exam.type}
                                            </Text>
                                        </View>
                                        <View style={{ backgroundColor: colors.primary + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                            <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold", fontSize: 12 }}>
                                                {getDaysRemaining(exam.date)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ height: 1, backgroundColor: colors.textSecondary + "20", marginVertical: 12 }} />

                                    <View style={{ flexDirection: "row", gap: 24 }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            <MaterialIcons name="calendar-today" size={18} color={colors.textSecondary} />
                                            <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>
                                                {new Date(exam.date).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        {exam.duration && (
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                <MaterialIcons name="schedule" size={18} color={colors.textSecondary} />
                                                <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>
                                                    {exam.duration} mins
                                                </Text>
                                            </View>
                                        )}
                                        {exam.room && (
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                <MaterialIcons name="meeting-room" size={18} color={colors.textSecondary} />
                                                <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>
                                                    {exam.room}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {exam.instructions && (
                                        <View style={{ marginTop: 12, backgroundColor: colors.background, padding: 10, borderRadius: 8 }}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Regular" }}>
                                                {exam.instructions}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
