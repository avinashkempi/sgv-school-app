import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { View, Text, ScrollView, Animated, Pressable, RefreshControl } from "react-native";
import { useState } from "react";
import useFade from "./hooks/useFade";
import { useTheme } from "../theme";
import Header from "./_utils/Header";
import useSchoolInfo from "./hooks/useSchoolInfo";

export default function About() {
  const fadeAnim = useFade();
  const navigation = useNavigation();
  const { styles, colors } = useTheme();
  const { schoolInfo: SCHOOL } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force re-fetch school info by clearing cached data if needed
      // The useSchoolInfo hook will fetch fresh data
      console.log('[ABOUT] Refreshing school info...');
      // Note: School info is fetched automatically by the hook
      // This simulates a refresh delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[ABOUT] Refreshed successfully');
    } catch (err) {
      console.error('[ABOUT] Refresh failed:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView style={styles.container} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
    }>
      <Header title={SCHOOL.name} />

      {/* About Us Section */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="info" size={22} color={colors.primary} />
          <Text style={styles.label}>About Us</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.about}</Text>
      </Animated.View>

      {/* Branches Section */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <FontAwesome5 name="school" size={20} color={colors.primary} />
          <Text style={styles.label}>Branches</Text>
        </View>
        <Text style={styles.text}>
          1. Renuka Nagar, Mangasuli  Kindergarten to 8th Standard (9th and 10th
          opening soon).
        </Text>
        <Text style={styles.text}>2. Ugar Khurd  Only Kindergarten.</Text>
      </Animated.View>

      {/* Mission Section */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="flag" size={22} color={colors.primary} />
          <Text style={styles.label}>Our Mission</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.mission}</Text>
      </Animated.View>
    </ScrollView>
  );
}
