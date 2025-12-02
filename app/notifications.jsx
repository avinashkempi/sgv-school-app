import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Pressable,
    Switch,
    Modal
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";

export default function NotificationsScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [showSettings, setShowSettings] = useState(false);
    const queryClient = useQueryClient();

    // Fetch Notifications
    const { data: notificationsData, isLoading: loadingNotifications, refetch: refetchNotifications } = useApiQuery(
        ['notifications'],
        `${apiConfig.baseUrl}/notifications`
    );
    const notifications = notificationsData?.notifications || [];

    // Fetch Preferences
    const { data: userData } = useApiQuery(
        ['currentUser'],
        `${apiConfig.baseUrl}/auth/me`
    );
    const preferences = userData?.notificationPreferences || {
        homework: true,
        exam: true,
        fee: true,
        event: true,
        general: true
    };

    // Mark as read mutation
    const markReadMutation = useApiMutation({
        mutationFn: (id) => createApiMutationFn(`${apiConfig.baseUrl}/notifications/${id}/read`, 'PUT')(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    // Update preferences mutation
    const updatePreferencesMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/notifications/preferences`, 'PUT'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
        onError: () => {
            showToast("Failed to update settings", "error");
        }
    });

    const markAsRead = (id) => {
        markReadMutation.mutate(id);
    };

    const togglePreference = (key) => {
        const newPreferences = { ...preferences, [key]: !preferences[key] };
        updatePreferencesMutation.mutate({ preferences: newPreferences });
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchNotifications(), queryClient.invalidateQueries({ queryKey: ['currentUser'] })]);
        setRefreshing(false);
    };

    const loading = loadingNotifications && !notifications.length;



    const getIcon = (type) => {
        switch (type) {
            case 'Homework': return 'assignment';
            case 'Exam': return 'event-note';
            case 'Fee': return 'attach-money';
            case 'Emergency': return 'warning';
            default: return 'notifications';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'Homework': return '#9C27B0';
            case 'Exam': return '#E91E63';
            case 'Fee': return '#FF5722';
            case 'Emergency': return '#F44336';
            default: return colors.primary;
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
            <View style={{ padding: 16, paddingTop: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Header title="Notifications" showBack />
                <Pressable onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
                    <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
                </Pressable>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                {notifications.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
                        <MaterialIcons name="notifications-none" size={64} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                            No notifications yet
                        </Text>
                    </View>
                ) : (
                    notifications.map((notif) => (
                        <Pressable
                            key={notif._id}
                            onPress={() => !notif.read && markAsRead(notif._id)}
                            style={{
                                backgroundColor: notif.read ? colors.background : colors.cardBackground,
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                flexDirection: "row",
                                gap: 16,
                                borderLeftWidth: 4,
                                borderLeftColor: getColor(notif.type),
                                opacity: notif.read ? 0.7 : 1,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: notif.read ? 0 : 0.05,
                                shadowRadius: 2,
                                elevation: notif.read ? 0 : 1,
                            }}
                        >
                            <View style={{
                                backgroundColor: getColor(notif.type) + "15",
                                padding: 10,
                                borderRadius: 50,
                                height: 44,
                                width: 44,
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <MaterialIcons name={getIcon(notif.type)} size={24} color={getColor(notif.type)} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, flex: 1 }}>
                                        {notif.title || "Notification"}
                                    </Text>
                                    {!notif.read && (
                                        <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                                    )}
                                </View>
                                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 8 }}>
                                    {notif.message}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                    {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                Notification Settings
                            </Text>
                            <Pressable onPress={() => setShowSettings(false)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
                            Customize which notifications you want to receive.
                        </Text>

                        {Object.keys(preferences).map((key) => (
                            <View key={key} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <MaterialIcons name={getIcon(key.charAt(0).toUpperCase() + key.slice(1))} size={24} color={colors.textSecondary} />
                                    <Text style={{ fontSize: 16, color: colors.textPrimary, textTransform: "capitalize" }}>
                                        {key} Alerts
                                    </Text>
                                </View>
                                <Switch
                                    value={preferences[key]}
                                    onValueChange={() => togglePreference(key)}
                                    trackColor={{ false: "#767577", true: colors.primary + "80" }}
                                    thumbColor={preferences[key] ? colors.primary : "#f4f3f4"}
                                />
                            </View>
                        ))}

                        <View style={{ height: 20 }} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
