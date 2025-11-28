import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function ComplaintsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState("my_complaints"); // 'my_complaints', 'inbox'
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        checkUserRole();
    }, []);

    useEffect(() => {
        if (userRole) {
            loadComplaints();
        }
    }, [activeTab, userRole]);

    const checkUserRole = async () => {
        const role = await AsyncStorage.getItem("userRole");
        setUserRole(role);
        // If student, force 'my_complaints'
        if (role === 'student') {
            setActiveTab('my_complaints');
        } else {
            // Default to inbox for teachers/admins as that's their primary work
            setActiveTab('inbox');
        }
    };

    const loadComplaints = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'inbox' ? '/complaints/inbox' : '/complaints/my-complaints';
            const response = await apiFetch(`${apiConfig.baseUrl}${endpoint}`);
            if (response.ok) {
                const data = await response.json();
                setComplaints(data);
            } else {
                // If inbox is empty or unauthorized (e.g. student trying to access inbox), handle gracefully
                setComplaints([]);
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading complaints", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadComplaints();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return colors.success;
            case 'Rejected': return colors.error;
            case 'In Progress': return colors.warning;
            default: return colors.textSecondary;
        }
    };

    const renderComplaintItem = ({ item }) => (
        <Pressable
            style={{
                backgroundColor: colors.cardBackground,
                padding: 16,
                borderRadius: 16,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2
            }}
            onPress={() => {
                // Navigate to details (to be implemented or just expand)
                // For now, maybe just show alert or expand
                // router.push(`/complaints/${item._id}`);
            }}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: colors.primary + "15",
                        borderRadius: 8
                    }}>
                        <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "DMSans-Bold" }}>
                            {item.category}
                        </Text>
                    </View>
                    <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: getStatusColor(item.status) + "15",
                        borderRadius: 8
                    }}>
                        <Text style={{ color: getStatusColor(item.status), fontSize: 12, fontFamily: "DMSans-Bold" }}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Medium" }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>

            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
                {item.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 14 }} numberOfLines={2}>
                {item.description}
            </Text>

            {activeTab === 'inbox' && item.raisedBy && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.textSecondary + "10" }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Raised by: <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{item.raisedBy.name}</Text> ({item.raisedBy.role})
                    </Text>
                </View>
            )}
            {activeTab === 'my_complaints' && item.visibility && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.textSecondary + "10" }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Sent to: <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                            {item.visibility === 'teacher' ? 'Class Teacher' : item.visibility === 'super_admin' ? 'Management' : 'Headmaster'}
                        </Text>
                    </Text>
                </View>
            )}
        </Pressable>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="Complaints" subtitle="Feedback & Issues" showBack />
            </View>

            {/* Tabs (Only for Teachers/Admins) */}
            {userRole !== 'student' && (
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", backgroundColor: colors.cardBackground, borderRadius: 12, padding: 4 }}>
                        <Pressable
                            onPress={() => setActiveTab('inbox')}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === 'inbox' ? colors.background : "transparent",
                                borderRadius: 10,
                                shadowColor: activeTab === 'inbox' ? "#000" : "transparent",
                                shadowOpacity: activeTab === 'inbox' ? 0.1 : 0,
                                elevation: activeTab === 'inbox' ? 2 : 0
                            }}
                        >
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                color: activeTab === 'inbox' ? colors.primary : colors.textSecondary
                            }}>Inbox</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('my_complaints')}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === 'my_complaints' ? colors.background : "transparent",
                                borderRadius: 10,
                                shadowColor: activeTab === 'my_complaints' ? "#000" : "transparent",
                                shadowOpacity: activeTab === 'my_complaints' ? 0.1 : 0,
                                elevation: activeTab === 'my_complaints' ? 2 : 0
                            }}
                        >
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                color: activeTab === 'my_complaints' ? colors.primary : colors.textSecondary
                            }}>My Complaints</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={complaints}
                    renderItem={renderComplaintItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={() => (
                        <View style={{ alignItems: "center", marginTop: 40 }}>
                            <MaterialIcons name="inbox" size={48} color={colors.textSecondary + "40"} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Medium" }}>
                                No complaints found
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* FAB to Raise Complaint */}
            <Pressable
                onPress={() => router.push("/complaints/raise")}
                style={{
                    position: "absolute",
                    bottom: 24,
                    right: 24,
                    backgroundColor: colors.primary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4
                }}
            >
                <MaterialIcons name="add" size={28} color="#fff" />
            </Pressable>
        </View>
    );
}
