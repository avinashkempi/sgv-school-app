import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import apiConfig from "../../config/apiConfig";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import { formatClassName } from "../../utils/formatClassName";
import { useAuth } from "../../context/AuthContext";
import useTabScrollToTop from "../../hooks/useTabScrollToTop";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import UserAvatar from "../../components/ui/UserAvatar";
import SegmentedControl from "../../components/SegmentedControl";
import UserDetailModal from "../../components/UserDetailModal";
import ClassMediaAttachmentViewer from "../../components/class/ClassMediaAttachmentViewer";
import TodayTimetableCard from "../../components/home/TodayTimetableCard";

const getSubjectStyling = (subjectName = "") => {
  const name = subjectName.toLowerCase();
  if (name.includes("math")) {
    return {
      icon: "functions",
      color: "#3B82F6",
      bg: "rgba(59, 130, 246, 0.12)",
    };
  }
  if (
    name.includes("sci") ||
    name.includes("phys") ||
    name.includes("chem") ||
    name.includes("bio")
  ) {
    return {
      icon: "biotech",
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
    };
  }
  if (
    name.includes("eng") ||
    name.includes("lit") ||
    name.includes("gram")
  ) {
    return {
      icon: "auto-stories",
      color: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.12)",
    };
  }
  if (
    name.includes("soc") ||
    name.includes("hist") ||
    name.includes("geo") ||
    name.includes("civ")
  ) {
    return {
      icon: "public",
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
    };
  }
  if (
    name.includes("comp") ||
    name.includes("it") ||
    name.includes("tech") ||
    name.includes("code")
  ) {
    return {
      icon: "laptop-mac",
      color: "#06B6D4",
      bg: "rgba(6, 182, 212, 0.12)",
    };
  }
  if (
    name.includes("art") ||
    name.includes("draw") ||
    name.includes("craft")
  ) {
    return {
      icon: "palette",
      color: "#EC4899",
      bg: "rgba(236, 72, 153, 0.12)",
    };
  }
  if (
    name.includes("lang") ||
    name.includes("kannada") ||
    name.includes("hindi") ||
    name.includes("french") ||
    name.includes("span")
  ) {
    return {
      icon: "translate",
      color: "#F97316",
      bg: "rgba(249, 115, 22, 0.12)",
    };
  }
  if (
    name.includes("pe") ||
    name.includes("phys ed") ||
    name.includes("sport")
  ) {
    return {
      icon: "sports-soccer",
      color: "#14B8A6",
      bg: "rgba(20, 184, 166, 0.12)",
    };
  }
  if (name.includes("music")) {
    return {
      icon: "music-note",
      color: "#E11D48",
      bg: "rgba(225, 29, 72, 0.12)",
    };
  }
  return {
    icon: "menu-book",
    color: "#6366F1",
    bg: "rgba(99, 102, 241, 0.12)",
  };
};

const formatPostDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${mins}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  if (diffHours < 48) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export default function StudentClassScreen() {
  const router = useRouter();
  const { styles, colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { t } = useLabel();
  const { user } = useAuth();
  const scrollRef = useRef(null);

  useTabScrollToTop(scrollRef, "/student/class");

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("subjects"); // "subjects" | "feed" | "classmates"

  // Search & Filter states
  const [subjectSearch, setSubjectSearch] = useState("");
  const [feedSearch, setFeedSearch] = useState("");
  const [feedTypeFilter, setFeedTypeFilter] = useState("all"); // "all" | "homework" | "note" | "news"
  const [feedSubjectFilter, setFeedSubjectFilter] = useState("all");
  const [classmateSearch, setClassmateSearch] = useState("");

  // User Profile Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const classId = user?.currentClass?._id || user?.currentClass;
  const userId = user?._id || user?.id;

  // 1. Fetch Class Full Details (Class Info, Subjects, Students)
  const {
    data,
    isLoading: loadingClass,
    refetch: refetchClass,
  } = useApiQuery(
    ["studentClassDetails", classId],
    `${apiConfig.baseUrl}/classes/${classId}/full-details`,
    { ...CACHE_TIERS.MODERATE, enabled: !!classId }
  );

  // 2. Fetch Class Feed & Notes
  const {
    data: feedContent = [],
    isLoading: loadingFeed,
    refetch: refetchFeed,
  } = useApiQuery(
    ["studentClassFeed", classId],
    `${apiConfig.baseUrl}/classes/${classId}/content`,
    { ...CACHE_TIERS.MODERATE, enabled: !!classId }
  );

  const classData = data?.classData;
  const subjects = useMemo(() => data?.subjects || [], [data?.subjects]);
  const students = useMemo(() => data?.students || [], [data?.students]);

  // Demographics calculation
  const demographics = useMemo(() => {
    const total = students.length;
    let boys = 0;
    let girls = 0;
    students.forEach((s) => {
      const g = (s.gender || "").toLowerCase();
      if (g === "male" || g === "boy" || g === "m") boys++;
      else if (g === "female" || g === "girl" || g === "f") girls++;
    });
    return { total, boys, girls };
  }, [students]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const query = subjectSearch.toLowerCase().trim();
    return subjects.filter((s) => {
      const nameMatch = (s.name || "").toLowerCase().includes(query);
      const codeMatch = (s.code || "").toLowerCase().includes(query);
      const teacherMatch = s.teachers?.some((tch) =>
        (tch.name || "").toLowerCase().includes(query)
      );
      return nameMatch || codeMatch || teacherMatch;
    });
  }, [subjects, subjectSearch]);

  // Filtered Feed Content
  const filteredFeed = useMemo(() => {
    return feedContent.filter((item) => {
      // Type Filter
      if (feedTypeFilter !== "all" && item.type !== feedTypeFilter) {
        return false;
      }
      // Subject Filter
      if (feedSubjectFilter !== "all") {
        if (feedSubjectFilter === "general") {
          if (item.subject) return false;
        } else {
          const itemSubjId = item.subject?._id || item.subject;
          if (itemSubjId !== feedSubjectFilter) return false;
        }
      }
      // Keyword Search Filter
      if (feedSearch.trim()) {
        const query = feedSearch.toLowerCase().trim();
        const titleMatch = (item.title || "").toLowerCase().includes(query);
        const descMatch = (item.description || "").toLowerCase().includes(query);
        const authorMatch = (item.author?.name || "").toLowerCase().includes(query);
        const subjMatch = (item.subject?.name || "").toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !authorMatch && !subjMatch) {
          return false;
        }
      }
      return true;
    });
  }, [feedContent, feedTypeFilter, feedSubjectFilter, feedSearch]);

  // Filtered Classmates
  const filteredClassmates = useMemo(() => {
    if (!classmateSearch.trim()) return students;
    const query = classmateSearch.toLowerCase().trim();
    return students.filter((st) => {
      const nameMatch = (st.name || "").toLowerCase().includes(query);
      const regMatch = (st.regNo || "").toLowerCase().includes(query);
      const satsMatch = (st.satsNumber || "").toLowerCase().includes(query);
      return nameMatch || regMatch || satsMatch;
    });
  }, [students, classmateSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchClass(), refetchFeed()]);
    setRefreshing(false);
  };

  const handleOpenUserModal = (targetUser) => {
    if (!targetUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedUser(targetUser);
    setShowUserModal(true);
  };

  if (!classId || (!loadingClass && !classData)) {
    return (
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={localStyles.emptyContainer}
          refreshControl={
            <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          scrollsToTop={true}
        >
          <View
            style={[
              localStyles.emptyIconCircle,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            <MaterialIcons name="school" size={54} color={colors.primary} />
          </View>
          <Text style={[localStyles.emptyTitle, { color: colors.onSurface }]}>
            {t("student.noClassAssigned", "No Class Assigned")}
          </Text>
          <Text
            style={[
              localStyles.emptySubtitle,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {t(
              "student.contactAdminForClass",
              "Please contact your administrator to be enrolled in a classroom."
            )}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollRef}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Header
            title={t("student.classroom", "Classroom")}
            subtitle={
              classData
                ? `${formatClassName(classData.name)} • ${
                    classData.section
                      ? `${t("common.section", "Sec")} ${classData.section}`
                      : ""
                  }`
                : ""
            }
            variant="root"
          />

          {loadingClass ? (
            <View style={localStyles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* ───────────────────────────────────────────────────────── */}
              {/* 1. CLASS HERO & OVERVIEW BANNER                           */}
              {/* ───────────────────────────────────────────────────────── */}
              <View
                style={[
                  localStyles.heroBanner,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainer
                      : "#FFFFFF",
                    borderColor: isDark
                      ? colors.outlineVariant
                      : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                {/* Hero Title Row */}
                <View style={localStyles.heroHeaderRow}>
                  <View style={localStyles.heroTitleWrap}>
                    <View style={localStyles.heroTagRow}>
                      <View
                        style={[
                          localStyles.gradeBadge,
                          { backgroundColor: colors.primary + "18" },
                        ]}
                      >
                        <MaterialIcons
                          name="auto-awesome"
                          size={14}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            localStyles.gradeBadgeText,
                            { color: colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {classData.branch?.name || classData.branch || "Main Campus"}
                        </Text>
                      </View>
                      {classData.academicYear?.name && (
                        <View
                          style={[
                            localStyles.gradeBadge,
                            { backgroundColor: colors.secondaryContainer },
                          ]}
                        >
                          <Text
                            style={[
                              localStyles.gradeBadgeText,
                              { color: colors.onSecondaryContainer },
                            ]}
                            numberOfLines={1}
                          >
                            {classData.academicYear.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        localStyles.heroClassName,
                        { color: colors.onSurface },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatClassName(classData.name)}
                      {classData.section ? ` - ${classData.section}` : ""}
                    </Text>
                  </View>

                  <View
                    style={[
                      localStyles.heroClassIcon,
                      { backgroundColor: colors.primary + "14" },
                    ]}
                  >
                    <MaterialIcons
                      name="class"
                      size={28}
                      color={colors.primary}
                    />
                  </View>
                </View>

                {/* Hero Stats Matrix */}
                <View style={localStyles.heroStatsRow}>
                  <View
                    style={[
                      localStyles.heroStatCard,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainerHighest
                          : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="groups"
                      size={20}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        localStyles.heroStatNum,
                        { color: colors.onSurface },
                      ]}
                    >
                      {demographics.total}
                    </Text>
                    <Text
                      style={[
                        localStyles.heroStatLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {t("student.enrolledStudents", "Students")}
                    </Text>
                  </View>

                  <View
                    style={[
                      localStyles.heroStatCard,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainerHighest
                          : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="male"
                      size={20}
                      color="#3B82F6"
                    />
                    <Text
                      style={[
                        localStyles.heroStatNum,
                        { color: colors.onSurface },
                      ]}
                    >
                      {demographics.boys}
                    </Text>
                    <Text
                      style={[
                        localStyles.heroStatLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {t("student.boys", "Boys")}
                    </Text>
                  </View>

                  <View
                    style={[
                      localStyles.heroStatCard,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainerHighest
                          : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="female"
                      size={20}
                      color="#EC4899"
                    />
                    <Text
                      style={[
                        localStyles.heroStatNum,
                        { color: colors.onSurface },
                      ]}
                    >
                      {demographics.girls}
                    </Text>
                    <Text
                      style={[
                        localStyles.heroStatLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {t("student.girls", "Girls")}
                    </Text>
                  </View>

                  <View
                    style={[
                      localStyles.heroStatCard,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainerHighest
                          : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="library-books"
                      size={20}
                      color="#10B981"
                    />
                    <Text
                      style={[
                        localStyles.heroStatNum,
                        { color: colors.onSurface },
                      ]}
                    >
                      {subjects.length}
                    </Text>
                    <Text
                      style={[
                        localStyles.heroStatLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {t("student.subjectsAndFaculty", "Subjects")}
                    </Text>
                  </View>
                </View>

                {/* Class Teacher Spotlight Card */}
                {classData.classTeacher && (
                  <Pressable
                    onPress={() => handleOpenUserModal(classData.classTeacher)}
                    style={({ pressed }) => [
                      localStyles.teacherSpotlight,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainerLowest
                          : colors.surfaceContainerLow,
                        borderColor: colors.primary + "30",
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`View class teacher ${classData.classTeacher.name}`}
                  >
                    <UserAvatar
                      photoUrl={classData.classTeacher.profilePhoto}
                      name={classData.classTeacher.name}
                      role="teacher"
                      size={46}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text
                          style={[
                            localStyles.teacherBadge,
                            { color: colors.primary },
                          ]}
                        >
                          CLASS TEACHER
                        </Text>
                        <MaterialIcons
                          name="verified"
                          size={14}
                          color={colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          localStyles.teacherName,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {classData.classTeacher.name}
                      </Text>
                      {classData.classTeacher.email && (
                        <Text
                          style={[
                            localStyles.teacherEmail,
                            { color: colors.onSurfaceVariant },
                          ]}
                          numberOfLines={1}
                        >
                          {classData.classTeacher.email}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        localStyles.teacherInfoAction,
                        { backgroundColor: colors.primary + "14" },
                      ]}
                    >
                      <MaterialIcons
                        name="arrow-forward-ios"
                        size={14}
                        color={colors.primary}
                      />
                    </View>
                  </Pressable>
                )}
              </View>

              {/* ───────────────────────────────────────────────────────── */}
              {/* 2. ACADEMIC SERVICES QUICK ACCESS STRIP                   */}
              {/* ───────────────────────────────────────────────────────── */}
              <View style={localStyles.shortcutsRow}>
                {[
                  {
                    title: t("student.reportCard", "Report Card"),
                    icon: "assessment",
                    color: "#F59E0B",
                    route: "/student/report-card",
                  },
                  {
                    title: t("student.exams", "Exams"),
                    icon: "event-note",
                    color: "#EF4444",
                    route: "/student/exam-schedule",
                  },
                  {
                    title: t("student.fees", "Fees"),
                    icon: "account-balance-wallet",
                    color: "#10B981",
                    route: "/student/fees",
                  },
                ].map((item, idx) => (
                  <Pressable
                    key={`shortcut-${idx}`}
                    onPress={() => {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      ).catch(() => {});
                      router.push(item.route);
                    }}
                    style={({ pressed }) => [
                      localStyles.shortcutCard,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainer
                          : "#FFFFFF",
                        borderColor: colors.outlineVariant,
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        localStyles.shortcutIconCircle,
                        { backgroundColor: item.color + "18" },
                      ]}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={24}
                        color={item.color}
                      />
                    </View>
                    <Text
                      style={[
                        localStyles.shortcutTitle,
                        { color: colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* ───────────────────────────────────────────────────────── */}
              {/* 3. TIMETABLE NAVIGATION CARD                              */}
              {/* ───────────────────────────────────────────────────────── */}
              <TodayTimetableCard style={{ marginBottom: 14 }} />

              {/* ───────────────────────────────────────────────────────── */}
              {/* 4. 3-TAB SEGMENTED HUB CONTROL                            */}
              {/* ───────────────────────────────────────────────────────── */}
              <SegmentedControl
                tabs={[
                  {
                    key: "subjects",
                    label: t("student.subjectsAndFaculty", "Subjects"),
                    count: subjects.length,
                  },
                  {
                    key: "feed",
                    label: t("student.classFeed", "Feed & Notes"),
                    count: feedContent.length,
                  },
                  {
                    key: "classmates",
                    label: t("student.classmatesRoster", "Classmates"),
                    count: students.length,
                  },
                ]}
                activeTab={activeTab}
                onTabChange={(tabKey) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setActiveTab(tabKey);
                }}
              />

              {/* ───────────────────────────────────────────────────────── */}
              {/* TAB 1: 📚 SUBJECTS DIRECTORY                              */}
              {/* ───────────────────────────────────────────────────────── */}
              {activeTab === "subjects" && (
                <View style={{ gap: 12 }}>
                  {/* Subject Search Bar */}
                  {subjects.length > 3 && (
                    <View
                      style={[
                        localStyles.searchBarWrap,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceContainer
                            : "#FFFFFF",
                          borderColor: colors.outlineVariant,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="search"
                        size={22}
                        color={colors.onSurfaceVariant}
                      />
                      <TextInput
                        placeholder={t(
                          "student.searchSubjectsPlaceholder",
                          "Search subjects or teachers..."
                        )}
                        placeholderTextColor={colors.onSurfaceVariant + "80"}
                        value={subjectSearch}
                        onChangeText={setSubjectSearch}
                        style={[
                          localStyles.searchInput,
                          { color: colors.onSurface },
                        ]}
                      />
                      {subjectSearch.length > 0 && (
                        <Pressable
                          onPress={() => setSubjectSearch("")}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={colors.onSurfaceVariant}
                          />
                        </Pressable>
                      )}
                    </View>
                  )}

                  {filteredSubjects.length === 0 ? (
                    <View style={localStyles.emptySubTab}>
                      <MaterialIcons
                        name="menu-book"
                        size={48}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          localStyles.emptySubTabText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {subjectSearch
                          ? t("student.noSubjectsFound", "No subjects matching your search")
                          : t("student.noSubjectsYet", "No subjects added to this class yet.")}
                      </Text>
                    </View>
                  ) : (
                    filteredSubjects.map((subject) => {
                      const styling = getSubjectStyling(subject.name);
                      const hasTeacher = subject.teachers && subject.teachers.length > 0;
                      const primaryTeacher = hasTeacher ? subject.teachers[0] : null;

                      return (
                        <Pressable
                          key={subject._id}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            router.push({
                              pathname: "/student/class/subject/[subjectId]",
                              params: {
                                id: classData._id,
                                subjectId: subject._id,
                              },
                            });
                          }}
                          style={({ pressed }) => [
                            localStyles.subjectCard,
                            {
                              backgroundColor: isDark
                                ? colors.surfaceContainer
                                : "#FFFFFF",
                              borderColor: isDark
                                ? colors.outlineVariant
                                : "rgba(0,0,0,0.06)",
                              transform: [{ scale: pressed ? 0.985 : 1 }],
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Open subject ${subject.name}`}
                        >
                          {/* Left Icon Accent Box */}
                          <View
                            style={[
                              localStyles.subjectIconBox,
                              { backgroundColor: styling.bg },
                            ]}
                          >
                            <MaterialIcons
                              name={styling.icon}
                              size={28}
                              color={styling.color}
                            />
                          </View>

                          {/* Center Content */}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Text
                                style={[
                                  localStyles.subjectCardName,
                                  { color: colors.onSurface },
                                ]}
                                numberOfLines={1}
                              >
                                {subject.name}
                              </Text>
                              {subject.code && (
                                <View
                                  style={[
                                    localStyles.codeBadge,
                                    { backgroundColor: styling.color + "18" },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      localStyles.codeBadgeText,
                                      { color: styling.color },
                                    ]}
                                  >
                                    {subject.code}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Assigned Teachers */}
                            {hasTeacher ? (
                              <View style={localStyles.subjectTeacherRow}>
                                <UserAvatar
                                  photoUrl={primaryTeacher.profilePhoto}
                                  name={primaryTeacher.name}
                                  role="teacher"
                                  size={22}
                                />
                                <Text
                                  style={[
                                    localStyles.subjectTeacherText,
                                    { color: colors.onSurfaceVariant },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {subject.teachers.map((tch) => tch.name).join(", ")}
                                </Text>
                              </View>
                            ) : (
                              <Text
                                style={[
                                  localStyles.noTeacherText,
                                  { color: colors.onSurfaceVariant + "90" },
                                ]}
                              >
                                {t("student.noTeacherAssigned", "No teacher assigned")}
                              </Text>
                            )}
                          </View>

                          {/* Right Arrow */}
                          <View
                            style={[
                              localStyles.subjectCardArrow,
                              {
                                backgroundColor: isDark
                                  ? colors.surfaceContainerHighest
                                  : colors.surfaceContainerHigh,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="arrow-forward"
                              size={18}
                              color={styling.color}
                            />
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* TAB 2: 📢 CLASS FEED & NOTES (READ-ONLY CONSUMER VIEW)    */}
              {/* ───────────────────────────────────────────────────────── */}
              {activeTab === "feed" && (
                <View style={{ gap: 12 }}>
                  {/* Feed Search Bar */}
                  <View
                    style={[
                      localStyles.searchBarWrap,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainer
                          : "#FFFFFF",
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="search"
                      size={22}
                      color={colors.onSurfaceVariant}
                    />
                    <TextInput
                      placeholder={t(
                        "student.searchNotesPlaceholder",
                        "Search notes, homework, topics..."
                      )}
                      placeholderTextColor={colors.onSurfaceVariant + "80"}
                      value={feedSearch}
                      onChangeText={setFeedSearch}
                      style={[
                        localStyles.searchInput,
                        { color: colors.onSurface },
                      ]}
                    />
                    {feedSearch.length > 0 && (
                      <Pressable
                        onPress={() => setFeedSearch("")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons
                          name="close"
                          size={18}
                          color={colors.onSurfaceVariant}
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Filter Chips by Type */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                  >
                    {[
                      { key: "all", label: t("student.allUpdates", "All"), icon: "dashboard" },
                      { key: "homework", label: t("student.homeworkType", "Homework"), icon: "assignment", color: "#EF4444" },
                      { key: "note", label: t("student.notesType", "Study Notes & Slides"), icon: "menu-book", color: "#3B82F6" },
                      { key: "news", label: t("student.newsType", "Announcements"), icon: "campaign", color: "#F59E0B" },
                    ].map((chip) => {
                      const isSelected = feedTypeFilter === chip.key;
                      const activeColor = chip.color || colors.primary;
                      return (
                        <Pressable
                          key={chip.key}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setFeedTypeFilter(chip.key);
                          }}
                          style={[
                            localStyles.filterChip,
                            {
                              backgroundColor: isSelected
                                ? activeColor + "18"
                                : isDark
                                ? colors.surfaceContainer
                                : "#FFFFFF",
                              borderColor: isSelected ? activeColor : colors.outlineVariant,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={chip.icon}
                            size={16}
                            color={isSelected ? activeColor : colors.onSurfaceVariant}
                          />
                          <Text
                            style={[
                              localStyles.filterChipText,
                              {
                                color: isSelected ? activeColor : colors.onSurfaceVariant,
                                fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                              },
                            ]}
                          >
                            {chip.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Subject Filter Pills (if subjects exist) */}
                  {subjects.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                    >
                      <Pressable
                        onPress={() => setFeedSubjectFilter("all")}
                        style={[
                          localStyles.subjectFilterPill,
                          {
                            backgroundColor:
                              feedSubjectFilter === "all"
                                ? colors.primary
                                : isDark
                                ? colors.surfaceContainerHighest
                                : colors.surfaceContainerHigh,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            localStyles.subjectFilterPillText,
                            {
                              color:
                                feedSubjectFilter === "all"
                                  ? "#FFFFFF"
                                  : colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          All Subjects
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setFeedSubjectFilter("general")}
                        style={[
                          localStyles.subjectFilterPill,
                          {
                            backgroundColor:
                              feedSubjectFilter === "general"
                                ? colors.primary
                                : isDark
                                ? colors.surfaceContainerHighest
                                : colors.surfaceContainerHigh,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            localStyles.subjectFilterPillText,
                            {
                              color:
                                feedSubjectFilter === "general"
                                  ? "#FFFFFF"
                                  : colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          General Notice
                        </Text>
                      </Pressable>

                      {subjects.map((s) => {
                        const isSelected = feedSubjectFilter === s._id;
                        return (
                          <Pressable
                            key={s._id}
                            onPress={() => setFeedSubjectFilter(s._id)}
                            style={[
                              localStyles.subjectFilterPill,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary
                                  : isDark
                                  ? colors.surfaceContainerHighest
                                  : colors.surfaceContainerHigh,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                localStyles.subjectFilterPillText,
                                {
                                  color: isSelected
                                    ? "#FFFFFF"
                                    : colors.onSurfaceVariant,
                                },
                              ]}
                            >
                              {s.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Feed Content Stream */}
                  {loadingFeed ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : filteredFeed.length === 0 ? (
                    <View style={localStyles.emptyFeedCard}>
                      <View
                        style={[
                          localStyles.emptyFeedIconCircle,
                          { backgroundColor: colors.primary + "14" },
                        ]}
                      >
                        <MaterialIcons
                          name="assignment"
                          size={40}
                          color={colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          localStyles.emptyFeedTitle,
                          { color: colors.onSurface },
                        ]}
                      >
                        {t("student.noContentInFeed", "No Class Posts Yet")}
                      </Text>
                      <Text
                        style={[
                          localStyles.emptyFeedDesc,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {t(
                          "student.noContentInFeedDesc",
                          "Homework, study notes, presentation slides, and notices posted by your teachers will appear here."
                        )}
                      </Text>
                    </View>
                  ) : (
                    filteredFeed.map((item) => {
                      const typeConfig =
                        item.type === "homework"
                          ? { label: "HOMEWORK", color: "#EF4444", icon: "assignment" }
                          : item.type === "news"
                          ? { label: "ANNOUNCEMENT", color: "#F59E0B", icon: "campaign" }
                          : { label: "STUDY NOTE", color: "#3B82F6", icon: "menu-book" };

                      return (
                        <View
                          key={item._id}
                          style={[
                            localStyles.feedCard,
                            {
                              backgroundColor: isDark
                                ? colors.surfaceContainer
                                : "#FFFFFF",
                              borderColor: isDark
                                ? colors.outlineVariant
                                : "rgba(0,0,0,0.06)",
                            },
                          ]}
                        >
                          {/* Post Header: Type Badge, Subject & Date */}
                          <View style={localStyles.feedCardHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                              <View
                                style={[
                                  localStyles.feedTypeBadge,
                                  { backgroundColor: typeConfig.color + "18" },
                                ]}
                              >
                                <MaterialIcons
                                  name={typeConfig.icon}
                                  size={13}
                                  color={typeConfig.color}
                                />
                                <Text
                                  style={[
                                    localStyles.feedTypeBadgeText,
                                    { color: typeConfig.color },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {typeConfig.label}
                                </Text>
                              </View>

                              {item.subject && (
                                <View
                                  style={[
                                    localStyles.feedSubjectTag,
                                    { backgroundColor: isDark ? colors.surfaceContainerHighest : colors.surfaceContainerHigh },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      localStyles.feedSubjectTagText,
                                      { color: colors.onSurface },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.subject.name}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text
                              style={[
                                localStyles.feedDateText,
                                { color: colors.onSurfaceVariant },
                              ]}
                              numberOfLines={1}
                            >
                              {formatPostDate(item.createdAt)}
                            </Text>
                          </View>

                          {/* Post Title */}
                          <Text
                            style={[
                              localStyles.feedTitle,
                              { color: colors.onSurface },
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>

                          {/* Post Description */}
                          {item.description ? (
                            <Text
                              style={[
                                localStyles.feedDescription,
                                { color: colors.onSurfaceVariant },
                              ]}
                              numberOfLines={4}
                            >
                              {item.description}
                            </Text>
                          ) : null}

                          {/* Multi-Format Attachments Viewer */}
                          {item.attachments && item.attachments.length > 0 && (
                            <ClassMediaAttachmentViewer
                              attachments={item.attachments}
                            />
                          )}

                          {/* Author Attribution Footer */}
                          {item.author && (
                            <Pressable
                              onPress={() => handleOpenUserModal(item.author)}
                              style={localStyles.authorFooter}
                            >
                              <UserAvatar
                                photoUrl={item.author.profilePhoto}
                                name={item.author.name}
                                role={item.author.role || "teacher"}
                                size={24}
                              />
                              <Text
                                style={[
                                  localStyles.authorNameText,
                                  { color: colors.onSurfaceVariant },
                                ]}
                              >
                                Posted by{" "}
                                <Text style={{ fontFamily: FONTS.bold, color: colors.onSurface }}>
                                  {item.author.name}
                                </Text>
                                {item.author.role === "admin" || item.author.role === "super admin"
                                  ? " • Admin"
                                  : ""}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* TAB 3: 👥 CLASSMATES DIRECTORY                            */}
              {/* ───────────────────────────────────────────────────────── */}
              {activeTab === "classmates" && (
                <View style={{ gap: 12 }}>
                  {/* Classmates Search Bar */}
                  <View
                    style={[
                      localStyles.searchBarWrap,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceContainer
                          : "#FFFFFF",
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="search"
                      size={22}
                      color={colors.onSurfaceVariant}
                    />
                    <TextInput
                      placeholder={t(
                        "student.searchClassmatesPlaceholder",
                        "Search classmates by name or ID..."
                      )}
                      placeholderTextColor={colors.onSurfaceVariant + "80"}
                      value={classmateSearch}
                      onChangeText={setClassmateSearch}
                      style={[
                        localStyles.searchInput,
                        { color: colors.onSurface },
                      ]}
                    />
                    {classmateSearch.length > 0 && (
                      <Pressable
                        onPress={() => setClassmateSearch("")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons
                          name="close"
                          size={18}
                          color={colors.onSurfaceVariant}
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Summary Bar */}
                  <View style={localStyles.classmateSummaryBar}>
                    <Text
                      style={[
                        localStyles.classmateCountText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Showing {filteredClassmates.length} of {students.length} students
                    </Text>
                  </View>

                  {filteredClassmates.length === 0 ? (
                    <View style={localStyles.emptySubTab}>
                      <MaterialIcons
                        name="person-search"
                        size={48}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          localStyles.emptySubTabText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {t(
                          "student.noClassmatesFound",
                          "No classmates found matching search"
                        )}
                      </Text>
                    </View>
                  ) : (
                    <View style={localStyles.classmatesGrid}>
                      {filteredClassmates.map((student) => {
                        const isCurrentStudent = student._id === userId;

                        return (
                          <View
                            key={student._id}
                            style={[
                              localStyles.classmateCard,
                              {
                                backgroundColor: isDark
                                  ? colors.surfaceContainer
                                  : "#FFFFFF",
                                borderColor: isCurrentStudent
                                  ? colors.primary
                                  : isDark
                                  ? colors.outlineVariant
                                  : "rgba(0,0,0,0.06)",
                              },
                            ]}
                          >
                            <UserAvatar
                              photoUrl={student.profilePhoto}
                              name={student.name}
                              role="student"
                              size={44}
                            />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Text
                                  style={[
                                    localStyles.classmateName,
                                    { color: colors.onSurface },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {student.name}
                                </Text>
                                {isCurrentStudent && (
                                  <View
                                    style={[
                                      localStyles.youBadge,
                                      { backgroundColor: colors.primary + "20" },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        localStyles.youBadgeText,
                                        { color: colors.primary },
                                      ]}
                                    >
                                      YOU
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Profile Lightbox Modal */}
      {selectedUser && (
        <UserDetailModal
          visible={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    marginTop: 8,
    textAlign: "center",
    lineHeight: LINE_HEIGHTS.sm,
  },
  heroBanner: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  heroTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  gradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  gradeBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.micro,
  },
  heroClassName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  heroClassIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  heroStatCard: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 12,
    gap: 2,
  },
  heroStatNum: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  heroStatLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
  },
  teacherSpotlight: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  teacherBadge: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.xs,
  },
  teacherName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    flexShrink: 1,
  },
  teacherEmail: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  teacherInfoAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 8,
  },
  shortcutCard: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  shortcutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    padding: 0,
  },
  emptySubTab: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptySubTabText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    textAlign: "center",
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  subjectIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  subjectCardName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    flexShrink: 1,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  subjectTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  subjectTeacherText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  noTeacherText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 3,
  },
  subjectCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  subjectFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectFilterPillText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  emptyFeedCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(128,128,128,0.25)",
    gap: 8,
  },
  emptyFeedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyFeedTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  emptyFeedDesc: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: LINE_HEIGHTS.sm,
    maxWidth: 320,
  },
  feedCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  feedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  feedTypeBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.xs,
  },
  feedSubjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    maxWidth: 150,
  },
  feedSubjectTagText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  feedDateText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  feedTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    lineHeight: LINE_HEIGHTS.md,
  },
  feedDescription: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.sm,
  },
  authorFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  authorNameText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  classmateSummaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  classmateCountText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  classmatesGrid: {
    gap: 8,
  },
  classmateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  classmateName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    flexShrink: 1,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  classmateRegNo: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  genderPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
  },
});
