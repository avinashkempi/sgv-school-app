// Events screen
import { useState, useMemo, useEffect } from "react";
import { ScrollView, View, Text, Pressable, Alert, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../theme";
import { useToast } from "./_utils/ToastProvider";
import Header from "./_utils/Header";
import EventFormModal from "./_utils/EventFormModal";
import useEvents from "./hooks/useEvents";
import apiConfig from "./config/apiConfig";
import apiFetch from "./_utils/apiFetch";

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
  <View style={[styles.card]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.cardText, { fontWeight: "600", fontSize: 15, marginBottom: 4 }]} numberOfLines={2}>{event.title}</Text>
        {event.description && (
          <Text style={[styles.text, { fontSize: 13, marginBottom: 8 }]} numberOfLines={2}>{event.description}</Text>
        )}
        {event.isSchoolEvent && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="school" size={14} color="#FFD700" />
            <Text style={{ color: '#FFD700', fontSize: 12, marginLeft: 4, fontWeight: "600" }}>School Event</Text>
          </View>
        )}
      </View>
      {isAdmin && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onEdit}
            style={[styles.buttonSmall, { minWidth: 44 }]}
          >
            <MaterialIcons name="edit" size={18} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={[styles.buttonSmall, { minWidth: 44, backgroundColor: colors.error }]}
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
  const { events: allEvents, loading, addEvent, updateEvent, removeEvent } = useEvents();

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



  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleEventCreated = (newEvent) => {
    if (editingEvent) {
      // Update existing event
      updateEvent(newEvent);
      showToast('Event updated successfully');
      setEditingEvent(null);
    } else {
      // Add new event
      addEvent(newEvent);
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
    [selectedDate, allEvents]
  );

  const markedDates = useMemo(() => {
    const dates = allEvents.reduce((acc, curr) => {
      const date = new Date(curr.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          marked: true,
          dotColor: colors.primary,
          selectedDotColor: colors.primary,
        };
      }
      // If any event on this date is a school event, show gold dot
      if (curr.isSchoolEvent) {
        acc[date].dotColor = '#FFD700';
        acc[date].selectedDotColor = '#FFD700';
      }
      return acc;
    }, {});

    if (selectedDate) {
      dates[selectedDate] = {
        ...dates[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return dates;
  }, [selectedDate, allEvents, colors.primary]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPaddingBottom} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
    }>
      <Header title="Events" />

      <View style={styles.card}>
        <View style={styles.headerRow}>
          {isAuthenticated && selectedDate && (
            <Pressable
              onPress={() => setIsEventFormVisible(true)}
              style={[styles.addButton, { marginLeft: 'auto' }]}
              accessibilityLabel="Add event"
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </Pressable>
          )}
        </View>
        
        <Calendar
          onDayPress={handleDateSelect}
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.cardBackground,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
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
        <View style={[styles.card, styles.eventList]}>
          <Text style={styles.sectionTitle}>Events on {formatIndianDate(selectedDate)}</Text>

          {loading ? (
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
