import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../../hooks/useApi";
import { CACHE_TIERS } from "../../../utils/cacheConfig";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../components/ToastProvider";
import AppHeader from "../../../components/Header";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getISTDateString,
  isISTSunday,
  formatISTDisplayDate,
} from "../../../utils/date";
import { useLabel } from "../../../context/LabelsContext";
import UserAvatar from "../../../components/ui/UserAvatar";
import { formatUserName } from "../../../utils/userFormatters";
import { formatClassName } from "../../../utils/formatClassName";

export default function MarkAttendanceScreen() {
  const _router = useRouter();
  const params = useLocalSearchParams();
  const { _styles, colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLabel();

  const { classId, subjectId, date: initialDate } = params;

  const [selectedDate, setSelectedDate] = useState(
    initialDate ? new Date(initialDate + "T00:00:00") : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [originalStatuses, setOriginalStatuses] = useState({});

  const dateStr = useMemo(() => getISTDateString(selectedDate), [selectedDate]);

  // ─── Cached queries for class & subject (fetched once) ───
  const { data: classData } = useApiQuery(
    ["class", classId],
    `${apiConfig.baseUrl}/classes/${classId}`,
    { enabled: !!classId, ...CACHE_TIERS.STABLE }
  );

  const { data: subjectData } = useApiQuery(
    ["subject", subjectId],
    `${apiConfig.baseUrl}/subjects/${subjectId}`,
    { enabled: !!subjectId, ...CACHE_TIERS.STABLE }
  );

  // ─── Attendance data with silent background refresh ───
  const attendanceEndpoint = useMemo(() => {
    if (subjectId) return `/attendance/subject/${subjectId}/date/${dateStr}`;
    if (classId) return `/attendance/class/${classId}/date/${dateStr}`;
    return null;
  }, [classId, subjectId, dateStr]);

  const attendanceTargetKey = useMemo(() => {
    return subjectId ? `subject_${subjectId}` : `class_${classId}`;
  }, [classId, subjectId]);

  const {
    data: attendanceData,
    isLoading,
    isFetching,
    refetch,
  } = useApiQuery(
    ["attendance", attendanceTargetKey, dateStr],
    `${apiConfig.baseUrl}${attendanceEndpoint}`,
    {
      enabled: !!attendanceEndpoint,
      staleTime: CACHE_TIERS.REAL_TIME.staleTime,
    }
  );

  // ─── Populate local state from query data (with offline roster fallback) ───
  useEffect(() => {
    if (attendanceData && Array.isArray(attendanceData) && attendanceData.length > 0) {
      // Apply on-leave auto-absent logic
      const processed = attendanceData.map((s) =>
        s.onLeave && !s.status ? { ...s, status: "absent" } : s
      );
      setStudents(processed);
      const origMap = {};
      attendanceData.forEach((s) => {
        if (s?.student?._id) {
          origMap[s.student._id] = s.status;
        }
      });
      setOriginalStatuses(origMap);
      setHasUnsavedChanges(false);
    } else if (!isLoading && (!attendanceData || attendanceData.length === 0)) {
      // Offline fallback: load student roster from cached class details
      const cachedClass = queryClient.getQueryData(["classDetails", classId]);
      if (
        cachedClass?.students &&
        Array.isArray(cachedClass.students) &&
        cachedClass.students.length > 0
      ) {
        const fallbackStudents = cachedClass.students.map((student) => ({
          student,
          status: "present", // Default to present for new unrecorded day
          remarks: "",
        }));
        setStudents(fallbackStudents);
        setOriginalStatuses({});
        setHasUnsavedChanges(false);
      }
    }
  }, [attendanceData, isLoading, classId, queryClient]);

  // ─── Save mutation with offline queue & cache invalidation ───
  const saveMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/attendance/mark`,
      "POST"
    ),
    offlineQueue: {
      type: "MARK_ATTENDANCE",
      tag: `attendance_${attendanceTargetKey}_${dateStr}`,
      description: `Attendance: ${classData?.name || subjectData?.name || "Class"} (${dateStr})`,
      url: `${apiConfig.baseUrl}/attendance/mark`,
      method: "POST",
      invalidateKeys: [
        ["attendance", attendanceTargetKey, dateStr],
        ["teacherDashboard"],
        ["adminDashboard"],
      ],
      onOptimisticUpdate: () => {
        // Optimistically update query cache so navigating back/forth keeps saved data
        queryClient.setQueryData(
          ["attendance", attendanceTargetKey, dateStr],
          students
        );
      },
    },
    onSuccess: (_data, _variables, _context, isOfflineQueued) => {
      if (isOfflineQueued) {
        showToast(
          "Attendance saved offline. Will auto-sync when connected.",
          "info"
        );
      } else {
        showToast(
          t("toasts.attendanceSaved", "Attendance saved successfully"),
          "success"
        );
      }
      setHasUnsavedChanges(false);
      const origMap = {};
      students.forEach((s) => {
        if (s?.student?._id) {
          origMap[s.student._id] = s.status;
        }
      });
      setOriginalStatuses(origMap);

      if (!isOfflineQueued) {
        // Invalidate this date's cache so it refetches fresh data
        queryClient.invalidateQueries({
          queryKey: ["attendance", attendanceTargetKey, dateStr],
        });
      }
    },
    onError: (error) => {
      showToast(
        error.message ||
          t("toasts.failedToSaveAttendance", "Failed to save attendance"),
        "error"
      );
    },
  });
  const saving = saveMutation.isPending;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleStatusChange = (studentId, newStatus) => {
    Haptics.selectionAsync().catch(() => {});
    setStudents((prevStudents) =>
      prevStudents.map((s) =>
        s.student._id === studentId ? { ...s, status: newStatus } : s
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleMarkAllPresent = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStudents((prevStudents) =>
      prevStudents.map((s) =>
        s.onLeave ? { ...s, status: "absent" } : { ...s, status: "present" }
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleRequestSave = () => {
    const attendanceRecords = students.filter((s) => s.status !== null);
    if (attendanceRecords.length === 0) {
      showToast(
        t(
          "toasts.markAttendanceAtLeastOne",
          "Please mark attendance for at least one student"
        ),
        "warning"
      );
      return;
    }
    setConfirmModalVisible(true);
  };

  const handleConfirmSave = () => {
    setConfirmModalVisible(false);
    const attendanceRecords = students
      .filter((s) => s.status !== null)
      .map((s) => ({
        studentId: s.student._id,
        status: s.status,
        remarks: s.remarks || "",
      }));

    saveMutation.mutate({
      classId,
      subjectId: subjectId || null,
      date: dateStr,
      attendanceRecords,
    });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return colors.success;
      case "absent":
        return colors.error;
      case "late":
        return colors.warning || "#D97706";
      default:
        return colors.textSecondary;
    }
  };

  const _getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return "check-circle";
      case "absent":
        return "cancel";
      case "late":
        return "schedule";
      default:
        return "radio-button-unchecked";
    }
  };

  // Fetch if current date is holiday
  const { data: holidayData } = useApiQuery(
    ["holidayStatus", dateStr],
    `${apiConfig.baseUrl}/events?startDate=${dateStr}&endDate=${dateStr}&isHoliday=true`,
    CACHE_TIERS.MODERATE
  );
  const holidayEvent =
    holidayData?.event && holidayData.event.length > 0
      ? holidayData.event[0]
      : null;
  const isSunday = isISTSunday(selectedDate);
  const isHoliday = isSunday || !!holidayEvent;
  const holidayReason = isSunday
    ? t("teacher.sundayWeekend", "Sunday (Weekend)")
    : holidayEvent?.title;

  // Computed counts
  const presentCount = useMemo(
    () => students.filter((s) => s.status === "present").length,
    [students]
  );
  const absentCount = useMemo(
    () => students.filter((s) => s.status === "absent").length,
    [students]
  );
  const lateCount = useMemo(
    () => students.filter((s) => s.status === "late").length,
    [students]
  );
  const unmarkedCount = useMemo(
    () => students.filter((s) => !s.status).length,
    [students]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ padding: 16, paddingTop: 24 }}>
          <AppHeader
            title={t("teacher.markAttendance", "Mark Attendance")}
            subtitle={
              subjectData
                ? `${subjectData.name} - ${formatClassName(classData?.name, classData?.section)}`
                : formatClassName(classData?.name, classData?.section)
            }
            showBack={true}
          />

          {/* Date Navigation & Picker */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            <Pressable
              onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }}
              style={({ pressed }) => ({
                backgroundColor: colors.cardBackground,
                padding: 12,
                borderRadius: 12,
                elevation: 2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={colors.primary}
              />
            </Pressable>

            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                padding: 12,
                marginHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                elevation: 2,
                gap: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name="calendar-today"
                size={24}
                color={colors.primary}
              />
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    color: colors.textSecondary,
                    fontFamily: FONTS.medium,
                  }}
                >
                  {t("teacher.selectedDate", "Selected Date")}
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                    marginTop: 2,
                  }}
                >
                  {formatISTDisplayDate(selectedDate, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }}
              style={({ pressed }) => ({
                backgroundColor: colors.cardBackground,
                padding: 12,
                borderRadius: 12,
                elevation: 2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Silent refresh spinner */}
          {isFetching && !isLoading && (
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {isHoliday && (
            <View
              style={{
                backgroundColor: colors.primary + "15",
                marginVertical: 16,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                borderColor: colors.primary,
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.primary,
                }}
              >
                {t("teacher.holiday", "🌴 Holiday")}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  color: colors.textSecondary,
                  marginTop: 4,
                  textAlign: "center",
                  fontFamily: FONTS.regular,
                }}
              >
                {holidayReason}
              </Text>
            </View>
          )}

          {/* Action Buttons — Mark All Present + Save */}
          {!isHoliday && !isLoading && students.length > 0 && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={handleMarkAllPresent}
                accessibilityRole="button"
                accessibilityLabel="Mark all students as present"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  backgroundColor: colors.success + "15",
                  borderWidth: 1.5,
                  borderColor: colors.success,
                  borderRadius: 12,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={colors.success}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                    color: colors.success,
                  }}
                >
                  {t("teacher.allPresent", "All Present")}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleRequestSave}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save Attendance"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => ({
                  flex: 1.5,
                  minHeight: 48,
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: pressed || saving ? 0.7 : 1,
                  elevation: 3,
                })}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="save" size={18} color={colors.onPrimary} />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: colors.onPrimary,
                      }}
                    >
                      {t("teacher.saveAttendance", "Save Attendance")}
                    </Text>
                    {hasUnsavedChanges && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#F59E0B",
                          marginLeft: 2,
                        }}
                      />
                    )}
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* Sticky Summary Card & Visual Progress Bar */}
          {!isHoliday && !isLoading && students.length > 0 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                marginTop: 14,
                marginBottom: 6,
                borderWidth: 1,
                borderColor: colors.outlineVariant || colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: colors.onSurfaceVariant,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Summary ({students.length} Students)
                </Text>
                {hasUnsavedChanges && (
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.medium,
                      color: colors.warning || "#D97706",
                    }}
                  >
                    ● Unsaved changes
                  </Text>
                )}
              </View>

              {/* Progress Breakdown Bar */}
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.surfaceVariant || "#E2E8F0",
                  flexDirection: "row",
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                {presentCount > 0 && (
                  <View
                    style={{
                      flex: presentCount,
                      backgroundColor: colors.success,
                    }}
                  />
                )}
                {lateCount > 0 && (
                  <View
                    style={{
                      flex: lateCount,
                      backgroundColor: colors.warning || "#D97706",
                    }}
                  />
                )}
                {absentCount > 0 && (
                  <View
                    style={{
                      flex: absentCount,
                      backgroundColor: colors.error,
                    }}
                  />
                )}
                {unmarkedCount > 0 && (
                  <View
                    style={{
                      flex: unmarkedCount,
                      backgroundColor: colors.outlineVariant || "#CBD5E1",
                    }}
                  />
                )}
              </View>

              {/* Counts Grid */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.bold,
                      color: colors.success,
                    }}
                  >
                    {presentCount}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    Present ({Math.round((presentCount / (students.length || 1)) * 100)}%)
                  </Text>
                </View>

                <View style={{ width: 1, height: 20, backgroundColor: colors.outlineVariant || "#E2E8F0" }} />

                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.bold,
                      color: colors.error,
                    }}
                  >
                    {absentCount}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    Absent ({Math.round((absentCount / (students.length || 1)) * 100)}%)
                  </Text>
                </View>

                <View style={{ width: 1, height: 20, backgroundColor: colors.outlineVariant || "#E2E8F0" }} />

                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.bold,
                      color: colors.warning || "#D97706",
                    }}
                  >
                    {lateCount}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    Late
                  </Text>
                </View>

                {unmarkedCount > 0 && (
                  <>
                    <View style={{ width: 1, height: 20, backgroundColor: colors.outlineVariant || "#E2E8F0" }} />
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: FONTS.bold,
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        {unmarkedCount}
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.micro,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        Unmarked
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Students List Header */}
          {!isHoliday && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                  }}
                >
                  {t("common.students", "Students")} ({students.length})
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.regular,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Select P / A / L
                </Text>
              </View>

              {isLoading ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: 60,
                  }}
                >
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                students.map((studentData, index) => {
                  const statusColor = studentData.status
                    ? getStatusColor(studentData.status)
                    : null;
                  const borderColor = studentData.onLeave
                    ? (colors.warning || "#D97706")
                    : statusColor;

                  return (
                    <View
                      key={studentData.student._id}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: colors.outlineVariant || colors.border,
                        ...(borderColor && {
                          borderLeftWidth: 4,
                          borderLeftColor: borderColor,
                        }),
                      }}
                    >
                      {/* Top row: name + info */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            minWidth: 0,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <UserAvatar
                            photoUrl={studentData.student.profilePhoto}
                            name={formatUserName(studentData.student.name)}
                            role="student"
                            size={36}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.md,
                                fontFamily: FONTS.semiBold,
                                color: colors.onSurface,
                              }}
                              numberOfLines={1}
                            >
                              {index + 1}. {formatUserName(studentData.student.name)}
                            </Text>
                            {studentData.student.rollNumber && (
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  fontFamily: FONTS.regular,
                                  color: colors.onSurfaceVariant,
                                }}
                              >
                                Roll: {studentData.student.rollNumber}
                              </Text>
                            )}
                          </View>
                        </View>

                        {studentData.onLeave && (
                          <View
                            style={{
                              backgroundColor: (colors.warning || "#D97706") + "20",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              flexShrink: 0,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.micro,
                                fontFamily: FONTS.bold,
                                color: colors.warning || "#D97706",
                              }}
                            >
                              {t("teacher.onLeave", "ON LEAVE")}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Leave reason */}
                      {studentData.onLeave && studentData.leaveReason && (
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            color: colors.warning || "#D97706",
                            marginBottom: 8,
                            fontFamily: FONTS.medium,
                          }}
                        >
                          {t("common.reason", "Reason")}: {studentData.leaveReason}
                        </Text>
                      )}

                      {/* Segmented P / A / L Action Bar (Minimum 44pt touch targets) */}
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          backgroundColor: colors.surfaceVariant || "#F1F5F9",
                          padding: 4,
                          borderRadius: 10,
                        }}
                      >
                        {/* Present Button */}
                        <Pressable
                          onPress={() =>
                            handleStatusChange(studentData.student._id, "present")
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${formatUserName(studentData.student.name)} as present`}
                          accessibilityState={{ selected: studentData.status === "present" }}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          style={({ pressed }) => ({
                            flex: 1,
                            minHeight: 44,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            borderRadius: 8,
                            backgroundColor:
                              studentData.status === "present"
                                ? colors.success
                                : pressed
                                ? colors.success + "20"
                                : "transparent",
                          })}
                        >
                          <MaterialIcons
                            name="check-circle"
                            size={16}
                            color={studentData.status === "present" ? "#FFFFFF" : colors.success}
                          />
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.bold,
                              color:
                                studentData.status === "present"
                                  ? "#FFFFFF"
                                  : colors.success,
                            }}
                          >
                            Present
                          </Text>
                        </Pressable>

                        {/* Absent Button */}
                        <Pressable
                          onPress={() =>
                            handleStatusChange(studentData.student._id, "absent")
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${formatUserName(studentData.student.name)} as absent`}
                          accessibilityState={{ selected: studentData.status === "absent" }}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          style={({ pressed }) => ({
                            flex: 1,
                            minHeight: 44,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            borderRadius: 8,
                            backgroundColor:
                              studentData.status === "absent"
                                ? colors.error
                                : pressed
                                ? colors.error + "20"
                                : "transparent",
                          })}
                        >
                          <MaterialIcons
                            name="cancel"
                            size={16}
                            color={studentData.status === "absent" ? "#FFFFFF" : colors.error}
                          />
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.bold,
                              color:
                                studentData.status === "absent"
                                  ? "#FFFFFF"
                                  : colors.error,
                            }}
                          >
                            Absent
                          </Text>
                        </Pressable>

                        {/* Late Button */}
                        <Pressable
                          onPress={() =>
                            handleStatusChange(studentData.student._id, "late")
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${formatUserName(studentData.student.name)} as late`}
                          accessibilityState={{ selected: studentData.status === "late" }}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          style={({ pressed }) => ({
                            flex: 1,
                            minHeight: 44,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            borderRadius: 8,
                            backgroundColor:
                              studentData.status === "late"
                                ? (colors.warning || "#D97706")
                                : pressed
                                ? (colors.warning || "#D97706") + "20"
                                : "transparent",
                          })}
                        >
                          <MaterialIcons
                            name="schedule"
                            size={16}
                            color={
                              studentData.status === "late"
                                ? "#FFFFFF"
                                : (colors.warning || "#D97706")
                            }
                          />
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.bold,
                              color:
                                studentData.status === "late"
                                  ? "#FFFFFF"
                                  : (colors.warning || "#D97706"),
                            }}
                          >
                            Late
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Bottom Action Bar */}
              {!isLoading && students.length > 0 && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  <Pressable
                    onPress={handleMarkAllPresent}
                    accessibilityRole="button"
                    accessibilityLabel="Mark all students as present"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      backgroundColor: colors.success + "15",
                      borderWidth: 1.5,
                      borderColor: colors.success,
                      borderRadius: 12,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={colors.success}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: colors.success,
                      }}
                    >
                      {t("teacher.allPresent", "All Present")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleRequestSave}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel="Review and save attendance"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={({ pressed }) => ({
                      flex: 1.5,
                      minHeight: 48,
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity: pressed || saving ? 0.7 : 1,
                      elevation: 3,
                    })}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <MaterialIcons name="save" size={18} color={colors.onPrimary} />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            fontFamily: FONTS.bold,
                            color: colors.onPrimary,
                          }}
                        >
                          {t("teacher.saveAttendance", "Save Attendance")}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Sheet Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              width: "100%",
              maxWidth: 420,
              borderWidth: 1,
              borderColor: colors.outlineVariant || colors.border,
              elevation: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="fact-check" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                  }}
                >
                  Submit Attendance
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.regular,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  {formatISTDisplayDate(selectedDate, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {classData?.name ? ` • ${formatClassName(classData.name, classData.section)}` : ""}
                </Text>
              </View>
            </View>

            {/* Breakdown summary */}
            <View
              style={{
                backgroundColor: colors.surfaceVariant || "#F8FAFC",
                borderRadius: 12,
                padding: 12,
                marginVertical: 12,
                gap: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant }}>
                  Total Roster:
                </Text>
                <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.onSurface }}>
                  {students.length} students
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.success }}>
                  ● Present:
                </Text>
                <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.success }}>
                  {presentCount} ({Math.round((presentCount / (students.length || 1)) * 100)}%)
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.error }}>
                  ● Absent:
                </Text>
                <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.error }}>
                  {absentCount} ({Math.round((absentCount / (students.length || 1)) * 100)}%)
                </Text>
              </View>

              {lateCount > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: FONT_SIZES.sm, color: colors.warning || "#D97706" }}>
                    ● Late:
                  </Text>
                  <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.warning || "#D97706" }}>
                    {lateCount} ({Math.round((lateCount / (students.length || 1)) * 100)}%)
                  </Text>
                </View>
              )}

              {unmarkedCount > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant }}>
                    ● Unmarked:
                  </Text>
                  <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.onSurfaceVariant }}>
                    {unmarkedCount}
                  </Text>
                </View>
              )}
            </View>

            {unmarkedCount > 0 && (
              <View
                style={{
                  backgroundColor: (colors.warning || "#D97706") + "15",
                  borderLeftWidth: 3,
                  borderLeftColor: colors.warning || "#D97706",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.warning || "#D97706",
                  }}
                >
                  ⚠️ Warning: {unmarkedCount} student(s) remain unmarked and will not have an attendance entry recorded.
                </Text>
              </View>
            )}

            {/* Modal Actions */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setConfirmModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel and keep editing"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant || colors.border,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.semiBold,
                    color: colors.onSurface,
                  }}
                >
                  Keep Editing
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmSave}
                accessibilityRole="button"
                accessibilityLabel="Confirm and submit attendance"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => ({
                  flex: 1.2,
                  minHeight: 48,
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                    color: colors.onPrimary,
                  }}
                >
                  Confirm & Submit
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
