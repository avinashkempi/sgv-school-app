import { View, Text, FlatList, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import Header from "./_utils/Header";
import useSchoolInfo from "./hooks/useSchoolInfo";

export default function NewsScreen() {
  const navigation = useNavigation();
  const { styles, colors } = useTheme();
  const { schoolInfo: SCHOOL } = useSchoolInfo();

  return (
    <View style={styles.container}>
      <Header title="Latest News" />

      <FlatList
        data={SCHOOL.news}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No news available right now</Text>
        }
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
