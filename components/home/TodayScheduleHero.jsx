import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import apiConfig from "../../config/apiConfig";

// ─── Day helpers ──────────────────────────────────────────────────────────────
const DAYS_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getTodayName() {
  return DAYS_ORDER[new Date().getDay()];
}

function isWeekend() {
  const d = new Date().getDay();
  return d === 0; // Sunday only (Saturday is school day)
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getCurrentPeriodIndex(periods) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return periods.findIndex((p) => {
    const start = parseTimeToMinutes(p.startTime);
    const end = parseTimeToMinutes(p.endTime);
    return nowMins >= start && nowMins < end;
  });
}

// ─── Period Row ──────────────────────────────────────────────────────────────
const PeriodRow = memo(({ period, isActive, isStudent, colors, isDark }) => {
  const subjectName = period.subject?.name || period.subject || "—";
  const teacherName = isStudent
    ? period.teacher?.name?.split(" ")[0] || ""
    : null;
  const className = !isStudent
    ? (period.class?.name
        ? `${period.class.name}${period.class.section ? " " + period.class.section : ""}`
        : period.className || "")
    : null;

  const accent = colors.primary || "#2F6CD4";
  const rowBg = isActive
    ? isDark
      ? `${accent}18`
      : `${accent}0E`
    : "transparent";
  const dividerColor = isActive ? accent : colors.outlineVariant || "rgba(0,0,0,0.08)";

  return (
    <View
      style={[
        styles.periodRow,
        {
          backgroundColor: rowBg,
          borderRadius: isActive ? 12 : 8,
        },
      ]}
    >
      {/* Time column */}
      <View style={styles.timeCol}>
        <Text
          style={[
            styles.timeText,
            {
              color: isActive ? accent : colors.onSurfaceVariant,
              fontFamily: isActive ? FONTS.bold : FONTS.medium,
            },
          ]}
        >
          {period.startTime}
        </Text>
        {isActive && (
          <View style={[styles.nowDot, { backgroundColor: accent }]} />
        )}
      </View>

      {/* Accent divider */}
      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      {/* Subject + meta */}
      <View style={styles.subjectCol}>
        <Text
          style={[
            styles.subjectText,
            {
              color: isActive ? colors.onSurface : colors.onSurface,
              fontFamily: isActive ? FONTS.bold : FONTS.semiBold,
            },
          ]}
          numberOfLines={1}
        >
          {subjectName}
        </Text>
        {(teacherName || className) && (
          <Text
            style={[styles.metaText, { color: colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {teacherName || className}
          </Text>
        )}
      </View>

      {/* End time */}
      <Text style={[styles.endTime, { color: colors.onSurfaceVariant }]}>
        {period.endTime}
      </Text>
    </View>
  );
});
PeriodRow.displayName = "PeriodRow";

// ─── Main Component ───────────────────────────────────────────────────────────
const TodayScheduleHero = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { user } = useAuth();

  const isTeacher = user?.role === "teacher" || user?.role === "staff";
  const isStudent = user?.role === "student";

  // ── Fetch student timetable ──
  const { data: studentData, isLoading: studentLoading } = useApiQuery(
    ["studentTimetable", user?._id],
    `${apiConfig.baseUrl}/timetable/my-timetable`,
    { ...CACHE_TIERS.STABLE, enabled: isStudent && !!user?._id }
  );

  // ── Fetch teacher schedule ──
  const { data: teacherData, isLoading: teacherLoading } = useApiQuery(
    ["teacherSchedule"],
    `${apiConfig.baseUrl}/timetable/my-schedule`,
    { ...CACHE_TIERS.STABLE, enabled: isTeacher }
  );

  const isLoading = isStudent ? studentLoading : teacherLoading;

  // ── Derive today's periods ──
  const todayName = getTodayName();
  const isWeekendDay = isWeekend();

  const todayPeriods = useMemo(() => {
    if (isWeekendDay) return [];

    if (isStudent && studentData?.schedule) {
      const dayData = studentData.schedule.find((d) => d.day === todayName);
      return (dayData?.periods || []).slice().sort(
        (a, b) => (a.periodNumber || 0) - (b.periodNumber || 0)
      );
    }

    if (isTeacher && teacherData) {
      const dayPeriods = teacherData[todayName] || [];
      return [...dayPeriods].sort((a, b) => {
        const ta = parseTimeToMinutes(a.startTime);
        const tb = parseTimeToMinutes(b.startTime);
        return ta - tb;
      });
    }

    return [];
  }, [isStudent, isTeacher, studentData, teacherData, todayName, isWeekendDay]);

  const activePeriodIndex = useMemo(
    () => getCurrentPeriodIndex(todayPeriods),
    [todayPeriods]
  );

  // How many periods to preview (show max 4, rest behind "See all")
  const PREVIEW_COUNT = 4;
  const previewPeriods = todayPeriods.slice(0, PREVIEW_COUNT);
  const remaining = todayPeriods.length - PREVIEW_COUNT;

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isTeacher) {
      router.push("/teacher/timetable");
    } else {
      router.push("/student/timetable");
    }
  };

  // ── Accent & surface tokens ──
  const accent = colors.primary || "#2F6CD4";
  const cardBg = isDark ? colors.surfaceContainer : colors.surface;
  const cardBorder = isDark
    ? colors.outlineVariant + "50"
    : colors.outlineVariant || "rgba(0,0,0,0.07)";

  // ── Date string ──
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // ── Render skeleton rows while loading ──
  if (isLoading) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder },
        ]}
      >
        <CardHeader accent={accent} colors={colors} formattedDate={formattedDate} />
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.skeleton,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.05)",
              },
            ]}
          />
        ))}
      </View>
    );
  }

  // ── Weekend ──
  if (isWeekendDay) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder },
        ]}
      >
        <CardHeader accent={accent} colors={colors} formattedDate={formattedDate} />
        <View style={styles.emptyState}>
          <MaterialIcons name="weekend" size={28} color={colors.onSurfaceVariant} />
          <Text style={[styles.emptyTitle, { color: colors.onSurfaceVariant }]}>
            No classes today
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            Enjoy your Sunday!
          </Text>
        </View>
      </View>
    );
  }

  // ── No timetable configured ──
  if (todayPeriods.length === 0) {
    return (
      <Pressable
        onPress={handleNavigate}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <CardHeader
          accent={accent}
          colors={colors}
          formattedDate={formattedDate}
          onPress={handleNavigate}
        />
        <View style={styles.emptyState}>
          <MaterialIcons name="event-busy" size={28} color={colors.onSurfaceVariant} />
          <Text style={[styles.emptyTitle, { color: colors.onSurfaceVariant }]}>
            No schedule for today
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            Tap to view full timetable
          </Text>
        </View>
      </Pressable>
    );
  }

  // ── Main render ──
  return (
    <View
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
    >
      <CardHeader
        accent={accent}
        colors={colors}
        formattedDate={formattedDate}
        onPress={handleNavigate}
        totalCount={todayPeriods.length}
        activeIndex={activePeriodIndex}
      />

      {/* Period rows */}
      <View style={styles.periodsContainer}>
        {previewPeriods.map((period, index) => (
          <PeriodRow
            key={index}
            period={period}
            isActive={index === activePeriodIndex}
            isStudent={isStudent}
            colors={colors}
            isDark={isDark}
          />
        ))}
      </View>

      {/* "See all X more" footer */}
      <Pressable
        onPress={handleNavigate}
        style={({ pressed }) => [
          styles.footerBtn,
          {
            backgroundColor: isDark
              ? `${accent}14`
              : `${accent}0A`,
            borderColor: isDark ? `${accent}30` : `${accent}18`,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="View full timetable"
      >
        <Text style={[styles.footerText, { color: accent }]}>
          {remaining > 0 ? `+${remaining} more · ` : ""}View full timetable
        </Text>
        <MaterialIcons name="arrow-forward" size={14} color={accent} />
      </Pressable>
    </View>
  );
};

// ─── Card Header subcomponent ─────────────────────────────────────────────────
const CardHeader = ({ accent, colors, formattedDate, onPress, totalCount, activeIndex }) => {
  const hasActive = activeIndex !== undefined && activeIndex >= 0;

  return (
    <View style={styles.headerRow}>
      {/* Left: icon + title */}
      <View style={styles.headerLeft}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: `${accent}14`,
            },
          ]}
        >
          <MaterialIcons name="schedule" size={16} color={accent} />
        </View>
        <View>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
            Today's Schedule
          </Text>
          <Text style={[styles.dateText, { color: colors.onSurfaceVariant }]}>
            {formattedDate}
            {totalCount ? ` · ${totalCount} periods` : ""}
          </Text>
        </View>
      </View>

      {/* Right: "Now in class" badge OR "See all" button */}
      {hasActive ? (
        <View
          style={[
            styles.nowBadge,
            { backgroundColor: `${accent}14`, borderColor: `${accent}30` },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: accent }]} />
          <Text style={[styles.nowBadgeText, { color: accent }]}>Now</Text>
        </View>
      ) : onPress ? (
        <Pressable
          onPress={onPress}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="View full timetable"
        >
          <MaterialIcons
            name="open-in-new"
            size={18}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
      ) : null}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl || 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: 0.1,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginTop: 1,
  },
  nowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nowBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  periodsContainer: {
    gap: 2,
    marginBottom: 8,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
  },
  timeCol: {
    width: 52,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  timeText: {
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.1,
  },
  nowDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  divider: {
    width: 3,
    height: 32,
    borderRadius: 2,
    flexShrink: 0,
  },
  subjectCol: {
    flex: 1,
    minWidth: 0,
  },
  subjectText: {
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.05,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  endTime: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flexShrink: 0,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    marginTop: 4,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
  },
  // Loading skeleton
  skeleton: {
    height: 36,
    borderRadius: 8,
    marginBottom: 8,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
});

export default memo(TodayScheduleHero);
