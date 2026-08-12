import { MaterialIcons } from "@expo/vector-icons";
import { View, Text, ScrollView, StatusBar, RefreshControl, } from "react-native";
import Animated from "react-native-reanimated";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import useFade from "../hooks/useFade";
import { useTheme } from "../theme";
import useSchoolInfo from "../hooks/useSchoolInfo";
import Header from "../components/Header";
import Card from "../components/Card";
import SchoolPhotoCarousel from "../components/SchoolPhotoCarousel";
import { useToast } from "../components/ToastProvider";
import { useNetworkStatus } from "../components/NetworkStatusProvider";
import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

import AdminDashboard from "../components/dashboard/AdminDashboard";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";

export default function HomeScreen() {
  // eslint-disable-next-line no-unused-vars
  const router = useRouter();
  const fadeStyle = useFade();
  const { styles, colors, mode } = useTheme();
  const { schoolInfo: SCHOOL, refresh } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const { showToast } = useToast();
  // eslint-disable-next-line no-unused-vars
  const { isConnected } = useNetworkStatus();
  const { updateUser, isAuthenticated } = useAuth();

  // eslint-disable-next-line no-unused-vars
  const { data: userData, isError, error, refetch: refetchUser } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      ...CACHE_TIERS.STABLE,
      enabled: isAuthenticated,
      retry: false,
      select: (data) => data.user,
    }
  );

  // Guard: skip redundant updateUser calls to avoid full-tree context re-renders
  const lastUserIdRef = useRef(null);
  useEffect(() => {
    if (userData && userData._id !== lastUserIdRef.current) {
      lastUserIdRef.current = userData._id;
      updateUser(userData);
    }
  }, [userData, updateUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refresh(true),
        refetchUser()
      ]);
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Suppress error
    } finally {
      setRefreshing(false);
    }
  };

  // Auth errors (401) are handled globally by queryClient.QueryCache.onError
  // No need for duplicate handling here — it caused double-logout race conditions

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.contentPaddingBottom, { paddingHorizontal: 16, paddingTop: 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Large M3 Header */}
      <Header
        title={SCHOOL.name}
        subtitle={userData?.name ? `Welcome, ${userData.name.split(' ')[0]}` : "Welcome"}
        variant="welcome"
      />

      {/* School Photo Carousel - Keep as is, looks good */}
      <SchoolPhotoCarousel photos={SCHOOL.photoUrl} />

      {/* Role Based Dashboard */}
      <View style={{ marginBottom: 16 }}>
        {userData?.role === 'admin' || userData?.role === 'super admin' ? (
          <AdminDashboard />
        ) : userData?.role === 'teacher' ? (
          <TeacherDashboard />
        ) : userData?.role === 'student' ? (
          <StudentDashboard />
        ) : null}
      </View>

      {/* About Us Section */}
      <Animated.View style={fadeStyle}>
        <Card variant="filled">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primaryContainer,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12
            }}>
              <MaterialIcons name="apartment" size={24} color={colors.onPrimaryContainer} />
            </View>
            <Text style={[styles.titleLarge, { marginBottom: 0 }]}>
              About Us
            </Text>
          </View>
          <Text style={[styles.bodyLarge, { marginBottom: 0 }]}>{SCHOOL.about}</Text>
        </Card>
      </Animated.View>

      {/* Branches Section */}
      <Animated.View style={fadeStyle}>
        <Card variant="filled">
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
            <Text style={[styles.titleLarge, { marginBottom: 0 }]}>
              Branches
            </Text>
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
              <Text style={[styles.bodyLarge, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.titleMedium}>Renuka Nagar, Mangasuli</Text>
                {"\n"}Kindergarten to 10th Standard.
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
              <Text style={[styles.bodyLarge, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.titleMedium}>Meenatai Nagar, Ugar Khurd</Text>
                {"\n"}Kindergarten.
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Mission Section */}
      <Animated.View style={fadeStyle}>
        <Card variant="filled">
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
            <Text style={[styles.titleLarge, { marginBottom: 0 }]}>
              Our Mission
            </Text>
          </View>
          <Text style={[styles.bodyLarge, { marginBottom: 0 }]}>{SCHOOL.mission}</Text>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}
