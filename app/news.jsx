import { View, Text, FlatList, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";
import { useTheme } from "../theme";

export default function NewsScreen() {
  const navigation = useNavigation();
  const { styles, colors } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
      </Pressable>

      <Text style={styles.title}>Latest News</Text>

      <FlatList
        data={SCHOOL.news}
        keyExtractor={(item) => item.id}
  ListEmptyComponent={<Text style={styles.empty}>No news available right now</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, styles.cardCompact]}>
            <View style={styles.headerRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.date}</Text>
              </View>
              <MaterialCommunityIcons
                name="calendar-text"
                size={20}
                color={colors.primary}
                style={styles.smallLeftMargin}
              />
            </View>
            <Text style={styles.newsText}>{item.title}</Text>
          </View>
        )}
  contentContainerStyle={styles.contentPaddingBottom}
      />
    </View>
  );
}
