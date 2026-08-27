import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import { useNotifications } from "../hooks/useNotifications";
import YearSelector from "./academic-year/YearSelector";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";

import { useAcademicYear } from "../context/AcademicYearContext";
import { useLabel } from "../context/LabelsContext";

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
  showBack = false,
  showYearSelector,
}) => {
  const router = useRouter();
  const { colors, styles } = useTheme();
  const { unreadCount } = useNotifications();
  const { selectedYear } = useAcademicYear();
  const { t } = useLabel();

  // Allow explicit override, otherwise hide on welcome header (home screen) and show on default headers
  const shouldShowYearSelector =
    typeof showYearSelector === "boolean"
      ? showYearSelector
      : variant !== "welcome";

  // Fetch user to check if Super Admin for Time Travel UI
  const { data: userData } = useApiQuery(
    ["currentUser"],
    `${apiConfig.baseUrl}/auth/me`,
    {
      staleTime: Infinity,
      select: (data) => data?.user,
    }
  );

  const isSuperAdmin = userData?.role === "super admin";

  const greeting = useMemo(() => getGreeting(), []);
  const schoolBrand = useMemo(() => parseSchoolName(title), [title]);
  const isSchoolMentioned = useMemo(() => {
    const t = typeof title === "string" ? title.toLowerCase() : "";
    const s = typeof subtitle === "string" ? subtitle.toLowerCase() : "";
    return (
      t.includes("shri guru vidya") ||
      t.includes("sgv school") ||
      s.includes("shri guru vidya") ||
      s.includes("sgv school")
    );
  }, [title, subtitle]);

  // "welcome" is a creative, compact, and stylish hero app bar
  if (variant === "welcome") {
    const effectiveUserName = userName || userData?.name;
    const firstName = effectiveUserName
      ? effectiveUserName.trim().split(" ")[0]
      : null;

    return (
      <View
        style={{
          paddingTop: 4,
          paddingBottom: 14,
        }}
      >
        {/* Top Header Row: School Branding + Notification Bell */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* School Branding (Icon + Stacked Name & Subtitle) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              marginRight: 8,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: colors.surfaceContainerLowest || "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
                borderWidth: 1,
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
                padding: 2,
                flexShrink: 0,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <Image
                source={require("../assets/images/icon.png")}
                style={{ width: "100%", height: "100%", borderRadius: 10 }}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onBackground,
                  letterSpacing: 0.3,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {schoolBrand.primary || "Shri Guru Vidya"}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                  marginTop: -1,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {schoolBrand.secondary || "English Medium School"}
              </Text>
            </View>
          </View>

          {/* Right Action Icons: Academic Year Dropdown (if enabled) + Notifications */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {shouldShowYearSelector &&
              (isSuperAdmin ? (
                <YearSelector compact={true} />
              ) : (
                selectedYear && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: selectedYear.isActive
                        ? colors.primaryContainer
                        : colors.errorContainer,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selectedYear.isActive
                        ? colors.primary + "30"
                        : colors.error + "30",
                    }}
                  >
                    <MaterialIcons
                      name={
                        selectedYear.isActive
                          ? "school"
                          : "calendar-today"
                      }
                      size={11}
                      color={
                        selectedYear.isActive
                          ? colors.onPrimaryContainer
                          : colors.onErrorContainer
                      }
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.bold,
                        marginLeft: 4,
                        color: selectedYear.isActive
                          ? colors.onPrimaryContainer
                          : colors.onErrorContainer,
                      }}
                    >
                      {selectedYear.name}
                    </Text>
                  </View>
                )
              ))}

            {/* Notification Bell */}
            <Pressable
              accessibilityLabel={t("header.notifications", "Notifications")}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                router.push("/notifications");
              }}
              hitSlop={8}
              style={({ pressed }) => ({
                padding: 6,
                backgroundColor: pressed
                  ? colors.surfaceContainerHighest
                  : "transparent",
                borderRadius: 18,
                position: "relative",
              })}
            >
              <MaterialIcons
                name={
                  unreadCount > 0 ? "notifications-active" : "notifications-none"
                }
                size={24}
                color={
                  unreadCount > 0 ? colors.primary : colors.onSurfaceVariant
                }
              />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    right: 4,
                    top: 4,
                    backgroundColor: colors.error,
                    borderRadius: 10,
                    minWidth: 15,
                    height: 15,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: colors.background,
                  }}
                >
                  <Text
                    style={{
                      color: colors.onError,
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Bottom Row: Personalized User Greeting */}
        <View
          style={{
            marginTop: 14,
            marginBottom: 2,
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.title,
              fontFamily: FONTS.bold,
              color: colors.onBackground,
              letterSpacing: -0.5,
            }}
          >
            {firstName ? `${greeting.text}, ${firstName} ${greeting.emoji}` : `Welcome to SGV ${greeting.emoji}`}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              marginTop: 2,
            }}
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

  // Default variant - standard Center/Small Top App Bar
  return (
    <View
      style={{
        marginBottom: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {showBack && (
        <Pressable
          accessibilityLabel={t("header.goBack", "Go back")}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          style={({ pressed }) => ({
            marginRight: 16,
            padding: 8,
            marginLeft: -8,
            backgroundColor: pressed
              ? colors.surfaceContainerHighest
              : "transparent",
            borderRadius: 24,
          })}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
      )}

      <View style={{ flex: 1, paddingRight: 16, minWidth: 0 }}>
        {shouldShowYearSelector &&
          (isSuperAdmin ? (
            <View style={{ marginBottom: 4 }}>
              <YearSelector />
            </View>
          ) : (
            selectedYear && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: selectedYear.isActive
                    ? colors.primaryContainer
                    : colors.errorContainer,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selectedYear.isActive
                    ? colors.primary
                    : colors.error,
                  marginBottom: 4,
                  alignSelf: "flex-start",
                  maxWidth: "100%",
                }}
              >
                <MaterialIcons
                  name={
                    selectedYear.status === "archived"
                      ? "history"
                      : "calendar-today"
                  }
                  size={10}
                  color={
                    selectedYear.isActive
                      ? colors.onPrimaryContainer
                      : colors.onErrorContainer
                  }
                  style={{ flexShrink: 0 }}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.micro,
                    fontFamily: FONTS.bold,
                    marginLeft: 4,
                    color: selectedYear.isActive
                      ? colors.onPrimaryContainer
                      : colors.onErrorContainer,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {selectedYear.name}
                </Text>
              </View>
            )
          ))}
        {isSchoolMentioned ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: colors.surfaceContainerLowest || "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
                padding: 2,
                flexShrink: 0,
              }}
            >
              <Image
                source={require("../assets/images/icon.png")}
                style={{ width: "100%", height: "100%", borderRadius: 8 }}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.titleLarge, { color: colors.onBackground, flexShrink: 1 }]}
                numberOfLines={2}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={[
                    styles.titleSmall,
                    {
                      color: colors.onSurfaceVariant,
                      marginTop: 2,
                      flexShrink: 1,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <>
            <Text
              style={[styles.titleLarge, { color: colors.onBackground, flexShrink: 1 }]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.titleSmall,
                  {
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                    flexShrink: 1,
                  },
                ]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Notification Bell (Optional in standard headers, but consistent) */}
      <Pressable
        onPress={() => router.push("/notifications")}
        style={({ pressed }) => ({
          padding: 8,
          backgroundColor: pressed
            ? colors.surfaceContainerHighest
            : "transparent",
          borderRadius: 24,
          position: "relative",
        })}
      >
        <MaterialIcons
          name={unreadCount > 0 ? "notifications-active" : "notifications-none"}
          size={26}
          color={unreadCount > 0 ? colors.primary : colors.onSurfaceVariant}
        />
        {unreadCount > 0 && (
          <View
            style={{
              position: "absolute",
              right: 4,
              top: 4,
              backgroundColor: colors.error,
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: colors.background,
            }}
          >
            <Text
              style={{
                color: colors.onError,
                fontSize: FONT_SIZES.micro,
                fontFamily: FONTS.bold,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default React.memo(Header);
