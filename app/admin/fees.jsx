import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import storage from "../../utils/storage";
import { useRouter } from "expo-router";
import { useTheme, FONT_FAMILIES, FONTS, FONT_SIZES } from "../../theme";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import apiFetch from "../../utils/apiFetch";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";
import { formatClassName } from "../../utils/formatClassName";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatUserName } from "../../utils/userFormatters";

export default function AdminFeesScreen() {
  const _router = useRouter();
  const { _styles, colors } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, collect, structure, students
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries(["feeAnalytics"]),
        queryClient.invalidateQueries(["studentsFeeSummary", selectedYearId]),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Collect Fees State
  // eslint-disable-next-line no-unused-vars
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [bookNumber, setBookNumber] = useState("");
  const [manualReceiptNumber, setManualReceiptNumber] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [remarks, setRemarks] = useState("");

  // Fee Structure State
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [newComponent, setNewComponent] = useState({ name: "", amount: "" });

  // Specific Student Fee State
  const [structureType, setStructureType] = useState("class_default"); // 'class_default', 'student_specific'
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Fetch Analytics
  const {
    data: analytics = {
      collectedToday: 0,
      collectedThisMonth: 0,
      totalCollected: 0,
      totalExpectedFees: 0,
      totalPending: 0,
      totalArrears: 0,
      totalConcession: 0,
      totalGrossFees: 0,
    },
    isLoading: analyticsLoading,
  } = useApiQuery(["feeAnalytics"], `${apiConfig.baseUrl}/fees/analytics`);

  // Fetch Classes and Years
  const { data: initData, isLoading: initLoading } = useApiQuery(
    ["adminClassesInit"],
    `${apiConfig.baseUrl}/classes/admin/init`
  );
  const classes = initData?.classes || [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const academicYears = initData?.academicYears || [];

  useEffect(() => {
    if (academicYears.length > 0 && !selectedYearId) {
      setSelectedYearId(academicYears[0]._id);
    }
  }, [academicYears, selectedYearId]);

  // State for sorting & filtering
  const [sortBy, setSortBy] = useState("className");
  const [sortOrder, setSortOrder] = useState("asc");
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [classSortFilter, setClassSortFilter] = useState("all"); // 'all', 'dues', 'rate', 'target'
  const [studentStatusFilter, setStudentStatusFilter] = useState("all"); // 'all', 'dues', 'cleared'

  const filteredClasses = useMemo(() => {
    if (!analytics?.classBreakdown) return [];
    let list = [...analytics.classBreakdown];

    if (classSearchQuery.trim()) {
      const q = classSearchQuery.toLowerCase().trim();
      list = list.filter((c) =>
        `${c.className || ""} ${c.section || ""}`.toLowerCase().includes(q)
      );
    }

    if (classSortFilter === "dues") {
      list.sort((a, b) => (b.totalPending || 0) - (a.totalPending || 0));
    } else if (classSortFilter === "rate") {
      list.sort((a, b) => (a.collectionRate || 0) - (b.collectionRate || 0));
    } else if (classSortFilter === "target") {
      list.sort((a, b) => {
        const targetA = a.totalExpected ?? a.totalFees ?? 0;
        const targetB = b.totalExpected ?? b.totalFees ?? 0;
        return targetB - targetA;
      });
    }

    return list;
  }, [analytics?.classBreakdown, classSearchQuery, classSortFilter]);

  // Fetch All Students with Fee Summary
  const { data: studentsData, isLoading: studentsLoading } = useApiQuery(
    ["studentsFeeSummary", selectedYearId],
    `${apiConfig.baseUrl}/fees/summary?academicYearId=${selectedYearId || ""}`,
    { enabled: activeTab === "students" }
  );
  const allStudents = studentsData || [];

  // Fetch Fee Details for Selected Student
  const selectedStudentId = selectedStudent?._id || selectedStudent?.id;
  // eslint-disable-next-line no-unused-vars
  const { data: feeDetails, refetch: refetchFeeDetails } = useApiQuery(
    ["feeDetails", selectedStudentId],
    `${apiConfig.baseUrl}/fees/student/${selectedStudentId}`,
    { enabled: !!selectedStudentId && selectedStudentId !== "undefined" }
  );

  // Fetch Fee Structure for Selected Class
  const { data: structureData } = useApiQuery(
    ["feeStructure", selectedClassId],
    `${apiConfig.baseUrl}/fees/structure/class/${selectedClassId}`,
    { enabled: !!selectedClassId }
  );
  const [structureComponents, setStructureComponents] = useState([]);

  useEffect(() => {
    if (structureData?.components) {
      setStructureComponents(structureData.components);
    } else {
      setStructureComponents([]);
    }
  }, [structureData]);

  const loading = analyticsLoading || initLoading;

  // Mutations
  const paymentMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/fees/payment`,
      "POST"
    ),
    onSuccess: () => {
      showToast("Payment recorded successfully", "success");
      setSelectedStudent(null);
      setPaymentAmount("");
      setBookNumber("");
      setManualReceiptNumber("");
      setRemarks("");
      queryClient.invalidateQueries({ queryKey: ["feeAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["feeDetails"] });
    },
    onError: (error) => showToast(error.message || "Payment failed", "error"),
  });

  const saveStructureMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/fees/structure`,
      "POST"
    ),
    onSuccess: () => {
      showToast("Fee structure saved", "success");
      queryClient.invalidateQueries({ queryKey: ["feeStructure"] });
    },
    onError: (error) =>
      showToast(error.message || "Failed to save structure", "error"),
  });

  const searchStudent = async (query, setResults, classId = null) => {
    if (!query.trim()) return;
    try {
      const token = await storage.getItem("@auth_token");
      let url = `${apiConfig.baseUrl}/users/search?query=${query}&role=student`;
      if (classId) {
        url += `&classId=${classId}`;
      }
      const response = await apiFetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error(error);
      showToast("Error searching student", "error");
    }
  };

  // eslint-disable-next-line no-unused-vars
  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery("");
  };

  // eslint-disable-next-line no-unused-vars
  const handlePayment = () => {
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
      showToast("Invalid amount", "error");
      return;
    }

    paymentMutation.mutate({
      studentId: selectedStudent._id,
      amount: Number(paymentAmount),
      bookNumber,
      manualReceiptNumber,
      paymentMethod,
      remarks,
    });
  };

  const addComponent = () => {
    if (!newComponent.name || !newComponent.amount) {
      showToast("Please fill name and amount", "error");
      return;
    }
    setStructureComponents([
      ...structureComponents,
      { ...newComponent, amount: Number(newComponent.amount) },
    ]);
    setNewComponent({ name: "", amount: "" });
  };

  const removeComponent = (index) => {
    const updated = [...structureComponents];
    updated.splice(index, 1);
    setStructureComponents(updated);
  };

  const saveStructure = () => {
    if (!selectedClassId || !selectedYearId) {
      showToast("Select class and academic year", "error");
      return;
    }
    if (structureComponents.length === 0) {
      showToast("Add at least one fee component", "error");
      return;
    }
    if (structureType === "student_specific" && selectedStudents.length === 0) {
      showToast("Select at least one student", "error");
      return;
    }

    saveStructureMutation.mutate({
      classId: selectedClassId,
      academicYearId: selectedYearId,
      components: structureComponents,
      paymentSchedule: [], // Can be added later
      type: structureType,
      students:
        structureType === "student_specific"
          ? selectedStudents.map((s) => s._id)
          : [],
    });
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Header
          title="Fees Management"
          subtitle="Track and collect fees"
          showBack
        />
      </View>

      {/* Tabs - Segmented Control */}
      <View style={{ paddingHorizontal: 16, marginBottom: 18 }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.textSecondary + "15",
          }}
        >
          {[
            { key: "dashboard", label: "Overview", icon: "dashboard" },
            { key: "structure", label: "Structure", icon: "tune" },
            { key: "students", label: "Students", icon: "people" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);
                  setSelectedStudent(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                  backgroundColor:
                    isActive ? colors.surface || colors.background : "transparent",
                  borderRadius: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={16}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={{
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontFamily: isActive ? FONTS.bold : FONTS.medium,
                    fontSize: FONT_SIZES.sm,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {activeTab === "dashboard" && (
          <View style={{ padding: 16 }}>
            {/* Summary Headers */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.textPrimary,
                }}
              >
                Financial Summary
              </Text>
              <View
                style={{
                  backgroundColor: colors.primary + "15",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <MaterialIcons name="pie-chart" size={14} color={colors.primary} />
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    color: colors.primary,
                    fontFamily: FONTS.bold,
                  }}
                >
                  {analytics.totalExpectedFees > 0
                    ? (
                        (analytics.totalCollected / analytics.totalExpectedFees) *
                        100
                      ).toFixed(1)
                    : 0}
                  % Reached
                </Text>
              </View>
            </View>

            {/* Hero Card with LinearGradient */}
            <LinearGradient
              colors={[colors.primary, "#6342A6", "#452B82"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 22,
                marginBottom: 18,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.28,
                shadowRadius: 16,
                elevation: 8,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Decorative background glow circles */}
              <View
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: -30,
                  left: -30,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Total Fees Collected
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.18)",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 14,
                    gap: 4,
                  }}
                >
                  <MaterialIcons name="verified" size={13} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontFamily: FONTS.bold,
                      fontSize: FONT_SIZES.micro,
                    }}
                  >
                    Active Session
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  fontSize: 34,
                  fontFamily: FONTS.bold,
                  color: "#fff",
                  letterSpacing: -0.5,
                }}
              >
                ₹{analytics.totalCollected.toLocaleString()}
              </Text>

              {/* Progress bar inside hero card */}
              <View style={{ marginTop: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.78)",
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.medium,
                    }}
                  >
                    Target: ₹{analytics.totalExpectedFees.toLocaleString()}
                  </Text>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    {analytics.totalExpectedFees > 0
                      ? Math.round(
                          (analytics.totalCollected / analytics.totalExpectedFees) * 100
                        )
                      : 0}
                    %
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    backgroundColor: "rgba(255,255,255,0.22)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          analytics.totalExpectedFees > 0
                            ? (analytics.totalCollected / analytics.totalExpectedFees) *
                                100
                            : 0
                        )
                      )}%`,
                      height: "100%",
                      backgroundColor: "#4ADE80",
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            </LinearGradient>

            {/* Stats Grid: 4 Modern Metric Cards */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              {/* Collected Today */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.cardBackground,
                  padding: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.textSecondary + "15",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.success + "15",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <MaterialIcons name="today" size={20} color={colors.success} />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Today
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                    marginTop: 3,
                  }}
                >
                  ₹{analytics.collectedToday.toLocaleString()}
                </Text>
              </View>

              {/* This Month */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.cardBackground,
                  padding: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.textSecondary + "15",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.secondary + "15",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={colors.secondary}
                  />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                  }}
                >
                  This Month
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                    marginTop: 3,
                  }}
                >
                  ₹{analytics.collectedThisMonth.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              {/* Total Pending */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.cardBackground,
                  padding: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.error + "25",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.error + "15",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <MaterialIcons name="schedule" size={20} color={colors.error} />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Total Pending
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.error,
                    marginTop: 3,
                  }}
                >
                  ₹{analytics.totalPending.toLocaleString()}
                </Text>
              </View>

              {/* Total Target / Expected */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.cardBackground,
                  padding: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.primary + "25",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.primary + "15",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Total Target
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                    marginTop: 3,
                  }}
                >
                  ₹{analytics.totalExpectedFees.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Concession & Arrears Secondary Insights Strip */}
            {(analytics.totalConcession > 0 || analytics.totalArrears > 0) && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {analytics.totalConcession > 0 && (
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#FF980012",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#FF980025",
                      gap: 6,
                    }}
                  >
                    <MaterialIcons name="local-offer" size={16} color="#FF9800" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.micro,
                          color: "#FF9800",
                          fontFamily: FONTS.bold,
                          textTransform: "uppercase",
                        }}
                      >
                        Concessions
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          color: colors.textPrimary,
                          fontFamily: FONTS.bold,
                        }}
                      >
                        ₹{(analytics.totalConcession || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
                {analytics.totalArrears > 0 && (
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: (colors.warning || "#FFB020") + "12",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: (colors.warning || "#FFB020") + "25",
                      gap: 6,
                    }}
                  >
                    <MaterialIcons
                      name="history"
                      size={16}
                      color={colors.warning || "#FFB020"}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.micro,
                          color: colors.warning || "#FFB020",
                          fontFamily: FONTS.bold,
                          textTransform: "uppercase",
                        }}
                      >
                        Arrears
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          color: colors.textPrimary,
                          fontFamily: FONTS.bold,
                        }}
                      >
                        ₹{analytics.totalArrears.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Class-wise Fee Collection Breakdown */}
            {analytics.classBreakdown &&
              analytics.classBreakdown.length > 0 && (
                <View style={{ marginTop: 12 }}>
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
                          fontSize: FONT_SIZES.lg,
                          fontFamily: FONTS.bold,
                          color: colors.textPrimary,
                        }}
                      >
                        Class-wise Breakdown
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          color: colors.textSecondary,
                          fontFamily: FONTS.medium,
                          marginTop: 2,
                        }}
                      >
                        Target, collected & pending per class
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: colors.primary + "15",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          color: colors.primary,
                          fontFamily: FONTS.bold,
                        }}
                      >
                        {analytics.classBreakdown.length} Classes
                      </Text>
                    </View>
                  </View>

                  {/* Search and Sort Filter Chips */}
                  <View style={{ marginBottom: 14, gap: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.cardBackground,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === "ios" ? 10 : 6,
                        borderWidth: 1,
                        borderColor: colors.textSecondary + "15",
                      }}
                    >
                      <MaterialIcons
                        name="search"
                        size={20}
                        color={colors.textSecondary}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        value={classSearchQuery}
                        onChangeText={setClassSearchQuery}
                        placeholder="Search class or section..."
                        placeholderTextColor={colors.textSecondary}
                        style={{
                          flex: 1,
                          color: colors.textPrimary,
                          fontFamily: FONTS.medium,
                          fontSize: FONT_SIZES.sm,
                        }}
                      />
                      {classSearchQuery ? (
                        <Pressable onPress={() => setClassSearchQuery("")} hitSlop={8}>
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={colors.textSecondary}
                          />
                        </Pressable>
                      ) : null}
                    </View>

                    {/* Filter Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {[
                          { key: "all", label: "All Classes" },
                          { key: "dues", label: "Highest Pending" },
                          { key: "rate", label: "Lowest %" },
                          { key: "target", label: "Highest Target" },
                        ].map((chip) => {
                          const isActive = classSortFilter === chip.key;
                          return (
                            <Pressable
                              key={chip.key}
                              onPress={() => setClassSortFilter(chip.key)}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 12,
                                backgroundColor: isActive
                                  ? colors.primary
                                  : colors.cardBackground,
                                borderWidth: 1,
                                borderColor: isActive
                                  ? colors.primary
                                  : colors.textSecondary + "15",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  fontFamily: isActive ? FONTS.bold : FONTS.medium,
                                  color: isActive ? "#fff" : colors.textSecondary,
                                }}
                              >
                                {chip.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={{ gap: 14 }}>
                    {filteredClasses.map((item, idx) => {
                      const rate = item.collectionRate || 0;
                      const rateColor =
                        rate >= 75
                          ? colors.success
                          : rate >= 40
                          ? colors.warning || "#FFB020"
                          : colors.error;

                      // Total collectible fees for this class (target expected after concession/arrears)
                      const totalCollectible =
                        item.totalExpected !== undefined && item.totalExpected !== null
                          ? item.totalExpected
                          : (item.totalPaid || 0) + (item.totalPending || 0) || (item.totalFees || 0);

                      return (
                        <Pressable
                          key={item.classId || idx}
                          onPress={() => {
                            setStudentSearchQuery(
                              item.className === "Unassigned"
                                ? ""
                                : item.className
                            );
                            setActiveTab("students");
                          }}
                          style={({ pressed }) => [
                            {
                              backgroundColor: colors.cardBackground,
                              borderRadius: 18,
                              padding: 18,
                              borderWidth: 1,
                              borderColor: colors.textSecondary + "15",
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.04,
                              shadowRadius: 6,
                              elevation: 2,
                              opacity: pressed ? 0.95 : 1,
                            },
                          ]}
                        >
                          {/* Card Header: Class Badge + Name + Student Count + Rate Badge */}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                flex: 1,
                              }}
                            >
                              <View
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 12,
                                  backgroundColor: colors.primary + "12",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  borderWidth: 1,
                                  borderColor: colors.primary + "25",
                                }}
                              >
                                <MaterialIcons
                                  name="school"
                                  size={20}
                                  color={colors.primary}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontFamily: FONTS.bold,
                                    color: colors.textPrimary,
                                    fontSize: FONT_SIZES.md,
                                  }}
                                  numberOfLines={1}
                                >
                                  {formatClassName(item.className, item.section)}
                                </Text>
                                <Text
                                  style={{
                                    color: colors.textSecondary,
                                    fontSize: FONT_SIZES.xs,
                                    fontFamily: FONTS.medium,
                                    marginTop: 1,
                                  }}
                                >
                                  {item.studentCount}{" "}
                                  {item.studentCount === 1 ? "student" : "students"} enrolled
                                </Text>
                              </View>
                            </View>

                            <View
                              style={{
                                backgroundColor: rateColor + "15",
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: rateColor + "30",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <View
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: rateColor,
                                }}
                              />
                              <Text
                                style={{
                                  color: rateColor,
                                  fontFamily: FONTS.bold,
                                  fontSize: FONT_SIZES.xs,
                                }}
                              >
                                {rate}% Collected
                              </Text>
                            </View>
                          </View>

                          {/* Progress Bar */}
                          <View
                            style={{
                              height: 7,
                              backgroundColor: colors.background,
                              borderRadius: 4,
                              overflow: "hidden",
                              marginBottom: 14,
                            }}
                          >
                            <View
                              style={{
                                width: `${Math.min(100, Math.max(0, rate))}%`,
                                height: "100%",
                                backgroundColor: rateColor,
                                borderRadius: 4,
                              }}
                            />
                          </View>

                          {/* 3-Column Metrics: Total Collectible, Collected, Pending */}
                          <View
                            style={{
                              flexDirection: "row",
                              backgroundColor: colors.background,
                              borderRadius: 14,
                              padding: 12,
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            {/* 1. Total Collectible Fees (Requested by user) */}
                            <View style={{ flex: 1, alignItems: "center" }}>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.micro,
                                  color: colors.textSecondary,
                                  fontFamily: FONTS.medium,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3,
                                }}
                              >
                                Total Fees
                              </Text>
                              <Text
                                style={{
                                  fontFamily: FONTS.bold,
                                  color: colors.primary,
                                  fontSize: FONT_SIZES.sm,
                                  marginTop: 3,
                                }}
                              >
                                ₹{totalCollectible.toLocaleString()}
                              </Text>
                            </View>

                            <View
                              style={{
                                width: 1,
                                height: 24,
                                backgroundColor: colors.textSecondary + "20",
                              }}
                            />

                            {/* 2. Collected */}
                            <View style={{ flex: 1, alignItems: "center" }}>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.micro,
                                  color: colors.textSecondary,
                                  fontFamily: FONTS.medium,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3,
                                }}
                              >
                                Collected
                              </Text>
                              <Text
                                style={{
                                  fontFamily: FONTS.bold,
                                  color: colors.success,
                                  fontSize: FONT_SIZES.sm,
                                  marginTop: 3,
                                }}
                              >
                                ₹{(item.totalPaid || 0).toLocaleString()}
                              </Text>
                            </View>

                            <View
                              style={{
                                width: 1,
                                height: 24,
                                backgroundColor: colors.textSecondary + "20",
                              }}
                            />

                            {/* 3. Pending */}
                            <View style={{ flex: 1, alignItems: "center" }}>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.micro,
                                  color: colors.textSecondary,
                                  fontFamily: FONTS.medium,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3,
                                }}
                              >
                                Pending
                              </Text>
                              <Text
                                style={{
                                  fontFamily: FONTS.bold,
                                  color:
                                    (item.totalPending || 0) > 0
                                      ? colors.error
                                      : colors.textSecondary,
                                  fontSize: FONT_SIZES.sm,
                                  marginTop: 3,
                                }}
                              >
                                ₹{(item.totalPending || 0).toLocaleString()}
                              </Text>
                            </View>
                          </View>

                          {/* Extra info chips: Concession & Arrears & View link */}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: 10,
                              paddingTop: 8,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 6,
                                flexWrap: "wrap",
                                flex: 1,
                              }}
                            >
                              {item.totalConcession > 0 && (
                                <View
                                  style={{
                                    backgroundColor: "#FF980015",
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: FONT_SIZES.micro,
                                      color: "#FF9800",
                                      fontFamily: FONTS.bold,
                                    }}
                                  >
                                    ₹{item.totalConcession.toLocaleString()} Concession
                                  </Text>
                                </View>
                              )}
                              {item.totalArrears > 0 && (
                                <View
                                  style={{
                                    backgroundColor:
                                      (colors.warning || "#FFB020") + "15",
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: FONT_SIZES.micro,
                                      color: colors.warning || "#FFB020",
                                      fontFamily: FONTS.bold,
                                    }}
                                  >
                                    ₹{item.totalArrears.toLocaleString()} Arrears
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Text
                                style={{
                                  color: colors.primary,
                                  fontSize: FONT_SIZES.xs,
                                  fontFamily: FONTS.bold,
                                }}
                              >
                                View Students
                              </Text>
                              <MaterialIcons
                                name="chevron-right"
                                size={16}
                                color={colors.primary}
                              />
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
          </View>
        )}

        {activeTab === "structure" && (
          <View style={{ padding: 16 }}>
            {/* 1. Context Header (Sticky-like) */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontFamily: FONTS.medium,
                }}
              >
                Select Class & Year
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {classes.map((cls) => (
                    <Pressable
                      key={cls._id}
                      onPress={() => setSelectedClassId(cls._id)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor:
                          selectedClassId === cls._id
                            ? colors.primary
                            : colors.cardBackground,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          selectedClassId === cls._id
                            ? colors.primary
                            : colors.textSecondary + "20",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            selectedClassId === cls._id
                              ? "#fff"
                              : colors.textPrimary,
                          fontFamily: FONTS.medium,
                        }}
                      >
                        {formatClassName(cls.name, cls.section)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {selectedClassId ? (
              <View>
                {/* 2. Target Selection (Segmented Control) */}
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    padding: 4,
                    marginBottom: 24,
                  }}
                >
                  <Pressable
                    onPress={() => setStructureType("class_default")}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor:
                        structureType === "class_default"
                          ? colors.background
                          : "transparent",
                      borderRadius: 10,
                      shadowColor:
                        structureType === "class_default"
                          ? "#000"
                          : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity:
                        structureType === "class_default" ? 0.1 : 0,
                      shadowRadius: 4,
                      elevation: structureType === "class_default" ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          structureType === "class_default"
                            ? colors.primary
                            : colors.textSecondary,
                        fontFamily: FONTS.bold,
                      }}
                    >
                      Class Default
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setStructureType("student_specific")}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor:
                        structureType === "student_specific"
                          ? colors.background
                          : "transparent",
                      borderRadius: 10,
                      shadowColor:
                        structureType === "student_specific"
                          ? "#000"
                          : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity:
                        structureType === "student_specific" ? 0.1 : 0,
                      shadowRadius: 4,
                      elevation: structureType === "student_specific" ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          structureType === "student_specific"
                            ? colors.primary
                            : colors.textSecondary,
                        fontFamily: FONTS.bold,
                      }}
                    >
                      Specific Student
                    </Text>
                  </Pressable>
                </View>

                {/* 3. Student Selection (Conditional) */}
                {structureType === "student_specific" && (
                  <View style={{ marginBottom: 24 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <TextInput
                        value={studentSearchQuery}
                        onChangeText={setStudentSearchQuery}
                        placeholder="Search student..."
                        placeholderTextColor={colors.textSecondary}
                        style={{
                          flex: 1,
                          backgroundColor: colors.cardBackground,
                          padding: 12,
                          borderRadius: 12,
                          color: colors.textPrimary,
                          fontFamily: FONTS.medium,
                        }}
                      />
                      <Pressable
                        onPress={() =>
                          searchStudent(
                            studentSearchQuery,
                            setStudentSearchResults,
                            selectedClassId
                          )
                        }
                        style={{
                          backgroundColor: colors.primary,
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons name="search" size={24} color="#fff" />
                      </Pressable>
                    </View>

                    {/* Search Results */}
                    {studentSearchResults.length > 0 && (
                      <View
                        style={{
                          maxHeight: 150,
                          backgroundColor: colors.cardBackground,
                          borderRadius: 12,
                          marginBottom: 12,
                          padding: 8,
                        }}
                      >
                        <ScrollView nestedScrollEnabled>
                          {studentSearchResults.map((student) => (
                            <Pressable
                              key={student._id}
                              onPress={() => {
                                if (
                                  !selectedStudents.find(
                                    (s) => s._id === student._id
                                  )
                                ) {
                                  setSelectedStudents([
                                    ...selectedStudents,
                                    student,
                                  ]);
                                }
                                setStudentSearchResults([]);
                                setStudentSearchQuery("");
                              }}
                              style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.textSecondary + "10",
                              }}
                            >
                              <Text
                                style={{
                                  color: colors.textPrimary,
                                  fontFamily: FONTS.medium,
                                }}
                              >
                                {formatUserName(student.name)}
                              </Text>
                              <Text
                                style={{
                                  color: colors.textSecondary,
                                  fontSize: FONT_SIZES.sm,
                                }}
                              >
                                {student.phone}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Selected Students Chips */}
                    {selectedStudents.length > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {selectedStudents.map((student, index) => (
                          <View
                            key={student._id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: colors.primary + "15",
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: colors.primary + "30",
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                marginRight: 6,
                                fontFamily: FONTS.medium,
                              }}
                            >
                              {formatUserName(student.name)}
                            </Text>
                            <Pressable
                              onPress={() => {
                                const newSelected = [...selectedStudents];
                                newSelected.splice(index, 1);
                                setSelectedStudents(newSelected);
                              }}
                            >
                              <MaterialIcons
                                name="close"
                                size={16}
                                color={colors.primary}
                              />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* 4. Fee Components (The Core) */}
                <View
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 24,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: colors.textPrimary,
                      }}
                    >
                      Fee Breakdown
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.success + "20",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.success,
                          fontFamily: FONTS.bold,
                          fontSize: FONT_SIZES.sm,
                        }}
                      >
                        {structureComponents.length} Items
                      </Text>
                    </View>
                  </View>

                  {structureComponents.length === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: 20 }}>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontFamily: FONTS.medium,
                        }}
                      >
                        No fee components added yet.
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {structureComponents.map((comp, index) => (
                        <View
                          key={index}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 12,
                            borderBottomWidth:
                              index === structureComponents.length - 1 ? 0 : 1,
                            borderBottomColor: colors.textSecondary + "10",
                          }}
                        >
                          <Text
                            style={{
                              color: colors.textPrimary,
                              fontFamily: FONTS.medium,
                              fontSize: FONT_SIZES.md,
                            }}
                          >
                            {comp.name}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.textPrimary,
                                fontFamily: FONTS.bold,
                                fontSize: FONT_SIZES.md,
                              }}
                            >
                              ₹{comp.amount}
                            </Text>
                            <Pressable
                              onPress={() => removeComponent(index)}
                              hitSlop={10}
                            >
                              <MaterialIcons
                                name="remove-circle-outline"
                                size={20}
                                color={colors.error}
                              />
                            </Pressable>
                          </View>
                        </View>
                      ))}

                      <View
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTopWidth: 1,
                          borderTopColor: colors.textSecondary + "20",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontFamily: FONTS.medium,
                          }}
                        >
                          Total Amount
                        </Text>
                        <Text
                          style={{
                            color: colors.primary,
                            fontFamily: FONTS.bold,
                            fontSize: FONT_SIZES.lg,
                          }}
                        >
                          ₹
                          {structureComponents.reduce(
                            (sum, item) => sum + Number(item.amount),
                            0
                          )}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* 5. Adding Components (Action) */}
                <View style={{ marginBottom: 32 }}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      marginBottom: 12,
                      fontFamily: FONTS.medium,
                    }}
                  >
                    Add New Component
                  </Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TextInput
                      value={newComponent.name}
                      onChangeText={(t) =>
                        setNewComponent({ ...newComponent, name: t })
                      }
                      placeholder="Name (e.g. Tuition)"
                      placeholderTextColor={colors.textSecondary}
                      style={{
                        flex: 2,
                        backgroundColor: colors.cardBackground,
                        padding: 16,
                        borderRadius: 12,
                        color: colors.textPrimary,
                        fontFamily: FONTS.medium,
                      }}
                    />
                    <TextInput
                      value={newComponent.amount}
                      onChangeText={(t) =>
                        setNewComponent({ ...newComponent, amount: t })
                      }
                      placeholder="Amount"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                      style={{
                        flex: 1,
                        backgroundColor: colors.cardBackground,
                        padding: 16,
                        borderRadius: 12,
                        color: colors.textPrimary,
                        fontFamily: FONTS.medium,
                      }}
                    />
                    <Pressable
                      onPress={addComponent}
                      style={{
                        backgroundColor: colors.secondary,
                        width: 56,
                        borderRadius: 12,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <MaterialIcons name="add" size={28} color="#fff" />
                    </Pressable>
                  </View>
                </View>

                {/* 6. Save Action */}
                <Pressable
                  onPress={saveStructure}
                  disabled={saveStructureMutation.isPending}
                  style={{
                    backgroundColor: colors.primary,
                    padding: 18,
                    borderRadius: 16,
                    alignItems: "center",
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                    opacity: saveStructureMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {saveStructureMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: FONTS.bold,
                        fontSize: FONT_SIZES.lg,
                      }}
                    >
                      Save Fee Structure
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <MaterialIcons
                  name="class"
                  size={48}
                  color={colors.textSecondary + "40"}
                />
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginTop: 16,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Select a class to manage fees
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "students" && (
          <View style={{ padding: 16 }}>
            {selectedStudent ? (
              <View>
                <Pressable
                  onPress={() => setSelectedStudent(null)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 20,
                    alignSelf: "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: colors.cardBackground,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 8,
                    }}
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: FONTS.medium,
                    }}
                  >
                    Back to List
                  </Text>
                </Pressable>

                {/* Student Profile Card */}
                <View
                  style={{
                    backgroundColor: colors.cardBackground,
                    padding: 24,
                    borderRadius: 24,
                    marginBottom: 24,
                    alignItems: "center",
                  }}
                >
                  <UserAvatar
                    photoUrl={selectedStudent.profilePhoto}
                    name={formatUserName(selectedStudent.name)}
                    role="student"
                    size={72}
                    showBorder
                    borderColor={colors.primary + "30"}
                    style={{ marginBottom: 16 }}
                  />
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xl,
                      fontFamily: FONTS.bold,
                      color: colors.textPrimary,
                      marginBottom: 4,
                    }}
                  >
                    {formatUserName(selectedStudent.name)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 24,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: colors.background,
                        borderRadius: 8,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.medium,
                        }}
                      >
                        {feeDetails?.feeStructure
                          ? "Fee Structure Assigned"
                          : "No Structure"}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }}>
                      • {selectedStudent.phone}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      width: "100%",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        minWidth: "22%",
                        backgroundColor: colors.background,
                        padding: 12,
                        borderRadius: 16,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: FONT_SIZES.xs,
                          marginBottom: 4,
                        }}
                      >
                        Total Fees
                      </Text>
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          color: colors.textPrimary,
                          fontSize: FONT_SIZES.md,
                        }}
                      >
                        ₹{(feeDetails?.totalFees || 0).toLocaleString()}
                      </Text>
                    </View>
                    {feeDetails?.concession > 0 && (
                      <View
                        style={{
                          flex: 1,
                          minWidth: "22%",
                          backgroundColor: "#FF980015",
                          padding: 12,
                          borderRadius: 16,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#FF9800",
                            fontSize: FONT_SIZES.xs,
                            marginBottom: 4,
                          }}
                        >
                          Concession
                        </Text>
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            color: "#FF9800",
                            fontSize: FONT_SIZES.md,
                          }}
                        >
                          ₹{feeDetails.concession.toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {feeDetails?.arrears > 0 && (
                      <View
                        style={{
                          flex: 1,
                          minWidth: "22%",
                          backgroundColor: (colors.tertiary || colors.primary) + "15",
                          padding: 12,
                          borderRadius: 16,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.tertiary || colors.primary,
                            fontSize: FONT_SIZES.xs,
                            marginBottom: 4,
                          }}
                        >
                          Last Year
                        </Text>
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            color: colors.tertiary || colors.primary,
                            fontSize: FONT_SIZES.md,
                          }}
                        >
                          ₹{feeDetails.arrears.toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        flex: 1,
                        minWidth: "22%",
                        backgroundColor: colors.success + "10",
                        padding: 12,
                        borderRadius: 16,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.success,
                          fontSize: FONT_SIZES.xs,
                          marginBottom: 4,
                        }}
                      >
                        Paid
                      </Text>
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          color: colors.success,
                          fontSize: FONT_SIZES.md,
                        }}
                      >
                        ₹{(feeDetails?.paidAmount || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        minWidth: "22%",
                        backgroundColor: colors.error + "10",
                        padding: 12,
                        borderRadius: 16,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.error,
                          fontSize: FONT_SIZES.xs,
                          marginBottom: 4,
                        }}
                      >
                        Pending
                      </Text>
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          color: colors.error,
                          fontSize: FONT_SIZES.md,
                        }}
                      >
                        ₹{(feeDetails?.pendingAmount || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Installment Schedule & Overdue Status */}
                {feeDetails?.installmentSchedule &&
                  feeDetails.installmentSchedule.length > 0 && (
                    <View style={{ marginBottom: 24 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.lg,
                          fontFamily: FONTS.bold,
                          color: colors.textPrimary,
                          marginBottom: 12,
                        }}
                      >
                        Installment Schedule
                      </Text>
                      <View
                        style={{
                          backgroundColor: colors.cardBackground,
                          borderRadius: 20,
                          padding: 16,
                        }}
                      >
                        {feeDetails.installmentSchedule.map((inst, index) => {
                          const isPaid = inst.status === "paid";
                          const isOverdue = inst.status === "overdue";
                          const isDueSoon = inst.status === "due_soon";
                          const isPartial = inst.status === "partial";

                          const badgeColor = isPaid
                            ? colors.success
                            : isOverdue
                            ? colors.error
                            : isDueSoon
                            ? colors.warning || "#FFB020"
                            : isPartial
                            ? colors.primary
                            : colors.textSecondary;
                          const badgeBg = badgeColor + "15";
                          const badgeText = isPaid
                            ? "PAID"
                            : isOverdue
                            ? "OVERDUE"
                            : isDueSoon
                            ? "DUE SOON"
                            : isPartial
                            ? "PARTIAL"
                            : "UPCOMING";

                          return (
                            <View
                              key={index}
                              style={{
                                paddingVertical: 12,
                                borderBottomWidth:
                                  index ===
                                  feeDetails.installmentSchedule.length - 1
                                    ? 0
                                    : 1,
                                borderBottomColor: colors.textSecondary + "10",
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <View style={{ flex: 1, marginRight: 12 }}>
                                <Text
                                  style={{
                                    fontFamily: FONTS.bold,
                                    color: colors.textPrimary,
                                    fontSize: FONT_SIZES.md,
                                  }}
                                >
                                  {inst.description}
                                </Text>
                                <Text
                                  style={{
                                    color: colors.textSecondary,
                                    fontSize: FONT_SIZES.sm,
                                    marginTop: 2,
                                  }}
                                >
                                  Target: ₹{inst.amount.toLocaleString()} •{" "}
                                  {inst.dueDate
                                    ? `Due ${new Date(
                                        inst.dueDate
                                      ).toLocaleDateString()}`
                                    : "No due date"}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: badgeBg,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                }}
                              >
                                <Text
                                  style={{
                                    color: badgeColor,
                                    fontSize: FONT_SIZES.xs,
                                    fontFamily: FONTS.bold,
                                  }}
                                >
                                  {badgeText}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                    marginBottom: 16,
                  }}
                >
                  Payment History
                </Text>

                {feeDetails?.payments && feeDetails.payments.length > 0 ? (
                  <View
                    style={{
                      backgroundColor: colors.cardBackground,
                      borderRadius: 24,
                      padding: 8,
                    }}
                  >
                    {feeDetails.payments.map((payment, index) => (
                      <View
                        key={payment._id || index}
                        style={{
                          padding: 16,
                          borderBottomWidth:
                            index === feeDetails.payments.length - 1 ? 0 : 1,
                          borderBottomColor: colors.textSecondary + "10",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              fontFamily: FONTS.bold,
                              color: colors.textPrimary,
                              fontSize: FONT_SIZES.md,
                            }}
                          >
                            ₹{payment.amount}
                          </Text>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: FONT_SIZES.sm,
                              marginTop: 4,
                            }}
                          >
                            {new Date(payment.paymentDate).toLocaleDateString()}{" "}
                            • {payment.paymentMethod}
                          </Text>
                          {payment.receiptNumber && (
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: FONT_SIZES.sm,
                                fontFamily: FONT_FAMILIES.mono,
                                marginTop: 2,
                              }}
                            >
                              #{payment.receiptNumber}
                            </Text>
                          )}
                        </View>
                        <View
                          style={{
                            backgroundColor: colors.success + "15",
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.success,
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.bold,
                              textTransform: "capitalize",
                            }}
                          >
                            {payment.status || "Success"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View
                    style={{
                      alignItems: "center",
                      padding: 40,
                      backgroundColor: colors.cardBackground,
                      borderRadius: 24,
                    }}
                  >
                    <MaterialIcons
                      name="receipt-long"
                      size={48}
                      color={colors.textSecondary + "40"}
                    />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        marginTop: 16,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      No payment history found
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {/* Search and Sort Header */}
                <View
                  style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}
                >
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.cardBackground,
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: Platform.OS === "ios" ? 10 : 6,
                      borderWidth: 1,
                      borderColor: colors.textSecondary + "15",
                    }}
                  >
                    <MaterialIcons
                      name="search"
                      size={20}
                      color={colors.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      value={studentSearchQuery}
                      onChangeText={setStudentSearchQuery}
                      placeholder="Search student name, reg no, class..."
                      placeholderTextColor={colors.textSecondary}
                      style={{
                        flex: 1,
                        color: colors.textPrimary,
                        fontFamily: FONTS.medium,
                        fontSize: FONT_SIZES.sm,
                      }}
                    />
                    {studentSearchQuery ? (
                      <Pressable
                        onPress={() => setStudentSearchQuery("")}
                        hitSlop={8}
                      >
                        <MaterialIcons
                          name="close"
                          size={18}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => {
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                      if (sortBy !== "className") setSortBy("className");
                    }}
                    style={{
                      backgroundColor:
                        sortBy === "className"
                          ? colors.primary + "18"
                          : colors.cardBackground,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 4,
                      borderWidth: 1,
                      borderColor:
                        sortBy === "className"
                          ? colors.primary + "30"
                          : colors.textSecondary + "15",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.bold,
                        fontSize: FONT_SIZES.xs,
                        color:
                          sortBy === "className"
                            ? colors.primary
                            : colors.textSecondary,
                      }}
                    >
                      Class
                    </Text>
                    {sortBy === "className" && (
                      <MaterialIcons
                        name={
                          sortOrder === "asc"
                            ? "arrow-drop-up"
                            : "arrow-drop-down"
                        }
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                </View>

                {/* Filter Pills: All, Pending Dues, Cleared */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {[
                    { key: "all", label: "All Students" },
                    { key: "dues", label: "With Pending Dues" },
                    { key: "cleared", label: "Dues Cleared" },
                  ].map((filter) => {
                    const isActive = studentStatusFilter === filter.key;
                    return (
                      <Pressable
                        key={filter.key}
                        onPress={() => setStudentStatusFilter(filter.key)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 12,
                          backgroundColor: isActive
                            ? colors.primary
                            : colors.cardBackground,
                          borderWidth: 1,
                          borderColor: isActive
                            ? colors.primary
                            : colors.textSecondary + "15",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: isActive ? FONTS.bold : FONTS.medium,
                            color: isActive ? "#fff" : colors.textSecondary,
                          }}
                        >
                          {filter.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Active Filter Class Banner (when coming from class breakdown card) */}
                {studentSearchQuery ? (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: colors.primary + "12",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: colors.primary + "25",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="filter-list" size={16} color={colors.primary} />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          color: colors.primary,
                          fontFamily: FONTS.bold,
                        }}
                      >
                        Filtered by: &ldquo;{studentSearchQuery}&rdquo;
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setStudentSearchQuery("")}
                      hitSlop={8}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          color: colors.primary,
                          fontFamily: FONTS.bold,
                        }}
                      >
                        Clear Filter
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Table Header */}
                <View
                  style={{
                    flexDirection: "row",
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    backgroundColor: colors.primary + "10",
                    borderRadius: 12,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      flex: 2,
                      fontFamily: FONTS.bold,
                      color: colors.primary,
                      fontSize: FONT_SIZES.xs,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Student
                  </Text>
                  <Text
                    style={{
                      flex: 1.5,
                      fontFamily: FONTS.bold,
                      color: colors.primary,
                      fontSize: FONT_SIZES.xs,
                      textAlign: "center",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Class
                  </Text>
                  <Text
                    style={{
                      flex: 1.5,
                      fontFamily: FONTS.bold,
                      color: colors.primary,
                      fontSize: FONT_SIZES.xs,
                      textAlign: "right",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Dues Status
                  </Text>
                </View>

                {studentsLoading ? (
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    style={{ marginTop: 40 }}
                  />
                ) : (
                  <FlatList
                    data={allStudents
                      .filter((s) => {
                        // Text Search
                        const q = studentSearchQuery.toLowerCase().trim();
                        const matchQuery =
                          !q ||
                          (s.name && s.name.toLowerCase().includes(q)) ||
                          (s.regNo && s.regNo.toLowerCase().includes(q)) ||
                          (s.className && s.className.toLowerCase().includes(q));

                        if (!matchQuery) return false;

                        // Status Filter
                        if (studentStatusFilter === "dues") {
                          return (s.pendingAmount || 0) > 0;
                        }
                        if (studentStatusFilter === "cleared") {
                          return (s.pendingAmount || 0) <= 0;
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        if (sortBy === "className") {
                          const classA = a.className || "";
                          const classB = b.className || "";
                          return sortOrder === "asc"
                            ? classA.localeCompare(classB)
                            : classB.localeCompare(classA);
                        }
                        return 0;
                      })}
                    scrollEnabled={false}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => {
                      const isPending = (item.pendingAmount || 0) > 0;
                      return (
                        <Pressable
                          onPress={() => {
                            setSelectedStudent(item);
                          }}
                          style={({ pressed }) => [
                            {
                              backgroundColor: colors.cardBackground,
                              paddingVertical: 14,
                              paddingHorizontal: 16,
                              borderRadius: 14,
                              marginBottom: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: colors.textSecondary + "12",
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.03,
                              shadowRadius: 3,
                              elevation: 1,
                              opacity: pressed ? 0.95 : 1,
                            },
                          ]}
                        >
                          <View
                            style={{
                              flex: 2,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <UserAvatar
                              photoUrl={item.profilePhoto}
                              name={formatUserName(item.name)}
                              role="student"
                              size={38}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontFamily: FONTS.bold,
                                  color: colors.textPrimary,
                                  fontSize: FONT_SIZES.sm,
                                }}
                                numberOfLines={1}
                              >
                                {formatUserName(item.name)}
                              </Text>
                              <Text
                                style={{
                                  color: colors.textSecondary,
                                  fontSize: FONT_SIZES.xs,
                                  marginTop: 1,
                                }}
                                numberOfLines={1}
                              >
                                {item.regNo ? `Reg: ${item.regNo}` : "Student"}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1.5, alignItems: "center" }}>
                            <View
                              style={{
                                backgroundColor: colors.background,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.textSecondary + "15",
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: FONTS.medium,
                                  color: colors.textSecondary,
                                  fontSize: FONT_SIZES.xs,
                                }}
                              >
                                {formatClassName(item.className)}{" "}
                                {item.section ? `- ${item.section}` : ""}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1.5, alignItems: "flex-end" }}>
                            <View
                              style={{
                                backgroundColor: isPending
                                  ? colors.error + "15"
                                  : colors.success + "15",
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: isPending
                                  ? colors.error + "25"
                                  : colors.success + "25",
                                alignItems: "flex-end",
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: FONTS.bold,
                                  fontSize: FONT_SIZES.xs,
                                  color: isPending
                                    ? colors.error
                                    : colors.success,
                                }}
                              >
                                {isPending ? `₹${item.pendingAmount}` : "Cleared"}
                              </Text>
                              {isPending && (
                                <Text
                                  style={{
                                    color: colors.error,
                                    fontSize: FONT_SIZES.micro,
                                    fontFamily: FONTS.medium,
                                  }}
                                >
                                  {item.arrears > 0
                                    ? `Incl. ₹${item.arrears.toLocaleString()} Last Year`
                                    : "Pending Due"}
                                </Text>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      );
                    }}
                    ListEmptyComponent={() => (
                      <View style={{ alignItems: "center", marginTop: 40 }}>
                        <MaterialIcons
                          name="person-off"
                          size={48}
                          color={colors.textSecondary + "40"}
                        />
                        <Text
                          style={{
                            color: colors.textSecondary,
                            marginTop: 16,
                            fontFamily: FONTS.medium,
                          }}
                        >
                          No students found matching current filters
                        </Text>
                      </View>
                    )}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
