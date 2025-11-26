import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    Linking,
    TextInput,
    Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import apiFetch from "../../../utils/apiFetch";
import { useToast } from "../../../components/ToastProvider";
import Header from "../../../components/Header";

export default function AssignmentSubmissionsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const { assignmentId, title } = params;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [gradeModalVisible, setGradeModalVisible] = useState(false);

    // Grading state
    const [grade, setGrade] = useState("");
    const [feedback, setFeedback] = useState("");
    const [gradingLoading, setGradingLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [assignmentId]);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/assignments/${assignmentId}/submissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSubmissions(data);
            } else {
                showToast("Failed to load submissions", "error");
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

    const openLink = async (url) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                showToast("Cannot open this link", "error");
            }
        } catch (error) {
            showToast("Invalid link format", "error");
        }
    };

    const openGradeModal = (submission) => {
        setSelectedSubmission(submission);
        setGrade(submission.grade || "");
        setFeedback(submission.feedback || "");
        setGradeModalVisible(true);
    };

    const handleSaveGrade = async () => {
        try {
            setGradingLoading(true);
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await apiFetch(`${apiConfig.baseUrl}/assignments/submission/${selectedSubmission._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    grade,
                    feedback,
                    status: 'graded'
                })
            });

            if (response.ok) {
                showToast("Grade saved successfully", "success");
                setGradeModalVisible(false);
                loadData(); // Reload to update list
            } else {
                showToast("Failed to save grade", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error saving grade", "error");
        } finally {
            setGradingLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'graded': return colors.success;
            case 'submitted': return colors.primary;
            case 'late': return colors.error;
            default: return colors.textSecondary;
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
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
                        title="Submissions"
                        subtitle={title || "Assignment Details"}
                        showBack
                    />

                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>
                            Student Submissions ({submissions.length})
                        </Text>

                        {submissions.length === 0 ? (
                            <View style={{ alignItems: "center", marginTop: 40 }}>
                                <MaterialIcons name="assignment-late" size={64} color={colors.textSecondary} />
                                <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Medium" }}>
                                    No submissions yet
                                </Text>
                            </View>
                        ) : (
                            submissions.map((submission) => (
                                <View
                                    key={submission._id}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        elevation: 2
                                    }}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                                {submission.student.name}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                                Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={{
                                            backgroundColor: getStatusColor(submission.status) + "20",
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 8
                                        }}>
                                            <Text style={{
                                                fontSize: 12,
                                                fontFamily: "DMSans-Bold",
                                                color: getStatusColor(submission.status),
                                                textTransform: "capitalize"
                                            }}>
                                                {submission.status}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Link */}
                                    <Pressable
                                        onPress={() => openLink(submission.submissionLink)}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 8,
                                            marginTop: 12,
                                            padding: 10,
                                            backgroundColor: colors.background,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: colors.textSecondary + "20"
                                        }}
                                    >
                                        <MaterialIcons name="link" size={20} color={colors.primary} />
                                        <Text
                                            numberOfLines={1}
                                            style={{ flex: 1, color: colors.primary, textDecorationLine: "underline", fontFamily: "DMSans-Medium" }}
                                        >
                                            {submission.submissionLink}
                                        </Text>
                                        <MaterialIcons name="open-in-new" size={16} color={colors.textSecondary} />
                                    </Pressable>

                                    {/* Grade/Feedback Display or Action */}
                                    <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        {submission.grade ? (
                                            <View>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                                    Grade
                                                </Text>
                                                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.success }}>
                                                    {submission.grade}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                                    Not Graded
                                                </Text>
                                            </View>
                                        )}

                                        <Pressable
                                            onPress={() => openGradeModal(submission)}
                                            style={{
                                                backgroundColor: colors.primary,
                                                paddingHorizontal: 16,
                                                paddingVertical: 8,
                                                borderRadius: 8
                                            }}
                                        >
                                            <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 13 }}>
                                                {submission.grade ? "Edit Grade" : "Grade Work"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Grading Modal */}
            <Modal
                visible={gradeModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setGradeModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                Grade Submission
                            </Text>
                            <Pressable onPress={() => setGradeModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary, marginBottom: 16 }}>
                            Student: {selectedSubmission?.student?.name}
                        </Text>

                        {/* Grade Input */}
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>
                            Grade / Marks
                        </Text>
                        <TextInput
                            placeholder="e.g., A, 95/100, Excellent"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 10,
                                color: colors.textPrimary,
                                fontSize: 16,
                                fontFamily: "DMSans-Regular",
                                borderWidth: 1,
                                borderColor: colors.textSecondary + "20",
                                marginBottom: 16
                            }}
                            value={grade}
                            onChangeText={setGrade}
                        />

                        {/* Feedback Input */}
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>
                            Feedback (Optional)
                        </Text>
                        <TextInput
                            placeholder="Enter feedback for the student..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 10,
                                color: colors.textPrimary,
                                fontSize: 16,
                                fontFamily: "DMSans-Regular",
                                borderWidth: 1,
                                borderColor: colors.textSecondary + "20",
                                minHeight: 80,
                                marginBottom: 24
                            }}
                            value={feedback}
                            onChangeText={setFeedback}
                        />

                        <Pressable
                            onPress={handleSaveGrade}
                            disabled={gradingLoading}
                            style={{
                                backgroundColor: colors.primary,
                                borderRadius: 12,
                                padding: 16,
                                alignItems: "center",
                                opacity: gradingLoading ? 0.7 : 1
                            }}
                        >
                            {gradingLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    Save Grade
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
