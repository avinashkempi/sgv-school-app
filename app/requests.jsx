import React, { useState, useRef } from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import Header from "../components/Header";
import Card from "../components/Card";
import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import { useLabel } from "../context/LabelsContext";
import useTabScrollToTop from "../hooks/useTabScrollToTop";
import AppRefreshControl from "../components/ui/AppRefreshControl";

export default function RequestsScreen() {
  const router = useRouter();
  const { styles, colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLabel();
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  // Mobile standard gestures
  useTabScrollToTop(scrollRef, "/requests");

  // Fetch Teacher Classes (for teachers)
  const { data: teacherClassesData, refetch: refetchClasses } = useApiQuery(
    ["teacherClasses"],
    `${apiConfig.baseUrl}/classes/my-classes`,
    {
      enabled: !!(user && user.role === "teacher"),
    }
  );

  const teacherClasses = teacherClassesData || [];

  const onRefresh = async () => {
    setRefreshing(true);
    if (user && user.role === "teacher") {
      await refetchClasses();
    }
    setRefreshing(false);
  };

  const navigateToLeaves = () => {
    if (user?.role === "student") {
      router.push("/student/leaves");
    } else if (
      user?.role === "staff" ||
      user?.role === "teacher" ||
      user?.role === "support_staff"
    ) {
      router.push("/teacher/leaves");
    } else if (user?.role === "admin" || user?.role === "super admin") {
      router.push("/admin/leaves");
    }
  };

  const navigateToMyAttendance = () => {
    if (user?.role === "student") {
      router.push(`/student/attendance`);
    } else if (
      user?.role === "teacher" ||
      user?.role === "staff" ||
      user?.role === "support_staff"
    ) {
      router.push("/teacher/attendance");
    } else if (user?.role === "admin" || user?.role === "super admin") {
      router.push("/admin/attendance?tab=my_attendance");
    }
  };

  const navigateToMarkAttendance = () => {
    if (user?.role === "teacher") {
      if (teacherClasses.length === 1) {
        // If only one class, go directly to attendance marking
        router.push({
          pathname: "/teacher/class/attendance",
          params: { classId: teacherClasses[0]._id },
        });
      } else {
        // If multiple classes or 0 (let them see empty list), go to class list
        router.push("/teacher/classes?action=attendance");
      }
    } else if (user?.role === "admin" || user?.role === "super admin") {
      router.push("/admin/attendance");
    }
  };

  const renderActionItem = ({ title, subtitle, icon, color, onPress }) => (
    <Card
      variant="elevated"
      onPress={onPress}
      contentStyle={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
      }}
      style={{ marginBottom: 16 }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}
      >
        <View
          style={{
            backgroundColor: color + "15", // 15% opacity
            padding: 12,
            borderRadius: 12,
            width: 52,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={icon} size={26} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: FONT_SIZES.md,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              marginBottom: 4,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              color: colors.onSurfaceVariant,
              fontFamily: FONTS.regular,
            }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={colors.onSurfaceVariant}
      />
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollRef}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.contentPaddingBottom, { padding: 16 }]}
      >
        <Header title={t("requests.title")} subtitle={t("requests.subtitle")} />

        <View style={{ marginTop: 8 }}>
          {/* My Attendance Card - For All */}
          {renderActionItem({
            title: t("requests.myAttendance"),
            subtitle: t("requests.myAttendanceSubtitle"),
            icon: "person",
            color: "#4CAF50",
            onPress: navigateToMyAttendance,
          })}

          {/* Mark Attendance Card - For Teachers & Admins */}
          {["teacher", "admin", "super admin"].includes(user?.role) &&
            renderActionItem({
              title: t("requests.markAttendance"),
              subtitle:
                user?.role === "admin" || user?.role === "super admin"
                  ? t("requests.markAttendanceAdminSubtitle")
                  : t("requests.markAttendanceTeacherSubtitle"),
              icon: "edit-calendar",
              color: "#2196F3",
              onPress: navigateToMarkAttendance,
            })}

          {/* Leave Requests Card */}
          {renderActionItem({
            title: t("requests.leaveRequests"),
            subtitle:
              user?.role === "student" || user?.role === "staff"
                ? t("requests.leaveRequestsStudentSubtitle")
                : t("requests.leaveRequestsAdminSubtitle"),
            icon: "event-note",
            color: "#FF9800",
            onPress: navigateToLeaves,
          })}
        </View>
      </ScrollView>
    </View>
  );
}
