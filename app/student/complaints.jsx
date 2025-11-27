import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Pressable,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function StudentComplaintsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [complaints, setComplaints] = useState([]);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Academic");
    const [submitting, setSubmitting] = useState(false);

    const categories = ['Academic', 'Facility', 'Transport', 'Discipline', 'Other'];

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/complaints/my-complaints`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setComplaints(data);
            } else {
                showToast("Failed to load complaints", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading complaints", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreate = async () => {
        if (!title.trim() || !description.trim()) {
            showToast("Please fill all fields", "error");
            return;
        }

        setSubmitting(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/complaints`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    category
                })
            });

            if (response.ok) {
                showToast("Complaint submitted successfully", "success");
                setShowCreateModal(false);
                setTitle("");
                setDescription("");
                setCategory("Academic");
                loadComplaints();
            } else {
                showToast("Failed to submit complaint", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error submitting complaint", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadComplaints();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return '#4CAF50';
            case 'In Progress': return '#FF9800';
            case 'Rejected': return '#F44336';
            default: return '#9E9E9E';
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
                    <Header title="Help & Support" subtitle="Report Issues" showBack />

                    {complaints.length === 0 ? (
                        <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                            <MaterialIcons name="feedback" size={64} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                No complaints reported yet.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginTop: 16 }}>
                            {complaints.map((complaint) => (
                                <View
                                    key={complaint._id}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 16,
                                        borderLeftWidth: 4,
                                        borderLeftColor: getStatusColor(complaint.status),
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
                                                {complaint.title}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                                {complaint.category} • {new Date(complaint.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={{ backgroundColor: getStatusColor(complaint.status) + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                            <Text style={{ color: getStatusColor(complaint.status), fontFamily: "DMSans-Bold", fontSize: 12 }}>
                                                {complaint.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={{ marginTop: 12, color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>
                                        {complaint.description}
                                    </Text>

                                    {complaint.adminResponse && (
                                        <View style={{ marginTop: 12, backgroundColor: colors.background, padding: 12, borderRadius: 8 }}>
                                            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "DMSans-Bold", marginBottom: 4 }}>
                                                Admin Response:
                                            </Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                                {complaint.adminResponse}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={() => setShowCreateModal(true)}
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
                    elevation: 5,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                }}
            >
                <MaterialIcons name="add" size={32} color="#fff" />
            </Pressable>

            {/* Create Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                >
                    <View style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                New Complaint
                            </Text>
                            <Pressable onPress={() => setShowCreateModal(false)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {categories.map(cat => (
                                        <Pressable
                                            key={cat}
                                            onPress={() => setCategory(cat)}
                                            style={{
                                                paddingHorizontal: 16,
                                                paddingVertical: 8,
                                                backgroundColor: category === cat ? colors.primary : colors.background,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: category === cat ? colors.primary : colors.textSecondary + "20"
                                            }}
                                        >
                                            <Text style={{ color: category === cat ? "#fff" : colors.textPrimary }}>
                                                {cat}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>

                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Title</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Brief summary of the issue"
                                placeholderTextColor={colors.textSecondary + "80"}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.textSecondary + "40",
                                    borderRadius: 12,
                                    padding: 16,
                                    color: colors.textPrimary,
                                    fontSize: 16,
                                    marginBottom: 16,
                                    backgroundColor: colors.background
                                }}
                            />

                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Description</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Detailed explanation..."
                                placeholderTextColor={colors.textSecondary + "80"}
                                multiline
                                numberOfLines={4}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.textSecondary + "40",
                                    borderRadius: 12,
                                    padding: 16,
                                    color: colors.textPrimary,
                                    fontSize: 16,
                                    marginBottom: 24,
                                    backgroundColor: colors.background,
                                    minHeight: 100,
                                    textAlignVertical: "top"
                                }}
                            />

                            <Pressable
                                onPress={handleCreate}
                                disabled={submitting}
                                style={{
                                    backgroundColor: colors.primary,
                                    padding: 16,
                                    borderRadius: 16,
                                    alignItems: "center",
                                    opacity: submitting ? 0.7 : 1
                                }}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: "#fff", fontSize: 16, fontFamily: "DMSans-Bold" }}>
                                        Submit Complaint
                                    </Text>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
