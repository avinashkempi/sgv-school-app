import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { globalStyles, COLORS } from "../globalStyles";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

type EventItem = {
  id: string;
  date: string;
  title: string;
};

export default function EventsScreen() {
  const events: EventItem[] = []; // define empty list with correct type
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <View style={globalStyles.container}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={globalStyles.backButton}
      >
        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        <Text style={globalStyles.backText}>Back</Text>
      </Pressable>
      <Text style={globalStyles.title}>Upcoming Events</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No events scheduled</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.text}>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  item: { marginBottom: 16 },
  date: { fontSize: 14, color: "#888" },
  text: { fontSize: 18, fontWeight: "500", color: "#333" },
  empty: { fontSize: 16, color: "#666", marginTop: 10 },
});
