import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";

export default function About() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        {SCHOOL.name}
      </Animated.Text>

      {/* Branches Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <FontAwesome5 name="school" size={20} color="#2F6CD4" />
          <Text style={styles.label}>Branches</Text>
        </View>
        <Text style={styles.text}>
          1. Renuka Nagar, Mangasuli – Kindergarten to 8th Standard (9th and 10th
          opening soon).
        </Text>
        <Text style={styles.text}>2. Ugar Khurd – Only Kindergarten.</Text>
      </Animated.View>

      {/* Mission Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="flag" size={22} color="#2F6CD4" />
          <Text style={styles.label}>Our Mission</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.mission}</Text>
      </Animated.View>

      {/* About Us Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="info" size={22} color="#2F6CD4" />
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
    backgroundColor: "#f7f8fc",
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: "Quicksand-Bold",
    color: "#2F6CD4",
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
    borderLeftColor: "#2F6CD4",
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
    marginBottom: 8,
  },
});
