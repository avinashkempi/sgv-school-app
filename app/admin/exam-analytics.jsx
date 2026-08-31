import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Pressable,
  Modal,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import Header from "../../components/Header";
import Card from "../../components/Card";
import formatClassName from "../../utils/formatClassName";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatUserName } from "../../utils/userFormatters";

const EXAM_TYPES = ["FA1", "FA2", "SA1", "FA3", "FA4", "SA2"];

/**
 * Admin Exam Analytics Screen
 * School-wide exam performance dashboard with exact marks scored vs initialized max marks
 */
export default function ExamAnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState("overview"); // 'overview' | 'classes' | 'subjects' | 'students' | 'setup'
  const [selectedExamType, setSelectedExamType] = useState("ALL"); // 'ALL' | 'FA1' | 'FA2' ...
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'class' | 'subject', data }
  const [selectedStudent, setSelectedStudent] = useState(null); // student object for deep-dive modal
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Fetch Academic Years
  const { data: academicYears = [] } = useApiQuery(
    ["academicYearsList"],
    `${apiConfig.baseUrl}/academic-year`
  );

  // Set initial academic year to active year
  useEffect(() => {
    if (academicYears.length > 0 && !selectedYearId) {
      const activeYear = academicYears.find((y) => y.isActive);
      if (activeYear) {
        setSelectedYearId(activeYear._id);
      } else {
        setSelectedYearId(academicYears[0]._id);
      }
    }
  }, [academicYears, selectedYearId]);

  // Fetch school-wide performance
  const schoolPerfUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedYearId) params.append("academicYearId", selectedYearId);
    return `${apiConfig.baseUrl}/exams/performance/school?${params.toString()}`;
  }, [selectedYearId]);

  const {
    data: schoolData,
    isLoading,
    isFetching,
    refetch,
  } = useApiQuery(["schoolExamPerformance", selectedYearId], schoolPerfUrl, {
    enabled: !!selectedYearId || academicYears.length === 0,
  });

  // Fetch School Students Rankings (for Students Tab)
  const studentsPerfUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedYearId) params.append("academicYearId", selectedYearId);
    if (studentClassFilter) params.append("classId", studentClassFilter);
    if (selectedExamType && selectedExamType !== "ALL")
      params.append("examType", selectedExamType);
    if (searchStudentQuery.trim())
      params.append("search", searchStudentQuery.trim());
    return `${
      apiConfig.baseUrl
    }/marks/analytics/school/students?${params.toString()}`;
  }, [
    selectedYearId,
    studentClassFilter,
    selectedExamType,
    searchStudentQuery,
  ]);

  const {
    data: studentsData,
    isLoading: loadingStudents,
    isFetching: fetchingStudents,
    refetch: refetchStudents,
  } = useApiQuery(
    [
      "schoolStudentsRankings",
      selectedYearId,
      studentClassFilter,
      selectedExamType,
      searchStudentQuery,
    ],
    studentsPerfUrl,
    { enabled: activeView === "students" }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      activeView === "students" ? refetchStudents() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return colors.success;
    if (percentage >= 70) return "#2196F3";
    if (percentage >= 50) return "#FF9800";
    if (percentage >= 30) return "#FF5722";
    return colors.error;
  };

  const getExamTypeColor = (type) => {
    const typeColors = {
      FA1: "#2196F3",
      FA2: "#03A9F4",
      SA1: "#9C27B0",
      FA3: "#FF9800",
      FA4: "#FF5722",
      SA2: "#E91E63",
    };
    return typeColors[type] || "#2196F3";
  };

  const handleSelectExamType = (type) => {
    Haptics.selectionAsync();
    setSelectedExamType(type);
  };

  const examPerf = useMemo(
    () => schoolData?.examwisePerformance || [],
    [schoolData?.examwisePerformance]
  );
  const classPerf = useMemo(
    () => schoolData?.classwiseSummary || [],
    [schoolData?.classwiseSummary]
  );
  const subjectPerf = useMemo(
    () => schoolData?.subjectwiseSummary || [],
    [schoolData?.subjectwiseSummary]
  );
  const kpis = useMemo(() => schoolData?.kpis || {}, [schoolData?.kpis]);
  const initSummary = useMemo(
    () => schoolData?.initializationSummary || {},
    [schoolData?.initializationSummary]
  );

  // Current Exam Type Performance for KPIs
  const currentExamTypePerf = useMemo(() => {
    if (selectedExamType === "ALL") return null;
    return examPerf.find((e) => e.examType === selectedExamType) || null;
  }, [examPerf, selectedExamType]);

  // Active KPIs dynamically adapting to selectedExamType
  const activeKPIs = useMemo(() => {
    if (selectedExamType === "ALL" || !currentExamTypePerf) {
      return {
        avgPercentage: kpis.schoolAvgPercentage || "0.0",
        totalMarksEvaluated: kpis.totalMarksEvaluated || 0,
        totalMarksObtained: kpis.totalMarksObtained || 0,
        entriesCount: kpis.totalMarksEntriesCount || 0,
        expectedEntries: kpis.totalExpectedEntries || 0,
        completionRate: kpis.completionRate || 0,
        examsConfigured: kpis.totalExamsConfigured || 0,
        label: "School-wide Performance (All Exams)",
        subLabel: `${kpis.totalMarksEntriesCount || 0} marks entered across ${
          kpis.totalExamsConfigured || 0
        } exams`,
      };
    }
    return {
      avgPercentage: currentExamTypePerf.avgPercentage || "0.0",
      totalMarksEvaluated: currentExamTypePerf.totalMarksEvaluated || 0,
      totalMarksObtained: currentExamTypePerf.totalMarksObtained || 0,
      entriesCount: currentExamTypePerf.marksEntered || 0,
      expectedEntries: currentExamTypePerf.expectedMarks || 0,
      completionRate: currentExamTypePerf.completionRate || 0,
      examsConfigured: currentExamTypePerf.examsCount || 0,
      maxMarks: currentExamTypePerf.maxMarks || 100,
      avgMarksObtained: currentExamTypePerf.avgMarksObtained || 0,
      marksPublishedCount: currentExamTypePerf.marksPublishedCount || 0,
      label: `${selectedExamType} Performance Overview`,
      subLabel: `Average ${currentExamTypePerf.avgMarksObtained || 0} / ${
        currentExamTypePerf.maxMarks || 100
      } M • ${currentExamTypePerf.marksEntered || 0} marks entered`,
    };
  }, [selectedExamType, currentExamTypePerf, kpis]);

  // Filtered Exam-wise Performance
  const filteredExamPerf = useMemo(() => {
    if (selectedExamType === "ALL") return examPerf;
    return examPerf.filter((e) => e.examType === selectedExamType);
  }, [examPerf, selectedExamType]);

  // Filtered Classes dynamically adapting to selectedExamType
  const filteredClasses = useMemo(() => {
    let list = classPerf.map((cls) => {
      if (selectedExamType === "ALL") {
        const pct = parseFloat(cls.avgPercentage) || 0;
        return {
          ...cls,
          displayPercentage: pct,
          displayAvgMarks: cls.avgMarksPerStudent || 0,
          displayMaxMarks: cls.maxMarksPerStudent || 0,
          displayMarksEntered: cls.marksEnteredCount || 0,
          displayExpectedMarks: cls.totalExpectedMarks || 0,
          displayExamsCount: `${cls.examsCount}/6 Exams`,
          status:
            cls.examsCount >= 6
              ? "completed"
              : cls.examsCount > 0
              ? "partial"
              : "not_initialized",
        };
      } else {
        const b = (cls.examTypeBreakdown || []).find(
          (x) => x.examType === selectedExamType
        );
        const pct =
          b && b.avgPercentage !== null && b.avgPercentage !== undefined
            ? parseFloat(b.avgPercentage)
            : 0;
        return {
          ...cls,
          displayPercentage: pct,
          displayAvgMarks: b?.avgMarksObtained || 0,
          displayMaxMarks: b?.maxMarks || 0,
          displayMarksEntered: b?.marksEntered || 0,
          displayExpectedMarks: b?.expectedMarks || 0,
          displayExamsCount: `${
            b?.examsCount || 0
          } ${selectedExamType} Assessment${b?.examsCount !== 1 ? "s" : ""}`,
          status: b?.status || "not_initialized",
        };
      }
    });

    if (classSearchQuery.trim()) {
      const q = classSearchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.className.toLowerCase().includes(q) ||
          (c.classTeacher && c.classTeacher.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => b.displayPercentage - a.displayPercentage);
  }, [classPerf, selectedExamType, classSearchQuery]);

  // Filtered Subjects dynamically adapting to selectedExamType
  const filteredSubjects = useMemo(() => {
    let list = subjectPerf.map((s) => {
      if (selectedExamType === "ALL") {
        const pct = parseFloat(s.avgPercentage) || 0;
        return {
          ...s,
          displayPercentage: pct,
          displayAvgMarks: s.avgMarksObtained || 0,
          displayMaxMarks: s.maxMarks || 100,
          displayMarksEntered: s.marksEntered || 0,
          displayExamsCount: `${s.examsCount} classes`,
          displayHighest: s.highestMarks,
          displayLowest: s.lowestMarks,
        };
      } else {
        const b = (s.examTypeBreakdown || []).find(
          (x) => x.examType === selectedExamType
        );
        const pct =
          b && b.avgPercentage !== null && b.avgPercentage !== undefined
            ? parseFloat(b.avgPercentage)
            : 0;
        return {
          ...s,
          displayPercentage: pct,
          displayAvgMarks: b?.avgMarksObtained || 0,
          displayMaxMarks: b?.maxMarks || s.maxMarks || 100,
          displayMarksEntered: b?.marksEntered || 0,
          displayExamsCount: `${b?.examsCount || 0} classes`,
          displayHighest: null,
          displayLowest: null,
        };
      }
    });

    if (subjectSearchQuery.trim()) {
      const q = subjectSearchQuery.toLowerCase();
      list = list.filter((s) => s.subjectName.toLowerCase().includes(q));
    }

    return list.sort((a, b) => b.displayPercentage - a.displayPercentage);
  }, [subjectPerf, selectedExamType, subjectSearchQuery]);

  // Active Setup & Initialization Summary
  const activeInitSummary = useMemo(() => {
    if (selectedExamType === "ALL") {
      return {
        fullyInitialized: initSummary.fullyInitializedClassesCount || 0,
        partial: initSummary.partiallyInitializedClassesCount || 0,
        uninitialized: initSummary.uninitializedClassesCount || 0,
        labelFully: "Fully Initialized",
        labelPartial: "Partial Setup",
        labelUninit: "Not Setup",
      };
    }
    let full = 0,
      partial = 0,
      uninit = 0;
    classPerf.forEach((cls) => {
      const b = (cls.examTypeBreakdown || []).find(
        (x) => x.examType === selectedExamType
      );
      if (!b || b.status === "not_initialized") {
        uninit++;
      } else if (b.status === "completed") {
        full++;
      } else {
        partial++;
      }
    });
    return {
      fullyInitialized: full,
      partial,
      uninitialized: uninit,
      labelFully: `${selectedExamType} Completed`,
      labelPartial: `${selectedExamType} In Progress`,
      labelUninit: `${selectedExamType} Not Setup`,
    };
  }, [selectedExamType, initSummary, classPerf]);

  const studentsList = studentsData?.studentRankings || [];

  // Best and worst performing classes for current active filter
  const validClasses = useMemo(
    () => filteredClasses.filter((c) => c.displayPercentage > 0),
    [filteredClasses]
  );
  const topClass = validClasses.length > 0 ? validClasses[0] : null;
  const bottomClass =
    validClasses.length > 1 ? validClasses[validClasses.length - 1] : null;

  // ----------------------------------------------------
  // TAB: OVERVIEW
  // ----------------------------------------------------
  const renderOverview = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Hero Stats Card */}
      <View
        style={{
          borderRadius: 24,
          overflow: "hidden",
          marginTop: 16,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={[colors.primary, colors.onPrimaryContainer || "#1565C0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 22 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                {selectedExamType !== "ALL" && (
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.25)",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.bold,
                        color: "#FFFFFF",
                      }}
                    >
                      {selectedExamType}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: colors.onPrimary,
                    opacity: 0.85,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                  }}
                >
                  {selectedExamType === "ALL"
                    ? "School-wide Performance"
                    : `${selectedExamType} Performance`}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.jumbo,
                    fontFamily: FONTS.bold,
                    color: colors.onPrimary,
                    lineHeight: 54,
                  }}
                >
                  {activeKPIs.avgPercentage}
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xl,
                    fontFamily: FONTS.bold,
                    color: colors.onPrimary,
                    opacity: 0.8,
                    marginLeft: 4,
                  }}
                >
                  %
                </Text>
              </View>
            </View>

            {/* Total Marks Tally Badge */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.18)",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 14,
                alignItems: "flex-end",
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.bold,
                  color: colors.onPrimary,
                  opacity: 0.85,
                  textTransform: "uppercase",
                }}
              >
                Total Marks Scored
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onPrimary,
                  marginTop: 2,
                }}
              >
                {activeKPIs.totalMarksObtained?.toLocaleString() || 0} /{" "}
                {activeKPIs.totalMarksEvaluated?.toLocaleString() || 0}
              </Text>
            </View>
          </View>

          {/* Quick KPI Micro-cards */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 18,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.18)",
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onPrimary,
                }}
              >
                {activeKPIs.examsConfigured || 0}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.medium,
                  color: colors.onPrimary,
                  opacity: 0.8,
                }}
              >
                {selectedExamType === "ALL"
                  ? "Exams Setup"
                  : `${selectedExamType} Setup`}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onPrimary,
                }}
              >
                {activeKPIs.completionRate || 0}%
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.medium,
                  color: colors.onPrimary,
                  opacity: 0.8,
                }}
              >
                Marks Entered
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onPrimary,
                }}
              >
                {classPerf.length}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.medium,
                  color: colors.onPrimary,
                  opacity: 0.8,
                }}
              >
                Classes
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onPrimary,
                }}
              >
                {subjectPerf.length}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.medium,
                  color: colors.onPrimary,
                  opacity: 0.8,
                }}
              >
                Subjects
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Exam-wise Performance Cards with Configured Max Marks */}
      <View style={{ marginTop: 24 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.onBackground,
              }}
            >
              Exam-wise Marks & Trends
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
              }}
            >
              Configured max marks vs average scored
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {filteredExamPerf.map((exam) => {
            const examColor = getExamTypeColor(exam.examType);
            const pct = parseFloat(exam.avgPercentage) || 0;
            const isEntered = exam.marksEntered > 0;

            return (
              <Card
                key={exam.examType}
                variant="elevated"
                style={{ padding: 16 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: examColor + "20",
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: examColor,
                        }}
                      >
                        {exam.examType}
                      </Text>
                    </View>

                    {/* Max Marks Initialized Badge */}
                    <View
                      style={{
                        backgroundColor: colors.surfaceContainerHighest,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                        }}
                      >
                        Max: {exam.maxMarks} Marks
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      {exam.examsCount}{" "}
                      {exam.examsCount === 1 ? "exam" : "exams"}
                    </Text>
                  </View>

                  {/* Percentage & Scored Marks */}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: isEntered
                          ? getGradeColor(pct)
                          : colors.onSurfaceVariant,
                      }}
                    >
                      {isEntered ? `${pct}%` : "—"}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: colors.primary,
                        marginTop: 2,
                      }}
                    >
                      {isEntered
                        ? `Avg: ${exam.avgMarksObtained} / ${exam.maxMarks}`
                        : "Pending marks"}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.surfaceContainerHighest,
                    borderRadius: 100,
                    overflow: "hidden",
                    marginTop: 14,
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: examColor,
                      borderRadius: 100,
                    }}
                  />
                </View>

                {/* Footer Marks Tally */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.regular,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    Marks entered:{" "}
                    <Text style={{ fontFamily: FONTS.bold }}>
                      {exam.marksEntered} / {exam.expectedMarks}
                    </Text>{" "}
                    ({exam.completionRate}%)
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.regular,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    Pool:{" "}
                    <Text style={{ fontFamily: FONTS.bold }}>
                      {exam.totalMarksObtained?.toLocaleString()} /{" "}
                      {exam.totalMarksEvaluated?.toLocaleString()}
                    </Text>{" "}
                    M
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </View>

      {/* Top & Attention Classes Highlights */}
      {topClass && bottomClass && topClass.classId !== bottomClass.classId && (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <Card variant="outlined" style={{ flex: 1, padding: 14 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialIcons
                name="emoji-events"
                size={20}
                color={colors.success}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.bold,
                  color: colors.success,
                  textTransform: "uppercase",
                }}
              >
                Top Class
              </Text>
            </View>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
                marginTop: 4,
              }}
            >
              {formatClassName(topClass.className)}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.success,
                marginTop: 4,
              }}
            >
              {topClass.displayPercentage}%
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.xs,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
                marginTop: 2,
              }}
            >
              Avg {topClass.displayAvgMarks} / {topClass.displayMaxMarks} M
            </Text>
          </Card>

          <Card variant="outlined" style={{ flex: 1, padding: 14 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialIcons name="trending-down" size={20} color="#FF9800" />
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.bold,
                  color: "#FF9800",
                  textTransform: "uppercase",
                }}
              >
                Needs Attention
              </Text>
            </View>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
                marginTop: 4,
              }}
            >
              {formatClassName(bottomClass.className)}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: "#FF9800",
                marginTop: 4,
              }}
            >
              {bottomClass.displayPercentage}%
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.xs,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
                marginTop: 2,
              }}
            >
              Avg {bottomClass.displayAvgMarks} / {bottomClass.displayMaxMarks}{" "}
              M
            </Text>
          </Card>
        </View>
      )}
    </Animated.View>
  );

  // ----------------------------------------------------
  // TAB: CLASSES
  // ----------------------------------------------------
  const renderClasses = () => (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.onBackground,
              }}
            >
              Class Performance & Scores
            </Text>
            {selectedExamType !== "ALL" && (
              <View
                style={{
                  backgroundColor: getExamTypeColor(selectedExamType) + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: getExamTypeColor(selectedExamType),
                  }}
                >
                  {selectedExamType}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
            }}
          >
            {selectedExamType === "ALL"
              ? "Showing cumulative performance across all exams"
              : `Showing ${selectedExamType} marks, averages and status`}
          </Text>
        </View>
      </View>

      {/* Search Class */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 16,
          gap: 8,
        }}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.onSurfaceVariant}
        />
        <TextInput
          placeholder="Search class or teacher..."
          placeholderTextColor={colors.onSurfaceVariant + "80"}
          value={classSearchQuery}
          onChangeText={setClassSearchQuery}
          style={{
            flex: 1,
            fontSize: FONT_SIZES.sm,
            fontFamily: FONTS.medium,
            color: colors.onSurface,
            padding: 0,
          }}
        />
        {classSearchQuery ? (
          <Pressable onPress={() => setClassSearchQuery("")}>
            <MaterialIcons
              name="close"
              size={18}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        ) : null}
      </View>

      {filteredClasses.length === 0 ? (
        <Card variant="filled" style={{ padding: 36, alignItems: "center" }}>
          <MaterialIcons
            name="school"
            size={44}
            color={colors.onSurfaceVariant}
            style={{ opacity: 0.5 }}
          />
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              marginTop: 10,
            }}
          >
            No class data found
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {filteredClasses.map((cls, index) => {
            const pct = cls.displayPercentage || 0;
            const statusColors = {
              completed: {
                bg: colors.success + "18",
                text: colors.success,
                label: "Completed",
              },
              partial: {
                bg: "#FF980018",
                text: "#FF9800",
                label: `Partial (${cls.displayMarksEntered}/${cls.displayExpectedMarks})`,
              },
              pending: {
                bg: colors.primary + "18",
                text: colors.primary,
                label: "Pending Marks",
              },
              not_initialized: {
                bg: colors.surfaceContainerHighest,
                text: colors.onSurfaceVariant,
                label: "Not Setup",
              },
            };
            const currentStatus =
              statusColors[cls.status] || statusColors.not_initialized;

            return (
              <Pressable
                key={cls.classId}
                onPress={() => setSelectedItem({ type: "class", data: cls })}
              >
                <Card variant="elevated" style={{ padding: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor:
                            index === 0
                              ? colors.success + "18"
                              : colors.primaryContainer,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            fontFamily: FONTS.bold,
                            color:
                              index === 0 ? colors.success : colors.primary,
                          }}
                        >
                          #{index + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: FONT_SIZES.md,
                            fontFamily: FONTS.bold,
                            color: colors.onSurface,
                          }}
                        >
                          {formatClassName(cls.className)}
                        </Text>
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            fontFamily: FONTS.medium,
                            color: colors.onSurfaceVariant,
                            marginTop: 2,
                          }}
                        >
                          {cls.studentCount} Students{" "}
                          {cls.classTeacher ? `• ${cls.classTeacher}` : ""}
                        </Text>
                      </View>
                    </View>

                    {/* Score Pill & Status */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View
                        style={{
                          backgroundColor: getGradeColor(pct) + "18",
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.md,
                            fontFamily: FONTS.bold,
                            color: getGradeColor(pct),
                          }}
                        >
                          {pct.toFixed(1)}%
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: currentStatus.bg,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.micro,
                            fontFamily: FONTS.bold,
                            color: currentStatus.text,
                          }}
                        >
                          {currentStatus.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Marks Scored vs Max Marks Line */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.outlineVariant + "30",
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        Student Average
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: colors.primary,
                          marginTop: 1,
                        }}
                      >
                        {cls.displayAvgMarks} / {cls.displayMaxMarks} Marks
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        Marks Entered Pool
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                          marginTop: 1,
                        }}
                      >
                        {cls.displayMarksEntered} / {cls.displayExpectedMarks}{" "}
                        Entries
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View
                    style={{
                      height: 8,
                      backgroundColor: colors.surfaceContainerHighest,
                      borderRadius: 100,
                      overflow: "hidden",
                      marginTop: 10,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: getGradeColor(pct),
                        borderRadius: 100,
                      }}
                    />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  // ----------------------------------------------------
  // TAB: SUBJECTS
  // ----------------------------------------------------
  const renderSubjects = () => (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.onBackground,
              }}
            >
              Subject-wise Performance
            </Text>
            {selectedExamType !== "ALL" && (
              <View
                style={{
                  backgroundColor: getExamTypeColor(selectedExamType) + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: getExamTypeColor(selectedExamType),
                  }}
                >
                  {selectedExamType}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
            }}
          >
            {selectedExamType === "ALL"
              ? "Configured marks & cumulative average scored per subject"
              : `Showing ${selectedExamType} performance and max marks allocation`}
          </Text>
        </View>
      </View>

      {/* Search Subject */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 16,
          gap: 8,
        }}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.onSurfaceVariant}
        />
        <TextInput
          placeholder="Search subject..."
          placeholderTextColor={colors.onSurfaceVariant + "80"}
          value={subjectSearchQuery}
          onChangeText={setSubjectSearchQuery}
          style={{
            flex: 1,
            fontSize: FONT_SIZES.sm,
            fontFamily: FONTS.medium,
            color: colors.onSurface,
            padding: 0,
          }}
        />
        {subjectSearchQuery ? (
          <Pressable onPress={() => setSubjectSearchQuery("")}>
            <MaterialIcons
              name="close"
              size={18}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        ) : null}
      </View>

      {filteredSubjects.length === 0 ? (
        <Card variant="filled" style={{ padding: 36, alignItems: "center" }}>
          <MaterialIcons
            name="book"
            size={44}
            color={colors.onSurfaceVariant}
            style={{ opacity: 0.5 }}
          />
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              marginTop: 10,
            }}
          >
            No subject data found
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {filteredSubjects.map((subj) => {
            const pct = subj.displayPercentage || 0;
            return (
              <Pressable
                key={subj.subjectId || subj.subjectName}
                onPress={() => setSelectedItem({ type: "subject", data: subj })}
              >
                <Card variant="elevated" style={{ padding: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: colors.primaryContainer,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.md,
                            fontFamily: FONTS.bold,
                            color: colors.primary,
                          }}
                        >
                          {subj.subjectName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: FONT_SIZES.md,
                            fontFamily: FONTS.bold,
                            color: colors.onSurface,
                          }}
                        >
                          {subj.subjectName}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 2,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: colors.surfaceContainerHighest,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                fontFamily: FONTS.bold,
                                color: colors.onSurfaceVariant,
                              }}
                            >
                              Max: {subj.displayMaxMarks} M
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.medium,
                              color: colors.onSurfaceVariant,
                            }}
                          >
                            {subj.displayExamsCount}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <View
                        style={{
                          backgroundColor: getGradeColor(pct) + "18",
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.md,
                            fontFamily: FONTS.bold,
                            color: getGradeColor(pct),
                          }}
                        >
                          {pct.toFixed(1)}%
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: colors.primary,
                          marginTop: 3,
                        }}
                      >
                        Avg: {subj.displayAvgMarks} / {subj.displayMaxMarks} M
                      </Text>
                    </View>
                  </View>

                  {/* High / Low scores row (when in All Exams) */}
                  {subj.displayHighest !== null &&
                    subj.displayHighest !== undefined && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 12,
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: colors.outlineVariant + "30",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: FONTS.medium,
                            color: colors.success,
                          }}
                        >
                          Highest:{" "}
                          <Text style={{ fontFamily: FONTS.bold }}>
                            {subj.displayHighest} / {subj.displayMaxMarks} M
                          </Text>
                        </Text>
                        {subj.displayLowest !== null &&
                          subj.displayLowest !== undefined && (
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                fontFamily: FONTS.medium,
                                color: colors.error,
                              }}
                            >
                              Lowest:{" "}
                              <Text style={{ fontFamily: FONTS.bold }}>
                                {subj.displayLowest} / {subj.displayMaxMarks} M
                              </Text>
                            </Text>
                          )}
                      </View>
                    )}

                  {/* Progress bar */}
                  <View
                    style={{
                      height: 8,
                      backgroundColor: colors.surfaceContainerHighest,
                      borderRadius: 100,
                      overflow: "hidden",
                      marginTop: 8,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: getGradeColor(pct),
                        borderRadius: 100,
                      }}
                    />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  // ----------------------------------------------------
  // TAB: STUDENTS (Rankings & Exact Out-of-Marks Scores)
  // ----------------------------------------------------
  const renderStudents = () => (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.onBackground,
              }}
            >
              Student Marks & Rankings
            </Text>
            {selectedExamType !== "ALL" && (
              <View
                style={{
                  backgroundColor: getExamTypeColor(selectedExamType) + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: getExamTypeColor(selectedExamType),
                  }}
                >
                  {selectedExamType}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
            }}
          >
            {selectedExamType === "ALL"
              ? "Exact marks scored out of total possible marks across all exams"
              : `Exact marks scored in ${selectedExamType} out of total possible marks`}
          </Text>
        </View>
      </View>

      {/* Search Student Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 12,
          gap: 8,
        }}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.onSurfaceVariant}
        />
        <TextInput
          placeholder="Search student by name or email..."
          placeholderTextColor={colors.onSurfaceVariant + "80"}
          value={searchStudentQuery}
          onChangeText={setSearchStudentQuery}
          style={{
            flex: 1,
            fontSize: FONT_SIZES.sm,
            fontFamily: FONTS.medium,
            color: colors.onSurface,
            padding: 0,
          }}
        />
        {searchStudentQuery ? (
          <Pressable onPress={() => setSearchStudentQuery("")}>
            <MaterialIcons
              name="close"
              size={18}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Class Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setStudentClassFilter("")}
            style={{
              backgroundColor: !studentClassFilter
                ? colors.primary
                : colors.surfaceContainerHigh,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.bold,
                color: !studentClassFilter ? "#FFFFFF" : colors.onSurface,
              }}
            >
              All Classes
            </Text>
          </Pressable>
          {classPerf.map((c) => (
            <Pressable
              key={c.classId}
              onPress={() => setStudentClassFilter(c.classId)}
              style={{
                backgroundColor:
                  studentClassFilter === c.classId
                    ? colors.primary
                    : colors.surfaceContainerHigh,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.bold,
                  color:
                    studentClassFilter === c.classId
                      ? "#FFFFFF"
                      : colors.onSurface,
                }}
              >
                {formatClassName(c.className)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {loadingStudents && !studentsData ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              marginTop: 8,
            }}
          >
            Loading student marks...
          </Text>
        </View>
      ) : studentsList.length === 0 ? (
        <Card variant="filled" style={{ padding: 36, alignItems: "center" }}>
          <MaterialIcons
            name="person"
            size={44}
            color={colors.onSurfaceVariant}
            style={{ opacity: 0.5 }}
          />
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              marginTop: 10,
            }}
          >
            No students found for current filters
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 10, opacity: fetchingStudents ? 0.85 : 1 }}>
          {studentsList.map((student) => {
            const isTop3 = student.rank <= 3;
            const rankBadgeColor =
              student.rank === 1
                ? "#FFD700"
                : student.rank === 2
                ? "#C0C0C0"
                : student.rank === 3
                ? "#CD7F32"
                : colors.primary;

            return (
              <Pressable
                key={student.studentId}
                onPress={() => setSelectedStudent(student)}
              >
                <Card variant="elevated" style={{ padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {/* Rank Badge */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: isTop3
                          ? rankBadgeColor + "25"
                          : colors.surfaceContainerHigh,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: isTop3 ? rankBadgeColor : colors.onSurface,
                        }}
                      >
                        #{student.rank}
                      </Text>
                    </View>

                    {/* Student Avatar */}
                    <UserAvatar
                      photoUrl={student.profilePhoto}
                      name={formatUserName(student.studentName)}
                      role="student"
                      size={36}
                      style={{ marginRight: 10 }}
                    />

                    {/* Student Details */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                        }}
                      >
                        {formatUserName(student.studentName)}
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                          marginTop: 1,
                        }}
                      >
                        {formatClassName(student.className)}
                      </Text>
                      {/* Exact Marks Scored Display */}
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: colors.primary,
                          marginTop: 3,
                        }}
                      >
                        Scored: {student.totalObtained} / {student.totalMax}{" "}
                        Marks
                      </Text>
                    </View>

                    {/* Percentage & Grade */}
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.lg,
                          fontFamily: FONTS.bold,
                          color: getGradeColor(student.percentage),
                        }}
                      >
                        {student.percentage.toFixed(1)}%
                      </Text>
                      <View
                        style={{
                          backgroundColor:
                            getGradeColor(student.percentage) + "18",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          marginTop: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: FONTS.bold,
                            color: getGradeColor(student.percentage),
                          }}
                        >
                          Grade {student.grade}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  // ----------------------------------------------------
  // TAB: SETUP & STATUS (Initialization health & max marks)
  // ----------------------------------------------------
  const renderSetup = () => (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.onBackground,
              }}
            >
              Exam Setup & Marks Status
            </Text>
            {selectedExamType !== "ALL" && (
              <View
                style={{
                  backgroundColor: getExamTypeColor(selectedExamType) + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: getExamTypeColor(selectedExamType),
                  }}
                >
                  {selectedExamType}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
            }}
          >
            {selectedExamType === "ALL"
              ? "Standardized exam initialization & max marks allocation across all 6 exams"
              : `Status of ${selectedExamType} initialization and marks entries per class`}
          </Text>
        </View>
      </View>

      {/* Summary Highlights */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <Card
          variant="outlined"
          style={{ flex: 1, padding: 12, alignItems: "center" }}
        >
          <MaterialIcons name="check-circle" size={24} color={colors.success} />
          <Text
            style={{
              fontSize: FONT_SIZES.lg,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              marginTop: 4,
            }}
          >
            {activeInitSummary.fullyInitialized}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZES.micro,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            {activeInitSummary.labelFully}
          </Text>
        </Card>
        <Card
          variant="outlined"
          style={{ flex: 1, padding: 12, alignItems: "center" }}
        >
          <MaterialIcons name="hourglass-empty" size={24} color="#FF9800" />
          <Text
            style={{
              fontSize: FONT_SIZES.lg,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              marginTop: 4,
            }}
          >
            {activeInitSummary.partial}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZES.micro,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            {activeInitSummary.labelPartial}
          </Text>
        </Card>
        <Card
          variant="outlined"
          style={{ flex: 1, padding: 12, alignItems: "center" }}
        >
          <MaterialIcons name="error-outline" size={24} color={colors.error} />
          <Text
            style={{
              fontSize: FONT_SIZES.lg,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              marginTop: 4,
            }}
          >
            {activeInitSummary.uninitialized}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZES.micro,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            {activeInitSummary.labelUninit}
          </Text>
        </Card>
      </View>

      {/* Class Matrix Cards */}
      <View style={{ gap: 12 }}>
        {classPerf.map((cls) => {
          const breakdownMap = {};
          (cls.examTypeBreakdown || []).forEach((b) => {
            breakdownMap[b.examType] = b;
          });

          return (
            <Card key={cls.classId} variant="elevated" style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                    }}
                  >
                    {formatClassName(cls.className)}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {selectedExamType === "ALL"
                      ? `${cls.examsCount}/6 Exams Initialized • ${cls.studentCount} Students`
                      : breakdownMap[selectedExamType]
                      ? `${selectedExamType} Initialized (${breakdownMap[selectedExamType].maxMarks} M) • ${cls.studentCount} Students`
                      : `Not Initialized for ${selectedExamType}`}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    router.push(`/shared/class-reports?classId=${cls.classId}`)
                  }
                  style={{
                    backgroundColor: colors.primaryContainer,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.bold,
                      color: colors.primary,
                    }}
                  >
                    Reports
                  </Text>
                </Pressable>
              </View>

              {/* Exam Types Chips Matrix */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {EXAM_TYPES.map((type) => {
                  const b = breakdownMap[type];
                  const isInit = !!b;
                  const isComplete = b && b.status === "completed";
                  const isPartial = b && b.status === "partial";
                  const isSelected = selectedExamType === type;

                  let bg = colors.surfaceContainerHighest;
                  let textColor = colors.onSurfaceVariant;
                  let label = `${type}: Not Setup`;

                  if (isInit) {
                    label = `${type}: ${b.maxMarks}M (${b.marksEntered}/${b.expectedMarks})`;
                    if (isComplete) {
                      bg = colors.success + "20";
                      textColor = colors.success;
                    } else if (isPartial) {
                      bg = "#FF980020";
                      textColor = "#FF9800";
                    } else {
                      bg = colors.primary + "18";
                      textColor = colors.primary;
                    }
                  }

                  return (
                    <View
                      key={type}
                      style={{
                        backgroundColor: bg,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected
                          ? colors.primary
                          : isInit
                          ? textColor + "40"
                          : colors.outlineVariant + "30",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: isSelected
                            ? FONTS.bold
                            : FONTS.medium,
                          color: textColor,
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </View>
    </View>
  );

  // ----------------------------------------------------
  // DRILLDOWN MODAL (Class / Subject)
  // ----------------------------------------------------
  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const { type, data } = selectedItem;
    const title =
      type === "class" ? formatClassName(data.className) : data.subjectName;
    const overallPct = parseFloat(data.avgPercentage) || 0;
    const breakdown = data.examTypeBreakdown || [];

    return (
      <Modal
        transparent
        visible={!!selectedItem}
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setSelectedItem(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 40,
                maxHeight: "85%",
              }}
            >
              {/* Handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: colors.onSurfaceVariant + "40",
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.bold,
                      color: colors.onSurfaceVariant,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {type === "class"
                      ? "Class Performance Deep-Dive"
                      : "Subject Performance Deep-Dive"}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                      marginTop: 4,
                    }}
                  >
                    {title}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: getGradeColor(overallPct) + "18",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.bold,
                      color: getGradeColor(overallPct),
                    }}
                  >
                    {overallPct}%
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.medium,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    Overall
                  </Text>
                </View>
              </View>

              {/* Breakdown rows */}
              <ScrollView showsVerticalScrollIndicator={false}>
                {breakdown.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 32 }}>
                    <MaterialIcons
                      name="bar-chart"
                      size={40}
                      color={colors.onSurfaceVariant}
                      style={{ opacity: 0.4 }}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                        marginTop: 12,
                      }}
                    >
                      No breakdown data available yet
                    </Text>
                  </View>
                ) : (
                  breakdown.map((b) => {
                    const bPct =
                      b.avgPercentage !== null
                        ? parseFloat(b.avgPercentage)
                        : null;
                    const bColor = getExamTypeColor(b.examType);

                    return (
                      <View
                        key={b.examType}
                        style={{
                          backgroundColor: colors.surfaceContainerLow,
                          padding: 14,
                          borderRadius: 12,
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: bColor + "20",
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.sm,
                                  fontFamily: FONTS.bold,
                                  color: bColor,
                                }}
                              >
                                {b.examType}
                              </Text>
                            </View>
                            {/* Configured Max Marks */}
                            <View
                              style={{
                                backgroundColor: colors.surfaceContainerHighest,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  fontFamily: FONTS.bold,
                                  color: colors.onSurface,
                                }}
                              >
                                Max: {b.maxMarks} M
                              </Text>
                            </View>
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.md,
                                fontFamily: FONTS.bold,
                                color:
                                  bPct !== null
                                    ? getGradeColor(bPct)
                                    : colors.onSurfaceVariant,
                              }}
                            >
                              {bPct !== null ? `${bPct}%` : "—"}
                            </Text>
                            {b.avgMarksObtained !== null && (
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.sm,
                                  fontFamily: FONTS.bold,
                                  color: colors.primary,
                                }}
                              >
                                Avg: {b.avgMarksObtained} / {b.maxMarks} M
                              </Text>
                            )}
                          </View>
                        </View>

                        <View
                          style={{
                            height: 6,
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 10,
                            overflow: "hidden",
                            marginTop: 4,
                          }}
                        >
                          <View
                            style={{
                              height: "100%",
                              width: bPct !== null ? `${bPct}%` : "0%",
                              backgroundColor:
                                bPct !== null
                                  ? bColor
                                  : colors.onSurfaceVariant + "30",
                              borderRadius: 10,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {type === "class" && (
                <Pressable
                  onPress={() => {
                    setSelectedItem(null);
                    setTimeout(() => {
                      router.push(
                        `/shared/class-reports?classId=${data.classId}`
                      );
                    }, 300);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 16,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <MaterialIcons name="assessment" size={20} color="#FFFFFF" />
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.bold,
                      color: "#FFFFFF",
                    }}
                  >
                    View Full Class Report & Rankings
                  </Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // ----------------------------------------------------
  // STUDENT SCORE CARD MODAL (Subject-wise exact marks breakdown)
  // ----------------------------------------------------
  const renderStudentModal = () => {
    if (!selectedStudent) return null;
    const s = selectedStudent;
    const subjectScores = s.subjectScores || [];

    return (
      <Modal
        transparent
        visible={!!selectedStudent}
        animationType="slide"
        onRequestClose={() => setSelectedStudent(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setSelectedStudent(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 40,
                maxHeight: "85%",
              }}
            >
              {/* Handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: colors.onSurfaceVariant + "40",
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    paddingRight: 8,
                  }}
                >
                  <UserAvatar
                    photoUrl={s.profilePhoto}
                    name={formatUserName(s.studentName)}
                    role="student"
                    size={50}
                    showBorder
                    borderColor={colors.primary + "30"}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: colors.primary + "20",
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
                          Rank #{s.rank}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        {formatClassName(s.className)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                        marginTop: 4,
                      }}
                      numberOfLines={1}
                    >
                      {formatUserName(s.studentName)}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: colors.primary,
                        marginTop: 2,
                      }}
                    >
                      Total Score: {s.totalObtained} / {s.totalMax} Marks (
                      {s.percentage.toFixed(1)}%)
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: getGradeColor(s.percentage) + "18",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.bold,
                      color: getGradeColor(s.percentage),
                    }}
                  >
                    {s.percentage.toFixed(1)}%
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.bold,
                      color: getGradeColor(s.percentage),
                    }}
                  >
                    Grade {s.grade}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.bold,
                  color: colors.onSurfaceVariant,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}
              >
                Subject-Wise Breakdown ({subjectScores.length} Exams)
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {subjectScores.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <MaterialIcons
                      name="assignment"
                      size={36}
                      color={colors.onSurfaceVariant}
                      style={{ opacity: 0.4 }}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                        marginTop: 8,
                      }}
                    >
                      No marks entries for this student yet
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {subjectScores.map((score, idx) => (
                      <View
                        key={score.examId || idx}
                        style={{
                          backgroundColor: colors.surfaceContainerLow,
                          borderRadius: 12,
                          padding: 12,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderLeftWidth: 3,
                          borderLeftColor: getGradeColor(score.percentage),
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.bold,
                              color: colors.onSurface,
                            }}
                          >
                            {score.subjectName}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 2,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor:
                                  getExamTypeColor(score.examType) + "20",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.micro,
                                  fontFamily: FONTS.bold,
                                  color: getExamTypeColor(score.examType),
                                }}
                              >
                                {score.examType}
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                fontFamily: FONTS.medium,
                                color: colors.onSurfaceVariant,
                              }}
                            >
                              Max: {score.totalMarks} Marks
                            </Text>
                          </View>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.md,
                              fontFamily: FONTS.bold,
                              color: getGradeColor(score.percentage),
                            }}
                          >
                            {score.marksObtained} / {score.totalMarks}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.bold,
                              color: colors.onSurfaceVariant,
                              marginTop: 1,
                            }}
                          >
                            {score.percentage}% (Grade {score.grade})
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              <Pressable
                onPress={() => setSelectedStudent(null)}
                style={{
                  backgroundColor: colors.surfaceContainerHighest,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

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
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <Header
          title="Exam Analytics"
          subtitle="Initialized marks & school performance"
          showBack
        />

        {/* Filter Row: Academic Year & Exam Types */}
        <View style={{ marginTop: 16, gap: 10 }}>
          {/* Academic Year Selector Pills */}
          {academicYears.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: colors.onSurfaceVariant,
                    marginRight: 4,
                  }}
                >
                  YEAR:
                </Text>
                {academicYears.map((year) => (
                  <Pressable
                    key={year._id}
                    onPress={() => setSelectedYearId(year._id)}
                    style={{
                      backgroundColor:
                        selectedYearId === year._id
                          ? colors.primary
                          : colors.surfaceContainerHigh,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color:
                          selectedYearId === year._id
                            ? "#FFFFFF"
                            : colors.onSurface,
                      }}
                    >
                      {year.name} {year.isActive ? "(Active)" : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Exam Type Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              <Pressable
                onPress={() => handleSelectExamType("ALL")}
                style={{
                  backgroundColor:
                    selectedExamType === "ALL"
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: selectedExamType === "ALL" ? 1.5 : 0,
                  borderColor:
                    selectedExamType === "ALL" ? "#FFFFFF40" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                    color:
                      selectedExamType === "ALL" ? "#FFFFFF" : colors.onSurface,
                  }}
                >
                  All Exams
                </Text>
              </Pressable>

              {EXAM_TYPES.map((type) => {
                const isSelected = selectedExamType === type;
                const typeColor = getExamTypeColor(type);
                return (
                  <Pressable
                    key={type}
                    onPress={() => handleSelectExamType(type)}
                    style={{
                      backgroundColor: isSelected
                        ? typeColor
                        : colors.surfaceContainerHigh,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      borderWidth: isSelected ? 1.5 : 0,
                      borderColor: isSelected ? "#FFFFFF40" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: isSelected ? "#FFFFFF" : colors.onSurface,
                      }}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* 5-Tab Switcher */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 18,
            backgroundColor: colors.surfaceContainerHigh,
            borderRadius: 100,
            padding: 3,
          }}
        >
          {[
            { key: "overview", icon: "dashboard", label: "Overview" },
            { key: "classes", icon: "school", label: "Classes" },
            { key: "subjects", icon: "book", label: "Subjects" },
            { key: "students", icon: "people", label: "Students" },
            { key: "setup", icon: "settings", label: "Setup" },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveView(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor:
                  activeView === tab.key ? colors.primary : "transparent",
                borderRadius: 100,
              }}
            >
              <View style={{ alignItems: "center", gap: 2 }}>
                <MaterialIcons
                  name={tab.icon}
                  size={15}
                  color={
                    activeView === tab.key ? "#fff" : colors.onSurfaceVariant
                  }
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color:
                      activeView === tab.key ? "#fff" : colors.onSurfaceVariant,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {isLoading && !schoolData ? (
          <View
            style={{
              paddingVertical: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                marginTop: 12,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
                fontSize: FONT_SIZES.sm,
              }}
            >
              Loading Exam Analytics...
            </Text>
          </View>
        ) : (
          <View style={{ opacity: isFetching && !isLoading ? 0.85 : 1 }}>
            {activeView === "overview" && renderOverview()}
            {activeView === "classes" && renderClasses()}
            {activeView === "subjects" && renderSubjects()}
            {activeView === "students" && renderStudents()}
            {activeView === "setup" && renderSetup()}
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
      {renderStudentModal()}
    </View>
  );
}
