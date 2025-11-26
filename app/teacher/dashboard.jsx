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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function TeacherDashboard() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('classTeacher'); // 'classTeacher' or 'mySubjects'

    // Data from API
    const [asClassTeacher, setAsClassTeacher] = useState([]);
    const [allMySubjects, setAllMySubjects] = useState([]);

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

            // Call new unified endpoint
            const response = await apiFetch(
                `${apiConfig.baseUrl}/teachers/my-classes-and-subjects`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setAsClassTeacher(data.asClassTeacher || []);
                setAllMySubjects(data.allMySubjects || []);
            } else {
                showToast("Failed to load data", "error");
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
                        Check "My Subjects" tab to see subjects you teach
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
                        Contact admin to assign subjects
                    </Text>
                </View>
            ) : (
                Object.entries(groupedSubjects).map(([subjectName, classes]) => (
                    <View key={subjectName} style={{ marginBottom: 20 }}>
                        {/* Subject Header */}
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 12,
                            gap: 8
                        }}>
                            <View style={{
                                backgroundColor: colors.primary + "20",
                                padding: 8,
                                borderRadius: 8
                            }}>
                                <MaterialIcons name="book" size={20} color={colors.primary} />
                            </View>
                            <Text style={{
                                fontSize: 17,
                                fontFamily: "DMSans-Bold",
                                color: colors.textPrimary
                            }}>
                                {subjectName}
                            </Text>
                            <View style={{
                                backgroundColor: colors.textSecondary + "20",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 10
                            }}>
                                <Text style={{
                                    fontSize: 11,
                                    color: colors.textSecondary,
                                    fontFamily: " DMSans-Bold"
                                }}>
                                    {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                                </Text>
                            </View>
                        </View>

                        {/* Classes for this subject */}
                        {classes.map((subj) => (
                            <Pressable
                                key={subj._id}
                                onPress={() => router.push({
                                    pathname: "/teacher/class/subject/[subjectId]",
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
                        ))}
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
                    <Header title="My Teaching" subtitle="Manage your classes and subjects" />

                    {/* Quick Action: Leave Requests */}
                    <Pressable
                        onPress={() => router.push("/teacher/leaves")}
                        style={({ pressed }) => ({
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 16,
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
                                <MaterialIcons name="approval" size={24} color="#FF9800" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    Leave Requests
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                    Approve or reject student leaves
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
