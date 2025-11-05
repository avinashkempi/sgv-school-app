// Events screen
import { useState, useMemo, useEffect } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../theme";
import { useToast } from "./_utils/ToastProvider";
import Header from "./_utils/Header";
import EventFormModal from "./_utils/EventFormModal";
import useEvents from "./hooks/useEvents";

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
        name={event.isSchoolEvent ? "school" : "calendar-star"}
        size={20}
        color={event.isSchoolEvent ? '#FFD700' : colors.primary}
        style={styles.smallLeftMargin}
      />
    </View>
    <Text style={styles.newsText}>{event.title}</Text>
    {event.isSchoolEvent && (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <MaterialCommunityIcons name="school" size={14} color="#FFD700" />
        <Text style={{ color: '#FFD700', fontSize: 12, marginLeft: 4 }}>School Event</Text>
      </View>
    )}
  </View>
);

export default function EventsScreen() {
  const navigation = useNavigation();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEventFormVisible, setIsEventFormVisible] = useState(false);
  // This flag now represents whether the user has admin privileges
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const { events: allEvents, loading, addEvent } = useEvents();

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
    addEvent(newEvent);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPaddingBottom}>
      <Header title="Events" />

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
