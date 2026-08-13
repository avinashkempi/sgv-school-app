import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Pressable,
    Switch,
    Modal,
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import Card from "../components/Card";
import { useNotifications } from "../hooks/useNotifications";
import { EmptyState } from "../components/StateComponents";

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

const getColor = (type, colors) => {
    switch (type) {
        case 'Homework': return '#9C27B0';
        case 'Exam': return '#E91E63';
        case 'Fee': return '#FF5722';
        case 'Emergency': return '#F44336';
        case 'Event': return '#4CAF50';
        default: return colors.primary;
    }
};

// Extracted and memoized notification item
// eslint-disable-next-line react/display-name
const NotificationItem = memo(({ notif, colors, markAsRead, handleDelete, isAdmin }) => {
    const handlePress = useCallback(() => {
        if (!notif.isRead) markAsRead(notif._id);
    }, [notif.isRead, notif._id, markAsRead]);

    return (
        <Card
            variant={notif.isRead ? "outlined" : "filled"}
            onPress={handlePress}
            style={{ marginBottom: 12 }}
            contentStyle={{
                flexDirection: "row",
                gap: 16,
                padding: 16
            }}
        >
            <View style={{
                backgroundColor: notif.isRead ? colors.surfaceContainerHighest : getColor(notif.type, colors) + "20",
                padding: 10,
                borderRadius: 12,
                height: 48,
                width: 48,
                justifyContent: "center",
                alignItems: "center"
            }}>
                <MaterialIcons name={getIcon(notif.type)} size={26} color={notif.isRead ? colors.onSurfaceVariant : getColor(notif.type, colors)} />
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 16, fontFamily: notif.isRead ? "DMSans-Medium" : "DMSans-Bold", color: colors.onSurface, flex: 1, marginRight: 8 }}>
                        {notif.title || "Notification"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {!notif.isRead && (
                            <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                        )}
                        {isAdmin && (
                            <Pressable 
                                onPress={() => handleDelete(notif._id)}
                                hitSlop={8}
                            >
                                <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                            </Pressable>
                        )}
                    </View>
                </View>
                <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Regular", fontSize: 14, marginBottom: 8, lineHeight: 20 }}>
                    {notif.message}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="access-time" size={12} color={colors.outline} />
                    <Text style={{ fontSize: 12, fontFamily: "DMSans-Regular", color: colors.outline }}>
                        {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        </Card>
    );
});

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
        deleteNotification,
        unreadCount
    } = useNotifications();

    const hasMarkedRef = useRef(false);

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

    const isAdmin = userData?.role && ['admin', 'super admin'].includes(userData.role);

    const updatePreferencesMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/notifications/preferences`, 'PUT'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
        onError: () => {
            showToast("Failed to update settings", "error");
        }
    });

    const handleDelete = useCallback((id) => {
        Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        const success = await deleteNotification(id);
                        if (success) {
                            showToast("Notification deleted", "success");
                        } else {
                            showToast("Failed to delete notification", "error");
                        }
                    }
                }
            ]
        );
    }, [deleteNotification, showToast]);

    // Auto mark all unread as read when screen is opened
    // Use ref to ensure it only runs once per mount, avoiding re-render loops
    useEffect(() => {
        if (!hasMarkedRef.current && notifications.length > 0) {
            hasMarkedRef.current = true;
            notifications
                .filter(n => !n.isRead)
                .forEach(n => markAsRead(n._id));
        }
    }, [markAsRead, notifications]);

    const togglePreference = (key) => {
        const newPreferences = { ...preferences, [key]: !preferences[key] };
        updatePreferencesMutation.mutate({ preferences: newPreferences });
    };

    const renderItem = useCallback(({ item }) => (
        <NotificationItem 
            notif={item} 
            colors={colors} 
            markAsRead={markAsRead} 
            handleDelete={handleDelete} 
            isAdmin={isAdmin}
        />
    ), [colors, markAsRead, handleDelete, isAdmin]);

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

            <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchNotifications(true)}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={{ marginTop: 60 }}>
                        <EmptyState
                            icon="notifications-none"
                            title="All caught up!"
                            message="No notifications to show at the moment."
                        />
                    </View>
                }
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
            />

            {/* Settings Modal - kept rendered since it's lightweight but could be lazy loaded */}
            {showSettings && (
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
                                Choose what you would like to be notified about.
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
                                        <MaterialIcons name={getIcon(key.charAt(0).toUpperCase() + key.slice(1))} size={24} color={getColor(key.charAt(0).toUpperCase() + key.slice(1), colors)} />
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
            )}
        </View>
    );
}
