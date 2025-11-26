import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function StudentExamScheduleScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exams, setExams] = useState([]);

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/exams/schedule/student`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setExams(data);
            } else {
                showToast("Failed to load exam schedule", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading exams", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadExams();
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
                                        marginBottom: 16,
                                        borderLeftWidth: 4,
                                        borderLeftColor: colors.primary,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
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
