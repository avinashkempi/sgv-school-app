import React, { memo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useLabel } from "../../context/LabelsContext";

const TodayTimetableCard = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLabel();

  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isTeacher) {
      router.push("/teacher/schedule");
    } else if (isAdmin) {
      router.push("/admin/timetable");
    } else {
      router.push("/student/timetable");
    }
  };

  const violetAccent = isDark ? "#A78BFA" : "#6366F1";
  const cardSurface = isDark ? colors.surfaceContainer : "#FFFFFF";
  const borderColor = isDark ? "rgba(167, 139, 250, 0.2)" : "rgba(99, 102, 241, 0.15)";
  const iconBg = isDark ? "rgba(167, 139, 250, 0.15)" : "rgba(99, 102, 241, 0.10)";

  const now = new Date();
  const todayDayName = now.toLocaleDateString("en-US", { weekday: "short" });
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable
      onPress={handleNavigate}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: cardSurface,
          borderColor: borderColor,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t("timetable.todayTitle", "Today's Timetable")}
    >
      {/* Left Icon Container */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: iconBg,
            borderColor: isDark
              ? "rgba(167, 139, 250, 0.3)"
              : "rgba(99, 102, 241, 0.22)",
          },
        ]}
      >
        <MaterialIcons name="schedule" size={24} color={violetAccent} />
      </View>

      {/* Center Title & Subtitle */}
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            {t("timetable.todayTitle", "Today's Timetable")}
          </Text>
          <View
            style={[
              styles.dateBadge,
              {
                backgroundColor: isDark
                  ? "rgba(167, 139, 250, 0.15)"
                  : "rgba(99, 102, 241, 0.08)",
              },
            ]}
          >
            <Text style={[styles.dateBadgeText, { color: violetAccent }]}>
              {todayDayName}, {formattedDate}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {isTeacher
            ? "View your teaching schedule & classes"
            : isAdmin
            ? "View school-wide class timetables"
            : "Tap to view your complete daily schedule"}
        </Text>
      </View>

      {/* Right Chevron Action Button */}
      <View
        style={[
          styles.actionButton,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.04)",
          },
        ]}
      >
        <MaterialIcons
          name="chevron-right"
          size={22}
          color={colors.onSurfaceVariant}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  title: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  dateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

export default memo(TodayTimetableCard);
