import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ScrollView, View, Text, Pressable, Alert, RefreshControl, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import EventFormModal from "../components/EventFormModal";
import ModernCalendar from "../components/ModernCalendar";
import useEvents from "../hooks/useEvents";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";

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

import { formatDate } from "../utils/date";

// ... inside component
// Helper to format dates for display in Indian format (DD-MM-YYYY)
const formatIndianDate = (dateInput) => {
  return formatDate(dateInput);
};

// Memoized EventCard component with custom comparison for optimal performance
const EventCard = React.memo(({ event, styles, colors, isAdmin, onEdit, onDelete }) => {
  // Sanitize event data to prevent rendering issues
  const title = event.title?.trim() || 'Untitled Event';
  const description = event.description?.trim();
  const hasValidDescription = description && description.length > 1;

  return (
    <View style={styles.cardMinimal}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 8 }} numberOfLines={2}>
            {title}
          </Text>
          {hasValidDescription && (
            <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.textSecondary, lineHeight: 20, marginBottom: 12 }} numberOfLines={2}>
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
                backgroundColor: colors.background,
                borderRadius: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => ({
                padding: 8,
                backgroundColor: colors.error + '15',
                borderRadius: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="delete-outline" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
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

export default function EventsScreen() {
  const navigation = useNavigation();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEventFormVisible, setIsEventFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const { events: allEvents, loading, addEvent, updateEvent, removeEvent, fetchEventsRange, refreshEvents } = useEvents();

  useEffect(() => {
    // Check authentication and admin role
    (async () => {
      try {
        const [token, user] = await Promise.all([
          AsyncStorage.getItem('@auth_token'),
          AsyncStorage.getItem('@auth_user'),
        ]);

        if (token && user) {
          try {
            const parsed = JSON.parse(user);
            const isAdmin = !!(parsed && (parsed.role === 'admin' || parsed.role === 'super admin'));
            setIsAuthenticated(isAdmin);
            if (parsed && parsed.name) {
              // User loaded
            }
          } catch (e) {
            console.warn('Failed to parse stored user', e);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
      }
    })();
  }, []);

  const [refreshFlag, setRefreshFlag] = useState(false);

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
  };

  // Modified handleEventCreated to toggle refreshFlag to trigger re-render
  const handleEventSubmit = async (eventData) => {
    // Close modal immediately and show background loader
    setIsEventFormVisible(false);
    setEditingEvent(null);
    showToast('Saving event...', 'info');

    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        showToast('Please login to manage events');
        setRefreshing(false);
        return;
      }

      const isEditing = !!eventData._id;
      const endpoint = isEditing
        ? apiConfig.url(apiConfig.endpoints.events.update(eventData._id))
        : apiConfig.url(apiConfig.endpoints.events.create);

      const method = isEditing ? 'PUT' : 'POST';

      const response = await apiFetch(endpoint, {
        method: method,
        silent: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to ${isEditing ? 'update' : 'create'} event`);
      }

      const newEvent = {
        ...(result.event || {}),
        isSchoolEvent: eventData.isSchoolEvent,
        date: result.event?.date || eventData.date // Ensure date is present
      };

      if (isEditing) {
        updateEvent(newEvent);
        showToast('Event updated successfully');
      } else {
        addEvent(newEvent);
        showToast('Event created successfully');
      }
      setRefreshFlag(prev => !prev);

    } catch (error) {
      console.error('Event submit error:', error);
      showToast(error.message || 'Failed to save event');
    }
  };

  const handleEditEvent = (eventItem) => {
    setEditingEvent(eventItem);
    setIsEventFormVisible(true);
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        showToast('Please login to delete events');
        return;
      }

      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.events.delete(eventId)), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      const result = await response.json();
      if (result.success) {
        removeEvent(eventId);
        showToast(`Event "${eventTitle}" deleted successfully`);
      } else {
        throw new Error(result.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Delete event error:', error);
      showToast(error.message || 'Failed to delete event');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {

      await refreshEvents(true); // silent=true

    } catch (err) {
      console.error('[EVENTS] Refresh failed:', err.message);
      showToast('Failed to refresh events');
    } finally {
      setRefreshing(false);
    }
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
              onMonthChange={(month) => {
                const date = new Date(month.dateString);
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
                const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();
                fetchEventsRange(startOfMonth, endOfMonth, (error, count) => {
                  if (error) {
                    showToast(`Failed to load events: ${error.message || error}`);
                  } else {
                    showToast(`Loaded ${count} events`);
                  }
                }, true);
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
            { opacity: pressed ? 0.9 : 1 }
          ])}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}
