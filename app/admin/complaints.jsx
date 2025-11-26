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

export default function AdminComplaintsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [filter, setFilter] = useState("All");

    // Resolve Modal
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [response, setResponse] = useState("");
    const [status, setStatus] = useState("Resolved");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/complaints/all`, {
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

    const handleUpdateStatus = async () => {
        if (!selectedComplaint) return;

        setSubmitting(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const res = await apiFetch(`${apiConfig.baseUrl}/complaints/${selectedComplaint._id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status,
                    adminResponse: response
                })
            });

            if (res.ok) {
                showToast("Complaint updated", "success");
                setSelectedComplaint(null);
                setResponse("");
                loadComplaints();
            } else {
                showToast("Failed to update status", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error updating complaint", "error");
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

    const filteredComplaints = filter === "All"
        ? complaints
        : complaints.filter(c => c.status === filter);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="Complaints" subtitle="Manage Issues" showBack />
            </View>

            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {['All', 'Pending', 'In Progress', 'Resolved'].map(f => (
                            <Pressable
                                key={f}
                                onPress={() => setFilter(f)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    backgroundColor: filter === f ? colors.primary : colors.cardBackground,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: filter === f ? colors.primary : colors.textSecondary + "20"
                                }}
                            >
                                <Text style={{ color: filter === f ? "#fff" : colors.textPrimary }}>
                                    {f}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                {filteredComplaints.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                        <MaterialIcons name="check-circle" size={48} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No complaints found</Text>
                    </View>
                ) : (
                    filteredComplaints.map((complaint) => (
                        <Pressable
                            key={complaint._id}
                            onPress={() => {
                                setSelectedComplaint(complaint);
                                setStatus(complaint.status);
                                setResponse(complaint.adminResponse || "");
                            }}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                borderLeftWidth: 4,
                                borderLeftColor: getStatusColor(complaint.status),
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                            }}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, flex: 1 }}>
                                    {complaint.title}
                                </Text>
                                <Text style={{ fontSize: 12, color: getStatusColor(complaint.status), fontFamily: "DMSans-Bold" }}>
                                    {complaint.status}
                                </Text>
                            </View>

                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }} numberOfLines={2}>
                                {complaint.description}
                            </Text>

                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                    {complaint.student?.name} • {complaint.category}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                    {new Date(complaint.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            {/* Resolve Modal */}
            <Modal
                visible={!!selectedComplaint}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedComplaint(null)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                >
                    <View style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                Update Status
                            </Text>
                            <Pressable onPress={() => setSelectedComplaint(null)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {selectedComplaint && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{selectedComplaint.student?.name} reported:</Text>
                                <Text style={{ fontSize: 16, color: colors.textPrimary, fontFamily: "DMSans-Medium", marginTop: 4 }}>
                                    {selectedComplaint.title}
                                </Text>
                                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                                    {selectedComplaint.description}
                                </Text>
                            </View>
                        )}

                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Set Status</Text>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                            {['In Progress', 'Resolved', 'Rejected'].map(s => (
                                <Pressable
                                    key={s}
                                    onPress={() => setStatus(s)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        backgroundColor: status === s ? getStatusColor(s) : colors.background,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: status === s ? getStatusColor(s) : colors.textSecondary + "20"
                                    }}
                                >
                                    <Text style={{ color: status === s ? "#fff" : colors.textPrimary, fontSize: 12, fontFamily: "DMSans-Bold" }}>
                                        {s}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Response / Remarks</Text>
                        <TextInput
                            value={response}
                            onChangeText={setResponse}
                            placeholder="Add a response..."
                            placeholderTextColor={colors.textSecondary + "80"}
                            multiline
                            style={{
                                borderWidth: 1,
                                borderColor: colors.textSecondary + "40",
                                borderRadius: 12,
                                padding: 12,
                                color: colors.textPrimary,
                                fontSize: 16,
                                marginBottom: 24,
                                backgroundColor: colors.background,
                                minHeight: 80,
                                textAlignVertical: "top"
                            }}
                        />

                        <Pressable
                            onPress={handleUpdateStatus}
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
                                    Update Complaint
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
