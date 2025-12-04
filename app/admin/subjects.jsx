import React, { useState, } from "react";
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

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import AppHeader from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function ManageSubjectsScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    // Create/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
    const [editingSubject, setEditingSubject] = useState(null);
    const [form, setForm] = useState({ name: "", code: "", type: "Theory" });

    // Details Modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Fetch Subjects
    const { data: subjects = [], isLoading: loading, refetch: refetchSubjects } = useApiQuery(
        ['adminSubjects'],
        `${apiConfig.baseUrl}/subjects`
    );

    // Fetch Usage Details
    const { data: usageDetails = [], isLoading: loadingDetails } = useApiQuery(
        ['subjectUsage', selectedSubject?._id],
        `${apiConfig.baseUrl}/subjects/${selectedSubject?._id}/usage`,
        { enabled: !!selectedSubject && showDetailsModal }
    );

    // Mutations
    const saveSubjectMutation = useApiMutation({
        mutationFn: (data) => {
            const url = modalMode === "add"
                ? `${apiConfig.baseUrl}/subjects`
                : `${apiConfig.baseUrl}/subjects/${editingSubject._id}`;
            const method = modalMode === "add" ? "POST" : "PUT";
            return createApiMutationFn(url, method)(data);
        },
        onSuccess: () => {
            showToast(`Subject ${modalMode === "add" ? "created" : "updated"}`, "success");
            setShowModal(false);
            setForm({ name: "", code: "", type: "Theory" });
            queryClient.invalidateQueries({ queryKey: ['adminSubjects'] });
        },
        onError: (error) => showToast(error.message || "Failed to save", "error")
    });

    const deleteSubjectMutation = useApiMutation({
        mutationFn: (id) => createApiMutationFn(`${apiConfig.baseUrl}/subjects/${id}`, 'DELETE')(),
        onSuccess: () => {
            showToast("Subject deleted", "success");
            queryClient.invalidateQueries({ queryKey: ['adminSubjects'] });
        },
        onError: (error) => showToast(error.message || "Failed to delete", "error")
    });

    const handleSave = () => {
        if (!form.name) {
            showToast("Subject name is required", "error");
            return;
        }
        saveSubjectMutation.mutate(form);
    };

    const handleDelete = (id, name) => {
        Alert.alert(
            "Delete Subject",
            `Are you sure you want to delete ${name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteSubjectMutation.mutate(id)
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetchSubjects();
        setRefreshing(false);
    };

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <AppHeader title="Manage Subjects" subtitle="Master List" showBack />

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
                    bottom: 130,
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
                            disabled={saveSubjectMutation.isPending}
                            style={{
                                backgroundColor: colors.primary,
                                padding: 16,
                                borderRadius: 16,
                                alignItems: "center",
                                opacity: saveSubjectMutation.isPending ? 0.7 : 1
                            }}
                        >
                            {saveSubjectMutation.isPending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                                    {modalMode === "add" ? "Create Subject" : "Save Changes"}
                                </Text>
                            )}
                        </Pressable>
                    </View >
                </KeyboardAvoidingView >
            </Modal >

            {/* Details Modal */}
            < Modal visible={showDetailsModal} animationType="slide" transparent onRequestClose={() => setShowDetailsModal(false)
            }>
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
            </Modal >
        </View >
    );
}
