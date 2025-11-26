import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import apiFetch from "../../../utils/apiFetch";
import { useToast } from "../../../components/ToastProvider";
import Header from "../../../components/Header";

export default function EnterMarksScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const { examId } = params;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState(null);
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({});
    const [existingMarks, setExistingMarks] = useState({});

    useEffect(() => {
        loadData();
    }, [examId]);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // Load exam details
            const examResponse = await apiFetch(`${apiConfig.baseUrl}/exams/${examId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (examResponse.ok) {
                const examData = await examResponse.json();
                setExam(examData);

                // Load students in the class
                const studentsResponse = await apiFetch(
                    `${apiConfig.baseUrl}/classes/${examData.class._id}/full-details`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (studentsResponse.ok) {
                    const classData = await studentsResponse.json();
                    setStudents(classData.students || []);
                }

                // Load existing marks
                const marksResponse = await apiFetch(
                    `${apiConfig.baseUrl}/marks/exam/${examId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (marksResponse.ok) {
                    const marks = await marksResponse.json();
                    const marksMap = {};
                    const existingMap = {};

                    marks.forEach(mark => {
                        const studentId = mark.student._id;
                        marksMap[studentId] = mark.marksObtained.toString();
                        existingMap[studentId] = mark;
                    });

                    setMarksData(marksMap);
                    setExistingMarks(existingMap);
                }
            } else {
                showToast("Failed to load exam", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleMarksChange = (studentId, value) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    const handleSaveMarks = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("@auth_token");

            // Prepare marks data for bulk upload
            const marksArray = Object.keys(marksData)
                .filter(studentId => marksData[studentId] !== '' && marksData[studentId] !== undefined)
                .map(studentId => ({
                    studentId,
                    marksObtained: parseFloat(marksData[studentId])
                }));

            if (marksArray.length === 0) {
                showToast("Please enter marks for at least one student", "warning");
                setSaving(false);
                return;
            }

            // Validate all marks
            const invalidMarks = marksArray.filter(
                m => isNaN(m.marksObtained) || m.marksObtained < 0 || m.marksObtained > exam.totalMarks
            );

            if (invalidMarks.length > 0) {
                showToast(`Marks must be between 0 and ${exam.totalMarks}`, "error");
                setSaving(false);
                return;
            }

            const response = await apiFetch(`${apiConfig.baseUrl}/marks/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    examId,
                    marksData: marksArray
                })
            });

            if (response.ok) {
                const result = await response.json();
                const failures = result.results.filter(r => !r.success);

                if (failures.length > 0) {
                    showToast(`Marks saved with ${failures.length} errors`, "warning");
                } else {
                    showToast("All marks saved successfully", "success");
                }

                loadData(); // Reload to show updated marks
            } else {
                const error = await response.json();
                showToast(error.message || "Failed to save marks", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error saving marks", "error");
        } finally {
            setSaving(false);
        }
    };

    const getGradeColor = (grade) => {
        if (grade === 'A+' || grade === 'A') return colors.success;
        if (grade === 'B+' || grade === 'B') return '#2196F3';
        if (grade === 'C') return '#FF9800';
        if (grade === 'D') return '#FF5722';
        return colors.error;
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!exam) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 20 }}>
                <MaterialIcons name="error-outline" size={64} color={colors.error} />
                <Text style={{ fontSize: 18, fontFamily: "DMSans-SemiBold", color: colors.textPrimary, marginTop: 16 }}>
                    Exam not found
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Enter Marks"
                        subtitle={`${exam.name} - ${exam.subject.name}`}
                        showBack
                    />

                    {/* Exam Info Card */}
                    <View style={{
                        backgroundColor: colors.primary + "15",
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 20,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary
                    }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                Class
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {exam.class.name} {exam.class.section}
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                Type
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.textPrimary, textTransform: "capitalize" }}>
                                {exam.type.replace('-', ' ')}
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                Total Marks
                            </Text>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.primary }}>
                                {exam.totalMarks}
                            </Text>
                        </View>
                    </View>

                    {/* Students List with Marks Entry */}
                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 28, marginBottom: 16 }}>
                        Student Marks ({students.length})
                    </Text>

                    {students.length === 0 ? (
                        <View style={{ alignItems: "center", marginTop: 40 }}>
                            <MaterialIcons name="people-outline" size={64} color={colors.textSecondary} />
                            <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Medium" }}>
                                No students in this class
                            </Text>
                        </View>
                    ) : (
                        students.map((student, index) => {
                            const existingMark = existingMarks[student._id];
                            const currentValue = marksData[student._id] || '';

                            return (
                                <View
                                    key={student._id}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 12,
                                        elevation: 1
                                    }}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                {index + 1}. {student.name}
                                            </Text>
                                            {student.email && (
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                                    {student.email}
                                                </Text>
                                            )}
                                        </View>

                                        {existingMark && (
                                            <View style={{
                                                backgroundColor: getGradeColor(existingMark.grade) + "20",
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 8
                                            }}>
                                                <Text style={{
                                                    fontSize: 16,
                                                    fontFamily: "DMSans-Bold",
                                                    color: getGradeColor(existingMark.grade)
                                                }}>
                                                    {existingMark.grade}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Marks Input */}
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6, fontFamily: "DMSans-Medium" }}>
                                                Marks Obtained (out of {exam.totalMarks})
                                            </Text>
                                            <TextInput
                                                placeholder="0"
                                                placeholderTextColor={colors.textSecondary + "60"}
                                                keyboardType="numeric"
                                                style={{
                                                    backgroundColor: colors.background,
                                                    padding: 12,
                                                    borderRadius: 10,
                                                    color: colors.textPrimary,
                                                    fontSize: 18,
                                                    fontFamily: "DMSans-Bold",
                                                    borderWidth: 2,
                                                    borderColor: currentValue !== '' ? colors.primary : colors.textSecondary + "20"
                                                }}
                                                value={currentValue}
                                                onChangeText={(value) => handleMarksChange(student._id, value)}
                                            />
                                        </View>

                                        {currentValue !== '' && !isNaN(currentValue) && (
                                            <View style={{ alignItems: "center", minWidth: 60 }}>
                                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, fontFamily: "DMSans-Medium" }}>
                                                    %
                                                </Text>
                                                <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.primary }}>
                                                    {((parseFloat(currentValue) / exam.totalMarks) * 100).toFixed(0)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}

                    {/* Save Button */}
                    {students.length > 0 && (
                        <Pressable
                            onPress={handleSaveMarks}
                            disabled={saving}
                            style={({ pressed }) => ({
                                backgroundColor: colors.primary,
                                borderRadius: 12,
                                padding: 16,
                                marginTop: 24,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                opacity: pressed || saving ? 0.7 : 1,
                                elevation: 3
                            })}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <MaterialIcons name="save" size={24} color="#fff" />
                                    <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                        Save All Marks
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
