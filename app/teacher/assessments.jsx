import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";
import apiConfig from "../../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AssessmentDashboard() {
    const router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const [user, setUser] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem("@auth_user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        };
        loadUser();
    }, []);

    // Fetch Teacher's Classes (Assuming generic teacher classes endpoint or filtering)
    // For now, let's use the existing teacher classes endpoint
    const { data: teacherClasses, isLoading: loadingClasses } = useApiQuery(
        ['teacherClasses', user?.id],
        `${apiConfig.baseUrl}/teachers/${user?.id}/classes`,
        { enabled: !!user?.id }
    );

    // Fetch Subjects for selected class (if class teacher) or just teacher's subjects
    // This part depends on how the backend exposes subjects. 
    // Let's assume we can get subjects for a class that the teacher teaches.
    const { data: subjects, isLoading: loadingSubjects } = useApiQuery(
        ['classSubjects', selectedClass?._id],
        `${apiConfig.baseUrl}/classes/${selectedClass?._id}/subjects`, // This might need adjustment based on actual API
        { enabled: !!selectedClass }
    );

    // Fetch Standardized Exams Status
    const { data: examStatus, isLoading: loadingExams, refetch: refetchExams } = useApiQuery(
        ['standardizedExams', selectedClass?._id, selectedSubject?._id],
        `${apiConfig.baseUrl}/exams/standardized?classId=${selectedClass?._id}&subjectId=${selectedSubject?._id}`,
        { enabled: !!selectedClass && !!selectedSubject }
    );

    const createExamMutation = useApiMutation(`${apiConfig.baseUrl}/exams/standardized`, 'POST');

    const handleCreateExam = async (type) => {
        if (!selectedClass || !selectedSubject) return;

        Alert.alert(
            "Initialize Exam",
            `Are you sure you want to initialize ${type} for ${selectedClass.name} - ${selectedSubject.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Create",
                    onPress: async () => {
                        try {
                            await createExamMutation.mutateAsync({
                                type,
                                classId: selectedClass._id,
                                subjectId: selectedSubject._id,
                                totalMarks: type.startsWith('SA') ? 80 : 20, // Default marks, can be editable later
                                instructions: `Standardized ${type} Assessment`
                            });
                            showToast(`${type} created successfully`, "success");
                            refetchExams();
                        } catch (error) {
                            showToast(error.message || "Failed to create exam", "error");
                        }
                    }
                }
            ]
        );
    };

    const handleEnterMarks = (exam) => {
        router.push({
            pathname: "/teacher/marks-entry",
            params: {
                examId: exam._id,
                examName: exam.name,
                className: selectedClass.name,
                subjectName: selectedSubject.name
            }
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <AppHeader title="Assessments" subtitle="Manage Standardized Exams" />

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

                {/* Class Selection */}
                <Text style={[localStyles.label, { color: colors.textPrimary }]}>Select Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {loadingClasses ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        teacherClasses?.map((cls) => (
                            <TouchableOpacity
                                key={cls._id}
                                style={[
                                    localStyles.chip,
                                    {
                                        backgroundColor: selectedClass?._id === cls._id ? colors.primary : colors.cardBackground,
                                        borderColor: selectedClass?._id === cls._id ? colors.primary : colors.borderColor
                                    }
                                ]}
                                onPress={() => {
                                    setSelectedClass(cls);
                                    setSelectedSubject(null); // Reset subject
                                }}
                            >
                                <Text style={{
                                    color: selectedClass?._id === cls._id ? "#fff" : colors.textPrimary,
                                    fontFamily: "DMSans-Medium"
                                }}>
                                    {cls.name} {cls.section}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>

                {/* Subject Selection */}
                {selectedClass && (
                    <>
                        <Text style={[localStyles.label, { color: colors.textPrimary }]}>Select Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {loadingSubjects ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                subjects?.map((sub) => (
                                    <TouchableOpacity
                                        key={sub._id}
                                        style={[
                                            localStyles.chip,
                                            {
                                                backgroundColor: selectedSubject?._id === sub._id ? colors.primary : colors.cardBackground,
                                                borderColor: selectedSubject?._id === sub._id ? colors.primary : colors.borderColor
                                            }
                                        ]}
                                        onPress={() => setSelectedSubject(sub)}
                                    >
                                        <Text style={{
                                            color: selectedSubject?._id === sub._id ? "#fff" : colors.textPrimary,
                                            fontFamily: "DMSans-Medium"
                                        }}>
                                            {sub.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </>
                )}

                {/* Exam Grid */}
                {selectedClass && selectedSubject ? (
                    loadingExams ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <View style={localStyles.grid}>
                            {examStatus?.map((item) => (
                                <View
                                    key={item.type}
                                    style={[localStyles.card, { backgroundColor: colors.cardBackground }]}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                            {item.type}
                                        </Text>
                                        {item.exists ? (
                                            <MaterialIcons name="check-circle" size={20} color={colors.success} />
                                        ) : (
                                            <MaterialIcons name="radio-button-unchecked" size={20} color={colors.textSecondary} />
                                        )}
                                    </View>

                                    {item.exists ? (
                                        <>
                                            <View style={{ marginBottom: 16 }}>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                                    Status: {item.marksEntered ? "Marks Entered" : "Pending Entry"}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular", marginTop: 4 }}>
                                                    Students Graded: {item.marksCount}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[localStyles.button, { backgroundColor: colors.primary }]}
                                                onPress={() => handleEnterMarks(item.exam)}
                                            >
                                                <Text style={localStyles.buttonText}>Manage Marks</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <View style={{ marginBottom: 16 }}>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                                    Not Created Yet
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[localStyles.button, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primary }]}
                                                onPress={() => handleCreateExam(item.type)}
                                            >
                                                <Text style={[localStyles.buttonText, { color: colors.primary }]}>Initialize</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            ))}
                        </View>
                    )
                ) : (
                    <View style={{ alignItems: "center", marginTop: 60 }}>
                        <MaterialIcons name="assignment" size={60} color={colors.textSecondary + "40"} />
                        <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Medium" }}>
                            Select a Class and Subject to view exams
                        </Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
}

const localStyles = StyleSheet.create({
    label: {
        fontSize: 14,
        fontFamily: "DMSans-Bold",
        marginBottom: 12,
        marginLeft: 4
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 10,
        minWidth: 80,
        alignItems: "center"
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 10
    },
    card: {
        width: "48%",
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        marginBottom: 4
    },
    button: {
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center"
    },
    buttonText: {
        color: "#fff",
        fontSize: 12,
        fontFamily: "DMSans-Bold"
    }
});
