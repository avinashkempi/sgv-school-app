import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../../theme";
import { Badge, ProgressBar, AnimatedNumber } from "../ui";

/**
 * DayGlanceCard - Contextual "Today at a glance" hero card
 *
 * @param {Object} props
 * @param {'student'|'teacher'|'admin'|'super admin'|string} props.role
 * @param {Object} [props.data] - Role-specific summary data
 * @param {Function} [props.onAction] - Optional click handler
 */
const DayGlanceCard = memo(({ role, data = {}, onAction: _onAction }) => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const handleTilePress = (route) => {
    if (route) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Fallback
      }
      router.push(route);
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // STUDENT VIEW
  // ═════════════════════════════════════════════════════════════════
  if (role === "student") {
    const rawAttendance = data?.overview?.attendancePercentage ?? 0;
    const attendanceNum = parseFloat(rawAttendance) || 0;
    const dueAmount = data?.overview?.dueAmount ?? 0;
    const nextExamName = data?.overview?.nextExamName || "No upcoming exam";

    const accent = colors.primary || "#2F6CD4";
    const cardBg = isDark ? "rgba(47, 108, 212, 0.12)" : "rgba(47, 108, 212, 0.06)";
    const cardBorder = isDark ? "rgba(47, 108, 212, 0.35)" : "rgba(47, 108, 212, 0.22)";

    return (
      <View
        style={[
          styles.cardContainer,
          {
            backgroundColor: cardBg,
            borderWidth: 1.5,
            borderColor: cardBorder,
            borderRadius: RADIUS.xl || 20,
            padding: 16,
          },
        ]}
      >
        {/* Header Tag */}
        <View style={styles.headerRow}>
          <View style={styles.headerTag}>
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.brandOrange || colors.primary },
              ]}
            />
            <Text
              style={[
                styles.tagText,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              TODAY'S SNAPSHOT
            </Text>
          </View>
          <Badge
            variant={attendanceNum >= 75 ? "success" : "warning"}
            size="sm"
            label={attendanceNum >= 75 ? "Good Standing" : "Needs Attention"}
          />
        </View>

        {/* Attendance Highlight */}
        <View style={styles.mainStatRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              Overall Attendance
            </Text>
            <View style={styles.numberRow}>
              <AnimatedNumber
                value={attendanceNum}
                suffix="%"
                duration={1000}
                style={[
                  styles.heroStat,
                  { color: colors.textPrimary || colors.onSurface },
                ]}
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Attendance"
            onPress={() => handleTilePress("/student/attendance")}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: isDark
                  ? colors.surfaceContainerHigh
                  : colors.surfaceContainer,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.actionPillText,
                { color: colors.brandOrange || colors.primary },
              ]}
            >
              View Record
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={13}
              color={colors.brandOrange || colors.primary}
            />
          </Pressable>
        </View>

        <ProgressBar
          progress={attendanceNum / 100}
          height={6}
          variant={attendanceNum >= 75 ? "primary" : "warning"}
          style={{ marginVertical: 12 }}
        />

        {/* 2-Column Summary Footer */}
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => handleTilePress("/student/fees")}
            style={styles.footerItem}
          >
            <Text
              style={[
                styles.footerItemLabel,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              Fee Balance
            </Text>
            <Text
              style={[
                styles.footerItemValue,
                {
                  color:
                    dueAmount > 0
                      ? colors.error || "#DC2626"
                      : colors.success || "#16A34A",
                },
              ]}
            >
              {dueAmount > 0 ? `₹${Number(dueAmount).toLocaleString()}` : "Fully Paid"}
            </Text>
          </Pressable>

          <View
            style={[
              styles.footerDivider,
              { backgroundColor: colors.outlineVariant || colors.border },
            ]}
          />

          <Pressable
            onPress={() => handleTilePress("/student/exam-schedule")}
            style={styles.footerItem}
          >
            <Text
              style={[
                styles.footerItemLabel,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              Next Exam
            </Text>
            <Text
              style={[
                styles.footerItemValue,
                { color: colors.textPrimary || colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {nextExamName}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // TEACHER VIEW
  // ═════════════════════════════════════════════════════════════════
  if (role === "teacher" || role === "staff") {
    const classesToday = data?.overview?.totalClassesToday ?? data?.overview?.assignedClasses ?? 0;
    const pendingAttendance = data?.missingDays?.length || 0;

    const accent = colors.primary || "#4F46E5";
    const cardBg = isDark ? "rgba(79, 70, 229, 0.11)" : "rgba(79, 70, 229, 0.05)";
    const cardBorder = isDark ? "rgba(79, 70, 229, 0.35)" : "rgba(79, 70, 229, 0.2)";

    return (
      <View
        style={[
          styles.cardContainer,
          {
            backgroundColor: cardBg,
            borderWidth: 1.5,
            borderColor: cardBorder,
            borderRadius: RADIUS.xl || 20,
            padding: 16,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTag}>
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.brandBlue || colors.secondary },
              ]}
            />
            <Text
              style={[
                styles.tagText,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              FACULTY DESK
            </Text>
          </View>
          <Badge
            variant={pendingAttendance > 0 ? "warning" : "success"}
            size="sm"
            label={pendingAttendance > 0 ? `${pendingAttendance} Pending` : "Up to date"}
          />
        </View>

        <View style={styles.mainStatRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              Classes Scheduled Today
            </Text>
            <View style={styles.numberRow}>
              <AnimatedNumber
                value={classesToday}
                duration={800}
                style={[
                  styles.heroStat,
                  { color: colors.textPrimary || colors.onSurface },
                ]}
              />
              <Text
                style={[
                  styles.unitText,
                  { color: colors.textSecondary || colors.onSurfaceVariant },
                ]}
              >
                periods
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => handleTilePress("/teacher/timetable")}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: isDark
                  ? colors.surfaceContainerHigh
                  : colors.surfaceContainer,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.actionPillText,
                { color: colors.brandBlue || colors.secondary },
              ]}
            >
              Schedule
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={13}
              color={colors.brandBlue || colors.secondary}
            />
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={() => handleTilePress("/requests")}
            style={styles.footerItem}
          >
            <Text
              style={[
                styles.footerItemLabel,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              Attendance Status
            </Text>
            <Text
              style={[
                styles.footerItemValue,
                {
                  color:
                    pendingAttendance > 0
                      ? colors.warning || "#D97706"
                      : colors.success || "#16A34A",
                },
              ]}
            >
              {pendingAttendance > 0 ? `${pendingAttendance} Missed` : "Completed"}
            </Text>
          </Pressable>

          <View
            style={[
              styles.footerDivider,
              { backgroundColor: colors.outlineVariant || colors.border },
            ]}
          />

          <Pressable
            onPress={() => handleTilePress("/teacher/classes")}
            style={styles.footerItem}
          >
            <Text
              style={[
                styles.footerItemLabel,
                { color: colors.textSecondary || colors.onSurfaceVariant },
              ]}
            >
              Marks & Exams
            </Text>
            <Text
              style={[
                styles.footerItemValue,
                { color: colors.textPrimary || colors.onSurface },
              ]}
            >
              Manage &rarr;
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // ADMIN & SUPER ADMIN VIEW (Campus Metrics removed)
  // ═════════════════════════════════════════════════════════════════
  if (role === "admin" || role === "super admin") {
    return null;
  }

  return null;
});

DayGlanceCard.displayName = "DayGlanceCard";

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.8,
  },
  mainStatRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.medium,
    marginBottom: 2,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroStat: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    letterSpacing: -0.6,
  },
  unitText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full || 20,
    marginBottom: 4,
  },
  actionPillText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  footerItem: {
    flex: 1,
    minWidth: 0,
  },
  footerItemLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginBottom: 2,
  },
  footerItemValue: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  footerDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
});

export default DayGlanceCard;
