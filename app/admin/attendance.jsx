import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import apiFetch from "../../utils/apiFetch";
import { useQueryClient } from "@tanstack/react-query";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { EmptyState } from "../../components/StateComponents";

import AttendanceView from "../../components/AttendanceView";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatClassName } from "../../utils/formatClassName";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../../utils/userFormatters";
import {
  getISTDateString,
  isISTSunday,
  formatISTDisplayDate,
} from "../../utils/date";

export default function AdminAttendance() {
  const router = useRouter();
  // ... (rest of component)
  const { showToast } = useToast();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Parse initial tab from params if coming from dashboard
  const params = require("expo-router").useLocalSearchParams();
  const initialTab = params?.tab || "summary";
  const [activeTab, setActiveTab] = useState(initialTab); // 'summary', 'student', 'staff', 'tracker', 'my_attendance'
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state for My Attendance tab
  const MY_PAGE_SIZE = 30;
  const [myPage, setMyPage] = useState(1);
  const [allMyAttendance, setAllMyAttendance] = useState([]);
  const [myHasMore, setMyHasMore] = useState(false);
  const [myLoadingMore, setMyLoadingMore] = useState(false);
  const [mySummaryData, setMySummaryData] = useState(null);

  // Show More state
  const [absentVisible, setAbsentVisible] = useState(15);
  const ABSENT_PAGE = 15;
  const [trackerVisible, setTrackerVisible] = useState(10);
  const TRACKER_PAGE = 10;

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Fetch User
  const { data: user } = useApiQuery(
    ["currentUser"],
    `${apiConfig.baseUrl}/auth/me`,
    { select: (data) => data.user }
  );

  // Fetch School Summary
  const {
    data: schoolSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useApiQuery(
    ["attendanceSummary", getISTDateString(date)],
    `${apiConfig.baseUrl}/attendance/school-summary?date=${getISTDateString(
      date
    )}`,
    {
      enabled: activeTab === "summary",
      select: (d) => d.data,
      ...CACHE_TIERS.MODERATE,
    }
  );

  // Fetch if current date is holiday
  const { data: holidayData, refetch: refetchHoliday } = useApiQuery(
    ["holidayStatus", getISTDateString(date)],
    `${apiConfig.baseUrl}/events?startDate=${getISTDateString(
      date
    )}&endDate=${getISTDateString(date)}&isHoliday=true`,
    {
      enabled: activeTab !== "my_attendance" && activeTab !== "tracker",
      ...CACHE_TIERS.MODERATE,
    }
  );
  const holidayEvent =
    holidayData?.event && holidayData.event.length > 0
      ? holidayData.event[0]
      : null;
  const isSunday = isISTSunday(date);
  const isHoliday = isSunday || !!holidayEvent;
  const holidayReason = isSunday ? "Sunday (Weekend)" : holidayEvent?.title;

  // Mutation to mark as holiday
  const toggleHolidayMutation = useApiMutation({
    mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/events`, "POST"),
    onSuccess: async () => {
      showToast("Holiday marked successfully", "success");
      await queryClient.invalidateQueries({ queryKey: ["holidayStatus"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["studentAttendance"] });
      await queryClient.invalidateQueries({ queryKey: ["staffList"] });
      refetchHoliday();
      refetchSummary();
    },
    onError: (err) => {
      console.error("Failed to mark holiday:", err);
      showToast(err?.message || "Failed to mark holiday", "error");
    },
  });

  // Mutation to remove/unmark holiday
  const removeHolidayMutation = useApiMutation({
    mutationFn: (eventId) =>
      createApiMutationFn(`${apiConfig.baseUrl}/events/${eventId}`, "DELETE")(),
    onSuccess: async () => {
      showToast("Holiday removed successfully", "success");
      await queryClient.invalidateQueries({ queryKey: ["holidayStatus"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["studentAttendance"] });
      await queryClient.invalidateQueries({ queryKey: ["staffList"] });
      refetchHoliday();
      refetchSummary();
    },
    onError: (err) => {
      console.error("Failed to remove holiday:", err);
      showToast(err?.message || "Failed to remove holiday", "error");
    },
  });

  const handleMarkAsHoliday = async () => {
    const formattedDate = formatISTDisplayDate(date);

    const confirmMsg = `Are you sure you want to mark ${formattedDate} as a school holiday?\n\n⚠️ Note: Taking attendance will be disabled for this day, and any attendance records already taken for this date will be cleared.`;

    let confirmed = false;
    if (Platform.OS === "web") {
      confirmed = window.confirm(`Mark as Holiday?\n\n${confirmMsg}`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert("Mark as Holiday?", confirmMsg, [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Mark as Holiday",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ]);
      });
    }

    if (confirmed) {
      toggleHolidayMutation.mutate({
        title: "School Holiday",
        date: getISTDateString(date),
        isSchoolEvent: true,
        isHoliday: true,
        description: "Official school holiday declared by administration.",
      });
    }
  };

  const handleRemoveHoliday = async () => {
    if (!holidayEvent?._id) return;
    const formattedDate = formatISTDisplayDate(date);

    const confirmMsg = `Are you sure you want to remove the holiday "${
      holidayEvent.title || "School Holiday"
    }" on ${formattedDate}?\n\nThis will re-enable attendance marking for this day.`;

    let confirmed = false;
    if (Platform.OS === "web") {
      confirmed = window.confirm(`Remove Holiday?\n\n${confirmMsg}`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert("Remove Holiday?", confirmMsg, [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Remove Holiday",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ]);
      });
    }

    if (confirmed) {
      removeHolidayMutation.mutate(holidayEvent._id);
    }
  };

  // Fetch Classes
  const { data: classesData = [] } = useApiQuery(
    ["classes"],
    `${apiConfig.baseUrl}/classes`,
    {
      enabled: activeTab === "student" || activeTab === "summary",
      ...CACHE_TIERS.MODERATE,
    }
  );
  const classes = Array.isArray(classesData)
    ? classesData
    : classesData.data || [];

  // Fetch Student Attendance
  const {
    data: studentAttendance,
    isLoading: studentLoading,
    refetch: refetchStudent,
  } = useApiQuery(
    ["studentAttendance", selectedClass?._id, getISTDateString(date)],
    `${apiConfig.baseUrl}/attendance/class/${
      selectedClass?._id
    }/date/${getISTDateString(date)}`,
    {
      enabled: activeTab === "student" && !!selectedClass,
      ...CACHE_TIERS.REAL_TIME,
    }
  );

  // Fetch Staff List
  const {
    data: staffListResponse,
    isLoading: staffLoading,
    refetch: refetchStaff,
  } = useApiQuery(
    ["staffList", getISTDateString(date)],
    `${apiConfig.baseUrl}/attendance/staff-list?date=${getISTDateString(date)}`,
    { enabled: activeTab === "staff", ...CACHE_TIERS.REAL_TIME }
  );
  const staffList = staffListResponse?.data;

  // Fetch My Attendance (page 1) — subsequent pages fetched via loadMoreMyAttendance
  const {
    data: myAttendanceResponse,
    isLoading: myAttendanceLoading,
    refetch: refetchMyAttendance,
  } = useApiQuery(
    ["myAttendanceAdmin"],
    `${apiConfig.baseUrl}/attendance/my-attendance?page=1&limit=${MY_PAGE_SIZE}`,
    {
      enabled: activeTab === "my_attendance",
      ...CACHE_TIERS.MODERATE,
    }
  );

  useEffect(() => {
    if (myAttendanceResponse) {
      setAllMyAttendance(myAttendanceResponse?.attendance || []);
      setMySummaryData(myAttendanceResponse?.summary || null);
      setMyHasMore(myAttendanceResponse?.pagination?.hasMore || false);
      setMyPage(1);
    }
  }, [myAttendanceResponse]);

  const loadMoreMyAttendance = useCallback(async () => {
    if (myLoadingMore || !myHasMore) return;
    setMyLoadingMore(true);
    try {
      const nextPage = myPage + 1;
      const res = await apiFetch(
        `${apiConfig.baseUrl}/attendance/my-attendance?page=${nextPage}&limit=${MY_PAGE_SIZE}`
      );
      const data = await res.json();
      if (data?.attendance?.length > 0) {
        setAllMyAttendance((prev) => [...prev, ...data.attendance]);
        setMyHasMore(data?.pagination?.hasMore || false);
        setMyPage(nextPage);
      } else {
        setMyHasMore(false);
      }
    } catch (e) {
      console.error("loadMoreMyAttendance error:", e);
    } finally {
      setMyLoadingMore(false);
    }
  }, [myLoadingMore, myHasMore, myPage]);

  // Fetch Classes Marked
  const { data: classesMarkedResponse } = useApiQuery(
    ["classesMarked", getISTDateString(date)],
    `${apiConfig.baseUrl}/attendance/classes-marked?date=${getISTDateString(
      date
    )}`,
    {
      enabled: activeTab === "student" || activeTab === "summary",
      ...CACHE_TIERS.MODERATE,
    }
  );
  const classesMarked = classesMarkedResponse?.markedClasses || [];

  // Fetch Tracker Data
  // eslint-disable-next-line no-unused-vars
  const [trackerStartDate, setTrackerStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 14))
  ); // Last 14 days
  // eslint-disable-next-line no-unused-vars
  const [trackerEndDate, setTrackerEndDate] = useState(new Date());
  const {
    data: trackerDataResponse,
    isLoading: trackerLoading,
    refetch: refetchTracker,
  } = useApiQuery(
    [
      "missingTracker",
      getISTDateString(trackerStartDate),
      getISTDateString(trackerEndDate),
    ],
    `${
      apiConfig.baseUrl
    }/attendance/missing-tracker?startDate=${getISTDateString(
      trackerStartDate
    )}&endDate=${getISTDateString(trackerEndDate)}`,
    { enabled: activeTab === "tracker", ...CACHE_TIERS.MODERATE }
  );
  const trackerData = trackerDataResponse?.missingData || [];

  const loading =
    summaryLoading ||
    studentLoading ||
    staffLoading ||
    myAttendanceLoading ||
    trackerLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "summary") {
      await refetchSummary();
      setAbsentVisible(ABSENT_PAGE);
    }
    if (activeTab === "student") await refetchStudent();
    if (activeTab === "staff") await refetchStaff();
    if (activeTab === "tracker") {
      await refetchTracker();
      setTrackerVisible(TRACKER_PAGE);
    }
    if (activeTab === "my_attendance") await refetchMyAttendance();
    setRefreshing(false);
  };

  // Local state for modifications before saving
  const [localStudentAttendance, setLocalStudentAttendance] = useState([]);
  const [localStaffList, setLocalStaffList] = useState([]);

  useEffect(() => {
    if (studentAttendance) {
      // Auto-set on-leave students to absent if no status
      const processed = studentAttendance.map((s) =>
        s.onLeave && !s.status ? { ...s, status: "absent" } : s
      );
      setLocalStudentAttendance(processed);
    }
  }, [studentAttendance]);

  useEffect(() => {
    if (staffList) setLocalStaffList(staffList);
  }, [staffList]);

  // Mutations
  const saveStudentAttendanceMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/attendance/mark`,
      "POST"
    ),
    onSuccess: () => {
      showToast("Student attendance saved", "success");
      queryClient.invalidateQueries({ queryKey: ["studentAttendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });
    },
    onError: () => showToast("Failed to save attendance", "error"),
  });

  const saveStaffAttendanceMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/attendance/mark-staff`,
      "POST"
    ),
    onSuccess: () => {
      showToast("Staff attendance saved", "success");
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });
    },
    onError: () => showToast("Failed to save attendance", "error"),
  });

  // --- Student Attendance Handlers ---

  const handleStudentStatusChange = (index, newStatus) => {
    const newAttendance = [...localStudentAttendance];
    newAttendance[index].status = newStatus;
    setLocalStudentAttendance(newAttendance);
  };

  const markAllStudentsPresent = () => {
    const newAttendance = localStudentAttendance.map((item) => ({
      ...item,
      status: item.onLeave ? "absent" : "present",
    }));
    setLocalStudentAttendance(newAttendance);
  };

  const saveStudentAttendance = () => {
    if (!selectedClass) return;
    const records = localStudentAttendance
      .filter((item) => item.status)
      .map((item) => ({
        studentId: item.student._id,
        status: item.status,
        remarks: item.remarks,
      }));

    if (records.length === 0) {
      showToast("No attendance marked to save", "info");
      return;
    }

    saveStudentAttendanceMutation.mutate({
      classId: selectedClass._id,
      date: getISTDateString(date),
      attendanceRecords: records,
    });
  };

  // --- Staff Attendance Handlers ---

  const markAllStaffPresent = () => {
    const newStaffList = localStaffList.map((item) => ({
      ...item,
      status: "present",
    }));
    setLocalStaffList(newStaffList);
  };

  const handleStaffStatusChange = (index, newStatus) => {
    const newStaffList = [...localStaffList];
    newStaffList[index].status = newStatus;
    setLocalStaffList(newStaffList);
  };

  const saveStaffAttendance = () => {
    const records = localStaffList
      .filter((item) => item.status) // Only send marked records
      .map((item) => ({
        userId: item.user._id,
        status: item.status,
        remarks: item.remarks,
      }));

    if (records.length === 0) {
      showToast("No attendance marked to save", "info");
      return;
    }

    saveStaffAttendanceMutation.mutate({
      date: getISTDateString(date),
      attendanceRecords: records,
    });
  };

  // --- Render Helpers ---

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return colors.success;
      case "absent":
        return colors.error;
      case "late":
        return "#FF9800";
      case "excused":
        return "#2196F3";
      case "half-day":
        return "#9C27B0";
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return "check-circle";
      case "absent":
        return "cancel";
      case "late":
        return "schedule";
      case "excused":
        return "verified";
      case "half-day":
        return "timelapse";
      default:
        return "radio-button-unchecked";
    }
  };

  const renderStaffItem = ({ item, index }) => (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <UserAvatar
            photoUrl={item.user.profilePhoto}
            name={formatUserName(item.user.name)}
            role={item.user.role}
            size={38}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.semiBold,
                color: colors.textPrimary,
              }}
            >
              {formatUserName(item.user.name)}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                color: colors.textSecondary,
                marginTop: 2,
                fontFamily: FONTS.regular,
              }}
            >
              {formatUserDesignationOrRole(item.user)}
            </Text>
          </View>
        </View>
        {item.status && (
          <MaterialIcons
            name={getStatusIcon(item.status)}
            size={24}
            color={getStatusColor(item.status)}
          />
        )}
      </View>

      {/* Status Buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["present", "half-day", "absent", "late", "excused"].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => handleStaffStatusChange(index, status)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              backgroundColor:
                item.status === status
                  ? getStatusColor(status) + "20"
                  : colors.background,
              borderWidth: item.status === status ? 2 : 1,
              borderColor:
                item.status === status
                  ? getStatusColor(status)
                  : colors.textSecondary + "30",
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.xs,
                fontFamily: FONTS.bold,
                color:
                  item.status === status
                    ? getStatusColor(status)
                    : colors.textSecondary,
                textTransform: "uppercase",
              }}
            >
              {status === "present"
                ? "P"
                : status === "half-day"
                ? "HD"
                : status === "absent"
                ? "A"
                : status === "late"
                ? "L"
                : "E"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.titleLarge}>Attendance Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "summary" && { borderBottomColor: colors.primary },
          ]}
          onPress={() => setActiveTab("summary")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "summary" && {
                color: colors.primary,
                fontWeight: "bold",
              },
            ]}
            numberOfLines={1}
          >
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "student" && { borderBottomColor: colors.primary },
          ]}
          onPress={() => setActiveTab("student")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "student" && {
                color: colors.primary,
                fontWeight: "bold",
              },
            ]}
            numberOfLines={1}
          >
            Student
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "staff" && { borderBottomColor: colors.primary },
          ]}
          onPress={() => setActiveTab("staff")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "staff" && {
                color: colors.primary,
                fontWeight: "bold",
              },
            ]}
            numberOfLines={1}
          >
            Staff
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "tracker" && { borderBottomColor: colors.primary },
          ]}
          onPress={() => setActiveTab("tracker")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "tracker" && {
                color: colors.primary,
                fontWeight: "bold",
              },
            ]}
            numberOfLines={1}
          >
            Tracker
          </Text>
        </TouchableOpacity>
        {user?.role !== "super admin" && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "my_attendance" && {
                borderBottomColor: colors.primary,
              },
            ]}
            onPress={() => setActiveTab("my_attendance")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "my_attendance" && {
                  color: colors.primary,
                  fontWeight: "bold",
                },
              ]}
              numberOfLines={1}
            >
              My Log
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Picker for Student/Staff/Summary tabs */}
      {activeTab !== "my_attendance" && activeTab !== "tracker" && (
        <View
          style={[
            styles.dateBar,
            {
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.primary + "15",
              borderRadius: 24,
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                const d = new Date(date);
                d.setDate(d.getDate() - 1);
                setDate(d);
              }}
              style={{ padding: 10 }}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.primary }]}>
                {formatISTDisplayDate(date)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const d = new Date(date);
                d.setDate(d.getDate() + 1);
                setDate(d);
              }}
              style={{ padding: 10 }}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {!isHoliday &&
            (user?.role === "admin" || user?.role === "super admin") && (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: (colors.error || "#EF4444") + "15",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: (colors.error || "#EF4444") + "40",
                  gap: 6,
                }}
                onPress={handleMarkAsHoliday}
                disabled={toggleHolidayMutation.isPending}
              >
                {toggleHolidayMutation.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.error || "#EF4444"}
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name="event-busy"
                      size={18}
                      color={colors.error || "#EF4444"}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontWeight: "600",
                        color: colors.error || "#EF4444",
                      }}
                    >
                      Mark Holiday
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
        </View>
      )}

      {isHoliday &&
        activeTab !== "my_attendance" &&
        activeTab !== "tracker" && (
          <View
            style={{
              backgroundColor: colors.primary + "12",
              marginHorizontal: 16,
              marginBottom: 16,
              padding: 16,
              borderRadius: 16,
              alignItems: "center",
              borderColor: colors.primary + "30",
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontWeight: "bold",
                color: colors.primary,
              }}
            >
              🌴 Holiday
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                color: colors.textSecondary,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {holidayReason}
            </Text>

            {!isSunday &&
              holidayEvent &&
              (user?.role === "admin" || user?.role === "super admin") && (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.cardBackground || "#FFF",
                    marginTop: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.error || "#EF4444",
                    gap: 6,
                    elevation: 1,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}
                  onPress={handleRemoveHoliday}
                  disabled={removeHolidayMutation.isPending}
                >
                  {removeHolidayMutation.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.error || "#EF4444"}
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color={colors.error || "#EF4444"}
                      />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontWeight: "600",
                          color: colors.error || "#EF4444",
                        }}
                      >
                        Unmark / Remove Holiday
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
          </View>
        )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === "summary" && schoolSummary && (
            <ScrollView
              style={{ flex: 1, padding: 16 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={
                <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {/* Summary Cards */}
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
                <View
                  style={[
                    styles.summaryCardSmall,
                    {
                      backgroundColor: colors.primary + "15",
                      alignItems: "flex-start",
                      padding: 20,
                    },
                  ]}
                >
                  <Text style={[styles.summaryLabel, { marginBottom: 8 }]}>
                    Student Attendance
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: colors.primary, fontSize: FONT_SIZES.xl, marginBottom: 8 },
                    ]}
                  >
                    {schoolSummary?.students?.present || 0}/
                    {schoolSummary?.students?.total || 0}
                  </Text>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: colors.primary + "30",
                      borderRadius: 3,
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        backgroundColor: colors.primary,
                        borderRadius: 3,
                        width: `${
                          schoolSummary?.students?.total > 0
                            ? (schoolSummary.students.present /
                                schoolSummary.students.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </View>
                </View>
                <View
                  style={[
                    styles.summaryCardSmall,
                    {
                      backgroundColor: colors.success + "15",
                      alignItems: "flex-start",
                      padding: 20,
                    },
                  ]}
                >
                  <Text style={[styles.summaryLabel, { marginBottom: 8 }]}>
                    Teacher Attendance
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: colors.success, fontSize: FONT_SIZES.xl, marginBottom: 8 },
                    ]}
                  >
                    {schoolSummary?.teachers?.present || 0}/
                    {schoolSummary?.teachers?.total || 0}
                  </Text>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: colors.success + "30",
                      borderRadius: 3,
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        backgroundColor: colors.success,
                        borderRadius: 3,
                        width: `${
                          schoolSummary?.teachers?.total > 0
                            ? (schoolSummary.teachers.present /
                                schoolSummary.teachers.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Classes Marked */}
              <Text style={styles.titleMedium}>Classes Marked Today</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.cardBackground,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 24,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.tertiary + "20",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}
                >
                  <MaterialIcons
                    name="fact-check"
                    size={24}
                    color={colors.tertiary}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.lg,
                      fontFamily: FONTS.bold,
                      color: colors.textPrimary,
                    }}
                  >
                    {classesMarked.length}{" "}
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.medium,
                        color: colors.textSecondary,
                      }}
                    >
                      out of {classes?.length || 0}
                    </Text>
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.regular,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Classes have taken attendance
                  </Text>
                </View>
              </View>

              {/* Absent List */}
              <Text style={styles.titleMedium}>Absent Today</Text>
              {(schoolSummary?.absentList || []).length === 0 ? (
                <Text style={styles.emptyText}>No one marked absent yet.</Text>
              ) : (
                <>
                  {schoolSummary.absentList
                    .slice(0, absentVisible)
                    .map((item) => (
                      <View key={item._id} style={styles.absentRow}>
                        <View>
                          <Text style={styles.absentName}>{formatUserName(item.name)}</Text>
                          <Text style={styles.absentRole}>
                            {formatUserDesignationOrRole(item)}{" "}
                            {item.className
                              ? `• ${formatClassName(item.className)}`
                              : ""}
                          </Text>
                        </View>
                        <View style={styles.absentTag}>
                          <Text style={styles.absentTagText}>Absent</Text>
                        </View>
                      </View>
                    ))}
                  {absentVisible < schoolSummary.absentList.length && (
                    <TouchableOpacity
                      onPress={() => setAbsentVisible((v) => v + ABSENT_PAGE)}
                      style={{
                        alignItems: "center",
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.primary + "50",
                        marginTop: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.semiBold,
                          color: colors.primary,
                        }}
                      >
                        Show More (
                        {schoolSummary.absentList.length - absentVisible}{" "}
                        remaining)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          )}

          {activeTab === "student" && (
            <View style={{ flex: 1 }}>
              <View style={{ padding: 16, paddingBottom: 0 }}>
                <Text style={styles.titleMedium}>Select Class</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.classScroll}
                >
                  {classes.map((cls) => {
                    const isMarked = classesMarked.includes(cls._id);
                    return (
                      <TouchableOpacity
                        key={cls._id}
                        style={[
                          styles.classChip,
                          selectedClass?._id === cls._id && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                          isMarked &&
                            selectedClass?._id !== cls._id && {
                              borderColor: colors.success,
                              backgroundColor: colors.success + "10",
                            },
                        ]}
                        onPress={() => setSelectedClass(cls)}
                      >
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          {isMarked && (
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color={
                                selectedClass?._id === cls._id
                                  ? "#fff"
                                  : colors.success
                              }
                              style={{ marginRight: 6 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.classChipText,
                              selectedClass?._id === cls._id &&
                                styles.activeClassChipText,
                              isMarked &&
                                selectedClass?._id !== cls._id && {
                                  color: colors.success,
                                },
                            ]}
                          >
                            {formatClassName(cls.name, cls.section)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {selectedClass && (
                <>
                  {isHoliday ? (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 32,
                      }}
                    >
                      <MaterialIcons
                        name="event-busy"
                        size={48}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: FONT_SIZES.md,
                          marginTop: 12,
                        }}
                      >
                        Attendance cannot be marked on holidays.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <FlatList
                        style={{ flex: 1 }}
                        data={localStudentAttendance}
                        keyExtractor={(item) => item.student._id}
                        renderItem={({ item, index }) => {
                          const statusColor = item.status
                            ? getStatusColor(item.status)
                            : null;
                          const borderColor = item.onLeave
                            ? "#FF9800"
                            : statusColor;
                          return (
                            <Pressable
                              onPress={() => {
                                const newStatus =
                                  item.status === "present"
                                    ? "absent"
                                    : "present";
                                handleStudentStatusChange(index, newStatus);
                              }}
                              style={({ pressed }) => ({
                                backgroundColor: colors.cardBackground,
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 8,
                                elevation: 1,
                                opacity: pressed ? 0.85 : 1,
                                ...(borderColor && {
                                  borderLeftWidth: 4,
                                  borderLeftColor: borderColor,
                                }),
                              })}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <View
                                  style={{
                                    flex: 1,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <UserAvatar
                                    photoUrl={item.student?.profilePhoto}
                                    name={formatUserName(item.student?.name)}
                                    role="student"
                                    size={34}
                                  />
                                  <Text
                                    style={{
                                      fontSize: FONT_SIZES.md,
                                      fontFamily: FONTS.semiBold,
                                      color: colors.textPrimary,
                                    }}
                                  >
                                    {index + 1}. {formatUserName(item.student?.name)}
                                  </Text>
                                  {item.onLeave && (
                                    <View
                                      style={{
                                        backgroundColor: "#FF9800" + "20",
                                        paddingHorizontal: 6,
                                        paddingVertical: 1,
                                        borderRadius: 6,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: FONT_SIZES.micro,
                                          fontFamily: FONTS.bold,
                                          color: "#FF9800",
                                        }}
                                      >
                                        ON LEAVE
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                {item.status ? (
                                  <View
                                    style={{
                                      backgroundColor:
                                        getStatusColor(item.status) + "20",
                                      paddingHorizontal: 10,
                                      paddingVertical: 4,
                                      borderRadius: 8,
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <MaterialIcons
                                      name={getStatusIcon(item.status)}
                                      size={16}
                                      color={getStatusColor(item.status)}
                                    />
                                    <Text
                                      style={{
                                        fontSize: FONT_SIZES.sm,
                                        fontFamily: FONTS.bold,
                                        color: getStatusColor(item.status),
                                        textTransform: "capitalize",
                                      }}
                                    >
                                      {item.status}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text
                                    style={{
                                      fontSize: FONT_SIZES.sm,
                                      fontFamily: FONTS.medium,
                                      color: colors.textSecondary,
                                    }}
                                  >
                                    Tap to mark
                                  </Text>
                                )}
                              </View>
                              {item.onLeave && item.leaveReason && (
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.xs,
                                    color: "#FF9800",
                                    marginTop: 4,
                                    fontFamily: FONTS.medium,
                                  }}
                                >
                                  Reason: {item.leaveReason}
                                </Text>
                              )}
                              {item.status && (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    gap: 6,
                                    marginTop: 8,
                                  }}
                                >
                                  {["present", "absent", "late", "excused"].map(
                                    (status) => (
                                      <TouchableOpacity
                                        key={status}
                                        onPress={() =>
                                          handleStudentStatusChange(
                                            index,
                                            status
                                          )
                                        }
                                        activeOpacity={0.7}
                                        style={{
                                          flex: 1,
                                          backgroundColor:
                                            item.status === status
                                              ? getStatusColor(status) + "20"
                                              : "transparent",
                                          borderWidth:
                                            item.status === status ? 1.5 : 1,
                                          borderColor:
                                            item.status === status
                                              ? getStatusColor(status)
                                              : colors.textSecondary + "20",
                                          borderRadius: 6,
                                          paddingVertical: 6,
                                          alignItems: "center",
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: FONT_SIZES.micro,
                                            fontFamily: FONTS.bold,
                                            color:
                                              item.status === status
                                                ? getStatusColor(status)
                                                : colors.textSecondary + "80",
                                          }}
                                        >
                                          {status === "present"
                                            ? "P"
                                            : status === "absent"
                                            ? "A"
                                            : status === "late"
                                            ? "L"
                                            : "E"}
                                        </Text>
                                      </TouchableOpacity>
                                    )
                                  )}
                                </View>
                              )}
                            </Pressable>
                          );
                        }}
                        ListEmptyComponent={
                          <Text style={styles.emptyText}>
                            No students found.
                          </Text>
                        }
                        contentContainerStyle={{
                          paddingHorizontal: 16,
                          paddingBottom: 100,
                        }}
                      />
                      {/* Sticky Bottom Action Bar */}
                      <View
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: colors.cardBackground,
                          borderTopWidth: 1,
                          borderTopColor: colors.textSecondary + "15",
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          paddingBottom: 20,
                          elevation: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 16,
                            marginBottom: 10,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: colors.success,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                fontFamily: FONTS.bold,
                                color: colors.success,
                              }}
                            >
                              {
                                localStudentAttendance.filter(
                                  (s) => s.status === "present"
                                ).length
                              }{" "}
                              P
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: colors.error,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                fontFamily: FONTS.bold,
                                color: colors.error,
                              }}
                            >
                              {
                                localStudentAttendance.filter(
                                  (s) => s.status === "absent"
                                ).length
                              }{" "}
                              A
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.bold,
                              color: colors.textSecondary,
                            }}
                          >
                            / {localStudentAttendance.length}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TouchableOpacity
                            onPress={markAllStudentsPresent}
                            style={{
                              flex: 1,
                              backgroundColor: colors.success + "15",
                              borderWidth: 1.5,
                              borderColor: colors.success,
                              borderRadius: 12,
                              paddingVertical: 12,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <MaterialIcons
                              name="check-circle"
                              size={20}
                              color={colors.success}
                            />
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                fontFamily: FONTS.bold,
                                color: colors.success,
                              }}
                            >
                              All Present
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={saveStudentAttendance}
                            disabled={saveStudentAttendanceMutation.isPending}
                            style={{
                              flex: 1.5,
                              backgroundColor: colors.primary,
                              borderRadius: 12,
                              paddingVertical: 12,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: saveStudentAttendanceMutation.isPending
                                ? 0.7
                                : 1,
                              elevation: 3,
                            }}
                          >
                            {saveStudentAttendanceMutation.isPending ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <MaterialIcons
                                  name="save"
                                  size={20}
                                  color="#fff"
                                />
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.sm,
                                    fontFamily: FONTS.bold,
                                    color: "#fff",
                                  }}
                                >
                                  Save
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {activeTab === "staff" && (
            <View style={{ flex: 1 }}>
              {isHoliday ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 32,
                  }}
                >
                  <MaterialIcons
                    name="event-busy"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: FONT_SIZES.md,
                      marginTop: 12,
                    }}
                  >
                    Attendance cannot be marked on holidays.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.actionHeader}>
                    <TouchableOpacity
                      onPress={markAllStaffPresent}
                      style={styles.textButton}
                    >
                      <Text
                        style={[
                          styles.textButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        Mark All Present
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    style={{ flex: 1 }}
                    data={localStaffList}
                    renderItem={renderStaffItem}
                    keyExtractor={(item) => item.user._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                      <AppRefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                      />
                    }
                  />
                  <View style={styles.footer}>
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={saveStaffAttendance}
                      disabled={saveStaffAttendanceMutation.isPending}
                    >
                      {saveStaffAttendanceMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>
                          Save Attendance
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === "tracker" && (
            <View style={{ flex: 1, padding: 16 }}>
              <Text style={styles.titleMedium}>Missing Attendance Tracker</Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  color: colors.textSecondary,
                  marginBottom: 16,
                  fontFamily: FONTS.regular,
                }}
              >
                Shows days where classes missed marking attendance.
              </Text>
              <ScrollView
                refreshControl={
                  <AppRefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {trackerData.length === 0 ? (
                  <EmptyState
                    title="No Tracking Data"
                    message="There is no attendance tracking data for the selected period."
                    icon="event-busy"
                  />
                ) : (
                  <>
                    {trackerData.slice(0, trackerVisible).map((item) => (
                      <View
                        key={item.date}
                        style={{
                          backgroundColor: colors.cardBackground,
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                          elevation: 1,
                          borderLeftWidth: 4,
                          borderLeftColor:
                            item.missingCount > 0
                              ? colors.error
                              : colors.success,
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
                          <Text
                            style={{
                              fontSize: FONT_SIZES.md,
                              fontFamily: FONTS.bold,
                              color: colors.textPrimary,
                            }}
                          >
                            {new Date(item.date).toDateString()}
                          </Text>
                          <View
                            style={{
                              backgroundColor:
                                item.missingCount > 0
                                  ? colors.error + "20"
                                  : colors.success + "20",
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                fontFamily: FONTS.bold,
                                color:
                                  item.missingCount > 0
                                    ? colors.error
                                    : colors.success,
                              }}
                            >
                              {item.missingCount > 0
                                ? `${item.missingCount} Missing`
                                : "Complete"}
                            </Text>
                          </View>
                        </View>
                        {item.missingCount > 0 ? (
                          <View>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.textSecondary,
                                marginBottom: 4,
                                fontFamily: FONTS.medium,
                              }}
                            >
                              Classes that missed attendance:
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {item.missingClasses.map((cls, idx) => (
                                <Text
                                  key={idx}
                                  style={{
                                    fontSize: FONT_SIZES.sm,
                                    backgroundColor: colors.surfaceContainer,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 4,
                                    color: colors.textPrimary,
                                  }}
                                >
                                  {formatClassName(cls.name, cls.section)}
                                </Text>
                              ))}
                            </View>
                          </View>
                        ) : (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.textSecondary,
                              fontFamily: FONTS.regular,
                            }}
                          >
                            All {item.totalCount} classes marked attendance on
                            this day.
                          </Text>
                        )}
                      </View>
                    ))}
                    {trackerVisible < trackerData.length && (
                      <TouchableOpacity
                        onPress={() =>
                          setTrackerVisible((v) => v + TRACKER_PAGE)
                        }
                        style={{
                          alignItems: "center",
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: colors.primary + "50",
                          marginTop: 4,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            fontFamily: FONTS.semiBold,
                            color: colors.primary,
                          }}
                        >
                          Show More ({trackerData.length - trackerVisible}{" "}
                          remaining)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          )}

          {activeTab === "my_attendance" && (
            <AttendanceView
              role={user?.role || "admin"}
              attendanceHistory={allMyAttendance}
              summary={mySummaryData}
              holidays={myAttendanceResponse?.holidays}
              loading={myAttendanceLoading && !myAttendanceResponse}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onLoadMore={loadMoreMyAttendance}
              loadingMore={myLoadingMore}
              hasMore={myHasMore}
              title="My Attendance Log"
              subtitle="Track your admin attendance"
            />
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: colors.cardBackground,
      elevation: 2,
    },
    headerTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    backButton: { padding: 4 },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 10,
      paddingHorizontal: 2,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabText: {
      fontSize: FONT_SIZES.xs,
      fontFamily: FONTS.medium,
      color: colors.textSecondary,
      textAlign: "center",
    },
    dateBar: {
      flexDirection: "row",
      justifyContent: "center",
      padding: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dateSelector: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    dateText: { marginLeft: 8, fontWeight: "600" },
    loader: { marginTop: 20 },
    listContent: { padding: 16, paddingBottom: 24 },
    staffCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 1,
    },
    staffInfo: { flex: 1 },
    staffName: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: colors.textPrimary },
    staffRole: { fontSize: FONT_SIZES.sm, color: colors.textSecondary },
    statusIndicator: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      minWidth: 80,
      alignItems: "center",
    },
    statusText: { color: "#fff", fontWeight: "bold", fontSize: FONT_SIZES.sm },
    footer: {
      padding: 16,
      paddingBottom: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    saveButton: { padding: 16, borderRadius: 12, alignItems: "center" },
    saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: FONT_SIZES.md },
    summaryCard: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: colors.cardBackground,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      elevation: 2,
    },
    summaryItem: { alignItems: "center" },
    summaryValue: {
      fontSize: FONT_SIZES.lg,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    summaryLabel: { fontSize: FONT_SIZES.sm, color: colors.textSecondary },
    historyCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 1,
    },
    historyStatus: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    historyStatusText: { color: "#fff", fontWeight: "bold", fontSize: FONT_SIZES.lg },
    historyInfo: { flex: 1 },
    historyDate: { fontSize: FONT_SIZES.md, fontWeight: "600", color: colors.textPrimary },
    historyTime: { fontSize: FONT_SIZES.sm, color: colors.textSecondary },
    historyRemarks: {
      fontSize: FONT_SIZES.sm,
      color: colors.textSecondary,
      fontStyle: "italic",
    },
    sectionTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    classScroll: { maxHeight: 50, marginBottom: 16 },
    classChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    classChipText: { color: colors.textSecondary },
    activeClassChipText: { color: "#fff", fontWeight: "bold" },
    studentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    studentName: { fontSize: FONT_SIZES.md, color: colors.textPrimary },
    miniStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    miniStatusText: { color: "#fff", fontSize: FONT_SIZES.micro, fontWeight: "bold" },
    emptyText: {
      textAlign: "center",
      marginTop: 20,
      color: colors.textSecondary,
    },
    summaryCardSmall: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    absentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    absentName: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: colors.textPrimary },
    absentRole: { fontSize: FONT_SIZES.sm, color: colors.textSecondary },
    absentTag: {
      backgroundColor: colors.error + "20",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    absentTagText: { color: colors.error, fontSize: FONT_SIZES.micro, fontWeight: "bold" },
    actionHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    textButton: { padding: 8 },
    textButtonText: { fontWeight: "bold" },
  });
