import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { SCHOOL } from "../../constants/basic-info";
import { useLabel } from "../../context/LabelsContext";
import Button from "../Button";

export default function MenuFooter({ user, onLogoutPress, onLoginPress }) {
  const { colors } = useTheme();
  const { t } = useLabel();

  return (
    <View style={localStyles.container}>
      {/* Logout or Login Primary Button */}
      {user ? (
        <Button
          variant="tonal"
          onPress={onLogoutPress}
          style={{
            backgroundColor: colors.errorContainer,
            marginBottom: 28,
          }}
          textStyle={{
            color: colors.onErrorContainer,
            fontFamily: FONTS.bold,
          }}
          icon="logout"
        >
          {t("common.logOut", "Log Out")}
        </Button>
      ) : (
        <Button
          variant="filled"
          onPress={onLoginPress}
          style={{ marginBottom: 28 }}
          icon="login"
        >
          {t("common.logIn", "Log In")}
        </Button>
      )}

      {/* Brand Identity */}
      <View
        style={[
          localStyles.brandBlock,
          { borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)" },
        ]}
      >
        <View
          style={[
            localStyles.logoContainer,
            {
              backgroundColor: colors.surfaceContainerLowest || "#ffffff",
              borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <Image
            source={require("../../assets/images/icon.png")}
            style={localStyles.logoImage}
            contentFit="contain"
          />
        </View>

        <Text
          style={[localStyles.schoolName, { color: colors.onSurface }]}
          numberOfLines={2}
        >
          {SCHOOL.name || "Shri Guru Vidya English Medium School"}
        </Text>

        <Text
          style={[localStyles.schoolAddress, { color: colors.onSurfaceVariant }]}
          numberOfLines={2}
        >
          Mangasuli • Karnataka, 591316
        </Text>

        <View
          style={[
            localStyles.versionBadge,
            {
              backgroundColor: colors.surfaceContainerHighest,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <Text
            style={[
              localStyles.versionText,
              { color: colors.onSurfaceVariant },
            ]}
          >
            v2.2.0 • Build 2026.08
          </Text>
        </View>

        <Text
          style={[
            localStyles.copyrightText,
            { color: colors.outline || colors.onSurfaceVariant },
          ]}
        >
          © 2026 Shri Guru Vidya Education Society
        </Text>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
  },
  brandBlock: {
    alignItems: "center",
    paddingTop: 24,
    borderTopWidth: 1,
  },
  logoContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  schoolName: {
    fontSize: FONT_SIZES.mdLg,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.mdLg,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  schoolAddress: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.sm,
    marginTop: 4,
    textAlign: "center",
  },
  versionBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  versionText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  copyrightText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.micro,
    marginTop: 8,
    textAlign: "center",
  },
});
