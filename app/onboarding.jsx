import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme, FONTS, FONT_SIZES, RADIUS, SPACING } from "../theme";
import storage from "../utils/storage";

// Components
import OnboardingPage from "../components/onboarding/OnboardingPage";
import OnboardingPagination from "../components/onboarding/OnboardingPagination";
import Button from "../components/Button";

const ONBOARDING_SLIDES = [
  {
    badge: "SGV ECOSYSTEM",
    title: "Welcome to SGV Campus",
    subtitle:
      "A modern, connected digital campus platform designed specifically for students, teachers, and parents.",
    icon: "school",
    accentColor: "#2F6CD4", // SGV Brand Blue
    highlights: [
      "Real-time academic records & timetables",
      "Unified school management workflows",
      "Personalized dashboards for each role",
    ],
  },
  {
    badge: "ACADEMICS",
    title: "Smart Academic Tracking",
    subtitle:
      "Stay ahead with live exam schedules, subject-wise progress, interactive report cards, and attendance trends.",
    icon: "insights",
    accentColor: "#2F6CD4", // SGV Brand Blue
    highlights: [
      "Term-wise marksheets & grading",
      "Daily class timetables & room alerts",
      "Visual attendance analytics & trends",
    ],
  },
  {
    badge: "CAMPUS LIFE",
    title: "Campus Vibes & Moments",
    subtitle:
      "Experience campus life together. Celebrate sports, cultural days, school events, and student achievements in the Vibes feed.",
    icon: "auto-awesome",
    accentColor: "#8B5CF6", // Accent Violet
    highlights: [
      "Curated school event highlights",
      "Photo stories and student achievements",
      "Engaging community announcements",
    ],
  },
  {
    badge: "CONNECTED",
    title: "Instant Alerts & Support",
    subtitle:
      "Never miss an important update. Get instant notifications for circulars, leaves, and fee receipts right on your device.",
    icon: "notifications-active",
    accentColor: "#10B981", // Success Green
    highlights: [
      "Priority push notifications for circulars",
      "Direct leave applications & grievance desk",
      "Transparent fee tracking & receipt history",
    ],
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const router = useRouter();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (e) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      if (index !== activeIndex && index >= 0 && index < ONBOARDING_SLIDES.length) {
        setActiveIndex(index);
      }
    },
    [activeIndex, width]
  );

  const handleFinish = async (skipped = false) => {
    try {
      Haptics.notificationAsync(
        skipped
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
      await storage.setItem("@onboarding_complete", "true");
    } catch (e) {
      console.warn("Failed to set onboarding flag:", e);
    }
    router.replace("/login");
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setActiveIndex(nextIndex);
    } else {
      handleFinish(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex > 0) {
      const prevIndex = activeIndex - 1;
      scrollRef.current?.scrollTo({ x: prevIndex * width, animated: true });
      setActiveIndex(prevIndex);
    }
  };

  const isLastSlide = activeIndex === ONBOARDING_SLIDES.length - 1;
  const currentAccent = ONBOARDING_SLIDES[activeIndex]?.accentColor || colors.primary;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: colors.surfaceContainerLowest || "#ffffff",
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: colors.onBackground }]}>
              SGV School
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.onSurfaceVariant }]}>
              Digital Campus
            </Text>
          </View>
        </View>

        {!isLastSlide ? (
          <TouchableOpacity
            onPress={() => handleFinish(true)}
            style={[
              styles.skipButton,
              {
                backgroundColor: colors.surfaceContainerLow || "rgba(0,0,0,0.04)",
                borderColor: colors.outlineVariant + "40",
              },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.onSurfaceVariant }]}>
              Skip
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {/* Paging ScrollView */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {ONBOARDING_SLIDES.map((slide, idx) => (
          <OnboardingPage key={idx} item={slide} width={width} />
        ))}
      </ScrollView>

      {/* Footer Controls */}
      <View style={styles.footer}>
        <View style={styles.paginationRow}>
          <OnboardingPagination
            total={ONBOARDING_SLIDES.length}
            activeIndex={activeIndex}
            activeColor={currentAccent}
          />
        </View>

        <View style={styles.buttonRow}>
          {activeIndex > 0 ? (
            <TouchableOpacity
              onPress={handleBack}
              style={[
                styles.backButton,
                {
                  borderColor: colors.outlineVariant || "rgba(0,0,0,0.12)",
                  backgroundColor: colors.surfaceContainerLow || colors.surface,
                },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={colors.onSurface}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48 }} />
          )}

          <View style={styles.primaryButtonWrapper}>
            <Button
              onPress={handleNext}
              variant="filled"
              size="lg"
              fullWidth
              style={
                isLastSlide
                  ? { backgroundColor: colors.primary || "#2F6CD4" }
                  : { backgroundColor: currentAccent }
              }
              icon={
                <MaterialIcons
                  name={isLastSlide ? "check" : "arrow-forward"}
                  size={18}
                  color="#FFFFFF"
                />
              }
            >
              {isLastSlide ? "Get Started" : "Continue"}
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl || 20,
    paddingTop: SPACING.sm || 8,
    paddingBottom: SPACING.sm || 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.sm || 6,
  },
  brandTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm || 14,
    lineHeight: 18,
  },
  brandSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full || 999,
    borderWidth: 1,
  },
  skipText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs || 12,
  },
  carousel: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: SPACING.xl || 24,
    paddingBottom: SPACING.lg || 16,
    gap: SPACING.lg || 18,
  },
  paginationRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md || 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonWrapper: {
    flex: 1,
  },
});
