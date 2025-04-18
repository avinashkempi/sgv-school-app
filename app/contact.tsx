import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Animated,
  Easing,
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
import { useNavigation, NavigationProp } from "@react-navigation/native";

const openAppLink = async (appUrl: string, fallbackUrl: string) => {
  try {
    const supported = await Linking.canOpenURL(appUrl);
    if (supported) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(fallbackUrl);
    }
  } catch (err) {
    console.error("Failed to open link:", err);
  }
};

export default function Contact() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<NavigationProp<any>>();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, []);

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
        <Pressable onPress={() => Linking.openURL(`tel:${SCHOOL.phone}`)}>
          <Text style={globalStyles.text}>{SCHOOL.phone}</Text>
        </Pressable>
      </Animated.View>

      {/* Email Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <MaterialIcons name="email" size={22} color={COLORS.primary} />
          <Text style={globalStyles.label}>Email</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(`mailto:${SCHOOL.email}`)}>
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
