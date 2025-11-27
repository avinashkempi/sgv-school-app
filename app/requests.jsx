import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import Header from "../components/Header";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";

export default function RequestsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const [user, setUser] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const [teacherClasses, setTeacherClasses] = useState([]);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user && (user.role === 'teacher' || user.role === 'class teacher')) {
            loadTeacherClasses();
        }
    }, [user]);

    const loadUser = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('@auth_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            } else {
                router.replace('/login');
            }
        } catch (e) {
            console.warn('Failed to load user', e);
            router.replace('/login');
        }
    };

    const loadTeacherClasses = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            // Fetch classes assigned to this teacher
            // Assuming there's an endpoint or we can filter classes
            // Using the same endpoint as "My Teach" screen
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/my-classes`, {
                headers: { Authorization: `Bearer ${token}` },
                silent: true
            });

            if (response.ok) {
                const data = await response.json();
                setTeacherClasses(data);
            }
        } catch (error) {
            console.error("Failed to load teacher classes", error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadUser();
        if (user && (user.role === 'teacher' || user.role === 'class teacher')) {
            await loadTeacherClasses();
        }
        setRefreshing(false);
    };

    const navigateToLeaves = () => {
        if (user?.role === 'student') {
            router.push('/student/leaves');
        } else if (user?.role === 'class teacher' || user?.role === 'staff' || user?.role === 'teacher') {
            router.push('/teacher/leaves');
        } else if (user?.role === 'admin' || user?.role === 'super admin') {
            router.push('/admin/leaves');
        }
    };

    const navigateToMyAttendance = () => {
        if (user?.role === 'student') {
            router.push(`/student/attendance`);
        } else if (user?.role === 'teacher' || user?.role === 'class teacher' || user?.role === 'staff') {
            router.push('/teacher/attendance');
        } else if (user?.role === 'admin' || user?.role === 'super admin') {
            router.push('/admin/attendance?tab=my_attendance');
        }
    };

    const navigateToMarkAttendance = () => {
        if (user?.role === 'teacher' || user?.role === 'class teacher') {
            if (teacherClasses.length === 1) {
                // If only one class, go directly to attendance marking
                router.push({
                    pathname: "/teacher/class/attendance",
                    params: { classId: teacherClasses[0]._id }
                });
            } else {
                // If multiple classes or 0 (let them see empty list), go to class list
                router.push('/teacher/classes?action=attendance');
            }
        } else if (user?.role === 'admin' || user?.role === 'super admin') {
            router.push('/admin/attendance');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Attendance"
                        subtitle="Manage attendance and requests"
                    />

                    <View style={{ marginTop: 24 }}>
                        {/* My Attendance Card - For All */}
                        <Pressable
                            onPress={navigateToMyAttendance}
                            style={({ pressed }) => ({
                                backgroundColor: colors.cardBackground,
                                borderRadius: 16,
                                padding: 20,
                                marginBottom: 16,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2,
                                opacity: pressed ? 0.9 : 1,
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center"
                            })}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
                                <View style={{
                                    backgroundColor: "#4CAF50" + "20",
                                    padding: 14,
                                    borderRadius: 12
                                }}>
                                    <MaterialIcons name="person" size={28} color="#4CAF50" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontSize: 17,
                                        fontFamily: "DMSans-Bold",
                                        color: colors.textPrimary,
                                        marginBottom: 4
                                    }}>
                                        My Attendance
                                    </Text>
                                    <Text style={{
                                        fontSize: 13,
                                        color: colors.textSecondary,
                                        fontFamily: "DMSans-Regular"
                                    }}>
                                        View your attendance history
                                    </Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </Pressable>

                        {/* Mark Attendance Card - For Teachers & Admins */}
                        {['teacher', 'class teacher', 'admin', 'super admin'].includes(user?.role) && (
                            <Pressable
                                onPress={navigateToMarkAttendance}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.cardBackground,
                                    borderRadius: 16,
                                    padding: 20,
                                    marginBottom: 16,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                    opacity: pressed ? 0.9 : 1,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                })}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
                                    <View style={{
                                        backgroundColor: "#2196F3" + "20",
                                        padding: 14,
                                        borderRadius: 12
                                    }}>
                                        <MaterialIcons name="edit-calendar" size={28} color="#2196F3" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontSize: 17,
                                            fontFamily: "DMSans-Bold",
                                            color: colors.textPrimary,
                                            marginBottom: 4
                                        }}>
                                            Mark Attendance
                                        </Text>
                                        <Text style={{
                                            fontSize: 13,
                                            color: colors.textSecondary,
                                            fontFamily: "DMSans-Regular"
                                        }}>
                                            {user?.role === 'admin' || user?.role === 'super admin'
                                                ? 'Mark staff and student attendance'
                                                : 'Mark student attendance'}
                                        </Text>
                                    </View>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </Pressable>
                        )}

                        {/* Leave Requests Card */}
                        <Pressable
                            onPress={navigateToLeaves}
                            style={({ pressed }) => ({
                                backgroundColor: colors.cardBackground,
                                borderRadius: 16,
                                padding: 20,
                                marginBottom: 16,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2,
                                opacity: pressed ? 0.9 : 1,
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center"
                            })}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
                                <View style={{
                                    backgroundColor: "#FF9800" + "20",
                                    padding: 14,
                                    borderRadius: 12
                                }}>
                                    <MaterialIcons name="event-note" size={28} color="#FF9800" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontSize: 17,
                                        fontFamily: "DMSans-Bold",
                                        color: colors.textPrimary,
                                        marginBottom: 4
                                    }}>
                                        Leave Requests
                                    </Text>
                                    <Text style={{
                                        fontSize: 13,
                                        color: colors.textSecondary,
                                        fontFamily: "DMSans-Regular"
                                    }}>
                                        {user?.role === 'student'
                                            ? 'Apply for leave and track status'
                                            : 'Approve or reject leave requests'}
                                    </Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
