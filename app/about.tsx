import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";
import { globalStyles, COLORS } from "../globalStyles";
import { useNavigation, NavigationProp } from "@react-navigation/native";

export default function About() {
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
        {SCHOOL.name}
      </Animated.Text>

      {/* About Us Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="info" size={22} color={COLORS.primary} />
          <Text style={styles.label}>About Us</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.about}</Text>
      </Animated.View>

      {/* Branches Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <FontAwesome5 name="school" size={20} color={COLORS.primary} />
          <Text style={styles.label}>Branches</Text>
        </View>
        <Text style={styles.text}>
          1. Renuka Nagar, Mangasuli – Kindergarten to 8th Standard (9th and
          10th opening soon).
        </Text>
        <Text style={styles.text}>2. Ugar Khurd – Only Kindergarten.</Text>
      </Animated.View>

      {/* Mission Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.iconRow}>
          <MaterialIcons name="flag" size={22} color={COLORS.primary} />
          <Text style={styles.label}>Our Mission</Text>
        </View>
        <Text style={styles.text}>{SCHOOL.mission}</Text>
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
    marginBottom: 8,
  },
});
