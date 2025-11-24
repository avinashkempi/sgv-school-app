import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ScrollView, View, Text, Pressable, Alert, RefreshControl, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import Header from "../components/Header";
import EventFormModal from "../components/EventFormModal";
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
        width: 50,
        height: 50,
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
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 2.5,
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
      {hasEvent && !isSelected && (
        <View
          style={{
            position: 'absolute',
            bottom: 6,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: hasSchoolEvent ? '' : colors.primary,
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

// Helper to format dates for display in Indian format (DD-MM-YYYY)
const formatIndianDate = (dateInput) => {
  if (!dateInput) return "";
  try {
    // handle yyyy-mm-dd strings (selectedDate from calendar) by forcing midnight
    const d =
      typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
        ? new Date(dateInput + "T00:00:00")
        : new Date(dateInput);
    if (isNaN(d)) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

const EventCard = ({ event, styles, colors, isAdmin, onEdit, onDelete }) => (
  <View style={styles.cardMinimal}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 8 }} numberOfLines={2}>
          {event.title}
        </Text>
        {event.description && (
          <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.textSecondary, lineHeight: 20, marginBottom: 12 }} numberOfLines={2}>
            {event.description}
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
            style={[styles.buttonIcon, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="edit" size={18} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={[styles.buttonIcon, { backgroundColor: colors.error }]}
          >
            <MaterialIcons name="delete" size={18} color={colors.white} />
          </Pressable>
        </View>
      )}
    </View>
  </View>
);

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
  const { events: allEvents, loading, addEvent, updateEvent, removeEvent, fetchEventsRange } = useEvents();

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
            if (parsed && parsed.username) console.log('User loaded:', parsed.username, 'isAdmin:', isAdmin);
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
  const handleEventCreated = (newEvent) => {
    if (editingEvent) {
      updateEvent(newEvent);
      setRefreshFlag(prev => !prev);
      showToast('Event updated successfully');
      setEditingEvent(null);
    } else {
      addEvent(newEvent);
      setRefreshFlag(prev => !prev);
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
      console.log('[EVENTS] Refreshing events from API...');
      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.events.list), {
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('@auth_token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh events');
      }

      const result = await response.json();
      if (result.success && result.events) {
        console.log('[EVENTS] Refreshed successfully');
      }
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
          .filter(
            (event) => new Date(event.date).toISOString().split('T')[0] === selectedDate
          )
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPaddingBottom} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
    }>
      <Header title="Events" />

      <View style={styles.cardMinimal}>

        <Calendar
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
            });
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
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.cardBackground,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: 'transparent',
            selectedDayTextColor: colors.white,
            todayTextColor: colors.primary,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.textSecondary,
            dotColor: colors.primary,
            selectedDotColor: colors.white,
            arrowColor: colors.primary,
            monthTextColor: colors.textPrimary,
          }}
        />
      </View>

      {selectedDate && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.label, { marginBottom: 12 }]}>Events on {formatIndianDate(selectedDate)}</Text>

          {loading && filteredEvents.length === 0 ? (
            <Text style={styles.empty}>Loading events...</Text>
          ) : filteredEvents.length === 0 ? (
            <Text style={styles.empty}>No events on this day</Text>
          ) : (
            filteredEvents.map((item) => (
              <EventCard
                key={item._id ?? item.id}
                // format date for display only; keep original item.date on the source data
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
            ))
          )}
        </View>
      )}

      {/* FAB for Add Event */}
      {isAuthenticated && selectedDate && (
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

      <EventFormModal
        isVisible={isEventFormVisible}
        onClose={() => {
          setIsEventFormVisible(false);
          setEditingEvent(null);
        }}
        selectedDate={selectedDate}
        onSuccess={(newEvent) => {
          handleEventCreated(newEvent);
          setIsEventFormVisible(false);
        }}
        editItem={editingEvent}
      />

    </ScrollView>
  );
}
