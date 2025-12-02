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
import { useApiQuery } from "../../hooks/useApi";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function ComplaintsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState("my_complaints"); // 'my_complaints', 'inbox'

    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        checkUserRole();
    }, []);



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

    const { data: complaintsData, isLoading: loading, refetch } = useApiQuery(
        ['complaints', activeTab],
        `${apiConfig.baseUrl}${activeTab === 'inbox' ? '/complaints/inbox' : '/complaints/my-complaints'}`,
        { enabled: !!userRole }
    );

    const complaints = complaintsData || [];

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
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
            style={({ pressed }) => [
                styles.cardMinimal,
                {
                    marginBottom: 12,
                    opacity: pressed ? 0.9 : 1,
                }
            ]}
            onPress={() => {
                // Navigate to details (to be implemented or just expand)
                // For now, maybe just show alert or expand
                // router.push(`/complaints/${item._id}`);
            }}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: colors.primary + "15",
                        borderRadius: 8
                    }}>
                        <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "DMSans-Bold" }}>
                            {item.category}
                        </Text>
                    </View>
                    <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: getStatusColor(item.status) + "15",
                        borderRadius: 8
                    }}>
                        <Text style={{ color: getStatusColor(item.status), fontSize: 11, fontFamily: "DMSans-Bold" }}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Medium" }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>

            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 6 }}>
                {item.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Regular", fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                {item.description}
            </Text>

            {activeTab === 'inbox' && item.raisedBy && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Regular" }}>
                        Raised by: <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{item.raisedBy.name}</Text> ({item.raisedBy.role})
                    </Text>
                </View>
            )}
            {activeTab === 'my_complaints' && item.visibility && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Regular" }}>
                        Sent to: <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                            {item.visibility === 'teacher' ? 'Class Teacher' : item.visibility === 'super_admin' ? 'Management' : 'Headmaster'}
                        </Text>
                    </Text>
                </View>
            )}
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
                <Header title="Complaints" subtitle="Feedback & Issues" showBack />
            </View>

            {/* Tabs (Only for Teachers/Admins) */}
            {userRole !== 'student' && (
                <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", backgroundColor: colors.cardBackground, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border }}>
                        <Pressable
                            onPress={() => setActiveTab('inbox')}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                alignItems: "center",
                                backgroundColor: activeTab === 'inbox' ? colors.primary + "15" : "transparent",
                                borderRadius: 12,
                            }}
                        >
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                color: activeTab === 'inbox' ? colors.primary : colors.textSecondary,
                                fontSize: 14
                            }}>Inbox</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('my_complaints')}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                alignItems: "center",
                                backgroundColor: activeTab === 'my_complaints' ? colors.primary + "15" : "transparent",
                                borderRadius: 12,
                            }}
                        >
                            <Text style={{
                                fontFamily: "DMSans-Bold",
                                color: activeTab === 'my_complaints' ? colors.primary : colors.textSecondary,
                                fontSize: 14
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
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                            <MaterialIcons name="inbox" size={48} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Medium", fontSize: 16 }}>
                                No complaints found
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* FAB to Raise Complaint */}
            <Pressable
                onPress={() => router.push("/complaints/raise")}
                style={({ pressed }) => [
                    styles.fab,
                    { opacity: pressed ? 0.9 : 1 }
                ]}
            >
                <MaterialIcons name="add" size={24} color="#fff" />
            </Pressable>
        </View>
    );
}
