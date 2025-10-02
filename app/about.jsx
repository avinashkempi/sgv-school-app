import React from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";
import { globalStyles, COLORS } from "../globalStyles";
import useFade from "./hooks/useFade";
import { useNavigation } from "@react-navigation/native";

export default function About() {
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
        {SCHOOL.name}
      </Animated.Text>

      {/* About Us Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <MaterialIcons name="info" size={22} color={COLORS.primary} />
          <Text style={globalStyles.label}>About Us</Text>
        </View>
        <Text style={globalStyles.text}>{SCHOOL.about}</Text>
      </Animated.View>

      {/* Branches Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <FontAwesome5 name="school" size={20} color={COLORS.primary} />
          <Text style={globalStyles.label}>Branches</Text>
        </View>
        <Text style={globalStyles.text}>
          1. Renuka Nagar, Mangasuli – Kindergarten to 8th Standard (9th and
          10th opening soon).
        </Text>
        <Text style={globalStyles.text}>2. Ugar Khurd – Only Kindergarten.</Text>
      </Animated.View>

      {/* Mission Section */}
      <Animated.View style={[globalStyles.card, { opacity: fadeAnim }]}>
        <View style={globalStyles.iconRow}>
          <MaterialIcons name="flag" size={22} color={COLORS.primary} />
          <Text style={globalStyles.label}>Our Mission</Text>
        </View>
        <Text style={globalStyles.text}>{SCHOOL.mission}</Text>
      </Animated.View>
    </ScrollView>
  );
}
