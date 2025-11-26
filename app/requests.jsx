import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import Header from "../components/Header";

export default function RequestsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const [user, setUser] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

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

    const onRefresh = async () => {
        setRefreshing(true);
        await loadUser();
        setRefreshing(false);
    };

    const navigateToLeaves = () => {
        if (user?.role === 'student') {
            router.push('/student/leaves');
        } else if (user?.role === 'class teacher' || user?.role === 'staff') {
            router.push('/teacher/leaves');
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
                        title="Requests"
                        subtitle={user?.role === 'student' ? "Manage your requests" : "Review and approve requests"}
                    />

                    <View style={{ marginTop: 24 }}>
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
                                            : 'Approve or reject student leaves'}
                                    </Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </Pressable>

                        {/* Complaints Card */}
                        <Pressable
                            onPress={() => {
                                if (user?.role === 'student') {
                                    router.push('/student/complaints');
                                } else if (user?.role === 'admin' || user?.role === 'super admin') {
                                    router.push('/admin/complaints');
                                } else {
                                    // For teachers/staff, maybe they can also view/report? 
                                    // For now, let's assume they can report like students or view like admins?
                                    // Implementation plan only covered Student and Admin.
                                    // Let's restrict to Student for now as per plan, or maybe allow all to report?
                                    // The backend /api/complaints POST is for 'student' (req.user.userId).
                                    // Let's stick to Student for now.
                                    if (user?.role === 'student') {
                                        router.push('/student/complaints');
                                    } else {
                                        // Show toast or alert? Or just do nothing?
                                        // The requests screen seems to be shared.
                                        // Let's just navigate to student complaints for students.
                                        // If teacher, maybe they don't have complaints feature yet.
                                        router.push('/student/complaints'); // Re-using student screen for now if they have access
                                    }
                                }
                            }}
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
                                    backgroundColor: colors.primary + "20",
                                    padding: 14,
                                    borderRadius: 12
                                }}>
                                    <MaterialIcons name="report-problem" size={28} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontSize: 17,
                                        fontFamily: "DMSans-Bold",
                                        color: colors.textPrimary,
                                        marginBottom: 4
                                    }}>
                                        Complaints & Feedback
                                    </Text>
                                    <Text style={{
                                        fontSize: 13,
                                        color: colors.textSecondary,
                                        fontFamily: "DMSans-Regular"
                                    }}>
                                        Report issues and track status
                                    </Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </Pressable>

                        {/* Info card */}
                        <View style={{
                            backgroundColor: colors.primary + "10",
                            borderRadius: 12,
                            padding: 16,
                            marginTop: 8,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12
                        }}>
                            <MaterialIcons name="info-outline" size={20} color={colors.primary} />
                            <Text style={{
                                fontSize: 13,
                                color: colors.primary,
                                fontFamily: "DMSans-Medium",
                                flex: 1
                            }}>
                                More request types will be added here in future updates
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
