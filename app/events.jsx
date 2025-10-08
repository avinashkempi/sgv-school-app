// Events screen
import { useState, useMemo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";

import { globalStyles, COLORS } from "../globalStyles";
import { SCHOOL } from "../constants/basic-info";

const EventCard = ({ event }) => (
  <View style={[globalStyles.card, globalStyles.cardCompact]}>
    <View style={globalStyles.headerRow}>
      <View style={globalStyles.badge}>
        <Text style={globalStyles.badgeText}>{event.date}</Text>
      </View>
      <MaterialCommunityIcons
        name="calendar-star"
        size={20}
        color={COLORS.primary}
        style={globalStyles.smallLeftMargin}
      />
    </View>
    <Text style={globalStyles.newsText}>{event.title}</Text>
  </View>
);

export default function EventsScreen() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState("");

  const events = useMemo(
    () => (selectedDate ? SCHOOL.events.filter((event) => event.date === selectedDate) : []),
    [selectedDate]
  );

  const markedDates = useMemo(() => {
    const dates = SCHOOL.events.reduce((acc, curr) => {
      acc[curr.date] = {
        marked: true,
        dotColor: COLORS.primary,
      };
      return acc;
    }, {});

    if (selectedDate) {
      dates[selectedDate] = {
        ...dates[selectedDate],
        selected: true,
        selectedColor: COLORS.primary,
      };
    }

    return dates;
  }, [selectedDate]);

  return (
    <View style={globalStyles.container}>
      <Pressable onPress={() => navigation.goBack()} style={globalStyles.backButton} accessibilityLabel="Go back">
        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
      </Pressable>

      <Text style={globalStyles.title}>Events</Text>

      <View style={globalStyles.card}>
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: COLORS.primary,
            todayTextColor: COLORS.primary,
            arrowColor: COLORS.primary,
          }}
        />

        <Text style={[globalStyles.title, { marginTop: 18, fontSize: 18 }]}> 
          {selectedDate ? `Events on ${selectedDate}` : "Tap a date to view events"}
        </Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={globalStyles.empty}>No events on this day</Text>}
        renderItem={({ item }) => <EventCard event={item} />}
  contentContainerStyle={globalStyles.contentPaddingBottom}
      />
    </View>
  );
}
