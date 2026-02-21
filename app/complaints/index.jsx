import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    ActionSheetIOS,
    Platform,
    ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../../utils/storage";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";


export default function ComplaintsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Tabs: 
    // Student: 'my_complaints', 'teacher_feedback'
    // Teacher: 'my_complaints', 'sent_feedback'
    // Admin: 'inbox', 'feedback_logs'
    const [activeTab, setActiveTab] = useState("loading");

    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null); // Need userId for permission checks locally if needed
    const [isClassTeacher, setIsClassTeacher] = useState(false);

    // Edit State
    const [editingFeedback, setEditingFeedback] = useState(null);
    const [editMessage, setEditMessage] = useState("");

    // FAB State
    const [showFabOptions, setShowFabOptions] = useState(false);

    // Filter state for Admin Inbox
    const [adminFilter, setAdminFilter] = useState("All");

    // Admin Status Update State
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [response, setResponse] = useState("");
    const [status, setStatus] = useState("Resolved");

    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const userStr = await storage.getItem("@auth_user");
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserId(user._id || user.id);
            const role = user.role;
            setUserRole(role);

            // Set default tab based on role
            const normalizedRole = role === 'super admin' ? 'super admin' : role;
            if (normalizedRole === 'student') setActiveTab('my_complaints');
            else if (normalizedRole === 'teacher') setActiveTab('my_complaints');
            else setActiveTab('inbox');
        }
    };

    // Check if teacher is a class teacher (for FAB visibility)
    const { data: teacherClassData } = useApiQuery(
        ['myClassesForFeedback'],
        `${apiConfig.baseUrl}/teachers/my-classes-and-subjects`,
        { enabled: userRole === 'teacher' }
    );

    useEffect(() => {
        if (teacherClassData?.asClassTeacher?.length > 0) {
            setIsClassTeacher(true);
        }
    }, [teacherClassData]);

    // Determine API Endpoint based on Tab
    const getApiEndpoint = () => {
        switch (activeTab) {
            case 'inbox': return '/complaints/inbox';
            case 'my_complaints': return '/complaints/my-complaints';
            case 'teacher_feedback': return '/feedback/my';
            case 'sent_feedback': return '/feedback/sent';
            case 'feedback_logs': return '/feedback/all';
            default: return '/complaints/my-complaints';
        }
    };

    const queryKey = ['data', activeTab];

    const { data: listData, isLoading: loading, refetch } = useApiQuery(
        queryKey,
        `${apiConfig.baseUrl}${getApiEndpoint()}`,
        { enabled: !!userRole && activeTab !== 'loading' }
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // --- Mutations for Feedback ---

    const updateFeedbackMutation = useApiMutation({
        mutationFn: createApiMutationFn((id) => `${apiConfig.baseUrl}/feedback/${id}`, 'PUT'),
        onSuccess: () => {
            showToast("Feedback updated", "success");
            setEditingFeedback(null);
            queryClient.invalidateQueries(queryKey);
            refetch();
        },
        onError: (e) => showToast(e.message || "Update failed", "error")
    });

    const deleteFeedbackMutation = useApiMutation({
        mutationFn: createApiMutationFn((id) => `${apiConfig.baseUrl}/feedback/${id}`, 'DELETE'),
        onSuccess: () => {
            showToast("Feedback deleted", "success");
            queryClient.invalidateQueries(queryKey);
            refetch();
        },
        onError: (e) => showToast(e.message || "Delete failed", "error")
    });

    const handleEdit = (item) => {
        setEditMessage(item.message);
        setEditingFeedback(item);
    };

    const handleDelete = (item) => {
        Alert.alert(
            "Delete Feedback",
            "Are you sure you want to delete this feedback?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteFeedbackMutation.mutate(item._id) }
            ]
        );
    };

    const submitEdit = () => {
        if (!editMessage.trim()) {
            showToast("Message cannot be empty", "error");
            return;
        }
        updateFeedbackMutation.mutate({
            id: editingFeedback._id,
            data: { message: editMessage }
        });
    };

    // --- Status Update for Admin ---
    const updateStatusMutation = useApiMutation({
        mutationFn: (data) => createApiMutationFn(`${apiConfig.baseUrl}/complaints/${data.id}/status`, 'PUT')(data.body),
        onSuccess: () => {
            queryClient.invalidateQueries(queryKey);
            showToast("Complaint updated", "success");
            setSelectedComplaint(null);
            setResponse("");
            refetch();
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


    // --- Render Items ---

    const renderComplaintItem = (item) => (
        <Pressable
            key={item._id}
            style={({ pressed }) => [
                styles.cardMinimal,
                { marginBottom: 12, opacity: pressed ? 0.9 : 1 }
            ]}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primary + "15", borderRadius: 8 }}>
                        <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "DMSans-Bold" }}>{item.category}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: getStatusColor(item.status) + "15", borderRadius: 8 }}>
                        <Text style={{ color: getStatusColor(item.status), fontSize: 11, fontFamily: "DMSans-Bold" }}>{item.status}</Text>
                    </View>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Medium" }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>

            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 6 }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Regular", fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                {item.description}
            </Text>

            {activeTab === 'inbox' && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Regular" }}>
                            From: <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {item.raisedBy?.name || 'Unknown'}
                                {item.raisedBy?.role ? ` (${item.raisedBy.role !== 'student' && item.raisedBy.designation ? item.raisedBy.designation : item.raisedBy.role === 'support_staff' ? 'Support Staff' : item.raisedBy.role})` : ''}
                            </Text>
                        </Text>
                        <Pressable
                            onPress={() => {
                                setSelectedComplaint(item);
                                setStatus(item.status === 'Pending' ? 'In Progress' : item.status);
                                setResponse(item.adminResponse || "");
                            }}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primary + "10", borderRadius: 8 }}
                        >
                            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "DMSans-Bold" }}>Update</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {item.adminResponse && activeTab === 'my_complaints' && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background + "50", borderRadius: 8, padding: 8 }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "DMSans-Bold", marginBottom: 2 }}>ADMIN RESPONSE</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans-Regular" }}>{item.adminResponse}</Text>
                </View>
            )}
        </Pressable>
    );

    const renderFeedbackItem = (item) => {
        const canEdit = (userRole === 'teacher' && item.teacher?._id === userId) || userRole === 'admin' || userRole === 'super admin';

        return (
            <View
                key={item._id}
                style={[
                    styles.cardMinimal,
                    { marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.secondary }
                ]}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <View>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Bold", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {item.subject ? item.subject.name : "General Feedback"}
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 4 }}>
                            {item.class ? `${item.class.name} ${item.class.section || ''}` : ''}
                        </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Medium" }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Regular", fontSize: 15, lineHeight: 22 }}>
                        {item.message}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View>
                        {activeTab === 'teacher_feedback' || activeTab === 'feedback_logs' ? (
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                From: <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{item.teacher?.name}</Text>
                            </Text>
                        ) : (
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                To: <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{item.student?.name}</Text>
                            </Text>
                        )}
                    </View>

                    {canEdit && (
                        <View style={{ flexDirection: "row", gap: 16 }}>
                            <Pressable onPress={() => handleEdit(item)}>
                                <MaterialIcons name="edit" size={18} color={colors.primary} />
                            </Pressable>
                            <Pressable onPress={() => handleDelete(item)}>
                                <MaterialIcons name="delete" size={18} color={colors.error} />
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return colors.success;
            case 'Rejected': return colors.error;
            case 'In Progress': return colors.warning;
            default: return colors.textSecondary;
        }
    };

    // --- Tab Rendering ---

    const TabButton = ({ id, label }) => (
        <Pressable
            onPress={() => setActiveTab(id)}
            style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: activeTab === id ? colors.primary : "transparent",
                borderRadius: 8,
                margin: 2
            }}
        >
            <Text style={{
                fontFamily: "DMSans-Bold",
                color: activeTab === id ? "#fff" : colors.textSecondary,
                fontSize: 13
            }} numberOfLines={1}>{label}</Text>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <View style={{ paddingTop: 4, paddingBottom: 10 }}>
                <Header title="Complaints & Feedback" subtitle="Issues & Performance" showBack />
            </View>

            {/* Role-Based Tabs */}
            <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", backgroundColor: colors.cardBackground, borderRadius: 12, padding: 4 }}>
                    {userRole === 'student' && (
                        <>
                            <TabButton id="my_complaints" label="Complaints" />
                            <TabButton id="teacher_feedback" label="Feedback" />
                        </>
                    )}
                    {userRole === 'teacher' && (
                        <>
                            <TabButton id="my_complaints" label="My Complaints" />
                            <TabButton id="sent_feedback" label="Sent Feedback" />
                        </>
                    )}
                    {(userRole === 'admin' || userRole === 'super admin') && (
                        <>
                            <TabButton id="inbox" label="Inbox" />
                            <TabButton id="sent_feedback" label="Sent" />
                            <TabButton id="feedback_logs" label="Logs" />
                        </>
                    )}
                </View>
            </View>

            {/* Admin Filter Options */}
            {activeTab === 'inbox' && (userRole === 'admin' || userRole === 'super admin') && (
                <View style={{ marginBottom: 16 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {['All', 'Pending', 'In Progress', 'Resolved'].map(f => (
                                <Pressable
                                    key={f}
                                    onPress={() => setAdminFilter(f)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 6,
                                        backgroundColor: adminFilter === f ? colors.primary + "20" : colors.cardBackground,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: adminFilter === f ? colors.primary : colors.border
                                    }}
                                >
                                    <Text style={{
                                        color: adminFilter === f ? colors.primary : colors.textSecondary,
                                        fontFamily: "DMSans-Bold",
                                        fontSize: 12
                                    }}>
                                        {f}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={listData ? (
                        activeTab === 'inbox' && adminFilter !== 'All'
                            ? listData.filter(c => c.status === adminFilter)
                            : listData
                    ) : []}
                    renderItem={({ item }) => {
                        if (activeTab.includes('feedback')) return renderFeedbackItem(item);
                        return renderComplaintItem(item);
                    }}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                    ListEmptyComponent={() => (
                        <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6, paddingHorizontal: 20 }}>
                            <MaterialIcons name={activeTab.includes('feedback') ? "rate-review" : "inbox"} size={48} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Bold", fontSize: 16 }}>
                                {activeTab === 'my_complaints' ? "No Complaints Raised"
                                    : activeTab === 'teacher_feedback' ? "No Feedback Yet"
                                        : activeTab === 'sent_feedback' ? "No Feedback Sent"
                                            : activeTab === 'inbox' ? "Inbox Empty"
                                                : "No Items Found"}
                            </Text>
                            <Text style={{ color: colors.textSecondary, marginTop: 8, fontFamily: "DMSans-Regular", fontSize: 13, textAlign: "center" }}>
                                {activeTab === 'my_complaints' && userRole === 'student'
                                    ? "You haven't raised any complaints. Tap the + button to raise one."
                                    : activeTab === 'teacher_feedback'
                                        ? "Your teachers haven't given you any feedback yet."
                                        : activeTab === 'my_complaints' && userRole === 'teacher'
                                            ? "You haven't raised any complaints. Tap the + button to raise one."
                                            : activeTab === 'sent_feedback'
                                                ? "You haven't given feedback to any students yet."
                                                : activeTab === 'inbox'
                                                    ? "No complaints have been received."
                                                    : ""}
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* ── FAB & Action Handling ── */}

            {/* Student: Single FAB for raising complaint */}
            {userRole === 'student' && (
                <Pressable
                    onPress={() => router.push("/complaints/raise")}
                    style={({ pressed }) => [fabStyle(colors), { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
                >
                    <MaterialIcons name="add" size={26} color="#fff" />
                </Pressable>
            )}

            {/* Teacher: Expandable FAB with feedback + complaint options */}
            {userRole === 'teacher' && (
                <>
                    {showFabOptions && (
                        <View style={{ position: "absolute", bottom: 200, right: 20, alignItems: "flex-end", gap: 14, zIndex: 10 }}>
                            <Pressable
                                onPress={() => { setShowFabOptions(false); router.push("/complaints/give-feedback"); }}
                                style={({ pressed }) => [secondaryFabPill(colors), { opacity: pressed ? 0.85 : 1 }]}
                            >
                                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
                                    <MaterialIcons name="rate-review" size={20} color="#fff" />
                                </View>
                                <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 14, marginLeft: 12 }}>Give Feedback</Text>
                                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
                            </Pressable>
                            <Pressable
                                onPress={() => { setShowFabOptions(false); router.push("/complaints/raise"); }}
                                style={({ pressed }) => [secondaryFabPill(colors), { opacity: pressed ? 0.85 : 1 }]}
                            >
                                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.warning || colors.error, alignItems: "center", justifyContent: "center" }}>
                                    <MaterialIcons name="report-problem" size={20} color="#fff" />
                                </View>
                                <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 14, marginLeft: 12 }}>Raise Complaint</Text>
                                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
                            </Pressable>
                        </View>
                    )}
                    <Pressable
                        onPress={() => setShowFabOptions(!showFabOptions)}
                        style={({ pressed }) => [fabStyle(colors), { transform: [{ scale: pressed ? 0.92 : 1 }, { rotate: showFabOptions ? '45deg' : '0deg' }] }]}
                    >
                        <MaterialIcons name="add" size={26} color="#fff" />
                    </Pressable>
                </>
            )}

            {/* Admin / Super Admin: Expandable FAB with feedback option */}
            {(userRole === 'admin' || userRole === 'super admin') && (
                <>
                    {showFabOptions && (
                        <View style={{ position: "absolute", bottom: 200, right: 20, alignItems: "flex-end", gap: 14, zIndex: 10 }}>
                            <Pressable
                                onPress={() => { setShowFabOptions(false); router.push("/complaints/give-feedback"); }}
                                style={({ pressed }) => [secondaryFabPill(colors), { opacity: pressed ? 0.85 : 1 }]}
                            >
                                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
                                    <MaterialIcons name="rate-review" size={20} color="#fff" />
                                </View>
                                <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 14, marginLeft: 12 }}>Give Feedback</Text>
                                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
                            </Pressable>
                        </View>
                    )}
                    <Pressable
                        onPress={() => setShowFabOptions(!showFabOptions)}
                        style={({ pressed }) => [fabStyle(colors), { transform: [{ scale: pressed ? 0.92 : 1 }, { rotate: showFabOptions ? '45deg' : '0deg' }] }]}
                    >
                        <MaterialIcons name={showFabOptions ? "add" : "rate-review"} size={26} color="#fff" />
                    </Pressable>
                </>
            )}

            {/* Overlay for FAB Options */}
            {showFabOptions && (
                <Pressable
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 9 }}
                    onPress={() => setShowFabOptions(false)}
                />
            )}

            {/* Edit Feedback Modal */}
            <Modal visible={!!editingFeedback} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 24, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 20 }}>Edit Feedback</Text>

                        <TextInput
                            value={editMessage}
                            onChangeText={setEditMessage}
                            multiline
                            numberOfLines={4}
                            style={{
                                backgroundColor: colors.background,
                                borderRadius: 16,
                                padding: 16,
                                color: colors.textPrimary,
                                fontFamily: "DMSans-Medium",
                                fontSize: 15,
                                minHeight: 120,
                                textAlignVertical: "top",
                                marginBottom: 24,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                        />

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                            <Pressable
                                onPress={() => setEditingFeedback(null)}
                                style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background }}
                            >
                                <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Bold" }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={submitEdit}
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingHorizontal: 24,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4
                                }}
                                disabled={updateFeedbackMutation.isPending}
                            >
                                {updateFeedbackMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ color: "#fff", fontFamily: "DMSans-Bold" }}>Update</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Admin Status Update Modal */}
            <Modal visible={!!selectedComplaint} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>Update Status</Text>
                            <Pressable
                                onPress={() => setSelectedComplaint(null)}
                                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}
                            >
                                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Complaint:</Text>
                            <Text style={{ fontSize: 16, color: colors.textPrimary, fontFamily: "DMSans-Bold", marginTop: 4 }}>
                                {selectedComplaint?.title}
                            </Text>
                        </View>

                        <Text style={{ color: colors.textSecondary, marginBottom: 12, fontFamily: "DMSans-Medium" }}>Set Status</Text>
                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                            {['In Progress', 'Resolved', 'Rejected'].map(s => (
                                <Pressable
                                    key={s}
                                    onPress={() => setStatus(s)}
                                    style={{
                                        flex: 1,
                                        padding: 12,
                                        backgroundColor: status === s ? colors.primary : colors.background,
                                        borderRadius: 12,
                                        alignItems: "center",
                                        borderWidth: 1,
                                        borderColor: status === s ? colors.primary : colors.border
                                    }}
                                >
                                    <Text style={{ color: status === s ? "#fff" : colors.textPrimary, fontSize: 13, fontFamily: "DMSans-Bold" }}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Admin Response</Text>
                        <TextInput
                            value={response}
                            onChangeText={setResponse}
                            placeholder="Write a response to the user..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                            style={{
                                backgroundColor: colors.background,
                                borderRadius: 16,
                                padding: 16,
                                color: colors.textPrimary,
                                fontFamily: "DMSans-Medium",
                                minHeight: 100,
                                textAlignVertical: "top",
                                marginBottom: 24,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                        />

                        <Pressable
                            onPress={handleUpdateStatus}
                            disabled={updateStatusMutation.isPending}
                            style={{
                                backgroundColor: colors.primary,
                                padding: 18,
                                borderRadius: 16,
                                alignItems: "center",
                                opacity: updateStatusMutation.isPending ? 0.7 : 1,
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4
                            }}
                        >
                            {updateStatusMutation.isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>Update Complaint</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const fabStyle = (colors) => ({
    position: "absolute",
    bottom: 130,
    right: 20,
    backgroundColor: colors.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 11
});

const secondaryFabPill = (colors) => ({
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingRight: 16,
    borderRadius: 28,
    minWidth: 200,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
});
