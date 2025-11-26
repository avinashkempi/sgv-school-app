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
import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import { formatDate } from "../utils/date";

export default function HistoryScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("assignments"); // 'assignments' or 'exams'

    const [assignments, setAssignments] = useState([]);
    const [exams, setExams] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // Fetch Assignments History
            const assignRes = await apiFetch(`${apiConfig.baseUrl}/assignments/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (assignRes.ok) {
                const data = await assignRes.json();
                setAssignments(data);
            }

            // Fetch Exams History
            const examsRes = await apiFetch(`${apiConfig.baseUrl}/exams/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (examsRes.ok) {
                const data = await examsRes.json();
                setExams(data);
            }

        } catch (error) {
            console.error(error);
            showToast("Error loading history", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderAssignments = () => (
        <View>
            {assignments.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                    <MaterialIcons name="assignment" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                        No past assignments found
                    </Text>
                </View>
            ) : (
                assignments.map((item) => (
                    <View
                        key={item._id}
                        style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 1,
                            borderLeftWidth: 4,
                            borderLeftColor: colors.primary
                        }}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, flex: 1 }}>
                                {item.title}
                            </Text>
                            <View style={{ backgroundColor: colors.primary + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "DMSans-Bold" }}>
                                    {item.subject?.name}
                                </Text>
                            </View>
                        </View>

                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 12 }} numberOfLines={2}>
                            {item.description}
                        </Text>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <MaterialIcons name="class" size={16} color={colors.textSecondary} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                    {item.class?.name} {item.class?.section}
                                </Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <MaterialIcons name="event" size={16} color={colors.textSecondary} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                    Due: {formatDate(item.dueDate)}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderExams = () => (
        <View>
            {exams.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                    <MaterialIcons name="event-note" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                        No past exams found
                    </Text>
                </View>
            ) : (
                exams.map((item) => (
                    <View
                        key={item._id}
                        style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 1,
                            borderLeftWidth: 4,
                            borderLeftColor: colors.secondary
                        }}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, flex: 1 }}>
                                {item.name}
                            </Text>
                            <View style={{ backgroundColor: colors.secondary + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 12, color: colors.secondary, fontFamily: "DMSans-Bold" }}>
                                    {item.subject?.name}
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                            <View style={{ backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: "capitalize" }}>
                                    {item.type}
                                </Text>
                            </View>
                            {item.room && (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                    <MaterialIcons name="meeting-room" size={14} color={colors.textSecondary} />
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                        Room: {item.room}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <MaterialIcons name="class" size={16} color={colors.textSecondary} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                    {item.class?.name} {item.class?.section}
                                </Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <MaterialIcons name="event" size={16} color={colors.textSecondary} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                    {formatDate(item.date)}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="History" subtitle="Past assignments & exams" showBack />

                {/* Tabs */}
                <View style={{
                    flexDirection: "row",
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    padding: 4,
                    marginBottom: 16
                }}>
                    <Pressable
                        onPress={() => setActiveTab('assignments')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: activeTab === 'assignments' ? colors.primary : 'transparent',
                            alignItems: "center"
                        }}
                    >
                        <Text style={{
                            fontSize: 14,
                            fontFamily: "DMSans-Bold",
                            color: activeTab === 'assignments' ? '#fff' : colors.textSecondary
                        }}>
                            Assignments
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setActiveTab('exams')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: activeTab === 'exams' ? colors.secondary : 'transparent',
                            alignItems: "center"
                        }}
                    >
                        <Text style={{
                            fontSize: 14,
                            fontFamily: "DMSans-Bold",
                            color: activeTab === 'exams' ? '#fff' : colors.textSecondary
                        }}>
                            Exams
                        </Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 100 }}
            >
                {activeTab === 'assignments' ? renderAssignments() : renderExams()}
            </ScrollView>
        </View>
    );
}
