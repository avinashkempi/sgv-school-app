import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import {
  MaterialIcons,
  FontAwesome5,
  Feather,
  Entypo,
  FontAwesome,
} from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";
import { globalStyles, COLORS } from "../globalStyles";
import useFade from "./hooks/useFade";
import { openAppLink, dial, email } from "./_utils/link";
import { useNavigation } from "@react-navigation/native";

export default function Contact() {
  const fadeAnim = useFade();
  const navigation = useNavigation();

  return (
    <ScrollView style={globalStyles.container}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={globalStyles.backButton}
      >
        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
      </Pressable>

      <Animated.Text style={[globalStyles.title, { opacity: fadeAnim }]}>
        Contact Us
      </Animated.Text>

      {/* Address Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <MaterialIcons name="location-on" size={22} color={COLORS.primary} />
          <Text style={globalStyles.label}>Address</Text>
        </View>
        <Text style={globalStyles.text}>{SCHOOL.address}</Text>
        <Pressable onPress={() => openAppLink(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}>
          <Text style={globalStyles.link}>📌 View on Google Maps</Text>
        </Pressable>
      </Animated.View>

      {/* Phone Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <Feather name="phone-call" size={20} color={COLORS.primary} />
          <Text style={globalStyles.label}>Phone</Text>
        </View>
        <Pressable onPress={() => dial(SCHOOL.phone)}>
          <Text style={globalStyles.text}>{SCHOOL.phone}</Text>
        </Pressable>
      </Animated.View>

      {/* Email Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <MaterialIcons name="email" size={22} color={COLORS.primary} />
          <Text style={globalStyles.label}>Email</Text>
        </View>
        <Pressable onPress={() => email(SCHOOL.email)}>
          <Text style={globalStyles.text}>{SCHOOL.email}</Text>
        </Pressable>
      </Animated.View>

      {/* Social Media Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <Entypo name="share" size={20} color={COLORS.primary} />
          <Text style={globalStyles.label}>Follow Us</Text>
        </View>

        <Pressable
          style={globalStyles.iconRow}
          onPress={() =>
            openAppLink(
              SCHOOL.socials.instagramAppUrl,
              SCHOOL.socials.instagram
            )
          }
        >
          <FontAwesome5 name="instagram" size={22} color="#C13584" />
          <Text style={globalStyles.link}>Instagram</Text>
        </Pressable>

        <Pressable
          style={globalStyles.iconRow}
          onPress={() =>
            openAppLink(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)
          }
        >
          <FontAwesome name="youtube-play" size={24} color="#FF0000" />
          <Text style={globalStyles.link}>YouTube</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
