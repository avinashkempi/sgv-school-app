import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../../utils/storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";

export default function TeacherDashboard() {
    const router = useRouter();
    const { _styles, colors } = useTheme();
    const { _showToast } = useToast();

    const [refreshing, setRefreshing] = useState(false);
    const [_user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('classTeacher'); // 'classTeacher' or 'mySubjects'

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await storage.getItem("@auth_user");
            if (!storedUser) {
                router.replace("/login");
                return;
            }
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user:", e);
                await storage.removeItem("@auth_user");
                router.replace("/login");
            }
        };
        loadUser();
    }, []);

    const { data: dashboardData, isLoading: loading, refetch } = useApiQuery(
        ['teacherDashboard'],
        `${apiConfig.baseUrl}/teachers/my-classes-and-subjects`
    );

    const asClassTeacher = dashboardData?.asClassTeacher || [];
    const allMySubjects = dashboardData?.allMySubjects || [];

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Group subjects by subject name for display
    const groupedSubjects = allMySubjects.reduce((acc, subj) => {
        if (!acc[subj.name]) {
            acc[subj.name] = [];
        }
        acc[subj.name].push(subj);
        return acc;
    }, {});

    const renderClassTeacherTab = () => (
        <View>
            {asClassTeacher.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                    <MaterialIcons name="class" size={56} color={colors.textSecondary} />
                    <Text style={{
                        color: colors.textSecondary,
                        marginTop: 20,
                        fontSize: 16,
                        fontFamily: "DMSans-Medium"
                    }}>
                        You are not a class teacher of any class
                    </Text>
                    <Text style={{
                        color: colors.textSecondary,
                        marginTop: 8,
                        fontSize: 13,
                        fontFamily: "DMSans-Regular",
                        textAlign: "center",
                        paddingHorizontal: 40
                    }}>
                        Check &ldquo;My Subjects&rdquo; tab to see subjects you teach
                    </Text>
                </View>
            ) : (
                asClassTeacher.map((cls) => (
                    <Pressable
                        key={cls._id}
                        onPress={() => router.push(`/teacher/class/${cls._id}`)}
                        style={({ pressed }) => ({
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 18,
                            marginBottom: 12,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            opacity: pressed ? 0.9 : 1,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 6,
                            elevation: 2,
                        })}
                    >
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                                <Text style={{
                                    fontSize: 18,
                                    fontFamily: "DMSans-Bold",
                                    color: colors.textPrimary
                                }}>
                                    {cls.name} {cls.section ? `- ${cls.section}` : ""}
                                </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                    <MaterialIcons name="people" size={16} color={colors.textSecondary} />
                                    <Text style={{
                                        fontSize: 13,
                                        color: colors.textSecondary,
                                        fontFamily: "DMSans-Medium"
                                    }}>
                                        {cls.studentCount} students
                                    </Text>
                                </View>

                                {cls.mySubjects && cls.mySubjects.length > 0 && (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                        <MaterialIcons name="book" size={16} color={colors.textSecondary} />
                                        <Text style={{
                                            fontSize: 13,
                                            color: colors.textSecondary,
                                            fontFamily: "DMSans-Medium"
                                        }}>
                                            Teaching: {cls.mySubjects.join(", ")}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={{
                                backgroundColor: colors.primary + "15",
                                alignSelf: "flex-start",
                                paddingHorizontal: 10,
                                paddingVertical: 3,
                                borderRadius: 6,
                                marginTop: 10
                            }}>
                                <Text style={{
                                    color: colors.primary,
                                    fontSize: 11,
                                    fontFamily: "DMSans-Bold",
                                    textTransform: "uppercase"
                                }}>
                                    CLASS TEACHER
                                </Text>
                            </View>
                        </View>

                        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                    </Pressable>
                ))
            )}
        </View>
    );

    const renderMySubjectsTab = () => (
        <View>
            {Object.keys(groupedSubjects).length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                    <MaterialIcons name="library-books" size={56} color={colors.textSecondary} />
                    <Text style={{
                        color: colors.textSecondary,
                        marginTop: 20,
                        fontSize: 16,
                        fontFamily: "DMSans-Medium"
                    }}>
                        No subjects assigned to you yet
                    </Text>
                    <Text style={{
                        color: colors.textSecondary,
                        marginTop: 8,
                        fontSize: 13,
                        fontFamily: "DMSans-Regular",
                        textAlign: "center",
                        paddingHorizontal: 40
                    }}>
                        Check &ldquo;My Subjects&rdquo; tab to see subjects you teach
                    </Text>
                </View>
            ) : (
                allMySubjects.map((subj) => (
                    <Pressable
                        key={subj._id}
                        onPress={() => router.push({
                            pathname: `/teacher/class/subject/${subj._id}`,
                            params: { id: subj.class._id, subjectId: subj._id }
                        })}
                        style={({ pressed }) => ({
                            backgroundColor: colors.cardBackground,
                            borderRadius: 12,
                            padding: 14,
                            marginBottom: 8,
                            marginLeft: 12,
                            opacity: pressed ? 0.9 : 1,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderLeftWidth: 3,
                            borderLeftColor: colors.primary
                        })}
                    >
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontFamily: "DMSans-SemiBold",
                                    color: colors.textPrimary
                                }}>
                                    {subj.class.name} {subj.class.section ? `- ${subj.class.section}` : ""}
                                </Text>
                                {subj.isClassTeacher && (
                                    <View style={{
                                        backgroundColor: colors.success + "20",
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 4
                                    }}>
                                        <Text style={{
                                            fontSize: 10,
                                            color: colors.success,
                                            fontFamily: "DMSans-Bold"
                                        }}>
                                            MY CLASS
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {subj.class.branch && (
                                <Text style={{
                                    fontSize: 12,
                                    color: colors.textSecondary,
                                    fontFamily: "DMSans-Regular",
                                    marginTop: 2
                                }}>
                                    {subj.class.branch}
                                </Text>
                            )}
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                    </Pressable>
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
                    <AppHeader title="My Teaching" subtitle="Manage your classes and subjects" />

                    {/* Quick Action: History */}
                    <Pressable
                        onPress={() => router.push("/history")}
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
                            <View style={{ backgroundColor: "#795548" + "20", padding: 10, borderRadius: 10 }}>
                                <MaterialIcons name="history" size={24} color="#795548" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    History
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                    View past exams
                                </Text>
                            </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                    </Pressable>

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <>
                            {/* Tab Switcher */}
                            <View style={{
                                flexDirection: "row",
                                backgroundColor: colors.cardBackground,
                                borderRadius: 12,
                                padding: 4,
                                marginBottom: 20
                            }}>
                                <Pressable
                                    onPress={() => setActiveTab('classTeacher')}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        backgroundColor: activeTab === 'classTeacher' ? colors.primary : 'transparent',
                                        alignItems: "center"
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 14,
                                        fontFamily: "DMSans-Bold",
                                        color: activeTab === 'classTeacher' ? '#fff' : colors.textSecondary
                                    }}>
                                        As Class Teacher
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => setActiveTab('mySubjects')}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        backgroundColor: activeTab === 'mySubjects' ? colors.primary : 'transparent',
                                        alignItems: "center"
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 14,
                                        fontFamily: "DMSans-Bold",
                                        color: activeTab === 'mySubjects' ? '#fff' : colors.textSecondary
                                    }}>
                                        My Subjects
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Tab Content */}
                            {activeTab === 'classTeacher' ? renderClassTeacherTab() : renderMySubjectsTab()}
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
