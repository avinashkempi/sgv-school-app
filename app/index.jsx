import { MaterialIcons } from "@expo/vector-icons";
import { View, Text, ScrollView, Animated, StatusBar, RefreshControl,} from "react-native";
import { useState, useEffect } from "react";
import useFade from "../hooks/useFade";
import { useTheme } from "../theme";
import useSchoolInfo from "../hooks/useSchoolInfo";
import Header from "../components/Header";

import SchoolPhotoCarousel from "../components/SchoolPhotoCarousel";

import { useToast } from "../components/ToastProvider";

import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Global variable to track if welcome/latest notification has been shown in this session
let hasShownNotification = false;

export default function HomeScreen() {
  const fadeAnim = useFade();
  const { styles, colors, mode } = useTheme();
  const { schoolInfo: SCHOOL, refresh } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh(true);
    } catch (err) {
      // Suppress error
    } finally {
      setRefreshing(false);
    }
  };

  const { data: userData, isError } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      enabled: true,
      staleTime: Infinity,
      retry: false,
    }
  );

  useEffect(() => {
    if (isError) {
      // If we can't fetch user details (likely 401/403), clear session and redirect
      const handleLogout = async () => {
        await AsyncStorage.multiRemove(['@auth_token', '@auth_user']);
        // Optional: router.replace('/login'); 
        // For now, we just clear storage so the UI reflects logged out state
        // or let the user manually log in again.
      };
      handleLogout();
    }
  }, [isError]);

  const { data: notificationsData } = useApiQuery(
    ['notifications', 'latest'],
    `${apiConfig.baseUrl}/notifications`
  );

  useEffect(() => {
    if (notificationsData && !hasShownNotification && notificationsData.notifications && notificationsData.notifications.length > 0) {
      const latest = notificationsData.notifications[0];
      showToast(latest.message || latest.title || "Welcome back!", "info");
      hasShownNotification = true;
    }
  }, [notificationsData]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPaddingBottom}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Minimalist Header */}
      <Header title={SCHOOL.name} subtitle={userData?.name ? `Welcome, ${userData.name.split(' ')[0]}` : "Welcome"} variant="welcome" />

      {/* School Photo Carousel */}
      <SchoolPhotoCarousel photos={SCHOOL.photoUrl} />

      {/* About Us Section */}
      <Animated.View style={[styles.cardMinimal, { opacity: fadeAnim }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.primary + '15',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }}>
            <MaterialIcons name="apartment" size={24} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>About Us</Text>
        </View>
        <Text style={[styles.text, { marginBottom: 0 }]}>{SCHOOL.about}</Text>
      </Animated.View>

      {/* Branches Section */}
      <Animated.View style={[styles.cardMinimal, { opacity: fadeAnim }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.secondary + '15',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }}>
            <MaterialIcons name="school" size={24} color={colors.secondary} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>Branches</Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.secondary,
              marginTop: 8,
              marginRight: 10
            }} />
            <Text style={[styles.text, { flex: 1, marginBottom: 0 }]}>
              <Text style={{ fontFamily: "DMSans-Bold" }}>Renuka Nagar, Mangasuli</Text>
              {"\n"}Kindergarten to 8th Standard (9th and 10th opening soon).
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.secondary,
              marginTop: 8,
              marginRight: 10
            }} />
            <Text style={[styles.text, { flex: 1, marginBottom: 0 }]}>
              <Text style={{ fontFamily: "DMSans-Bold" }}>Ugar Khurd</Text>
              {"\n"}Only Kindergarten.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Mission Section */}
      <Animated.View style={[styles.cardMinimal, { opacity: fadeAnim }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#FFD700' + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }}>
            <MaterialIcons name="flag" size={24} color="#F59E0B" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>Our Mission</Text>
        </View>
        <Text style={[styles.text, { marginBottom: 0 }]}>{SCHOOL.mission}</Text>
      </Animated.View>
    </ScrollView>
  );
}
