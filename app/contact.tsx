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
        <Text style={globalStyles.backText}>Back</Text>
      </Pressable>

      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        Contact Us
      </Animated.Text>

      {/* Address Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="location-on" size={22} color={COLORS.primary} />
          <Text style={styles.label}>Address</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.address}</Text>
        <Pressable onPress={() => openAppLink(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}>
          <Text style={styles.link}>📌 View on Google Maps</Text>
        </Pressable>
      </Animated.View>

      {/* Phone Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <Feather name="phone-call" size={20} color={COLORS.primary} />
          <Text style={styles.label}>Phone</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(`tel:${SCHOOL.phone}`)}>
          <Text style={styles.text}>{SCHOOL.phone}</Text>
        </Pressable>
      </Animated.View>

      {/* Email Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="email" size={22} color={COLORS.primary} />
          <Text style={styles.label}>Email</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(`mailto:${SCHOOL.email}`)}>
          <Text style={styles.text}>{SCHOOL.email}</Text>
        </Pressable>
      </Animated.View>

      {/* Social Media Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <Entypo name="share" size={20} color={COLORS.primary} />
          <Text style={styles.label}>Follow Us</Text>
        </View>

        <Pressable
          style={styles.socialRow}
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
          style={styles.socialRow}
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

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontFamily: "Quicksand-Bold",
    color: COLORS.primary,
    marginBottom: 40,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  label: {
    fontSize: 18,
    fontFamily: "Quicksand-SemiBold",
    color: "#333",
    textTransform: "uppercase",
  },
  text: {
    fontSize: 16,
    fontFamily: "Quicksand",
    color: "#666",
    lineHeight: 24,
    marginBottom: 6,
  },
  link: {
    fontSize: 16,
    fontFamily: "Quicksand",
    color: COLORS.primary,
    marginTop: 6,
    textDecorationLine: "underline",
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
});
