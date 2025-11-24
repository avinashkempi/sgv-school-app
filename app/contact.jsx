import { useNavigation } from "@react-navigation/native";
import {
  MaterialIcons,
} from "@expo/vector-icons";
import { View, Text, ScrollView, Pressable, Animated, RefreshControl } from "react-native";
import { useState } from "react";
import { openAppLink, dial, email } from "../utils/link";
import { useTheme } from "../theme";
import Header from "../components/Header";
import useSchoolInfo from "../hooks/useSchoolInfo";

export default function Contact() {
  const fadeAnim = useFade();
  const navigation = useNavigation();
  const { styles, colors } = useTheme();
  const { schoolInfo: SCHOOL } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[CONTACT] Refreshing school info...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[CONTACT] Refreshed successfully');
    } catch (err) {
      console.error('[CONTACT] Refresh failed:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPaddingBottom} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
    }>
      <Header title="Contact Us" />

      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="location-on" size={22} color={colors.primary} />
          <Text style={styles.label}>Address</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.address}</Text>
        <Pressable onPress={() => openAppLink(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}>
          <Text style={styles.link}>📌 View on Google Maps</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="phone" size={22} color={colors.primary} />
          <Text style={styles.label}>Phone</Text>
        </View>
        <Pressable onPress={() => dial(SCHOOL.phone)}>
          <Text style={styles.text}>{SCHOOL.phone}</Text>
        </Pressable>
      </Animated.View>

      {/* Email Section */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="email" size={22} color={colors.primary} />
          <Text style={styles.label}>Email</Text>
        </View>
        <Pressable onPress={() => email(SCHOOL.email)}>
          <Text style={styles.text}>{SCHOOL.email}</Text>
        </Pressable>
      </Animated.View>

      {/* Social Media Section */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="share" size={22} color={colors.primary} />
          <Text style={styles.label}>Follow Us</Text>
        </View>

        <Pressable
          style={styles.iconRow}
          onPress={() =>
            openAppLink(
              SCHOOL.socials.instagramAppUrl,
              SCHOOL.socials.instagram
            )
          }
        >
          <MaterialIcons name="photo_camera" size={24} color="#C13584" />
          <Text style={styles.link}>Instagram</Text>
        </Pressable>

        <Pressable
          style={styles.iconRow}
          onPress={() =>
            openAppLink(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)
          }
        >
          <MaterialIcons name="play_circle" size={24} color="#FF0000" />
          <Text style={styles.link}>YouTube</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
