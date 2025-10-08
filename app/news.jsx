import { View, Text, FlatList, Pressable } from "react-native";
import { globalStyles, COLORS } from "../globalStyles";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";

export default function NewsScreen() {
  const navigation = useNavigation();

  return (
    <View style={globalStyles.container}>
      <Pressable onPress={() => navigation.goBack()} style={globalStyles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
      </Pressable>

      <Text style={globalStyles.title}>Latest News</Text>

      <FlatList
        data={SCHOOL.news}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={globalStyles.empty}>No news available right now</Text>}
        renderItem={({ item }) => (
          <View style={[globalStyles.card, globalStyles.cardCompact]}>
            <View style={globalStyles.headerRow}>
              <View style={globalStyles.badge}>
                <Text style={globalStyles.badgeText}>{item.date}</Text>
              </View>
              <MaterialCommunityIcons
                name="calendar-text"
                size={20}
                color={COLORS.primary}
                style={globalStyles.smallLeftMargin}
              />
            </View>
            <Text style={globalStyles.newsText}>{item.title}</Text>
          </View>
        )}
  contentContainerStyle={globalStyles.contentPaddingBottom}
      />
    </View>
  );
}
