import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Linking,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { Link } from "expo-router";
import {
  FontAwesome,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";
import { ROUTES } from "../constants/routes";

const handlePress = async (appUrl: string, fallbackUrl: string) => {
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

export default function HomeScreen() {
  const [iconScale, setIconScale] = useState(new Animated.Value(1));

  const handleIconPressIn = () => {
    Animated.spring(iconScale, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  };

  const handleIconPressOut = () => {
    Animated.spring(iconScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Welcome Header */}
      <Text style={styles.heading}>🎓 Welcome</Text>
      <Text style={styles.subheading}>{SCHOOL.name}</Text>

      {/* Main Card Group */}
      <View style={styles.cardGroup}>
        <Link href={ROUTES.ABOUT} asChild>
          <Pressable style={styles.card}>
            <MaterialIcons name="info" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>About</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.EVENTS} asChild>
          <Pressable style={styles.card}>
            <MaterialIcons name="event" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>Events</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.NEWS} asChild>
          <Pressable style={styles.card}>
            <MaterialCommunityIcons name="newspaper" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>News</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.CONTACT} asChild>
          <Pressable style={styles.card}>
            <MaterialIcons name="contact-page" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>Contact Us</Text>
          </Pressable>
        </Link>
      </View>

      {/* Social Media Icons */}
      <View style={styles.socialContainer}>
        <Animated.View
          style={[styles.iconBox, { transform: [{ scale: iconScale }] }]}
        >
          <Pressable
            onPressIn={handleIconPressIn}
            onPressOut={handleIconPressOut}
            onPress={() =>
              handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)
            }
          >
            <FontAwesome name="youtube-play" size={30} color="#FF0000" />
            <Text style={styles.iconLabel}>YouTube</Text>
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[styles.iconBox, { transform: [{ scale: iconScale }] }]}
        >
          <Pressable
            onPressIn={handleIconPressIn}
            onPressOut={handleIconPressOut}
            onPress={() =>
              handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram)
            }
          >
            <FontAwesome name="instagram" size={30} color="#C13584" />
            <Text style={styles.iconLabel}>Instagram</Text>
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 36,
    fontFamily: "Quicksand-Bold",
    color: "#2F6CD4",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 1,
  },
  subheading: {
    fontSize: 18,
    fontFamily: "Quicksand",
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  cardGroup: {
    marginBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
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
  cardText: {
    fontSize: 18,
    fontFamily: "Quicksand-SemiBold",
    color: "#333",
    marginLeft: 12,
  },
  socialContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 20,
  },
  iconBox: {
    alignItems: "center",
    justifyContent: "center",
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  iconLabel: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Quicksand",
    color: "#666",
  },
});
