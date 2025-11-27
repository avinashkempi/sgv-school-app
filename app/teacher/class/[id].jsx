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
    FlatList
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
    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState("subjects"); // subjects, students
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState(null);

    const [subjectName, setSubjectName] = useState("");
    const [globalSubjects, setGlobalSubjects] = useState([]);
    const [selectedGlobalSubject, setSelectedGlobalSubject] = useState(null);

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
            // Fetch with high limit to get all students for client-side filtering
            // TODO: Implement server-side search for better performance
            const response = await apiFetch(`${apiConfig.baseUrl}/users?role=student&limit=1000`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const result = await response.json();
                // Handle both new paginated structure and potential old array structure
                const users = Array.isArray(result) ? result : (result.data || []);
                const unassigned = users.filter(s => !s.currentClass);
                setAvailableStudents(unassigned);
            } else {
                showToast("Failed to load available students", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading available students", "error");
        }
    };

    const loadGlobalSubjects = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/subjects`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setGlobalSubjects(data);
            }
        } catch (error) {
            console.error("Failed to load global subjects:", error);
        }
    };

    const handleAddSubject = async () => {
        if (!selectedGlobalSubject) {
            showToast("Please select a subject", "error");
            return;
        }

        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/subjects`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: selectedGlobalSubject.name,
                    globalSubjectId: selectedGlobalSubject._id
                }),
            });

            if (response.ok) {
                showToast("Subject added successfully", "success");
                setShowAddSubjectModal(false);
                setSelectedGlobalSubject(null);
                setSearchQuery("");
                loadData(); // Reload subjects
            } else {
                const data = await response.json();
                showToast(data.msg || "Failed to add subject", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error adding subject", "error");
        } finally {
            setSaving(false);
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

    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const toggleStudentSelection = (studentId) => {
        setSelectedStudentIds(prev => {
            if (prev.includes(studentId)) {
                return prev.filter(id => id !== studentId);
            } else {
                return [...prev, studentId];
            }
        });
    };

    const handleBulkAddStudents = async () => {
        if (selectedStudentIds.length === 0) {
            showToast("Please select at least one student", "error");
            return;
        }

        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/students`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ studentIds: selectedStudentIds }),
            });

            if (response.ok) {
                const data = await response.json();
                showToast(data.message || "Students added successfully", "success");
                setShowAddStudentModal(false);
                setSearchQuery("");
                setSelectedStudentIds([]);
                loadData();
            } else {
                const data = await response.json();
                showToast(data.message || "Failed to add students", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error adding students", "error");
        } finally {
            setSaving(false);
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

        return String(teacherId) === String(userId);
    })();

    const canManageClass = (() => {
        if (!user) return false;
        return user.role === 'admin' || user.role === 'super admin';
    })();

    console.log("User:", user);
    console.log("ClassData:", classData);
    console.log("Is Class Teacher:", isClassTeacher);
    console.log("Can Manage Class:", canManageClass);


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

                    {/* Mark Attendance Button */}
                    <Pressable
                        onPress={() => router.push({
                            pathname: "/teacher/class/attendance",
                            params: { classId: id }
                        })}
                        style={({ pressed }) => ({
                            backgroundColor: colors.primary,
                            borderRadius: 12,
                            padding: 16,
                            marginTop: 20,
                            marginBottom: 24,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: " center",
                            gap: 10,
                            opacity: pressed ? 0.9 : 1,
                            elevation: 3
                        })}
                    >
                        <MaterialIcons name="fact-check" size={24} color="#fff" />
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: "#fff" }}>
                            Mark Attendance
                        </Text>
                    </Pressable>

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
                                            {canManageClass && (
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
                                            {canManageClass && (
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
                    )
                    }

                </View >
            </ScrollView >

            {/* FAB for Add Subject or Add Student */}
            {
                canManageClass && (
                    <Pressable
                        onPress={() => {
                            if (activeTab === "subjects") {
                                loadGlobalSubjects();
                                setShowAddSubjectModal(true);
                                setSearchQuery("");
                            } else {
                                loadAvailableStudents();
                                setShowAddStudentModal(true);
                                setSelectedStudentIds([]); // Reset selection
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
                )
            }

            {/* Add Subject Modal */}
            <Modal visible={showAddSubjectModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                            Add New Subject
                        </Text>

                        <TextInput
                            placeholder="Search subjects..."
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

                        <View style={{ height: 300 }}>
                            <FlatList
                                data={globalSubjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => setSelectedGlobalSubject(item)}
                                        style={{
                                            padding: 12,
                                            borderRadius: 8,
                                            backgroundColor: selectedGlobalSubject?._id === item._id ? colors.primary + "20" : colors.background,
                                            marginBottom: 8,
                                            borderWidth: 1,
                                            borderColor: selectedGlobalSubject?._id === item._id ? colors.primary : "transparent",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 16,
                                            color: selectedGlobalSubject?._id === item._id ? colors.primary : colors.textPrimary,
                                            fontWeight: selectedGlobalSubject?._id === item._id ? "600" : "400"
                                        }}>
                                            {item.name}
                                        </Text>
                                        {selectedGlobalSubject?._id === item._id && (
                                            <MaterialIcons name="check" size={20} color={colors.primary} />
                                        )}
                                    </Pressable>
                                )}
                                ListEmptyComponent={
                                    <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 20 }}>
                                        No subjects found. Please ask admin to add it to the master list.
                                    </Text>
                                }
                            />
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                            <Pressable
                                onPress={() => {
                                    setShowAddSubjectModal(false);
                                    setSelectedGlobalSubject(null);
                                    setSearchQuery("");
                                }}
                                style={{ padding: 12 }}
                            >
                                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleAddSubject}
                                disabled={saving}
                                style={{
                                    backgroundColor: saving ? colors.disabled : colors.primary,
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8
                                }}
                            >
                                {saving && <ActivityIndicator size="small" color="#fff" />}
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {saving ? "Adding..." : "Add Subject"}
                                </Text>
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
                            Add Students to Class
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
                                filteredAvailableStudents.map((student) => {
                                    const isSelected = selectedStudentIds.includes(student._id);
                                    return (
                                        <Pressable
                                            key={student._id}
                                            onPress={() => toggleStudentSelection(student._id)}
                                            style={({ pressed }) => ({
                                                backgroundColor: isSelected ? colors.primary + "10" : (pressed ? colors.background : colors.cardBackground),
                                                borderRadius: 12,
                                                padding: 12,
                                                marginBottom: 8,
                                                borderWidth: 1,
                                                borderColor: isSelected ? colors.primary : colors.border,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 12
                                            })}
                                        >
                                            <View style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: isSelected ? colors.primary : colors.textSecondary,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: isSelected ? colors.primary : "transparent"
                                            }}>
                                                {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                                            </View>
                                            <View style={{ flex: 1 }}>
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
                                            </View>
                                        </Pressable>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                            <Pressable
                                onPress={() => {
                                    setShowAddStudentModal(false);
                                    setSearchQuery("");
                                    setSelectedStudentIds([]);
                                }}
                                style={{ padding: 12 }}
                            >
                                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleBulkAddStudents}
                                disabled={selectedStudentIds.length === 0 || saving}
                                style={{
                                    backgroundColor: (selectedStudentIds.length > 0 && !saving) ? colors.primary : colors.disabled,
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8
                                }}
                            >
                                {saving && <ActivityIndicator size="small" color="#fff" />}
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {saving ? "Adding..." : `Add ${selectedStudentIds.length > 0 ? `${selectedStudentIds.length} ` : ""}Selected`}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}
