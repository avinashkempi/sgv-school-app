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
import { globalStyles, COLORS } from "../globalStyles";

const handlePress = async (appUrl, fallbackUrl) => {
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
  const [youtubeScale] = useState(new Animated.Value(1));
  const [instagramScale] = useState(new Animated.Value(1));
  const [mapScale] = useState(new Animated.Value(1));

  const animateScale = (scaleRef, toValue) => {
    Animated.spring(scaleRef, {
      toValue,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ScrollView style={[globalStyles.container, { paddingTop: 60 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Welcome Header */}
      <Text style={styles.heading}>
        Explore <Text style={styles.highlight}>SGV School</Text>
      </Text>

      {/* Main Card Group */}
      <View style={styles.cardGroup}>
        <Link href={ROUTES.ABOUT} asChild>
          <Pressable style={styles.navCard}>
            <MaterialIcons name="info" size={24} color={COLORS.primary} />
            <Text style={styles.cardText}>About</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.EVENTS} asChild>
          <Pressable style={styles.navCard}>
            <MaterialIcons name="event" size={24} color={COLORS.primary} />
            <Text style={styles.cardText}>Events</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.NEWS} asChild>
          <Pressable style={styles.navCard}>
            <MaterialCommunityIcons
              name="newspaper"
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.cardText}>News</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.CONTACT} asChild>
          <Pressable style={styles.navCard}>
            <MaterialIcons
              name="contact-page"
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.cardText}>Contact Us</Text>
          </Pressable>
        </Link>
      </View>

      {/* Social Media Icons */}
      <View style={styles.socialContainer}>
        <Animated.View style={{ transform: [{ scale: youtubeScale }] }}>
          <Pressable
            onPressIn={() => animateScale(youtubeScale, 1.1)}
            onPressOut={() => animateScale(youtubeScale, 1)}
            onPress={() =>
              handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)
            }
            style={styles.socialIconWrapper}
          >
            <FontAwesome name="youtube-play" size={30} color="#FF0000" />
            <Text style={globalStyles.iconLabel}>YouTube</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: instagramScale }] }}>
          <Pressable
            onPressIn={() => animateScale(instagramScale, 1.1)}
            onPressOut={() => animateScale(instagramScale, 1)}
            onPress={() =>
              handlePress(
                SCHOOL.socials.instagramAppUrl,
                SCHOOL.socials.instagram
              )
            }
            style={styles.socialIconWrapper}
          >
            <FontAwesome name="instagram" size={30} color="#C13584" />
            <Text style={globalStyles.iconLabel}>Instagram</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: mapScale }] }}>
          <Pressable
            onPressIn={() => animateScale(mapScale, 1.1)}
            onPressOut={() => animateScale(mapScale, 1)}
            onPress={() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}
            style={styles.socialIconWrapper}
          >
            <FontAwesome name="map-marker" size={30} color={COLORS.primary} />
            <Text style={globalStyles.iconLabel}>Map</Text>
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 36,
    fontFamily: "Quicksand",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1,
  },
  cardGroup: {
    marginBottom: 40,
  },
  navCard: {
    ...globalStyles.card,
    flexDirection: "row",
    alignItems: "center",
  },
  cardText: {
    fontSize: 18,
    fontFamily: "Quicksand-SemiBold",
    color: "#333",
    marginLeft: 12,
  },
  iconBox: {
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
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
  socialContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 20,
  },
  socialIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  highlight: {
    fontFamily: "Quicksand-Bold", // or another variant
  },
});
