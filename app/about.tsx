import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { SCHOOL } from "../constants/basic-info";

export default function About() {
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
        {SCHOOL.name}
      </Animated.Text>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <FontAwesome5 name="school" size={18} color="#FF5E1C" />
          <Text style={styles.label}>Branches</Text>
        </View>
        <Text style={styles.text}>
          1. Renuka Nagar, Mangasuli – Kindergarten to 8th Standard (9th and
          10th opening soon).
        </Text>
        <Text style={styles.text}>2. Ugar Khurd – Only Kindergarten.</Text>
      </Animated.View>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="flag" size={20} color="#FF5E1C" />
          <Text style={styles.label}>Our Mission</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.mission}</Text>
      </Animated.View>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="info" size={20} color="#FF5E1C" />
          <Text style={styles.label}>About Us</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.about}</Text>
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
    marginBottom: 8,
    gap: 8,
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
    marginBottom: 6,
  },
});
