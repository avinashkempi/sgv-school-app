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
    StyleSheet,
    Alert,
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

export default function ClassesScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [academicYears, setAcademicYears] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [user, setUser] = useState(null);
    const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
    const [editingClassId, setEditingClassId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [form, setForm] = useState({
        name: "",
        section: "",
        branch: "Main",
        academicYear: "",
        classTeacher: ""
    });

    useEffect(() => {
        checkUserRole();
        loadData();
    }, []);

    const checkUserRole = async () => {
        try {
            const userData = await AsyncStorage.getItem("@auth_user");
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    };

    const loadData = async () => {
        const cacheKeyClasses = "@admin_classes";
        const cacheKeyYears = "@admin_academic_years";
        const cacheKeyUsers = "@admin_users";

        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // 1. Try to load from cache first
            const [cachedClasses, cachedYears, cachedUsers] = await Promise.all([
                getCachedData(cacheKeyClasses),
                getCachedData(cacheKeyYears),
                getCachedData(cacheKeyUsers)
            ]);

            if (cachedClasses && cachedYears && cachedUsers) {
                setClasses(cachedClasses);
                setAcademicYears(cachedYears);
                const teacherList = cachedUsers.data.filter(u => u.role === 'class teacher' || u.role === 'staff');
                setTeachers(teacherList);
                setLoading(false);
                console.log("[ADMIN_CLASSES] Loaded from cache");
            }

            // 2. Fetch from API (Silent refresh if cache exists)
            const fetchFromApi = async () => {
                // Load Classes
                const classesRes = await apiFetch(`${apiConfig.baseUrl}/classes`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedClasses
                });

                // Load Academic Years
                const yearsRes = await apiFetch(`${apiConfig.baseUrl}/academic-year`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedYears
                });

                // Load Users
                const usersRes = await apiFetch(`${apiConfig.url(apiConfig.endpoints.users.list)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedUsers
                });

                if (classesRes.ok && yearsRes.ok && usersRes.ok) {
                    const classesData = await classesRes.json();
                    const yearsData = await yearsRes.json();
                    const usersData = await usersRes.json();

                    setClasses(classesData);
                    setAcademicYears(yearsData);

                    const teacherList = usersData.data.filter(u => u.role === 'class teacher' || u.role === 'staff');
                    setTeachers(teacherList);

                    // Update Cache
                    await Promise.all([
                        setCachedData(cacheKeyClasses, classesData),
                        setCachedData(cacheKeyYears, yearsData),
                        setCachedData(cacheKeyUsers, usersData)
                    ]);

                    // Set default active academic year if not set
                    const activeYear = yearsData.find(y => y.isActive);
                    if (activeYear && !form.academicYear) {
                        setForm(prev => ({ ...prev, academicYear: activeYear._id }));
                    }
                    console.log("[ADMIN_CLASSES] Refreshed from API");
                } else {
                    if (!cachedClasses) showToast("Failed to load data", "error");
                }
            };

            await fetchFromApi();

        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.academicYear) {
            showToast("Name and Academic Year are required", "error");
            return;
        }

        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const url = modalMode === "create"
                ? `${apiConfig.baseUrl}/classes`
                : `${apiConfig.baseUrl}/classes/${editingClassId}`;

            const method = modalMode === "create" ? "POST" : "PUT";

            const response = await apiFetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (response.ok) {
                showToast(modalMode === "create" ? "Class created" : "Class updated", "success");
                setShowModal(false);
                setForm({ ...form, name: "", section: "" }); // Reset form but keep year/branch preference
                setModalMode("create");
                setEditingClassId(null);
                loadData();
            } else {
                const data = await response.json();
                showToast(data.msg || "Failed to save", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error saving class", "error");
        }
    };

    const handleEdit = (cls) => {
        setForm({
            name: cls.name,
            section: cls.section || "",
            branch: cls.branch,
            academicYear: cls.academicYear?._id || cls.academicYear,
            classTeacher: cls.classTeacher?._id || cls.classTeacher || ""
        });
        setModalMode("edit");
        setEditingClassId(cls._id);
        setShowModal(true);
    };

    const handleDelete = async (classId, className) => {
        Alert.alert(
            "Delete Class",
            `Are you sure you want to delete ${className}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        console.log("[DELETE_CLASS] Attempting to delete:", classId);
                        setDeletingId(classId);
                        try {
                            const token = await AsyncStorage.getItem("@auth_token");
                            const response = await apiFetch(`${apiConfig.baseUrl}/classes/${classId}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                            });

                            console.log("[DELETE_CLASS] Response status:", response.status);

                            if (response.ok) {
                                // Optimistic Update
                                const updatedClasses = classes.filter(c => c._id !== classId);
                                setClasses(updatedClasses);

                                // Update Cache
                                await setCachedData("@admin_classes", updatedClasses);

                                showToast("Class deleted", "success");
                            } else {
                                let errorMsg = "Failed to delete";
                                try {
                                    const text = await response.text();
                                    console.log("[DELETE_CLASS] Raw error response:", text);
                                    try {
                                        const data = JSON.parse(text);
                                        errorMsg = data.msg || data.message || data.error || JSON.stringify(data);
                                    } catch {
                                        errorMsg = text.substring(0, 100); // Limit length if raw text
                                    }
                                } catch (e) {
                                    console.error("[DELETE_CLASS] Error reading response:", e);
                                }
                                // Fallback to Alert since Toast is reported invisible
                                Alert.alert("Deletion Failed", errorMsg);
                            }
                        } catch (error) {
                            console.error("[DELETE_CLASS] Error:", error);
                            Alert.alert("Error", "An unexpected error occurred while deleting the class.");
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header title="Classes" subtitle="Manage classes and sections" showBack />

                    <View style={{ marginTop: 16 }}>
                        {classes.map((cls) => (
                            <Pressable
                                key={cls._id}
                                onPress={() => {
                                    // Navigate to teacher's class view
                                    router.push(`/teacher/class/${cls._id}`);
                                }}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.cardBackground,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 12,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    opacity: pressed ? 0.9 : 1,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1,
                                })}
                            >
                                <View>
                                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                                        {cls.name} {cls.section ? `- ${cls.section}` : ""}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                                        {cls.academicYear?.name} • {cls.branch}
                                    </Text>
                                    {cls.classTeacher && (
                                        <Text style={{ fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: "500" }}>
                                            Teacher: {cls.classTeacher.name}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {user?.role === 'super admin' && (
                                        <>
                                            <Pressable
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(cls);
                                                }}
                                                style={{ padding: 8 }}
                                            >
                                                <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
                                            </Pressable>
                                            {deletingId === cls._id ? (
                                                <View style={{ padding: 8 }}>
                                                    <ActivityIndicator size="small" color={colors.error} />
                                                </View>
                                            ) : (
                                                <Pressable
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(cls._id, cls.name);
                                                    }}
                                                    style={{ padding: 8 }}
                                                >
                                                    <MaterialIcons name="delete" size={20} color={colors.error} />
                                                </Pressable>
                                            )}
                                        </>
                                    )}
                                    <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <Pressable
                onPress={() => {
                    setModalMode("create");
                    setForm({ ...form, name: "", section: "" });
                    setShowModal(true);
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
                }}
            >
                <MaterialIcons name="add" size={28} color="#fff" />
            </Pressable>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                            {modalMode === "create" ? "New Class" : "Edit Class"}
                        </Text>

                        <TextInput
                            placeholder="Class Name (e.g. 1st Standard)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 12
                            }}
                            value={form.name}
                            onChangeText={(t) => setForm({ ...form, name: t })}
                        />

                        <TextInput
                            placeholder="Section (Optional, e.g. A)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 12
                            }}
                            value={form.section}
                            onChangeText={(t) => setForm({ ...form, section: t })}
                        />

                        {/* Simple Dropdown for Academic Year (Simplified as text input for now or list) */}
                        {/* In a real app, use a proper Picker/Select component */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12 }}>Academic Year</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {academicYears.map(year => (
                                    <Pressable
                                        key={year._id}
                                        onPress={() => setForm({ ...form, academicYear: year._id })}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            backgroundColor: form.academicYear === year._id ? colors.primary : colors.background,
                                            borderRadius: 8,
                                            marginRight: 8,
                                            borderWidth: 1,
                                            borderColor: form.academicYear === year._id ? colors.primary : colors.border
                                        }}
                                    >
                                        <Text style={{ color: form.academicYear === year._id ? '#fff' : colors.textPrimary }}>
                                            {year.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Simple Dropdown for Teacher */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12 }}>Class Teacher (Optional)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {teachers.map(teacher => (
                                    <Pressable
                                        key={teacher._id}
                                        onPress={() => setForm({ ...form, classTeacher: teacher._id })}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            backgroundColor: form.classTeacher === teacher._id ? colors.primary : colors.background,
                                            borderRadius: 8,
                                            marginRight: 8,
                                            borderWidth: 1,
                                            borderColor: form.classTeacher === teacher._id ? colors.primary : colors.border
                                        }}
                                    >
                                        <Text style={{ color: form.classTeacher === teacher._id ? '#fff' : colors.textPrimary }}>
                                            {teacher.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                            <Pressable onPress={() => setShowModal(false)} style={{ padding: 12 }}>
                                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSubmit}
                                style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {modalMode === "create" ? "Create" : "Update"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
