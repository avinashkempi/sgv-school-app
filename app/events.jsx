import React, { useState, useMemo, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../theme";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import EventFormModal from "../components/EventFormModal";
import ModernCalendar from "../components/ModernCalendar";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import apiConfig from "../config/apiConfig";

import {
  formatDate,
  getISTDateString,
  getISTToday,
  formatISTDisplayDate,
} from "../utils/date";
import { useLabel } from "../context/LabelsContext";
import AppRefreshControl from "../components/ui/AppRefreshControl";

// Helper to compute relative time label
const getRelativeDateLabel = (dateStr) => {
  if (!dateStr) return "";
  try {
    const todayStr = getISTToday();
    const eventDateStr = getISTDateString(dateStr);
    if (!eventDateStr) return "";

    if (eventDateStr === todayStr) return "Today";

    const [tY, tM, tD] = todayStr.split("-").map(Number);
    const [eY, eM, eD] = eventDateStr.split("-").map(Number);

    const tDate = new Date(tY, tM - 1, tD);
    const eDate = new Date(eY, eM - 1, eD);

    const diffDays = Math.round((eDate - tDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)}d ago`;
    return "";
  } catch {
    return "";
  }
};

// Helper to extract date parts for the left date tile
const parseDateTile = (dateInput) => {
  if (!dateInput) return { month: "CAL", day: "--", weekday: "---" };
  try {
    let d;
    if (
      typeof dateInput === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
    ) {
      d = new Date(`${dateInput.trim()}T12:00:00+05:30`);
    } else {
      d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    }
    if (isNaN(d.getTime())) return { month: "CAL", day: "--", weekday: "---" };

    const month = d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      month: "short",
    }).toUpperCase();

    const day = d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
    });

    const weekday = d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    });

    return { month, day, weekday };
  } catch {
    return { month: "CAL", day: "--", weekday: "---" };
  }
};

// Memoized day renderer component for high-performance calendar rendering
const DayRenderer = React.memo(
  ({ date, state, marking, onDayPress, colors, isDark }) => {
    const hasSchoolEvent = marking?.hasSchoolEvent;
    const hasHoliday = marking?.hasHoliday;
    const hasGeneralEvent = marking?.hasGeneralEvent;
    const isSelected = marking?.selected;
    const isToday = state === "today";
    const isDisabled = state === "disabled";

    const handlePress = () => {
      Haptics.selectionAsync().catch(() => {});
      onDayPress({ dateString: date.dateString });
    };

    return (
      <Pressable
        onPress={handlePress}
        style={[
          styles.dayCell,
          isSelected && {
            backgroundColor: colors.primary,
            borderRadius: 14,
            elevation: 3,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 4,
          },
          isToday &&
            !isSelected && {
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: isDark
                ? "rgba(208, 188, 255, 0.12)"
                : "rgba(79, 55, 139, 0.08)",
              borderRadius: 14,
            },
        ]}
      >
        {/* Day Number */}
        <Text
          style={[
            styles.dayText,
            {
              color: isSelected
                ? colors.white
                : isToday
                ? colors.primary
                : isDisabled
                ? colors.textSecondary + "40"
                : colors.textPrimary,
              fontFamily: isSelected || isToday ? FONTS.bold : FONTS.medium,
            },
          ]}
        >
          {date.day}
        </Text>

        {/* Multi-dot category indicators */}
        <View style={styles.indicatorContainer}>
          {isSelected ? (
            (hasSchoolEvent || hasHoliday || hasGeneralEvent) && (
              <View
                style={[
                  styles.miniDot,
                  { backgroundColor: colors.white },
                ]}
              />
            )
          ) : (
            <>
              {hasSchoolEvent && (
                <View
                  style={[
                    styles.miniDot,
                    { backgroundColor: "#F59E0B" },
                  ]}
                />
              )}
              {hasHoliday && (
                <View
                  style={[
                    styles.miniDot,
                    { backgroundColor: "#EF4444" },
                  ]}
                />
              )}
              {hasGeneralEvent && !hasSchoolEvent && !hasHoliday && (
                <View
                  style={[
                    styles.miniDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </>
          )}
        </View>
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.colors === nextProps.colors &&
      prevProps.isDark === nextProps.isDark &&
      prevProps.marking?.hasSchoolEvent === nextProps.marking?.hasSchoolEvent &&
      prevProps.marking?.hasHoliday === nextProps.marking?.hasHoliday &&
      prevProps.marking?.hasGeneralEvent === nextProps.marking?.hasGeneralEvent &&
      prevProps.marking?.selected === nextProps.marking?.selected &&
      prevProps.state === nextProps.state &&
      prevProps.date?.dateString === nextProps.date?.dateString
    );
  }
);

DayRenderer.displayName = "DayRenderer";

// Memoized EventCard with rich Date Tile, badges, and action bar
const EventCard = React.memo(
  ({ event, colors, isDark, isAdmin, onEdit, onDelete, t }) => {
    const router = useRouter();

    const title =
      event.title?.trim() || t("events.untitledEvent", "Untitled Event");
    const description = event.description?.trim();
    const hasValidDescription = description && description.length > 1;

    const { month, day, weekday } = parseDateTile(event.date);
    const relativeLabel = getRelativeDateLabel(event.date);

    // Accent theme based on event category
    const isSchoolEvent = !!event.isSchoolEvent;
    const isHoliday = !!event.isHoliday;

    const accentColor = isSchoolEvent
      ? "#F59E0B"
      : isHoliday
      ? "#EF4444"
      : colors.primary;

    const tileBg = isDark
      ? isSchoolEvent
        ? "rgba(245, 158, 11, 0.16)"
        : isHoliday
        ? "rgba(239, 68, 68, 0.16)"
        : "rgba(208, 188, 255, 0.14)"
      : isSchoolEvent
      ? "rgba(245, 158, 11, 0.10)"
      : isHoliday
      ? "rgba(239, 68, 68, 0.08)"
      : "rgba(79, 55, 139, 0.08)";

    const tileBorder = isDark
      ? isSchoolEvent
        ? "rgba(245, 158, 11, 0.3)"
        : isHoliday
        ? "rgba(239, 68, 68, 0.3)"
        : "rgba(208, 188, 255, 0.25)"
      : isSchoolEvent
      ? "rgba(245, 158, 11, 0.25)"
      : isHoliday
      ? "rgba(239, 68, 68, 0.2)"
      : "rgba(79, 55, 139, 0.2)";

    const cardBorderColor = isSchoolEvent
      ? isDark
        ? "rgba(245, 158, 11, 0.35)"
        : "rgba(245, 158, 11, 0.25)"
      : isHoliday
      ? isDark
        ? "rgba(239, 68, 68, 0.35)"
        : "rgba(239, 68, 68, 0.25)"
      : isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.06)";

    const handleVibesPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      router.push({
        pathname: "/vibes",
        params: { tag: event.title, category: "arts" },
      });
    };

    return (
      <View
        style={[
          styles.eventCard,
          {
            backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
            borderColor: cardBorderColor,
          },
        ]}
      >
        <View style={styles.eventCardContent}>
          {/* Left Date Tile */}
          <View
            style={[
              styles.dateTile,
              {
                backgroundColor: tileBg,
                borderColor: tileBorder,
              },
            ]}
          >
            <Text style={[styles.tileMonth, { color: accentColor }]}>
              {month}
            </Text>
            <Text style={[styles.tileDay, { color: accentColor }]}>
              {day}
            </Text>
            <Text
              style={[
                styles.tileWeekday,
                { color: colors.onSurfaceVariant || colors.textSecondary },
              ]}
            >
              {weekday}
            </Text>
          </View>

          {/* Center Info */}
          <View style={styles.eventInfoSection}>
            {/* Category / Relative Chips */}
            <View style={styles.chipsRow}>
              {isSchoolEvent && (
                <View
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isDark
                        ? "rgba(245, 158, 11, 0.18)"
                        : "rgba(245, 158, 11, 0.12)",
                      borderColor: isDark
                        ? "rgba(245, 158, 11, 0.35)"
                        : "rgba(245, 158, 11, 0.25)",
                    },
                  ]}
                >
                  <MaterialIcons name="school" size={12} color="#F59E0B" />
                  <Text style={[styles.tagChipText, { color: isDark ? "#FBBF24" : "#D97706" }]}>
                    School Event
                  </Text>
                </View>
              )}

              {isHoliday && (
                <View
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isDark
                        ? "rgba(239, 68, 68, 0.18)"
                        : "rgba(239, 68, 68, 0.10)",
                      borderColor: isDark
                        ? "rgba(239, 68, 68, 0.35)"
                        : "rgba(239, 68, 68, 0.25)",
                    },
                  ]}
                >
                  <MaterialIcons name="beach-access" size={12} color="#EF4444" />
                  <Text style={[styles.tagChipText, { color: isDark ? "#F87171" : "#DC2626" }]}>
                    Holiday
                  </Text>
                </View>
              )}

              {relativeLabel ? (
                <View
                  style={[
                    styles.relativeChip,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.relativeChipText,
                      { color: colors.onSurfaceVariant || colors.textSecondary },
                    ]}
                  >
                    {relativeLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Event Title */}
            <Text
              style={[
                styles.eventTitle,
                { color: colors.onSurface || colors.textPrimary },
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>

            {/* Event Description */}
            {hasValidDescription && (
              <Text
                style={[
                  styles.eventDescription,
                  { color: colors.onSurfaceVariant || colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {description}
              </Text>
            )}

            {/* Bottom Actions Row */}
            <View style={styles.actionRow}>
              {/* Event Vibes Button */}
              <Pressable
                onPress={handleVibesPress}
                style={({ pressed }) => [
                  styles.vibesButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(245, 158, 11, 0.12)"
                      : "rgba(245, 158, 11, 0.08)",
                    borderColor: isDark
                      ? "rgba(245, 158, 11, 0.25)"
                      : "rgba(245, 158, 11, 0.2)",
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <MaterialIcons name="auto-awesome" size={13} color="#F59E0B" />
                <Text
                  style={[
                    styles.vibesButtonText,
                    { color: isDark ? "#FBBF24" : "#D97706" },
                  ]}
                >
                  Event Vibes
                </Text>
              </Pressable>

              {/* Admin Actions */}
              {isAdmin && (
                <View style={styles.adminButtonsRow}>
                  <Pressable
                    onPress={onEdit}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.iconActionBtn,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainerHighest
                          : "rgba(0,0,0,0.05)",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="edit"
                      size={16}
                      color={colors.onSurfaceVariant || colors.textSecondary}
                    />
                  </Pressable>

                  <Pressable
                    onPress={onDelete}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.iconActionBtn,
                      {
                        backgroundColor: isDark
                          ? "rgba(239, 68, 68, 0.16)"
                          : "rgba(239, 68, 68, 0.10)",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={16}
                      color={isDark ? "#F87171" : "#DC2626"}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.colors === nextProps.colors &&
      prevProps.isDark === nextProps.isDark &&
      prevProps.isAdmin === nextProps.isAdmin &&
      prevProps.event._id === nextProps.event._id &&
      prevProps.event.title === nextProps.event.title &&
      prevProps.event.description === nextProps.event.description &&
      prevProps.event.isSchoolEvent === nextProps.event.isSchoolEvent &&
      prevProps.event.isHoliday === nextProps.event.isHoliday &&
      prevProps.event.date === nextProps.event.date
    );
  }
);

EventCard.displayName = "EventCard";

export default function EventsScreen() {
  const _navigation = useNavigation();
  const today = getISTToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState("calendar"); // 'calendar' | 'upcoming' | 'holidays'
  const [categoryFilter, setCategoryFilter] = useState("all"); // 'all' | 'school' | 'holidays'
  const [isEventFormVisible, setIsEventFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const { t } = useLabel();
  const { showToast } = useToast();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const {
    data: allEvents = [],
    isLoading: loading,
    refetch,
  } = useApiQuery(["events"], apiConfig.url(apiConfig.endpoints.events.list), {
    select: (data) => data.event || [],
  });

  const { user: userData } = useAuth();
  const isAuthenticated =
    userData?.role === "admin" || userData?.role === "super admin";

  // Mutations
  const createEventMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      apiConfig.url(apiConfig.endpoints.events.create),
      "POST"
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      showToast(t("toasts.eventCreated", "Event created successfully"));
      setIsEventFormVisible(false);
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("toasts.failedToCreateEvent", "Failed to create event")
      ),
  });

  const updateEventMutation = useApiMutation({
    mutationFn: (data) =>
      createApiMutationFn(
        apiConfig.url(apiConfig.endpoints.events.update(data._id)),
        "PUT"
      )(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      showToast(t("toasts.eventUpdated", "Event updated successfully"));
      setIsEventFormVisible(false);
      setEditingEvent(null);
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("toasts.failedToUpdateEvent", "Failed to update event")
      ),
  });

  const deleteEventMutation = useApiMutation({
    mutationFn: (id) =>
      createApiMutationFn(
        apiConfig.url(apiConfig.endpoints.events.delete(id)),
        "DELETE"
      )(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      showToast(t("toasts.eventDeleted", "Event deleted successfully"));
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("toasts.failedToDeleteEvent", "Failed to delete event")
      ),
  });

  const handleDateSelect = useCallback((day) => {
    setSelectedDate(day.dateString);
  }, []);

  const handleJumpToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedDate(today);
  };

  const handleTabChange = (modeKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setViewMode(modeKey);
  };

  const handleEventSubmit = (eventData) => {
    if (eventData._id) {
      updateEventMutation.mutate(eventData);
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleEditEvent = (eventItem) => {
    setEditingEvent(eventItem);
    setIsEventFormVisible(true);
  };

  const handleDeleteEvent = (eventId, eventTitle) => {
    Alert.alert(
      t("alerts.deleteEventTitle", "Delete Event"),
      t(
        "alerts.deleteEventMessage",
        `Are you sure you want to delete "${eventTitle || "this event"}"? This action cannot be undone.`
      ),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: () => deleteEventMutation.mutate(eventId),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Calendar Marked Dates map
  const markedDates = useMemo(() => {
    const dates = allEvents.reduce((acc, curr) => {
      if (!curr || !curr.date) return acc;
      try {
        const date = getISTDateString(curr.date);
        if (!date) return acc;

        if (!acc[date]) {
          acc[date] = {
            marked: true,
            hasSchoolEvent: false,
            hasHoliday: false,
            hasGeneralEvent: false,
          };
        }

        if (curr.isSchoolEvent) {
          acc[date].hasSchoolEvent = true;
        } else if (curr.isHoliday) {
          acc[date].hasHoliday = true;
        } else {
          acc[date].hasGeneralEvent = true;
        }
      } catch {
        // Ignore invalid date formats
      }
      return acc;
    }, {});

    if (selectedDate) {
      dates[selectedDate] = {
        ...dates[selectedDate],
        selected: true,
      };
    }

    return dates;
  }, [selectedDate, allEvents]);

  // Display List Data based on Active Tab
  const displayEvents = useMemo(() => {
    if (viewMode === "calendar") {
      if (!selectedDate) return [];
      return allEvents
        .filter((event) => {
          if (!event || !event.date) return false;
          try {
            return getISTDateString(event.date) === selectedDate;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          if (a.isSchoolEvent && !b.isSchoolEvent) return -1;
          if (!a.isSchoolEvent && b.isSchoolEvent) return 1;
          if (a.isHoliday && !b.isHoliday) return -1;
          if (!a.isHoliday && b.isHoliday) return 1;
          return 0;
        });
    }

    if (viewMode === "upcoming") {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      return allEvents
        .filter((event) => {
          if (!event || !event.date) return false;
          try {
            const eDate = new Date(event.date);
            if (eDate < todayDate) return false;

            if (categoryFilter === "school") return event.isSchoolEvent;
            if (categoryFilter === "holidays") return event.isHoliday;
            return true;
          } catch {
            return false;
          }
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (viewMode === "holidays") {
      return allEvents
        .filter((event) => !!event?.isHoliday)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return [];
  }, [viewMode, selectedDate, allEvents, categoryFilter]);

  // Total counts for badges
  const upcomingCount = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return allEvents.filter((e) => e?.date && new Date(e.date) >= todayDate).length;
  }, [allEvents]);

  const holidaysCount = useMemo(() => {
    return allEvents.filter((e) => !!e?.isHoliday).length;
  }, [allEvents]);

  const formattedSelectedDate = formatISTDisplayDate(selectedDate, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) || formatDate(selectedDate);

  const isViewingToday = selectedDate === today;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        data={displayEvents}
        keyExtractor={(item) => (item._id ?? item.id ?? Math.random()).toString()}
        renderItem={({ item }) => (
          <EventCard
            event={{ ...item, date: formatDate(item.date) }}
            colors={colors}
            isDark={isDark}
            isAdmin={isAuthenticated}
            onEdit={() => handleEditEvent(item)}
            onDelete={() => handleDeleteEvent(item._id, item.title)}
            t={t}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Screen Header */}
            <Header
              title={t("events.title", "Events")}
              subtitle={t("events.subtitle", "Calendar & school schedules")}
            />

            {/* Segmented View Mode Switcher */}
            <View
              style={[
                styles.tabBarContainer,
                {
                  backgroundColor: isDark
                    ? colors.surfaceContainer
                    : "rgba(0,0,0,0.04)",
                  borderColor: colors.outlineVariant
                    ? colors.outlineVariant + "30"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
            >
              {/* Tab 1: Calendar */}
              <Pressable
                onPress={() => handleTabChange("calendar")}
                style={[
                  styles.tabItem,
                  viewMode === "calendar" && [
                    styles.tabItemActive,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : "#FFFFFF",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    },
                  ],
                ]}
              >
                <MaterialIcons
                  name="calendar-month"
                  size={16}
                  color={
                    viewMode === "calendar"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        viewMode === "calendar"
                          ? colors.primary
                          : colors.textSecondary,
                      fontFamily:
                        viewMode === "calendar" ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  Calendar
                </Text>
              </Pressable>

              {/* Tab 2: Upcoming */}
              <Pressable
                onPress={() => handleTabChange("upcoming")}
                style={[
                  styles.tabItem,
                  viewMode === "upcoming" && [
                    styles.tabItemActive,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : "#FFFFFF",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    },
                  ],
                ]}
              >
                <MaterialIcons
                  name="upcoming"
                  size={16}
                  color={
                    viewMode === "upcoming"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        viewMode === "upcoming"
                          ? colors.primary
                          : colors.textSecondary,
                      fontFamily:
                        viewMode === "upcoming" ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  Upcoming
                </Text>
                {upcomingCount > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor:
                          viewMode === "upcoming"
                            ? colors.primary
                            : isDark
                            ? colors.surfaceContainerHigh
                            : "rgba(0,0,0,0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        {
                          color:
                            viewMode === "upcoming"
                              ? colors.white
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {upcomingCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Tab 3: Holidays */}
              <Pressable
                onPress={() => handleTabChange("holidays")}
                style={[
                  styles.tabItem,
                  viewMode === "holidays" && [
                    styles.tabItemActive,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : "#FFFFFF",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    },
                  ],
                ]}
              >
                <MaterialIcons
                  name="beach-access"
                  size={16}
                  color={
                    viewMode === "holidays"
                      ? "#EF4444"
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        viewMode === "holidays"
                          ? isDark
                            ? "#F87171"
                            : "#DC2626"
                          : colors.textSecondary,
                      fontFamily:
                        viewMode === "holidays" ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  Holidays
                </Text>
                {holidaysCount > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor:
                          viewMode === "holidays"
                            ? "#EF4444"
                            : isDark
                            ? colors.surfaceContainerHigh
                            : "rgba(0,0,0,0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        {
                          color:
                            viewMode === "holidays"
                              ? colors.white
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {holidaysCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Calendar View Content */}
            {viewMode === "calendar" && (
              <>
                <ModernCalendar
                  current={selectedDate}
                  onDayPress={handleDateSelect}
                  onMonthChange={(_month) => {}}
                  markedDates={markedDates}
                  dayComponent={({ date, state, marking }) => (
                    <DayRenderer
                      date={date}
                      state={state}
                      marking={marking}
                      onDayPress={handleDateSelect}
                      colors={colors}
                      isDark={isDark}
                    />
                  )}
                  style={styles.calendarWrapper}
                />

                {/* Calendar Legend Bar */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: "#F59E0B" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendText,
                        { color: colors.onSurfaceVariant || colors.textSecondary },
                      ]}
                    >
                      School Event
                    </Text>
                  </View>

                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: "#EF4444" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendText,
                        { color: colors.onSurfaceVariant || colors.textSecondary },
                      ]}
                    >
                      Holiday
                    </Text>
                  </View>

                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendText,
                        { color: colors.onSurfaceVariant || colors.textSecondary },
                      ]}
                    >
                      Activity
                    </Text>
                  </View>
                </View>

                {/* Selected Date Header Strip */}
                <View style={styles.dateHeaderSection}>
                  <View style={styles.dateHeaderLeft}>
                    <Text
                      style={[
                        styles.dateHeaderTitle,
                        { color: colors.onSurface || colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {formattedSelectedDate}
                    </Text>
                    {isViewingToday && (
                      <View
                        style={[
                          styles.todayChip,
                          {
                            backgroundColor: isDark
                              ? "rgba(208, 188, 255, 0.18)"
                              : "rgba(79, 55, 139, 0.12)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.todayChipText,
                            { color: colors.primary },
                          ]}
                        >
                          Today
                        </Text>
                      </View>
                    )}
                  </View>

                  {!isViewingToday && (
                    <Pressable
                      onPress={handleJumpToToday}
                      style={({ pressed }) => [
                        styles.jumpTodayBtn,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceContainerHighest
                            : "rgba(0,0,0,0.05)",
                          borderColor: colors.outlineVariant
                            ? colors.outlineVariant + "30"
                            : "rgba(0,0,0,0.08)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="today"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.jumpTodayText,
                          { color: colors.primary },
                        ]}
                      >
                        Today
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {/* Upcoming View Filter Chips */}
            {viewMode === "upcoming" && (
              <View style={styles.filterChipsRow}>
                {[
                  { key: "all", label: "All Upcoming", icon: "list" },
                  { key: "school", label: "School Events", icon: "school" },
                  { key: "holidays", label: "Holidays", icon: "beach-access" },
                ].map((chip) => {
                  const isActive = categoryFilter === chip.key;
                  return (
                    <Pressable
                      key={chip.key}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setCategoryFilter(chip.key);
                      }}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor: isActive
                            ? colors.primary
                            : isDark
                            ? colors.surfaceContainer
                            : "rgba(0,0,0,0.04)",
                          borderColor: isActive
                            ? colors.primary
                            : colors.outlineVariant
                            ? colors.outlineVariant + "30"
                            : "rgba(0,0,0,0.08)",
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={chip.icon}
                        size={14}
                        color={isActive ? colors.white : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: isActive
                              ? colors.white
                              : colors.onSurfaceVariant || colors.textSecondary,
                            fontFamily: isActive ? FONTS.bold : FONTS.medium,
                          },
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Holidays Tab Subtitle */}
            {viewMode === "holidays" && (
              <View style={styles.holidaysHeader}>
                <Text
                  style={[
                    styles.holidaysSectionTitle,
                    { color: colors.onSurface || colors.textPrimary },
                  ]}
                >
                  Official School Holidays
                </Text>
                <Text
                  style={[
                    styles.holidaysSectionSub,
                    { color: colors.onSurfaceVariant || colors.textSecondary },
                  ]}
                >
                  Academic breaks, festivals, and public holidays
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading && displayEvents.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                style={[
                  styles.loadingText,
                  { color: colors.onSurfaceVariant || colors.textSecondary },
                ]}
              >
                {t("common.loading", "Loading events...")}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.emptyContainer,
                {
                  backgroundColor: isDark
                    ? colors.surfaceContainer
                    : "rgba(0,0,0,0.02)",
                  borderColor: colors.outlineVariant
                    ? colors.outlineVariant + "25"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerHighest
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    viewMode === "holidays"
                      ? "beach-access"
                      : "event-available"
                  }
                  size={36}
                  color={colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.onSurface || colors.textPrimary },
                ]}
              >
                {viewMode === "calendar"
                  ? "No events on this date"
                  : viewMode === "holidays"
                  ? "No holidays scheduled"
                  : "No upcoming events found"}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.onSurfaceVariant || colors.textSecondary },
                ]}
              >
                {viewMode === "calendar"
                  ? "No school activities or holidays are scheduled for this day."
                  : viewMode === "holidays"
                  ? "Holiday calendar is currently empty or up to date."
                  : "Check back later or browse the calendar view."}
              </Text>

              {/* Admin CTA directly in empty state */}
              {isAuthenticated && viewMode === "calendar" && (
                <Pressable
                  onPress={() => setIsEventFormVisible(true)}
                  style={({ pressed }) => [
                    styles.emptyAddBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="add" size={16} color={colors.white} />
                  <Text style={[styles.emptyAddBtnText, { color: colors.white }]}>
                    Add Event for this Day
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
      />

      {/* Event Add/Edit Form Modal */}
      {isEventFormVisible && (
        <EventFormModal
          isVisible={isEventFormVisible}
          onClose={() => {
            setIsEventFormVisible(false);
            setEditingEvent(null);
          }}
          selectedDate={selectedDate}
          onSuccess={handleEventSubmit}
          editItem={editingEvent}
          isLoading={
            createEventMutation.isPending || updateEventMutation.isPending
          }
        />
      )}

      {/* Floating Action Button (FAB) for Admin */}
      {isAuthenticated && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setIsEventFormVisible(true);
          }}
          style={({ pressed }) => [
            styles.fabContainer,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              shadowColor: colors.primary,
            },
          ]}
          accessibilityLabel="Add New Event"
        >
          <MaterialIcons name="add" size={26} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 16,
  },
  tabBarContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 6,
  },
  tabItemActive: {
    borderRadius: 12,
  },
  tabText: {
    fontSize: FONT_SIZES.xs,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  calendarWrapper: {
    marginBottom: 10,
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dayText: {
    fontSize: FONT_SIZES.sm,
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  dateHeaderSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  dateHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dateHeaderTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  todayChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayChipText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  jumpTodayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  jumpTodayText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  filterChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
  },
  holidaysHeader: {
    marginBottom: 14,
  },
  holidaysSectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  holidaysSectionSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  eventCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  eventCardContent: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  dateTile: {
    width: 48,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    flexShrink: 0,
  },
  tileMonth: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },
  tileDay: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    marginTop: -2,
  },
  tileWeekday: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    marginTop: -2,
  },
  eventInfoSection: {
    flex: 1,
    minWidth: 0,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  relativeChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  relativeChipText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
  },
  eventTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    lineHeight: LINE_HEIGHTS.md,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.sm,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  vibesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  vibesButtonText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  adminButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: LINE_HEIGHTS.xs,
    maxWidth: 260,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyAddBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
