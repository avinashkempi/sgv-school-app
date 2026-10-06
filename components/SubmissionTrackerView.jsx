import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../theme";
import Card from "./Card";
import Badge from "./ui/Badge";
import UserAvatar from "./ui/UserAvatar";
import ProgressBar from "./ui/ProgressBar";
import TextInput from "./TextInput";
import { EmptyState, LoadingState } from "./StateComponents";
import { formatClassName } from "../utils/formatClassName";
import { useLabel } from "../context/LabelsContext";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * SubmissionTrackerView
 *
 * Modular, reusable submission tracker for school evaluations.
 * Supports:
 * - 'ratings' (Monthly student ratings)
 * - Future modules (Attendance, Appraisals, etc.)
 */
export default function SubmissionTrackerView({
  trackerData,
  isLoading = false,
  month,
  year,
  onNavigateToSubject,
  emptyMessage,
}) {
  const { colors } = useTheme();
  const { t } = useLabel();

  const periodLabel = useMemo(() => {
    if (month && year && month >= 1 && month <= 12) {
      return ` (${MONTH_NAMES[month - 1]} ${year})`;
    }
    return "";
  }, [month, year]);

  const [activeTab, setActiveTab] = useState("teachers"); // 'teachers' | 'classes'
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'pending' | 'completed'
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeachers, setExpandedTeachers] = useState(() => new Set());
  const [expandedClasses, setExpandedClasses] = useState(() => new Set());

  const toggleTeacherExpand = useCallback((id) => {
    Haptics.selectionAsync().catch(() => {});
    setExpandedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleClassExpand = useCallback((id) => {
    Haptics.selectionAsync().catch(() => {});
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const overall = trackerData?.overall || {
    total: 0,
    completed: 0,
    pending: 0,
    percentage: 0,
  };

  const teachers = useMemo(() => {
    return trackerData?.teachers || [];
  }, [trackerData]);

  // Aggregate class-wise breakdown from teachers and subjects
  const classBreakdown = useMemo(() => {
    const classMap = {};

    teachers.forEach((tItem) => {
      (tItem.subjects || []).forEach((s) => {
        const clsId = s.class?._id?.toString() || s.class?.label || "other";
        if (!classMap[clsId]) {
          classMap[clsId] = {
            class: s.class,
            totalSubjects: 0,
            completedSubjects: 0,
            pendingSubjects: 0,
            subjects: [],
          };
        }

        classMap[clsId].totalSubjects += 1;
        if (s.status === "submitted") {
          classMap[clsId].completedSubjects += 1;
        } else {
          classMap[clsId].pendingSubjects += 1;
        }

        classMap[clsId].subjects.push({
          ...s,
          teacherName: tItem.teacher?.name || "Teacher",
        });
      });
    });

    return Object.values(classMap).sort((a, b) => {
      if (a.pendingSubjects !== b.pendingSubjects) {
        return b.pendingSubjects - a.pendingSubjects;
      }
      const labelA = a.class?.label || "";
      const labelB = b.class?.label || "";
      return labelA.localeCompare(labelB);
    });
  }, [teachers]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    let list = teachers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.teacher?.name || "").toLowerCase();
        const desig = (item.teacher?.designation || "").toLowerCase();
        return name.includes(q) || desig.includes(q);
      });
    }

    if (filterMode === "pending") {
      list = list.filter((tItem) => tItem.pending > 0);
    } else if (filterMode === "completed") {
      list = list.filter((tItem) => tItem.pending === 0 && tItem.total > 0);
    }

    return list;
  }, [teachers, searchQuery, filterMode]);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    let list = classBreakdown;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        const name = (c.class?.name || c.class?.label || "").toLowerCase();
        const sec = (c.class?.section || "").toLowerCase();
        return name.includes(q) || sec.includes(q);
      });
    }

    if (filterMode === "pending") {
      list = list.filter((c) => c.pendingSubjects > 0);
    } else if (filterMode === "completed") {
      list = list.filter((c) => c.pendingSubjects === 0 && c.totalSubjects > 0);
    }

    return list;
  }, [classBreakdown, searchQuery, filterMode]);

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 40 }}>
        <LoadingState message="Loading submission tracker..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Overall KPI Progress Card */}
      <Card
        variant="elevated"
        style={styles.kpiCard}
        contentStyle={styles.kpiCardContent}
      >
        <View style={styles.kpiHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiTitle, { color: colors.onSurface }]}>
              {t("tracker.overallSubmission", "Submission Progress")}{periodLabel}
            </Text>
            <Text style={[styles.kpiSubtitle, { color: colors.onSurfaceVariant }]}>
              {overall.completed} of {overall.total} subjects evaluated
            </Text>
          </View>
          <View style={styles.kpiPercentBadge}>
            <Text
              style={[
                styles.kpiPercentText,
                {
                  color:
                    overall.percentage === 100
                      ? colors.success || "#16A34A"
                      : colors.primary,
                },
              ]}
            >
              {overall.percentage}%
            </Text>
          </View>
        </View>

        <View style={{ marginVertical: 12 }}>
          <ProgressBar
            progress={overall.percentage}
            max={100}
            variant={overall.percentage === 100 ? "success" : "primary"}
            height={8}
            borderRadius={4}
          />
        </View>

        <View style={styles.kpiStatPillsRow}>
          <View
            style={[
              styles.kpiStatPill,
              { backgroundColor: colors.surfaceContainerHigh || "#EDEEF2" },
            ]}
          >
            <Text style={[styles.kpiStatPillLabel, { color: colors.onSurfaceVariant }]}>
              Total
            </Text>
            <Text style={[styles.kpiStatPillVal, { color: colors.onSurface }]}>
              {overall.total}
            </Text>
          </View>

          <View
            style={[
              styles.kpiStatPill,
              { backgroundColor: colors.successContainer || "#DCFCE7" },
            ]}
          >
            <Text style={[styles.kpiStatPillLabel, { color: colors.success || "#16A34A" }]}>
              Submitted
            </Text>
            <Text style={[styles.kpiStatPillVal, { color: colors.success || "#16A34A" }]}>
              {overall.completed}
            </Text>
          </View>

          <View
            style={[
              styles.kpiStatPill,
              { backgroundColor: colors.tertiaryContainer || "#FEF3C7" },
            ]}
          >
            <Text style={[styles.kpiStatPillLabel, { color: colors.tertiary || "#D97706" }]}>
              Pending
            </Text>
            <Text style={[styles.kpiStatPillVal, { color: colors.tertiary || "#D97706" }]}>
              {overall.pending}
            </Text>
          </View>
        </View>
      </Card>

      {/* Sub-Tabs: By Teacher vs By Class */}
      <View style={styles.trackerTabsRow}>
        {[
          { key: "teachers", label: `By Teacher (${teachers.length})`, icon: "person" },
          { key: "classes", label: `By Class (${classBreakdown.length})`, icon: "class" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab(tab.key);
              }}
              style={[
                styles.trackerTabBtn,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.surfaceContainer,
                  borderColor: isActive
                    ? colors.primary
                    : colors.outlineVariant,
                },
              ]}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={isActive ? colors.onPrimary : colors.onSurfaceVariant}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.trackerTabBtnText,
                  {
                    color: isActive
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                    fontFamily: isActive ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search & Filter Bar */}
      <View style={{ marginBottom: 10 }}>
        <TextInput
          placeholder={
            activeTab === "teachers"
              ? "Search teacher by name..."
              : "Search class..."
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          clearButton={true}
          size="sm"
        />
      </View>

      {/* Status Filter Pills */}
      <View style={styles.filterPillsRow}>
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "⚠️ Has Pending" },
          { key: "completed", label: "✅ 100% Done" },
        ].map((pill) => {
          const isActive = filterMode === pill.key;
          return (
            <TouchableOpacity
              key={pill.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setFilterMode(pill.key);
              }}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive
                    ? colors.primaryContainer || "#EADDFF"
                    : colors.surfaceContainer,
                  borderColor: isActive
                    ? colors.primary
                    : colors.outlineVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color: isActive
                      ? colors.primary
                      : colors.onSurfaceVariant,
                    fontFamily: isActive ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ────────────────────────────────────────────── */}
      {/*  VIEW: BY TEACHER                              */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === "teachers" && (
        <View style={styles.listContainer}>
          {filteredTeachers.length === 0 ? (
            <EmptyState
              icon="search-off"
              title="No Teachers Found"
              message={
                emptyMessage ||
                "No teachers match the current search or status filter."
              }
            />
          ) : (
            filteredTeachers.map((tItem) => {
              const teacherId = tItem.teacher?._id?.toString();
              const isExpanded = expandedTeachers.has(teacherId);
              const isComplete = tItem.pending === 0 && tItem.total > 0;
              const percent =
                tItem.total > 0
                  ? Math.round((tItem.completed / tItem.total) * 100)
                  : 0;

              return (
                <Card
                  key={teacherId}
                  variant="elevated"
                  style={styles.teacherCard}
                >
                  <TouchableOpacity
                    onPress={() => toggleTeacherExpand(teacherId)}
                    style={styles.teacherCardHeader}
                    activeOpacity={0.7}
                  >
                    <UserAvatar user={tItem.teacher} size={42} />
                    <View style={styles.teacherInfoCol}>
                      <Text
                        style={[styles.teacherName, { color: colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {tItem.teacher?.name || "Teacher"}
                      </Text>
                      <Text
                        style={[
                          styles.teacherDesignation,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {tItem.teacher?.designation || "Faculty"} •{" "}
                        {tItem.total} Subjects
                      </Text>
                    </View>

                    <View style={styles.teacherBadgeCol}>
                      <Badge
                        variant={isComplete ? "success" : "warning"}
                        icon={isComplete ? "check-circle" : "hourglass-top"}
                        label={
                          isComplete
                            ? "Complete"
                            : `${tItem.completed}/${tItem.total}`
                        }
                        size="sm"
                      />
                      <MaterialIcons
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={22}
                        color={colors.onSurfaceVariant}
                        style={{ marginTop: 2 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Mini Progress Line */}
                  <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                    <ProgressBar
                      progress={percent}
                      max={100}
                      variant={isComplete ? "success" : "primary"}
                      height={4}
                      borderRadius={2}
                    />
                  </View>

                  {/* Expanded Subjects Breakdown */}
                  {isExpanded && (
                    <View
                      style={[
                        styles.subjectsExpandedList,
                        {
                          backgroundColor:
                            colors.surfaceContainerLow || "#F9FAFB",
                          borderTopColor: colors.outlineVariant,
                        },
                      ]}
                    >
                      {tItem.subjects?.map((subj, sIdx) => {
                        const isSubjComplete = subj.status === "submitted";
                        const classLabel = formatClassName(
                          subj.class?.name || subj.class?.label || subj.class?.value,
                          subj.class?.section
                        );

                        return (
                          <View
                            key={sIdx}
                            style={[
                              styles.subjectItemRow,
                              {
                                borderBottomColor:
                                  colors.outlineVariant || "#E5E7EB",
                              },
                            ]}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text
                                style={[
                                  styles.subjectItemName,
                                  { color: colors.onSurface },
                                ]}
                                numberOfLines={1}
                              >
                                {subj.subject?.name}
                              </Text>
                              <Text
                                style={[
                                  styles.subjectItemClass,
                                  { color: colors.onSurfaceVariant },
                                ]}
                              >
                                {classLabel} • {subj.ratedCount} /{" "}
                                {subj.totalStudents} Rated
                              </Text>
                            </View>

                            <Badge
                              variant={isSubjComplete ? "success" : "neutral"}
                              label={isSubjComplete ? "Submitted" : "Pending"}
                              size="sm"
                            />

                            {onNavigateToSubject && !isSubjComplete && (
                              <TouchableOpacity
                                onPress={() => onNavigateToSubject(subj)}
                                style={[
                                  styles.quickRateBtn,
                                  {
                                    backgroundColor:
                                      colors.primaryContainer || "#EADDFF",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.quickRateBtnText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  Rate
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* ────────────────────────────────────────────── */}
      {/*  VIEW: BY CLASS                                */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === "classes" && (
        <View style={styles.listContainer}>
          {filteredClasses.length === 0 ? (
            <EmptyState
              icon="search-off"
              title="No Classes Found"
              message="No classes match the current search or status filter."
            />
          ) : (
            filteredClasses.map((cItem, cIdx) => {
              const clsId = cItem.class?._id?.toString() || cIdx;
              const isExpanded = expandedClasses.has(clsId);
              const isComplete = cItem.pendingSubjects === 0 && cItem.totalSubjects > 0;
              const classLabel = formatClassName(
                cItem.class?.name || cItem.class?.label || cItem.class?.value,
                cItem.class?.section
              );
              const percent =
                cItem.totalSubjects > 0
                  ? Math.round(
                      (cItem.completedSubjects / cItem.totalSubjects) * 100
                    )
                  : 0;

              return (
                <Card key={clsId} variant="elevated" style={styles.teacherCard}>
                  <TouchableOpacity
                    onPress={() => toggleClassExpand(clsId)}
                    style={styles.teacherCardHeader}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.classIconCircle,
                        {
                          backgroundColor:
                            colors.primaryContainer || "#EADDFF",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="class"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.teacherInfoCol}>
                      <Text
                        style={[styles.teacherName, { color: colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {classLabel}
                      </Text>
                      <Text
                        style={[
                          styles.teacherDesignation,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {cItem.completedSubjects} of {cItem.totalSubjects} subjects
                        submitted
                      </Text>
                    </View>

                    <View style={styles.teacherBadgeCol}>
                      <Badge
                        variant={isComplete ? "success" : "warning"}
                        icon={isComplete ? "check-circle" : "hourglass-top"}
                        label={
                          isComplete
                            ? "Complete"
                            : `${cItem.completedSubjects}/${cItem.totalSubjects}`
                        }
                        size="sm"
                      />
                      <MaterialIcons
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={22}
                        color={colors.onSurfaceVariant}
                        style={{ marginTop: 2 }}
                      />
                    </View>
                  </TouchableOpacity>

                  <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                    <ProgressBar
                      progress={percent}
                      max={100}
                      variant={isComplete ? "success" : "primary"}
                      height={4}
                      borderRadius={2}
                    />
                  </View>

                  {/* Expanded Subjects in this Class */}
                  {isExpanded && (
                    <View
                      style={[
                        styles.subjectsExpandedList,
                        {
                          backgroundColor:
                            colors.surfaceContainerLow || "#F9FAFB",
                          borderTopColor: colors.outlineVariant,
                        },
                      ]}
                    >
                      {cItem.subjects?.map((subj, sIdx) => {
                        const isSubjComplete = subj.status === "submitted";
                        return (
                          <View
                            key={sIdx}
                            style={[
                              styles.subjectItemRow,
                              {
                                borderBottomColor:
                                  colors.outlineVariant || "#E5E7EB",
                              },
                            ]}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text
                                style={[
                                  styles.subjectItemName,
                                  { color: colors.onSurface },
                                ]}
                                numberOfLines={1}
                              >
                                {subj.subject?.name}
                              </Text>
                              <Text
                                style={[
                                  styles.subjectItemClass,
                                  { color: colors.onSurfaceVariant },
                                ]}
                              >
                                Teacher: {subj.teacherName} • {subj.ratedCount} /{" "}
                                {subj.totalStudents} Rated
                              </Text>
                            </View>

                            <Badge
                              variant={isSubjComplete ? "success" : "neutral"}
                              label={isSubjComplete ? "Submitted" : "Pending"}
                              size="sm"
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  kpiCard: {
    marginBottom: 14,
  },
  kpiCardContent: {
    padding: 16,
  },
  kpiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  kpiSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  kpiPercentBadge: {
    alignItems: "flex-end",
  },
  kpiPercentText: {
    fontSize: 26,
    fontFamily: FONTS.bold,
  },
  kpiStatPillsRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiStatPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  kpiStatPillLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginBottom: 2,
  },
  kpiStatPillVal: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  trackerTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  trackerTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  trackerTabBtnText: {
    fontSize: FONT_SIZES.xs,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
  },
  listContainer: {
    gap: 8,
  },
  teacherCard: {
    marginBottom: 8,
  },
  teacherCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  teacherInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  teacherName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  teacherDesignation: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  teacherBadgeCol: {
    alignItems: "flex-end",
  },
  classIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectsExpandedList: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subjectItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  subjectItemName: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  subjectItemClass: {
    fontSize: 11,
    marginTop: 2,
  },
  quickRateBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  quickRateBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
});
