import React from "react";
import { View, Text, Switch, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { useLabel } from "../../context/LabelsContext";
import Card from "../Card";

export default function MenuPreferences({ onOpenPrivacyPolicy }) {
  const { colors, mode, toggle } = useTheme();
  const { t } = useLabel();

  return (
    <View style={localStyles.container}>
      <Text style={[localStyles.sectionTitle, { color: colors.onSurface }]}>
        {t("menu.preferences", "Preferences")}
      </Text>

      <Card
        variant="elevated"
        style={localStyles.card}
        contentStyle={localStyles.cardContent}
      >
        {/* Dark Mode Switch Row */}
        <View style={localStyles.itemRow}>
          <View
            style={[
              localStyles.iconWrap,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <MaterialIcons
              name={mode === "dark" ? "dark-mode" : "light-mode"}
              size={22}
              color={colors.onPrimaryContainer}
            />
          </View>

          <View style={localStyles.textCol}>
            <Text
              style={[localStyles.itemTitle, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {t("menu.darkMode", "Dark Mode")}
            </Text>
            <Text
              style={[
                localStyles.itemSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {mode === "dark"
                ? t("menu.darkModeOnSubtitle", "Easy on the eyes in low light")
                : t("menu.darkModeOffSubtitle", "Crisp and clear high-contrast mode")}
            </Text>
          </View>

          <Switch
            value={mode === "dark"}
            onValueChange={() => {
              Haptics.selectionAsync().catch(() => {});
              toggle();
            }}
            trackColor={{
              false: colors.surfaceContainerHighest,
              true: colors.primary,
            }}
            thumbColor={mode === "dark" ? colors.onPrimary : colors.outline}
          />
        </View>

        <View
          style={[
            localStyles.divider,
            { backgroundColor: colors.outlineVariant || "rgba(0,0,0,0.06)" },
          ]}
        />

        {/* Privacy Policy */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            if (onOpenPrivacyPolicy) onOpenPrivacyPolicy();
          }}
          style={({ pressed }) => [
            localStyles.itemRow,
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
              { backgroundColor: "#8B5CF618" },
            ]}
          >
            <MaterialIcons
              name="privacy-tip"
              size={22}
              color="#8B5CF6"
            />
          </View>

          <View style={localStyles.textCol}>
            <Text
              style={[localStyles.itemTitle, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {t("menu.privacyPolicy", "Privacy Policy")}
            </Text>
            <Text
              style={[
                localStyles.itemSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {t(
                "menu.privacyPolicySubtitle",
                "Data protection & student privacy"
              )}
            </Text>
          </View>

          <MaterialIcons
            name="chevron-right"
            size={20}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
      </Card>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.base,
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
  itemRow: {
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
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: FONT_SIZES.mdLg,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.mdLg,
  },
  itemSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: LINE_HEIGHTS.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 74,
  },
});
