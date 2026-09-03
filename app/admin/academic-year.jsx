import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import apiConfig from "../../config/apiConfig";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";
import { formatDate } from "../../utils/date";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../../utils/userFormatters";

export default function AcademicYearScreen() {
  const _router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("years"); // "years" | "reports"
  const [showModal, setShowModal] = useState(false);
  const [showYearPickerModal, setShowYearPickerModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch User Role
  const { data: userData } = useApiQuery(
    ["currentUser"],
    `${apiConfig.baseUrl}/auth/me`,
    { select: (data) => data.user }
  );
  const userRole = userData?.role;

  // Fetch Academic Years
  const { data: years = [], refetch: refetchYears } = useApiQuery(
    ["academicYears"],
    `${apiConfig.baseUrl}/academic-year`
  );

  // Fetch Reports
  const {
    data: reportData,
    isLoading: reportLoading,
    refetch: refetchReport,
  } = useApiQuery(
    ["academicYearReport", selectedYearId],
    `${apiConfig.baseUrl}/academic-year/${selectedYearId}/reports`,
    {
      enabled: !!selectedYearId && activeTab === "reports",
    }
  );

  // Supplementary queries for robust student distribution calculation
  const { data: initClassesData, refetch: refetchClasses } = useApiQuery(
    ["adminClassesInit"],
    `${apiConfig.baseUrl}/classes/admin/init`,
    {
      enabled: activeTab === "reports",
    }
  );

  const { data: studentsResponse, refetch: refetchStudents } = useApiQuery(
    ["allStudentsForReports"],
    `${apiConfig.baseUrl}/users?role=student&limit=1000`,
    {
      enabled: activeTab === "reports",
    }
  );

  // Consolidated & defensive teacher attendance data
  const { processedTeacherAttendance, teacherAttendanceSummary } =
    useMemo(() => {
      if (
        !reportData?.teacherAttendance ||
        !Array.isArray(reportData.teacherAttendance)
      ) {
        return {
          processedTeacherAttendance: [],
          teacherAttendanceSummary:
            reportData?.teacherAttendanceSummary || null,
        };
      }

      const rawList = reportData.teacherAttendance;
      const isConsolidated =
        rawList.length > 0 && rawList[0].totalDays !== undefined;

      let processed = [];
      if (isConsolidated) {
        processed = rawList.map((item) => {
          const total = item.totalDays ?? 0;
          const present = item.presentDays ?? 0;
          const pct =
            item.percentage !== undefined
              ? item.percentage
              : total > 0
              ? parseFloat(((present / total) * 100).toFixed(1))
              : 0;
          return {
            id: item._id || item.userId || item.name,
            name: item.name || item.user || "Staff Member",
            role: item.role || "teacher",
            designation: item.designation || null,
            email: item.email || "",
            totalDays: total,
            presentDays: present,
            absentDays: item.absentDays ?? 0,
            lateDays: item.lateDays ?? 0,
            halfDays: item.halfDays ?? 0,
            excusedDays: item.excusedDays ?? 0,
            percentage: pct,
          };
        });
      } else {
        // Defensive client-side consolidation for legacy response format
        const teacherMap = {};
        rawList.forEach((item) => {
          const name = item.user || item.name || "Staff Member";
          if (!teacherMap[name]) {
            teacherMap[name] = {
              id: name,
              name,
              role: item.role || "teacher",
              designation: item.designation || null,
              totalDays: 0,
              presentDays: 0,
              absentDays: 0,
              halfDays: 0,
            };
          }
          const count = Number(item.count || 0);
          teacherMap[name].totalDays += count;
          if (
            ["present", "half-day"].includes(item.status)
          ) {
            teacherMap[name].presentDays += count;
          }
          if (item.status === "absent") teacherMap[name].absentDays += count;
          if (item.status === "half-day") teacherMap[name].halfDays += count;
        });
        processed = Object.values(teacherMap).map((t) => ({
          ...t,
          percentage:
            t.totalDays > 0
              ? parseFloat(((t.presentDays / t.totalDays) * 100).toFixed(1))
              : 0,
        }));
      }

      // Calculate or retrieve summary
      const summary =
        reportData.teacherAttendanceSummary ||
        (() => {
          const tracked = processed.filter((t) => t.totalDays > 0);
          const avgPct =
            tracked.length > 0
              ? parseFloat(
                  (
                    tracked.reduce((sum, t) => sum + t.percentage, 0) /
                    tracked.length
                  ).toFixed(1)
                )
              : 0;
          return {
            totalStaff: processed.length,
            trackedStaff: tracked.length,
            averagePercentage: avgPct,
            totalPresentDays: processed.reduce(
              (sum, t) => sum + t.presentDays,
              0
            ),
            totalAbsentDays: processed.reduce(
              (sum, t) => sum + t.absentDays,
              0
            ),
          };
        })();

      return {
        processedTeacherAttendance: processed,
        teacherAttendanceSummary: summary,
      };
    }, [reportData?.teacherAttendance, reportData?.teacherAttendanceSummary]);

  // Student Distribution entries & summary (with client-side fallback)
  const { classDistributionEntries, totalStudentsCount, totalClassesCount } =
    useMemo(() => {
      const rawClassWise = reportData?.classWiseStudents || {};
      const rawEntries = Object.entries(rawClassWise);

      let reportStudentCount = 0;
      rawEntries.forEach(([_name, students]) => {
        const count = Array.isArray(students)
          ? students.length
          : typeof students === "number"
          ? students
          : students?.count ?? 0;
        reportStudentCount += count;
      });

      // If reportData already provides populated classWiseStudents with students, use it
      if (rawEntries.length > 0 && reportStudentCount > 0) {
        return {
          classDistributionEntries: rawEntries,
          totalStudentsCount: reportData?.totalStudents ?? reportStudentCount,
          totalClassesCount: reportData?.totalClassesCount ?? rawEntries.length,
        };
      }

      // Fallback: Compute distribution from initClassesData and studentsResponse
      const fallbackMap = {};
      const classesList = initClassesData?.classes || [];
      const studentsList =
        studentsResponse?.users ||
        studentsResponse?.data ||
        (Array.isArray(studentsResponse) ? studentsResponse : []);

      const isCurrentSelectedYearActive = years.find(
        (y) => y._id === selectedYearId
      )?.isActive;

      // Filter relevant classes for the selected year
      const matchingClasses = classesList.filter((cls) => {
        if (!cls.academicYear) return isCurrentSelectedYearActive;
        const clsYearId =
          typeof cls.academicYear === "object"
            ? cls.academicYear._id
            : cls.academicYear;
        return (
          clsYearId === selectedYearId ||
          (isCurrentSelectedYearActive && !clsYearId)
        );
      });

      const targetClasses =
        matchingClasses.length > 0
          ? matchingClasses
          : isCurrentSelectedYearActive
          ? classesList
          : [];

      // Helper to format class display name
      const getDisplayName = (cls) => {
        if (!cls) return "Unassigned";
        const base = cls.label || cls.name || "Unnamed Class";
        const sec =
          cls.section && !base.toLowerCase().includes(cls.section.toLowerCase())
            ? ` - ${cls.section}`
            : "";
        const br =
          cls.branch &&
          cls.branch !== "Main" &&
          !base.toLowerCase().includes(cls.branch.toLowerCase())
            ? ` (${cls.branch})`
            : "";
        return `${base}${sec}${br}`.trim();
      };

      // Initialize classes from class list
      targetClasses.forEach((cls) => {
        const name = getDisplayName(cls);
        if (cls.studentCount !== undefined && cls.studentCount > 0) {
          fallbackMap[name] = cls.studentCount;
        } else {
          fallbackMap[name] = 0;
        }
      });

      // Tally from student list if available
      if (studentsList.length > 0) {
        const yearStudents = studentsList.filter((s) => {
          const sYearId =
            typeof s.academicYear === "object"
              ? s.academicYear?._id
              : s.academicYear;
          if (sYearId && sYearId === selectedYearId) return true;
          if (!sYearId && isCurrentSelectedYearActive) return true;
          if (s.currentClass) {
            const sClassId =
              typeof s.currentClass === "object"
                ? s.currentClass._id
                : s.currentClass;
            return targetClasses.some((c) => c._id === sClassId);
          }
          return false;
        });

        if (yearStudents.length > 0) {
          targetClasses.forEach((cls) => {
            fallbackMap[getDisplayName(cls)] = 0;
          });

          yearStudents.forEach((student) => {
            let className = "Unassigned";
            if (student.currentClass) {
              if (typeof student.currentClass === "object") {
                className = getDisplayName(student.currentClass);
              } else {
                const foundCls = targetClasses.find(
                  (c) => c._id === student.currentClass
                );
                if (foundCls) className = getDisplayName(foundCls);
              }
            }
            if (fallbackMap[className] === undefined) {
              fallbackMap[className] = 0;
            }
            fallbackMap[className] += 1;
          });
        }
      }

      const fallbackEntries = Object.entries(fallbackMap);
      let totalCount = 0;
      fallbackEntries.forEach(([_name, count]) => {
        totalCount +=
          typeof count === "number"
            ? count
            : Array.isArray(count)
            ? count.length
            : 0;
      });

      if (fallbackEntries.length > 0) {
        return {
          classDistributionEntries: fallbackEntries,
          totalStudentsCount: totalCount,
          totalClassesCount: fallbackEntries.length,
        };
      }

      return {
        classDistributionEntries: rawEntries,
        totalStudentsCount: reportStudentCount,
        totalClassesCount: rawEntries.length,
      };
    }, [
      reportData?.classWiseStudents,
      reportData?.totalStudents,
      reportData?.totalClassesCount,
      initClassesData?.classes,
      studentsResponse,
      selectedYearId,
      years,
    ]);

  // Set default selected year (prefer active academic year)
  useEffect(() => {
    if (years.length > 0 && !selectedYearId) {
      const activeYear = years.find((y) => y.isActive);
      setSelectedYearId(activeYear ? activeYear._id : years[0]._id);
    }
  }, [years, selectedYearId]);

  // Mutations
  const createYearMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/academic-year`,
      "POST"
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      showToast("Academic Year created", "success");
      setShowModal(false);
      setForm({ name: "", startDate: "", endDate: "", isActive: false });
    },
    onError: (error) => showToast(error.message || "Failed to create", "error"),
  });

  const incrementYearMutation = useApiMutation({
    mutationFn: (nextYearId) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/academic-year/increment`,
        "POST"
      )({ nextYearId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      showToast("Year Incremented & Students Promoted!", "success");
    },
    onError: (error) =>
      showToast(error.message || "Failed to increment year", "error"),
  });

  const handleCreate = () => {
    if (!form.name || !form.startDate || !form.endDate) {
      showToast("Please fill all fields", "error");
      return;
    }

    // Validate format YYYY-YYYY
    if (!/^\d{4}-\d{4}$/.test(form.name)) {
      showToast("Name must be in YYYY-YYYY format", "error");
      return;
    }

    createYearMutation.mutate(form);
  };

  const handleIncrement = (id, name) => {
    Alert.alert(
      "Activate & Promote",
      `WARNING: This will activate ${name}, promote all eligible students to the next class, and create history records for the current year. This action cannot be easily undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: () => incrementYearMutation.mutate(id),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchYears(),
      refetchReport(),
      refetchClasses ? refetchClasses() : Promise.resolve(),
      refetchStudents ? refetchStudents() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const renderYearsTab = () => (
    <View style={{ marginTop: 16 }}>
      {years.map((year) => (
        <View
          key={year._id}
          style={{
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderWidth: year.isActive ? 2 : 1,
            borderColor: year.isActive ? colors.primary : colors.outlineVariant,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
              }}
            >
              {year.name}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.regular,
                color: colors.onSurfaceVariant,
                marginTop: 4,
              }}
            >
              {formatDate(year.startDate)} - {formatDate(year.endDate)}
            </Text>
            {year.isActive && (
              <View
                style={{
                  backgroundColor: colors.primary + "20",
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 6,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                  }}
                >
                  ACTIVE
                </Text>
              </View>
            )}
          </View>

          {!year.isActive && userRole === "super admin" && (
            <Pressable
              onPress={() => handleIncrement(year._id, year.name)}
              disabled={incrementYearMutation.isPending}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.primaryContainer
                  : "transparent",
                borderWidth: 1,
                borderColor: colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                opacity: incrementYearMutation.isPending ? 0.6 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              })}
            >
              {incrementYearMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="sync" size={16} color={colors.primary} />
              )}
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: FONTS.bold,
                  fontSize: FONT_SIZES.sm,
                }}
              >
                {incrementYearMutation.isPending
                  ? "Processing..."
                  : "Activate & Promote"}
              </Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );

  const renderReportsTab = () => (
    <View style={{ marginTop: 16 }}>
      {/* Year Selector */}
      <View
        style={{
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.outlineVariant + "40",
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: colors.primary + "15",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="calendar-today"
              size={16}
              color={colors.primary}
            />
          </View>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.bold,
              color: colors.onSurfaceVariant,
              letterSpacing: 0.3,
            }}
          >
            Academic Year
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowYearPickerModal(true);
          }}
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? colors.surfaceContainerHighest
              : colors.surfaceContainerHigh,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.outlineVariant + "50",
            paddingHorizontal: 16,
            paddingVertical: 13,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flex: 1,
            }}
          >
            <MaterialIcons
              name="calendar-today"
              size={18}
              color={colors.primary}
            />
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.medium,
                color: colors.onSurface,
              }}
            >
              {years.find((y) => y._id === selectedYearId)?.name ||
                "Select Academic Year"}
            </Text>
            {years.find((y) => y._id === selectedYearId)?.isActive && (
              <View
                style={{
                  backgroundColor:
                    colors.primaryContainer || colors.primary + "18",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: colors.primary,
                  }}
                >
                  Active
                </Text>
              </View>
            )}
          </View>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={22}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      {reportLoading ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reportData ? (
        <View>
          {/* Student Summary */}
          <View style={localStyles.card(colors)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <MaterialIcons name="people" size={20} color={colors.primary} />
                <Text style={localStyles.cardTitle(colors)}>
                  Student Distribution
                </Text>
              </View>
              {totalStudentsCount > 0 && (
                <View
                  style={{
                    backgroundColor:
                      colors.primaryContainer || colors.primary + "18",
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.bold,
                      color: colors.onPrimaryContainer || colors.primary,
                    }}
                  >
                    {totalStudentsCount}{" "}
                    {totalStudentsCount === 1 ? "Student" : "Students"}
                  </Text>
                </View>
              )}
            </View>

            {/* Overall Student Stats */}
            {classDistributionEntries.length > 0 && totalStudentsCount > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor:
                    colors.surfaceContainer ||
                    colors.surfaceContainerHigh ||
                    "#f1f5f9",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  justifyContent: "space-around",
                  alignItems: "center",
                }}
              >
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.bold,
                      color: colors.primary,
                    }}
                  >
                    {totalStudentsCount}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    Total Enrolled
                  </Text>
                </View>
                <View
                  style={{
                    width: 1,
                    height: 24,
                    backgroundColor: colors.outlineVariant + "40",
                  }}
                />
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                    }}
                  >
                    {totalClassesCount}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    Total Classes
                  </Text>
                </View>
                <View
                  style={{
                    width: 1,
                    height: 24,
                    backgroundColor: colors.outlineVariant + "40",
                  }}
                />
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.bold,
                      color: colors.secondary,
                    }}
                  >
                    {totalClassesCount > 0
                      ? (totalStudentsCount / totalClassesCount).toFixed(1)
                      : 0}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    Avg / Class
                  </Text>
                </View>
              </View>
            )}

            {classDistributionEntries.length > 0 ? (
              classDistributionEntries.map(([className, students], index) => {
                const count = Array.isArray(students)
                  ? students.length
                  : typeof students === "number"
                  ? students
                  : students?.count ?? 0;
                return (
                  <View
                    key={className}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth:
                        index < classDistributionEntries.length - 1 ? 1 : 0,
                      borderBottomColor: colors.outlineVariant + "30",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      <MaterialIcons
                        name="school"
                        size={18}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={{
                          color: colors.onSurface,
                          fontFamily: FONTS.medium,
                          fontSize: FONT_SIZES.sm,
                          flex: 1,
                        }}
                      >
                        {className}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor:
                          count > 0
                            ? colors.primaryContainer || colors.primary + "18"
                            : colors.surfaceContainerHigh || "#f1f5f9",
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            count > 0
                              ? colors.onPrimaryContainer || colors.primary
                              : colors.onSurfaceVariant,
                          fontFamily: FONTS.bold,
                          fontSize: FONT_SIZES.sm,
                        }}
                      >
                        {count} {count === 1 ? "student" : "students"}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                }}
              >
                <MaterialIcons
                  name="info-outline"
                  size={16}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={{
                    color: colors.onSurfaceVariant,
                    fontFamily: FONTS.medium,
                  }}
                >
                  No student distribution data recorded for this academic year.
                </Text>
              </View>
            )}
          </View>

          {/* Teacher Leaves */}
          <View style={localStyles.card(colors)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <MaterialIcons name="event-busy" size={20} color={colors.error} />
              <Text style={localStyles.cardTitle(colors)}>Teacher Leaves</Text>
            </View>
            {reportData.teacherLeaves && reportData.teacherLeaves.length > 0 ? (
              reportData.teacherLeaves.map((leave, index) => (
                <View
                  key={index}
                  style={{
                    marginBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.outlineVariant + "40",
                    paddingBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontFamily: FONTS.bold,
                      fontSize: FONT_SIZES.sm,
                    }}
                  >
                    {leave.applicant?.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                      fontSize: FONT_SIZES.sm,
                      marginTop: 2,
                    }}
                  >
                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}{" "}
                    ({leave.leaveType})
                  </Text>
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                      fontSize: FONT_SIZES.sm,
                    }}
                  >
                    Reason: {leave.reason}
                  </Text>
                </View>
              ))
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                }}
              >
                <MaterialIcons
                  name="check-circle"
                  size={16}
                  color={colors.success}
                />
                <Text
                  style={{
                    color: colors.onSurfaceVariant,
                    fontFamily: FONTS.medium,
                  }}
                >
                  No leaves recorded.
                </Text>
              </View>
            )}
          </View>

          {/* Teacher Attendance Summary */}
          <View style={localStyles.card(colors)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <MaterialIcons
                  name="fact-check"
                  size={20}
                  color={colors.secondary}
                />
                <Text style={localStyles.cardTitle(colors)}>
                  Teacher Attendance Stats
                </Text>
              </View>
            </View>

            {/* Overall KPIs */}
            {teacherAttendanceSummary &&
              teacherAttendanceSummary.totalStaff > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor:
                      colors.surfaceContainer ||
                      colors.surfaceContainerHigh ||
                      "#f1f5f9",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    justifyContent: "space-around",
                    alignItems: "center",
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: colors.primary,
                      }}
                    >
                      {teacherAttendanceSummary.averagePercentage ?? 0}%
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      Avg Attendance
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 1,
                      height: 24,
                      backgroundColor: colors.outlineVariant + "40",
                    }}
                  />
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                      }}
                    >
                      {teacherAttendanceSummary.trackedStaff ?? 0}/
                      {teacherAttendanceSummary.totalStaff ??
                        processedTeacherAttendance.length}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      Staff Tracked
                    </Text>
                  </View>
                </View>
              )}

            {/* Consolidated Teachers List */}
            {processedTeacherAttendance &&
            processedTeacherAttendance.length > 0 ? (
              processedTeacherAttendance.map((record, index) => {
                const isHigh = record.percentage >= 85;
                const isMid = record.percentage >= 70 && record.percentage < 85;
                const badgeBg =
                  record.totalDays === 0
                    ? colors.surfaceContainerHigh
                    : isHigh
                    ? colors.successContainer || "#d1fae5"
                    : isMid
                    ? colors.secondaryContainer || "#fef3c7"
                    : colors.errorContainer || "#fee2e2";
                const badgeTextColor =
                  record.totalDays === 0
                    ? colors.onSurfaceVariant
                    : isHigh
                    ? colors.success || "#059669"
                    : isMid
                    ? colors.onSecondaryContainer || "#d97706"
                    : colors.error || "#dc2626";

                const displayRole = formatUserDesignationOrRole(record);

                return (
                  <View
                    key={record.id || index}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth:
                        index < processedTeacherAttendance.length - 1 ? 1 : 0,
                      borderBottomColor: colors.outlineVariant + "25",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <Text
                            style={{
                              color: colors.onSurface,
                              fontFamily: FONTS.bold,
                              fontSize: FONT_SIZES.sm,
                            }}
                          >
                            {formatUserName(record.name)}
                          </Text>
                          {displayRole ? (
                            <View
                              style={{
                                backgroundColor:
                                  colors.surfaceContainerHigh || "#e2e8f0",
                                paddingHorizontal: 6,
                                paddingVertical: 1.5,
                                borderRadius: 4,
                              }}
                            >
                              <Text
                                style={{
                                  color: colors.onSurfaceVariant,
                                  fontFamily: FONTS.medium,
                                  fontSize: FONT_SIZES.xs,
                                }}
                              >
                                {displayRole}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Breakdown info */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <Text
                            style={{
                              color: colors.onSurfaceVariant,
                              fontFamily: FONTS.regular,
                              fontSize: FONT_SIZES.sm,
                            }}
                          >
                            {record.totalDays > 0
                              ? `${record.presentDays} of ${record.totalDays} days`
                              : "No attendance recorded"}
                          </Text>
                          {record.absentDays > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <View
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: 3,
                                  backgroundColor: colors.error || "#EF4444",
                                }}
                              />
                              <Text
                                style={{
                                  color: colors.error || "#EF4444",
                                  fontFamily: FONTS.medium,
                                  fontSize: FONT_SIZES.xs,
                                }}
                              >
                                {record.absentDays} absent
                              </Text>
                            </View>
                          )}
                          {record.lateDays > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <View
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: 3,
                                  backgroundColor: "#F59E0B",
                                }}
                              />
                              <Text
                                style={{
                                  color: "#D97706",
                                  fontFamily: FONTS.medium,
                                  fontSize: FONT_SIZES.xs,
                                }}
                              >
                                {record.lateDays} late
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Percentage Pill */}
                      <View
                        style={{
                          backgroundColor: badgeBg,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 8,
                          minWidth: 54,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: badgeTextColor,
                            fontFamily: FONTS.bold,
                            fontSize: FONT_SIZES.sm,
                          }}
                        >
                          {record.totalDays > 0
                            ? `${record.percentage}%`
                            : "N/A"}
                        </Text>
                      </View>
                    </View>

                    {/* Visual Progress Bar */}
                    {record.totalDays > 0 && (
                      <View
                        style={{
                          height: 4,
                          backgroundColor: colors.outlineVariant + "20",
                          borderRadius: 2,
                          overflow: "hidden",
                          marginTop: 4,
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${Math.min(
                              Math.max(record.percentage, 0),
                              100
                            )}%`,
                            backgroundColor: badgeTextColor,
                            borderRadius: 2,
                          }}
                        />
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                }}
              >
                <MaterialIcons
                  name="info-outline"
                  size={16}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={{
                    color: colors.onSurfaceVariant,
                    fontFamily: FONTS.medium,
                  }}
                >
                  No attendance data.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <MaterialIcons
            name="bar-chart"
            size={48}
            color={colors.onSurfaceVariant}
            style={{ opacity: 0.4 }}
          />
          <Text
            style={{
              color: colors.onSurfaceVariant,
              fontFamily: FONTS.medium,
              marginTop: 12,
            }}
          >
            Select a year to view reports
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Header title="Academic Years" subtitle="Manage & Reports" showBack />

          {/* Tabs */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 16,
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: 100,
              padding: 4,
              height: 48,
            }}
          >
            <Pressable
              onPress={() => setActiveTab("years")}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 100,
                backgroundColor:
                  activeTab === "years" ? colors.primary : "transparent",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialIcons
                  name="date-range"
                  size={16}
                  color={
                    activeTab === "years" ? "#fff" : colors.onSurfaceVariant
                  }
                />
                <Text
                  style={{
                    color:
                      activeTab === "years" ? "#fff" : colors.onSurfaceVariant,
                    fontFamily: FONTS.bold,
                    fontSize: FONT_SIZES.sm,
                  }}
                >
                  Management
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("reports")}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 100,
                backgroundColor:
                  activeTab === "reports" ? colors.primary : "transparent",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialIcons
                  name="assessment"
                  size={16}
                  color={
                    activeTab === "reports" ? "#fff" : colors.onSurfaceVariant
                  }
                />
                <Text
                  style={{
                    color:
                      activeTab === "reports"
                        ? "#fff"
                        : colors.onSurfaceVariant,
                    fontFamily: FONTS.bold,
                    fontSize: FONT_SIZES.sm,
                  }}
                >
                  Reports
                </Text>
              </View>
            </Pressable>
          </View>

          {activeTab === "years" ? renderYearsTab() : renderReportsTab()}
        </View>
      </ScrollView>

      {activeTab === "years" && (
        <Pressable
          onPress={() => setShowModal(true)}
          style={({ pressed }) => ({
            position: "absolute",
            bottom: 24,
            right: 24,
            backgroundColor: pressed ? colors.primary + "DD" : colors.primary,
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: "center",
            alignItems: "center",
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          })}
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: 20,
                padding: 24,
                width: "100%",
                maxWidth: 400,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  marginBottom: 20,
                }}
              >
                New Academic Year
              </Text>

              <TextInput
                placeholder="Name (e.g. 2025-2026)"
                placeholderTextColor={colors.onSurfaceVariant}
                style={{
                  backgroundColor: colors.surfaceContainerHighest,
                  padding: 14,
                  borderRadius: 12,
                  color: colors.onSurface,
                  fontFamily: FONTS.medium,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              <TextInput
                placeholder="Start Date (DD-MM-YYYY)"
                placeholderTextColor={colors.onSurfaceVariant}
                style={{
                  backgroundColor: colors.surfaceContainerHighest,
                  padding: 14,
                  borderRadius: 12,
                  color: colors.onSurface,
                  fontFamily: FONTS.medium,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}
                value={form.startDate}
                onChangeText={(t) => setForm({ ...form, startDate: t })}
              />

              <TextInput
                placeholder="End Date (DD-MM-YYYY)"
                placeholderTextColor={colors.onSurfaceVariant}
                style={{
                  backgroundColor: colors.surfaceContainerHighest,
                  padding: 14,
                  borderRadius: 12,
                  color: colors.onSurface,
                  fontFamily: FONTS.medium,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}
                value={form.endDate}
                onChangeText={(t) => setForm({ ...form, endDate: t })}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: pressed
                      ? colors.surfaceContainerHigh
                      : "transparent",
                  })}
                >
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={createYearMutation.isPending}
                  style={({ pressed }) => ({
                    backgroundColor: pressed
                      ? colors.primary + "DD"
                      : colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    opacity: createYearMutation.isPending ? 0.7 : 1,
                    minWidth: 80,
                    alignItems: "center",
                  })}
                >
                  {createYearMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontFamily: FONTS.bold }}>
                      Create
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Academic Year Selector Modal */}
      <Modal
        visible={showYearPickerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowYearPickerModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setShowYearPickerModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              maxHeight: "70%",
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.outlineVariant + "40",
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                }}
              >
                Select Academic Year
              </Text>
              <Pressable
                onPress={() => setShowYearPickerModal(false)}
                hitSlop={10}
              >
                <MaterialIcons
                  name="close"
                  size={22}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {years.map((year) => {
                const isSelected = year._id === selectedYearId;
                return (
                  <Pressable
                    key={year._id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedYearId(year._id);
                      setShowYearPickerModal(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      marginBottom: 6,
                      backgroundColor: isSelected
                        ? colors.primaryContainer || colors.primary + "15"
                        : pressed
                        ? colors.surfaceContainerHigh
                        : "transparent",
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <MaterialIcons
                        name={
                          isSelected
                            ? "radio-button-checked"
                            : "radio-button-unchecked"
                        }
                        size={20}
                        color={
                          isSelected ? colors.primary : colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: isSelected
                            ? FONTS.bold
                            : FONTS.medium,
                          color: isSelected ? colors.primary : colors.onSurface,
                        }}
                      >
                        {year.name}
                      </Text>
                      {year.isActive && (
                        <View
                          style={{
                            backgroundColor: colors.primary + "20",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: FONT_SIZES.micro,
                              fontFamily: FONTS.bold,
                              color: colors.primary,
                            }}
                          >
                            ACTIVE
                          </Text>
                        </View>
                      )}
                    </View>
                    {isSelected && (
                      <MaterialIcons
                        name="check"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const localStyles = {
  card: (colors) => ({
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "30",
  }),
  cardTitle: (colors) => ({
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: colors.onSurface,
    flex: 1,
  }),
};
