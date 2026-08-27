import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import Card from "../Card";
import UserAvatar from "../ui/UserAvatar";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../../utils/userFormatters";
import { useAcademicYear } from "../../context/AcademicYearContext";
import { useLabel } from "../../context/LabelsContext";

export default function MenuHeroProfile({ user }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { selectedYear } = useAcademicYear() || {};
  const { t } = useLabel();

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push("/profile");
  };

  const handleLoginPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push("/login");
  };

  if (!user) {
    return (
      <Card
        variant="elevated"
        style={localStyles.guestCard}
        contentStyle={localStyles.guestCardContent}
      >
        <View style={localStyles.guestHeaderRow}>
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
          <View style={{ flex: 1 }}>
            <Text
              style={[
                localStyles.guestTitle,
                { color: colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {t("menu.guestWelcomeTitle", "Welcome to SGV School")}
            </Text>
            <Text
              style={[
                localStyles.guestSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
              numberOfLines={2}
            >
              {t(
                "menu.guestWelcomeSubtitle",
                "Sign in to access personal timetable, attendance, marks & fee details."
              )}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleLoginPress}
          style={({ pressed }) => [
            localStyles.loginButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <MaterialIcons name="login" size={18} color={colors.onPrimary} />
          <Text
            style={[
              localStyles.loginButtonText,
              { color: colors.onPrimary },
            ]}
          >
            {t("common.signIn", "Sign In to School Portal")}
          </Text>
          <MaterialIcons
            name="arrow-forward"
            size={16}
            color={colors.onPrimary}
          />
        </Pressable>
      </Card>
    );
  }

  // Get role tint color
  const getRoleColor = (role) => {
    switch (role) {
      case "super admin":
        return colors.roleSuperAdmin || "#B3261E";
      case "admin":
        return colors.roleAdmin || "#146C2E";
      case "teacher":
      case "staff":
        return colors.roleStaff || colors.primary;
      case "student":
        return colors.roleStudent || "#E27200";
      default:
        return colors.primary;
    }
  };

  const roleColor = getRoleColor(user.role);

  return (
    <Card
      variant="elevated"
      onPress={handleProfilePress}
      style={localStyles.userCard}
      contentStyle={localStyles.userCardContent}
    >
      <View style={localStyles.topRow}>
        <UserAvatar
          photoUrl={user.profilePhoto}
          name={formatUserName(user.name)}
          role={user.role}
          size={58}
          showBorder
          borderColor={roleColor + "55"}
        />

        <View style={localStyles.infoCol}>
          <View style={localStyles.nameRow}>
            <Text
              style={[
                localStyles.userName,
                { color: colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {formatUserName(user.name)}
            </Text>
          </View>

          <View style={localStyles.badgeRow}>
            <View
              style={[
                localStyles.roleBadge,
                { backgroundColor: roleColor + "18" },
              ]}
            >
              <Text
                style={[
                  localStyles.roleBadgeText,
                  { color: roleColor },
                ]}
                numberOfLines={1}
              >
                {formatUserDesignationOrRole(user)}
              </Text>
            </View>

            {selectedYear?.name && (
              <View
                style={[
                  localStyles.yearBadge,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={10}
                  color={colors.onSurfaceVariant}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    localStyles.yearBadgeText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {selectedYear.name}
                </Text>
              </View>
            )}
          </View>

          {/* Student Class or Additional Info */}
          {user.role === "student" && (user.classId?.name || user.className) && (
            <Text
              style={[
                localStyles.classText,
                { color: colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              Class: {user.classId?.name || user.className}
              {user.rollNo ? ` • Roll: ${user.rollNo}` : ""}
            </Text>
          )}
        </View>

        <View
          style={[
            localStyles.chevronContainer,
            { backgroundColor: colors.surfaceContainerHighest },
          ]}
        >
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.onSurfaceVariant}
          />
        </View>
      </View>

      <View
        style={[
          localStyles.divider,
          { backgroundColor: colors.outlineVariant || "rgba(0,0,0,0.06)" },
        ]}
      />

      <View style={localStyles.bottomActionRow}>
        <View style={localStyles.leftMeta}>
          <MaterialIcons
            name="verified-user"
            size={14}
            color={colors.primary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              localStyles.verifiedText,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {user.phone || user.phoneNumber
              ? `Phone: ${user.phone || user.phoneNumber}`
              : "Verified SGV Account"}
          </Text>
        </View>

        <View style={localStyles.profilePill}>
          <Text style={[localStyles.profilePillText, { color: colors.primary }]}>
            {t("menu.viewProfile", "View Profile")}
          </Text>
          <MaterialIcons
            name="arrow-forward"
            size={13}
            color={colors.primary}
            style={{ marginLeft: 2 }}
          />
        </View>
      </View>
    </Card>
  );
}

const localStyles = StyleSheet.create({
  guestCard: {
    marginBottom: 16,
    borderRadius: 20,
  },
  guestCardContent: {
    padding: 16,
  },
  guestHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    padding: 4,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  guestTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    marginBottom: 3,
  },
  guestSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.sm,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  loginButtonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  userCard: {
    marginBottom: 16,
    borderRadius: 20,
  },
  userCardContent: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.lg,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  yearBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  yearBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
  },
  classText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  chevronContainer: {
    borderRadius: 18,
    padding: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  bottomActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftMeta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  verifiedText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePillText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});
