import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function StudentAssignmentsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const [user, setUser] = useState(null);
    const [submittingId, setSubmittingId] = useState(null);
    const [submissionLink, setSubmissionLink] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const storedUser = await AsyncStorage.getItem("@auth_user");

            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                if (parsedUser.currentClass) {
                    const classId = parsedUser.currentClass._id || parsedUser.currentClass;

                    const response = await apiFetch(`${apiConfig.baseUrl}/assignments/class/${classId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setAssignments(data);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading assignments", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleSubmit = async (assignmentId) => {
        if (!submissionLink.trim()) {
            showToast("Please enter a Google Drive link", "error");
            return;
        }

        try {
            setSubmittingId(assignmentId); // Show loading for this specific assignment
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await apiFetch(`${apiConfig.baseUrl}/assignments/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    assignmentId,
                    submissionLink
                })
            });

            if (response.ok) {
                showToast("Assignment submitted successfully", "success");
                setSubmissionLink(""); // Clear input
                loadData(); // Reload to update status
            } else {
                const error = await response.json();
                showToast(error.message || "Failed to submit", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error submitting assignment", "error");
        } finally {
            setSubmittingId(null);
        }
    };

    const getStatusColor = (status, dueDate) => {
        if (status === 'graded') return colors.success;
        if (status === 'submitted') return colors.primary;
        if (status === 'late') return colors.error;

        // If not submitted, check if overdue
        if (new Date(dueDate) < new Date()) return colors.error;
        return colors.textSecondary;
    };

    const getStatusText = (submission, dueDate) => {
        if (submission) {
            if (submission.status === 'graded') return `Graded: ${submission.grade}`;
            return 'Submitted';
        }
        if (new Date(dueDate) < new Date()) return 'Overdue';
        return 'Pending';
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
                        title="My Assignments"
                        subtitle="Pending tasks and submissions"
                    />

                    {assignments.length === 0 ? (
                        <View style={{ alignItems: "center", marginTop: 60 }}>
                            <MaterialIcons name="assignment-turned-in" size={80} color={colors.textSecondary + "40"} />
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-SemiBold", color: colors.textPrimary, marginTop: 20 }}>
                                No Assignments
                            </Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
                                You're all caught up!
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginTop: 20 }}>
                            {assignments.map((assignment) => {
                                const isExpanded = submittingId === assignment._id || (assignment.submission === null && new Date(assignment.dueDate) >= new Date());
                                const statusColor = getStatusColor(assignment.submission?.status, assignment.dueDate);
                                const statusText = getStatusText(assignment.submission, assignment.dueDate);

                                return (
                                    <View
                                        key={assignment._id}
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 16,
                                            elevation: 2,
                                            borderLeftWidth: 4,
                                            borderLeftColor: statusColor
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "DMSans-Bold", textTransform: "uppercase", marginBottom: 4 }}>
                                                    {assignment.subject.name}
                                                </Text>
                                                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                                    {assignment.title}
                                                </Text>
                                            </View>
                                            <View style={{
                                                backgroundColor: statusColor + "20",
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 8
                                            }}>
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontFamily: "DMSans-Bold",
                                                    color: statusColor
                                                }}>
                                                    {statusText}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20, fontFamily: "DMSans-Regular" }}>
                                            {assignment.description}
                                        </Text>

                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
                                            <MaterialIcons name="event" size={16} color={colors.textSecondary} />
                                            <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                                Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                                            </Text>
                                        </View>

                                        {/* Submission Section */}
                                        {assignment.submission ? (
                                            <View style={{ marginTop: 16, backgroundColor: colors.background, padding: 12, borderRadius: 10 }}>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontFamily: "DMSans-Medium" }}>
                                                    Your Submission
                                                </Text>
                                                <Text
                                                    numberOfLines={1}
                                                    style={{ fontSize: 14, color: colors.primary, fontFamily: "DMSans-Regular", textDecorationLine: "underline" }}
                                                    onPress={() => Linking.openURL(assignment.submission.submissionLink)}
                                                >
                                                    {assignment.submission.submissionLink}
                                                </Text>

                                                {assignment.submission.feedback && (
                                                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.textSecondary + "20" }}>
                                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2, fontFamily: "DMSans-Medium" }}>
                                                            Teacher Feedback
                                                        </Text>
                                                        <Text style={{ fontSize: 14, color: colors.textPrimary, fontFamily: "DMSans-Regular" }}>
                                                            {assignment.submission.feedback}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <View style={{ marginTop: 16 }}>
                                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textPrimary, marginBottom: 8 }}>
                                                    Submit Work (Google Drive Link)
                                                </Text>
                                                <View style={{ flexDirection: "row", gap: 10 }}>
                                                    <TextInput
                                                        placeholder="Paste link here..."
                                                        placeholderTextColor={colors.textSecondary}
                                                        style={{
                                                            flex: 1,
                                                            backgroundColor: colors.background,
                                                            padding: 12,
                                                            borderRadius: 10,
                                                            color: colors.textPrimary,
                                                            fontSize: 14,
                                                            fontFamily: "DMSans-Regular",
                                                            borderWidth: 1,
                                                            borderColor: colors.textSecondary + "20"
                                                        }}
                                                        value={submittingId === assignment._id ? submissionLink : ""}
                                                        onChangeText={(text) => {
                                                            setSubmittingId(assignment._id);
                                                            setSubmissionLink(text);
                                                        }}
                                                    />
                                                    <Pressable
                                                        onPress={() => handleSubmit(assignment._id)}
                                                        disabled={submittingId === assignment._id && !submissionLink}
                                                        style={{
                                                            backgroundColor: colors.primary,
                                                            paddingHorizontal: 16,
                                                            justifyContent: "center",
                                                            borderRadius: 10,
                                                            opacity: (submittingId === assignment._id && !submissionLink) ? 0.5 : 1
                                                        }}
                                                    >
                                                        {submittingId === assignment._id && loading ? (
                                                            <ActivityIndicator size="small" color="#fff" />
                                                        ) : (
                                                            <MaterialIcons name="send" size={20} color="#fff" />
                                                        )}
                                                    </Pressable>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
