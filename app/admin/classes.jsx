import React, { useState,} from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Modal,
    Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";

export default function ClassesScreen() {
    const router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
    const [editingClassId, setEditingClassId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [form, setForm] = useState({
        name: "",
        section: "",
        branch: "Main",
        classTeacher: ""
    });

    // Fetch User
    const { data: user } = useApiQuery(
        ['currentUser'],
        `${apiConfig.baseUrl}/auth/me`
    );

    // Fetch Data (Classes, Years, Teachers)
    const { data: initData, isLoading: loading, refetch } = useApiQuery(
        ['adminClassesInit'],
        `${apiConfig.baseUrl}/classes/admin/init`
    );

    const classes = initData?.classes || [];
    const teachers = initData?.teachers || [];

    // Mutations
    const createClassMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/classes`, 'POST'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminClassesInit'] });
            showToast("Class created", "success");
            setShowModal(false);
            setForm({ ...form, name: "", section: "" });
            setModalMode("create");
            setEditingClassId(null);
        },
        onError: (error) => showToast(error.message || "Failed to create", "error")
    });

    const updateClassMutation = useApiMutation({
        mutationFn: (data) => createApiMutationFn(`${apiConfig.baseUrl}/classes/${data._id}`, 'PUT')(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminClassesInit'] });
            showToast("Class updated", "success");
            setShowModal(false);
            setForm({ ...form, name: "", section: "" });
            setModalMode("create");
            setEditingClassId(null);
        },
        onError: (error) => showToast(error.message || "Failed to update", "error")
    });

    const deleteClassMutation = useApiMutation({
        mutationFn: (id) => createApiMutationFn(`${apiConfig.baseUrl}/classes/${id}`, 'DELETE')(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminClassesInit'] });
            showToast("Class deleted", "success");
        },
        onError: (error) => showToast(error.message || "Failed to delete", "error")
    });

    const handleSubmit = () => {
        if (!form.name) {
            showToast("Name is required", "error");
            return;
        }

        if (modalMode === "create") {
            createClassMutation.mutate(form);
        } else {
            updateClassMutation.mutate({ ...form, _id: editingClassId });
        }
    };

    const handleEdit = (cls) => {
        setForm({
            name: cls.name,
            section: cls.section || "",
            branch: cls.branch,
            classTeacher: cls.classTeacher?._id || cls.classTeacher || ""
        });
        setModalMode("edit");
        setEditingClassId(cls._id);
        setShowModal(true);
    };

    const handleDelete = (classId, className) => {
        Alert.alert(
            "Delete Class",
            `Are you sure you want to delete ${className}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        setDeletingId(classId);
                        deleteClassMutation.mutate(classId, {
                            onSettled: () => setDeletingId(null)
                        });
                    }
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader title="Classes" subtitle="Manage classes and sections" showBack />

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
                                        {cls.branch}
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

            {user?.role === 'super admin' && (
                <Pressable
                    onPress={() => {
                        setModalMode("create");
                        setForm({ ...form, name: "", section: "" });
                        setShowModal(true);
                    }}
                    style={{
                        position: "absolute",
                        bottom: 110,
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
            )}

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
                                disabled={createClassMutation.isPending || updateClassMutation.isPending}
                                style={{
                                    backgroundColor: colors.primary,
                                    opacity: (createClassMutation.isPending || updateClassMutation.isPending) ? 0.5 : 1,
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8
                                }}
                            >
                                {(createClassMutation.isPending || updateClassMutation.isPending) && <ActivityIndicator size="small" color="#fff" />}
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {(createClassMutation.isPending || updateClassMutation.isPending) ? "Saving..." : (modalMode === "create" ? "Create" : "Update")}
                                </Text>
                            </Pressable>
                        </View>
                    </View >
                </View >
            </Modal >
        </View >
    );
}
