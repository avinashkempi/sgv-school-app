import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ViewStyle,
} from "react-native";
import { globalStyles, COLORS } from "../globalStyles";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar, DateData } from "react-native-calendars";
import { SCHOOL } from "../constants/basic-info";

export default function EventsScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [selectedDate, setSelectedDate] = useState<string>("");

  const events = selectedDate
    ? SCHOOL.events.filter((event) => event.date === selectedDate)
    : [];

  const markedDates = SCHOOL.events.reduce((acc, curr) => {
    acc[curr.date] = {
      marked: true,
      dotColor: COLORS.primary,
    };
    return acc;
  }, {} as Record<string, any>);

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: COLORS.primary,
    };
  }

  return (
    <View style={globalStyles.container}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={globalStyles.backButton}
      >
        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
      </Pressable>

      <Text style={globalStyles.title}>Events</Text>

      <Calendar
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
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

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No events on this day</Text>
        }
        renderItem={({ item }) => (
          <View style={[globalStyles.card, styles.card]}>
            <View style={styles.headerRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.date}</Text>
              </View>
              <MaterialCommunityIcons
                name="calendar-star"
                size={20}
                color={COLORS.primary}
                style={{ marginLeft: 8 }}
              />
            </View>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  card: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  } as ViewStyle,
  badgeText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "Quicksand-SemiBold",
  },
  title: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: "Quicksand-SemiBold",
    lineHeight: 24,
  },
});
