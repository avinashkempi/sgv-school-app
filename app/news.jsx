import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";
import { globalStyles, COLORS } from "../globalStyles";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";

export default function NewsScreen() {
  const navigation = useNavigation();

  return (
    <View style={globalStyles.container}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={globalStyles.backButton}
      >
        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
      </Pressable>

      <Text style={globalStyles.title}>Latest News</Text>

      <FlatList
        data={SCHOOL.news}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No news available right now</Text>}
        renderItem={({ item }) => (
          <View style={[globalStyles.card, styles.card]}>
            <View style={styles.headerRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.date}</Text>
              </View>
              <MaterialCommunityIcons
                name="calendar-text"
                size={20}
                color={COLORS.primary}
                style={{ marginLeft: 8 }}
              />
            </View>
            <Text style={styles.newsText}>{item.title}</Text>
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
    marginTop: 20,
    textAlign: "center",
  },
  card: {
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  badge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "Quicksand-SemiBold",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  newsText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: "Quicksand-SemiBold",
    lineHeight: 24,
  },
});
