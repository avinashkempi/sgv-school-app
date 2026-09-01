import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../theme";
import Header from "./Header";
import ModernCalendar from "./ModernCalendar";
import AppRefreshControl from "./ui/AppRefreshControl";
import { useLabel } from "../context/LabelsContext";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
import {
  getISTDateString,
  getISTToday,
  isISTSunday,
  formatISTDisplayDate,
} from "../utils/date";

const MONTHLY_PAGE_SIZE = 3;

export default function AttendanceView({
  role = "student",
  attendanceHistory = [],
  summary = null,
  subjectWise = null,
  holidays: propHolidays = null,
  loading = false,
  onRefresh,
  refreshing = false,
  onLoadMore,
  loadingMore = false,
  hasMore = false,
  title = "My Attendance",
  subtitle = "Track your attendance record",
  showBack = true,
}) {
  const { colors, mode } = useTheme();
  const { t } = useLabel();
  const isDark = mode === "dark";

  const todayStr = getISTToday();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(todayStr);
  const [monthlyVisible, setMonthlyVisible] = useState(MONTHLY_PAGE_SIZE);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'present' | 'absent' | 'holiday' | 'late'

  // Fetch school holidays as a reliable fallback/supplement
  const { data: eventsHolidayData } = useApiQuery(
    ["events", "allHolidays"],
    `${apiConfig.baseUrl}/events?isHoliday=true&limit=100`,
    {
      select: (res) => res?.event || [],
      staleTime: 1000 * 60 * 15, // 15 mins cache
    }
  );

  // Unified Normalized Holidays Map ({ "YYYY-MM-DD": { title, description, date } })
  const holidaysMap = useMemo(() => {
    const map = {};
    const sources = [
      ...(propHolidays || []),
      ...(summary?.holidays || []),
      ...(eventsHolidayData || []),
    ];

    sources.forEach((item) => {
      if (!item) return;
      const dStr = getISTDateString(item.date || item.dateStr);
      if (dStr && (item.isHoliday === true || item.isHoliday === undefined)) {
        if (!map[dStr]) {
          let desc = item.description?.trim() || "";
          if (
            !desc ||
            desc.toLowerCase().includes("attendance dashboard") ||
            desc.toLowerCase().includes("manually marked")
          ) {
            desc = "Official school holiday declared by administration.";
          }
          map[dStr] = {
            _id: item._id || dStr,
            title: item.title?.trim() || "School Holiday",
            description: desc,
            date: dStr,
            isHoliday: true,
          };
        }
      }
    });

    return map;
  }, [propHolidays, summary?.holidays, eventsHolidayData]);

  const holidaysList = useMemo(
    () => Object.values(holidaysMap).sort((a, b) => b.date.localeCompare(a.date)),
    [holidaysMap]
  );

  // Status Colors
  const getStatusColor = useCallback(
    (status) => {
      switch (status) {
        case "present":
          return colors.success || "#146C2E";
        case "absent":
          return colors.error || "#B3261E";
        case "late":
          return "#D97706";
        case "excused":
          return "#0284C7";
        case "half-day":
          return "#8B5CF6";
        case "holiday":
          return "#F59E0B";
        default:
          return colors.onSurfaceVariant;
      }
    },
    [colors]
  );

  // Normalized Summary Stats
  const displayStats = useMemo(() => {
    const PRESENT_STATUSES = ["present", "late", "excused", "half-day"];

    let total = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let halfDay = 0;
    let percentage = 0;

    if (summary?.overall?.total !== undefined) {
      total = summary.overall.total || 0;
      present = summary.overall.present || 0;
      absent = summary.overall.absent ?? Math.max(0, total - present);
      percentage = parseFloat(summary.overall.percentage || 0);
    } else if (summary?.total !== undefined) {
      total = summary.total || 0;
      present = summary.present || 0;
      absent = summary.absent ?? Math.max(0, total - present);
      late = summary.late || 0;
      excused = summary.excused || 0;
      halfDay = summary.halfDay || 0;
      percentage = parseFloat(summary.percentage || 0);
    } else {
      total = attendanceHistory.length;
      present = attendanceHistory.filter((r) =>
        PRESENT_STATUSES.includes(r.status)
      ).length;
      absent = attendanceHistory.filter((r) => r.status === "absent").length;
      late = attendanceHistory.filter((r) => r.status === "late").length;
      excused = attendanceHistory.filter((r) => r.status === "excused").length;
      halfDay = attendanceHistory.filter((r) => r.status === "half-day").length;
      percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;
    }

    // Count late/excused from loaded records if not in summary
    if (late === 0 && excused === 0 && attendanceHistory.length > 0) {
      late = attendanceHistory.filter((r) => r.status === "late").length;
      excused = attendanceHistory.filter((r) => r.status === "excused").length;
      halfDay = attendanceHistory.filter((r) => r.status === "half-day").length;
    }

    const holidaysCount = Object.keys(holidaysMap).length;

    // Standing status (Rendered on dark hero gradient card - requires high-contrast luminous colors)
    let standing = {
      label: "Good Standing (≥90%)",
      badgeText: "Good",
      badgeColor: "#4ADE80",
      badgeBg: "rgba(74, 222, 128, 0.20)",
      badgeBorder: "rgba(74, 222, 128, 0.45)",
      icon: "check-circle",
    };

    if (percentage >= 95) {
      standing = {
        label: "Outstanding (≥95%)",
        badgeText: "Outstanding",
        badgeColor: "#34D399",
        badgeBg: "rgba(52, 211, 153, 0.22)",
        badgeBorder: "rgba(52, 211, 153, 0.45)",
        icon: "emoji-events",
      };
    } else if (percentage < 90 && total > 0) {
      standing = {
        label: "Low Attendance Alert (<90%)",
        badgeText: "Low Attendance",
        badgeColor: "#FFA4A2",
        badgeBg: "rgba(239, 68, 68, 0.30)",
        badgeBorder: "rgba(255, 120, 120, 0.60)",
        icon: "warning",
      };
    }

    // Recovery calculation (if below standard 90% school target rule)
    let recoveryTarget = 0;
    if (total > 0 && percentage < 90) {
      // (P + y) / (T + y) >= 0.90 => 0.10 y >= 0.90T - P => y = ceil(9T - 10P)
      recoveryTarget = Math.max(1, Math.ceil(9 * total - 10 * present));
    }

    // Streak calculation (consecutive present from top of history)
    let streak = 0;
    for (const rec of attendanceHistory) {
      if (PRESENT_STATUSES.includes(rec.status)) {
        streak++;
      } else {
        break;
      }
    }

    // Punctuality rating for staff
    const punctuality =
      present + late > 0
        ? Math.round((present / (present + late)) * 100)
        : 100;

    return {
      total,
      present,
      absent,
      late,
      excused,
      halfDay,
      holidaysCount,
      percentage,
      standing,
      recoveryTarget,
      streak,
      punctuality,
    };
  }, [summary, attendanceHistory, holidaysMap]);

  // Calendar Marked Dates
  const markedDates = useMemo(() => {
    const marks = {};

    // 1. Mark Sundays in the active month
    if (selectedMonth) {
      try {
        const [yStr, mStr] = selectedMonth.split("-");
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10) - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          if (isISTSunday(dStr)) {
            marks[dStr] = {
              customStyles: {
                container: {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.03)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E5E7EB",
                  borderRadius: 10,
                },
                text: {
                  color: colors.onSurfaceVariant,
                  opacity: 0.6,
                  fontFamily: FONTS.medium,
                },
              },
              isSunday: true,
            };
          }
        }
      } catch (e) {
        console.warn("Sundays marking error:", e);
      }
    }

    // 2. Mark School Holidays (festive amber theme with gold border)
    Object.values(holidaysMap).forEach((holiday) => {
      const dStr = holiday.date;
      if (!dStr) return;
      marks[dStr] = {
        customStyles: {
          container: {
            backgroundColor: isDark
              ? "rgba(245, 158, 11, 0.22)"
              : "#FEF3C7",
            borderWidth: 1.5,
            borderColor: "#F59E0B",
            borderRadius: 10,
          },
          text: {
            color: isDark ? "#FCD34D" : "#B45309",
            fontFamily: FONTS.bold,
          },
        },
        isHoliday: true,
        holidayTitle: holiday.title,
        holidayDesc: holiday.description,
      };
    });

    // 3. Mark Attendance records (overrides if marked)
    attendanceHistory.forEach((record) => {
      const dateStr = getISTDateString(record.date);
      if (!dateStr) return;
      const color = getStatusColor(record.status);
      marks[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: color + (isDark ? "35" : "20"),
            borderWidth: 1.5,
            borderColor: color,
            borderRadius: 10,
          },
          text: {
            color: isDark && color === colors.error ? "#FCA5A5" : color,
            fontFamily: FONTS.bold,
          },
        },
        attendanceRecord: record,
      };
    });

    // 4. Highlight the selectedDate
    if (selectedDate) {
      const existing = marks[selectedDate] || {};
      const existingContainer = existing.customStyles?.container || {};
      marks[selectedDate] = {
        ...existing,
        customStyles: {
          ...existing.customStyles,
          container: {
            ...existingContainer,
            borderWidth: 2.5,
            borderColor: colors.primary,
            borderRadius: 10,
            backgroundColor:
              existingContainer.backgroundColor ||
              (isDark ? "rgba(208, 188, 255, 0.15)" : "#EADDFF"),
          },
          text: {
            ...(existing.customStyles?.text || {}),
            fontFamily: FONTS.bold,
            color:
              existing.customStyles?.text?.color ||
              (isDark ? "#D0BCFF" : colors.primary),
          },
        },
      };
    }

    return marks;
  }, [
    selectedMonth,
    holidaysMap,
    attendanceHistory,
    selectedDate,
    colors,
    isDark,
    getStatusColor,
  ]);

  // Handle Day Selection on Calendar
  const handleDayPress = useCallback((dayObj) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (dayObj?.dateString) {
      setSelectedDate(dayObj.dateString);
    }
  }, []);

  // Selected Day Details for Inspector Card
  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null;

    const holiday = holidaysMap[selectedDate];
    const record = attendanceHistory.find(
      (r) => getISTDateString(r.date) === selectedDate
    );
    const isSunday = isISTSunday(selectedDate);
    const isFuture = selectedDate > todayStr;
    const isToday = selectedDate === todayStr;

    return {
      dateStr: selectedDate,
      displayDate: formatISTDisplayDate(selectedDate),
      holiday,
      record,
      isSunday,
      isFuture,
      isToday,
    };
  }, [selectedDate, holidaysMap, attendanceHistory, todayStr]);

  // Combined and Filtered History List
  const filteredHistory = useMemo(() => {
    // Transform holidays to feed items
    const holidayItems = holidaysList.map((h) => ({
      _id: `holiday_${h._id || h.date}`,
      date: h.date,
      isHoliday: true,
      title: h.title,
      description: h.description,
      status: "holiday",
    }));

    const recordItems = attendanceHistory.map((r) => ({
      ...r,
      isHoliday: false,
      date: getISTDateString(r.date),
    }));

    if (activeFilter === "holiday") {
      return holidayItems;
    }

    if (activeFilter === "present") {
      return recordItems.filter((r) =>
        ["present", "half-day"].includes(r.status)
      );
    }

    if (activeFilter === "absent") {
      return recordItems.filter((r) => r.status === "absent");
    }

    if (activeFilter === "late") {
      return recordItems.filter((r) =>
        ["late", "excused", "half-day"].includes(r.status)
      );
    }

    // 'all' filter: combine records and holidays sorted newest first
    const combined = [...recordItems, ...holidayItems];
    combined.sort((a, b) => b.date.localeCompare(a.date));
    return combined;
  }, [activeFilter, attendanceHistory, holidaysList]);

  // Monthly Breakdown pagination
  const monthlyBreakdown = summary?.monthlyBreakdown || [];
  const visibleMonths = monthlyBreakdown.slice(0, monthlyVisible);
  const canShowMoreMonths = monthlyVisible < monthlyBreakdown.length;

  const subjectWiseData = subjectWise || summary?.subjectWise || [];

  if (loading && !summary && attendanceHistory.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Header title={title} subtitle={subtitle} showBack={showBack} />
        </View>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={{
              marginTop: 12,
              color: colors.onSurfaceVariant,
              fontFamily: FONTS.medium,
              fontSize: FONT_SIZES.sm,
            }}
          >
            {t("student.loadingAttendance", "Loading attendance records...")}
          </Text>
        </View>
      </View>
    );
  }

  // List Header Component with all visual modules
  const ListHeader = (
    <View style={styles.headerContainer}>
      <Header title={title} subtitle={subtitle} showBack={showBack} />

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 1. HERO ATTENDANCE GAUGE CARD (LinearGradient & Glassmorphism)*/}
      {/* ═════════════════════════════════════════════════════════════ */}
      <View style={styles.heroCardWrapper}>
        <LinearGradient
          colors={
            isDark
              ? ["#381E72", "#1D192B"]
              : [colors.onPrimaryContainer || "#21005D", colors.primary || "#4F378B"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Card Top Row: Category Tag & Status Standing Badge */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroTagPill}>
              <MaterialIcons name="school" size={14} color="#FFFFFF" style={{ opacity: 0.9 }} />
              <Text style={styles.heroTagText}>
                {role === "student" ? "ACADEMIC RECORD" : "STAFF ATTENDANCE"}
              </Text>
            </View>

            <View
              style={[
                styles.heroStandingBadge,
                {
                  backgroundColor: displayStats.standing.badgeBg,
                  borderColor: displayStats.standing.badgeBorder || "transparent",
                  borderWidth: 1,
                },
              ]}
            >
              <MaterialIcons
                name={displayStats.standing.icon}
                size={14}
                color={displayStats.standing.badgeColor}
              />
              <Text
                style={[
                  styles.heroStandingText,
                  { color: displayStats.standing.badgeColor },
                ]}
              >
                {displayStats.standing.badgeText}
              </Text>
            </View>
          </View>

          {/* Main Percentage Display */}
          <View style={styles.heroMainStats}>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={styles.heroPercentageText}>
                {displayStats.percentage}
              </Text>
              <Text style={styles.heroPercentSymbol}>%</Text>
            </View>
            <Text style={styles.heroSubText}>
              {t("student.overallAttendance", "Overall Attendance Average")}
            </Text>
          </View>

          {/* 90% Target Progress Track Bar */}
          <View style={styles.targetTrackContainer}>
            <View style={styles.trackBackground}>
              <View
                style={[
                  styles.trackFill,
                  {
                    width: `${Math.min(100, Math.max(0, displayStats.percentage))}%`,
                    backgroundColor:
                      displayStats.percentage >= 90 ? "#6DD58C" : "#F2B8B5",
                  },
                ]}
              />
              {/* 90% Threshold Marker Line */}
              <View style={styles.thresholdMarker} />
            </View>

            <View style={styles.trackLabelsRow}>
              <Text style={styles.trackLabelLeft}>0%</Text>
              <View style={styles.trackTargetPin}>
                <MaterialIcons name="flag" size={11} color="#EADDFF" />
                <Text style={styles.trackTargetText}>90% Target</Text>
              </View>
              <Text style={styles.trackLabelRight}>100%</Text>
            </View>
          </View>

          {/* 4-KPI Metric Grid (Frosted Glass Pills) */}
          <View style={styles.kpiGrid}>
            {/* Present KPI */}
            <View style={styles.kpiPill}>
              <View style={[styles.kpiDot, { backgroundColor: "#6DD58C" }]} />
              <Text style={styles.kpiValue} numberOfLines={1}>
                {displayStats.present}
              </Text>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {t("common.present", "Present")}
              </Text>
            </View>

            {/* Absent KPI */}
            <View style={styles.kpiPill}>
              <View style={[styles.kpiDot, { backgroundColor: "#F2B8B5" }]} />
              <Text style={styles.kpiValue} numberOfLines={1}>
                {displayStats.absent}
              </Text>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {t("common.absent", "Absent")}
              </Text>
            </View>

            {/* Holidays KPI */}
            <View style={styles.kpiPill}>
              <View style={[styles.kpiDot, { backgroundColor: "#FCD34D" }]} />
              <Text style={styles.kpiValue} numberOfLines={1}>
                {displayStats.holidaysCount}
              </Text>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                Holidays
              </Text>
            </View>

            {/* Late / Excused KPI */}
            <View style={styles.kpiPill}>
              <View style={[styles.kpiDot, { backgroundColor: "#93C5FD" }]} />
              <Text style={styles.kpiValue} numberOfLines={1}>
                {displayStats.late + displayStats.excused + displayStats.halfDay}
              </Text>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                Late/Leaves
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 2. SMART INSIGHTS & ATTENDANCE BUFFER CARD                     */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {displayStats.total > 0 && (
        <View
          style={[
            styles.insightsCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <View style={styles.insightHeaderRow}>
            <View style={styles.insightIconWrap}>
              <MaterialIcons
                name={
                  displayStats.percentage >= 90
                    ? "verified-user"
                    : "lightbulb-outline"
                }
                size={20}
                color={
                  displayStats.percentage >= 90
                    ? colors.success || "#146C2E"
                    : "#D97706"
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: colors.onSurface }]}>
                {role === "student"
                  ? displayStats.percentage >= 90
                    ? "Attendance Standing"
                    : "Attendance Recovery Action"
                  : "Attendance Insights"}
              </Text>
              <Text
                style={[
                  styles.insightMessage,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {role === "student" ? (
                  displayStats.percentage >= 90 ? (
                    displayStats.percentage >= 95
                      ? "Outstanding attendance record! Your attendance is well above the required 90% target."
                      : "Your attendance is in good standing (above the required 90% requirement). Keep attending classes regularly."
                  ) : (
                    <>
                      You need to attend the next{" "}
                      <Text style={{ fontFamily: FONTS.bold, color: colors.error }}>
                        {displayStats.recoveryTarget}
                      </Text>{" "}
                      consecutive class
                      {displayStats.recoveryTarget > 1 ? "es" : ""} to reach the 90%
                      threshold.
                    </>
                  )
                ) : (
                  <>
                    Punctuality rate:{" "}
                    <Text style={{ fontFamily: FONTS.bold, color: colors.onSurface }}>
                      {displayStats.punctuality}%
                    </Text>{" "}
                    on-time across logged working days.
                  </>
                )}
              </Text>
            </View>
          </View>

          {/* Streak Banner if active */}
          {displayStats.streak >= 2 && (
            <View
              style={[
                styles.streakPill,
                {
                  backgroundColor: isDark
                    ? "rgba(245, 158, 11, 0.15)"
                    : "#FEF3C7",
                },
              ]}
            >
              <Text style={{ fontSize: FONT_SIZES.md }}>🔥</Text>
              <Text
                style={[
                  styles.streakText,
                  { color: isDark ? "#FCD34D" : "#B45309" },
                ]}
              >
                {displayStats.streak} Days Continuous Attendance Streak! Keep it up.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 3. SUBJECT-WISE BREAKDOWN (Students)                          */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {subjectWiseData.length > 0 && (
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              {t("student.subjectWiseAttendance", "Subject-wise Attendance")}
            </Text>
            <Text style={[styles.sectionBadge, { color: colors.onSurfaceVariant }]}>
              {subjectWiseData.length} Subjects
            </Text>
          </View>

          {subjectWiseData.map((subject) => {
            const pct = parseFloat(subject.percentage || 0);
            const isLow = pct < 90;
            return (
              <View
                key={subject.subjectId || subject.name}
                style={[
                  styles.subjectCard,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: isLow
                      ? colors.error + "40"
                      : colors.outlineVariant,
                  },
                ]}
              >
                <View style={styles.subjectTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[styles.subjectName, { color: colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {subject.name}
                    </Text>
                    <Text
                      style={[
                        styles.subjectClassCount,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {subject.present} / {subject.total}{" "}
                      {t("student.classesCount", "classes attended")}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        styles.subjectPercentage,
                        {
                          color: isLow
                            ? colors.error || "#B3261E"
                            : colors.success || "#146C2E",
                        },
                      ]}
                    >
                      {subject.percentage}%
                    </Text>
                    {isLow && (
                      <View
                        style={[
                          styles.lowBadge,
                          {
                            backgroundColor: isDark
                              ? "rgba(242, 184, 181, 0.18)"
                              : "rgba(179, 38, 30, 0.10)",
                            borderColor: isDark
                              ? "rgba(242, 184, 181, 0.35)"
                              : "rgba(179, 38, 30, 0.25)",
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.lowBadgeText,
                            { color: isDark ? "#F2B8B5" : "#B3261E" },
                          ]}
                        >
                          LOW
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Linear Progress Bar for Subject */}
                <View style={styles.subjectProgressTrack}>
                  <View
                    style={[
                      styles.subjectProgressFill,
                      {
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                        backgroundColor: isLow
                          ? colors.error || "#B3261E"
                          : colors.success || "#146C2E",
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 4. MODERN CALENDAR WITH PROMINENT HOLIDAYS                    */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            {t("student.attendanceCalendar", "Attendance & Holiday Calendar")}
          </Text>
          <Text style={[styles.sectionBadge, { color: colors.primary }]}>
            Tap date to inspect
          </Text>
        </View>

        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <ModernCalendar
            current={selectedMonth}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            onMonthChange={(month) => {
              if (month?.dateString && month.dateString !== selectedMonth) {
                setSelectedMonth(month.dateString);
              }
            }}
            markingType={"custom"}
            theme={{
              calendarBackground: "transparent",
            }}
          />

          {/* Upgraded Comprehensive Legend */}
          <View style={styles.legendContainer}>
            {[
              {
                label: t("common.present", "Present"),
                color: colors.success || "#146C2E",
                bg: (colors.success || "#146C2E") + "30",
              },
              {
                label: t("common.absent", "Absent"),
                color: colors.error || "#B3261E",
                bg: (colors.error || "#B3261E") + "30",
              },
              {
                label: t("common.late", "Late"),
                color: "#D97706",
                bg: "#D9770630",
              },
              {
                label: t("common.excused", "Excused"),
                color: "#0284C7",
                bg: "#0284C730",
              },
              {
                label: "Holiday 🎉",
                color: "#F59E0B",
                bg: "#FEF3C7",
                border: "#F59E0B",
              },
              {
                label: "Sunday ☀️",
                color: colors.onSurfaceVariant,
                bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                dashed: true,
              },
            ].map(({ label, color, bg, border, dashed }) => (
              <View key={label} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColorBox,
                    {
                      backgroundColor: bg,
                      borderColor: border || color,
                      borderStyle: dashed ? "dashed" : "solid",
                    },
                  ]}
                />
                <Text
                  style={[styles.legendLabel, { color: colors.onSurfaceVariant }]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 5. INTERACTIVE SELECTED DAY INSPECTOR CARD                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {selectedDayInfo && (
          <View
            style={[
              styles.dayInspectorCard,
              {
                backgroundColor: selectedDayInfo.holiday
                  ? isDark
                    ? "#332200"
                    : "#FFFBEB"
                  : selectedDayInfo.isSunday
                  ? isDark
                    ? "#1E1B2E"
                    : "#F5F3FF"
                  : colors.surfaceContainer,
                borderColor: selectedDayInfo.holiday
                  ? "#F59E0B"
                  : selectedDayInfo.isSunday
                  ? "#8B5CF6"
                  : colors.outlineVariant,
              },
            ]}
          >
            {/* Top Bar with Date & Status Pill */}
            <View style={styles.inspectorTopRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <MaterialIcons
                  name={
                    selectedDayInfo.holiday
                      ? "celebration"
                      : selectedDayInfo.isSunday
                      ? "wb-sunny"
                      : selectedDayInfo.record?.status === "present"
                      ? "check-circle"
                      : selectedDayInfo.record?.status === "absent"
                      ? "cancel"
                      : "event"
                  }
                  size={22}
                  color={
                    selectedDayInfo.holiday
                      ? "#D97706"
                      : selectedDayInfo.isSunday
                      ? "#8B5CF6"
                      : selectedDayInfo.record
                      ? getStatusColor(selectedDayInfo.record.status)
                      : colors.primary
                  }
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.inspectorDateText, { color: colors.onSurface }]} numberOfLines={1}>
                    {selectedDayInfo.displayDate}
                  </Text>
                  {selectedDayInfo.isToday && (
                    <Text style={{ fontSize: FONT_SIZES.xs, color: colors.primary, fontFamily: FONTS.bold }} numberOfLines={1}>
                      Today
                    </Text>
                  )}
                </View>
              </View>

              {/* Status Badge */}
              {selectedDayInfo.holiday ? (
                <View
                  style={[
                    styles.holidayBadgePill,
                    {
                      backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
                      flexShrink: 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.holidayBadgePillText,
                      { color: isDark ? "#FCD34D" : "#B45309" },
                    ]}
                  >
                    🎉 School Holiday
                  </Text>
                </View>
              ) : selectedDayInfo.isSunday ? (
                <View
                  style={[
                    styles.sundayBadgePill,
                    {
                      backgroundColor: isDark ? "rgba(139, 92, 246, 0.18)" : "#EDE9FE",
                      flexShrink: 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sundayBadgePillText,
                      { color: isDark ? "#C4B5FD" : "#6D28D9" },
                    ]}
                  >
                    ☀️ Sunday Off
                  </Text>
                </View>
              ) : selectedDayInfo.record ? (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        getStatusColor(selectedDayInfo.record.status) +
                        (isDark ? "30" : "15"),
                      borderColor: getStatusColor(selectedDayInfo.record.status),
                      flexShrink: 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: getStatusColor(selectedDayInfo.record.status) },
                    ]}
                  >
                    {selectedDayInfo.record.status.toUpperCase()}
                  </Text>
                </View>
              ) : selectedDayInfo.isFuture ? (
                <View style={[styles.futureBadgePill, { flexShrink: 0 }]}>
                  <Text style={styles.futureBadgePillText}>Upcoming</Text>
                </View>
              ) : (
                <View style={[styles.unmarkedBadgePill, { flexShrink: 0 }]}>
                  <Text style={styles.unmarkedBadgePillText}>No Record</Text>
                </View>
              )}
            </View>

            {/* Content Details */}
            {selectedDayInfo.holiday ? (
              <View style={styles.inspectorDetailBody}>
                <Text style={[styles.holidayInspectorTitle, { color: isDark ? "#FCD34D" : "#92400E" }]}>
                  {selectedDayInfo.holiday.title}
                </Text>
                <Text style={[styles.holidayInspectorDesc, { color: isDark ? "#FDE68A" : "#B45309" }]}>
                  {selectedDayInfo.holiday.description ||
                    "Official school holiday declared by administration."}
                </Text>
              </View>
            ) : selectedDayInfo.isSunday ? (
              <View style={styles.inspectorDetailBody}>
                <Text style={[styles.sundayInspectorTitle, { color: isDark ? "#DDD6FE" : "#6D28D9" }]}>
                  Weekend Break
                </Text>
                <Text style={[styles.sundayInspectorDesc, { color: colors.onSurfaceVariant }]}>
                  Weekly scheduled off. No classes or attendance marked on Sundays.
                </Text>
              </View>
            ) : selectedDayInfo.record ? (
              <View style={styles.inspectorDetailBody}>
                <Text style={[styles.recordInspectorStatus, { color: colors.onSurface }]}>
                  Status:{" "}
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      color: getStatusColor(selectedDayInfo.record.status),
                      textTransform: "capitalize",
                    }}
                  >
                    {selectedDayInfo.record.status}
                  </Text>
                </Text>
                {selectedDayInfo.record.remarks ? (
                  <View
                    style={[
                      styles.remarksBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.02)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={14}
                      color={colors.onSurfaceVariant}
                      style={{ marginTop: 2 }}
                    />
                    <Text
                      style={[
                        styles.remarksText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {selectedDayInfo.record.remarks}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.inspectorDetailBody}>
                <Text style={[styles.noRecordText, { color: colors.onSurfaceVariant }]}>
                  {selectedDayInfo.isFuture
                    ? "Classes and attendance have not taken place yet."
                    : "No attendance was recorded for this day."}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 6. MONTHLY SUMMARY CARDS                                      */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {visibleMonths.length > 0 && (
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              {t("student.monthlySummary", "Monthly Breakdown")}
            </Text>
            <Text style={[styles.sectionBadge, { color: colors.onSurfaceVariant }]}>
              {monthlyBreakdown.length} Months
            </Text>
          </View>

          {visibleMonths.map((month) => {
            const pct = parseFloat(month.percentage || 0);
            const isGood = pct >= 90;
            return (
              <View
                key={month.month}
                style={[
                  styles.monthlyCard,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <View style={styles.monthlyTopRow}>
                  <View>
                    <Text
                      style={[styles.monthlyMonthText, { color: colors.onSurface }]}
                    >
                      {month.month}
                    </Text>
                    <Text
                      style={[
                        styles.monthlyDaysText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {month.present} / {month.total} {t("common.days", "days present")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.monthlyPercentText,
                      {
                        color: isGood
                          ? colors.success || "#146C2E"
                          : colors.error || "#B3261E",
                      },
                    ]}
                  >
                    {month.percentage}%
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.monthlyProgressTrack}>
                  <View
                    style={[
                      styles.monthlyProgressFill,
                      {
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                        backgroundColor: isGood
                          ? colors.success || "#146C2E"
                          : colors.error || "#B3261E",
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          {canShowMoreMonths && (
            <TouchableOpacity
              onPress={() => setMonthlyVisible((v) => v + MONTHLY_PAGE_SIZE)}
              style={[
                styles.showMoreBtn,
                { borderColor: colors.primary + "40" },
              ]}
            >
              <Text style={[styles.showMoreBtnText, { color: colors.primary }]}>
                {t("student.showMoreMonths", "Show More Months")}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 7. ATTENDANCE HISTORY FILTER CHIPS & TIMELINE HEADER          */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <View style={{ marginTop: 24, marginBottom: 8 }}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>
          {t("student.attendanceHistory", "Attendance & Holiday History")}
        </Text>

        {/* Filter Chips Bar */}
        <View style={styles.filterChipsRow}>
          {[
            {
              id: "all",
              label: "All",
              count: attendanceHistory.length + holidaysList.length,
              icon: "list",
            },
            {
              id: "present",
              label: "Present",
              count: displayStats.present,
              icon: "check",
            },
            {
              id: "absent",
              label: "Absent",
              count: displayStats.absent,
              icon: "close",
            },
            {
              id: "holiday",
              label: "Holidays",
              count: displayStats.holidaysCount,
              icon: "celebration",
            },
            {
              id: "late",
              label: "Late/Leaves",
              count:
                displayStats.late +
                displayStats.excused +
                displayStats.halfDay,
              icon: "schedule",
            },
          ].map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                    () => {}
                  );
                  setActiveFilter(chip.id);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : isDark
                      ? colors.surfaceContainerHigh
                      : colors.surfaceContainer,
                    borderColor: isActive
                      ? colors.primary
                      : colors.outlineVariant,
                  },
                ]}
              >
                <MaterialIcons
                  name={chip.icon}
                  size={13}
                  color={isActive ? "#FFFFFF" : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? "#FFFFFF" : colors.onSurfaceVariant,
                      fontFamily: isActive ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  {chip.label} ({chip.count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  // Render individual History Record or Holiday Card
  const renderRecordItem = ({ item }) => {
    // HOLIDAY CARD IN HISTORY
    if (item.isHoliday) {
      return (
        <View
          style={[
            styles.historyItemCard,
            styles.holidayItemCard,
            {
              backgroundColor: isDark ? "#2A1F08" : "#FFFBEB",
              borderColor: "#F59E0B",
            },
          ]}
        >
          <View style={styles.historyCardMain}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <View style={[styles.holidayIconBubble, { flexShrink: 0 }]}>
                <MaterialIcons name="celebration" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.historyDateTitle,
                    { color: isDark ? "#FCD34D" : "#92400E" },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.historyDateSubtitle,
                    { color: isDark ? "#FDE68A" : "#B45309" },
                  ]}
                  numberOfLines={1}
                >
                  {formatISTDisplayDate(item.date)}
                </Text>
                {item.description ? (
                  <Text
                    style={[
                      styles.historyHolidayDesc,
                      { color: isDark ? "#FDE68A" : "#B45309" },
                    ]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.holidayHistoryBadge,
                {
                  backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
                  borderColor: isDark ? "rgba(245, 158, 11, 0.4)" : "#F59E0B",
                  flexShrink: 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.holidayHistoryBadgeText,
                  { color: isDark ? "#FCD34D" : "#B45309" },
                ]}
              >
                School Holiday
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // ATTENDANCE RECORD CARD
    const color = getStatusColor(item.status);
    return (
      <View
        style={[
          styles.historyItemCard,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.outlineVariant,
            borderLeftColor: color,
            borderLeftWidth: 4,
          },
        ]}
      >
        <View style={styles.historyCardMain}>
          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
            <Text style={[styles.historyDateTitle, { color: colors.onSurface }]} numberOfLines={1}>
              {formatISTDisplayDate(item.date)}
            </Text>
            {item.subject?.name ? (
              <Text
                style={[
                  styles.historySubjectTag,
                  { color: colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                Subject: {item.subject.name}
              </Text>
            ) : null}
            {item.remarks ? (
              <View
                style={[
                  styles.historyRemarksRow,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.02)",
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={12}
                  color={colors.onSurfaceVariant}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Text
                  style={[
                    styles.historyRemarksText,
                    { color: colors.onSurfaceVariant },
                  ]}
                  numberOfLines={2}
                >
                  {item.remarks}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.historyStatusPill,
              {
                backgroundColor: color + (isDark ? "30" : "15"),
                borderColor: color,
                flexShrink: 0,
              },
            ]}
          >
            <Text style={[styles.historyStatusPillText, { color }]} numberOfLines={1}>
              {t("common." + item.status, item.status)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const ListFooter = (
    <View style={styles.footerContainer}>
      {loadingMore && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginVertical: 16 }}
        />
      )}
      {!hasMore && filteredHistory.length > 0 && (
        <Text
          style={[
            styles.allLoadedText,
            { color: colors.onSurfaceVariant },
          ]}
        >
          {t("student.allRecordsLoaded", "All records loaded")}
        </Text>
      )}
    </View>
  );

  const EmptyList = (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name={activeFilter === "holiday" ? "celebration" : "event-available"}
        size={44}
        color={colors.onSurfaceVariant}
        style={{ opacity: 0.6 }}
      />
      <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
        {activeFilter === "holiday"
          ? "No Holidays in this View"
          : activeFilter === "absent"
          ? "Zero Absences! 🎉"
          : "No Records Found"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
        {activeFilter === "absent"
          ? "You have had 100% attendance without missing any classes!"
          : "No records found matching the selected filter."}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) =>
          item._id?.toString() || `${item.date}_${index}`
        }
        renderItem={renderRecordItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={EmptyList}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        onEndReached={hasMore && onLoadMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // HERO GAUGE CARD
  heroCardWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  heroGradient: {
    padding: 22,
    borderRadius: 24,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  heroTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroTagText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.8,
  },
  heroStandingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroStandingText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  heroMainStats: {
    alignItems: "center",
    marginVertical: 4,
  },
  heroPercentageText: {
    fontSize: FONT_SIZES.jumbo,
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
    lineHeight: LINE_HEIGHTS.jumbo,
  },
  heroPercentSymbol: {
    fontSize: FONT_SIZES.display,
    fontFamily: FONTS.semiBold,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 2,
  },
  heroSubText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },

  // 90% TARGET TRACK
  targetTrackContainer: {
    marginTop: 16,
    marginBottom: 18,
  },
  trackBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  trackFill: {
    height: 8,
    borderRadius: 4,
  },
  thresholdMarker: {
    position: "absolute",
    left: "90%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },
  trackLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  trackLabelLeft: {
    fontSize: FONT_SIZES.micro,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: FONTS.medium,
  },
  trackTargetPin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  trackTargetText: {
    fontSize: FONT_SIZES.micro,
    color: "#EADDFF",
    fontFamily: FONTS.bold,
  },
  trackLabelRight: {
    fontSize: FONT_SIZES.micro,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: FONTS.medium,
  },

  // 4-KPI GRID
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
  },
  kpiPill: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  kpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
  },
  kpiLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    textAlign: "center",
  },

  // SMART INSIGHTS CARD
  insightsCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    elevation: 1,
  },
  insightHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  insightIconWrap: {
    marginTop: 2,
  },
  insightTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.sm,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  streakText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    flex: 1,
  },

  // SECTIONS
  sectionWrapper: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  sectionBadge: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },

  // SUBJECT CARDS
  subjectCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
  },
  subjectTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subjectName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  subjectClassCount: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  subjectPercentage: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  lowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  lowBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  subjectProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(128, 128, 128, 0.15)",
    marginTop: 10,
    overflow: "hidden",
  },
  subjectProgressFill: {
    height: 5,
    borderRadius: 3,
  },

  // CALENDAR CARD
  calendarCard: {
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    elevation: 2,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.15)",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendColorBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
  },

  // DAY INSPECTOR CARD
  dayInspectorCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.5,
    elevation: 2,
  },
  inspectorTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inspectorDateText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  holidayBadgePill: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  holidayBadgePillText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    color: "#B45309",
  },
  sundayBadgePill: {
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#8B5CF6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sundayBadgePillText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    color: "#6D28D9",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  futureBadgePill: {
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  futureBadgePillText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    color: "#6B7280",
  },
  unmarkedBadgePill: {
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unmarkedBadgePillText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    color: "#6B7280",
  },
  inspectorDetailBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128, 128, 128, 0.15)",
  },
  holidayInspectorTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  holidayInspectorDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 3,
    lineHeight: LINE_HEIGHTS.xs,
  },
  sundayInspectorTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  sundayInspectorDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 3,
  },
  recordInspectorStatus: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  remarksBox: {
    flexDirection: "row",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  remarksText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  noRecordText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    fontStyle: "italic",
  },

  // MONTHLY BREAKDOWN
  monthlyCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  monthlyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthlyMonthText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  monthlyDaysText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  monthlyPercentText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  monthlyProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128, 128, 128, 0.15)",
    marginTop: 8,
    overflow: "hidden",
  },
  monthlyProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    gap: 4,
  },
  showMoreBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },

  // FILTER CHIPS
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
  },

  // HISTORY CARDS
  historyItemCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    elevation: 1,
  },
  holidayItemCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  historyCardMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  holidayIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  historyDateTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  historyDateSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  historyHolidayDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
  holidayHistoryBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  holidayHistoryBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: "#B45309",
  },
  historySubjectTag: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  historyRemarksRow: {
    flexDirection: "row",
    gap: 6,
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  historyRemarksText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  historyStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyStatusPillText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    textTransform: "capitalize",
  },

  // FOOTER & EMPTY
  footerContainer: {
    paddingBottom: 20,
  },
  allLoadedText: {
    textAlign: "center",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    marginVertical: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginTop: 4,
  },
});
