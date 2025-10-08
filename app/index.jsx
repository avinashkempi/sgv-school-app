// Home screen
import { Link } from "expo-router";
import { FontAwesome, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, Pressable, StatusBar, Linking, ScrollView, Animated } from "react-native";
import { useState } from "react";
import { SCHOOL } from "../constants/basic-info";
import { ROUTES } from "../constants/routes";
import { globalStyles, COLORS } from "../globalStyles";
import useFade from "./hooks/useFade";

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

  return (
    <ScrollView style={[globalStyles.container, { paddingTop: 60 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Welcome Header */}
      <Text style={globalStyles.heading}>
        Explore <Text style={globalStyles.highlight}>SGV School</Text>
      </Text>

      {/* Main Card Group */}
      <View style={globalStyles.cardGroup}>
        <Link href={ROUTES.ABOUT} asChild>
          <Pressable style={globalStyles.navCard}>
            <MaterialIcons name="info" size={24} color={COLORS.primary} />
            <Text style={globalStyles.cardText}>About</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.EVENTS} asChild>
          <Pressable style={globalStyles.navCard}>
            <MaterialIcons name="event" size={24} color={COLORS.primary} />
            <Text style={globalStyles.cardText}>Events</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.NEWS} asChild>
          <Pressable style={globalStyles.navCard}>
            <MaterialCommunityIcons
              name="newspaper"
              size={24}
              color={COLORS.primary}
            />
            <Text style={globalStyles.cardText}>News</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.CONTACT} asChild>
          <Pressable style={globalStyles.navCard}>
            <MaterialIcons
              name="contact-page"
              size={24}
              color={COLORS.primary}
            />
            <Text style={globalStyles.cardText}>Contact Us</Text>
          </Pressable>
        </Link>
      </View>

      {/* Social Media Icons */}
      <View style={globalStyles.socialContainer}>
  <Animated.View style={[globalStyles.socialTransformWrapper, { transform: [{ scale: youtubeScale }] }]}>
          <Pressable
            onPressIn={() => animateScale(youtubeScale, 1.1)}
            onPressOut={() => animateScale(youtubeScale, 1)}
            onPress={() =>
              handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)
            }
            style={globalStyles.socialIconWrapper}
          >
            <FontAwesome name="youtube-play" size={30} color="#FF0000" />
            <Text style={globalStyles.iconLabel}>YouTube</Text>
          </Pressable>
        </Animated.View>

  <Animated.View style={[globalStyles.socialTransformWrapper, { transform: [{ scale: instagramScale }] }]}>
          <Pressable
            onPressIn={() => animateScale(instagramScale, 1.1)}
            onPressOut={() => animateScale(instagramScale, 1)}
            onPress={() =>
              handlePress(
                SCHOOL.socials.instagramAppUrl,
                SCHOOL.socials.instagram
              )
            }
            style={globalStyles.socialIconWrapper}
          >
            <FontAwesome name="instagram" size={30} color="#C13584" />
            <Text style={globalStyles.iconLabel}>Instagram</Text>
          </Pressable>
        </Animated.View>

  <Animated.View style={[globalStyles.socialTransformWrapper, { transform: [{ scale: mapScale }] }]}>
          <Pressable
            onPressIn={() => animateScale(mapScale, 1.1)}
            onPressOut={() => animateScale(mapScale, 1)}
            onPress={() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}
            style={globalStyles.socialIconWrapper}
          >
            <FontAwesome name="map-marker" size={30} color={COLORS.primary} />
            <Text style={globalStyles.iconLabel}>Map</Text>
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
