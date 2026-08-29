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
import { useQueryClient } from "@tanstack/react-query";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import Header from "../../components/Header";
import formatClassName from "../../utils/formatClassName";
import { useAuth } from "../../context/AuthContext";
import { getISTDateString } from "../../utils/date";
import UserAvatar from "../../components/ui/UserAvatar";
import { useAcademicYear } from "../../context/AcademicYearContext";
import { formatUserName } from "../../utils/userFormatters";

const REJECTION_PRESETS = [
  "Exam / Test Schedule",
  "Low Attendance Warning",
  "Short Notice / Late Request",
  "Important Class Activity",
  "Other Reason",
];

export default function TeacherLeaves() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const { user, userId: authUserId } = useAuth();
  const userId = user?.id || user?._id || authUserId;
  const isStaff = user?.role === "staff" || user?.role === "support_staff";
  const { selectedYear } = useAcademicYear();

  // Tab State
  const [activeTab, setActiveTab] = useState(
    isStaff ? "my_leaves" : "requests"
  );

  const [refreshing, setRefreshing] = useState(false);

  // Filters (Default to 'all' for status & 'all' for year so no data is accidentally hidden)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Action Modal State (Approve / Reject)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState("approved");
  const [actionReason, setActionReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionComments, setRejectionComments] = useState("");

  // Apply Leave Modal State
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySlot, setHalfDaySlot] = useState("morning");

  // Fetch Academic Years list
  const { data: academicYearsData } = useApiQuery(
    ["academicYearsListTeacher"],
    `${apiConfig.baseUrl}/academic-year`
  );
  const academicYears = useMemo(() => academicYearsData || [], [academicYearsData]);

  const activeYearObj = useMemo(() => {
    return (
      academicYears.find((y) => y.isActive) ||
      academicYears.find((y) => y.status === "current") ||
      selectedYear ||
      academicYears[0]
    );
  }, [academicYears, selectedYear]);

  // Fetch Teacher's Assigned Classes
  const { data: teacherClassesData } = useApiQuery(
    ["teacherAssignedClasses", userId],
    `${apiConfig.baseUrl}/classes/my-classes`,
    { enabled: !isStaff && !!userId }
  );
  const teacherClasses = useMemo(() => teacherClassesData || [], [teacherClassesData]);

  // Build Requests Query URL
  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.append("status", statusFilter);
  if (selectedAcademicYearId !== "all") {
    queryParams.append("academicYear", selectedAcademicYearId);
  }
  if (selectedClassId !== "all") queryParams.append("classId", selectedClassId);
  if (searchQuery.trim()) queryParams.append("search", searchQuery.trim());

  const requestsUrl = `${apiConfig.baseUrl}/leaves/requests?${queryParams.toString()}`;

  const {
    data: requestsData,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useApiQuery(
    [
      "teacherLeaveRequests",
      userId,
      statusFilter,
      selectedAcademicYearId,
      selectedClassId,
      searchQuery,
    ],
    requestsUrl,
    { enabled: activeTab === "requests" && !isStaff && !!userId }
  );
  const rawRequests = useMemo(() => requestsData?.data || [], [requestsData]);

  // Fetch Unfiltered Requests for KPI Counts
  const { data: allRequestsData, refetch: refetchAllRequests } = useApiQuery(
    ["teacherLeaveRequestsSummary", userId, selectedAcademicYearId, selectedClassId],
    `${apiConfig.baseUrl}/leaves/requests?academicYear=${selectedAcademicYearId}&classId=${selectedClassId}`,
    { enabled: activeTab === "requests" && !isStaff && !!userId }
  );
  const allRequests = useMemo(() => allRequestsData?.data || [], [allRequestsData]);

  const summaryMetrics = useMemo(() => {
    const pending = allRequests.filter((r) => r.status === "pending").length;
    const approved = allRequests.filter((r) => r.status === "approved").length;
    const rejected = allRequests.filter((r) => r.status === "rejected").length;
    return {
      total: allRequests.length,
      pending,
      approved,
      rejected,
    };
  }, [allRequests]);

  // Client-side search fallback & refinement
  const filteredRequests = useMemo(() => {
    let list = [...rawRequests];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const nameMatch = r.applicant?.name?.toLowerCase().includes(q);
        const reasonMatch = r.reason?.toLowerCase().includes(q);
        const classNameMatch = formatClassName(r.class?.name || r.class?.label)
          ?.toLowerCase()
          .includes(q);
        return nameMatch || reasonMatch || classNameMatch;
      });
    }
    return list;
  }, [rawRequests, searchQuery]);

  // Fetch Teacher's Own Leaves
  const {
    data: myLeavesData,
    isLoading: myLeavesLoading,
    refetch: refetchMyLeaves,
  } = useApiQuery(
    ["teacherMyLeaves", userId, selectedAcademicYearId],
    `${apiConfig.baseUrl}/leaves/my-leaves?academicYear=${selectedAcademicYearId}`,
    { enabled: activeTab === "my_leaves" && !!userId }
  );
  const myLeaves = useMemo(() => myLeavesData?.data || [], [myLeavesData]);

  // Fetch Leave Balance
  const {
    data: balanceData,
    refetch: refetchBalance,
  } = useApiQuery(
    ["teacherLeaveBalance", userId],
    `${apiConfig.baseUrl}/leaves/balance`,
    { enabled: activeTab === "my_leaves" && !!userId }
  );
  const leaveBalance = balanceData?.data || { total: 12, used: 0, remaining: 12 };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "requests") {
      await Promise.all([refetchRequests(), refetchAllRequests()]);
    } else {
      await Promise.all([refetchMyLeaves(), refetchBalance()]);
    }
    setRefreshing(false);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedAcademicYearId !== "all") count++;
    if (selectedClassId !== "all") count++;
    return count;
  }, [selectedAcademicYearId, selectedClassId]);

  // Mutations
  const actionMutation = useApiMutation({
    mutationFn: async ({ requestId, payload }) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}/leaves/${requestId}/action`,
        "PUT"
      )(payload);
    },
    onSuccess: () => {
      showToast(
        actionType === "approved"
          ? "Student leave approved successfully"
          : "Student leave rejected",
        "success"
      );
      setActionModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["teacherLeaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["teacherLeaveRequestsSummary"] });
    },
    onError: (error) =>
      showToast(error.message || "Error updating leave status", "error"),
  });

  const applyLeaveMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/leaves/apply`,
      "POST"
    ),
    onSuccess: () => {
      showToast("Leave applied successfully", "success");
      setApplyModalVisible(false);
      setReason("");
      setIsHalfDay(false);
      queryClient.invalidateQueries({ queryKey: ["teacherMyLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["teacherLeaveBalance"] });
    },
    onError: (error) =>
      showToast(error.message || "Error applying for leave", "error"),
  });

  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    if (request.status !== "pending") {
      if (type === "approved") {
        setActionReason(request.actionReason || "");
        setRejectionReason("");
        setRejectionComments("");
      } else {
        setRejectionReason(request.rejectionReason || "");
        setRejectionComments(request.rejectionComments || "");
        setActionReason("");
      }
    } else {
      setActionReason("");
      setRejectionReason("");
      setRejectionComments("");
    }
    setActionModalVisible(true);
  };

  const handleAction = () => {
    if (actionType === "rejected" && (!rejectionReason || !rejectionComments)) {
      showToast("Please provide both rejection reason and comments", "error");
      return;
    }

    const payload = {
      status: actionType,
      reason: actionReason,
      rejectionReason:
        actionType === "rejected" ? rejectionReason : undefined,
      rejectionComments:
        actionType === "rejected" ? rejectionComments : undefined,
    };

    actionMutation.mutate({ requestId: selectedRequest._id, payload });
  };

  const handleApplyLeave = () => {
    if (!reason.trim()) {
      showToast("Please enter a reason for leave", "error");
      return;
    }

    if (!isHalfDay && endDate < startDate) {
      showToast("End date cannot be before start date", "error");
      return;
    }

    let finalEndDate = endDate;
    if (isHalfDay) finalEndDate = startDate;

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

  // Render Student Request Card
  const renderStudentRequestCard = ({ item }) => {
    const statusBadge = getStatusBadge(item.status);
    const durationLabel = calculateDays(
      item.startDate,
      item.endDate,
      item.leaveType
    );

    return (
      <View
        style={[
          styles.requestCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant + "50",
          },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: statusBadge.color }]} />

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
            <UserAvatar
              photoUrl={item.applicant?.profilePhoto}
              name={formatUserName(item.applicant?.name, "Student")}
              role="student"
              size={40}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={[styles.applicantName, { color: colors.onSurface }]} numberOfLines={1}>
                  {formatUserName(item.applicant?.name, "Student")}
                </Text>
                {item.academicYear?.name && (
                  <View style={[styles.tinyYearPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Text style={[styles.tinyYearText, { color: colors.onSurfaceVariant }]}>
                      {item.academicYear.name}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <View style={[styles.classChip, { backgroundColor: "#FFF3E0", borderColor: "#FFE0B2" }]}>
                  <Ionicons name="school" size={11} color="#E65100" />
                  <Text style={[styles.classChipText, { color: "#E65100" }]}>
                    {formatClassName(item.class?.name || item.class?.label)}{" "}
                    {item.class?.section ? `(${item.class.section})` : ""}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.color + "40" }]}>
            <Ionicons name={statusBadge.icon} size={12} color={statusBadge.color} />
            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        {/* Date & Duration Info Bar */}
        <View style={[styles.dateBar, { backgroundColor: colors.surfaceContainerLow }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.dateText, { color: colors.onSurface }]}>
              {formatDate(item.startDate)}
              {item.leaveType === "full" && item.startDate !== item.endDate && ` – ${formatDate(item.endDate)}`}
            </Text>
          </View>

          <View style={[styles.durationBadge, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.durationBadgeText, { color: colors.onPrimaryContainer }]}>
              {durationLabel}
              {item.leaveType === "half" ? ` (${item.halfDaySlot})` : ""}
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
            <Text style={{ color: "#D32F2F", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs }}>
              Rejected: {item.rejectionReason}
            </Text>
            {item.rejectionComments && (
              <Text style={{ color: colors.onSurfaceVariant, fontSize: FONT_SIZES.xs, marginTop: 1 }}>
                Note: {item.rejectionComments}
              </Text>
            )}
          </View>
        )}

        {item.status === "approved" && item.actionReason && (
          <View style={[styles.decisionBox, { backgroundColor: "#E8F5E9", borderColor: "#C8E6C9" }]}>
            <Text style={{ color: "#2E7D32", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs }}>
              Approval Note: {item.actionReason}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {item.status === "pending" ? (
            <>
              <TouchableOpacity
                style={[
                  styles.rejectBtn,
                  { backgroundColor: colors.errorContainer + "30", borderColor: colors.error + "40" },
                ]}
                onPress={() => openActionModal(item, "rejected")}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color={colors.error} />
                <Text style={[styles.btnLabel, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                onPress={() => openActionModal(item, "approved")}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                <Text style={[styles.btnLabel, { color: colors.onPrimary }]}>Approve</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.editBtn,
                { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
              ]}
              onPress={() => openActionModal(item, item.status)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={13} color={colors.onSurface} />
              <Text style={[styles.btnLabel, { color: colors.onSurface }]}>Edit Decision</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderMyLeaveCard = ({ item }) => {
    const statusBadge = getStatusBadge(item.status);
    return (
      <View
        style={[
          styles.requestCard,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "50" },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: statusBadge.color }]} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.onSurface }]}>
                {formatDate(item.startDate)}
                {item.leaveType === "full" && item.startDate !== item.endDate && ` – ${formatDate(item.endDate)}`}
              </Text>
            </View>
            <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant, marginTop: 1, fontFamily: FONTS.regular }}>
              {item.leaveType === "half" ? `Half Day (${item.halfDaySlot})` : "Full Day"} • {calculateDays(item.startDate, item.endDate, item.leaveType)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.color + "40" }]}>
            <Ionicons name={statusBadge.icon} size={12} color={statusBadge.color} />
            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        <View style={[styles.reasonBox, { backgroundColor: colors.surfaceContainerHighest + "35" }]}>
          <Text style={[styles.reasonText, { color: colors.onSurface }]}>
            "{item.reason}"
          </Text>
        </View>

        {item.status === "rejected" && (
          <View style={[styles.decisionBox, { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2", marginTop: 6 }]}>
            <Text style={{ color: "#D32F2F", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs }}>
              Rejected: {item.rejectionReason}
            </Text>
            {item.rejectionComments && (
              <Text style={{ color: colors.onSurfaceVariant, fontSize: FONT_SIZES.xs, marginTop: 1 }}>
                Note: {item.rejectionComments}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // ListHeaderComponent for Teacher Requests Tab (Scrolls with list!)
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
            <Text style={[styles.kpiCapsuleNum, { color: "#E65100" }]}>{summaryMetrics.pending}</Text>
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
            <Text style={[styles.kpiCapsuleNum, { color: "#2E7D32" }]}>{summaryMetrics.approved}</Text>
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
            <Text style={[styles.kpiCapsuleNum, { color: "#D32F2F" }]}>{summaryMetrics.rejected}</Text>
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
            <Text style={[styles.kpiCapsuleNum, { color: colors.primary }]}>{summaryMetrics.total}</Text>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]}>All</Text>
          </TouchableOpacity>
        </View>

        {/* Active Filters Tag Bar (If any filter applied) */}
        {activeFiltersCount > 0 && (
          <View style={styles.activeFiltersRow}>
            {selectedAcademicYearId !== "all" && (
              <View style={[styles.activeFilterPill, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.activeFilterText, { color: colors.onSecondaryContainer }]}>
                  Year: {academicYears.find((y) => y._id === selectedAcademicYearId)?.name || "Selected"}
                </Text>
                <TouchableOpacity onPress={() => setSelectedAcademicYearId("all")}>
                  <Ionicons name="close" size={14} color={colors.onSecondaryContainer} />
                </TouchableOpacity>
              </View>
            )}

            {selectedClassId !== "all" && (
              <View style={[styles.activeFilterPill, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.activeFilterText, { color: colors.onSecondaryContainer }]}>
                  Class: {formatClassName(teacherClasses.find((c) => c._id === selectedClassId)?.name || "Selected")}
                </Text>
                <TouchableOpacity onPress={() => setSelectedClassId("all")}>
                  <Ionicons name="close" size={14} color={colors.onSecondaryContainer} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setSelectedAcademicYearId("all");
                setSelectedClassId("all");
              }}
              style={styles.clearAllBtn}
            >
              <Text style={{ fontSize: FONT_SIZES.xs, color: colors.primary, fontFamily: FONTS.bold }}>
                Reset Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 1. Header (Minimal Top) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Header
          title={isStaff ? "Staff Leaves" : "Leave Management"}
          subtitle={isStaff ? "Manage leave requests" : "Review student requests & my allowance"}
          showBack={true}
        />
      </View>

      {/* 2. Sleek Segmented Tab Switcher (Height 36px) */}
      {!isStaff && (
        <View style={styles.tabContainer}>
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceContainer }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "requests" && [styles.tabBtnActive, { backgroundColor: colors.surface }],
              ]}
              onPress={() => setActiveTab("requests")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "requests" ? colors.primary : colors.onSurfaceVariant },
                  activeTab === "requests" && { fontFamily: FONTS.bold },
                ]}
              >
                Student Requests
              </Text>
              {summaryMetrics.pending > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: "#E65100" }]}>
                  <Text style={styles.tabBadgeText}>{summaryMetrics.pending}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "my_leaves" && [styles.tabBtnActive, { backgroundColor: colors.surface }],
              ]}
              onPress={() => setActiveTab("my_leaves")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "my_leaves" ? colors.primary : colors.onSurfaceVariant },
                  activeTab === "my_leaves" && { fontFamily: FONTS.bold },
                ]}
              >
                My Leaves & Balance
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Sleek Sticky Search & Filter Bar (Height ~40px) */}
      {activeTab === "requests" && !isStaff && (
        <View style={styles.searchFilterBar}>
          <View style={[styles.searchInputBox, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "60" }]}>
            <Ionicons name="search" size={16} color={colors.onSurfaceVariant} />
            <TextInput
              style={[styles.searchInput, { color: colors.onSurface }]}
              placeholder="Search student or reason..."
              placeholderTextColor={colors.onSurfaceVariant + "80"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Sheet Trigger */}
          <TouchableOpacity
            style={[
              styles.filterSheetBtn,
              {
                backgroundColor: activeFiltersCount > 0 ? colors.primaryContainer : colors.surface,
                borderColor: activeFiltersCount > 0 ? colors.primary : colors.outlineVariant + "60",
              },
            ]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="funnel-outline"
              size={16}
              color={activeFiltersCount > 0 ? colors.onPrimaryContainer : colors.onSurfaceVariant}
            />
            {activeFiltersCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 1: STUDENT REQUESTS LIST */}
      {activeTab === "requests" && !isStaff && (
        <View style={{ flex: 1 }}>
          {requestsLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.onSurfaceVariant }]}>
                Loading leave requests...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRequests}
              renderItem={renderStudentRequestCard}
              keyExtractor={(item) => item._id}
              ListHeaderComponent={renderListHeader}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="done-all" size={48} color={colors.onSurfaceVariant + "70"} />
                  <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                    No Leave Requests
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                    There are no leave requests matching your current filters.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* TAB 2: MY LEAVES (TEACHER / STAFF) */}
      {(activeTab === "my_leaves" || isStaff) && (
        <View style={{ flex: 1 }}>
          {/* Leave Allowance Bar */}
          <View style={[styles.allowanceCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "50" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <View>
                <Text style={[styles.allowanceTitle, { color: colors.onSurface }]}>
                  My Leave Balance
                </Text>
                <Text style={{ fontSize: FONT_SIZES.xs, color: colors.onSurfaceVariant, fontFamily: FONTS.regular }}>
                  Year {activeYearObj?.name || new Date().getFullYear()}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.applyBtnSmall, { backgroundColor: colors.primary }]}
                onPress={() => setApplyModalVisible(true)}
              >
                <Ionicons name="add" size={15} color={colors.onPrimary} />
                <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
                  Apply Leave
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.allowanceGrid}>
              <View style={[styles.allowanceCol, { backgroundColor: colors.surfaceContainerLow }]}>
                <Text style={[styles.allowanceNum, { color: colors.onSurface }]}>{leaveBalance.total}</Text>
                <Text style={[styles.allowanceLabel, { color: colors.onSurfaceVariant }]}>Total</Text>
              </View>

              <View style={[styles.allowanceCol, { backgroundColor: "#FFF3E0" }]}>
                <Text style={[styles.allowanceNum, { color: "#E65100" }]}>{leaveBalance.used}</Text>
                <Text style={[styles.allowanceLabel, { color: "#E65100" }]}>Used</Text>
              </View>

              <View style={[styles.allowanceCol, { backgroundColor: "#E8F5E9" }]}>
                <Text style={[styles.allowanceNum, { color: "#2E7D32" }]}>{leaveBalance.remaining}</Text>
                <Text style={[styles.allowanceLabel, { color: "#2E7D32" }]}>Remaining</Text>
              </View>
            </View>
          </View>

          {myLeavesLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={myLeaves}
              renderItem={renderMyLeaveCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={colors.onSurfaceVariant + "70"} />
                  <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                    No Leave History
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                    You haven't submitted any leave requests yet.
                  </Text>
                </View>
              }
            />
          )}

          {/* Floating Button */}
          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: colors.primary }]}
            onPress={() => setApplyModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.md }}>
              Apply
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FILTER BOTTOM SHEET / MODAL */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterSheetCard, { backgroundColor: colors.surface }]}>
            <View style={styles.filterSheetHeader}>
              <Text style={[styles.filterSheetTitle, { color: colors.onSurface }]}>
                Filter Leave Requests
              </Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Academic Year Filter */}
              <Text style={[styles.filterGroupLabel, { color: colors.onSurfaceVariant }]}>
                ACADEMIC YEAR
              </Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[
                    styles.sheetChip,
                    selectedAcademicYearId === "all" && [styles.sheetChipActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setSelectedAcademicYearId("all")}
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
                      onPress={() => setSelectedAcademicYearId(yr._id)}
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

              {/* Class Filter */}
              {teacherClasses.length > 0 && (
                <>
                  <Text style={[styles.filterGroupLabel, { color: colors.onSurfaceVariant, marginTop: 14 }]}>
                    ASSIGNED CLASS
                  </Text>
                  <View style={styles.chipGrid}>
                    <TouchableOpacity
                      style={[
                        styles.sheetChip,
                        selectedClassId === "all" && [styles.sheetChipActive, { backgroundColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedClassId("all")}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          { color: selectedClassId === "all" ? colors.onPrimary : colors.onSurface },
                        ]}
                      >
                        All Classes
                      </Text>
                    </TouchableOpacity>

                    {teacherClasses.map((cls) => {
                      const isSel = selectedClassId === cls._id;
                      return (
                        <TouchableOpacity
                          key={cls._id}
                          style={[
                            styles.sheetChip,
                            isSel && [styles.sheetChipActive, { backgroundColor: colors.primary }],
                          ]}
                          onPress={() => setSelectedClassId(cls._id)}
                        >
                          <Text
                            style={[
                              styles.sheetChipText,
                              { color: isSel ? colors.onPrimary : colors.onSurface },
                            ]}
                          >
                            {formatClassName(cls.name || cls.label)} {cls.section ? `(${cls.section})` : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.filterSheetFooter}>
              <TouchableOpacity
                style={styles.sheetResetBtn}
                onPress={() => {
                  setSelectedAcademicYearId("all");
                  setSelectedClassId("all");
                  setFilterModalVisible(false);
                }}
              >
                <Text style={{ color: colors.onSurfaceVariant, fontFamily: FONTS.bold, fontSize: FONT_SIZES.md }}>
                  Reset All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetApplyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.base }}>
                  Apply Filters
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ACTION MODAL (APPROVE / REJECT) */}
      <Modal
        visible={actionModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.actionModalCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "50" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: actionType === "approved" ? "#E8F5E9" : "#FFEBEE" },
                  ]}
                >
                  <Ionicons
                    name={actionType === "approved" ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={actionType === "approved" ? "#2E7D32" : "#D32F2F"}
                  />
                </View>
                <Text style={[styles.modalHeading, { color: colors.onSurface }]}>
                  {actionType === "approved" ? "Approve Student Leave" : "Reject Student Leave"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <View style={[styles.applicantMiniSummary, { backgroundColor: colors.surfaceContainerLow }]}>
                <UserAvatar
                  photoUrl={selectedRequest.applicant?.profilePhoto}
                  name={formatUserName(selectedRequest.applicant?.name, "Student")}
                  role="student"
                  size={32}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONT_SIZES.md, fontFamily: FONTS.bold, color: colors.onSurface }}>
                    {formatUserName(selectedRequest.applicant?.name, "Student")}
                  </Text>
                  <Text style={{ fontSize: FONT_SIZES.xs, color: colors.onSurfaceVariant, fontFamily: FONTS.regular }}>
                    {formatDate(selectedRequest.startDate)} – {formatDate(selectedRequest.endDate)} (
                    {calculateDays(selectedRequest.startDate, selectedRequest.endDate, selectedRequest.leaveType)})
                  </Text>
                </View>
              </View>
            )}

            {actionType === "rejected" && (
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  SELECT REASON FOR REJECTION *
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {REJECTION_PRESETS.map((preset) => {
                    const isPresetSelected = rejectionReason === preset;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isPresetSelected ? "#FFEBEE" : colors.surfaceContainer,
                            borderColor: isPresetSelected ? "#D32F2F" : colors.outlineVariant + "40",
                          },
                        ]}
                        onPress={() => setRejectionReason(preset)}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            color: isPresetSelected ? "#D32F2F" : colors.onSurface,
                            fontFamily: isPresetSelected ? FONTS.bold : FONTS.medium,
                          }}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  COMMENTS FOR STUDENT / PARENT *
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.onSurface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                  placeholder="Explain why leave was not approved..."
                  placeholderTextColor={colors.onSurfaceVariant + "80"}
                  value={rejectionComments}
                  onChangeText={setRejectionComments}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>
            )}

            {actionType === "approved" && (
              <View style={{ marginBottom: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  NOTE FOR STUDENT (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.onSurface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                  placeholder="e.g. Please collect assignments before leaving..."
                  placeholderTextColor={colors.onSurfaceVariant + "80"}
                  value={actionReason}
                  onChangeText={setActionReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActionModalVisible(false)}
              >
                <Text style={{ color: colors.onSurfaceVariant, fontFamily: FONTS.bold, fontSize: FONT_SIZES.md }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: actionType === "approved" ? colors.primary : colors.error },
                ]}
                onPress={handleAction}
                disabled={actionMutation.isPending}
              >
                {actionMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFF", fontFamily: FONTS.bold, fontSize: FONT_SIZES.md }}>
                    {actionType === "approved" ? "Approve" : "Reject"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* APPLY LEAVE MODAL */}
      <Modal
        visible={applyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        >
          <View style={[styles.applySheetCard, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.modalHeading, { color: colors.onSurface }]}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setApplyModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Leave Type */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>LEAVE TYPE</Text>
                <View style={[styles.segmentBox, { backgroundColor: colors.surfaceContainer }]}>
                  <Pressable
                    style={[styles.segmentOption, !isHalfDay && [styles.segmentActive, { backgroundColor: colors.surface }]]}
                    onPress={() => setIsHalfDay(false)}
                  >
                    <Text style={[styles.segmentText, { color: !isHalfDay ? colors.primary : colors.onSurfaceVariant }]}>
                      Full Day
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segmentOption, isHalfDay && [styles.segmentActive, { backgroundColor: colors.surface }]]}
                    onPress={() => setIsHalfDay(true)}
                  >
                    <Text style={[styles.segmentText, { color: isHalfDay ? colors.primary : colors.onSurfaceVariant }]}>
                      Half Day
                    </Text>
                  </Pressable>
                </View>
              </View>

              {isHalfDay && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>HALF DAY SLOT</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      style={[
                        styles.slotBtn,
                        {
                          backgroundColor: halfDaySlot === "morning" ? colors.primaryContainer : colors.surfaceContainer,
                          borderColor: halfDaySlot === "morning" ? colors.primary : colors.outlineVariant + "40",
                        },
                      ]}
                      onPress={() => setHalfDaySlot("morning")}
                    >
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          fontSize: FONT_SIZES.sm,
                          color: halfDaySlot === "morning" ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                        }}
                      >
                        🌅 Morning
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.slotBtn,
                        {
                          backgroundColor: halfDaySlot === "afternoon" ? colors.primaryContainer : colors.surfaceContainer,
                          borderColor: halfDaySlot === "afternoon" ? colors.primary : colors.outlineVariant + "40",
                        },
                      ]}
                      onPress={() => setHalfDaySlot("afternoon")}
                    >
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          fontSize: FONT_SIZES.sm,
                          color: halfDaySlot === "afternoon" ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                        }}
                      >
                        🌇 Afternoon
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Dates */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>START DATE</Text>
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
                    <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>END DATE</Text>
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
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>REASON FOR LEAVE *</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surfaceContainer, color: colors.onSurface }]}
                  placeholder="Explain reason for leave..."
                  placeholderTextColor={colors.onSurfaceVariant + "80"}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleApplyLeave}
                disabled={applyLeaveMutation.isPending}
              >
                {applyLeaveMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontFamily: FONTS.bold, fontSize: FONT_SIZES.mdLg }}>
                    Submit Application
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
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  tabBtnActive: {
    elevation: 1,
  },
  tabBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  searchFilterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
    alignItems: "center",
  },
  searchInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    padding: 0,
  },
  filterSheetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#FFF",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
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
    flexWrap: "wrap",
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
  clearAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  requestCard: {
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
  applicantName: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  tinyYearPill: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tinyYearText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  classChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    gap: 2,
  },
  classChipText: {
    fontSize: FONT_SIZES.micro,
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
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  reasonBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    fontStyle: "italic",
    lineHeight: 16,
  },
  decisionBox: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 3,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  btnLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  allowanceCard: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  allowanceTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  applyBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  allowanceGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  allowanceCol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  allowanceNum: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  allowanceLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    marginTop: 1,
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
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  loaderText: {
    marginTop: 8,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
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
  filterSheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  filterGroupLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    marginBottom: 8,
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
  filterSheetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E050",
  },
  sheetResetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sheetApplyBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 18,
  },
  actionModalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    elevation: 5,
  },
  actionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeading: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  applicantMiniSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  applySheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: "90%",
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
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
});
