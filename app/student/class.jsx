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
                        console.log("Refreshed user data in class view");
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
                console.log(`[STUDENT] Loaded class ${classId} from cache`);
            }

            // 2. Fetch API
            // 2. Fetch API
            // 2. Fetch API
            const fetchFromApi = async () => {
                console.log(`[STUDENT] Fetching class details for ${classId}`);

                // Load Full Class Details
                const response = await apiFetch(`${apiConfig.baseUrl}/classes/${classId}/full-details`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedClass
                });

                if (response.ok) {
                    const data = await response.json();
                    const { classData, subjects } = data;

                    console.log(`[STUDENT] Fetched class:`, classData?.name);

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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            >
                <MaterialIcons name="school" size={64} color={colors.textSecondary} />
                <Text style={{ fontSize: 18, fontWeight: "600", color: colors.textPrimary, marginTop: 16, textAlign: "center" }}>
                    No Class Assigned
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>
                    Please contact your administrator to be assigned to a class.
                </Text>
            </ScrollView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title={classData.name}
                        subtitle={`Section ${classData.section || 'N/A'} • ${classData.academicYear?.name || ''}`}
                    />

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ marginTop: 24 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                                    Quick Actions
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => router.push("/student/leaves")}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.cardBackground,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 24,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1,
                                    opacity: pressed ? 0.9 : 1,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                })}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <View style={{ backgroundColor: "#4CAF50" + "20", padding: 10, borderRadius: 10 }}>
                                        <MaterialIcons name="event-note" size={24} color="#4CAF50" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
                                            My Leaves
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                            Apply and view leave status
                                        </Text>
                                    </View>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </Pressable>

                            <Pressable
                                onPress={() => router.push("/student/attendance")}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.cardBackground,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 24,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1,
                                    opacity: pressed ? 0.9 : 1,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                })}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <View style={{ backgroundColor: "#2196F3" + "20", padding: 10, borderRadius: 10 }}>
                                        <MaterialIcons name="event-available" size={24} color="#2196F3" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
                                            My Attendance
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                            View attendance record
                                        </Text>
                                    </View>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </Pressable>

                            <Pressable
                                onPress={() => router.push("/student/report-card")}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.cardBackground,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 24,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1,
                                    opacity: pressed ? 0.9 : 1,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                })}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <View style={{ backgroundColor: "#FF9800" + "20", padding: 10, borderRadius: 10 }}>
                                        <MaterialIcons name="assessment" size={24} color="#FF9800" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
                                            My Report Card
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                            View academic performance
                                        </Text>
                                    </View>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </Pressable>

                            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                                Subjects
                            </Text>

                            {subjects.length === 0 ? (
                                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                    <MaterialIcons name="library-books" size={48} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                        No subjects added yet.
                                    </Text>
                                </View>
                            ) : (
                                subjects.map((subject) => (
                                    <Pressable
                                        key={subject._id}
                                        onPress={() => router.push({
                                            pathname: "/student/class/subject/[subjectId]",
                                            params: { id: classData._id, subjectId: subject._id }
                                        })}
                                        style={({ pressed }) => ({
                                            backgroundColor: colors.cardBackground,
                                            borderRadius: 16,
                                            padding: 18,
                                            marginBottom: 14,
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.06,
                                            shadowRadius: 6,
                                            elevation: 2,
                                            opacity: pressed ? 0.9 : 1,
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        })}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                                            <View style={{ backgroundColor: colors.primary + "20", padding: 12, borderRadius: 12 }}>
                                                <MaterialIcons name="book" size={26} color={colors.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 17,
                                                    fontFamily: "DMSans-Bold",
                                                    color: colors.textPrimary,
                                                    marginBottom: 4
                                                }}>
                                                    {subject.name}
                                                </Text>
                                                {subject.teachers && subject.teachers.length > 0 ? (
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
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
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
