// Home screen
import { Link } from "expo-router";
import {
  FontAwesome,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Linking,
  ScrollView,
  Animated,
} from "react-native";
import Header from "./_utils/Header";
import LoginModal from './_utils/LoginModal';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { SCHOOL } from "../constants/basic-info";
import { ROUTES } from "../constants/routes";
import useFade from "./hooks/useFade";
import { useTheme } from "../theme";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // Use refs for Animated.Value so they are not recreated on every render
  const youtubeScale = useRef(new Animated.Value(1));
  const instagramScale = useRef(new Animated.Value(1));
  const mapScale = useRef(new Animated.Value(1));

  // Accept a ref to keep identity stable and avoid recreating animations
  const animateScale = (scaleRef, toValue) => {
    if (!scaleRef || !scaleRef.current) return;
    Animated.spring(scaleRef.current, { toValue, useNativeDriver: true }).start();
  };

  const { mode, colors, styles } = useTheme();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [user, setUser] = useState(null);

  // Load stored user session on app start
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
          const [token, storedUser] = await Promise.all([
            AsyncStorage.getItem('@auth_token'),
            AsyncStorage.getItem('@auth_user')
          ]);
        
          if (token && storedUser) {
            const userData = JSON.parse(storedUser);
            console.log('Found stored user:', userData.username);
            setUser(userData);
          } 
      } catch (e) {
        console.warn('Failed to load stored user session', e);
        setUser(null);
      }
    };
    loadStoredUser();
  }, []); // Run once on mount

  // stable handler to avoid re-renders
  const handleLoginSuccess = useCallback((userObj) => {
    setUser(userObj);
  }, []);

  const openAuthModal = useCallback(() => setAuthModalVisible(true), []);
  const closeAuthModal = useCallback(() => setAuthModalVisible(false), []);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={useMemo(() => ({ paddingTop: 10, paddingBottom: 96 }), [])}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <Header title="Explore SGV School" left={null} />

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
        {/* Social icons memoized to avoid re-renders during transitions */}
        {
          (() => {
            // stable icon elements so props to memoized component don't change
            const youtubeIcon = useMemo(() => (
              <FontAwesome name="youtube-play" size={30} color="#FF0000" />
            ), []);

            const instagramIcon = useMemo(() => (
              <FontAwesome name="instagram" size={30} color="#C13584" />
            ), []);

            const mapIcon = useMemo(() => (
              <FontAwesome name="map-marker" size={30} color={colors.primary} />
            ), [colors.primary]);

            const handleYoutubePress = useCallback(() => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube), []);
            const handleInstagramPress = useCallback(() => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram), []);
            const handleMapPress = useCallback(() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl), []);

            const SocialIcon = memo(({ scaleRef, onPress, iconElement, label }) => {
              return (
                <Animated.View
                  style={[
                    styles.socialTransformWrapper,
                    { transform: [{ scale: scaleRef.current }] },
                  ]}
                >
                  <Pressable
                    onPressIn={() => animateScale(scaleRef, 1.1)}
                    onPressOut={() => animateScale(scaleRef, 1)}
                    onPress={onPress}
                    style={styles.socialIconWrapper}
                  >
                    {iconElement}
                    <Text style={styles.iconLabel}>{label}</Text>
                  </Pressable>
                </Animated.View>
              );
            });

            return (
              <>
                <SocialIcon scaleRef={youtubeScale} onPress={handleYoutubePress} iconElement={youtubeIcon} label="YouTube" />
                <SocialIcon scaleRef={instagramScale} onPress={handleInstagramPress} iconElement={instagramIcon} label="Instagram" />
                <SocialIcon scaleRef={mapScale} onPress={handleMapPress} iconElement={mapIcon} label="Map" />
              </>
            );
          })()
        }
      </View>

      {/* end header */}

      {/* Auth area */}
      <View style={{ padding: 12, alignItems: 'center' }}>
        {user ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.cardText, { marginRight: 12 }]}>Hi, {user.username}</Text>
            <Pressable
              onPress={async () => {
                try {
                  await AsyncStorage.multiRemove(['@auth_token', '@auth_user']);
                  console.log('Logged out, cleared auth data');
                } catch (e) {}
                setUser(null);
              }}
              style={[styles.navCard, { paddingHorizontal: 14 }]}
            >
              <Text style={styles.cardText}>Logout</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setAuthModalVisible(true)}
            style={[styles.navCard, { paddingHorizontal: 20 }]}
          >
            <MaterialIcons name="login" size={20} color={colors.primary} />
            <Text style={[styles.cardText, { marginLeft: 8 }]}>Login / Signup</Text>
          </Pressable>
        )}
      </View>

      <LoginModal
        isVisible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={handleLoginSuccess}
      />
    </ScrollView>
  );
}
