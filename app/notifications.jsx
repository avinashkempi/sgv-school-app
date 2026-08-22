import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import {
    View,
    Text,
    RefreshControl,
    ActivityIndicator,
    Pressable,
    Switch,
    Modal,
    Alert,
    ScrollView,
    Animated,
    Easing,
    Platform,
    StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ToastProvider";
import { useNotifications } from "../hooks/useNotifications";
import { useLabel } from '../context/LabelsContext';

// Category color mappings - curated harmonious palette
const getCategoryConfig = (type, colors) => {
    switch (type) {
        case 'Homework':
            return {
                icon: 'assignment',
                color: '#8B5CF6', // Modern violet
                bgLight: '#F3E8FF',
                label: 'Homework',
            };
        case 'Exam':
            return {
                icon: 'analytics',
                color: '#EC4899', // Modern pink/rose
                bgLight: '#FCE7F3',
                label: 'Exams',
            };
        case 'Fee':
            return {
                icon: 'account-balance-wallet',
                color: '#F59E0B', // Amber
                bgLight: '#FEF3C7',
                label: 'Fee',
            };
        case 'Emergency':
            return {
                icon: 'warning-amber',
                color: '#EF4444', // Red
                bgLight: '#FEE2E2',
                label: 'Urgent',
            };
        case 'Event':
            return {
                icon: 'celebration',
                color: '#10B981', // Emerald
                bgLight: '#D1FAE5',
                label: 'Events',
            };
        default:
            return {
                icon: 'notifications-active',
                color: colors.primary || '#6366F1',
                bgLight: colors.primaryContainer || '#EEF2FF',
                label: 'General',
            };
    }
};

// Relative time formatter
const getRelativeTime = (dateInput) => {
    if (!dateInput) return '';
    try {
        const date = new Date(dateInput);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 45) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;

        return new Intl.DateTimeFormat('en-IN', {
            month: 'short',
            day: 'numeric',
        }).format(date);
    } catch {
        return '';
    }
};

// Animated Category Icon with subtle entrance and pulse
const AnimatedCategoryIcon = memo(({ type, isRead, colors }) => {
    const config = getCategoryConfig(type, colors);
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
        }).start();

        if (!isRead && (type === 'Emergency' || type === 'Exam')) {
            // Subtle swing for urgent notifications
            Animated.sequence([
                Animated.timing(rotateAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: 0.5, duration: 120, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            ]).start();
        }
    }, [isRead, type, rotateAnim, scaleAnim]);

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-12deg', '0deg', '12deg'],
    });

    const isDarkMode = colors.background === '#141218' || colors.surface === '#141218';
    const bgColor = isRead
        ? (isDarkMode ? 'rgba(255,255,255,0.06)' : colors.surfaceContainerHighest)
        : (isDarkMode ? `${config.color}25` : config.bgLight);

    const iconColor = isRead
        ? colors.onSurfaceVariant
        : config.color;

    return (
        <Animated.View
            style={[
                styles.iconContainer,
                {
                    backgroundColor: bgColor,
                    borderColor: isRead ? 'transparent' : `${config.color}35`,
                    transform: [{ scale: scaleAnim }, { rotate: rotateInterpolate }],
                }
            ]}
        >
            <MaterialIcons name={config.icon} size={22} color={iconColor} />
        </Animated.View>
    );
});
AnimatedCategoryIcon.displayName = "AnimatedCategoryIcon";

// Animated pulsing unread glow dot
const AnimatedUnreadDot = memo(({ color }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.8,
                        duration: 1200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 1200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.6,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [opacityAnim, pulseAnim]);

    return (
        <View style={styles.unreadDotWrapper}>
            <Animated.View
                style={[
                    styles.unreadHalo,
                    {
                        backgroundColor: color,
                        opacity: opacityAnim,
                        transform: [{ scale: pulseAnim }],
                    }
                ]}
            />
            <View style={[styles.unreadDot, { backgroundColor: color }]} />
        </View>
    );
});
AnimatedUnreadDot.displayName = "AnimatedUnreadDot";

// Extracted and memoized notification card item
const NotificationItem = memo(({ notif, colors, markAsRead, handleDelete, isAdmin }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const config = getCategoryConfig(notif.type, colors);
    const isLongMessage = notif.message && notif.message.length > 120;
    const isDarkMode = colors.background === '#141218' || colors.surface === '#141218';

    const handlePress = useCallback(() => {
        if (!notif.isRead) {
            markAsRead(notif._id);
        }
        if (isLongMessage) {
            setIsExpanded(prev => !prev);
        }
    }, [notif.isRead, notif._id, markAsRead, isLongMessage]);

    // Card background
    const cardBg = notif.isRead
        ? (isDarkMode ? colors.surfaceContainerLow : '#FFFFFF')
        : (isDarkMode ? colors.surfaceContainerHigh : '#FAFAFE');

    const cardBorderColor = notif.isRead
        ? (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
        : (isDarkMode ? `${config.color}40` : `${config.color}30`);

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.card,
                {
                    backgroundColor: cardBg,
                    borderColor: cardBorderColor,
                    transform: [{ scale: pressed ? 0.992 : 1 }],
                }
            ]}
        >
            {/* Unread Accent Left Bar */}
            {!notif.isRead && (
                <View
                    style={[
                        styles.unreadAccentBar,
                        { backgroundColor: config.color }
                    ]}
                />
            )}

            <View style={styles.cardContent}>
                {/* Animated Category Icon */}
                <AnimatedCategoryIcon
                    type={notif.type}
                    isRead={notif.isRead}
                    colors={colors}
                />

                {/* Main Body */}
                <View style={styles.cardBody}>
                    {/* Header Row: Category Badge + Time + Actions */}
                    <View style={styles.metaRow}>
                        <View style={styles.categoryBadgeRow}>
                            <View
                                style={[
                                    styles.categoryPill,
                                    {
                                        backgroundColor: notif.isRead
                                            ? (isDarkMode ? 'rgba(255,255,255,0.08)' : colors.surfaceContainerHighest)
                                            : `${config.color}18`,
                                    }
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.categoryPillText,
                                        {
                                            color: notif.isRead
                                                ? colors.onSurfaceVariant
                                                : config.color
                                        }
                                    ]}
                                >
                                    {config.label.toUpperCase()}
                                </Text>
                            </View>

                            <View style={styles.timeWrapper}>
                                <MaterialIcons name="access-time" size={11} color={colors.outline} style={{ marginRight: 3 }} />
                                <Text style={[styles.timeText, { color: colors.outline }]}>
                                    {getRelativeTime(notif.createdAt)}
                                </Text>
                            </View>
                        </View>

                        {/* Top Right Status & Actions */}
                        <View style={styles.actionRow}>
                            {!notif.isRead && (
                                <AnimatedUnreadDot color={config.color} />
                            )}
                            {isAdmin && (
                                <Pressable
                                    onPress={(e) => {
                                        e.stopPropagation?.();
                                        handleDelete(notif._id);
                                    }}
                                    hitSlop={8}
                                    style={({ pressed }) => [
                                        styles.iconButton,
                                        {
                                            backgroundColor: pressed
                                                ? (isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2')
                                                : 'transparent'
                                        }
                                    ]}
                                    accessibilityLabel="Delete notification"
                                >
                                    <MaterialIcons name="delete-outline" size={18} color={colors.error || '#EF4444'} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Title */}
                    <Text
                        style={[
                            styles.title,
                            {
                                color: colors.onSurface,
                                fontFamily: notif.isRead ? "DMSans-Medium" : "DMSans-Bold",
                            }
                        ]}
                        numberOfLines={isExpanded ? undefined : 2}
                    >
                        {notif.title || "Notification"}
                    </Text>

                    {/* Message */}
                    <Text
                        style={[
                            styles.message,
                            {
                                color: colors.onSurfaceVariant,
                            }
                        ]}
                        numberOfLines={isExpanded ? undefined : 3}
                    >
                        {notif.message}
                    </Text>

                    {/* Expand / Collapse Indicator for long messages */}
                    {isLongMessage && (
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation?.();
                                setIsExpanded(prev => !prev);
                            }}
                            hitSlop={4}
                            style={styles.expandButton}
                        >
                            <Text style={[styles.expandButtonText, { color: colors.primary }]}>
                                {isExpanded ? "Show less" : "Read more"}
                            </Text>
                            <MaterialIcons
                                name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                size={14}
                                color={colors.primary}
                            />
                        </Pressable>
                    )}
                </View>
            </View>
        </Pressable>
    );
});
NotificationItem.displayName = "NotificationItem";

// Filter Category Options
const FILTER_CATEGORIES = [
    { id: 'all', label: 'All', icon: 'all-inbox' },
    { id: 'unread', label: 'Unread', icon: 'mark-email-unread' },
    { id: 'Homework', label: 'Homework', icon: 'assignment' },
    { id: 'Exam', label: 'Exams', icon: 'analytics' },
    { id: 'Fee', label: 'Fees', icon: 'account-balance-wallet' },
    { id: 'Emergency', label: 'Urgent', icon: 'warning-amber' },
    { id: 'Event', label: 'Events', icon: 'celebration' },
];

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const router = useRouter();
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const queryClient = useQueryClient();
    const { t } = useLabel();

    const {
        notifications = [],
        loading,
        refreshing,
        fetchNotifications,
        markAsRead,
        markAllRead,
        deleteNotification,
        unreadCount
    } = useNotifications();


    // Fetch user preferences and role
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
            showToast(t('toasts.failedToUpdateSettings', 'Failed to update settings'), "error");
        }
    });

    const handleDelete = useCallback((id) => {
        Alert.alert(
            t('alerts.deleteNotificationTitle', 'Delete Notification'),
            t('alerts.deleteNotificationMessage', 'Are you sure you want to delete this notification? This action cannot be undone.'),
            [
                { text: t('common.cancel', 'Cancel'), style: "cancel" },
                {
                    text: t('common.delete', 'Delete'),
                    style: "destructive",
                    onPress: async () => {
                        const success = await deleteNotification(id);
                        if (success) {
                            showToast(t('toasts.notificationDeleted', 'Notification deleted'), "success");
                        } else {
                            showToast(t('toasts.failedToDeleteNotification', 'Failed to delete notification'), "error");
                        }
                    }
                }
            ]
        );
    }, [deleteNotification, showToast, t]);

    // Filter notifications based on selected filter pill
    const filteredNotifications = useMemo(() => {
        if (!notifications || !Array.isArray(notifications)) return [];
        if (selectedFilter === 'all') return notifications;
        if (selectedFilter === 'unread') return notifications.filter(n => !n.isRead);
        return notifications.filter(n => n.type === selectedFilter);
    }, [notifications, selectedFilter]);

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

    const isDarkMode = colors.background === '#141218' || colors.surface === '#141218';

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            {/* Desktop / Responsive Container */}
            <View style={styles.responsiveContainer}>

                {/* Modern Custom Top Navigation Bar */}
                <View style={[styles.headerBar, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={styles.headerLeft}>
                        <Pressable
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace("/");
                                }
                            }}
                            accessibilityLabel="Go back"
                            style={({ pressed }) => [
                                styles.headerIconButton,
                                {
                                    backgroundColor: pressed
                                        ? (isDarkMode ? 'rgba(255,255,255,0.1)' : colors.surfaceContainerHighest)
                                        : (isDarkMode ? 'rgba(255,255,255,0.05)' : colors.surfaceContainerLow)
                                }
                            ]}
                        >
                            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
                        </Pressable>

                        <View style={styles.headerTitleGroup}>
                            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                                {t('notifications.title', 'Notifications')}
                            </Text>

                            {/* Status Chip */}
                            {unreadCount > 0 ? (
                                <View style={[styles.headerBadge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
                                    <View style={[styles.headerBadgeDot, { backgroundColor: colors.primary }]} />
                                    <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
                                        {unreadCount} New
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.headerBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                                    <MaterialIcons name="done" size={12} color="#10B981" />
                                    <Text style={[styles.headerBadgeText, { color: '#10B981' }]}>
                                        Caught up
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Header Right Actions */}
                    <View style={styles.headerRight}>
                        {unreadCount > 0 && (
                            <Pressable
                                onPress={markAllRead}
                                accessibilityLabel="Mark all as read"
                                style={({ pressed }) => [
                                    styles.markAllButton,
                                    {
                                        backgroundColor: pressed
                                            ? `${colors.primary}25`
                                            : `${colors.primary}12`,
                                        borderColor: `${colors.primary}25`,
                                    }
                                ]}
                            >
                                <MaterialIcons name="done-all" size={16} color={colors.primary} />
                                <Text style={[styles.markAllText, { color: colors.primary }]}>
                                    Read all
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() => setShowSettings(true)}
                            accessibilityLabel="Notification Preferences"
                            style={({ pressed }) => [
                                styles.headerIconButton,
                                {
                                    backgroundColor: pressed
                                        ? (isDarkMode ? 'rgba(255,255,255,0.1)' : colors.surfaceContainerHighest)
                                        : (isDarkMode ? 'rgba(255,255,255,0.05)' : colors.surfaceContainerLow)
                                }
                            ]}
                        >
                            <MaterialIcons name="tune" size={20} color={colors.onSurfaceVariant} />
                        </Pressable>
                    </View>
                </View>

                {/* Horizontal Category Filter Chips */}
                <View style={styles.filterContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScrollContent}
                    >
                        {FILTER_CATEGORIES.map((cat) => {
                            const isSelected = selectedFilter === cat.id;
                            const count = cat.id === 'all'
                                ? notifications.length
                                : cat.id === 'unread'
                                    ? unreadCount
                                    : notifications.filter(n => n.type === cat.id).length;

                            // Skip category filter chips that have 0 items unless it's All or Unread
                            if (count === 0 && cat.id !== 'all' && cat.id !== 'unread') {
                                return null;
                            }

                            return (
                                <Pressable
                                    key={cat.id}
                                    onPress={() => setSelectedFilter(cat.id)}
                                    style={({ pressed }) => [
                                        styles.filterChip,
                                        {
                                            backgroundColor: isSelected
                                                ? colors.primary
                                                : (isDarkMode ? 'rgba(255,255,255,0.05)' : colors.surfaceContainerLow),
                                            borderColor: isSelected
                                                ? colors.primary
                                                : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                            transform: [{ scale: pressed ? 0.96 : 1 }],
                                        }
                                    ]}
                                >
                                    <MaterialIcons
                                        name={cat.icon}
                                        size={14}
                                        color={isSelected ? '#FFFFFF' : colors.onSurfaceVariant}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            {
                                                color: isSelected ? '#FFFFFF' : colors.onSurfaceVariant,
                                                fontFamily: isSelected ? 'DMSans-Bold' : 'DMSans-Medium',
                                            }
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                    {count > 0 && (
                                        <View
                                            style={[
                                                styles.filterCountBadge,
                                                {
                                                    backgroundColor: isSelected
                                                        ? 'rgba(255,255,255,0.25)'
                                                        : (isDarkMode ? 'rgba(255,255,255,0.1)' : colors.surfaceContainerHighest),
                                                }
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterCountText,
                                                    { color: isSelected ? '#FFFFFF' : colors.onSurfaceVariant }
                                                ]}
                                            >
                                                {count}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Notifications List */}
                {loading && !notifications.length ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
                            Fetching updates...
                        </Text>
                    </View>
                ) : (
                    <FlashList
                        data={filteredNotifications}
                        keyExtractor={(item) => item._id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        estimatedItemSize={104}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => fetchNotifications(true)}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.surfaceContainerLow, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                                    <View style={[styles.emptyIconInnerCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : `${colors.primary}12` }]}>
                                        <MaterialIcons
                                            name={selectedFilter === 'all' ? "notifications-none" : "filter-list-off"}
                                            size={36}
                                            color={colors.primary}
                                        />
                                    </View>
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                                    {selectedFilter === 'all'
                                        ? t('notifications.allCaughtUp', 'All caught up!')
                                        : `No ${selectedFilter} updates`}
                                </Text>
                                <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
                                    {selectedFilter === 'all'
                                        ? t('notifications.noNotificationsMessage', "You don't have any notifications right now.")
                                        : "There are no notifications in this category. Check back later."}
                                </Text>
                                {selectedFilter !== 'all' && (
                                    <Pressable
                                        onPress={() => setSelectedFilter('all')}
                                        style={[styles.resetFilterButton, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                                    >
                                        <Text style={[styles.resetFilterText, { color: colors.primary }]}>
                                            View all notifications
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        }
                    />
                )}
            </View>

            {/* Preferences Modal */}
            {showSettings && (
                <Modal
                    visible={showSettings}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setShowSettings(false)}
                >
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => setShowSettings(false)}
                    >
                        <Pressable
                            style={[
                                styles.modalSheet,
                                {
                                    backgroundColor: isDarkMode ? colors.surfaceContainer : '#FFFFFF',
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                }
                            ]}
                            onPress={(e) => e.stopPropagation?.()}
                        >
                            {/* Drag Handle */}
                            <View style={[styles.modalHandle, { backgroundColor: colors.outlineVariant || 'rgba(0,0,0,0.2)' }]} />

                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderTitleGroup}>
                                    <View style={[styles.modalHeaderIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                        <MaterialIcons name="tune" size={20} color={colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                                            {t('notifications.settingsTitle', 'Notification Preferences')}
                                        </Text>
                                        <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
                                            Customize what alerts you receive
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    onPress={() => setShowSettings(false)}
                                    style={({ pressed }) => [
                                        styles.modalCloseButton,
                                        { backgroundColor: pressed ? (isDarkMode ? 'rgba(255,255,255,0.1)' : colors.surfaceContainerHighest) : 'transparent' }
                                    ]}
                                >
                                    <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
                                </Pressable>
                            </View>

                            {/* Preferences List */}
                            <ScrollView style={styles.preferencesList} showsVerticalScrollIndicator={false}>
                                {[
                                    { key: 'homework', label: 'Homework & Assignments', desc: 'Daily tasks, homework postings, and notes', type: 'Homework' },
                                    { key: 'exam', label: 'Exams & Results', desc: 'Exam schedules, seating, and report cards', type: 'Exam' },
                                    { key: 'fee', label: 'Fee Reminders', desc: 'Due dates, receipts, and payment alerts', type: 'Fee' },
                                    { key: 'event', label: 'School Events', desc: 'Celebrations, sports, meetings, and holidays', type: 'Event' },
                                    { key: 'general', label: 'General Announcements', desc: 'School broadcasts, news, and urgent alerts', type: 'General' },
                                ].map((item) => {
                                    const itemConfig = getCategoryConfig(item.type, colors);
                                    const isEnabled = preferences[item.key] !== false;

                                    return (
                                        <View
                                            key={item.key}
                                            style={[
                                                styles.preferenceCard,
                                                {
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : colors.surfaceContainerLowest || '#F8F9FE',
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                                }
                                            ]}
                                        >
                                            <View style={[styles.preferenceIconBox, { backgroundColor: `${itemConfig.color}15` }]}>
                                                <MaterialIcons name={itemConfig.icon} size={20} color={itemConfig.color} />
                                            </View>

                                            <View style={styles.preferenceTextGroup}>
                                                <Text style={[styles.preferenceLabel, { color: colors.onSurface }]}>
                                                    {item.label}
                                                </Text>
                                                <Text style={[styles.preferenceDesc, { color: colors.onSurfaceVariant }]}>
                                                    {item.desc}
                                                </Text>
                                            </View>

                                            <Switch
                                                value={isEnabled}
                                                onValueChange={() => togglePreference(item.key)}
                                                trackColor={{ false: colors.outlineVariant || '#CBD5E1', true: colors.primary }}
                                                thumbColor={isEnabled ? '#FFFFFF' : '#F1F5F9'}
                                            />
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            {/* Modal Done Button */}
                            <Pressable
                                onPress={() => setShowSettings(false)}
                                style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.modalDoneButtonText}>
                                    Save & Close
                                </Text>
                            </Pressable>
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    responsiveContainer: {
        flex: 1,
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
    },
    // Header
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerIconButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'DMSans-Bold',
        letterSpacing: -0.2,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
    },
    headerBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    headerBadgeText: {
        fontSize: 11,
        fontFamily: 'DMSans-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    markAllText: {
        fontSize: 12,
        fontFamily: 'DMSans-Bold',
    },

    // Filter Chips
    filterContainer: {
        paddingVertical: 12,
    },
    filterScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 13,
    },
    filterCountBadge: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
    },
    filterCountText: {
        fontSize: 11,
        fontFamily: 'DMSans-Bold',
    },

    // List Content
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 36,
        paddingTop: 4,
    },

    // Notification Card
    card: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 10,
        overflow: 'hidden',
        position: 'relative',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.18s ease-in-out',
            },
            default: {
                elevation: 1,
            },
        }),
    },
    unreadAccentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    cardContent: {
        flexDirection: 'row',
        padding: 14,
        gap: 12,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    cardBody: {
        flex: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    categoryBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryPillText: {
        fontSize: 10,
        fontFamily: 'DMSans-Bold',
        letterSpacing: 0.5,
    },
    timeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 11,
        fontFamily: 'DMSans-Regular',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    unreadDotWrapper: {
        width: 14,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadHalo: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    unreadDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    iconButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 3,
    },
    message: {
        fontSize: 13.5,
        fontFamily: 'DMSans-Regular',
        lineHeight: 19,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    expandButtonText: {
        fontSize: 12,
        fontFamily: 'DMSans-Bold',
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'DMSans-Medium',
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
    },
    emptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyIconInnerCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: 'DMSans-Bold',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'DMSans-Regular',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 320,
    },
    resetFilterButton: {
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    resetFilterText: {
        fontSize: 13,
        fontFamily: 'DMSans-Bold',
    },

    // Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
        alignItems: 'center',
        padding: Platform.OS === 'web' ? 16 : 0,
    },
    modalSheet: {
        width: '100%',
        maxWidth: 520,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: Platform.OS === 'web' ? 28 : 0,
        borderBottomRightRadius: Platform.OS === 'web' ? 28 : 0,
        borderWidth: 1,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '85%',
        ...Platform.select({
            web: {
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            },
            default: {
                elevation: 12,
            },
        }),
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalHeaderTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    modalHeaderIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'DMSans-Bold',
    },
    modalSubtitle: {
        fontSize: 13,
        fontFamily: 'DMSans-Regular',
        marginTop: 1,
    },
    modalCloseButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    preferencesList: {
        marginVertical: 8,
    },
    preferenceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
        gap: 12,
    },
    preferenceIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    preferenceTextGroup: {
        flex: 1,
    },
    preferenceLabel: {
        fontSize: 14,
        fontFamily: 'DMSans-Bold',
        marginBottom: 2,
    },
    preferenceDesc: {
        fontSize: 12,
        fontFamily: 'DMSans-Regular',
        lineHeight: 16,
    },
    modalDoneButton: {
        marginTop: 12,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalDoneButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'DMSans-Bold',
    },
});
