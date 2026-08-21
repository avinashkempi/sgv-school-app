import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput as RNTextInput,
    RefreshControl,
    Modal,
    Alert
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import { useAuth } from "../../../context/AuthContext";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import apiConfig from "../../../config/apiConfig";
import { useToast } from "../../../components/ToastProvider";
import AppHeader from "../../../components/Header";
import { formatDate } from "../../../utils/date";
import UserDetailModal from "../../../components/UserDetailModal";
import Button from "../../../components/Button";
import SegmentedControl from "../../../components/SegmentedControl";
import { EmptyState } from "../../../components/StateComponents";
import { useLabel } from "../../../context/LabelsContext";

export default function ClassDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    // eslint-disable-next-line no-unused-vars
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useLabel();

    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDetailUser, setSelectedDetailUser] = useState(null);

    const [activeTab, setActiveTab] = useState("subjects"); // subjects, students
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGlobalSubjectIds, setSelectedGlobalSubjectIds] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    // Fetch Class Details
    // eslint-disable-next-line no-unused-vars
    const { data, isLoading: loading, refetch } = useApiQuery(
        ['classDetails', id],
        `${apiConfig.baseUrl}/classes/${id}/full-details`,
        { enabled: !!id }
    );

    const classData = data?.classData;
    const subjects = data?.subjects || [];
    const students = data?.students || [];

    // Fetch Global Subjects
    const { data: globalSubjectsData } = useApiQuery(
        ['globalSubjects'],
        `${apiConfig.baseUrl}/subjects`
    );
    const globalSubjects = (() => {
        const raw = Array.isArray(globalSubjectsData)
            ? globalSubjectsData
            : (Array.isArray(globalSubjectsData?.data) ? globalSubjectsData.data : []);
        // Deduplicate by _id to prevent React duplicate key warnings
        const seen = new Set();
        return raw.filter(s => {
            if (seen.has(s._id)) return false;
            seen.add(s._id);
            return true;
        });
    })();

    // Fetch Available Students
    const { data: availableStudentsData } = useApiQuery(
        ['availableStudents'],
        `${apiConfig.baseUrl}/users?role=student&limit=1000`
    );
    // Handle both new paginated structure and potential old array structure
    const availableStudents = Array.isArray(availableStudentsData)
        ? availableStudentsData.filter(s => !s.currentClass)
        : (availableStudentsData?.data || []).filter(s => !s.currentClass);

    // Mutations
    const addSubjectMutation = useApiMutation({
        mutationFn: async (subjectId) => {
            const subject = globalSubjects.find(s => s._id === subjectId);
            if (!subject) throw new Error("Subject not found");
            return createApiMutationFn(`${apiConfig.baseUrl}/classes/${id}/subjects`, 'POST')({
                name: subject.name,
                globalSubjectId: subject._id
            });
        }
    });

    const removeSubjectMutation = useApiMutation({
        mutationFn: (subjectId) => createApiMutationFn(`${apiConfig.baseUrl}/classes/${id}/subjects/${subjectId}`, 'DELETE')(),
        onSuccess: () => {
            showToast(t('toasts.subjectRemoved', "Subject removed successfully"), "success");
            queryClient.invalidateQueries({ queryKey: ['classDetails', id] });
        },
        onError: (error) => showToast(error.message || t('toasts.failedToRemoveSubject', "Failed to remove subject"), "error")
    });

    const addStudentsMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/classes/${id}/students`, 'POST'),
        onSuccess: (data) => {
            showToast(data.message || t('toasts.studentsAdded', "Students added successfully"), "success");
            setShowAddStudentModal(false);
            setSearchQuery("");
            setSelectedStudentIds([]);
            queryClient.invalidateQueries({ queryKey: ['classDetails', id] });
            queryClient.invalidateQueries({ queryKey: ['availableStudents'] });
        },
        onError: (error) => showToast(error.message || t('toasts.failedToAddStudents', "Failed to add students"), "error")
    });

    const removeStudentMutation = useApiMutation({
        mutationFn: (studentId) => createApiMutationFn(`${apiConfig.baseUrl}/classes/${id}/students/${studentId}`, 'DELETE')(),
        onSuccess: () => {
            showToast(t('toasts.studentRemoved', "Student removed successfully"), "success");
            queryClient.invalidateQueries({ queryKey: ['classDetails', id] });
            queryClient.invalidateQueries({ queryKey: ['availableStudents'] });
        },
        onError: (error) => showToast(error.message || t('toasts.failedToRemoveStudent', "Failed to remove student"), "error")
    });

    const toggleSubjectSelection = (subjectId) => {
        setSelectedGlobalSubjectIds(prev => {
            if (prev.includes(subjectId)) {
                return prev.filter(id => id !== subjectId);
            } else {
                return [...prev, subjectId];
            }
        });
    };

    const handleAddSubject = async () => {
        if (selectedGlobalSubjectIds.length === 0) {
            showToast(t('toasts.selectOneSubject', "Please select at least one subject"), "error");
            return;
        }

        try {
            // Add subjects one by one
            let successCount = 0;
            let failCount = 0;

            await Promise.all(selectedGlobalSubjectIds.map(async (subjectId) => {
                try {
                    await addSubjectMutation.mutateAsync(subjectId);
                    successCount++;
                // eslint-disable-next-line no-unused-vars
                } catch (error) {
                    failCount++;
                }
            }));

            if (successCount > 0) {
                showToast(`${successCount} ${t('toasts.subjectsAddedSuccessfully', "subject(s) added successfully")}`, "success");
            }
            if (failCount > 0) {
                showToast(`${failCount} ${t('toasts.subjectsFailedToAdd', "subject(s) failed to add")}`, "error");
            }

            setShowAddSubjectModal(false);
            setSelectedGlobalSubjectIds([]);
            setSearchQuery("");
            queryClient.invalidateQueries({ queryKey: ['classDetails', id] });
        } catch (error) {
            console.error(error);
            showToast(t('toasts.errorAddingSubjects', "Error adding subjects"), "error");
        }
    };

    const handleRemoveSubject = (subjectId, subjectName) => {
        Alert.alert(
            t('teacher.removeSubject', "Remove Subject"),
            `${t('teacher.removeSubjectConfirm', 'Are you sure you want to remove')} ${subjectName}?`,
            [
                { text: t('common.cancel', "Cancel"), style: "cancel" },
                {
                    text: t('common.remove', "Remove"),
                    style: "destructive",
                    onPress: () => removeSubjectMutation.mutate(subjectId),
                },
            ]
        );
    };

    const toggleStudentSelection = (studentId) => {
        setSelectedStudentIds(prev => {
            if (prev.includes(studentId)) {
                return prev.filter(id => id !== studentId);
            } else {
                return [...prev, studentId];
            }
        });
    };

    const handleBulkAddStudents = () => {
        if (selectedStudentIds.length === 0) {
            showToast(t('toasts.selectOneStudent', "Please select at least one student"), "error");
            return;
        }

        addStudentsMutation.mutate({ studentIds: selectedStudentIds });
    };

    const handleRemoveStudent = (studentId, studentName) => {
        Alert.alert(
            t('teacher.removeStudent', "Remove Student"),
            `${t('teacher.removeStudentConfirm', 'Are you sure you want to remove')} ${studentName} ${t('teacher.fromThisClass', 'from this class?')}`,
            [
                { text: t('common.cancel', "Cancel"), style: "cancel" },
                {
                    text: t('common.remove', "Remove"),
                    style: "destructive",
                    onPress: () => removeStudentMutation.mutate(studentId),
                },
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
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

    const filteredAvailableStudents = availableStudents.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 24 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
                        title={classData ? `${classData.name} ${classData.section || ''}` : t('teacher.classDetails', "Class Details")}
                        subtitle={t('teacher.manageSubjectsStudents', "Manage subjects and students")}
                        showBack
                    />

                    {/* Quick Actions */}
                    {isClassTeacher && (
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 16 }}>
                            <Pressable
                                onPress={() => router.push({
                                    pathname: "/teacher/class/attendance",
                                    params: { classId: id }
                                })}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    backgroundColor: colors.surfaceContainer,
                                    borderRadius: 16,
                                    padding: 16,
                                    alignItems: "center",
                                    opacity: pressed ? 0.7 : 1,
                                    elevation: 2
                                })}
                            >
                                <MaterialIcons name="how-to-reg" size={28} color={colors.primary} />
                                <Text style={{ fontSize: 13, fontFamily: "DMSans-SemiBold", color: colors.onSurface, marginTop: 8 }}>
                                    {t('common.attendance', 'Attendance')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => router.push({
                                    pathname: "/teacher/class/performance",
                                    params: { classId: id }
                                })}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    backgroundColor: colors.surfaceContainer,
                                    borderRadius: 16,
                                    padding: 16,
                                    alignItems: "center",
                                    opacity: pressed ? 0.7 : 1,
                                    elevation: 2
                                })}
                            >
                                <MaterialIcons name="insights" size={28} color={colors.success} />
                                <Text style={{ fontSize: 13, fontFamily: "DMSans-SemiBold", color: colors.onSurface, marginTop: 8 }}>
                                    {t('teacher.performance', 'Performance')}
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Tabs */}
                    <SegmentedControl
                        tabs={[
                            { key: 'subjects', label: t('teacher.subjects', 'Subjects') },
                            { key: 'students', label: `${t('common.students', 'Students')} (${students.length})` },
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        style={{ marginBottom: 24 }}
                    />

                    {activeTab === "subjects" ? (
                        <View>
                            {subjects.length === 0 ? (
                                <EmptyState
                                    icon="library-books"
                                    title={t('teacher.noSubjectsYet', "No Subjects Yet")}
                                    message={t('teacher.noSubjectsAddedYet', "No subjects have been added to this class yet.")}
                                />
                            ) : (
                                subjects.map((subject) => (
                                    <Pressable
                                        key={subject._id}
                                        onPress={() => router.push({
                                            pathname: "/teacher/class/subject/[subjectId]",
                                            params: { id, subjectId: subject._id }
                                        })}
                                        style={({ pressed }) => ({
                                            backgroundColor: colors.surfaceContainer,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 12,
                                            shadowColor: colors.shadow,
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
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                                            <View style={{ backgroundColor: colors.primary + "20", padding: 10, borderRadius: 10 }}>
                                                <MaterialIcons name="book" size={24} color={colors.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                                    {subject.name}
                                                </Text>
                                                {subject.teachers && subject.teachers.length > 0 ? (
                                                    <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2, fontFamily: "DMSans-Medium" }}>
                                                        {subject.teachers.map(t => t.name).join(", ")}
                                                    </Text>
                                                ) : (
                                                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2, fontStyle: "italic" }}>
                                                        {t('teacher.noTeachersAssigned', "No teachers assigned")}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            {canManageClass && (
                                                <Pressable
                                                    accessibilityLabel="Remove subject"
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveSubject(subject._id, subject.name);
                                                    }}
                                                    style={{ padding: 8 }}
                                                >
                                                    <MaterialIcons name="delete-outline" size={24} color={colors.error} />
                                                </Pressable>
                                            )}
                                            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
                                        </View>
                                    </Pressable>
                                ))
                            )}
                        </View>
                    ) : (
                        <View>
                            {students.length === 0 ? (
                                <EmptyState
                                    icon="people-outline"
                                    title={t('teacher.noStudentsYet', "No Students Yet")}
                                    message={t('teacher.noStudentsAddedYet', "No students have been added to this class yet.")}
                                />
                            ) : (
                                students.map((student) => (
                                    <View
                                        key={student._id}
                                        style={{
                                            backgroundColor: colors.surfaceContainer,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 12,
                                            shadowColor: colors.shadow,
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 4,
                                            elevation: 1,
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <View style={{ flex: 1 }}>
                                                {canManageClass ? (
                                                    <Pressable
                                                        onPress={() => {
                                                            setSelectedDetailUser(student);
                                                            setShowDetailModal(true);
                                                        }}
                                                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                                                    >
                                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.primary, textDecorationLine: 'underline' }}>
                                                            {student.name}
                                                        </Text>
                                                    </Pressable>
                                                ) : (
                                                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                                        {student.name}
                                                    </Text>
                                                )}
                                                <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 }}>
                                                    {student.phone}
                                                </Text>
                                                {student.email && (
                                                    <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, marginTop: 2 }}>
                                                        {student.email}
                                                    </Text>
                                                )}
                                                {student.guardianName && (
                                                    <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, marginTop: 6 }}>
                                                        {t('teacher.guardian', 'Guardian')}: {student.guardianName}
                                                        {student.guardianPhone && ` (${student.guardianPhone})`}
                                                    </Text>
                                                )}
                                                {student.admissionDate && (
                                                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4 }}>
                                                        {t('teacher.admitted', 'Admitted')}: {formatDate(student.admissionDate)}
                                                    </Text>
                                                )}
                                            </View>
                                            {canManageClass && (
                                                <Pressable
                                                    accessibilityLabel="Remove student"
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
                </View >
            </ScrollView >

            {/* FAB for Add Subject or Add Student */}
            {canManageClass && (
                <Pressable
                    onPress={() => {
                        if (activeTab === "subjects") {
                            setSelectedGlobalSubjectIds([]);
                            setShowAddSubjectModal(true);
                            setSearchQuery("");
                        } else {
                            setShowAddStudentModal(true);
                        }
                    }}
                    style={({ pressed }) => ({
                        position: "absolute",
                        bottom: 24,
                        right: 24,
                        backgroundColor: colors.primaryContainer,
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        justifyContent: "center",
                        alignItems: "center",
                        elevation: 6,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        opacity: pressed ? 0.9 : 1,
                    })}
                    accessibilityLabel={activeTab === 'subjects' ? 'Add subject' : 'Add student'}
                >
                    <MaterialIcons name="add" size={28} color={colors.onPrimaryContainer} />
                </Pressable>
            )}

            {/* Add Subject Modal */}
            <Modal visible={showAddSubjectModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 16, padding: 24, maxHeight: "80%" }}>
                        <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 16 }}>
                            {t('teacher.addSubjectsToClass', 'Add Subjects to Class')}
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            marginBottom: 16,
                        }}>
                            <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                            <RNTextInput
                                placeholder={t('teacher.searchSubjectsPlaceholder', 'Search subjects...')}
                                placeholderTextColor={colors.onSurfaceVariant}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    fontSize: 16,
                                    fontFamily: 'DMSans-Regular',
                                    color: colors.onSurface,
                                }}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {globalSubjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                <EmptyState
                                    icon="library-books"
                                    title={searchQuery ? t('teacher.noSubjectsFound', "No Subjects Found") : t('teacher.noSubjectsAvailable', "No Subjects Available")}
                                    message={searchQuery ? t('teacher.tryDifferentSearch', "Try a different search term.") : t('teacher.askAdminAddSubjects', "Please ask admin to add subjects to the master list.")}
                                />
                            ) : (
                                globalSubjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => {
                                    const isSelected = selectedGlobalSubjectIds.includes(item._id);
                                    // Check if this subject is already added to the class
                                    const isAlreadyAdded = subjects.some(s =>
                                        s.globalSubject && (
                                            typeof s.globalSubject === 'object'
                                                ? s.globalSubject._id === item._id
                                                : s.globalSubject === item._id
                                        )
                                    );
                                    return (
                                        <Pressable
                                            key={item._id}
                                            onPress={() => !isAlreadyAdded && toggleSubjectSelection(item._id)}
                                            disabled={isAlreadyAdded}
                                            style={({ pressed }) => ({
                                                backgroundColor: isAlreadyAdded
                                                    ? colors.onSurface + '08'
                                                    : isSelected ? colors.primary + "10" : (pressed ? colors.surfaceContainerHigh : colors.surfaceContainer),
                                                borderRadius: 12,
                                                padding: 12,
                                                marginBottom: 8,
                                                borderWidth: 1,
                                                borderColor: isAlreadyAdded
                                                    ? colors.onSurfaceVariant
                                                    : isSelected ? colors.primary : colors.outlineVariant,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 12,
                                                opacity: isAlreadyAdded ? 0.6 : 1
                                            })}
                                        >
                                            <View style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: isAlreadyAdded || isSelected ? colors.primary : colors.onSurfaceVariant,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: isAlreadyAdded || isSelected ? colors.primary : "transparent"
                                            }}>
                                                {(isSelected || isAlreadyAdded) && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                    <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.onSurface }}>
                                                        {item.name}
                                                    </Text>
                                                    {isAlreadyAdded && (
                                                        <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                            <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600" }}>{t('common.added', 'ADDED')}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {item.code && (
                                                    <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, marginTop: 2, fontFamily: 'DMSans-Regular' }}>
                                                        {t('common.code', 'Code')}: {item.code}
                                                    </Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 16, gap: 12 }}>
                            <Button
                                variant="text"
                                onPress={() => {
                                    setShowAddSubjectModal(false);
                                    setSelectedGlobalSubjectIds([]);
                                    setSearchQuery("");
                                }}
                            >
                                {t('common.cancel', 'Cancel')}
                            </Button>

                            <Button
                                variant="filled"
                                onPress={handleAddSubject}
                                disabled={selectedGlobalSubjectIds.length === 0}
                                loading={addSubjectMutation.isPending}
                            >
                                {addSubjectMutation.isPending ? t('common.adding', 'Adding...') : `${t('common.add', 'Add')} ${selectedGlobalSubjectIds.length > 0 ? `${selectedGlobalSubjectIds.length} ` : ""}${t('common.selected', 'Selected')}`}
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Student Modal */}
            <Modal visible={showAddStudentModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 16, padding: 24, maxHeight: "80%" }}>
                        <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 16 }}>
                            {t('teacher.addStudentsToClass', 'Add Students to Class')}
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            marginBottom: 16,
                        }}>
                            <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                            <RNTextInput
                                placeholder={t('teacher.searchStudentsPlaceholder', 'Search by name or phone...')}
                                placeholderTextColor={colors.onSurfaceVariant}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    fontSize: 16,
                                    fontFamily: 'DMSans-Regular',
                                    color: colors.onSurface,
                                }}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {filteredAvailableStudents.length === 0 ? (
                                <EmptyState
                                    icon="person-off"
                                    title={searchQuery ? t('teacher.noStudentsFound', "No Students Found") : t('teacher.noUnassignedStudents', "No Unassigned Students")}
                                    message={searchQuery ? t('teacher.tryDifferentSearch', "Try a different search term.") : t('teacher.allStudentsAssigned', "All students are already assigned to classes.")}
                                />
                            ) : (
                                filteredAvailableStudents.map((student) => {
                                    const isSelected = selectedStudentIds.includes(student._id);
                                    return (
                                        <Pressable
                                            key={student._id}
                                            onPress={() => toggleStudentSelection(student._id)}
                                            style={({ pressed }) => ({
                                                backgroundColor: isSelected ? colors.primary + "10" : (pressed ? colors.surfaceContainerHigh : colors.surfaceContainer),
                                                borderRadius: 12,
                                                padding: 12,
                                                marginBottom: 8,
                                                borderWidth: 1,
                                                borderColor: isSelected ? colors.primary : colors.outlineVariant,
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
                                                borderColor: isSelected ? colors.primary : colors.onSurfaceVariant,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: isSelected ? colors.primary : "transparent"
                                            }}>
                                                {isSelected && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.onSurface }}>
                                                    {student.name}
                                                </Text>
                                                <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, marginTop: 2, fontFamily: 'DMSans-Regular' }}>
                                                    {student.phone}
                                                </Text>
                                                {student.admissionDate && (
                                                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4, fontFamily: 'DMSans-Regular' }}>
                                                        {t('teacher.admitted', 'Admitted')}: {formatDate(student.admissionDate)}
                                                    </Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 16, gap: 12 }}>
                            <Button
                                variant="text"
                                onPress={() => {
                                    setShowAddStudentModal(false);
                                    setSearchQuery("");
                                    setSelectedStudentIds([]);
                                }}
                            >
                                {t('common.cancel', 'Cancel')}
                            </Button>

                            <Button
                                variant="filled"
                                onPress={handleBulkAddStudents}
                                disabled={selectedStudentIds.length === 0}
                                loading={addStudentsMutation.isPending}
                            >
                                {addStudentsMutation.isPending ? t('common.adding', 'Adding...') : `${t('common.add', 'Add')} ${selectedStudentIds.length > 0 ? `${selectedStudentIds.length} ` : ""}${t('common.selected', 'Selected')}`}
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>

            <UserDetailModal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                user={selectedDetailUser}
            />
        </View >
    );
}
