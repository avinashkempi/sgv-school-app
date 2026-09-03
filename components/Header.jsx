import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
} from "../theme";
import { useNotifications } from "../hooks/useNotifications";
import YearSelector from "./academic-year/YearSelector";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
import { useAcademicYear } from "../context/AcademicYearContext";
import { useLabel } from "../context/LabelsContext";
import { formatUserName } from "../utils/userFormatters";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (hour >= 17 && hour < 21) return { text: "Good evening", emoji: "🌇" };
  return { text: "Hello", emoji: "✨" };
};

const parseSchoolName = (rawName) => {
  const name = (rawName || "Shri Guru Vidya English Medium School").trim();
  const sgvMatch = name.match(/^(Shri\s+Guru\s+Vidya)(.*)$/i);
  if (sgvMatch) {
    const primary = "Shri Guru Vidya";
    let secondary = sgvMatch[2].trim();
    if (!secondary) secondary = "English Medium School";
    secondary = secondary.replace(/^[-–•\s]+/, "");
    return { primary, secondary };
  }

  const splitKeywords = [
    "English Medium School",
    "English Medium",
    "High School",
    "Public School",
    "School",
    "Academy",
  ];
  for (const kw of splitKeywords) {
    const idx = name.indexOf(kw);
    if (idx > 0) {
      return {
        primary: name.substring(0, idx).trim(),
        secondary: name.substring(idx).trim(),
      };
    }
  }

  return { primary: name, secondary: "" };
};

const Header = ({
  title,
  subtitle,
  userName,
  userRole: _userRole,
  variant = "default",
  showBack,
  onBack,
  backIcon,
  showNotification,
  showYearSelector,
  rightAction,
  style,
  showLogo = false,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const { selectedYear } = useAcademicYear();
  const { t } = useLabel();

  // Fetch user to check role
  const { data: userData } = useApiQuery(
    ["currentUser"],
    `${apiConfig.baseUrl}/auth/me`,
    {
      staleTime: Infinity,
      select: (data) => data?.user,
    }
  );

  const isSuperAdmin = userData?.role === "super admin";
  const isModal = variant === "modal";
  const isWelcome = variant === "welcome";
  const isRoot = variant === "root";

  // Back button resolution:
  // - On welcome & root: false unless explicitly forced to true
  // - On modal: true by default (renders close button)
  // - On subpage / default: follows showBack prop (defaults to false if not passed)
  const shouldShowBack =
    typeof showBack === "boolean" ? showBack : isModal;

  // Notification resolution:
  // - On welcome & root: true by default
  // - On subpage / modal / default: false by default unless explicitly requested
  const shouldShowNotification =
    typeof showNotification === "boolean"
      ? showNotification
      : isWelcome || isRoot;

  // Year selector resolution:
  // - Only shown if explicitly true OR for super admins on root/welcome
  const shouldShowYearSelector =
    typeof showYearSelector === "boolean"
      ? showYearSelector
      : (isWelcome || isRoot) && isSuperAdmin;

  const greeting = useMemo(() => getGreeting(), []);
  const schoolBrand = useMemo(() => parseSchoolName(title), [title]);
  const isSchoolMentioned = useMemo(() => {
    if (showLogo) return true;
    const tLower = typeof title === "string" ? title.toLowerCase() : "";
    const sLower = typeof subtitle === "string" ? subtitle.toLowerCase() : "";
    return (
      tLower.includes("shri guru vidya") ||
      tLower.includes("sgv school") ||
      sLower.includes("shri guru vidya") ||
      sLower.includes("sgv school")
    );
  }, [title, subtitle, showLogo]);

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push("/notifications");
  };

  // ═════════════════════════════════════════════════════════════════════════
  // VARIANT: "welcome" - Hero App Bar on Home
  // ═════════════════════════════════════════════════════════════════════════
  if (isWelcome) {
    const rawUserName = userName || userData?.name;
    const effectiveUserName = formatUserName(rawUserName);
    const firstName = effectiveUserName
      ? effectiveUserName.trim().split(" ")[0]
      : null;

    return (
      <View style={[styles.welcomeContainer, style]}>
        {/* Top Header Row: School Branding + Right Actions */}
        <View style={styles.topRow}>
          {/* School Branding */}
          <View style={styles.brandContainer}>
            <View
              style={[
                styles.logoBox,
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
            <View style={styles.titleColumn}>
              <Text
                style={[styles.brandPrimary, { color: colors.onBackground }]}
                numberOfLines={1}
              >
                {schoolBrand.primary || "Shri Guru Vidya"}
              </Text>
              <Text
                style={[styles.brandSecondary, { color: colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {schoolBrand.secondary || "English Medium School"}
              </Text>
            </View>
          </View>

          {/* Right Action Icons */}
          <View style={styles.rightActionRow}>
            {shouldShowYearSelector && <YearSelector compact={true} />}

            {/* Notification Bell */}
            {shouldShowNotification && (
              <NotificationBellButton
                unreadCount={unreadCount}
                onPress={handleNotificationPress}
                colors={colors}
                t={t}
              />
            )}

            {rightAction}
          </View>
        </View>

        {/* Bottom Row: Personalized User Greeting */}
        <View style={styles.welcomeGreetingRow}>
          <Text
            style={[styles.greetingText, { color: colors.onBackground }]}
            numberOfLines={1}
          >
            {firstName
              ? `${greeting.text}, ${firstName} ${greeting.emoji}`
              : `Welcome to SGV ${greeting.emoji}`}
          </Text>
          <Text
            style={[styles.greetingDate, { color: colors.onSurfaceVariant }]}
          >
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VARIANT: "root", "subpage", "modal", "default"
  // ═════════════════════════════════════════════════════════════════════════
  const resolvedBackIcon = backIcon || (isModal ? "close" : "arrow-back");

  return (
    <View style={[styles.standardContainer, style]}>
      {/* Left side: Back / Close button + Title block */}
      <View style={styles.leftContainer}>
        {shouldShowBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isModal ? t("header.close", "Close") : t("header.goBack", "Go back")}
            onPress={handleBackPress}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: pressed
                  ? colors.surfaceContainerHighest || "rgba(0,0,0,0.06)"
                  : "transparent",
              },
            ]}
          >
            <MaterialIcons
              name={resolvedBackIcon}
              size={24}
              color={colors.onSurface}
            />
          </Pressable>
        )}

        <View style={styles.titleWrapper}>
          {isSchoolMentioned && !shouldShowBack ? (
            <View style={styles.brandTitleRow}>
              <View
                style={[
                  styles.smallLogoBox,
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
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.standardTitle,
                    { color: colors.onBackground },
                    isRoot && styles.rootTitle,
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle && (
                  <Text
                    style={[
                      styles.standardSubtitle,
                      { color: colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.standardTitle,
                  { color: colors.onBackground },
                  isRoot && styles.rootTitle,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={[
                    styles.standardSubtitle,
                    { color: colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {/* Right side: Actions (Custom action, Year Selector, Notification Bell) */}
      <View style={styles.rightActionRow}>
        {shouldShowYearSelector && (
          isSuperAdmin ? (
            <YearSelector compact={true} />
          ) : (
            selectedYear && (
              <View
                style={[
                  styles.yearPill,
                  {
                    backgroundColor: selectedYear.isActive
                      ? (colors.primaryContainer ? colors.primaryContainer + "70" : colors.primary + "18")
                      : (colors.surfaceContainerHigh || "#f0f0f0"),
                    borderColor: selectedYear.isActive
                      ? colors.primary + "30"
                      : colors.outlineVariant || "rgba(0,0,0,0.12)",
                  },
                ]}
              >
                <MaterialIcons
                  name={selectedYear.isActive ? "school" : "history"}
                  size={13}
                  color={
                    selectedYear.isActive
                      ? colors.primary
                      : colors.onSurfaceVariant
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.yearPillText,
                    {
                      color: selectedYear.isActive
                        ? colors.onSurface
                        : colors.onSurfaceVariant,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {selectedYear.name}
                </Text>
              </View>
            )
          )
        )}

        {rightAction}

        {shouldShowNotification && (
          <NotificationBellButton
            unreadCount={unreadCount}
            onPress={handleNotificationPress}
            colors={colors}
            t={t}
          />
        )}
      </View>
    </View>
  );
};

// Reusable Notification Bell Icon Button
const NotificationBellButton = ({ unreadCount, onPress, colors, t }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={t("header.notifications", "Notifications")}
    onPress={onPress}
    hitSlop={8}
    style={({ pressed }) => [
      styles.iconButton,
      {
        backgroundColor: pressed
          ? colors.surfaceContainerHighest || "rgba(0,0,0,0.06)"
          : "transparent",
      },
    ]}
  >
    <MaterialIcons
      name={unreadCount > 0 ? "notifications-active" : "notifications-none"}
      size={24}
      color={unreadCount > 0 ? colors.primary : colors.onSurfaceVariant}
    />
    {unreadCount > 0 && (
      <View
        style={[
          styles.badgeDot,
          {
            backgroundColor: colors.error,
            borderColor: colors.background,
          },
        ]}
      >
        <Text
          style={[styles.badgeText, { color: colors.onError || "#ffffff" }]}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Text>
      </View>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  welcomeContainer: {
    paddingTop: SPACING.xs || 4,
    paddingBottom: SPACING.md || 14,
    marginBottom: SPACING.xs || 4,
  },
  standardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
    marginBottom: SPACING.lg || 16,
    gap: SPACING.md || 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm || 8,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md || 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm || 10,
    borderWidth: 1,
    padding: 2,
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  smallLogoBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm || 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm || 8,
    borderWidth: 1,
    padding: 2,
    flexShrink: 0,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.sm || 8,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  brandPrimary: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.3,
  },
  brandSecondary: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    marginTop: -1,
  },
  welcomeGreetingRow: {
    marginTop: SPACING.xl || 20,
    marginBottom: SPACING.xs || 4,
  },
  greetingText: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    letterSpacing: -0.5,
  },
  greetingDate: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  leftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  titleWrapper: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  standardTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
  rootTitle: {
    fontSize: FONT_SIZES.xl,
    letterSpacing: -0.4,
  },
  standardSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full || 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.xs || 6,
    marginLeft: -(SPACING.xs || 6),
    position: "relative",
  },
  rightActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm || 8,
    flexShrink: 0,
  },
  yearPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    maxWidth: 130,
  },
  yearPillText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
    flexShrink: 1,
  },
  badgeDot: {
    position: "absolute",
    right: 4,
    top: 4,
    borderRadius: RADIUS.sm || 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: FONT_SIZES.micro || 9,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
});

export default React.memo(Header);
