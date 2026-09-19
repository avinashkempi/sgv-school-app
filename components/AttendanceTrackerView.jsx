import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AppRefreshControl from "./ui/AppRefreshControl";
import UserAvatar from "./ui/UserAvatar";
import SegmentedControl from "./SegmentedControl";
import { EmptyState } from "./StateComponents";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../theme";
import { formatClassName } from "../utils/formatClassName";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../utils/userFormatters";

/**
 * AttendanceTrackerView (Compact & High-Density)
 *
 * Streamlined attendance tracker with concise tabs, flexible period options (Today, Yesterday, Week, 7D, 14D, Month, 30D, Custom),
 * compact KPI insight cards, and fast 1-tap navigation to take attendance.
 */
export default function AttendanceTrackerView({
  trackerData = [],
  teacherSummary = [],
  totalWorkingDays = 0,
  isLoading = false,
  refreshing = false,
  onRefresh,
  activeRangePreset = "all",
  onSelectRangePreset,
  dateRangeLabel = "",
  onNavigateToClassAttendance,
}) {
  const { colors, isDark } = useTheme();

  // Concise Tabs: 'teacher' vs 'date'
  const [viewMode, setViewMode] = useState("teacher");

  // Pagination / Visible count
  const PAGE_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Expanded cards set (teacher IDs)
  const [expandedTeachers, setExpandedTeachers] = useState(() => new Set());

  const toggleExpand = useCallback((id) => {
    setExpandedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Compute unified teacher breakdown (with client-side fallback)
  const resolvedTeacherList = useMemo(() => {
    if (teacherSummary && teacherSummary.length > 0) {
      return teacherSummary;
    }

    const teacherMap = new Map();

    trackerData.forEach((day) => {
      (day.missingClasses || []).forEach((cls) => {
        const teacher = cls.classTeacher;
        const key = teacher?._id ? String(teacher._id) : "unassigned";

        if (!teacherMap.has(key)) {
          teacherMap.set(key, {
            teacher: teacher || null,
            isUnassigned: !teacher,
            classes: [],
            missedCount: 0,
            missedDays: [],
          });
        }

        const entry = teacherMap.get(key);
        entry.missedCount += 1;
        entry.missedDays.push({
          date: day.date,
          classId: cls._id,
          className: cls.name,
          classSection: cls.section,
        });

        if (!entry.classes.some((c) => String(c._id) === String(cls._id))) {
          entry.classes.push({
            _id: cls._id,
            name: cls.name,
            section: cls.section,
            branch: cls.branch,
          });
        }
      });
    });

    const workingDays = totalWorkingDays || trackerData.length || 1;
    const list = Array.from(teacherMap.values()).map((entry) => {
      const totalPossible = entry.classes.length * workingDays;
      const complianceRate =
        totalPossible > 0
          ? Math.max(
              0,
              Math.round(
                ((totalPossible - entry.missedCount) / totalPossible) * 100
              )
            )
          : 0;

      entry.missedDays.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return {
        ...entry,
        totalOpportunities: totalPossible,
        complianceRate,
      };
    });

    list.sort((a, b) => b.missedCount - a.missedCount);
    return list;
  }, [teacherSummary, trackerData, totalWorkingDays]);

  // Overall KPI metrics
  const kpis = useMemo(() => {
    let totalMissedSessions = 0;
    trackerData.forEach((d) => {
      totalMissedSessions += d.missingCount || 0;
    });

    const topDefaulter = resolvedTeacherList.find(
      (item) => item.missedCount > 0
    );

    const cleanTeachersCount = resolvedTeacherList.filter(
      (item) => item.missedCount === 0 && !item.isUnassigned
    ).length;

    const assignedTeachersCount = resolvedTeacherList.filter(
      (item) => !item.isUnassigned
    ).length;

    let totalPossible = 0;
    let totalMisses = 0;
    resolvedTeacherList.forEach((item) => {
      totalPossible += item.totalOpportunities || 0;
      totalMisses += item.missedCount || 0;
    });

    const overallCompliance =
      totalPossible > 0
        ? Math.max(
            0,
            Math.round(((totalPossible - totalMisses) / totalPossible) * 100)
          )
        : 100;

    return {
      topDefaulter,
      totalMissedSessions,
      cleanTeachersCount,
      assignedTeachersCount,
      overallCompliance,
    };
  }, [trackerData, resolvedTeacherList]);

  // Teachers sorted by missed count (highest misses first)
  const sortedTeachers = useMemo(() => {
    return [...resolvedTeacherList].sort((a, b) => {
      if (b.missedCount !== a.missedCount) {
        return b.missedCount - a.missedCount;
      }
      const nameA = a.teacher?.name || (a.isUnassigned ? "zzz" : "");
      const nameB = b.teacher?.name || (b.isUnassigned ? "zzz" : "");
      return nameA.localeCompare(nameB);
    });
  }, [resolvedTeacherList]);

  const getSeverity = (missedCount) => {
    if (missedCount >= 4) {
      return {
        label: "Critical",
        color: colors.error,
        bg: colors.error + "15",
        border: colors.error + "35",
      };
    }
    if (missedCount >= 2) {
      return {
        label: "Attention",
        color: "#E27200",
        bg: "#E2720015",
        border: "#E2720035",
      };
    }
    if (missedCount === 1) {
      return {
        label: "Minor",
        color: colors.primary,
        bg: colors.primary + "12",
        border: colors.primary + "30",
      };
    }
    return {
      label: "100%",
      color: colors.success,
      bg: colors.success + "12",
      border: colors.success + "30",
    };
  };

  const formatDisplayDateString = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Concise View Tabs
  const viewTabs = [
    { key: "teacher", label: "Teachers" },
    { key: "date", label: "Daily" },
  ];

  // Period Presets: All Time, This Month, Last Month
  const periodPresets = [
    { key: "all", label: "All Time" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
  ];

  return (
    <View style={styles.root}>
      {/* Period Bar (Compact Horizontal Scroll) */}
      <View
        style={[
          styles.rangeBarCompact,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeScrollContent}
        >
          {periodPresets.map((preset) => {
            const isSelected = activeRangePreset === preset.key;
            return (
              <TouchableOpacity
                key={preset.key}
                onPress={() =>
                  onSelectRangePreset && onSelectRangePreset(preset.key)
                }
                activeOpacity={0.7}
                style={[
                  styles.rangePillCompact,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? colors.surfaceContainerHigh
                      : colors.surfaceContainer,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rangePillTextCompact,
                    {
                      color: isSelected ? "#FFFFFF" : colors.textPrimary,
                      fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {dateRangeLabel ? (
          <View style={styles.rangeBadgeRow}>
            <MaterialIcons
              name="calendar-today"
              size={12}
              color={colors.textSecondary}
            />
            <Text
              style={[
                styles.rangeBadgeText,
                { color: colors.textSecondary, fontFamily: FONTS.regular },
              ]}
              numberOfLines={1}
            >
              {dateRangeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Compact KPI Cards Grid (2x2) */}
        <View style={styles.kpiGridCompact}>
          {/* Card 1: Top Defaulter */}
          <View
            style={[
              styles.kpiCardCompact,
              {
                backgroundColor: colors.surface,
                borderColor: kpis.topDefaulter
                  ? colors.error + "30"
                  : colors.success + "30",
                borderLeftWidth: 3,
                borderLeftColor: kpis.topDefaulter
                  ? colors.error
                  : colors.success,
              },
            ]}
          >
            <View style={styles.kpiHeaderCompact}>
              <Text
                style={[
                  styles.kpiLabelCompact,
                  { color: colors.textSecondary, fontFamily: FONTS.medium },
                ]}
                numberOfLines={1}
              >
                Top Defaulter
              </Text>
              <MaterialIcons
                name={kpis.topDefaulter ? "warning" : "check-circle"}
                size={14}
                color={kpis.topDefaulter ? colors.error : colors.success}
              />
            </View>
            <Text
              style={[
                styles.kpiValueCompact,
                {
                  color: kpis.topDefaulter ? colors.error : colors.success,
                  fontFamily: FONTS.bold,
                },
              ]}
              numberOfLines={1}
            >
              {kpis.topDefaulter
                ? kpis.topDefaulter.isUnassigned
                  ? "Unassigned"
                  : formatUserName(kpis.topDefaulter.teacher?.name)
                : "All Clear! 🎉"}
            </Text>
            {kpis.topDefaulter && (
              <Text
                style={[
                  styles.kpiSubTextCompact,
                  { color: colors.error, fontFamily: FONTS.medium },
                ]}
              >
                {kpis.topDefaulter.missedCount} Missed Day
                {kpis.topDefaulter.missedCount > 1 ? "s" : ""}
              </Text>
            )}
          </View>

          {/* Card 2: Total Missed */}
          <View
            style={[
              styles.kpiCardCompact,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.kpiHeaderCompact}>
              <Text
                style={[
                  styles.kpiLabelCompact,
                  { color: colors.textSecondary, fontFamily: FONTS.medium },
                ]}
                numberOfLines={1}
              >
                Total Missed
              </Text>
              <MaterialIcons
                name="event-busy"
                size={14}
                color={colors.primary}
              />
            </View>
            <Text
              style={[
                styles.kpiNumberCompact,
                { color: colors.textPrimary, fontFamily: FONTS.bold },
              ]}
            >
              {kpis.totalMissedSessions}
            </Text>
            <Text
              style={[
                styles.kpiSubTextCompact,
                { color: colors.textSecondary, fontFamily: FONTS.regular },
              ]}
            >
              Class sessions
            </Text>
          </View>

          {/* Card 3: Compliance Rate */}
          <View
            style={[
              styles.kpiCardCompact,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.kpiHeaderCompact}>
              <Text
                style={[
                  styles.kpiLabelCompact,
                  { color: colors.textSecondary, fontFamily: FONTS.medium },
                ]}
                numberOfLines={1}
              >
                Compliance
              </Text>
              <MaterialIcons
                name="donut-large"
                size={14}
                color={
                  kpis.overallCompliance >= 90 ? colors.success : "#E27200"
                }
              />
            </View>
            <Text
              style={[
                styles.kpiNumberCompact,
                {
                  color:
                    kpis.overallCompliance >= 90 ? colors.success : "#E27200",
                  fontFamily: FONTS.bold,
                },
              ]}
            >
              {kpis.overallCompliance}%
            </Text>
            <Text
              style={[
                styles.kpiSubTextCompact,
                { color: colors.textSecondary, fontFamily: FONTS.regular },
              ]}
            >
              On-time rate
            </Text>
          </View>

          {/* Card 4: Clean Record */}
          <View
            style={[
              styles.kpiCardCompact,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.kpiHeaderCompact}>
              <Text
                style={[
                  styles.kpiLabelCompact,
                  { color: colors.textSecondary, fontFamily: FONTS.medium },
                ]}
                numberOfLines={1}
              >
                Clean Record
              </Text>
              <MaterialIcons
                name="workspace-premium"
                size={14}
                color={colors.success}
              />
            </View>
            <Text
              style={[
                styles.kpiNumberCompact,
                { color: colors.success, fontFamily: FONTS.bold },
              ]}
            >
              {kpis.cleanTeachersCount} / {kpis.assignedTeachersCount || 0}
            </Text>
            <Text
              style={[
                styles.kpiSubTextCompact,
                { color: colors.textSecondary, fontFamily: FONTS.regular },
              ]}
            >
              Teachers 100%
            </Text>
          </View>
        </View>

        {/* View Switcher (Concise: "Teachers" vs "Daily") */}
        <View style={styles.segmentedWrap}>
          <SegmentedControl
            tabs={viewTabs}
            activeTab={viewMode}
            onTabChange={(key) => {
              setViewMode(key);
              setVisibleCount(PAGE_SIZE);
            }}
          />
        </View>

        {/* --- BY TEACHER VIEW --- */}
        {viewMode === "teacher" && (
          <View style={styles.teacherViewSection}>
            {/* List of Teachers */}
            {isLoading && !refreshing ? (
              <View style={styles.loadingCompact}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[
                    styles.loadingTextCompact,
                    { color: colors.textSecondary, fontFamily: FONTS.regular },
                  ]}
                >
                  Loading tracking data...
                </Text>
              </View>
            ) : sortedTeachers.length === 0 ? (
              <EmptyState
                title="No Teachers Found"
                message="No attendance tracking data available for this period."
                icon="verified"
              />
            ) : (
              <>
                {sortedTeachers.slice(0, visibleCount).map((item, index) => {
                  const teacherId = item.teacher?._id
                    ? String(item.teacher._id)
                    : `unassigned_${index}`;
                  const isExpanded = expandedTeachers.has(teacherId);
                  const severity = getSeverity(item.missedCount);
                  const isTopDefaulter = item.missedCount > 0 && index < 3;

                  return (
                    <View
                      key={teacherId}
                      style={[
                        styles.teacherCardCompact,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isExpanded
                            ? severity.color + "50"
                            : colors.border,
                          borderLeftWidth: 3,
                          borderLeftColor: severity.color,
                        },
                      ]}
                    >
                      {/* Top Row: Rank, Avatar, Name & Severity Badge */}
                      <View style={styles.cardHeaderRowCompact}>
                        <View style={styles.teacherLeftCompact}>
                          {isTopDefaulter && (
                            <View
                              style={[
                                styles.rankBadgeCompact,
                                {
                                  backgroundColor:
                                    index === 0
                                      ? colors.error
                                      : index === 1
                                      ? "#E27200"
                                      : colors.primary,
                                },
                              ]}
                            >
                              <Text style={styles.rankBadgeTextCompact}>
                                #{index + 1}
                              </Text>
                            </View>
                          )}

                          {item.isUnassigned ? (
                            <View
                              style={[
                                styles.unassignedAvatarCompact,
                                { backgroundColor: colors.error + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name="no-accounts"
                                size={18}
                                color={colors.error}
                              />
                            </View>
                          ) : (
                            <UserAvatar
                              photoUrl={item.teacher?.profilePhoto}
                              name={formatUserName(item.teacher?.name)}
                              role={item.teacher?.role}
                              size={34}
                            />
                          )}

                          <View style={styles.teacherInfoCompact}>
                            <Text
                              style={[
                                styles.teacherNameCompact,
                                {
                                  color: colors.textPrimary,
                                  fontFamily: FONTS.bold,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {item.isUnassigned
                                ? "Unassigned Classes"
                                : formatUserName(item.teacher?.name)}
                            </Text>
                            <Text
                              style={[
                                styles.teacherRoleCompact,
                                {
                                  color: colors.textSecondary,
                                  fontFamily: FONTS.regular,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {item.isUnassigned
                                ? "No class teacher assigned"
                                : formatUserDesignationOrRole(item.teacher)}
                            </Text>
                          </View>
                        </View>

                        {/* Severity Pill */}
                        <View
                          style={[
                            styles.severityPillCompact,
                            {
                              backgroundColor: severity.bg,
                              borderColor: severity.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.severityPillTextCompact,
                              {
                                color: severity.color,
                                fontFamily: FONTS.bold,
                              },
                            ]}
                          >
                            {item.missedCount > 0
                              ? `${item.missedCount} Missed`
                              : "100%"}
                          </Text>
                        </View>
                      </View>

                      {/* Middle Row: Assigned Classes & Inline Compliance */}
                      <View style={styles.cardMidRowCompact}>
                        <View style={styles.classChipsWrapCompact}>
                          {item.classes && item.classes.length > 0 ? (
                            item.classes.map((cls) => (
                              <View
                                key={cls._id}
                                style={[
                                  styles.classChipCompact,
                                  {
                                    backgroundColor: isDark
                                      ? colors.surfaceContainerHigh
                                      : colors.surfaceContainer,
                                    borderColor: colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.classChipTextCompact,
                                    {
                                      color: colors.textPrimary,
                                      fontFamily: FONTS.semiBold,
                                    },
                                  ]}
                                >
                                  {formatClassName(cls.name, cls.section)}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text
                              style={[
                                styles.noClassTextCompact,
                                {
                                  color: colors.textSecondary,
                                  fontFamily: FONTS.regular,
                                },
                              ]}
                            >
                              None
                            </Text>
                          )}
                        </View>

                        <Text
                          style={[
                            styles.complianceInlineText,
                            {
                              color:
                                item.complianceRate >= 90
                                  ? colors.success
                                  : item.complianceRate >= 70
                                  ? "#E27200"
                                  : colors.error,
                              fontFamily: FONTS.semiBold,
                            },
                          ]}
                        >
                          {item.complianceRate}% on-time
                        </Text>
                      </View>

                      {/* Slim 3px Progress Bar */}
                      <View
                        style={[
                          styles.progressBarBgCompact,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceContainerHighest
                              : colors.surfaceContainerHigh,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBarFillCompact,
                            {
                              width: `${Math.min(100, Math.max(4, item.complianceRate))}%`,
                              backgroundColor:
                                item.complianceRate >= 90
                                  ? colors.success
                                  : item.complianceRate >= 70
                                  ? "#E27200"
                                  : colors.error,
                            },
                          ]}
                        />
                      </View>

                      {/* Footer: Expand Breakdown & Actions */}
                      <View
                        style={[
                          styles.cardFooterCompact,
                          {
                            borderTopColor: colors.border,
                          },
                        ]}
                      >
                        {item.missedCount > 0 ? (
                          <TouchableOpacity
                            onPress={() => toggleExpand(teacherId)}
                            style={styles.expandBtnCompact}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.expandBtnTextCompact,
                                {
                                  color: colors.primary,
                                  fontFamily: FONTS.semiBold,
                                },
                              ]}
                            >
                              {isExpanded
                                ? "Hide"
                                : `${item.missedCount} missed date${
                                    item.missedCount > 1 ? "s" : ""
                                  }`}
                            </Text>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={14}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.perfectRecordRowCompact}>
                            <Ionicons
                              name="checkmark-circle"
                              size={13}
                              color={colors.success}
                            />
                            <Text
                              style={[
                                styles.perfectRecordTextCompact,
                                {
                                  color: colors.success,
                                  fontFamily: FONTS.medium,
                                },
                              ]}
                            >
                              All records submitted
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Expandable Breakdown of Missed Dates */}
                      {isExpanded && item.missedDays && (
                        <View
                          style={[
                            styles.expandedBoxCompact,
                            {
                              backgroundColor: isDark
                                ? colors.surfaceContainer
                                : colors.surfaceContainerLow,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          {item.missedDays.map((missed, idx) => (
                            <View
                              key={`${missed.date}_${missed.classId}_${idx}`}
                              style={[
                                styles.missedRowCompact,
                                {
                                  borderBottomColor: colors.border,
                                },
                              ]}
                            >
                              <View style={styles.missedDateColCompact}>
                                <Text
                                  style={[
                                    styles.missedDateLabelCompact,
                                    {
                                      color: colors.textPrimary,
                                      fontFamily: FONTS.medium,
                                    },
                                  ]}
                                >
                                  {formatDisplayDateString(missed.date)}
                                </Text>
                                <Text
                                  style={[
                                    styles.missedClassLabelCompact,
                                    {
                                      color: colors.textSecondary,
                                      fontFamily: FONTS.regular,
                                    },
                                  ]}
                                >
                                  {formatClassName(
                                    missed.className,
                                    missed.classSection
                                  )}
                                </Text>
                              </View>

                              {onNavigateToClassAttendance && (
                                <TouchableOpacity
                                  onPress={() =>
                                    onNavigateToClassAttendance(
                                      {
                                        _id: missed.classId,
                                        name: missed.className,
                                        section: missed.classSection,
                                      },
                                      missed.date
                                    )
                                  }
                                  style={[
                                    styles.markNowMiniBtn,
                                    { backgroundColor: colors.primary },
                                  ]}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.markNowMiniBtnText}>
                                    Mark
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Show More */}
                {visibleCount < sortedTeachers.length && (
                  <TouchableOpacity
                    onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    style={[
                      styles.showMoreBtnCompact,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.primary + "40",
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.showMoreTextCompact,
                        { color: colors.primary, fontFamily: FONTS.semiBold },
                      ]}
                    >
                      Show More ({sortedTeachers.length - visibleCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* --- DAILY VIEW --- */}
        {viewMode === "date" && (
          <View style={styles.dateViewSection}>
            {trackerData.length === 0 ? (
              <EmptyState
                title="No Tracking Data"
                message="No missing attendance for the selected period."
                icon="event-busy"
              />
            ) : (
              <>
                {trackerData.slice(0, visibleCount).map((dayItem) => {
                  const hasMisses = dayItem.missingCount > 0;
                  return (
                    <View
                      key={dayItem.date}
                      style={[
                        styles.dateCardCompact,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderLeftWidth: 3,
                          borderLeftColor: hasMisses
                            ? colors.error
                            : colors.success,
                        },
                      ]}
                    >
                      <View style={styles.dateCardHeaderCompact}>
                        <View style={styles.dateTitleRowCompact}>
                          <MaterialIcons
                            name="calendar-today"
                            size={14}
                            color={colors.textPrimary}
                          />
                          <Text
                            style={[
                              styles.dateCardTitleCompact,
                              {
                                color: colors.textPrimary,
                                fontFamily: FONTS.bold,
                              },
                            ]}
                          >
                            {formatDisplayDateString(dayItem.date)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.dateBadgePillCompact,
                            {
                              backgroundColor: hasMisses
                                ? colors.error + "15"
                                : colors.success + "15",
                              borderColor: hasMisses
                                ? colors.error + "35"
                                : colors.success + "35",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dateBadgeTextCompact,
                              {
                                color: hasMisses
                                  ? colors.error
                                  : colors.success,
                                fontFamily: FONTS.bold,
                              },
                            ]}
                          >
                            {hasMisses
                              ? `${dayItem.missingCount} Missing`
                              : "Complete"}
                          </Text>
                        </View>
                      </View>

                      {hasMisses ? (
                        <View style={styles.dateMissingListCompact}>
                          {(dayItem.missingClasses || []).map((cls, idx) => (
                            <TouchableOpacity
                              key={cls._id || idx}
                              onPress={() =>
                                onNavigateToClassAttendance &&
                                onNavigateToClassAttendance(cls, dayItem.date)
                              }
                              style={[
                                styles.dateClassRowCompact,
                                {
                                  backgroundColor: isDark
                                    ? colors.surfaceContainerHigh
                                    : colors.surfaceContainer,
                                  borderColor: colors.border,
                                },
                              ]}
                              activeOpacity={0.7}
                            >
                              <View style={styles.dateClassInfoCompact}>
                                <Text
                                  style={[
                                    styles.dateClassNameCompact,
                                    {
                                      color: colors.textPrimary,
                                      fontFamily: FONTS.semiBold,
                                    },
                                  ]}
                                >
                                  {formatClassName(cls.name, cls.section)}
                                </Text>
                                <Text
                                  style={[
                                    styles.dateClassTeacherCompact,
                                    {
                                      color: cls.classTeacher?.name
                                        ? colors.textSecondary
                                        : colors.error,
                                      fontFamily: FONTS.regular,
                                    },
                                  ]}
                                >
                                  •{" "}
                                  {cls.classTeacher?.name
                                    ? formatUserName(cls.classTeacher.name)
                                    : "Unassigned"}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.dateMarkTextCompact,
                                  {
                                    color: colors.primary,
                                    fontFamily: FONTS.bold,
                                  },
                                ]}
                              >
                                Mark →
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.dateCompleteTextCompact,
                            {
                              color: colors.textSecondary,
                              fontFamily: FONTS.regular,
                            },
                          ]}
                        >
                          All classes marked attendance on this day.
                        </Text>
                      )}
                    </View>
                  );
                })}

                {visibleCount < trackerData.length && (
                  <TouchableOpacity
                    onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    style={[
                      styles.showMoreBtnCompact,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.primary + "40",
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.showMoreTextCompact,
                        { color: colors.primary, fontFamily: FONTS.semiBold },
                      ]}
                    >
                      Show More ({trackerData.length - visibleCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rangeBarCompact: {
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  rangeScrollContent: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  rangePillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  rangePillTextCompact: {
    fontSize: FONT_SIZES.xs,
  },
  rangeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  rangeBadgeText: {
    fontSize: FONT_SIZES.micro,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },
  kpiGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  kpiCardCompact: {
    flex: 1,
    minWidth: "47%",
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
    padding: 8,
  },
  kpiHeaderCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabelCompact: {
    fontSize: FONT_SIZES.micro,
    flex: 1,
  },
  kpiValueCompact: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  kpiNumberCompact: {
    fontSize: FONT_SIZES.md,
    marginTop: 1,
  },
  kpiSubTextCompact: {
    fontSize: FONT_SIZES.micro,
    marginTop: 1,
  },
  segmentedWrap: {
    marginBottom: 10,
  },
  teacherViewSection: {
    flex: 1,
  },
  loadingCompact: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  loadingTextCompact: {
    fontSize: FONT_SIZES.xs,
  },
  teacherCardCompact: {
    borderRadius: RADIUS.sm || 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  cardHeaderRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  teacherLeftCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  rankBadgeCompact: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rankBadgeTextCompact: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  unassignedAvatarCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherInfoCompact: {
    flex: 1,
  },
  teacherNameCompact: {
    fontSize: FONT_SIZES.sm,
  },
  teacherRoleCompact: {
    fontSize: FONT_SIZES.micro,
  },
  severityPillCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityPillTextCompact: {
    fontSize: FONT_SIZES.micro,
  },
  cardMidRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  classChipsWrapCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  classChipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  classChipTextCompact: {
    fontSize: FONT_SIZES.micro,
  },
  noClassTextCompact: {
    fontSize: FONT_SIZES.micro,
    fontStyle: "italic",
  },
  complianceInlineText: {
    fontSize: FONT_SIZES.micro,
    marginLeft: 6,
  },
  progressBarBgCompact: {
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFillCompact: {
    height: "100%",
    borderRadius: 1.5,
  },
  cardFooterCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  expandBtnCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  expandBtnTextCompact: {
    fontSize: FONT_SIZES.xs,
  },
  perfectRecordRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  perfectRecordTextCompact: {
    fontSize: FONT_SIZES.micro,
  },
  expandedBoxCompact: {
    marginTop: 6,
    borderRadius: RADIUS.xs || 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  missedRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  missedDateColCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  missedDateLabelCompact: {
    fontSize: FONT_SIZES.xs,
  },
  missedClassLabelCompact: {
    fontSize: FONT_SIZES.micro,
  },
  markNowMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  markNowMiniBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  showMoreBtnCompact: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  showMoreTextCompact: {
    fontSize: FONT_SIZES.xs,
  },
  dateViewSection: {
    flex: 1,
  },
  dateCardCompact: {
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  dateCardHeaderCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dateTitleRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateCardTitleCompact: {
    fontSize: FONT_SIZES.sm,
  },
  dateBadgePillCompact: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateBadgeTextCompact: {
    fontSize: FONT_SIZES.micro,
  },
  dateMissingListCompact: {
    gap: 4,
  },
  dateClassRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  dateClassInfoCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateClassNameCompact: {
    fontSize: FONT_SIZES.xs,
  },
  dateClassTeacherCompact: {
    fontSize: FONT_SIZES.micro,
  },
  dateMarkTextCompact: {
    fontSize: FONT_SIZES.micro,
  },
  dateCompleteTextCompact: {
    fontSize: FONT_SIZES.xs,
  },
});
