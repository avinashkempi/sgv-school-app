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
  SectionList,
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ToastProvider";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../../theme";
import Header from "../../components/Header";
import formatClassName from "../../utils/formatClassName";
import { getISTDateString } from "../../utils/date";
import UserAvatar from "../../components/ui/UserAvatar";
import { useAcademicYear } from "../../context/AcademicYearContext";
import {
  formatUserName,
  toTitleCase,
} from "../../utils/userFormatters";

const REJECTION_PRESETS = [
  "Exam / Assessment Period",
  "Low Attendance Record",
  "Staff / Teacher Shortage",
  "Short Notice / Late Request",
  "Event / Sports Day Obligation",
  "Other Reason",
];

export default function AdminLeaves() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { selectedYear } = useAcademicYear();

  // Navigation Tabs: 'requests' | 'daily' | 'my_leaves'
  const [activeTab, setActiveTab] = useState("requests");
  const [refreshing, setRefreshing] = useState(false);

  // Filters (Defaults to 'all' so nothing is hidden by default)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grouped'
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Daily Overview State
  const [dailyDate, setDailyDate] = useState(new Date());
  const [showDailyDatePicker, setShowDailyDatePicker] = useState(false);

  // Action Modal State (Approve / Reject / Edit)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState("approved");
  const [actionReason, setActionReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionComments, setRejectionComments] = useState("");

  // Apply / Edit Leave Modal State
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySlot, setHalfDaySlot] = useState("morning");

  // Fetch Academic Years list
  const { data: academicYearsData } = useApiQuery(
    ["academicYearsListAdmin"],
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

  // Fetch Classes list
  const { data: classesData } = useApiQuery(
    ["classesForLeavesAdmin", selectedAcademicYearId],
    `${apiConfig.baseUrl}/classes`
  );
  const classesList = useMemo(() => classesData || [], [classesData]);

  // Build Requests Query URL
  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.append("status", statusFilter);
  if (selectedAcademicYearId !== "all") {
    queryParams.append("academicYear", selectedAcademicYearId);
  }
  if (roleFilter !== "all") queryParams.append("role", roleFilter);
  if (selectedClassId !== "all") queryParams.append("classId", selectedClassId);
  if (searchQuery.trim()) queryParams.append("search", searchQuery.trim());

  const queryUrl = `${apiConfig.baseUrl}/leaves/requests?${queryParams.toString()}`;

  const {
    data: requestsData,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useApiQuery(
    [
      "adminLeaveRequests",
      statusFilter,
      selectedAcademicYearId,
      roleFilter,
      selectedClassId,
      searchQuery,
    ],
    queryUrl,
    { enabled: activeTab === "requests" }
  );
  const rawRequests = useMemo(() => requestsData?.data || [], [requestsData]);

  // Fetch Unfiltered Requests for KPI Counters
  const { data: allRequestsData, refetch: refetchAllRequests } = useApiQuery(
    ["adminLeaveRequestsSummary", selectedAcademicYearId, roleFilter, selectedClassId],
    `${apiConfig.baseUrl}/leaves/requests?academicYear=${selectedAcademicYearId}&role=${roleFilter}&classId=${selectedClassId}`,
    { enabled: activeTab === "requests" }
  );
  const allRequests = useMemo(() => allRequestsData?.data || [], [allRequestsData]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const pending = allRequests.filter((r) => r.status === "pending").length;
    const approved = allRequests.filter((r) => r.status === "approved").length;
    const rejected = allRequests.filter((r) => r.status === "rejected").length;
    const students = allRequests.filter((r) => r.applicantRole === "student").length;
    const staff = allRequests.filter((r) =>
      ["teacher", "staff", "support_staff"].includes(r.applicantRole)
    ).length;
    return {
      total: allRequests.length,
      pending,
      approved,
      rejected,
      students,
      staff,
    };
  }, [allRequests]);

  // Client-side search & filtering refinement
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
        const sectionMatch = r.class?.section?.toLowerCase().includes(q);
        return nameMatch || reasonMatch || classNameMatch || sectionMatch;
      });
    }
    return list;
  }, [rawRequests, searchQuery]);

  // Grouped sections for 'grouped' view mode
  const categorizedSections = useMemo(() => {
    if (viewMode !== "grouped") return [];
    const sections = [];

    const studentRequests = filteredRequests.filter((r) => r.applicantRole === "student");
    const teacherRequests = filteredRequests.filter((r) => r.applicantRole === "teacher");
    const staffRequests = filteredRequests.filter(
      (r) => r.applicantRole === "staff" || r.applicantRole === "support_staff"
    );
    const adminRequests = filteredRequests.filter((r) => r.applicantRole === "admin");

    if (roleFilter === "student" || roleFilter === "all") {
      const classMap = {};
      studentRequests.forEach((req) => {
        const classLabel = req.class
          ? `${formatClassName(req.class.name || req.class.label)} ${
              req.class.section ? `(${req.class.section})` : ""
            }`
          : "Unassigned Class";
        if (!classMap[classLabel]) classMap[classLabel] = [];
        classMap[classLabel].push(req);
      });

      Object.keys(classMap).forEach((cls) => {
        sections.push({
          title: `🎒 ${cls}`,
          data: classMap[cls],
        });
      });
    }

    if (roleFilter === "teacher" || roleFilter === "all") {
      if (teacherRequests.length > 0) {
        sections.push({ title: "👨‍🏫 Teachers", data: teacherRequests });
      }
    }

    if (roleFilter === "staff" || roleFilter === "all") {
      if (staffRequests.length > 0) {
        sections.push({ title: "👔 Staff", data: staffRequests });
      }
    }

    if (roleFilter === "admin" || roleFilter === "all") {
      if (adminRequests.length > 0) {
        sections.push({ title: "🛡️ Administrators", data: adminRequests });
      }
    }

    return sections;
  }, [filteredRequests, viewMode, roleFilter]);

  // Fetch Daily Leaves Stats
  const dailyDateStr = useMemo(() => getISTDateString(dailyDate), [dailyDate]);
  const {
    data: dailyStatsData,
    isLoading: dailyStatsLoading,
    refetch: refetchDailyStats,
  } = useApiQuery(
    ["dailyLeaveStatsAdmin", dailyDateStr, selectedAcademicYearId],
    `${apiConfig.baseUrl}/leaves/daily-stats?date=${dailyDateStr}&academicYear=${selectedAcademicYearId}`,
    { enabled: activeTab === "daily" }
  );
  const dailyLeaves = useMemo(() => dailyStatsData?.data || [], [dailyStatsData]);

  // Group Daily Leaves
  const dailyLeavesGrouped = useMemo(() => {
    const students = dailyLeaves.filter((l) => l.applicantRole === "student");
    const teachers = dailyLeaves.filter((l) => l.applicantRole === "teacher");
    const staff = dailyLeaves.filter((l) =>
      ["staff", "support_staff", "admin"].includes(l.applicantRole)
    );
    return { students, teachers, staff };
  }, [dailyLeaves]);

  // Fetch Admin's Own Leaves & Balance
  const {
    data: myLeavesData,
    isLoading: myLeavesLoading,
    refetch: refetchMyLeaves,
  } = useApiQuery(
    ["adminMyLeaves", selectedAcademicYearId],
    `${apiConfig.baseUrl}/leaves/my-leaves?academicYear=${selectedAcademicYearId}`,
    { enabled: activeTab === "my_leaves" }
  );
  const myLeaves = useMemo(() => myLeavesData?.data || [], [myLeavesData]);

  const { data: balanceData, refetch: refetchBalance } = useApiQuery(
    ["adminLeaveBalance"],
    `${apiConfig.baseUrl}/leaves/balance`,
    { enabled: activeTab === "my_leaves" }
  );
  const leaveBalance = balanceData?.data || { total: 12, used: 0, remaining: 12 };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedAcademicYearId !== "all") count++;
    if (roleFilter !== "all") count++;
    if (selectedClassId !== "all") count++;
    return count;
  }, [selectedAcademicYearId, roleFilter, selectedClassId]);

  // Mutations
  const actionMutation = useApiMutation({
    mutationFn: (data) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/leaves/${data.id}/action`,
        "PUT"
      )(data.body),
    onSuccess: () => {
      showToast(
        actionType === "approved" ? "Leave approved successfully" : "Leave rejected",
        "success"
      );
      setActionModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequestsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dailyLeaveStatsAdmin"] });
    },
    onError: (error) =>
      showToast(error.message || "Error updating leave request", "error"),
  });

  const applyLeaveMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/leaves/apply`,
      "POST"
    ),
    onSuccess: () => {
      showToast("Leave applied successfully", "success");
      setApplyModalVisible(false);
      setEditingLeave(null);
      setReason("");
      setIsHalfDay(false);
      queryClient.invalidateQueries({ queryKey: ["adminMyLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveBalance"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequestsSummary"] });
    },
    onError: (error) =>
      showToast(error.message || "Error applying for leave", "error"),
  });

  const editLeaveMutation = useApiMutation({
    mutationFn: async ({ leaveId, payload }) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}/leaves/${leaveId}`,
        "PUT"
      )(payload);
    },
    onSuccess: () => {
      showToast("Leave request updated successfully", "success");
      setApplyModalVisible(false);
      setEditingLeave(null);
      setReason("");
      setIsHalfDay(false);
      queryClient.invalidateQueries({ queryKey: ["adminMyLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveBalance"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequestsSummary"] });
    },
    onError: (error) =>
      showToast(error.message || "Error updating leave request", "error"),
  });

  const cancelLeaveMutation = useApiMutation({
    mutationFn: async (leaveId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}/leaves/${leaveId}`,
        "DELETE"
      )();
    },
    onSuccess: () => {
      showToast("Leave request cancelled successfully", "success");
      setCancelModalVisible(false);
      setLeaveToCancel(null);
      queryClient.invalidateQueries({ queryKey: ["adminMyLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveBalance"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeaveRequestsSummary"] });
    },
    onError: (error) =>
      showToast(error.message || "Error cancelling leave request", "error"),
  });

  const openApplyModal = () => {
    setEditingLeave(null);
    setStartDate(new Date());
    setEndDate(new Date());
    setReason("");
    setIsHalfDay(false);
    setHalfDaySlot("morning");
    setApplyModalVisible(true);
  };

  const openEditModal = (leave) => {
    setEditingLeave(leave);
    setStartDate(new Date(leave.startDate));
    setEndDate(new Date(leave.endDate));
    setReason(leave.reason || "");
    setIsHalfDay(leave.leaveType === "half");
    setHalfDaySlot(leave.halfDaySlot || "morning");
    setApplyModalVisible(true);
  };

  const promptCancelLeave = (leave) => {
    setLeaveToCancel(leave);
    setCancelModalVisible(true);
  };

  const confirmCancelLeave = () => {
    if (leaveToCancel) {
      cancelLeaveMutation.mutate(leaveToCancel._id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "requests") {
      await Promise.all([refetchRequests(), refetchAllRequests()]);
    } else if (activeTab === "daily") {
      await refetchDailyStats();
    } else if (activeTab === "my_leaves") {
      await Promise.all([refetchMyLeaves(), refetchBalance()]);
    }
    setRefreshing(false);
  };

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

    actionMutation.mutate({
      id: selectedRequest._id,
      body: {
        status: actionType,
        reason: actionReason,
        rejectionReason: actionType === "rejected" ? rejectionReason : undefined,
        rejectionComments: actionType === "rejected" ? rejectionComments : undefined,
      },
    });
  };

  const handleApplyLeave = () => {
    if (!reason.trim()) {
      showToast("Please enter a reason for leave", "error");
      return;
    }

    const startStr = getISTDateString(startDate);
    const endStr = getISTDateString(endDate);

    if (!isHalfDay && endStr < startStr) {
      showToast("End date cannot be before start date", "error");
      return;
    }

    const finalEndDateStr = isHalfDay ? startStr : endStr;

    const payload = {
      startDate: startStr,
      endDate: finalEndDateStr,
      reason: reason.trim(),
      leaveType: isHalfDay ? "half" : "full",
      halfDaySlot: isHalfDay ? halfDaySlot : undefined,
    };

    if (editingLeave) {
      editLeaveMutation.mutate({ leaveId: editingLeave._id, payload });
    } else {
      applyLeaveMutation.mutate(payload);
    }
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

  const getRoleBadgeStyle = (role, designation) => {
    if (designation && String(designation).trim()) {
      return { bg: "#EDE7F6", border: "#D1C4E9", text: "#512DA8", label: toTitleCase(String(designation).trim()), icon: "badge" };
    }
    switch (role) {
      case "student":
        return { bg: "#FFF3E0", border: "#FFE0B2", text: "#E65100", label: "Student", icon: "school" };
      case "teacher":
        return { bg: "#EDE7F6", border: "#D1C4E9", text: "#512DA8", label: "Teacher", icon: "person" };
      case "staff":
      case "support_staff":
        return { bg: "#E0F2F1", border: "#B2DFDB", text: "#00695C", label: role === "support_staff" ? "Support Staff" : "Staff", icon: "work" };
      case "admin":
      case "super admin":
        return { bg: "#E8F5E9", border: "#C8E6C9", text: "#2E7D32", label: "Admin", icon: "security" };
      default:
        return { bg: colors.surfaceContainer, border: colors.outlineVariant, text: colors.onSurface, label: "Member", icon: "person" };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return { color: colors.success || "#2E7D32", bg: "#E8F5E9", label: "Approved", icon: "checkmark-circle" };
      case "rejected":
        return { color: colors.error || "#D32F2F", bg: "#FFEBEE", label: "Rejected", icon: "close-circle" };
      default:
        return { color: "#E65100", bg: "#FFF3E0", label: "Pending", icon: "time-outline" };
    }
  };

  // Render Request Card
  const renderRequestCard = ({ item }) => {
    const roleStyle = getRoleBadgeStyle(item.applicantRole, item.applicant?.designation);
    const statusBadge = getStatusBadge(item.status);
    const isStudent = item.applicantRole === "student";
    const durationLabel = calculateDays(item.startDate, item.endDate, item.leaveType);
    const applicantDisplayName = formatUserName(item.applicant?.name, "Unknown");

    return (
      <View
        style={[
          styles.requestCard,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "50" },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: roleStyle.text }]} />

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0, gap: 10 }}>
            <UserAvatar
              photoUrl={item.applicant?.profilePhoto}
              name={applicantDisplayName}
              role={item.applicantRole}
              size={40}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={[styles.applicantName, { color: colors.onSurface }]} numberOfLines={1}>
                  {applicantDisplayName}
                </Text>
                {item.academicYear?.name && (
                  <View style={[styles.tinyYearPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Text style={[styles.tinyYearText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                      {item.academicYear.name}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                <View style={[styles.roleChip, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
                  <MaterialIcons name={roleStyle.icon} size={10} color={roleStyle.text} />
                  <Text style={[styles.roleChipText, { color: roleStyle.text }]} numberOfLines={1}>
                    {roleStyle.label}
                  </Text>
                </View>

                {isStudent && item.class && (
                  <View style={[styles.classChip, { backgroundColor: "#FFF3E0", borderColor: "#FFE0B2" }]}>
                    <Text style={[styles.classChipText, { color: "#E65100" }]} numberOfLines={1}>
                      {formatClassName(item.class.name || item.class.label)}{" "}
                      {item.class.section ? `(${item.class.section})` : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.color + "40", flexShrink: 0 }]}>
            <Ionicons name={statusBadge.icon} size={12} color={statusBadge.color} />
            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        {/* Date & Duration */}
        <View style={[styles.dateBar, { backgroundColor: colors.surfaceContainerLow }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.dateText, { color: colors.onSurface }]} numberOfLines={1}>
              {formatDate(item.startDate)}
              {item.leaveType === "full" && item.startDate !== item.endDate && ` – ${formatDate(item.endDate)}`}
            </Text>
          </View>

          <View style={[styles.durationBadge, { backgroundColor: colors.primaryContainer, flexShrink: 0 }]}>
            <Text style={[styles.durationBadgeText, { color: colors.onPrimaryContainer }]} numberOfLines={1}>
              {durationLabel}
              {item.leaveType === "half" ? ` (${item.halfDaySlot})` : ""}
            </Text>
          </View>
        </View>

        {/* Reason */}
        <View style={[styles.reasonBox, { backgroundColor: colors.surfaceContainerHighest + "35" }]}>
          <Text style={[styles.reasonText, { color: colors.onSurface }]}>
            "{item.reason}"
          </Text>
        </View>

        {/* Decision details */}
        {item.status === "rejected" && (
          <View style={[styles.decisionBox, { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" }]}>
            <Text style={{ color: "#D32F2F", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs, lineHeight: 18 }}>
              Rejected: {item.rejectionReason}
            </Text>
            {item.rejectionComments && (
              <Text style={{ color: colors.onSurfaceVariant, fontSize: FONT_SIZES.xs, marginTop: 2, lineHeight: 18 }}>
                Note: {item.rejectionComments}
              </Text>
            )}
          </View>
        )}

        {item.status === "approved" && item.actionReason && (
          <View style={[styles.decisionBox, { backgroundColor: "#E8F5E9", borderColor: "#C8E6C9" }]}>
            <Text style={{ color: "#2E7D32", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs, lineHeight: 18 }}>
              Approval Note: {item.actionReason}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          {item.status === "pending" ? (
            <>
              <TouchableOpacity
                style={[styles.rejectBtn, { backgroundColor: colors.errorContainer + "30", borderColor: colors.error + "40" }]}
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
              style={[styles.editBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}
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

  // Render Daily Absence Card
  const renderDailyCard = ({ item }) => {
    const roleStyle = getRoleBadgeStyle(item.applicantRole, item.applicant?.designation);
    const applicantDisplayName = formatUserName(item.applicant?.name, "Unknown");

    return (
      <View style={[styles.dailyCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "50" }]}>
        <View style={[styles.cardAccent, { backgroundColor: roleStyle.text }]} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, minWidth: 0 }}>
          <UserAvatar
            photoUrl={item.applicant?.profilePhoto}
            name={applicantDisplayName}
            role={item.applicantRole}
            size={38}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.applicantName, { color: colors.onSurface }]} numberOfLines={1}>
              {applicantDisplayName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
              <View style={[styles.roleChip, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
                <MaterialIcons name={roleStyle.icon} size={10} color={roleStyle.text} />
                <Text style={[styles.roleChipText, { color: roleStyle.text }]} numberOfLines={1}>{roleStyle.label}</Text>
              </View>
              {item.applicantRole === "student" && item.class && (
                <Text style={{ fontSize: FONT_SIZES.xs, color: colors.onSurfaceVariant, fontFamily: FONTS.medium, flexShrink: 1 }} numberOfLines={1}>
                  {formatClassName(item.class.name || item.class.label)}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.awayBadge, { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2", flexShrink: 0 }]}>
            <Text style={{ color: "#D32F2F", fontSize: FONT_SIZES.micro, fontFamily: FONTS.bold }}>ON LEAVE</Text>
          </View>
        </View>

        <View style={[styles.dateBar, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurface, fontFamily: FONTS.medium, flexShrink: 1 }} numberOfLines={1}>
            Until: {formatDate(item.endDate)} ({item.leaveType === "half" ? "Half Day" : "Full Day"})
          </Text>
        </View>

        <Text style={[styles.reasonText, { color: colors.onSurfaceVariant, marginTop: 6 }]}>
          "{item.reason}"
        </Text>
      </View>
    );
  };

  // Render My Leave Card
  const renderMyLeaveCard = ({ item }) => {
    const statusBadge = getStatusBadge(item.status);
    const isPending = item.status === "pending";
    return (
      <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "50" }]}>
        <View style={[styles.cardAccent, { backgroundColor: statusBadge.color }]} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.onSurface }]} numberOfLines={1}>
                {formatDate(item.startDate)}
                {item.leaveType === "full" && item.startDate !== item.endDate && ` – ${formatDate(item.endDate)}`}
              </Text>
            </View>
            <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant, marginTop: 1, fontFamily: FONTS.regular }} numberOfLines={1}>
              {item.leaveType === "half" ? `Half Day (${item.halfDaySlot})` : "Full Day"} • {calculateDays(item.startDate, item.endDate, item.leaveType)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.color + "40", flexShrink: 0 }]}>
            <Ionicons name={statusBadge.icon} size={12} color={statusBadge.color} />
            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
          </View>
        </View>

        <View style={[styles.reasonBox, { backgroundColor: colors.surfaceContainerHighest + "35" }]}>
          <Text style={[styles.reasonText, { color: colors.onSurface }]}>"{item.reason}"</Text>
        </View>

        {/* Applicant Actions for Pending Leaves */}
        {isPending && (
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={[
                styles.cardActionBtn,
                { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
              ]}
              onPress={() => openEditModal(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={13} color={colors.primary} />
              <Text style={[styles.cardActionBtnText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cardActionBtn,
                { backgroundColor: colors.errorContainer + "25", borderColor: colors.error + "40" },
              ]}
              onPress={() => promptCancelLeave(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={13} color={colors.error} />
              <Text style={[styles.cardActionBtnText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ListHeaderComponent for Admin Requests Tab (Scrolls with list)
  const renderListHeader = () => {
    return (
      <View style={{ paddingTop: 4, paddingBottom: 10 }}>
        {/* Compact KPI Capsules */}
        <View style={styles.compactKpiBar}>
          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor:
                  statusFilter === "pending"
                    ? (colors.warning || "#FF9800") + "25"
                    : colors.surface,
                borderColor:
                  statusFilter === "pending"
                    ? colors.warning || "#FF9800"
                    : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={[styles.kpiDot, { backgroundColor: colors.warning || "#FF9800" }]} />
              <Text style={[styles.kpiCapsuleNum, { color: colors.warning || "#FF9800" }]} numberOfLines={1}>
                {summaryMetrics.pending}
              </Text>
            </View>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor:
                  statusFilter === "approved"
                    ? colors.success + "25"
                    : colors.surface,
                borderColor:
                  statusFilter === "approved"
                    ? colors.success
                    : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={[styles.kpiDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.kpiCapsuleNum, { color: colors.success }]} numberOfLines={1}>
                {summaryMetrics.approved}
              </Text>
            </View>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              Approved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor:
                  statusFilter === "rejected"
                    ? colors.error + "25"
                    : colors.surface,
                borderColor:
                  statusFilter === "rejected"
                    ? colors.error
                    : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={[styles.kpiDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.kpiCapsuleNum, { color: colors.error }]} numberOfLines={1}>
                {summaryMetrics.rejected}
              </Text>
            </View>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              Rejected
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCapsule,
              {
                backgroundColor:
                  statusFilter === "all"
                    ? colors.primaryContainer
                    : colors.surface,
                borderColor:
                  statusFilter === "all"
                    ? colors.primary
                    : colors.outlineVariant + "40",
              },
            ]}
            onPress={() => setStatusFilter("all")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[styles.kpiCapsuleNum, { color: colors.primary }]}>{summaryMetrics.total}</Text>
            </View>
            <Text style={[styles.kpiCapsuleLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Filters Tag Bar */}
        {activeFiltersCount > 0 && (
          <View style={styles.activeFiltersRow}>
            {selectedAcademicYearId !== "all" && (
              <View style={[styles.activeFilterPill, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.activeFilterText, { color: colors.onSecondaryContainer }]} numberOfLines={1}>
                  Year: {academicYears.find((y) => y._id === selectedAcademicYearId)?.name || "Selected"}
                </Text>
                <TouchableOpacity onPress={() => setSelectedAcademicYearId("all")}>
                  <Ionicons name="close" size={14} color={colors.onSecondaryContainer} />
                </TouchableOpacity>
              </View>
            )}

            {roleFilter !== "all" && (
              <View style={[styles.activeFilterPill, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.activeFilterText, { color: colors.onSecondaryContainer }]} numberOfLines={1}>
                  Role: {roleFilter.toUpperCase()}
                </Text>
                <TouchableOpacity onPress={() => setRoleFilter("all")}>
                  <Ionicons name="close" size={14} color={colors.onSecondaryContainer} />
                </TouchableOpacity>
              </View>
            )}

            {selectedClassId !== "all" && (
              <View style={[styles.activeFilterPill, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.activeFilterText, { color: colors.onSecondaryContainer }]} numberOfLines={1}>
                  Class: {formatClassName(classesList.find((c) => c._id === selectedClassId)?.name || "Selected")}
                </Text>
                <TouchableOpacity onPress={() => setSelectedClassId("all")}>
                  <Ionicons name="close" size={14} color={colors.onSecondaryContainer} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setSelectedAcademicYearId("all");
                setRoleFilter("all");
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
      {/* 1. Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Header
          title="Leave Management"
          subtitle="Review requests, track absences & allowance"
          showBack={true}
        />
      </View>

      {/* 2. Sleek Segmented Navigation (Height 36px) */}
      <View style={styles.tabContainer}>
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceContainer }]}>
          {[
            { key: "requests", label: "Requests", count: summaryMetrics.pending },
            { key: "daily", label: "Today", count: dailyLeaves.length },
            { key: "my_leaves", label: "My Leaves", count: null },
          ].map((tab) => {
            const isTabActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabBtn,
                  isTabActive && [styles.tabBtnActive, { backgroundColor: colors.surface }],
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: isTabActive ? colors.primary : colors.onSurfaceVariant },
                    isTabActive && { fontFamily: FONTS.bold },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {tab.count !== null && tab.count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: tab.key === "requests" ? "#E65100" : colors.primary }]}>
                    <Text style={styles.tabBadgeText}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Sticky Search & Filter Action Bar */}
      {activeTab === "requests" && (
        <View style={styles.searchFilterBar}>
          <View style={[styles.searchInputBox, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "60" }]}>
            <Ionicons name="search" size={16} color={colors.onSurfaceVariant} />
            <TextInput
              style={[styles.searchInput, { color: colors.onSurface }]}
              placeholder="Search applicant, class, or reason..."
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

          {/* View Mode Toggle: Stream vs Grouped */}
          <TouchableOpacity
            style={[styles.viewModeBtn, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "60" }]}
            onPress={() => setViewMode(viewMode === "grouped" ? "list" : "grouped")}
            activeOpacity={0.7}
          >
            <Ionicons name={viewMode === "grouped" ? "layers" : "list"} size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Filter Sheet Button */}
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

      {/* TAB 1: REQUESTS LIST */}
      {activeTab === "requests" && (
        <View style={{ flex: 1 }}>
          {requestsLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.onSurfaceVariant }]}>
                Loading leave requests...
              </Text>
            </View>
          ) : viewMode === "grouped" && categorizedSections.length > 0 ? (
            <SectionList
              sections={categorizedSections}
              renderItem={renderRequestCard}
              ListHeaderComponent={renderListHeader}
              renderSectionHeader={({ section: { title, data } }) => (
                <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.outlineVariant + "30" }]}>
                  <Text style={[styles.sectionHeaderTitle, { color: colors.onSurface }]} numberOfLines={1}>{title}</Text>
                  <Text style={[styles.sectionCountText, { color: colors.onSurfaceVariant }]}>
                    {data.length}
                  </Text>
                </View>
              )}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="done-all" size={48} color={colors.onSurfaceVariant + "70"} />
                  <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No Leave Requests</Text>
                  <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                    No leave requests match your selected filters.
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={filteredRequests}
              renderItem={renderRequestCard}
              ListHeaderComponent={renderListHeader}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="done-all" size={48} color={colors.onSurfaceVariant + "70"} />
                  <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No Leave Requests</Text>
                  <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                    No leave requests match your selected filters.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* TAB 2: DAILY ABSENCE DASHBOARD */}
      {activeTab === "daily" && (
        <View style={{ flex: 1 }}>
          {/* Compact Date Bar */}
          <View style={[styles.dailyBar, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "40" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.onSurface }]} numberOfLines={1}>{formatDate(dailyDate)}</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 6, flexShrink: 0 }}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={() => setDailyDate(new Date())}
              >
                <Text style={{ color: colors.onPrimaryContainer, fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs }}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                onPress={() => setShowDailyDatePicker(true)}
              >
                <Text style={{ color: colors.onSurface, fontFamily: FONTS.medium, fontSize: FONT_SIZES.xs }}>
                  Pick Date
                </Text>
              </TouchableOpacity>
            </View>

            {showDailyDatePicker && (
              <DateTimePicker
                value={dailyDate}
                mode="date"
                display="default"
                onChange={(event, selected) => {
                  setShowDailyDatePicker(false);
                  if (selected) setDailyDate(selected);
                }}
              />
            )}
          </View>

          {/* Daily Quick Counts */}
          <View style={styles.dailyCountsRow}>
            <View style={[styles.dailyCountPill, { backgroundColor: "#FFF3E0" }]}>
              <Text style={{ color: "#E65100", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs }} numberOfLines={1}>
                {dailyLeavesGrouped.students.length} Students
              </Text>
            </View>
            <View style={[styles.dailyCountPill, { backgroundColor: "#EDE7F6" }]}>
              <Text style={{ color: "#512DA8", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs }} numberOfLines={1}>
                {dailyLeavesGrouped.teachers.length} Teachers
              </Text>
            </View>
            <View style={[styles.dailyCountPill, { backgroundColor: "#E0F2F1" }]}>
              <Text style={{ color: "#00695C", fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs }} numberOfLines={1}>
                {dailyLeavesGrouped.staff.length} Staff
              </Text>
            </View>
          </View>

          {dailyStatsLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={dailyLeaves}
              renderItem={renderDailyCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.success} />
                  <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>All Present</Text>
                  <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                    No approved leaves found for {formatDate(dailyDate)}.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* TAB 3: MY LEAVES & BALANCE */}
      {activeTab === "my_leaves" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.allowanceCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + "50" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={[styles.allowanceTitle, { color: colors.onSurface }]} numberOfLines={1}>Leave Allowance</Text>
                <Text style={{ fontSize: FONT_SIZES.xs, color: colors.onSurfaceVariant }} numberOfLines={1}>
                  Year {activeYearObj?.name || new Date().getFullYear()}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.applyBtnSmall, { backgroundColor: colors.primary, flexShrink: 0 }]}
                onPress={openApplyModal}
              >
                <Ionicons name="add" size={15} color={colors.onPrimary} />
                <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
                  Apply Leave
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.allowanceGrid}>
              <View style={[styles.allowanceCol, { backgroundColor: colors.surfaceContainerLow }]}>
                <Text style={[styles.allowanceNum, { color: colors.onSurface }]} numberOfLines={1}>{leaveBalance.total}</Text>
                <Text style={[styles.allowanceLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>Total</Text>
              </View>
              <View style={[styles.allowanceCol, { backgroundColor: "#FFF3E0" }]}>
                <Text style={[styles.allowanceNum, { color: "#E65100" }]} numberOfLines={1}>{leaveBalance.used}</Text>
                <Text style={[styles.allowanceLabel, { color: "#E65100" }]} numberOfLines={1}>Used</Text>
              </View>
              <View style={[styles.allowanceCol, { backgroundColor: "#E8F5E9" }]}>
                <Text style={[styles.allowanceNum, { color: "#2E7D32" }]} numberOfLines={1}>{leaveBalance.remaining}</Text>
                <Text style={[styles.allowanceLabel, { color: "#2E7D32" }]} numberOfLines={1}>Remaining</Text>
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
                  <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No Leave Records</Text>
                  <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                    You haven't submitted any leave requests yet.
                  </Text>
                </View>
              }
            />
          )}

          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: colors.primary }]}
            onPress={openApplyModal}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
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
              {/* Role Filter */}
              <Text style={[styles.filterGroupLabel, { color: colors.onSurfaceVariant }]}>
                APPLICANT ROLE
              </Text>
              <View style={styles.chipGrid}>
                {[
                  { id: "all", label: "All Roles" },
                  { id: "student", label: "Students" },
                  { id: "teacher", label: "Teachers" },
                  { id: "staff", label: "Staff" },
                  { id: "admin", label: "Admin" },
                ].map((item) => {
                  const isSel = roleFilter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.sheetChip,
                        {
                          backgroundColor: isSel
                            ? colors.primary
                            : colors.surfaceContainerHighest || colors.surfaceVariant,
                          borderColor: isSel
                            ? colors.primary
                            : colors.outlineVariant + "40",
                          borderWidth: 1,
                        },
                        isSel && styles.sheetChipActive,
                      ]}
                      onPress={() => setRoleFilter(item.id)}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          { color: isSel ? colors.onPrimary : colors.onSurface },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Academic Year Filter */}
              <Text style={[styles.filterGroupLabel, { color: colors.onSurfaceVariant, marginTop: 14 }]}>
                ACADEMIC YEAR
              </Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[
                    styles.sheetChip,
                    {
                      backgroundColor:
                        selectedAcademicYearId === "all"
                          ? colors.primary
                          : colors.surfaceContainerHighest || colors.surfaceVariant,
                      borderColor:
                        selectedAcademicYearId === "all"
                          ? colors.primary
                          : colors.outlineVariant + "40",
                      borderWidth: 1,
                    },
                    selectedAcademicYearId === "all" && styles.sheetChipActive,
                  ]}
                  onPress={() => setSelectedAcademicYearId("all")}
                >
                  <Text
                    style={[
                      styles.sheetChipText,
                      {
                        color:
                          selectedAcademicYearId === "all"
                            ? colors.onPrimary
                            : colors.onSurface,
                      },
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
                        {
                          backgroundColor: isSel
                            ? colors.primary
                            : colors.surfaceContainerHighest || colors.surfaceVariant,
                          borderColor: isSel
                            ? colors.primary
                            : colors.outlineVariant + "40",
                          borderWidth: 1,
                        },
                        isSel && styles.sheetChipActive,
                      ]}
                      onPress={() => setSelectedAcademicYearId(yr._id)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text
                          style={[
                            styles.sheetChipText,
                            { color: isSel ? colors.onPrimary : colors.onSurface },
                          ]}
                        >
                          {yr.name}
                        </Text>
                        {yr.isActive && (
                          <View
                            style={{
                              backgroundColor: isSel
                                ? "rgba(255,255,255,0.25)"
                                : colors.primaryContainer,
                              paddingHorizontal: 5,
                              paddingVertical: 1,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.micro,
                                fontFamily: FONTS.bold,
                                color: isSel ? colors.onPrimary : colors.onPrimaryContainer,
                              }}
                            >
                              Current
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Class Filter */}
              {classesList.length > 0 && (
                <>
                  <Text style={[styles.filterGroupLabel, { color: colors.onSurfaceVariant, marginTop: 14 }]}>
                    CLASS & SECTION
                  </Text>
                  <View style={styles.chipGrid}>
                    <TouchableOpacity
                      style={[
                        styles.sheetChip,
                        {
                          backgroundColor:
                            selectedClassId === "all"
                              ? colors.primary
                              : colors.surfaceContainerHighest || colors.surfaceVariant,
                          borderColor:
                            selectedClassId === "all"
                              ? colors.primary
                              : colors.outlineVariant + "40",
                          borderWidth: 1,
                        },
                        selectedClassId === "all" && styles.sheetChipActive,
                      ]}
                      onPress={() => setSelectedClassId("all")}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          {
                            color:
                              selectedClassId === "all"
                                ? colors.onPrimary
                                : colors.onSurface,
                          },
                        ]}
                      >
                        All Classes
                      </Text>
                    </TouchableOpacity>

                    {classesList.map((cls) => {
                      const isSel = selectedClassId === cls._id;
                      return (
                        <TouchableOpacity
                          key={cls._id}
                          style={[
                            styles.sheetChip,
                            {
                              backgroundColor: isSel
                                ? colors.primary
                                : colors.surfaceContainerHighest || colors.surfaceVariant,
                              borderColor: isSel
                                ? colors.primary
                                : colors.outlineVariant + "40",
                              borderWidth: 1,
                            },
                            isSel && styles.sheetChipActive,
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
                  setRoleFilter("all");
                  setSelectedClassId("all");
                  setFilterModalVisible(false);
                }}
              >
                <Text style={{ color: colors.onSurfaceVariant, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
                  Reset All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetApplyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
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
                  {actionType === "approved" ? "Approve Leave Request" : "Reject Leave Request"}
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
                  name={formatUserName(selectedRequest.applicant?.name, "Unknown")}
                  role={selectedRequest.applicantRole}
                  size={32}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.onSurface }}>
                    {formatUserName(selectedRequest.applicant?.name, "Unknown")}
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
                            backgroundColor: isPresetSelected ? colors.errorContainer : colors.surfaceContainer,
                            borderColor: isPresetSelected ? colors.error : colors.outlineVariant + "40",
                          },
                        ]}
                        onPress={() => setRejectionReason(preset)}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            color: isPresetSelected ? colors.onErrorContainer : colors.onSurface,
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
                  SPECIFIC COMMENTS / NOTE *
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
                  placeholder="Explain why this request is being rejected..."
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
                  APPROVAL NOTE (OPTIONAL)
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
                  placeholder="e.g. Ensure assignments are submitted..."
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
                <Text style={{ color: colors.onSurfaceVariant, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
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
                  <ActivityIndicator color={actionType === "approved" ? colors.onPrimary : colors.onError} size="small" />
                ) : (
                  <Text style={{ color: actionType === "approved" ? colors.onPrimary : colors.onError, fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm }}>
                    {actionType === "approved" ? "Approve" : "Reject"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* APPLY LEAVE MODAL (ADMIN) */}
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
              <Text style={[styles.modalHeading, { color: colors.onSurface }]}>
                {editingLeave ? "Edit Leave Request" : "Apply for Leave"}
              </Text>
              <TouchableOpacity onPress={() => setApplyModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>START DATE</Text>
                  <TouchableOpacity
                    style={[styles.datePickerInput, { backgroundColor: colors.surfaceContainer }]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurface, fontFamily: FONTS.medium }}>
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
                      <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurface, fontFamily: FONTS.medium }}>
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

              <View style={{ marginBottom: 18 }}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>REASON FOR LEAVE *</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surfaceContainer, color: colors.onSurface }]}
                  placeholder="Provide details about your leave application..."
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
                disabled={applyLeaveMutation.isPending || editLeaveMutation.isPending}
              >
                {applyLeaveMutation.isPending || editLeaveMutation.isPending ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={{ color: colors.onPrimary, fontFamily: FONTS.bold, fontSize: FONT_SIZES.md }}>
                    {editingLeave ? "Update Application" : "Submit Application"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={cancelModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.confirmIconBox, { backgroundColor: colors.errorContainer + "30" }]}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.onSurface }]}>
              Cancel Leave Request?
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.onSurfaceVariant }]}>
              Are you sure you want to cancel this pending leave request? This action cannot be undone.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { borderColor: colors.outlineVariant }]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={{ fontFamily: FONTS.bold, color: colors.onSurfaceVariant, fontSize: FONT_SIZES.sm }}>
                  Keep Request
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: colors.error }]}
                onPress={confirmCancelLeave}
                disabled={cancelLeaveMutation.isPending}
              >
                {cancelLeaveMutation.isPending ? (
                  <ActivityIndicator color={colors.onError} size="small" />
                ) : (
                  <Text style={{ fontFamily: FONTS.bold, color: colors.onError, fontSize: FONT_SIZES.sm }}>
                    Yes, Cancel
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
    minWidth: 0,
  },
  tabBtnActive: {
    elevation: 1,
  },
  tabBtnText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flexShrink: 1,
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    flexShrink: 0,
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
    minWidth: 0,
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
    minWidth: 0,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    padding: 0,
  },
  viewModeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filterSheetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
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
    textAlign: "center",
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
    maxWidth: "100%",
  },
  activeFilterText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    maxWidth: 160,
  },
  clearAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    marginBottom: 8,
    marginTop: 6,
  },
  sectionHeaderTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    flex: 1,
    minWidth: 0,
  },
  sectionCountText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flexShrink: 0,
    marginLeft: 6,
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
  dailyCard: {
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
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  tinyYearPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tinyYearText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    gap: 2,
  },
  roleChipText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  classChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
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
    flexShrink: 0,
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
    flexShrink: 0,
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
    lineHeight: LINE_HEIGHTS.sm,
  },
  decisionBox: {
    padding: 8,
    borderRadius: 8,
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
  dailyBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dailyCountsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 10,
  },
  dailyCountPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
  },
  awayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  allowanceCard: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  allowanceTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  applyBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
    flexShrink: 0,
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
    fontSize: FONT_SIZES.md,
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
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginTop: 8,
    marginBottom: 2,
  },
  emptySub: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 18,
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
    fontSize: FONT_SIZES.md,
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
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    flex: 1,
    minWidth: 0,
  },
  applicantMiniSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
    minWidth: 0,
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
    minHeight: 70,
    lineHeight: 20,
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
    minWidth: 0,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  cardActionBtnText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  confirmIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 6,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
