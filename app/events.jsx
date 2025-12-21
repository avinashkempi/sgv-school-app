import React, { useState, useMemo, } from "react";
import { ScrollView, View, Text, Pressable, Alert, RefreshControl, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";



import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import EventFormModal from "../components/EventFormModal";
import ModernCalendar from "../components/ModernCalendar";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import apiConfig from "../config/apiConfig";

// Memoized day renderer component for performance
const DayRenderer = React.memo(({ date, state, marking, onDayPress, colors }) => {
  const hasSchoolEvent = marking?.hasSchoolEvent;
  const hasEvent = marking?.marked;
  const isSelected = marking?.selected;
  const isToday = state === 'today';

  return (
    <Pressable
      onPress={() => onDayPress({ dateString: date.dateString })}
      style={{
        width: 40,
        height: 40, // Reduced height for vertical compactness
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Circle border for school events */}
      {hasSchoolEvent && (
        <View
          style={{
            position: 'absolute',
            width: 42,
            height: 42,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#FFD700',
          }}
        />
      )}

      {/* Selected background */}
      {isSelected && (
        <View
          style={{
            position: 'absolute',
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
          }}
        />
      )}

      {/* Date text */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: isSelected ? '600' : isToday ? '600' : '400',
          color: isSelected ? colors.white : state === 'disabled' ? colors.textSecondary : colors.textPrimary,
          zIndex: 1,
        }}
      >
        {date.day}
      </Text>

      {/* Dots for events */}
      {hasEvent && !isSelected && !hasSchoolEvent && (
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.primary,
          }}
        />
      )}
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization - only re-render if these props change
  return (
    prevProps.marking?.hasSchoolEvent === nextProps.marking?.hasSchoolEvent &&
    prevProps.marking?.marked === nextProps.marking?.marked &&
    prevProps.marking?.selected === nextProps.marking?.selected &&
    prevProps.state === nextProps.state &&
    prevProps.date?.dateString === nextProps.date?.dateString
  );
});

DayRenderer.displayName = 'DayRenderer';

import { formatDate } from "../utils/date";

// ... inside component
// Helper to format dates for display in Indian format (DD-MM-YYYY)
const formatIndianDate = (dateInput) => {
  return formatDate(dateInput);
};

import Card from "../components/Card";

// Memoized EventCard component with custom comparison for optimal performance
const EventCard = React.memo(({ event, colors, isAdmin, onEdit, onDelete }) => {
  // Sanitize event data to prevent rendering issues
  const title = event.title?.trim() || 'Untitled Event';
  const description = event.description?.trim();
  const hasValidDescription = description && description.length > 1;

  return (
    <Card variant="elevated" style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 8 }} numberOfLines={2}>
            {title}
          </Text>
          {hasValidDescription && (
            <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.onSurfaceVariant, lineHeight: 20, marginBottom: 12 }} numberOfLines={2}>
              {description}
            </Text>
          )}
          {event.isSchoolEvent && (
            <View style={{
              backgroundColor: '#FFD700' + '20',
              paddingVertical: 4,
              paddingHorizontal: 12,
              borderRadius: 20,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <MaterialIcons name="school" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontFamily: "DMSans-Bold", color: "#F59E0B" }}>School Event</Text>
            </View>
          )}
        </View>
        {isAdmin && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => ({
                padding: 8,
                backgroundColor: colors.surfaceContainerHighest,
                borderRadius: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="edit" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => ({
                padding: 8,
                backgroundColor: colors.errorContainer,
                borderRadius: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="delete-outline" size={18} color={colors.onErrorContainer} />
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return (
    prevProps.event._id === nextProps.event._id &&
    prevProps.event.title === nextProps.event.title &&
    prevProps.event.description === nextProps.event.description &&
    prevProps.event.isSchoolEvent === nextProps.event.isSchoolEvent &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});

EventCard.displayName = 'EventCard';

export default function EventsScreen() {
  const _navigation = useNavigation();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEventFormVisible, setIsEventFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const queryClient = useQueryClient();
  const { data: allEvents = [], isLoading: loading, refetch } = useApiQuery(
    ['events'],
    apiConfig.url(apiConfig.endpoints.events.list),
    {
      select: (data) => data.events || [],
    }
  );

  const { data: userData } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    { select: (data) => data.user }
  );
  const isAuthenticated = userData?.role === 'admin' || userData?.role === 'super admin';

  // Mutations
  const createEventMutation = useApiMutation({
    mutationFn: createApiMutationFn(apiConfig.url(apiConfig.endpoints.events.create), 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event created successfully');
      setIsEventFormVisible(false);
    },
    onError: (error) => showToast(error.message || 'Failed to create event')
  });

  const updateEventMutation = useApiMutation({
    mutationFn: (data) => createApiMutationFn(apiConfig.url(apiConfig.endpoints.events.update(data._id)), 'PUT')(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event updated successfully');
      setIsEventFormVisible(false);
      setEditingEvent(null);
    },
    onError: (error) => showToast(error.message || 'Failed to update event')
  });

  const deleteEventMutation = useApiMutation({
    mutationFn: (id) => createApiMutationFn(apiConfig.url(apiConfig.endpoints.events.delete(id)), 'DELETE')(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event deleted successfully');
    },
    onError: (error) => showToast(error.message || 'Failed to delete event')
  });

  const [refreshFlag, _setRefreshFlag] = useState(false);

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
  };

  // Modified handleEventCreated to toggle refreshFlag to trigger re-render
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

  const handleDeleteEvent = (eventId, _eventTitle) => {
    deleteEventMutation.mutate(eventId);
  };

  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { colors, styles } = useTheme();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredEvents = useMemo(
    () =>
      selectedDate
        ? allEvents
          .filter((event) => {
            if (!event || !event.date) return false;
            try {
              return new Date(event.date).toISOString().split('T')[0] === selectedDate;
            } catch (e) {
              return false;
            }
          })
          .sort((a, b) => {
            // School events first (true comes before false in descending order)
            if (a.isSchoolEvent && !b.isSchoolEvent) return -1;
            if (!a.isSchoolEvent && b.isSchoolEvent) return 1;
            return 0;
          })
        : [],
    [selectedDate, allEvents, refreshFlag]
  );

  const markedDates = useMemo(() => {
    const dates = allEvents.reduce((acc, curr) => {
      if (!curr || !curr.date) return acc;
      try {
        const date = new Date(curr.date).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            marked: true,
            hasSchoolEvent: false,
          };
        }
        // If any event on this date is a school event, flag it
        if (curr.isSchoolEvent) {
          acc[date].hasSchoolEvent = true;
        }
      } catch (e) {
        // Ignore invalid dates
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
  }, [selectedDate, allEvents, refreshFlag]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Header title="Events" subtitle="View and manage events" />

          <View style={[styles.card, { padding: 0, overflow: 'hidden', marginBottom: 24 }]}>
            <ModernCalendar
              current={selectedDate}
              onDayPress={handleDateSelect}
              onMonthChange={(_month) => {
                // React Query handles caching automatically, no need to manually fetch range
                // But if we want to prefetch, we could do it here
              }}
              markedDates={markedDates}
              dayComponent={({ date, state, marking }) => (
                <DayRenderer
                  date={date}
                  state={state}
                  marking={marking}
                  onDayPress={handleDateSelect}
                  colors={colors}
                />
              )}
              style={{
                borderRadius: 24,
              }}
              theme={{
                calendarBackground: 'transparent',
                'stylesheet.day.basic': {
                  base: {
                    width: 40,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                }
              }}
            />
          </View>

          {selectedDate && (
            <View>
              <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>
                Events on {formatIndianDate(selectedDate)}
              </Text>

              {loading && filteredEvents.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8, fontFamily: "DMSans-Regular" }}>Loading events...</Text>
                </View>
              ) : filteredEvents.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40, opacity: 0.6 }}>
                  <MaterialIcons name="event-busy" size={48} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontFamily: "DMSans-Medium" }}>
                    No events on this day
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {filteredEvents.map((item) => (
                    <EventCard
                      key={item._id ?? item.id}
                      event={{ ...item, date: formatIndianDate(item.date) }}
                      styles={styles}
                      colors={colors}
                      isAdmin={isAuthenticated}
                      onEdit={() => handleEditEvent(item)}
                      onDelete={() => {
                        Alert.alert(
                          "Delete Event",
                          `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => handleDeleteEvent(item._id, item.title) },
                          ]
                        );
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <EventFormModal
          isVisible={isEventFormVisible}
          onClose={() => {
            setIsEventFormVisible(false);
            setEditingEvent(null);
          }}
          selectedDate={selectedDate}
          onSuccess={(eventData) => {
            handleEventSubmit(eventData);
          }}
          editItem={editingEvent}
        />
      </ScrollView>

      {/* FAB for Add Event - Outside ScrollView to stay fixed */}
      {isAuthenticated && (
        <Pressable
          onPress={() => setIsEventFormVisible(true)}
          style={({ pressed }) => ([
            styles.fab,
            { opacity: pressed ? 0.9 : 1, bottom: 130 }
          ])}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}
