import { MaterialIcons } from "@expo/vector-icons";
import { View, Text, ScrollView, Animated, StatusBar, RefreshControl, } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import useFade from "../hooks/useFade";
import { useTheme } from "../theme";
import useSchoolInfo from "../hooks/useSchoolInfo";
import Header from "../components/Header";

import SchoolPhotoCarousel from "../components/SchoolPhotoCarousel";

import { useToast } from "../components/ToastProvider";

import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import storage from "../utils/storage";



export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useFade();
  const { styles, colors, mode } = useTheme();
  const { schoolInfo: SCHOOL, refresh } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const { data: userData, isError, refetch: refetchUser } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      enabled: true,
      staleTime: Infinity,
      retry: false,
      select: (data) => data.user,
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refresh(true),
        refetchUser()
      ]);
    } catch (err) {
      // Suppress error
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isError) {
      // If we can't fetch user details (likely 401/403), clear session and redirect
      const handleLogout = async () => {
        await storage.multiRemove(['@auth_token', '@auth_user']);
        router.replace('/login');
      };
      handleLogout();
    }
  }, [isError]);



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
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20, // Circle
            backgroundColor: colors.primaryContainer,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }}>
            <MaterialIcons name="apartment" size={24} color={colors.onPrimaryContainer} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Medium", color: colors.onSurface }}>About Us</Text>
        </View>
        <Text style={[styles.text, { marginBottom: 0 }]}>{SCHOOL.about}</Text>
      </Animated.View>

      {/* Branches Section */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.secondaryContainer,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }}>
            <MaterialIcons name="school" size={24} color={colors.onSecondaryContainer} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Medium", color: colors.onSurface }}>Branches</Text>
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
              <Text style={{ fontFamily: "DMSans-Medium", color: colors.onSurface }}>Renuka Nagar, Mangasuli</Text>
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
              <Text style={{ fontFamily: "DMSans-Medium", color: colors.onSurface }}>Ugar Khurd</Text>
              {"\n"}Only Kindergarten.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Mission Section */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.tertiaryContainer,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }}>
            <MaterialIcons name="flag" size={24} color={colors.onTertiaryContainer} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Medium", color: colors.onSurface }}>Our Mission</Text>
        </View>
        <Text style={[styles.text, { marginBottom: 0 }]}>{SCHOOL.mission}</Text>
      </Animated.View>
    </ScrollView>
  );
}
