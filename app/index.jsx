import { MaterialIcons } from "@expo/vector-icons";
import { View, Text, ScrollView, Animated, StatusBar, RefreshControl, StyleSheet } from "react-native";
import { useState } from "react";
import useFade from "../hooks/useFade";
import { useTheme } from "../theme";
import useSchoolInfo from "../hooks/useSchoolInfo";
import Header from "../components/Header";

import SchoolPhotoCarousel from "../components/SchoolPhotoCarousel";

export default function HomeScreen() {
  const fadeAnim = useFade();
  const { styles, colors, mode } = useTheme();
  const { schoolInfo: SCHOOL, refresh } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[HOME] Refreshing school info...');
      await refresh(true);
      console.log('[HOME] Refreshed successfully');
    } catch (err) {
      console.error('[HOME] Refresh failed:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

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
      <Header title={SCHOOL.name} variant="welcome" />

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
            <MaterialIcons name="info-outline" size={24} color={colors.primary} />
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
