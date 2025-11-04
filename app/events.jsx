// Events screen
import { useState, useMemo, useEffect } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";

import apiConfig from "./config/apiConfig";
import { useTheme } from "../theme";
import { useToast } from "./_utils/ToastProvider";
import Header from "./_utils/Header";
import EventFormModal from "./_utils/EventFormModal";

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

const EventCard = ({ event, styles, colors }) => (
  <View style={[styles.card, styles.cardCompact]}>
    <View style={styles.headerRow}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{event.date}</Text>
      </View>
      <MaterialCommunityIcons
        name="calendar-star"
        size={20}
        color={colors.primary}
        style={styles.smallLeftMargin}
      />
    </View>
    <Text style={styles.newsText}>{event.title}</Text>
  </View>
);

export default function EventsScreen() {
  const navigation = useNavigation();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEventFormVisible, setIsEventFormVisible] = useState(false);
  // This flag now represents whether the user has admin privileges
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { styles, colors } = useTheme();
  const { showToast } = useToast();

  useEffect(() => {
    // Fetch events immediately on mount regardless of auth state
    fetchEvents();

    // Check authentication and admin role in background (do not block fetch)
    (async () => {
      try {
        const [token, user] = await Promise.all([
          AsyncStorage.getItem('@auth_token'),
          AsyncStorage.getItem('@auth_user'),
        ]);

        if (token && user) {
          try {
            const parsed = JSON.parse(user);
            const isAdmin = !!(parsed && (parsed.admin === true || parsed.superAdmin === true));
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@auth_token');
      
      const fetchOptions = {};
      if (token) {
        fetchOptions.headers = { Authorization: `Bearer ${token}` };
      }

      const response = await fetch(apiConfig.url(apiConfig.endpoints.events.list), fetchOptions);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch events');
      }

      setAllEvents(data.event);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleEventCreated = (newEvent) => {
    // Normalize server response: some endpoints return `id` while DB documents use `_id`.
    const normalized = { ...newEvent };
    if (!normalized._id && normalized.id) normalized._id = normalized.id;
    setAllEvents(prev => [...prev, normalized]);
  };

  const filteredEvents = useMemo(
    () =>
      selectedDate
        ? allEvents.filter(
            (event) => new Date(event.date).toISOString().split('T')[0] === selectedDate
          )
        : [],
    [selectedDate, allEvents]
  );

  const markedDates = useMemo(() => {
    const dates = allEvents.reduce((acc, curr) => {
      const date = new Date(curr.date).toISOString().split('T')[0];
      acc[date] = {
        marked: true,
        dotColor: colors.primary,
      };
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPaddingBottom}>
      <Header
        title="Events"
        left={
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
        }
      />

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { flex: 1 }]}>Calendar</Text>
          {isAuthenticated && selectedDate && (
            <Pressable
              onPress={() => setIsEventFormVisible(true)}
              style={styles.addButton}
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

        <Text style={[styles.title, { marginTop: 18, fontSize: 18 }]}>
          {selectedDate
            ? `Events on ${formatIndianDate(selectedDate)}`
            : "Tap a date to add or view events"}
        </Text>
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
              />
            ))
          )}
        </View>
      )}

      <EventFormModal
        isVisible={isEventFormVisible}
        onClose={() => setIsEventFormVisible(false)}
        selectedDate={selectedDate}
        onSuccess={(newEvent) => {
          handleEventCreated(newEvent);
          setIsEventFormVisible(false);
          showToast('Event created successfully');
        }}
      />

    </ScrollView>
  );
}
