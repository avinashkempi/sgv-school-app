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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import AppHeader from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function TeacherSubjectsScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    // Auth check is handled by _layout.jsx generally, but we can keep role check if needed or rely on backend
    // For now assuming auth is fine as per other refactors

    // Fetch Data
    const { data, isLoading: loading, refetch: refetchData } = useApiQuery(
        ['teacherSubjectMatrix'],
        `${apiConfig.baseUrl}/teachers/admin/teacher-subject-matrix`
    );

    const teachers = data?.teachers || [];
    const subjects = data?.subjects || [];

    const onRefresh = async () => {
        setRefreshing(true);
        await refetchData();
        setRefreshing(false);
    };

    // Mutations
    const assignSubjectsMutation = useApiMutation({
        mutationFn: async ({ teacherId, subjectIds }) => {
            // We need to handle multiple assignments. The backend seems to take one at a time based on original code loop.
            // Or we can check if there is a bulk endpoint. The original code looped.
            // Let's loop here in the mutation function or use Promise.all
            const promises = subjectIds.map(subjectId =>
                createApiMutationFn(`${apiConfig.baseUrl}/teachers/subjects/${subjectId}/assign`, 'POST')({ teacherId })
            );
            return Promise.all(promises);
        },
        onSuccess: (results, _variables) => {
            const successCount = results.length; // Assuming all promises resolved if we are here (Promise.all rejects on first error, maybe use allSettled if we want partial success)
            // Actually createApiMutationFn throws on error, so if we get here, all succeeded.
            showToast(`Successfully assigned ${successCount} subject(s) to ${selectedTeacher.name}`, "success");
            queryClient.invalidateQueries({ queryKey: ['teacherSubjectMatrix'] });
            setSelectedSubjects([]);
            setShowModal(false);
        },
        onError: (_error) => showToast("Error assigning subjects", "error")
    });

    const removeSubjectMutation = useApiMutation({
        mutationFn: ({ subjectId, teacherId }) =>
            createApiMutationFn(`${apiConfig.baseUrl}/teachers/subjects/${subjectId}/teachers/${teacherId}`, 'DELETE')(),
        onSuccess: (data, variables) => {
            // Find teacher name for the message
            const teacher = teachers.find(t => t._id === variables.teacherId);
            const teacherName = teacher ? teacher.name : "Teacher";

            // Find subject name
            const subject = subjects.find(s => s._id === variables.subjectId);
            const subjectName = subject ? subject.name : "Subject";

            showToast(`Removed ${teacherName} from ${subjectName}`, "success");
            queryClient.invalidateQueries({ queryKey: ['teacherSubjectMatrix'] });
        },
        onError: (_error) => showToast("Failed to remove teacher from subject", "_error")
    });

    const filteredTeachers = teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAssignMultipleSubjects = () => {
        if (selectedSubjects.length === 0) {
            showToast("Please select at least one subject", "error");
            return;
        }

        assignSubjectsMutation.mutate({
            teacherId: selectedTeacher._id,
            subjectIds: selectedSubjects
        });
    };

    const handleRemoveSubject = (subjectId, teacherId) => {
        removeSubjectMutation.mutate({ subjectId, teacherId });
    };

    const toggleSubjectSelection = (subjectId) => {
        setSelectedSubjects(prev => {
            if (prev.includes(subjectId)) {
                return prev.filter(id => id !== subjectId);
            } else {
                return [...prev, subjectId];
            }
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
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
                                                    setSelectedSubjects([]);
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
                onRequestClose={() => {
                    setShowModal(false);
                    setSelectedSubjects([]);
                }}
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
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    Assign Subjects
                                </Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Regular", marginTop: 2 }}>
                                    {selectedTeacher?.name}
                                </Text>
                            </View>
                            <Pressable onPress={() => {
                                setShowModal(false);
                                setSelectedSubjects([]);
                            }}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Selection Counter */}
                        {selectedSubjects.length > 0 && (
                            <View style={{
                                backgroundColor: colors.primary + "15",
                                padding: 10,
                                borderRadius: 8,
                                marginBottom: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-SemiBold", color: colors.primary }}>
                                    {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                                </Text>
                                <Pressable onPress={() => setSelectedSubjects([])}>
                                    <Text style={{ fontSize: 13, fontFamily: "DMSans-Bold", color: colors.primary }}>
                                        Clear All
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "70%" }}>
                            {subjects.map((subject) => {
                                const isAssigned = subject.teachers.some(t => t._id === selectedTeacher?._id);
                                const isSelected = selectedSubjects.includes(subject._id);

                                return (
                                    <Pressable
                                        key={subject._id}
                                        onPress={() => {
                                            if (!isAssigned) {
                                                toggleSubjectSelection(subject._id);
                                            }
                                        }}
                                        disabled={isAssigned || assignSubjectsMutation.isPending}
                                        style={({ pressed }) => ({
                                            backgroundColor: isAssigned ? colors.success + "10" : isSelected ? colors.primary + "15" : colors.background,
                                            borderRadius: 12,
                                            padding: 14,
                                            marginBottom: 10,
                                            opacity: (isAssigned || assignSubjectsMutation.isPending) ? 0.6 : (pressed ? 0.9 : 1),
                                            borderWidth: isAssigned ? 1 : isSelected ? 2 : 0,
                                            borderColor: isAssigned ? colors.success : isSelected ? colors.primary : "transparent"
                                        })}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                            <View style={{ flex: 1, marginRight: 12 }}>
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
                                            {isAssigned ? (
                                                <View style={{
                                                    backgroundColor: colors.success + "20",
                                                    padding: 6,
                                                    borderRadius: 20,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingHorizontal: 10
                                                }}>
                                                    <MaterialIcons name="check-circle" size={18} color={colors.success} />
                                                    <Text style={{
                                                        fontSize: 11,
                                                        fontFamily: "DMSans-Bold",
                                                        color: colors.success,
                                                        marginLeft: 4
                                                    }}>
                                                        Assigned
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 6,
                                                    borderWidth: 2,
                                                    borderColor: isSelected ? colors.primary : colors.textSecondary + "40",
                                                    backgroundColor: isSelected ? colors.primary : "transparent",
                                                    justifyContent: "center",
                                                    alignItems: "center"
                                                }}>
                                                    {isSelected && (
                                                        <MaterialIcons name="check" size={18} color="#fff" />
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* Assign Button */}
                        <Pressable
                            onPress={handleAssignMultipleSubjects}
                            disabled={assignSubjectsMutation.isPending || selectedSubjects.length === 0}
                            style={({ pressed }) => ({
                                backgroundColor: selectedSubjects.length > 0 ? colors.primary : colors.textSecondary + "30",
                                padding: 16,
                                borderRadius: 12,
                                marginTop: 16,
                                opacity: pressed ? 0.8 : 1,
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center"
                            })}
                        >
                            {assignSubjectsMutation.isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <MaterialIcons name="check" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={{
                                        color: "#fff",
                                        fontSize: 16,
                                        fontFamily: "DMSans-Bold"
                                    }}>
                                        Assign {selectedSubjects.length > 0 ? `(${selectedSubjects.length})` : 'Selected'}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
