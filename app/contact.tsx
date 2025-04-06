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
import { useRef, useEffect } from "react";
import { SCHOOL } from "../constants/basic-info";

export default function Contact() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        Contact Us
      </Animated.Text>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="location-on" size={20} color="#FF5E1C" />
          <Text style={styles.label}>Address</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.address}</Text>
        <Pressable onPress={() => Linking.openURL(SCHOOL.mapUrl)}>
          <Text style={styles.link}>📌 View on Google Maps</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <Feather name="phone-call" size={18} color="#FF5E1C" />
          <Text style={styles.label}>Phone</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(`tel:${SCHOOL.phone}`)}>
          <Text style={styles.text}>{SCHOOL.phone}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="email" size={20} color="#FF5E1C" />
          <Text style={styles.label}>Email</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(`mailto:${SCHOOL.email}`)}>
          <Text style={styles.text}>{SCHOOL.email}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <Entypo name="share" size={18} color="#FF5E1C" />
          <Text style={styles.label}>Follow Us</Text>
        </View>
        <Pressable
          style={styles.socialRow}
          onPress={() => Linking.openURL(SCHOOL.socials.instagram)}
        >
          <FontAwesome5 name="instagram" size={18} color="#C13584" />
          <Text style={styles.link}>Instagram</Text>
        </Pressable>

        <Pressable
          style={styles.socialRow}
          onPress={() => Linking.openURL(SCHOOL.socials.youtube)}
        >
          <FontAwesome name="youtube-play" size={20} color="#FF0000" />
          <Text style={styles.link}>YouTube</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#2F6CD4",
    marginBottom: 30,
    textAlign: "center",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#333",
  },
  text: {
    fontSize: 15,
    fontFamily: "Poppins",
    color: "#555",
    lineHeight: 22,
  },
  link: {
    fontSize: 15,
    fontFamily: "Poppins",
    color: "#2F6CD4",
    marginTop: 6,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
});
