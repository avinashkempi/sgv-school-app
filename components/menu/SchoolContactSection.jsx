import React from "react";
import { View, Text, Pressable, StyleSheet, Linking, Platform } from "react-native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { SCHOOL } from "../../constants/basic-info";
import { useLabel } from "../../context/LabelsContext";
import Card from "../Card";

export default function SchoolContactSection({ onOpenAbout }) {
  const { colors } = useTheme();
  const { t } = useLabel();

  const handleLinkPress = async (appUrl, fallbackUrl) => {
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
      console.warn("Failed to open URL:", err);
      if (fallbackUrl) {
        Linking.openURL(fallbackUrl).catch(() => {});
      }
    }
  };

  const handleCallPress = () => {
    const rawNumber = (SCHOOL.phone || "+917760325292").replace(/[^0-9+]/g, "");
    handleLinkPress(`tel:${rawNumber}`, `tel:${rawNumber}`);
  };

  const handleEmailPress = () => {
    const email = SCHOOL.email || "sgvrss@gmail.com";
    handleLinkPress(`mailto:${email}`, `mailto:${email}`);
  };

  const handleMapPress = () => {
    const mapApp =
      Platform.OS === "ios"
        ? `maps:0,0?q=Shri+Guru+Vidya+English+Medium+School,+Mangasuli`
        : SCHOOL.mapAppUrl || "geo:0,0?q=Shri+Guru+Vidya+English+Medium+School,+Mangasuli";
    handleLinkPress(mapApp, SCHOOL.mapUrl);
  };

  return (
    <View style={localStyles.container}>
      <Text style={[localStyles.sectionTitle, { color: colors.onSurface }]}>
        {t("menu.schoolInfo", "School & Connect")}
      </Text>

      <Card
        variant="elevated"
        style={localStyles.card}
        contentStyle={localStyles.cardContent}
      >
        {/* About SGV School Row */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            if (onOpenAbout) onOpenAbout();
          }}
          style={({ pressed }) => [
            localStyles.aboutRow,
            {
              backgroundColor: pressed
                ? colors.surfaceContainerHighest
                : "transparent",
            },
          ]}
          android_ripple={{ color: colors.onSurface + "10" }}
        >
          <View
            style={[
              localStyles.iconWrap,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <MaterialIcons
              name="school"
              size={22}
              color={colors.onPrimaryContainer}
            />
          </View>
          <View style={localStyles.aboutTextCol}>
            <Text
              style={[localStyles.itemTitle, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {t("menu.aboutSchool", "About SGV School")}
            </Text>
            <Text
              style={[
                localStyles.itemSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {t(
                "menu.aboutSchoolSubtitle",
                "Mission, vision, branches & history"
              )}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={colors.onSurfaceVariant}
          />
        </Pressable>

        <View
          style={[
            localStyles.divider,
            { backgroundColor: colors.outlineVariant || "rgba(0,0,0,0.06)" },
          ]}
        />

        {/* 5 Quick Connect Buttons */}
        <View style={localStyles.connectRow}>
          {/* Call */}
          <Pressable
            onPress={handleCallPress}
            style={({ pressed }) => [
              localStyles.connectBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                localStyles.connectCircle,
                { backgroundColor: "#10B98118" },
              ]}
            >
              <MaterialIcons name="phone" size={22} color="#10B981" />
            </View>
            <Text
              style={[
                localStyles.connectLabel,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Call
            </Text>
          </Pressable>

          {/* Email */}
          <Pressable
            onPress={handleEmailPress}
            style={({ pressed }) => [
              localStyles.connectBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                localStyles.connectCircle,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <MaterialIcons name="email" size={22} color={colors.primary} />
            </View>
            <Text
              style={[
                localStyles.connectLabel,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Email
            </Text>
          </Pressable>

          {/* Map */}
          <Pressable
            onPress={handleMapPress}
            style={({ pressed }) => [
              localStyles.connectBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                localStyles.connectCircle,
                { backgroundColor: "#3B82F618" },
              ]}
            >
              <MaterialIcons name="location-on" size={22} color="#3B82F6" />
            </View>
            <Text
              style={[
                localStyles.connectLabel,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Map
            </Text>
          </Pressable>

          {/* YouTube */}
          <Pressable
            onPress={() =>
              handleLinkPress(
                SCHOOL.socials?.youtubeAppUrl,
                SCHOOL.socials?.youtube
              )
            }
            style={({ pressed }) => [
              localStyles.connectBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                localStyles.connectCircle,
                { backgroundColor: "#FF000015" },
              ]}
            >
              <FontAwesome name="youtube-play" size={20} color="#FF0000" />
            </View>
            <Text
              style={[
                localStyles.connectLabel,
                { color: colors.onSurfaceVariant },
              ]}
            >
              YouTube
            </Text>
          </Pressable>

          {/* Instagram */}
          <Pressable
            onPress={() =>
              handleLinkPress(
                SCHOOL.socials?.instagramAppUrl,
                SCHOOL.socials?.instagram
              )
            }
            style={({ pressed }) => [
              localStyles.connectBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                localStyles.connectCircle,
                { backgroundColor: "#E1306C15" },
              ]}
            >
              <FontAwesome name="instagram" size={20} color="#E1306C" />
            </View>
            <Text
              style={[
                localStyles.connectLabel,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Instagram
            </Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.sm,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 20,
    marginBottom: 0,
    overflow: "hidden",
  },
  cardContent: {
    padding: 0,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutTextCol: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.md,
  },
  itemSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: LINE_HEIGHTS.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  connectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  connectBtn: {
    alignItems: "center",
    gap: 6,
  },
  connectCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  connectLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    lineHeight: LINE_HEIGHTS.xs,
  },
});
