// Events screen
import { useState, useMemo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";

import { SCHOOL } from "../constants/basic-info";
import { useTheme } from "../theme";
import Header from "./_utils/Header";

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
  const [selectedDate, setSelectedDate] = useState("");
  const { styles, colors } = useTheme();

  const events = useMemo(
    () => (selectedDate ? SCHOOL.events.filter((event) => event.date === selectedDate) : []),
    [selectedDate]
  );

  const markedDates = useMemo(() => {
    const dates = SCHOOL.events.reduce((acc, curr) => {
      acc[curr.date] = {
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
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <Header title="Events" left={<Pressable onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back"><MaterialIcons name="arrow-back" size={24} color={colors.primary} /></Pressable>} />

      <View style={styles.card}>
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            // Calendar colors adapted to theme
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
          {selectedDate ? `Events on ${selectedDate}` : "Tap a date to view events"}
        </Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No events on this day</Text>}
  renderItem={({ item }) => <EventCard event={item} styles={styles} colors={colors} />}
  contentContainerStyle={styles.contentPaddingBottom}
      />
    </View>
  );
}
