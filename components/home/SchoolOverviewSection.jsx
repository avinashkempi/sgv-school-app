import React, { memo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useLabel } from "../../context/LabelsContext";
import HomeModuleContainer from "./HomeModuleContainer";

const SchoolOverviewSection = ({ schoolInfo }) => {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const { t } = useLabel();

  const handlePress = async (appUrl, fallbackUrl) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      if (appUrl) {
        const supported = await Linking.canOpenURL(appUrl);
        if (supported) {
          await Linking.openURL(appUrl);
          return;
        }
      }
      if (fallbackUrl) {
        await Linking.openURL(fallbackUrl);
      }
    } catch (err) {
      console.error("Failed to open link:", err);
      if (fallbackUrl) {
        Linking.openURL(fallbackUrl).catch(() => {});
      }
    }
  };

  const handleCall = () => {
    const rawPhone = (schoolInfo?.phone || "+917760325292").replace(
      /[^0-9+]/g,
      ""
    );
    handlePress(`tel:${rawPhone}`, `tel:${rawPhone}`);
  };

  const handleMap = () => {
    const mangasuliApp =
      Platform.OS === "ios"
        ? "maps:0,0?q=Shri+Guru+Vidya+English+Medium+School,+Mangasuli"
        : schoolInfo?.mapAppUrl ||
          "geo:0,0?q=Shri+Guru+Vidya+English+Medium+School,+Mangasuli";
    handlePress(
      mangasuliApp,
      schoolInfo?.mapUrl || "https://maps.app.goo.gl/CEWEjtVfZHN6aLMp8"
    );
  };

  // Pastel Color Accents
  const mulberryAccent = isDark ? "#EFB8C8" : "#7D5260";

  return (
    <View style={{ marginTop: 2 }}>
      <HomeModuleContainer
        title={t("menu.followUs", "Connect With Us")}
        icon="alternate-email"
        accentColor={mulberryAccent}
        lightBg="rgba(125, 82, 96, 0.035)"
        darkBg="rgba(239, 184, 200, 0.05)"
        lightBorder="rgba(125, 82, 96, 0.12)"
        darkBorder="rgba(239, 184, 200, 0.15)"
      >
        {/* Minimal 1-Row Connect Action Bar: Call, Map, YouTube, Instagram */}
        <View style={localStyles.chipRow}>
          {/* Call */}
          <Pressable
            onPress={handleCall}
            accessibilityRole="button"
            accessibilityLabel="Call school"
            style={({ pressed }) => [
              localStyles.actionChip,
              {
                backgroundColor: isDark
                  ? "rgba(20, 108, 46, 0.18)"
                  : "rgba(20, 108, 46, 0.08)",
                borderColor: isDark
                  ? "rgba(109, 213, 140, 0.2)"
                  : "rgba(20, 108, 46, 0.15)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons
              name="phone"
              size={15}
              color={isDark ? "#6DD58C" : "#146C2E"}
            />
            <Text
              style={[
                localStyles.chipText,
                { color: isDark ? "#6DD58C" : "#146C2E" },
              ]}
            >
              Call
            </Text>
          </Pressable>

          {/* Location / Directions */}
          <Pressable
            onPress={handleMap}
            accessibilityRole="button"
            accessibilityLabel="School location map"
            style={({ pressed }) => [
              localStyles.actionChip,
              {
                backgroundColor: isDark
                  ? "rgba(14, 116, 144, 0.18)"
                  : "rgba(14, 116, 144, 0.08)",
                borderColor: isDark
                  ? "rgba(34, 211, 238, 0.2)"
                  : "rgba(14, 116, 144, 0.15)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons
              name="location-on"
              size={15}
              color={isDark ? "#22D3EE" : "#0E7490"}
            />
            <Text
              style={[
                localStyles.chipText,
                { color: isDark ? "#22D3EE" : "#0E7490" },
              ]}
            >
              Map
            </Text>
          </Pressable>

          {/* YouTube */}
          <Pressable
            onPress={() =>
              handlePress(
                schoolInfo?.socials?.youtubeAppUrl,
                schoolInfo?.socials?.youtube ||
                  "https://www.youtube.com/@SgvSchoolMangasuli"
              )
            }
            accessibilityRole="button"
            accessibilityLabel="SGV YouTube channel"
            style={({ pressed }) => [
              localStyles.actionChip,
              {
                backgroundColor: isDark
                  ? "rgba(255, 0, 0, 0.15)"
                  : "rgba(255, 0, 0, 0.07)",
                borderColor: isDark
                  ? "rgba(255, 0, 0, 0.25)"
                  : "rgba(255, 0, 0, 0.15)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <FontAwesome name="youtube-play" size={14} color="#FF0000" />
            <Text style={[localStyles.chipText, { color: "#E02424" }]}>
              YouTube
            </Text>
          </Pressable>

          {/* Instagram */}
          <Pressable
            onPress={() =>
              handlePress(
                schoolInfo?.socials?.instagramAppUrl,
                schoolInfo?.socials?.instagram ||
                  "https://www.instagram.com/sgv.school"
              )
            }
            accessibilityRole="button"
            accessibilityLabel="SGV Instagram page"
            style={({ pressed }) => [
              localStyles.actionChip,
              {
                backgroundColor: isDark
                  ? "rgba(225, 48, 108, 0.15)"
                  : "rgba(225, 48, 108, 0.07)",
                borderColor: isDark
                  ? "rgba(225, 48, 108, 0.25)"
                  : "rgba(225, 48, 108, 0.15)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <FontAwesome name="instagram" size={14} color="#E1306C" />
            <Text style={[localStyles.chipText, { color: "#E1306C" }]}>
              Instagram
            </Text>
          </Pressable>
        </View>
      </HomeModuleContainer>
    </View>
  );
};

const localStyles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 1,
  },
  actionChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8.5,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    letterSpacing: 0.1,
  },
});

export default memo(SchoolOverviewSection);
