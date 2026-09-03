import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";

export default function DemoBanner() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleExit = () => {
    logout(router, "Exited Demo Mode");
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.badge}>
          <MaterialIcons name="school" size={14} color="#FFF" />
          <Text style={styles.badgeText}>STUDENT DEMO</Text>
        </View>
        <Text style={styles.text} numberOfLines={1}>
          Harshika Patil • Class 3A
        </Text>
      </View>
      <TouchableOpacity
        style={styles.exitButton}
        onPress={handleExit}
        activeOpacity={0.8}
      >
        <Text style={styles.exitText}>Exit Demo</Text>
        <MaterialIcons name="logout" size={14} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E65100",
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 999,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.micro,
  },
  text: {
    color: "#FFF",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flexShrink: 1,
  },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  exitText: {
    color: "#FFF",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
});

