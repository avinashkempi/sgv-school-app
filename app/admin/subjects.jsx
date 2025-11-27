import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function ManageSubjectsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Create/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
    const [editingSubject, setEditingSubject] = useState(null);
    const [form, setForm] = useState({ name: "", code: "", type: "Theory" });
    const [saving, setSaving] = useState(false);

    // Details Modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [usageDetails, setUsageDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/subjects`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSubjects(data);
            } else {
                showToast("Failed to load subjects", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading subjects", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadUsageDetails = async (subjectId) => {
        setLoadingDetails(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/subjects/${subjectId}/usage`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUsageDetails(data);
            } else {
                showToast("Failed to load usage details", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading usage details", "error");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSave = async () => {
        if (!form.name) {
            showToast("Subject name is required", "error");
            return;
        }

        setSaving(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const url = modalMode === "add"
                ? `${apiConfig.baseUrl}/subjects`
                : `${apiConfig.baseUrl}/subjects/${editingSubject._id}`;
            const method = modalMode === "add" ? "POST" : "PUT";

            const response = await apiFetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (response.ok) {
                showToast(`Subject ${modalMode === "add" ? "created" : "updated"}`, "success");
                setShowModal(false);
                setForm({ name: "", code: "", type: "Theory" });
                loadSubjects();
            } else {
                showToast(data.msg || "Failed to save", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error saving subject", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        Alert.alert(
            "Delete Subject",
            `Are you sure you want to delete ${name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("@auth_token");
                            const response = await apiFetch(`${apiConfig.baseUrl}/subjects/${id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` }
                            });

                            if (response.ok) {
                                showToast("Subject deleted", "success");
                                loadSubjects();
                            } else {
                                const data = await response.json();
                                showToast(data.msg || "Failed to delete", "error");
                            }
                        } catch (error) {
                            console.error(error);
                            showToast("Error deleting subject", "error");
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadSubjects();
    };

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="Manage Subjects" subtitle="Master List" showBack />

                {/* Search */}
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    height: 50,
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: colors.border
                }}>
                    <MaterialIcons name="search" size={22} color={colors.textSecondary} />
                    <TextInput
                        style={{ flex: 1, marginLeft: 12, fontSize: 16, color: colors.textPrimary }}
                        placeholder="Search subjects..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : filteredSubjects.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                        <MaterialIcons name="menu-book" size={48} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No subjects found</Text>
                    </View>
                ) : (
                    filteredSubjects.map((subject) => (
                        <Pressable
                            key={subject._id}
                            onPress={() => {
                                setSelectedSubject(subject);
                                loadUsageDetails(subject._id);
                                setShowDetailsModal(true);
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
                                shadowRadius: 2,
                                elevation: 1
                            })}
                        >
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
                                    {subject.name}
                                </Text>
                                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                                    {subject.code && (
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                            {subject.code}
                                        </Text>
                                    )}
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        {subject.type}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <Pressable
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        setModalMode("edit");
                                        setEditingSubject(subject);
                                        setForm({ name: subject.name, code: subject.code || "", type: subject.type });
                                        setShowModal(true);
                                    }}
                                    style={{ padding: 8, backgroundColor: colors.background, borderRadius: 8 }}
                                >
                                    <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
                                </Pressable>
                                <Pressable
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleDelete(subject._id, subject.name);
                                    }}
                                    style={{ padding: 8, backgroundColor: colors.error + "15", borderRadius: 8 }}
                                >
                                    <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                                </Pressable>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={() => {
                    setModalMode("add");
                    setForm({ name: "", code: "", type: "Theory" });
                    setShowModal(true);
                }}
                style={{
                    position: "absolute",
                    bottom: 32,
                    right: 24,
                    backgroundColor: colors.primary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 6,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8
                }}
            >
                <MaterialIcons name="add" size={28} color="#fff" />
            </Pressable>

            {/* Create/Edit Modal */}
            <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary }}>
                                {modalMode === "add" ? "New Subject" : "Edit Subject"}
                            </Text>
                            <Pressable onPress={() => setShowModal(false)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>NAME</Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.background,
                                borderRadius: 12,
                                padding: 12,
                                fontSize: 16,
                                color: colors.textPrimary,
                                marginBottom: 16
                            }}
                            placeholder="e.g. Mathematics"
                            placeholderTextColor={colors.textSecondary}
                            value={form.name}
                            onChangeText={(t) => setForm({ ...form, name: t })}
                        />

                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>CODE (Optional)</Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.background,
                                borderRadius: 12,
                                padding: 12,
                                fontSize: 16,
                                color: colors.textPrimary,
                                marginBottom: 16
                            }}
                            placeholder="e.g. MATH101"
                            placeholderTextColor={colors.textSecondary}
                            value={form.code}
                            onChangeText={(t) => setForm({ ...form, code: t })}
                            autoCapitalize="characters"
                        />

                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>TYPE</Text>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                            {["Theory", "Practical", "Other"].map((type) => (
                                <Pressable
                                    key={type}
                                    onPress={() => setForm({ ...form, type })}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        backgroundColor: form.type === type ? colors.primary : colors.background,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: form.type === type ? colors.primary : colors.border
                                    }}
                                >
                                    <Text style={{ color: form.type === type ? "#fff" : colors.textSecondary, fontWeight: "600" }}>{type}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            onPress={handleSave}
                            disabled={saving}
                            style={{
                                backgroundColor: colors.primary,
                                padding: 16,
                                borderRadius: 16,
                                alignItems: "center",
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                                    {modalMode === "add" ? "Create Subject" : "Save Changes"}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Details Modal */}
            <Modal visible={showDetailsModal} animationType="slide" transparent onRequestClose={() => setShowDetailsModal(false)}>
                <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary }}>
                                    {selectedSubject?.name}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Usage Details</Text>
                            </View>
                            <Pressable onPress={() => setShowDetailsModal(false)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {loadingDetails ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
                        ) : usageDetails.length === 0 ? (
                            <View style={{ padding: 20, alignItems: "center" }}>
                                <Text style={{ color: colors.textSecondary }}>Not used in any classes yet.</Text>
                            </View>
                        ) : (
                            <ScrollView>
                                {usageDetails.map((usage, index) => (
                                    <View key={index} style={{ marginBottom: 16, padding: 12, backgroundColor: colors.background, borderRadius: 12 }}>
                                        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
                                            {usage.class?.name} {usage.class?.section ? `(${usage.class.section})` : ""}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                                            {usage.class?.branch}
                                        </Text>

                                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 }}>TEACHERS</Text>
                                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                            {usage.teachers && usage.teachers.length > 0 ? (
                                                usage.teachers.map(t => (
                                                    <View key={t._id} style={{ backgroundColor: colors.cardBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                                                        <Text style={{ fontSize: 12, color: colors.textPrimary }}>{t.name}</Text>
                                                    </View>
                                                ))
                                            ) : (
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: "italic" }}>No teachers assigned</Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
