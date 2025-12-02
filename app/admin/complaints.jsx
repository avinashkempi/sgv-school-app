import React, { useState,} from "react";
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

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function AdminComplaintsScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("All");

    // Resolve Modal
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [response, setResponse] = useState("");
    const [status, setStatus] = useState("Resolved");

    // Fetch Complaints
    const { data: complaints = [], isLoading: loading, refetch } = useApiQuery(
        ['adminComplaints'],
        `${apiConfig.baseUrl}/complaints/all`
    );

    // Update Status Mutation
    const updateStatusMutation = useApiMutation({
        mutationFn: (data) => createApiMutationFn(`${apiConfig.baseUrl}/complaints/${data.id}/status`, 'PUT')(data.body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
            showToast("Complaint updated", "success");
            setSelectedComplaint(null);
            setResponse("");
        },
        onError: (error) => showToast(error.message || "Failed to update status", "error")
    });

    const handleUpdateStatus = () => {
        if (!selectedComplaint) return;

        updateStatusMutation.mutate({
            id: selectedComplaint._id,
            body: {
                status,
                adminResponse: response
            }
        });
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
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
                            disabled={updateStatusMutation.isPending}
                            style={{
                                backgroundColor: colors.primary,
                                padding: 16,
                                borderRadius: 16,
                                alignItems: "center",
                                opacity: updateStatusMutation.isPending ? 0.7 : 1
                            }}
                        >
                            {updateStatusMutation.isPending ? (
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
