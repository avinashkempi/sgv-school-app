import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";

export default function SubjectsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

    // Student state
    const [studentSubjects, setStudentSubjects] = useState([]);

    // Teacher state
    const [teacherClasses, setTeacherClasses] = useState([]);

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
            setUser(parsedUser);

            if (parsedUser.role === 'student') {
                await loadStudentSubjects(parsedUser, token);
            } else if (parsedUser.role === 'class teacher' || parsedUser.role === 'staff') {
                await loadTeacherSubjects(token);
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadStudentSubjects = async (user, token) => {
        if (!user.currentClass) return;

        let classId = user.currentClass;
        if (typeof user.currentClass === 'object' && user.currentClass._id) {
            classId = user.currentClass._id;
        }

        const response = await apiFetch(`${apiConfig.baseUrl}/classes/${classId}/full-details`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
            const data = await response.json();
            setStudentSubjects(data.subjects || []);
        }
    };

    const loadTeacherSubjects = async (token) => {
        // First get all classes
        const response = await apiFetch(`${apiConfig.baseUrl}/classes/my-classes`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
            const classes = await response.json();

            // For each class, we could fetch subjects if not already included
            // Assuming we want to show a list of classes first, then expand to subjects
            // Or fetch full details for all classes (might be heavy)

            // For now, let's just store classes and we'll fetch subjects on demand or if they are in the list
            // Checking the previous file, classes/my-classes returns basic info.
            // We might need to iterate and fetch details if we want to show ALL subjects at once.
            // But a better UX might be: Class A > Subjects, Class B > Subjects.

            // Let's fetch full details for each class to get subjects
            const classesWithSubjects = await Promise.all(classes.map(async (cls) => {
                try {
                    const res = await apiFetch(`${apiConfig.baseUrl}/classes/${cls._id}/full-details`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        return { ...cls, subjects: data.subjects || [] };
                    }
                    return cls;
                } catch (e) {
                    return cls;
                }
            }));

            setTeacherClasses(classesWithSubjects);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderStudentView = () => (
        <View>
            {studentSubjects.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                    <MaterialIcons name="library-books" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                        No subjects assigned.
                    </Text>
                </View>
            ) : (
                studentSubjects.map((subject) => (
                    <Pressable
                        key={subject._id}
                        onPress={() => router.push({
                            pathname: "/student/class/subject/[subjectId]",
                            params: { id: user.currentClass._id || user.currentClass, subjectId: subject._id }
                        })}
                        style={({ pressed }) => ({
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
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
                            <View style={{ backgroundColor: colors.primary + "20", padding: 10, borderRadius: 10 }}>
                                <MaterialIcons name="book" size={24} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
                                    {subject.name}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                    Tap to view content
                                </Text>
                            </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                    </Pressable>
                ))
            )}
        </View>
    );

    const renderTeacherView = () => (
        <View>
            {teacherClasses.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                    <MaterialIcons name="class" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                        No classes assigned.
                    </Text>
                </View>
            ) : (
                teacherClasses.map((cls) => (
                    <View key={cls._id} style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textSecondary, marginBottom: 12, marginLeft: 4 }}>
                            {cls.name} {cls.section ? `- ${cls.section}` : ""}
                        </Text>

                        {(!cls.subjects || cls.subjects.length === 0) ? (
                            <Text style={{ color: colors.textSecondary, fontStyle: 'italic', marginLeft: 16 }}>No subjects found</Text>
                        ) : (
                            cls.subjects.map((subject) => (
                                <Pressable
                                    key={subject._id}
                                    onPress={() => router.push({
                                        pathname: "/teacher/class/subject/[subjectId]",
                                        params: { id: cls._id, subjectId: subject._id }
                                    })}
                                    style={({ pressed }) => ({
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 12,
                                        padding: 14,
                                        marginBottom: 8,
                                        opacity: pressed ? 0.9 : 1,
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        borderLeftWidth: 4,
                                        borderLeftColor: colors.primary
                                    })}
                                >
                                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>
                                        {subject.name}
                                    </Text>
                                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                                </Pressable>
                            ))
                        )}
                    </View>
                ))
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
                    <Header title="Subjects" subtitle="Access your course materials" />

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ marginTop: 16 }}>
                            {user?.role === 'student' ? renderStudentView() : renderTeacherView()}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
