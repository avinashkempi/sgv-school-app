import React, { useState, } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";
import { useApiQuery } from "../hooks/useApi";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import Card from "../components/Card";

export default function SubjectsScreen() {
    const router = useRouter();
    const { _styles, colors } = useTheme();
    const { _showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);

    const { data: userData, isLoading: loadingUser, refetch } = useApiQuery(
        ['currentUser'],
        `${apiConfig.baseUrl}/auth/me`,
        { select: (data) => data.user }
    );
    const user = userData || {};

    // Student Subjects Query
    const { data: studentSubjectsData, isLoading: loadingStudent, refetch: refetchStudent } = useApiQuery(
        ['studentSubjects', user?.currentClass?._id || user?.currentClass],
        `${apiConfig.baseUrl}/classes/${user?.currentClass?._id || user?.currentClass}/full-details`,
        {
            enabled: !!(user?.role === 'student' && user?.currentClass),
            select: (data) => data.subjects || []
        }
    );

    // Teacher Subjects Query
    const { data: teacherClassesData, isLoading: loadingTeacher, refetch: refetchTeacher } = useQuery({
        queryKey: ['teacherSubjectsFull'],
        queryFn: async () => {
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/my-classes`);
            if (!response.ok) throw new Error('Failed to fetch classes');
            const classes = await response.json();

            const classesWithSubjects = await Promise.all(classes.map(async (cls) => {
                try {
                    const res = await apiFetch(`${apiConfig.baseUrl}/classes/${cls._id}/full-details`);
                    if (res.ok) {
                        const data = await res.json();
                        return { ...cls, subjects: data.subjects || [] };
                    }
                    return cls;
                } catch (e) {
                    return cls;
                }
            }));
            return classesWithSubjects;
        },
        enabled: !!(user && (user.role === 'class teacher' || user.role === 'staff' || user.role === 'teacher'))
    });

    const loading = loadingUser || (user?.role === 'student' ? loadingStudent : loadingTeacher);
    const studentSubjects = studentSubjectsData || [];
    const teacherClasses = teacherClassesData || [];

    const onRefresh = async () => {
        setRefreshing(true);
        if (user?.role === 'student') await refetchStudent();
        else if (user?.role === 'class teacher' || user?.role === 'staff' || user?.role === 'teacher') await refetchTeacher();
        else await refetch();
        setRefreshing(false);
    };

    const renderStudentView = () => (
        <View>
            {studentSubjects.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                    <MaterialIcons name="library-books" size={48} color={colors.onSurfaceVariant} />
                    <Text style={{ color: colors.onSurfaceVariant, marginTop: 16, fontSize: 16 }}>
                        No subjects assigned.
                    </Text>
                </View>
            ) : (
                studentSubjects.map((subject) => (
                    <Card
                        key={subject._id}
                        variant="elevated"
                        onPress={() => router.push({
                            pathname: "/student/class/subject/[subjectId]",
                            params: { id: user.currentClass._id || user.currentClass, subjectId: subject._id }
                        })}
                        style={{ marginBottom: 12 }}
                        contentStyle={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 16
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View style={{ backgroundColor: colors.primaryContainer, padding: 10, borderRadius: 10 }}>
                                <MaterialIcons name="book" size={24} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                    {subject.name}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>
                                    Tap to view content
                                </Text>
                            </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
                    </Card>
                ))
            )}
        </View>
    );

    const renderTeacherView = () => (
        <View>
            {teacherClasses.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                    <MaterialIcons name="class" size={48} color={colors.onSurfaceVariant} />
                    <Text style={{ color: colors.onSurfaceVariant, marginTop: 16, fontSize: 16 }}>
                        No classes assigned.
                    </Text>
                </View>
            ) : (
                teacherClasses.map((cls) => (
                    <View key={cls._id} style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 12, marginLeft: 4 }}>
                            {cls.name} {cls.section ? `- ${cls.section}` : ""}
                        </Text>

                        {(!cls.subjects || cls.subjects.length === 0) ? (
                            <Text style={{ color: colors.onSurfaceVariant, fontStyle: 'italic', marginLeft: 16 }}>No subjects found</Text>
                        ) : (
                            cls.subjects.map((subject) => (
                                <Card
                                    key={subject._id}
                                    variant="filled"
                                    onPress={() => router.push({
                                        pathname: "/teacher/class/subject/[subjectId]",
                                        params: { id: cls._id, subjectId: subject._id }
                                    })}
                                    style={{ marginBottom: 8 }}
                                    contentStyle={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: 14,
                                        borderLeftWidth: 4,
                                        borderLeftColor: colors.primary
                                    }}
                                >
                                    <Text style={{ fontSize: 15, fontFamily: "DMSans-SemiBold", color: colors.onSurface }}>
                                        {subject.name}
                                    </Text>
                                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                                </Card>
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
