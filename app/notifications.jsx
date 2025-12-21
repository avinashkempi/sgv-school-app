import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Pressable,
    Switch,
    Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import Card from "../components/Card";
import { useNotifications } from "../hooks/useNotifications";

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const [showSettings, setShowSettings] = useState(false);
    const queryClient = useQueryClient();

    const {
        notifications,
        loading,
        refreshing,
        fetchNotifications,
        markAsRead,
        markAllRead,
        unreadCount
    } = useNotifications();

    // Fetch Preferences (keeping this from react-query as it's fine)
    const { data: userData } = useApiQuery(
        ['currentUser'],
        `${apiConfig.baseUrl}/auth/me`,
        { select: (data) => data.user }
    );
    const preferences = userData?.notificationPreferences || {
        homework: true,
        exam: true,
        fee: true,
        event: true,
        general: true
    };

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

    const togglePreference = (key) => {
        const newPreferences = { ...preferences, [key]: !preferences[key] };
        updatePreferencesMutation.mutate({ preferences: newPreferences });
    };

    const getIcon = (type) => {
        switch (type) {
            case 'Homework': return 'assignment';
            case 'Exam': return 'event-note';
            case 'Fee': return 'attach-money';
            case 'Emergency': return 'warning';
            case 'Event': return 'event';
            default: return 'notifications';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'Homework': return '#9C27B0';
            case 'Exam': return '#E91E63';
            case 'Fee': return '#FF5722';
            case 'Emergency': return '#F44336';
            case 'Event': return '#4CAF50';
            default: return colors.primary;
        }
    };

    if (loading && !notifications.length) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Header
                title="Notifications"
                showBack
                rightElement={
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {unreadCount > 0 && (
                            <Pressable
                                onPress={markAllRead}
                                style={({ pressed }) => ({
                                    opacity: pressed ? 0.6 : 1,
                                    paddingRight: 8
                                })}
                            >
                                <MaterialIcons name="done-all" size={24} color={colors.primary} />
                            </Pressable>
                        )}
                        <Pressable onPress={() => setShowSettings(true)}>
                            <MaterialIcons name="settings" size={24} color={colors.onSurfaceVariant} />
                        </Pressable>
                    </View>
                }
            />

            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchNotifications(true)}
                        colors={[colors.primary]}
                    />
                }
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                {notifications.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 100, opacity: 0.6 }}>
                        <View style={{
                            padding: 24,
                            backgroundColor: colors.surfaceVariant,
                            borderRadius: 100,
                            marginBottom: 24
                        }}>
                            <MaterialIcons name="notifications-none" size={80} color={colors.onSurfaceVariant} />
                        </View>
                        <Text style={{
                            color: colors.onSurface,
                            fontSize: 20,
                            fontFamily: "DMSans-Bold",
                            marginBottom: 8
                        }}>
                            All caught up!
                        </Text>
                        <Text style={{ color: colors.onSurfaceVariant, textAlign: 'center', fontSize: 15 }}>
                            No notifications to show at the moment.
                        </Text>
                    </View>
                ) : (
                    notifications.map((notif) => (
                        <Card
                            key={notif._id}
                            variant={notif.read ? "filled" : "elevated"}
                            onPress={() => !notif.read && markAsRead(notif._id)}
                            style={{
                                marginBottom: 12,
                                opacity: notif.read ? 0.7 : 1,
                                borderLeftWidth: notif.read ? 0 : 4,
                                borderLeftColor: getColor(notif.type),
                            }}
                            contentStyle={{
                                flexDirection: "row",
                                gap: 16,
                                padding: 16
                            }}
                        >
                            <View style={{
                                backgroundColor: getColor(notif.type) + "15",
                                padding: 10,
                                borderRadius: 12,
                                height: 48,
                                width: 48,
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <MaterialIcons name={getIcon(notif.type)} size={26} color={getColor(notif.type)} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface, flex: 1 }}>
                                        {notif.title || "Notification"}
                                    </Text>
                                    {!notif.read && (
                                        <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                                    )}
                                </View>
                                <Text style={{ color: colors.onSurfaceVariant, fontSize: 14, marginBottom: 8, lineHeight: 20 }}>
                                    {notif.message}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <MaterialIcons name="access-time" size={12} color={colors.outline} />
                                    <Text style={{ fontSize: 12, color: colors.outline }}>
                                        {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        </Card>
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
                    <View style={{
                        backgroundColor: colors.surface,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        padding: 24,
                        elevation: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 10
                    }}>
                        <View style={{ width: 40, height: 4, backgroundColor: colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <Text style={{ fontSize: 22, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                Notifications
                            </Text>
                            <Pressable
                                onPress={() => setShowSettings(false)}
                                style={{ padding: 4 }}
                            >
                                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
                            </Pressable>
                        </View>

                        <Text style={{ color: colors.onSurfaceVariant, marginBottom: 24, fontSize: 15 }}>
                            Choose what you'd like to be notified about.
                        </Text>

                        {Object.keys(preferences).map((key) => (
                            <View key={key} style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                                backgroundColor: colors.surfaceVariant + '40',
                                padding: 16,
                                borderRadius: 16
                            }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                                    <MaterialIcons name={getIcon(key.charAt(0).toUpperCase() + key.slice(1))} size={24} color={getColor(key.charAt(0).toUpperCase() + key.slice(1))} />
                                    <Text style={{ fontSize: 16, color: colors.onSurface, textTransform: "capitalize", fontFamily: 'DMSans-Medium' }}>
                                        {key} Alerts
                                    </Text>
                                </View>
                                <Switch
                                    value={preferences[key]}
                                    onValueChange={() => togglePreference(key)}
                                    trackColor={{ false: colors.outline, true: colors.primaryContainer }}
                                    thumbColor={preferences[key] ? colors.primary : colors.surface}
                                />
                            </View>
                        ))}

                        <View style={{ height: 40 }} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
