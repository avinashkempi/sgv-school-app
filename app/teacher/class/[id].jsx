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
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import apiFetch from "../../../utils/apiFetch";
import { useToast } from "../../../components/ToastProvider";
import Header from "../../../components/Header";
import { formatDate } from "../../../utils/date";
import { getCachedData, setCachedData } from "../../../utils/cache";
import { useNetworkStatus } from "../../../components/NetworkStatusProvider";

export default function ClassDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const { isConnected } = useNetworkStatus();

    const [classData, setClassData] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);

    const [activeTab, setActiveTab] = useState("subjects"); // subjects, students
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState(null);

    const [subjectName, setSubjectName] = useState("");

    useEffect(() => {
        loadUserData();
        loadData();
    }, [id]);



    const loadUserData = async () => {
        try {
            const storedUser = await AsyncStorage.getItem("@auth_user");
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            }
        } catch (error) {
            console.error("Failed to load user:", error);
        }
    };

    const loadData = async () => {
        const cacheKeyClass = `@class_details_${id}`;
        const cacheKeySubjects = `@class_subjects_${id}`;
        const cacheKeyStudents = `@class_students_${id}`;

        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // 1. Try to load from cache first
            const [cachedClass, cachedSubjects, cachedStudents] = await Promise.all([
                getCachedData(cacheKeyClass),
                getCachedData(cacheKeySubjects),
                getCachedData(cacheKeyStudents)
            ]);

            if (cachedClass && cachedSubjects) {
                setClassData(cachedClass);
                setSubjects(cachedSubjects);
                if (cachedStudents) setStudents(cachedStudents);
                setLoading(false);
                console.log(`[CLASS] Loaded class ${id} from cache`);
            }

            // 2. Fetch from API (Silent refresh if cache exists)
            const fetchFromApi = async () => {
                const response = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/full-details`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedClass
                });

                if (response.ok) {
                    const data = await response.json();
                    const { classData, subjects, students } = data;

                    if (classData) {
                        setClassData(classData);
                        setCachedData(cacheKeyClass, classData);
                    }
                    setSubjects(subjects);
                    setCachedData(cacheKeySubjects, subjects);

                    setStudents(students);
                    setCachedData(cacheKeyStudents, students);

                    console.log(`[CLASS] Refreshed class ${id} from API`);
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
            if (!classData) showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };



    const loadAvailableStudents = async () => {
        // No caching for available students as it changes frequently and is an admin action
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/users?role=student`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                const unassigned = data.filter(s => !s.currentClass);
                setAvailableStudents(unassigned);
            } else {
                showToast("Failed to load available students", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading available students", "error");
        }
    };

    const handleAddSubject = async () => {
        if (!subjectName.trim()) {
            showToast("Subject name is required", "error");
            return;
        }

        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/subjects`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: subjectName }),
            });

            if (response.ok) {
                showToast("Subject added successfully", "success");
                setShowAddSubjectModal(false);
                setSubjectName("");
                loadData(); // Reload subjects
            } else {
                const data = await response.json();
                showToast(data.msg || "Failed to add subject", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error adding subject", "error");
        }
    };

    const handleRemoveSubject = (subjectId, subjectName) => {
        Alert.alert(
            "Remove Subject",
            `Are you sure you want to remove ${subjectName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("@auth_token");
                            const response = await apiFetch(
                                `${apiConfig.baseUrl}/classes/${id}/subjects/${subjectId}`,
                                {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );

                            if (response.ok) {
                                showToast("Subject removed successfully", "success");
                                loadData(); // Reload subjects
                            } else {
                                const data = await response.json();
                                showToast(data.msg || "Failed to remove subject", "error");
                            }
                        } catch (error) {
                            console.error(error);
                            showToast("Error removing subject", "error");
                        }
                    },
                },
            ]
        );
    };

    const handleAddStudent = async (studentId) => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/students`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ studentId }),
            });

            if (response.ok) {
                showToast("Student added successfully", "success");
                setShowAddStudentModal(false);
                setSearchQuery("");
                loadData();
            } else {
                const data = await response.json();
                showToast(data.message || "Failed to add student", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error adding student", "error");
        }
    };

    const handleRemoveStudent = (studentId, studentName) => {
        Alert.alert(
            "Remove Student",
            `Are you sure you want to remove ${studentName} from this class?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("@auth_token");
                            const response = await apiFetch(
                                `${apiConfig.baseUrl}/classes/${id}/students/${studentId}`,
                                {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );

                            if (response.ok) {
                                showToast("Student removed successfully", "success");
                                loadData();
                            } else {
                                const data = await response.json();
                                showToast(data.message || "Failed to remove student", "error");
                            }
                        } catch (error) {
                            console.error(error);
                            showToast("Error removing student", "error");
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadData();
            await loadData();
        } finally {
            setRefreshing(false);
        }
    };

    const isClassTeacher = (() => {
        if (!user || !classData || !classData.classTeacher) return false;

        const teacherId = typeof classData.classTeacher === 'object' ? classData.classTeacher._id : classData.classTeacher;
        const userId = user._id || user.id;

        console.log(`[CLASS_DETAILS] Checking teacher: Class Teacher ${teacherId} vs User ${userId}`);

        return String(teacherId) === String(userId);
    })();

    console.log("User:", user);
    console.log("ClassData:", classData);
    console.log("Is Class Teacher:", isClassTeacher);


    const filteredAvailableStudents = availableStudents.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title={classData ? `${classData.name} ${classData.section || ''}` : "Class Details"}
                        subtitle="Manage subjects and students"
                        showBack
                    />

                    {/* Tabs */}
                    <View style={{ flexDirection: "row", marginBottom: 24, backgroundColor: colors.cardBackground, padding: 4, borderRadius: 12 }}>
                        <Pressable
                            onPress={() => setActiveTab("subjects")}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === "subjects" ? colors.primary : "transparent",
                                borderRadius: 8
                            }}
                        >
                            <Text style={{ fontWeight: "600", color: activeTab === "subjects" ? "#fff" : colors.textSecondary }}>Subjects</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab("students")}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === "students" ? colors.primary : "transparent",
                                borderRadius: 8
                            }}
                        >
                            <Text style={{ fontWeight: "600", color: activeTab === "students" ? "#fff" : colors.textSecondary }}>Students</Text>
                        </Pressable>
                    </View>

                    {activeTab === "subjects" ? (
                        <View>
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
                                            pathname: "/teacher/class/subject/[subjectId]",
                                            params: { id, subjectId: subject._id }
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

                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            {isClassTeacher && (
                                                <Pressable
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveSubject(subject._id, subject.name);
                                                    }}
                                                    style={{ padding: 8 }}
                                                >
                                                    <MaterialIcons name="delete-outline" size={24} color={colors.error} />
                                                </Pressable>
                                            )}
                                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                        </View>
                                    </Pressable>
                                ))
                            )}
                        </View>
                    ) : (
                        <View>
                            {students.length === 0 ? (
                                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                    <MaterialIcons name="people-outline" size={48} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                        No students in this class yet.
                                    </Text>
                                </View>
                            ) : (
                                students.map((student) => (
                                    <View
                                        key={student._id}
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
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
                                                    {student.name}
                                                </Text>
                                                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                                                    {student.phone}
                                                </Text>
                                                {student.email && (
                                                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                                                        {student.email}
                                                    </Text>
                                                )}
                                                {student.guardianName && (
                                                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>
                                                        Guardian: {student.guardianName}
                                                        {student.guardianPhone && ` (${student.guardianPhone})`}
                                                    </Text>
                                                )}
                                                {student.admissionDate && (
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                        Admitted: {formatDate(student.admissionDate)}
                                                    </Text>
                                                )}
                                            </View>
                                            {isClassTeacher && (
                                                <Pressable
                                                    onPress={() => handleRemoveStudent(student._id, student.name)}
                                                    style={{ padding: 8 }}
                                                >
                                                    <MaterialIcons name="remove-circle-outline" size={24} color={colors.error} />
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                </View>
            </ScrollView>

            {/* FAB for Add Subject or Add Student */}
            {isClassTeacher && (
                <Pressable
                    onPress={() => {
                        if (activeTab === "subjects") {
                            setShowAddSubjectModal(true);
                        } else {
                            loadAvailableStudents();
                            setShowAddStudentModal(true);
                        }
                    }}
                    style={{
                        position: "absolute",
                        bottom: 90,
                        right: 24,
                        backgroundColor: colors.primary,
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        justifyContent: "center",
                        alignItems: "center",
                        elevation: 6,
                        zIndex: 9999,
                    }}
                >
                    <MaterialIcons name="add" size={28} color="#fff" />
                </Pressable>
            )}

            {/* Add Subject Modal */}
            <Modal visible={showAddSubjectModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                            Add New Subject
                        </Text>

                        <TextInput
                            placeholder="Subject Name (e.g. Mathematics)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 24
                            }}
                            value={subjectName}
                            onChangeText={setSubjectName}
                            autoFocus
                        />

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                            <Pressable
                                onPress={() => {
                                    setShowAddSubjectModal(false);
                                    setSubjectName("");
                                }}
                                style={{ padding: 12 }}
                            >
                                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleAddSubject}
                                style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>Add Subject</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Student Modal */}
            <Modal visible={showAddStudentModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24, maxHeight: "80%" }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                            Add Student to Class
                        </Text>

                        <TextInput
                            placeholder="Search by name or phone..."
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 16
                            }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />

                        <ScrollView style={{ maxHeight: 400 }}>
                            {filteredAvailableStudents.length === 0 ? (
                                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                                    <MaterialIcons name="person-off" size={48} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
                                        {searchQuery ? "No students found" : "No unassigned students available"}
                                    </Text>
                                </View>
                            ) : (
                                filteredAvailableStudents.map((student) => (
                                    <Pressable
                                        key={student._id}
                                        onPress={() => handleAddStudent(student._id)}
                                        style={({ pressed }) => ({
                                            backgroundColor: pressed ? colors.background : colors.cardBackground,
                                            borderRadius: 12,
                                            padding: 12,
                                            marginBottom: 8,
                                            borderWidth: 1,
                                            borderColor: colors.border
                                        })}
                                    >
                                        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
                                            {student.name}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                                            {student.phone}
                                        </Text>
                                        {student.admissionDate && (
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                Admitted: {formatDate(student.admissionDate)}
                                            </Text>
                                        )}
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>

                        <Pressable
                            onPress={() => {
                                setShowAddStudentModal(false);
                                setSearchQuery("");
                            }}
                            style={{ marginTop: 16, padding: 12, alignItems: "center" }}
                        >
                            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
