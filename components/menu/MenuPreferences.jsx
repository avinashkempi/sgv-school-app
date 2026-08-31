import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { useLabel } from "../../context/LabelsContext";
import Card from "../Card";

export default function MenuPreferences() {
  const { colors, mode, toggleTheme } = useTheme();
  const { t } = useLabel();

  return (
    <View style={localStyles.container}>
      <Text style={[localStyles.sectionTitle, { color: colors.onSurfaceVariant }]}>
        {t("menu.preferences", "Preferences")}
      </Text>

      <Card
        variant="elevated"
        style={[
          localStyles.card,
          {
            backgroundColor:
              mode === "dark" ? colors.surfaceContainer : "#FFFFFF",
            borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
          },
        ]}
        contentStyle={localStyles.cardContent}
      >
        {/* Dark Mode Toggle */}
        <View style={localStyles.itemRow}>
          <View
            style={[
              localStyles.iconWrap,
              {
                backgroundColor:
                  mode === "dark" ? "#38BDF820" : "#F59E0B20",
              },
            ]}
          >
            <MaterialIcons
              name={mode === "dark" ? "dark-mode" : "light-mode"}
              size={22}
              color={mode === "dark" ? "#38BDF8" : "#F59E0B"}
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
                ? t("menu.darkModeOn", "Enabled for low light")
                : t("menu.darkModeOff", "Disabled (Light theme)")}
            </Text>
          </View>

          <Switch
            value={mode === "dark"}
            onValueChange={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              toggleTheme();
            }}
            trackColor={{
              false: colors.surfaceContainerHighest,
              true: colors.primary,
            }}
            thumbColor={mode === "dark" ? colors.onPrimary : colors.outline}
          />
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
    marginLeft: 74,
  },
});
