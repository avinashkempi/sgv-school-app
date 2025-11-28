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

import { getCachedData, setCachedData } from "../../utils/cache";
import { useNetworkStatus } from "../../components/NetworkStatusProvider";

export default function StudentClassScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const { isConnected } = useNetworkStatus();

    const [classData, setClassData] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

            let parsedUser = JSON.parse(storedUser);

            // If currentClass is missing, try to fetch fresh user data
            if (!parsedUser.currentClass) {
                try {
                    const userRes = await apiFetch(`${apiConfig.baseUrl}/users/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (userRes.ok) {
                        const freshUser = await userRes.json();
                        // Update local storage
                        await AsyncStorage.setItem("@auth_user", JSON.stringify(freshUser));
                        parsedUser = freshUser;

                    }
                } catch (e) {
                    console.error("Failed to refresh user data:", e);
                }
            }

            if (!parsedUser.currentClass) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Fetch Class Details
            let classId = parsedUser.currentClass;
            if (typeof parsedUser.currentClass === 'object' && parsedUser.currentClass._id) {
                classId = parsedUser.currentClass._id;
            }

            const cacheKeyClass = `@class_details_${classId}`;
            const cacheKeySubjects = `@class_subjects_${classId}`;

            // 1. Try cache
            const [cachedClass, cachedSubjects] = await Promise.all([
                getCachedData(cacheKeyClass),
                getCachedData(cacheKeySubjects)
            ]);

            if (cachedClass && cachedSubjects) {
                setClassData(cachedClass);
                setSubjects(cachedSubjects);
                setLoading(false);

            }

            // 2. Fetch API
            const fetchFromApi = async () => {


                // Load Full Class Details
                const response = await apiFetch(`${apiConfig.baseUrl}/classes/${classId}/full-details`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedClass
                });

                if (response.ok) {
                    const data = await response.json();
                    const { classData, subjects } = data;



                    if (classData) {
                        setClassData(classData);
                        setCachedData(cacheKeyClass, classData);
                    }
                    setSubjects(subjects);
                    setCachedData(cacheKeySubjects, subjects);
                } else {
                    if (!cachedClass) showToast("Failed to load class data", "error");
                }
            };

            if (isConnected) {
                await fetchFromApi();
            } else if (!cachedClass) {
                showToast("No internet connection", "error");
            }

        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (!classData) {
        return (
            <ScrollView
                contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            >
                <MaterialIcons name="school" size={64} color={colors.textSecondary} />
                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 16, textAlign: "center" }}>
                    No Class Assigned
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center", fontFamily: "DMSans-Regular" }}>
                    Please contact your administrator to be assigned to a class.
                </Text>
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <Header
                        title={classData.name}
                        subtitle={`Section ${classData.section || 'N/A'} • ${classData.academicYear?.name || ''}`}
                    />

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ gap: 24 }}>
                            <View>
                                <Text style={styles.sectionTitle}>
                                    Quick Actions
                                </Text>

                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                                    <MenuCard
                                        title="Report Card"
                                        icon="assessment"
                                        color="#FF9800"
                                        onPress={() => router.push("/student/report-card")}
                                    />
                                    <MenuCard
                                        title="Timetable"
                                        icon="calendar-today"
                                        color="#009688"
                                        onPress={() => router.push("/student/timetable")}
                                    />
                                    <MenuCard
                                        title="Fees"
                                        icon="attach-money"
                                        color="#FF5722"
                                        onPress={() => router.push("/student/fees")}
                                    />
                                    <MenuCard
                                        title="Exams"
                                        icon="event"
                                        color="#E91E63"
                                        onPress={() => router.push("/student/exam-schedule")}
                                    />
                                </View>
                            </View>

                            <View>
                                <Text style={styles.sectionTitle}>
                                    Subjects
                                </Text>

                                {subjects.length === 0 ? (
                                    <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                        <MaterialIcons name="library-books" size={48} color={colors.textSecondary} />
                                        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontFamily: "DMSans-Medium" }}>
                                            No subjects added yet.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        {subjects.map((subject) => (
                                            <Pressable
                                                key={subject._id}
                                                onPress={() => router.push({
                                                    pathname: "/student/class/subject/[subjectId]",
                                                    params: { id: classData._id, subjectId: subject._id }
                                                })}
                                                style={({ pressed }) => [
                                                    styles.cardMinimal,
                                                    {
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        padding: 16,
                                                        opacity: pressed ? 0.9 : 1,
                                                    }
                                                ]}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                                                    <View style={{
                                                        backgroundColor: colors.primary + "15",
                                                        padding: 12,
                                                        borderRadius: 12
                                                    }}>
                                                        <MaterialIcons name="book" size={24} color={colors.primary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{
                                                            fontSize: 16,
                                                            fontFamily: "DMSans-Bold",
                                                            color: colors.textPrimary,
                                                            marginBottom: 4
                                                        }}>
                                                            {subject.name}
                                                        </Text>
                                                        {subject.teachers && subject.teachers.length > 0 ? (
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                                <MaterialIcons name="person" size={14} color={colors.textSecondary} />
                                                                <Text style={{
                                                                    fontSize: 13,
                                                                    color: colors.textSecondary,
                                                                    fontFamily: "DMSans-Medium"
                                                                }}>
                                                                    {subject.teachers.map(t => t.name).join(", ")}
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={{
                                                                fontSize: 12,
                                                                color: colors.textSecondary,
                                                                fontStyle: "italic",
                                                                fontFamily: "DMSans-Regular"
                                                            }}>
                                                                No teacher assigned
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// Helper Component for Menu Cards
const MenuCard = ({ title, icon, color, onPress }) => {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                flex: 1,
                minWidth: "45%",
                backgroundColor: colors.cardBackground,
                padding: 20,
                borderRadius: 24,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: colors.border
            })}
        >
            <View style={{
                backgroundColor: color + "15",
                padding: 16,
                borderRadius: 20,
                marginBottom: 12
            }}>
                <MaterialIcons name={icon} size={28} color={color} />
            </View>
            <Text style={{
                fontSize: 15,
                fontFamily: "DMSans-Bold",
                color: colors.textPrimary,
                textAlign: "center"
            }}>
                {title}
            </Text>
        </Pressable>
    );
};
