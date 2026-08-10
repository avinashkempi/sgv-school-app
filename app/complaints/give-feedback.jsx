import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback
} from "react-native";
import { useRouter } from "expo-router";
import storage from "../../utils/storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiMutation, createApiMutationFn, useApiQuery } from "../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";
import { formatClassName } from "../../utils/formatClassName";
import { useAuth } from "../../context/AuthContext";

export default function GiveFeedbackScreen() {
    const router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { user, userId } = useAuth();
    const userRole = user?.role;

    // Form inputs
    const [message, setMessage] = useState("");
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Filtered data states
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);

    // UI States
    const [showClassModal, setShowClassModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [classSearch, setClassSearch] = useState("");
    const [studentSearch, setStudentSearch] = useState("");

    const isAdmin = userRole === 'admin' || userRole === 'super admin';

    // Fetch Teacher's Classes and Subjects (for teachers)
    const { data: teacherData, isLoading: loadingTeacherClasses } = useApiQuery(
        ['myClassesAndSubjects', userId],
        `${apiConfig.baseUrl}/teachers/my-classes-and-subjects`,
        { enabled: userRole === 'teacher' && !!userId }
    );

    // Fetch All Classes (for admins)
    const { data: allClassesData, isLoading: loadingAllClasses } = useApiQuery(
        ['allClassesForFeedback'],
        `${apiConfig.baseUrl}/classes`,
        { enabled: isAdmin }
    );

    const loadingClasses = loadingTeacherClasses || loadingAllClasses;

    // Build classes list based on role
    const classes = isAdmin
        ? (allClassesData || []).map(c => ({ ...c, role: 'admin' }))
        : teacherData ? [
            ...(teacherData.asClassTeacher || []).map(c => ({ ...c, role: 'class_teacher' })),
            ...(teacherData.asSubjectTeacher || []).map(c => ({ ...c, role: 'subject_teacher' })),
        ] : [];

    // Fetch Students when Class is Selected
    const { data: studentsData, isFetching: loadingStudents } = useApiQuery(
        ['classStudents', selectedClass?._id],
        `${apiConfig.baseUrl}/classes/${selectedClass?._id}/full-details`,
        { enabled: !!selectedClass }
    );

    useEffect(() => {
        if (studentsData?.students) {
            setAvailableStudents(studentsData.students);
        }
    }, [studentsData]);

    const handleClassSelect = (cls) => {
        setSelectedClass(cls);
        setSelectedStudent(null);
        setSelectedSubject(null);
        setAvailableStudents([]);

        // Admins can give general feedback to any class
        if (isAdmin) {
            setAvailableSubjects([]);
        } else if (cls.role === 'class_teacher') {
            // Class teachers can give general feedback OR specific subject feedback
            const mySubjectsInThisClass = teacherData.allMySubjects?.filter(
                s => s.class._id === cls._id
            ) || [];
            setAvailableSubjects(mySubjectsInThisClass);
        } else {
            // Subject teacher must pick from their subject(s) in this class
            const mySubjectsInThisClass = teacherData.asSubjectTeacher?.filter(
                s => s.class._id === cls._id
            ) || [];
            setAvailableSubjects(mySubjectsInThisClass);
            if (mySubjectsInThisClass.length === 1) {
                setSelectedSubject(mySubjectsInThisClass[0]);
            }
        }
        setShowClassModal(false);
    };

    // Submit Feedback Mutation
    const submitMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/feedback`, 'POST'),
        onSuccess: () => {
            showToast("Feedback sent successfully", "success");
            queryClient.invalidateQueries(['complaintsData']);
            router.back();
        },
        onError: (err) => showToast(err.message || "Failed to send feedback", "error")
    });

    const handleSubmit = () => {
        if (!selectedClass) {
            showToast("Please select a class", "error");
            return;
        }
        if (!selectedStudent) {
            showToast("Please select a student", "error");
            return;
        }
        if (!message.trim()) {
            showToast("Please enter a feedback message", "error");
            return;
        }

        submitMutation.mutate({
            studentId: selectedStudent._id,
            subjectId: selectedSubject ? selectedSubject._id : null,
            message: message.trim()
        });
    };

    const filteredClasses = classes.filter(c =>
        c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
        (c.section && c.section.toLowerCase().includes(classSearch.toLowerCase()))
    );

    const filteredStudents = availableStudents.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase())
    );

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={{ flex: 1 }}>
                    <View style={{ padding: 16, paddingTop: 24 }}>
                        <Header title="Give Feedback" showBack />
                    </View>

                    <ScrollView
                        contentContainerStyle={{ padding: 16 }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >

                        {/* Class Selection */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Class *</Text>
                            <Pressable
                                onPress={() => setShowClassModal(true)}
                                style={{
                                    backgroundColor: colors.cardBackground,
                                    padding: 16,
                                    borderRadius: 12,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                            >
                                <Text style={{
                                    color: selectedClass ? colors.textPrimary : colors.textSecondary,
                                    fontFamily: selectedClass ? "DMSans-SemiBold" : "DMSans-Regular",
                                    fontSize: 16
                                }}>
                                    {selectedClass
                                        ? `${formatClassName(selectedClass.name, selectedClass.section)}${selectedClass.role === 'admin' ? '' : selectedClass.role === 'class_teacher' ? ' (Class Teacher)' : ' (Subject Teacher)'}`
                                        : "Select Class"}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Subject Selection (Conditional) */}
                        {selectedClass && (availableSubjects.length > 0 || selectedClass.role === 'subject_teacher') && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>
                                    Subject {selectedClass.role === 'subject_teacher' ? "*" : "(Optional)"}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: "row", gap: 10 }}>
                                        {selectedClass.role === 'class_teacher' && (
                                            <Pressable
                                                onPress={() => setSelectedSubject(null)}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 10,
                                                    backgroundColor: !selectedSubject ? colors.primary : colors.cardBackground,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    borderColor: !selectedSubject ? colors.primary : colors.border
                                                }}
                                            >
                                                <Text style={{
                                                    color: !selectedSubject ? "#fff" : colors.textPrimary,
                                                    fontFamily: "DMSans-Medium"
                                                }}>General</Text>
                                            </Pressable>
                                        )}
                                        {availableSubjects.map(sub => (
                                            <Pressable
                                                key={sub._id}
                                                onPress={() => setSelectedSubject(sub)}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 10,
                                                    backgroundColor: selectedSubject?._id === sub._id ? colors.primary : colors.cardBackground,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    borderColor: selectedSubject?._id === sub._id ? colors.primary : colors.border
                                                }}
                                            >
                                                <Text style={{
                                                    color: selectedSubject?._id === sub._id ? "#fff" : colors.textPrimary,
                                                    fontFamily: "DMSans-Medium"
                                                }}>{sub.name}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {/* Student Selection */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Student *</Text>
                            <Pressable
                                onPress={() => {
                                    if (!selectedClass) {
                                        showToast("Please select a class first", "error");
                                        return;
                                    }
                                    setShowStudentModal(true);
                                }}
                                style={{
                                    backgroundColor: colors.cardBackground,
                                    padding: 16,
                                    borderRadius: 12,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    opacity: selectedClass ? 1 : 0.6
                                }}
                            >
                                <Text style={{
                                    color: selectedStudent ? colors.textPrimary : colors.textSecondary,
                                    fontFamily: selectedStudent ? "DMSans-SemiBold" : "DMSans-Regular",
                                    fontSize: 16
                                }}>
                                    {selectedStudent ? selectedStudent.name : "Select Student"}
                                </Text>
                                {loadingStudents ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                                )}
                            </Pressable>
                        </View>

                        {/* Feedback Message */}
                        <View style={{ marginBottom: 30 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Feedback Message *</Text>
                            <TextInput
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Write your feedback here..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                style={{
                                    backgroundColor: colors.cardBackground,
                                    padding: 16,
                                    borderRadius: 12,
                                    color: colors.textPrimary,
                                    fontFamily: "DMSans-Medium",
                                    fontSize: 16,
                                    minHeight: 120,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                            />
                        </View>

                        {/* Submit Button */}
                        <Pressable
                            onPress={handleSubmit}
                            disabled={submitMutation.isPending}
                            style={{
                                backgroundColor: colors.primary,
                                padding: 18,
                                borderRadius: 16,
                                alignItems: "center",
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                                opacity: submitMutation.isPending ? 0.7 : 1,
                                marginBottom: 40
                            }}
                        >
                            {submitMutation.isPending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 18 }}>Send Feedback</Text>
                            )}
                        </Pressable>

                    </ScrollView>

                    {/* Class Selection Modal */}
                    <Modal visible={showClassModal} animationType="slide" transparent onRequestClose={() => setShowClassModal(false)}>
                        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={Keyboard.dismiss}>
                                <Pressable style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" }} onPress={(e) => e.stopPropagation()}>
                                    <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>Select Class</Text>
                                        <TextInput
                                            placeholder="Search class..."
                                            value={classSearch}
                                            onChangeText={setClassSearch}
                                            style={{
                                                backgroundColor: colors.cardBackground,
                                                padding: 12,
                                                borderRadius: 8,
                                                marginTop: 12,
                                                color: colors.textPrimary
                                            }}
                                        />
                                    </View>
                                    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                                        {loadingClasses ? (
                                            <ActivityIndicator size="large" color={colors.primary} />
                                        ) : filteredClasses.length === 0 ? (
                                            <Text style={{ textAlign: "center", color: colors.textSecondary, padding: 20 }}>No classes found</Text>
                                        ) : (
                                            filteredClasses.map(cls => (
                                                <Pressable
                                                    key={cls._id + cls.role}
                                                    onPress={() => handleClassSelect(cls)}
                                                    style={{
                                                        padding: 16,
                                                        borderBottomWidth: 1,
                                                        borderBottomColor: colors.border,
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center"
                                                    }}
                                                >
                                                    <View>
                                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                            {formatClassName(cls.name, cls.section)}
                                                        </Text>
                                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                            {cls.role === 'admin' ? `${cls.students?.length || ''} students` : 'Class Teacher'}
                                                        </Text>
                                                    </View>
                                                    {selectedClass?._id === cls._id && selectedClass?.role === cls.role && (
                                                        <MaterialIcons name="check" size={24} color={colors.primary} />
                                                    )}
                                                </Pressable>
                                            ))
                                        )}
                                    </ScrollView>
                                    <Pressable onPress={() => setShowClassModal(false)} style={{ padding: 20, alignItems: "center" }}>
                                        <Text style={{ color: colors.error, fontFamily: "DMSans-Bold" }}>Cancel</Text>
                                    </Pressable>
                                </Pressable>
                            </Pressable>
                        </KeyboardAvoidingView>
                    </Modal>

                    {/* Student Selection Modal */}
                    <Modal visible={showStudentModal} animationType="slide" transparent onRequestClose={() => setShowStudentModal(false)}>
                        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={Keyboard.dismiss}>
                                <Pressable style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" }} onPress={(e) => e.stopPropagation()}>
                                    <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>Select Student</Text>
                                        <TextInput
                                            placeholder="Search student..."
                                            value={studentSearch}
                                            onChangeText={setStudentSearch}
                                            style={{
                                                backgroundColor: colors.cardBackground,
                                                padding: 12,
                                                borderRadius: 8,
                                                marginTop: 12,
                                                color: colors.textPrimary
                                            }}
                                        />
                                    </View>
                                    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                                        {filteredStudents.length === 0 ? (
                                            <Text style={{ textAlign: "center", color: colors.textSecondary, padding: 20 }}>No students found</Text>
                                        ) : (
                                            filteredStudents.map(student => (
                                                <Pressable
                                                    key={student._id}
                                                    onPress={() => {
                                                        setSelectedStudent(student);
                                                        setShowStudentModal(false);
                                                    }}
                                                    style={{
                                                        padding: 16,
                                                        borderBottomWidth: 1,
                                                        borderBottomColor: colors.border,
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center"
                                                    }}
                                                >
                                                    <View>
                                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                            {student.name}
                                                        </Text>
                                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                            {student.phone}
                                                        </Text>
                                                    </View>
                                                    {selectedStudent?._id === student._id && (
                                                        <MaterialIcons name="check" size={24} color={colors.primary} />
                                                    )}
                                                </Pressable>
                                            ))
                                        )}
                                    </ScrollView>
                                    <Pressable onPress={() => setShowStudentModal(false)} style={{ padding: 20, alignItems: "center" }}>
                                        <Text style={{ color: colors.error, fontFamily: "DMSans-Bold" }}>Cancel</Text>
                                    </Pressable>
                                </Pressable>
                            </Pressable>
                        </KeyboardAvoidingView>
                    </Modal>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
