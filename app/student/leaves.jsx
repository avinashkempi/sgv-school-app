import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import { useAuth } from "../../context/AuthContext";
import { getISTDateString } from "../../utils/date";
import { useAcademicYear } from "../../context/AcademicYearContext";

export default function StudentLeaves() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const { t } = useLabel();
  const { user, userId: authUserId } = useAuth();
  const userId = user?.id || user?._id || authUserId;
  const { selectedYear } = useAcademicYear();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Form State
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySlot, setHalfDaySlot] = useState("morning");

  // Fetch Academic Years list
  const { data: academicYearsData } = useApiQuery(
    ["academicYearsListStudent"],
    `${apiConfig.baseUrl}/academic-year`
  );
  const academicYears = useMemo(() => academicYearsData || [], [academicYearsData]);

  const _activeYearObj = useMemo(() => {
    return (
      academicYears.find((y) => y.isActive) ||
      academicYears.find((y) => y.status === "current") ||
      selectedYear ||
      academicYears[0]
    );
  }, [academicYears, selectedYear]);

  // Fetch Leaves
  const queryParams = new URLSearchParams();
  if (selectedAcademicYearId !== "all") {
    queryParams.append("academicYear", selectedAcademicYearId);
  }
  if (statusFilter !== "all") {
    queryParams.append("status", statusFilter);
  }

  const {
    data: leavesData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["studentLeaves", userId, selectedAcademicYearId, statusFilter],
    `${apiConfig.baseUrl}/leaves/my-leaves?${queryParams.toString()}`
  );
  const leaves = useMemo(() => leavesData?.data || [], [leavesData]);

  // Summary counts
  const { data: allLeavesData } = useApiQuery(
    ["studentAllLeavesSummary", userId, selectedAcademicYearId],
    `${apiConfig.baseUrl}/leaves/my-leaves?academicYear=${selectedAcademicYearId}`
  );
  const allLeaves = useMemo(() => allLeavesData?.data || [], [allLeavesData]);

  const metrics = useMemo(() => {
    const pending = allLeaves.filter((l) => l.status === "pending").length;
    const approved = allLeaves.filter((l) => l.status === "approved").length;
    const rejected = allLeaves.filter((l) => l.status === "rejected").length;
    return {
      total: allLeaves.length,
      pending,
      approved,
      rejected,
    };
  }, [allLeaves]);

  // Apply Leave Mutation
  const applyLeaveMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/leaves/apply`,
      "POST"
    ),
    onSuccess: () => {
      showToast(
        t("student.leaveAppliedSuccess", "Leave request submitted to your class teacher"),
        "success"
      );
      setModalVisible(false);
      setReason("");
      setIsHalfDay(false);
      queryClient.invalidateQueries({ queryKey: ["studentLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["studentAllLeavesSummary"] });
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("student.leaveAppliedFailure", "Failed to apply leave"),
        "error"
      ),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["studentAllLeavesSummary"] })]);
    setRefreshing(false);
  };

  const handleApplyLeave = () => {
    if (!reason.trim()) {
      showToast(
        t("student.enterReasonError", "Please enter a reason for leave"),
        "error"
      );
      return;
    }

    if (!isHalfDay && endDate < startDate) {
      showToast(
        t(
          "student.endDateBeforeStartDateError",
          "End date cannot be before start date"
        ),
        "error"
      );
      return;
    }

    let finalEndDate = endDate;
    if (isHalfDay) {
      finalEndDate = startDate;
    }

    applyLeaveMutation.mutate({
      startDate: getISTDateString(startDate),
      endDate: getISTDateString(finalEndDate),
      reason,
      leaveType: isHalfDay ? "half" : "full",
      halfDaySlot: isHalfDay ? halfDaySlot : undefined,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateDays = (start, end, leaveType) => {
    if (leaveType === "half") return "0.5 Day";
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff === 1 ? "1 Day" : `${diff} Days`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          color: colors.success || "#2E7D32",
          bg: "#E8F5E9",
          label: "Approved",
          icon: "checkmark-circle",
        };
      case "rejected":
        return {
          color: colors.error || "#D32F2F",
          bg: "#FFEBEE",
          label: "Rejected",
          icon: "close-circle",
        };
      default:
        return {
          color: "#E65100",
          bg: "#FFF3E0",
          label: "Pending",
          icon: "time-outline",
        };
    }
  };

  const renderLeaveCard = ({ item }) => {
    const statusBadge = getStatusBadge(item.status);
    const durationLabel = calculateDays(
      item.startDate,
      item.endDate,
      item.leaveType
    );

    return (
      <View
        style={[
          styles.leaveCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant + "50",
          },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: statusBadge.color }]} />

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.dateRangeText, { color: colors.onSurface }]}>
                {formatDate(item.startDate)}
                {item.leaveType === "full" && item.startDate !== item.endDate && ` – ${formatDate(item.endDate)}`}
              </Text>
            </View>
            <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant, marginTop: 1, fontFamily: FONTS.medium }}>
              {item.leaveType === "half" ? `Half Day (${item.halfDaySlot})` : "Full Day"} • {durationLabel}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.color + "40" }]}>
            <Ionicons name={statusBadge.icon} size={12} color={statusBadge.color} />
            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        {/* Reason Box */}
        <View style={[styles.reasonBox, { backgroundColor: colors.surfaceContainerHighest + "35" }]}>
          <Text style={[styles.reasonText, { color: colors.onSurface }]}>
            "{item.reason}"
          </Text>
        </View>

        {/* Decision details */}
        {item.status === "rejected" && (
          <View style={[styles.decisionBox, { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" }]}>
            <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.bold, color: "#D32F2F" }}>
              Rejection: {item.rejectionReason}
            </Text>
            {item.rejectionComments && (
              <Text style={{ fontSize: FONT_SIZES.xs, color: colors.onSurfaceVariant, fontFamily: FONTS.regular, marginTop: 1 }}>
                Teacher Note: {item.rejectionComments}
              </Text>
            )}
          </View>
        )}

        {item.status === "approved" && item.actionReason && (
          <View style={[styles.decisionBox, { backgroundColor: "#E8F5E9", borderColor: "#C8E6C9" }]}>
            <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.bold, color: "#2E7D32" }}>
              Teacher Note: {item.actionReason}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderListHeader = () => {
    return (
      <View style={{ paddingTop: 4, paddingBottom: 10 }}>
        {/* Compact KPI Capsules Bar */}
        <View style={styles.compactKpiBar}>
          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor: statusFilter === "pending" ? "#FFF3E0" : colors.surface,
                borderColor: statusFilter === "pending" ? "#FFB74D" : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          >
            <View style={[styles.kpiDot, { backgroundColor: "#E65100" }]} />
            <Text style={[styles.kpiCapsuleNum, { color: "#E65100" }]}>{metrics.pending}</Text>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor: statusFilter === "approved" ? "#E8F5E9" : colors.surface,
                borderColor: statusFilter === "approved" ? "#81C784" : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
          >
            <View style={[styles.kpiDot, { backgroundColor: "#2E7D32" }]} />
            <Text style={[styles.kpiCapsuleNum, { color: "#2E7D32" }]}>{metrics.approved}</Text>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]}>Approved</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor: statusFilter === "rejected" ? "#FFEBEE" : colors.surface,
                borderColor: statusFilter === "rejected" ? "#E57373" : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
          >
            <View style={[styles.kpiDot, { backgroundColor: "#D32F2F" }]} />
            <Text style={[styles.kpiCapsuleNum, { color: "#D32F2F" }]}>{metrics.rejected}</Text>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]}>Rejected</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor: statusFilter === "all" ? colors.primaryContainer + "40" : colors.surface,
                borderColor: statusFilter === "all" ? colors.primary : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter("all")}
          >
            <Text style={[styles.kpiCapsuleNum, { color: colors.primary }]}>{metrics.total}</Text>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]}>All</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Year Button if active */}
        {selectedAcademicYearId !== "all" && (
          <View style={styles.activeFiltersRow}>
            <View style={[styles.activeFilterPill, { backgroundColor: colors.secondaryContainer }]}>
              <Text style={[styles.activeFilterText, { color: colors.onSecondaryContainer }]}>
                Year: {academicYears.find((y) => y._id === selectedAcademicYearId)?.name || "Selected"}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAcademicYearId("all")}>
                <Ionicons name="close" size={14} color={colors.onSecondaryContainer} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 1. Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Header
          title="Student Leaves"
          subtitle="Submit requests & view approval history"
          showBack={true}
        />
      </View>

      {/* 2. Top Action Bar: Filter Year Button */}
      <View style={styles.topFilterBar}>
        <TouchableOpacity
          style={[
            styles.yearFilterBtn,
            {
              backgroundColor: selectedAcademicYearId !== "all" ? colors.primaryContainer : colors.surface,
              borderColor: selectedAcademicYearId !== "all" ? colors.primary : colors.outlineVariant + "60",
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={[styles.yearFilterBtnText, { color: colors.onSurface }]}>
            {selectedAcademicYearId === "all"
              ? "All Academic Years"
              : academicYears.find((y) => y._id === selectedAcademicYearId)?.name || "Selected Year"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.applyTopBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={16} color={colors.onPrimary} />
          <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
            Apply Leave
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 8, color: colors.onSurfaceVariant, fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm }}>
            Loading your leave history...
          </Text>
        </View>
      ) : (
        <FlatList
          data={leaves}
          renderItem={renderLeaveCard}
          ListHeaderComponent={renderListHeader}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="done-all" size={48} color={colors.onSurfaceVariant + "70"} />
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                No Leave Records
              </Text>
              <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                You have not submitted any leave requests matching the current filters.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color={colors.onPrimary} />
        <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.md }}>
          Apply
        </Text>
      </TouchableOpacity>

      {/* Academic Year Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterSheetCard, { backgroundColor: colors.surface }]}>
            <View style={styles.filterSheetHeader}>
              <Text style={[styles.modalHeading, { color: colors.onSurface }]}>
                Select Academic Year
              </Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[
                    styles.sheetChip,
                    selectedAcademicYearId === "all" && [styles.sheetChipActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => {
                    setSelectedAcademicYearId("all");
                    setFilterModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sheetChipText,
                      { color: selectedAcademicYearId === "all" ? colors.onPrimary : colors.onSurface },
                    ]}
                  >
                    All Years
                  </Text>
                </TouchableOpacity>

                {academicYears.map((yr) => {
                  const isSel = selectedAcademicYearId === yr._id;
                  return (
                    <TouchableOpacity
                      key={yr._id}
                      style={[
                        styles.sheetChip,
                        isSel && [styles.sheetChipActive, { backgroundColor: colors.primary }],
                      ]}
                      onPress={() => {
                        setSelectedAcademicYearId(yr._id);
                        setFilterModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          { color: isSel ? colors.onPrimary : colors.onSurface },
                        ]}
                      >
                        {yr.name} {yr.isActive ? "(Current)" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Apply Leave Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View style={[styles.applySheetCard, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.modalHeading, { color: colors.onSurface }]}>
                Apply for Leave
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Leave Type */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  LEAVE TYPE
                </Text>
                <View style={[styles.segmentBox, { backgroundColor: colors.surfaceContainer }]}>
                  <Pressable
                    style={[
                      styles.segmentOption,
                      !isHalfDay && [styles.segmentActive, { backgroundColor: colors.surface }],
                    ]}
                    onPress={() => setIsHalfDay(false)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: !isHalfDay ? colors.primary : colors.onSurfaceVariant },
                      ]}
                    >
                      Full Day
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentOption,
                      isHalfDay && [styles.segmentActive, { backgroundColor: colors.surface }],
                    ]}
                    onPress={() => setIsHalfDay(true)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isHalfDay ? colors.primary : colors.onSurfaceVariant },
                      ]}
                    >
                      Half Day
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Slot if half day */}
              {isHalfDay && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                    HALF DAY SLOT
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      style={[
                        styles.slotBtn,
                        {
                          backgroundColor:
                            halfDaySlot === "morning"
                              ? colors.primaryContainer
                              : colors.surfaceContainer,
                          borderColor:
                            halfDaySlot === "morning"
                              ? colors.primary
                              : colors.outlineVariant + "40",
                        },
                      ]}
                      onPress={() => setHalfDaySlot("morning")}
                    >
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          fontSize: FONT_SIZES.sm,
                          color:
                            halfDaySlot === "morning"
                              ? colors.onPrimaryContainer
                              : colors.onSurfaceVariant,
                        }}
                      >
                        🌅 Morning
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.slotBtn,
                        {
                          backgroundColor:
                            halfDaySlot === "afternoon"
                              ? colors.primaryContainer
                              : colors.surfaceContainer,
                          borderColor:
                            halfDaySlot === "afternoon"
                              ? colors.primary
                              : colors.outlineVariant + "40",
                        },
                      ]}
                      onPress={() => setHalfDaySlot("afternoon")}
                    >
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          fontSize: FONT_SIZES.sm,
                          color:
                            halfDaySlot === "afternoon"
                              ? colors.onPrimaryContainer
                              : colors.onSurfaceVariant,
                        }}
                      >
                        🌇 Afternoon
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Date pickers */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                    START DATE
                  </Text>
                  <TouchableOpacity
                    style={[styles.datePickerInput, { backgroundColor: colors.surfaceContainer }]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={{ fontSize: FONT_SIZES.md, color: colors.onSurface, fontFamily: FONTS.medium }}>
                      {formatDate(startDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(e, date) => {
                        setShowStartPicker(false);
                        if (date) {
                          setStartDate(date);
                          if (date > endDate) setEndDate(date);
                        }
                      }}
                    />
                  )}
                </View>

                {!isHalfDay && (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                      END DATE
                    </Text>
                    <TouchableOpacity
                      style={[styles.datePickerInput, { backgroundColor: colors.surfaceContainer }]}
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Text style={{ fontSize: FONT_SIZES.md, color: colors.onSurface, fontFamily: FONTS.medium }}>
                        {formatDate(endDate)}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        minimumDate={startDate}
                        onChange={(e, date) => {
                          setShowEndPicker(false);
                          if (date) setEndDate(date);
                        }}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Reason */}
              <View style={{ marginBottom: 18 }}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  REASON FOR LEAVE *
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor: colors.surfaceContainer, color: colors.onSurface },
                  ]}
                  placeholder="Explain why you are requesting leave..."
                  placeholderTextColor={colors.onSurfaceVariant + "80"}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleApplyLeave}
                disabled={applyLeaveMutation.isPending}
              >
                {applyLeaveMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontFamily: FONTS.bold, fontSize: FONT_SIZES.mdLg }}>
                    Submit Leave Request
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topFilterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  yearFilterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  yearFilterBtnText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  applyTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 3,
  },
  compactKpiBar: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  kpiCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  kpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kpiCapsuleNum: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  kpiCapsuleLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
  },
  activeFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  activeFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  activeFilterText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  leaveCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
    elevation: 1,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dateRangeText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  reasonBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: 16,
    fontStyle: "italic",
  },
  decisionBox: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.mdLg,
    fontFamily: FONTS.bold,
    marginTop: 8,
    marginBottom: 2,
  },
  emptySub: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
  },
  fabBtn: {
    position: "absolute",
    bottom: 20,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 3,
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterSheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 28,
  },
  filterSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sheetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  sheetChipActive: {
    elevation: 1,
  },
  sheetChipText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  applySheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeading: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  segmentBox: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 3,
  },
  segmentOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 6,
  },
  segmentActive: {
    elevation: 1,
  },
  segmentText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  slotBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  datePickerInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  textArea: {
    borderRadius: 8,
    padding: 10,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    minHeight: 70,
    textAlignVertical: "top",
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
});
