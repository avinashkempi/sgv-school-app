import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../theme";
import { LoadingState, EmptyState } from "./StateComponents";
import apiFetch from "../utils/apiFetch";
import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { useAuth } from "../context/AuthContext";
import Card from "./Card";

const NotificationCenter = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, styles } = useTheme();
  const { userId, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterRead, setFilterRead] = useState("all"); // 'all', 'read', 'unread'

  const categories = [
    { id: "all", label: "All", icon: "notifications" },
    { id: "exam", label: "Exams", icon: "event" },
    { id: "fee", label: "Fees", icon: "attach-money" },
    { id: "attendance", label: "Attendance", icon: "calendar-today" },
    { id: "complaint", label: "Support", icon: "feedback" },
    { id: "event", label: "Events", icon: "event-available" },
    { id: "announcement", label: "News", icon: "campaign" },
  ];

  const categoryParam =
    selectedCategory === "all" ? "" : `&category=${selectedCategory}`;
  const readParam =
    filterRead === "all" ? "" : `&isRead=${filterRead === "read"}`;
  const url = `${apiConfig.baseUrl}/notifications?${categoryParam}${readParam}&limit=50`;

  const {
    data: notificationData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["notificationCenter", userId, selectedCategory, filterRead],
    url,
    {
      ...CACHE_TIERS.REAL_TIME,
      enabled: isAuthenticated && !!userId,
    }
  );

  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const markAsRead = async (id, currentReadStatus) => {
    try {
      const response = await apiFetch(
        `${apiConfig.baseUrl}/notifications/${id}/read`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: !currentReadStatus }),
        }
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["notificationCenter"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    } catch (error) {
      console.error("Failed to mark notification:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiFetch(
        `${apiConfig.baseUrl}/notifications/mark-all-read`,
        { method: "PUT" }
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["notificationCenter"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const archiveNotification = async (id) => {
    try {
      const response = await apiFetch(
        `${apiConfig.baseUrl}/notifications/${id}/archive`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: true }),
        }
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["notificationCenter"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    } catch (error) {
      console.error("Failed to archive notification:", error);
    }
  };

  const handleNotificationPress = (notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification._id, notification.isRead);
    }

    // Handle action
    if (notification.actionType === "navigate" && notification.actionData) {
      router.push(notification.actionData);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return colors.error;
      case "high":
        return "#FF6B35";
      case "medium":
        return colors.primary;
      case "low":
        return colors.onSurfaceVariant;
      default:
        return colors.onSurfaceVariant;
    }
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find((c) => c.id === category);
    return cat?.icon || "notifications";
  };

  const renderNotification = (notification) => {
    const timeAgo = getTimeAgo(new Date(notification.createdAt));

    return (
      <Card
        key={notification._id}
        variant={notification.isRead ? "outlined" : "filled"}
        style={{ marginBottom: 12 }}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Icon */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: notification.isRead
                ? colors.surfaceContainerHighest
                : getPriorityColor(notification.priority) + "20",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <MaterialIcons
              name={getCategoryIcon(notification.category)}
              size={22}
              color={
                notification.isRead
                  ? colors.onSurfaceVariant
                  : getPriorityColor(notification.priority)
              }
            />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.mdLg,
                  fontFamily: notification.isRead
                    ? FONTS.medium
                    : FONTS.bold,
                  color: colors.onSurface,
                  flex: 1,
                  marginRight: 8,
                }}
              >
                {notification.title}
              </Text>
              {!notification.isRead && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                  }}
                />
              )}
            </View>

            <Text
              style={{
                fontSize: FONT_SIZES.base,
                fontFamily: FONTS.regular,
                color: colors.onSurfaceVariant,
                marginBottom: 8,
              }}
            >
              {notification.message}
            </Text>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  color: colors.onSurfaceVariant,
                  fontFamily: FONTS.regular,
                }}
              >
                {timeAgo}
              </Text>

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    markAsRead(notification._id, notification.isRead);
                  }}
                  style={({ pressed }) => ({
                    padding: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <MaterialIcons
                    name={
                      notification.isRead
                        ? "mark-email-unread"
                        : "mark-email-read"
                    }
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    archiveNotification(notification._id);
                  }}
                  style={({ pressed }) => ({
                    padding: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <MaterialIcons
                    name="archive"
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <LoadingState message="Loading notifications..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text style={[styles.headlineMedium, { color: colors.onSurface }]}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text
                style={[
                  styles.bodySmall,
                  { color: colors.onSurfaceVariant, marginTop: 4 },
                ]}
              >
                {unreadCount} unread
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {unreadCount > 0 && (
              <Pressable
                onPress={markAllAsRead}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: colors.primaryContainer,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.onPrimaryContainer,
                  }}
                >
                  Mark all read
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push("/notification-preferences")}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceContainerHighest,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name="settings"
                size={20}
                color={colors.onSurface}
              />
            </Pressable>
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 16 }}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor:
                  selectedCategory === cat.id
                    ? colors.primary
                    : colors.surfaceContainerHighest,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <MaterialIcons
                name={cat.icon}
                size={18}
                color={
                  selectedCategory === cat.id
                    ? colors.onPrimary
                    : colors.onSurfaceVariant
                }
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.base,
                  fontFamily: FONTS.bold,
                  color:
                    selectedCategory === cat.id
                      ? colors.onPrimary
                      : colors.onSurface,
                  marginLeft: 6,
                }}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Read Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 24 }}
        >
          {["all", "unread", "read"].map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setFilterRead(filter)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  filterRead === filter ? colors.primary : colors.outline,
                backgroundColor:
                  filterRead === filter
                    ? colors.primaryContainer
                    : "transparent",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color:
                    filterRead === filter
                      ? colors.onPrimaryContainer
                      : colors.onSurface,
                  textTransform: "capitalize",
                }}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-none"
            title="No Notifications"
            message="You're all caught up! No notifications to show."
          />
        ) : (
          notifications.map(renderNotification)
        )}
      </ScrollView>
    </View>
  );
};

export default NotificationCenter;
