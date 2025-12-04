import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";
import apiConfig from "../../config/apiConfig";

export default function MarksEntryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { examId, examName, className, subjectName } = params;
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const [marksData, setMarksData] = useState({});
    const [saving, setSaving] = useState(false);

    // Fetch Exam Details (to get total marks)
    const { data: examDetails } = useApiQuery(
        ['examDetails', examId],
        `${apiConfig.baseUrl}/exams/${examId}`,
        { enabled: !!examId }
    );

    // Fetch Students in Class
    // We need to fetch students of the class associated with the exam
    // Assuming examDetails has class info or we use the classId from params if we passed it (we didn't pass classId explicitly but we can get it from examDetails)
    const classId = examDetails?.class?._id || examDetails?.class;

    const { data: students, isLoading: loadingStudents } = useApiQuery(
        ['classStudents', classId],
        `${apiConfig.baseUrl}/classes/${classId}/students`,
        { enabled: !!classId }
    );

    // Fetch Existing Marks
    const { data: existingMarks, isLoading: loadingMarks } = useApiQuery(
        ['examMarks', examId],
        `${apiConfig.baseUrl}/marks/exam/${examId}`,
        { enabled: !!examId }
    );

    // Initialize marks data when students or existing marks load
    useEffect(() => {
        if (students && existingMarks) {
            const initialData = {};
            students.forEach(student => {
                const markEntry = existingMarks.find(m => m.student._id === student._id || m.student === student._id);
                initialData[student._id] = {
                    marksObtained: markEntry ? String(markEntry.marksObtained) : "",
                    remarks: markEntry ? markEntry.remarks : ""
                };
            });
            setMarksData(initialData);
        } else if (students) {
            const initialData = {};
            students.forEach(student => {
                initialData[student._id] = {
                    marksObtained: "",
                    remarks: ""
                };
            });
            setMarksData(initialData);
        }
    }, [students, existingMarks]);

    const bulkMarksMutation = useApiMutation(`${apiConfig.baseUrl}/marks/bulk`, 'POST');

    const handleMarksChange = (studentId, value) => {
        // Validate input (allow empty or numbers)
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setMarksData(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], marksObtained: value }
            }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                examId,
                marksData: Object.entries(marksData)
                    .filter(([_, data]) => data.marksObtained !== "") // Only send entries with marks
                    .map(([studentId, data]) => ({
                        studentId,
                        marksObtained: parseFloat(data.marksObtained),
                        remarks: data.remarks
                    }))
            };

            await bulkMarksMutation.mutateAsync(payload);
            showToast("Marks saved successfully", "success");
            router.back();
        } catch (error) {
            showToast(error.message || "Failed to save marks", "error");
        } finally {
            setSaving(false);
        }
    };

    const totalMarks = examDetails?.totalMarks || 0;

    if (loadingStudents || loadingMarks) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <AppHeader
                title={`${examName} Marks`}
                subtitle={`${className} - ${subjectName} (Max: ${totalMarks})`}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    <View style={localStyles.headerRow}>
                        <Text style={[localStyles.headerText, { color: colors.textSecondary, flex: 2 }]}>Student</Text>
                        <Text style={[localStyles.headerText, { color: colors.textSecondary, flex: 1, textAlign: "center" }]}>Marks</Text>
                    </View>

                    {students?.map((student) => (
                        <View
                            key={student._id}
                            style={[localStyles.row, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}
                        >
                            <View style={{ flex: 2 }}>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>
                                    {student.name}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                    Roll: {student.rollNumber || "-"}
                                </Text>
                            </View>

                            <View style={{ flex: 1, alignItems: "center" }}>
                                <TextInput
                                    style={[
                                        localStyles.input,
                                        {
                                            color: colors.textPrimary,
                                            borderColor: colors.borderColor,
                                            backgroundColor: colors.background
                                        }
                                    ]}
                                    keyboardType="numeric"
                                    maxLength={5}
                                    value={marksData[student._id]?.marksObtained || ""}
                                    onChangeText={(text) => handleMarksChange(student._id, text)}
                                    placeholder="-"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[localStyles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.borderColor }]}>
                <TouchableOpacity
                    style={[localStyles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={localStyles.saveButtonText}>Save Marks</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const localStyles = StyleSheet.create({
    headerRow: {
        flexDirection: "row",
        paddingBottom: 8,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0"
    },
    headerText: {
        fontSize: 12,
        fontFamily: "DMSans-Bold",
        textTransform: "uppercase"
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1
    },
    input: {
        width: 60,
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        textAlign: "center",
    },
    footer: {
        position: "absolute",
        bottom: 130,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
        elevation: 10
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center"
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "DMSans-Bold"
    }
});
