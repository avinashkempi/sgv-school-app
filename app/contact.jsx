import { useNavigation } from "@react-navigation/native";
import {
  MaterialIcons,
  FontAwesome5,
  Feather,
  Entypo,
  FontAwesome,
} from "@expo/vector-icons";
import { View, Text, ScrollView, Pressable, Animated } from "react-native";
import useFade from "./hooks/useFade";
import { openAppLink, dial, email } from "./_utils/link";
import { SCHOOL } from "../constants/basic-info";
import { useTheme } from "../theme";
import Header from "./_utils/Header";

export default function Contact() {
  const fadeAnim = useFade();
  const navigation = useNavigation();
  const { styles, colors } = useTheme();

  return (
    <ScrollView style={styles.container}>
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
          <Feather name="phone-call" size={20} color={colors.primary} />
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
          <Entypo name="share" size={20} color={colors.primary} />
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
          <FontAwesome5 name="instagram" size={22} color="#C13584" />
          <Text style={styles.link}>Instagram</Text>
        </Pressable>

        <Pressable
          style={styles.iconRow}
          onPress={() =>
            openAppLink(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)
          }
        >
          <FontAwesome name="youtube-play" size={24} color="#FF0000" />
          <Text style={styles.link}>YouTube</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
