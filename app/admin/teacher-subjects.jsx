import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function TeacherSubjectsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        checkAuthAndLoadData();
    }, []);

    const checkAuthAndLoadData = async () => {
        try {
            const storedUser = await AsyncStorage.getItem("@auth_user");
            const token = await AsyncStorage.getItem("@auth_token");

            if (!storedUser || !token) {
                router.replace("/login");
                return;
            }

            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role !== "admin" && parsedUser.role !== "super admin") {
                showToast("Access denied", "error");
                router.replace("/");
                return;
            }

            await loadData();
        } catch (error) {
            console.error("Auth check error:", error);
            router.replace("/login");
        }
    };

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await apiFetch(
                `${apiConfig.baseUrl}/teachers/admin/teacher-subject-matrix`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setTeachers(data.teachers || []);
                setSubjects(data.subjects || []);
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

    const filteredTeachers = teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAssignSubject = async (subjectId, teacherId) => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await apiFetch(
                `${apiConfig.baseUrl}/teachers/subjects/${subjectId}/assign`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ teacherId }),
                }
            );

            if (response.ok) {
                showToast("Teacher assigned successfully", "success");
                await loadData();
                setShowModal(false);
            } else {
                const error = await response.json();
                showToast(error.message || "Failed to assign teacher", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error assigning teacher", "error");
        }
    };

    const handleRemoveSubject = async (subjectId, teacherId) => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await apiFetch(
                `${apiConfig.baseUrl}/teachers/subjects/${subjectId}/teachers/${teacherId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                showToast("Teacher removed successfully", "success");
                await loadData();
            } else {
                showToast("Failed to remove teacher", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error removing teacher", "error");
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
                        title="Teacher-Subject Assignments"
                        subtitle="Manage which teachers teach which subjects"
                    />

                    {/* Search Bar */}
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.cardBackground,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        height: 50,
                        marginTop: 16,
                        marginBottom: 20,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}>
                        <MaterialIcons name="search" size={22} color={colors.textSecondary} />
                        <TextInput
                            style={{
                                flex: 1,
                                marginLeft: 12,
                                fontSize: 16,
                                color: colors.textPrimary,
                                height: "100%",
                            }}
                            placeholder="Search teachers..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery("")}>
                                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                            </Pressable>
                        )}
                    </View>

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <>
                            {/* Teachers List */}
                            {filteredTeachers.length === 0 ? (
                                <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                                    <MaterialIcons name="search-off" size={56} color={colors.textSecondary} />
                                    <Text style={{
                                        color: colors.textSecondary,
                                        marginTop: 20,
                                        fontSize: 16,
                                        fontFamily: "DMSans-Medium"
                                    }}>
                                        No teachers found
                                    </Text>
                                </View>
                            ) : (
                                filteredTeachers.map((teacher) => (
                                    <View
                                        key={teacher._id}
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 16,
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 6,
                                            elevation: 2,
                                        }}
                                    >
                                        {/* Teacher Header */}
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 18,
                                                    fontFamily: "DMSans-Bold",
                                                    color: colors.textPrimary
                                                }}>
                                                    {teacher.name}
                                                </Text>
                                                {teacher.email && (
                                                    <Text style={{
                                                        fontSize: 13,
                                                        color: colors.textSecondary,
                                                        fontFamily: "DMSans-Regular",
                                                        marginTop: 2
                                                    }}>
                                                        {teacher.email}
                                                    </Text>
                                                )}
                                                <View style={{
                                                    backgroundColor: colors.primary + "15",
                                                    alignSelf: "flex-start",
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 2,
                                                    borderRadius: 4,
                                                    marginTop: 6
                                                }}>
                                                    <Text style={{
                                                        fontSize: 11,
                                                        color: colors.primary,
                                                        fontFamily: "DMSans-Bold",
                                                        textTransform: "uppercase"
                                                    }}>
                                                        {teacher.role}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Pressable
                                                onPress={() => {
                                                    setSelectedTeacher(teacher);
                                                    setShowModal(true);
                                                }}
                                                style={({ pressed }) => ({
                                                    backgroundColor: colors.primary,
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    borderRadius: 8,
                                                    opacity: pressed ? 0.8 : 1
                                                })}
                                            >
                                                <Text style={{
                                                    color: "#fff",
                                                    fontSize: 13,
                                                    fontFamily: "DMSans-Bold"
                                                }}>
                                                    Assign
                                                </Text>
                                            </Pressable>
                                        </View>

                                        {/* Assigned Subjects */}
                                        {teacher.subjects && teacher.subjects.length > 0 ? (
                                            <>
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontFamily: "DMSans-Bold",
                                                    color: colors.textSecondary,
                                                    marginBottom: 8,
                                                    textTransform: "uppercase"
                                                }}>
                                                    Assigned Subjects ({teacher.subjects.length})
                                                </Text>
                                                {teacher.subjects.map((subject) => (
                                                    <View
                                                        key={subject._id}
                                                        style={{
                                                            flexDirection: "row",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            backgroundColor: colors.background,
                                                            borderRadius: 8,
                                                            padding: 10,
                                                            marginBottom: 6
                                                        }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{
                                                                fontSize: 15,
                                                                fontFamily: "DMSans-SemiBold",
                                                                color: colors.textPrimary
                                                            }}>
                                                                {subject.name}
                                                            </Text>
                                                            <Text style={{
                                                                fontSize: 12,
                                                                color: colors.textSecondary,
                                                                fontFamily: "DMSans-Regular",
                                                                marginTop: 2
                                                            }}>
                                                                {subject.class.name} {subject.class.section ? `- ${subject.class.section}` : ""}
                                                            </Text>
                                                        </View>
                                                        <Pressable
                                                            onPress={() => handleRemoveSubject(subject._id, teacher._id)}
                                                            style={({ pressed }) => ({
                                                                padding: 6,
                                                                backgroundColor: colors.error + "15",
                                                                borderRadius: 6,
                                                                opacity: pressed ? 0.7 : 1
                                                            })}
                                                        >
                                                            <MaterialIcons name="close" size={18} color={colors.error} />
                                                        </Pressable>
                                                    </View>
                                                ))}
                                            </>
                                        ) : (
                                            <Text style={{
                                                fontSize: 13,
                                                color: colors.textSecondary,
                                                fontStyle: "italic",
                                                fontFamily: "DMSans-Regular"
                                            }}>
                                                No subjects assigned yet
                                            </Text>
                                        )}
                                    </View>
                                ))
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Assign Subject Modal */}
            <Modal
                visible={showModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowModal(false)}
            >
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <View style={{
                        backgroundColor: colors.cardBackground,
                        borderRadius: 20,
                        padding: 24,
                        width: "90%",
                        maxWidth: 500,
                        maxHeight: "80%",
                    }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                Assign Subject to {selectedTeacher?.name}
                            </Text>
                            <Pressable onPress={() => setShowModal(false)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {subjects.map((subject) => {
                                const isAssigned = subject.teachers.some(t => t._id === selectedTeacher?._id);

                                return (
                                    <Pressable
                                        key={subject._id}
                                        onPress={() => {
                                            if (!isAssigned) {
                                                handleAssignSubject(subject._id, selectedTeacher._id);
                                            }
                                        }}
                                        disabled={isAssigned}
                                        style={({ pressed }) => ({
                                            backgroundColor: isAssigned ? colors.success + "10" : colors.background,
                                            borderRadius: 12,
                                            padding: 14,
                                            marginBottom: 10,
                                            opacity: isAssigned ? 0.6 : (pressed ? 0.9 : 1),
                                            borderWidth: isAssigned ? 1 : 0,
                                            borderColor: colors.success
                                        })}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 16,
                                                    fontFamily: "DMSans-SemiBold",
                                                    color: colors.textPrimary
                                                }}>
                                                    {subject.name}
                                                </Text>
                                                <Text style={{
                                                    fontSize: 13,
                                                    color: colors.textSecondary,
                                                    fontFamily: "DMSans-Regular",
                                                    marginTop: 2
                                                }}>
                                                    {subject.class.name} {subject.class.section ? `- ${subject.class.section}` : ""}
                                                </Text>
                                            </View>
                                            {isAssigned && (
                                                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                                            )}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
