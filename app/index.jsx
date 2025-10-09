// Home screen
import { Link } from "expo-router";
import { FontAwesome, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, Pressable, StatusBar, Linking, ScrollView, Animated, Switch, Platform } from "react-native";
import { useState } from "react";
import { SCHOOL } from "../constants/basic-info";
import { ROUTES } from "../constants/routes";
import useFade from "./hooks/useFade";
import { useTheme } from "../theme";

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
  const _fadeAnim = useFade(0); // no fade, just align API for future
  const [youtubeScale] = useState(new Animated.Value(1));
  const [instagramScale] = useState(new Animated.Value(1));
  const [mapScale] = useState(new Animated.Value(1));

  const animateScale = (scaleRef, toValue) => {
    Animated.spring(scaleRef, { toValue, useNativeDriver: true }).start();
  };

  const { mode, toggle, colors, styles } = useTheme();
  return (
    <ScrollView style={[styles.container, { paddingTop: 10, paddingBottom: 96 }]}> 
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header with inline theme toggle (relative positioning) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginBottom: 12, paddingRight: 12 }}>

        <View style={{ marginLeft: 12, zIndex: 999, elevation: 12 }}>
          <View style={{ backgroundColor: colors.cardBackground || colors.background, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary, fontFamily: "Quicksand", marginRight: 6, fontSize: 12 }}>{mode === "dark" ? "Dark" : "Light"}</Text>
            <Switch value={mode === "dark"} onValueChange={toggle} trackColor={{ false: "#ccc", true: colors.primary }} thumbColor={mode === "dark" ? "#fff" : "#fff"} />
          </View>
        </View>
      </View>
        <Text style={[styles.heading, { flex: 1 }]}>
          Explore <Text style={styles.highlight}>SGV School</Text>
        </Text>

      {/* Main Card Group */}
      <View style={styles.cardGroup}>
        <Link href={ROUTES.ABOUT} asChild>
          <Pressable style={styles.navCard}>
            <MaterialIcons name="info" size={24} color={colors.primary} />
            <Text style={styles.cardText}>About</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.EVENTS} asChild>
          <Pressable style={styles.navCard}>
            <MaterialIcons name="event" size={24} color={colors.primary} />
            <Text style={styles.cardText}>Events</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.NEWS} asChild>
          <Pressable style={styles.navCard}>
            <MaterialCommunityIcons
              name="newspaper"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.cardText}>News</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.CONTACT} asChild>
          <Pressable style={styles.navCard}>
            <MaterialIcons
              name="contact-page"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.cardText}>Contact Us</Text>
          </Pressable>
        </Link>
      </View>

      {/* Social Media Icons */}
      <View style={styles.socialContainer}>
  <Animated.View style={[styles.socialTransformWrapper, { transform: [{ scale: youtubeScale }] }]}>
          <Pressable
            onPressIn={() => animateScale(youtubeScale, 1.1)}
            onPressOut={() => animateScale(youtubeScale, 1)}
            onPress={() =>
              handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)
            }
            style={styles.socialIconWrapper}
          >
            <FontAwesome name="youtube-play" size={30} color="#FF0000" />
            <Text style={styles.iconLabel}>YouTube</Text>
          </Pressable>
        </Animated.View>

  <Animated.View style={[styles.socialTransformWrapper, { transform: [{ scale: instagramScale }] }]}>
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
            <Text style={styles.iconLabel}>Instagram</Text>
          </Pressable>
        </Animated.View>

  <Animated.View style={[styles.socialTransformWrapper, { transform: [{ scale: mapScale }] }]}>
          <Pressable
            onPressIn={() => animateScale(mapScale, 1.1)}
            onPressOut={() => animateScale(mapScale, 1)}
            onPress={() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}
            style={styles.socialIconWrapper}
          >
            <FontAwesome name="map-marker" size={30} color={colors.primary} />
            <Text style={styles.iconLabel}>Map</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* end header */}
    </ScrollView>
  );
}
