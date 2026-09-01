import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput as RNTextInput,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../../theme";
import { useAuth } from "../../../context/AuthContext";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import apiConfig from "../../../config/apiConfig";
import { useToast } from "../../../components/ToastProvider";
import AppHeader from "../../../components/Header";
import { formatDate } from "../../../utils/date";
import UserDetailModal from "../../../components/UserDetailModal";
import Button from "../../../components/Button";
import SegmentedControl from "../../../components/SegmentedControl";
import { EmptyState } from "../../../components/StateComponents";
import { useLabel } from "../../../context/LabelsContext";
import UserAvatar from "../../../components/ui/UserAvatar";
import { formatUserName, toTitleCase } from "../../../utils/userFormatters";
import PostContentModal from "../../../components/PostContentModal";
import ClassMediaAttachmentViewer from "../../../components/class/ClassMediaAttachmentViewer";
import { CACHE_TIERS } from "../../../utils/cacheConfig";

export default function ClassDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  // eslint-disable-next-line no-unused-vars
  const { styles, colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLabel();

  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailUser, setSelectedDetailUser] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const [activeTab, setActiveTab] = useState("subjects"); // subjects, feed, students
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGlobalSubjectIds, setSelectedGlobalSubjectIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Fetch Class Details
  const { data, refetch } = useApiQuery(
    ["classDetails", id],
    `${apiConfig.baseUrl}/classes/${id}/full-details`,
    { enabled: !!id }
  );

  // Fetch Class Feed & Notes
  const {
    data: classFeed = [],
    isLoading: loadingFeed,
    refetch: refetchFeed,
  } = useApiQuery(
    ["classContentFeed", id],
    `${apiConfig.baseUrl}/classes/${id}/content`,
    { ...CACHE_TIERS.MODERATE, enabled: !!id }
  );


  const classData = data?.classData;
  const subjects = data?.subjects || [];
  const students = data?.students || [];

  // Fetch Global Subjects
  const { data: globalSubjectsData } = useApiQuery(
    ["globalSubjects"],
    `${apiConfig.baseUrl}/subjects`
  );
  const globalSubjects = (() => {
    const raw = Array.isArray(globalSubjectsData)
      ? globalSubjectsData
      : Array.isArray(globalSubjectsData?.data)
      ? globalSubjectsData.data
      : [];
    // Deduplicate by _id to prevent React duplicate key warnings
    const seen = new Set();
    return raw.filter((s) => {
      if (seen.has(s._id)) return false;
      seen.add(s._id);
      return true;
    });
  })();

  // Fetch Available Students
  const { data: availableStudentsData } = useApiQuery(
    ["availableStudents"],
    `${apiConfig.baseUrl}/users?role=student&limit=1000`
  );
  // Handle both new paginated structure and potential old array structure
  const availableStudents = Array.isArray(availableStudentsData)
    ? availableStudentsData.filter((s) => !s.currentClass)
    : (availableStudentsData?.data || []).filter((s) => !s.currentClass);

  // Mutations
  const addSubjectMutation = useApiMutation({
    mutationFn: async (subjectId) => {
      const subject = globalSubjects.find((s) => s._id === subjectId);
      if (!subject) throw new Error("Subject not found");
      return createApiMutationFn(
        `${apiConfig.baseUrl}/classes/${id}/subjects`,
        "POST"
      )({
        name: subject.name,
        globalSubjectId: subject._id,
      });
    },
  });

  const removeSubjectMutation = useApiMutation({
    mutationFn: (subjectId) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/classes/${id}/subjects/${subjectId}`,
        "DELETE"
      )(),
    onSuccess: () => {
      showToast(
        t("toasts.subjectRemoved", "Subject removed successfully"),
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["classDetails", id] });
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("toasts.failedToRemoveSubject", "Failed to remove subject"),
        "error"
      ),
  });

  const addStudentsMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/classes/${id}/students`,
      "POST"
    ),
    onSuccess: (data) => {
      showToast(
        data.message ||
          t("toasts.studentsAdded", "Students added successfully"),
        "success"
      );
      setShowAddStudentModal(false);
      setSearchQuery("");
      setSelectedStudentIds([]);
      queryClient.invalidateQueries({ queryKey: ["classDetails", id] });
      queryClient.invalidateQueries({ queryKey: ["availableStudents"] });
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("toasts.failedToAddStudents", "Failed to add students"),
        "error"
      ),
  });

  const removeStudentMutation = useApiMutation({
    mutationFn: (studentId) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/classes/${id}/students/${studentId}`,
        "DELETE"
      )(),
    onSuccess: () => {
      showToast(
        t("toasts.studentRemoved", "Student removed successfully"),
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["classDetails", id] });
      queryClient.invalidateQueries({ queryKey: ["availableStudents"] });
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("toasts.failedToRemoveStudent", "Failed to remove student"),
        "error"
      ),
  });

  const toggleSubjectSelection = (subjectId) => {
    setSelectedGlobalSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleAddSubject = async () => {
    if (selectedGlobalSubjectIds.length === 0) {
      showToast(
        t("toasts.selectOneSubject", "Please select at least one subject"),
        "error"
      );
      return;
    }

    try {
      // Add subjects one by one
      let successCount = 0;
      let failCount = 0;

      await Promise.all(
        selectedGlobalSubjectIds.map(async (subjectId) => {
          try {
            await addSubjectMutation.mutateAsync(subjectId);
            successCount++;
            // eslint-disable-next-line no-unused-vars
          } catch (error) {
            failCount++;
          }
        })
      );

      if (successCount > 0) {
        showToast(
          `${successCount} ${t(
            "toasts.subjectsAddedSuccessfully",
            "subject(s) added successfully"
          )}`,
          "success"
        );
      }
      if (failCount > 0) {
        showToast(
          `${failCount} ${t(
            "toasts.subjectsFailedToAdd",
            "subject(s) failed to add"
          )}`,
          "error"
        );
      }

      setShowAddSubjectModal(false);
      setSelectedGlobalSubjectIds([]);
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ["classDetails", id] });
    } catch (error) {
      console.error(error);
      showToast(
        t("toasts.errorAddingSubjects", "Error adding subjects"),
        "error"
      );
    }
  };

  const handleRemoveSubject = (subjectId, subjectName) => {
    Alert.alert(
      t("teacher.removeSubject", "Remove Subject"),
      `${t(
        "teacher.removeSubjectConfirm",
        "Are you sure you want to remove"
      )} ${subjectName}?`,
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.remove", "Remove"),
          style: "destructive",
          onPress: () => removeSubjectMutation.mutate(subjectId),
        },
      ]
    );
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleBulkAddStudents = () => {
    if (selectedStudentIds.length === 0) {
      showToast(
        t("toasts.selectOneStudent", "Please select at least one student"),
        "error"
      );
      return;
    }

    addStudentsMutation.mutate({ studentIds: selectedStudentIds });
  };

  const handleRemoveStudent = (studentId, studentName) => {
    Alert.alert(
      t("teacher.removeStudent", "Remove Student"),
      `${t(
        "teacher.removeStudentConfirm",
        "Are you sure you want to remove"
      )} ${studentName} ${t("teacher.fromThisClass", "from this class?")}`,
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.remove", "Remove"),
          style: "destructive",
          onPress: () => removeStudentMutation.mutate(studentId),
        },
      ]
    );
  };

  const postContentMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/classes/${id}/content`,
      "POST"
    ),
    onSuccess: () => {
      showToast(
        t("teacher.contentPostedSuccess", "Content posted successfully"),
        "success"
      );
      setShowPostModal(false);
      queryClient.invalidateQueries({ queryKey: ["classContentFeed", id] });
      queryClient.invalidateQueries({ queryKey: ["studentClassFeed", id] });
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("teacher.contentPostedFailure", "Failed to post content"),
        "error"
      ),
  });

  const deleteContentMutation = useApiMutation({
    mutationFn: (contentId) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/classes/${id}/content/${contentId}`,
        "DELETE"
      )(),
    onSuccess: () => {
      showToast(
        t("student.postDeletedSuccess", "Post deleted successfully"),
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["classContentFeed", id] });
      queryClient.invalidateQueries({ queryKey: ["studentClassFeed", id] });
    },
    onError: (err) => showToast(err.message || "Failed to delete post", "error"),
  });

  const handleDeleteFeedItem = (contentId) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteContentMutation.mutate(contentId),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchFeed()]);
    setRefreshing(false);
  };


  const isClassTeacher = (() => {
    if (!user || !classData || !classData.classTeacher) return false;

    const teacherId =
      typeof classData.classTeacher === "object"
        ? classData.classTeacher._id
        : classData.classTeacher;
    const userId = user._id || user.id;

    return String(teacherId) === String(userId);
  })();

  const canManageClass = (() => {
    if (!user) return false;
    return user.role === "admin" || user.role === "super admin";
  })();

  const filteredAvailableStudents = availableStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
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
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <AppHeader
            title={
              classData
                ? `${classData.name} ${classData.section || ""}`
                : t("teacher.classDetails", "Class Details")
            }
            subtitle={t(
              "teacher.manageSubjectsStudents",
              "Manage subjects and students"
            )}
            showBack
          />

          {/* Quick Actions */}
          {isClassTeacher && (
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 20,
                marginBottom: 16,
              }}
            >
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/teacher/class/attendance",
                    params: { classId: id },
                  })
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                  elevation: 2,
                })}
              >
                <MaterialIcons
                  name="how-to-reg"
                  size={28}
                  color={colors.primary}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.semiBold,
                    color: colors.onSurface,
                    marginTop: 8,
                  }}
                >
                  {t("common.attendance", "Attendance")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/teacher/class/performance",
                    params: { classId: id },
                  })
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                  elevation: 2,
                })}
              >
                <MaterialIcons
                  name="insights"
                  size={28}
                  color={colors.success}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.semiBold,
                    color: colors.onSurface,
                    marginTop: 8,
                  }}
                >
                  {t("teacher.performance", "Performance")}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Tabs */}
          <SegmentedControl
            tabs={[
              {
                key: "subjects",
                label: `${t("teacher.subjects", "Subjects")} (${
                  subjects.length
                })`,
              },
              {
                key: "feed",
                label: `${t("student.classFeed", "Feed & Notes")} (${
                  classFeed.length
                })`,
              },
              {
                key: "students",
                label: `${t("common.students", "Students")} (${
                  students.length
                })`,
              },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            style={{ marginBottom: 20 }}
          />


          {activeTab === "subjects" ? (
            <View>
              {subjects.length === 0 ? (
                <EmptyState
                  icon="library-books"
                  title={t("teacher.noSubjectsYet", "No Subjects Yet")}
                  message={t(
                    "teacher.noSubjectsAddedYet",
                    "No subjects have been added to this class yet."
                  )}
                />
              ) : (
                subjects.map((subject) => (
                  <Pressable
                    key={subject._id}
                    onPress={() =>
                      router.push({
                        pathname: "/teacher/class/subject/[subjectId]",
                        params: { id, subjectId: subject._id },
                      })
                    }
                    style={({ pressed }) => ({
                      backgroundColor: colors.surfaceContainer,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                      opacity: pressed ? 0.9 : 1,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    })}
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
                          backgroundColor: colors.primary + "20",
                          padding: 10,
                          borderRadius: 10,
                        }}
                      >
                        <MaterialIcons
                          name="book"
                          size={24}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: FONT_SIZES.md,
                            fontFamily: FONTS.bold,
                            color: colors.onSurface,
                          }}
                          numberOfLines={1}
                        >
                          {subject.name}
                        </Text>
                        {subject.teachers && subject.teachers.length > 0 ? (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              color: colors.onSurfaceVariant,
                              marginTop: 2,
                              fontFamily: FONTS.medium,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {subject.teachers.map((t) => t.name).join(", ")}
                          </Text>
                        ) : (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              color: colors.onSurfaceVariant,
                              marginTop: 2,
                              fontStyle: "italic",
                              fontFamily: FONTS.regular,
                            }}
                            numberOfLines={1}
                          >
                            {t(
                              "teacher.noTeachersAssigned",
                              "No teachers assigned"
                            )}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {canManageClass && (
                        <Pressable
                          accessibilityLabel="Remove subject"
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveSubject(subject._id, subject.name);
                          }}
                          style={{ padding: 8 }}
                        >
                          <MaterialIcons
                            name="delete-outline"
                            size={24}
                            color={colors.error}
                          />
                        </Pressable>
                      )}
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={colors.onSurfaceVariant}
                      />
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          ) : activeTab === "feed" ? (
            <View style={{ gap: 12 }}>
              {/* Post Action Button */}
              <Pressable
                onPress={() => setShowPostModal(true)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                  marginBottom: 4,
                })}
              >
                <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                  }}
                >
                  Post Notes, Homework or Slides
                </Text>
              </Pressable>

              {loadingFeed ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : classFeed.length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    padding: 32,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.outlineVariant,
                    borderStyle: "dashed",
                    gap: 8,
                  }}
                >
                  <MaterialIcons
                    name="article"
                    size={48}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                    }}
                  >
                    No Content Posted Yet
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.regular,
                      color: colors.onSurfaceVariant,
                      textAlign: "center",
                    }}
                  >
                    Post homework, study notes, or announcements for this class using the button above.
                  </Text>
                </View>
              ) : (
                classFeed.map((item) => {
                  const typeColor =
                    item.type === "homework"
                      ? "#EF4444"
                      : item.type === "news"
                      ? "#F59E0B"
                      : "#3B82F6";
                  const authorId = item.author?._id || item.author;
                  const currentUserId = user?._id || user?.id || user?.userId;
                  const canDelete =
                    user?.role === "admin" ||
                    user?.role === "super admin" ||
                    isClassTeacher ||
                    (currentUserId && authorId && authorId.toString() === currentUserId.toString());

                  return (
                    <View
                      key={item._id}
                      style={{
                        backgroundColor: isDark
                          ? colors.surfaceContainer
                          : "#FFFFFF",
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: isDark
                          ? colors.outlineVariant
                          : "rgba(0,0,0,0.06)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: typeColor + "18",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                fontFamily: FONTS.bold,
                                color: typeColor,
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                              }}
                            >
                              {item.type}
                            </Text>
                          </View>

                          {item.subject && (
                            <View
                              style={{
                                backgroundColor: isDark
                                  ? colors.surfaceContainerHighest
                                  : colors.surfaceContainerHigh,
                                paddingHorizontal: 8,
                                paddingVertical: 2.5,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.micro,
                                  fontFamily: FONTS.bold,
                                  color: colors.onSurface,
                                }}
                              >
                                {item.subject.name}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.regular,
                              color: colors.onSurfaceVariant,
                            }}
                          >
                            {formatDate(item.createdAt)}
                          </Text>
                          {canDelete && (
                            <Pressable
                              onPress={() => handleDeleteFeedItem(item._id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ padding: 4 }}
                            >
                              <MaterialIcons
                                name="delete-outline"
                                size={20}
                                color={colors.error}
                              />
                            </Pressable>
                          )}
                        </View>
                      </View>

                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                          lineHeight: 22,
                        }}
                      >
                        {item.title}
                      </Text>

                      {item.description ? (
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            fontFamily: FONTS.regular,
                            color: colors.onSurfaceVariant,
                            lineHeight: 20,
                          }}
                        >
                          {item.description}
                        </Text>
                      ) : null}

                      {/* Attachments */}
                      {item.attachments && item.attachments.length > 0 && (
                        <ClassMediaAttachmentViewer attachments={item.attachments} />
                      )}

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                        }}
                      >
                        <UserAvatar
                          photoUrl={item.author?.profilePhoto}
                          name={item.author?.name}
                          role={item.author?.role || "teacher"}
                          size={24}
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            color: colors.onSurfaceVariant,
                            fontFamily: FONTS.regular,
                          }}
                        >
                          Posted by{" "}
                          <Text style={{ fontFamily: FONTS.bold, color: colors.onSurface }}>
                            {item.author?.name || "Teacher"}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <View>

              {students.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title={t("teacher.noStudentsYet", "No Students Yet")}
                  message={t(
                    "teacher.noStudentsAddedYet",
                    "No students have been added to this class yet."
                  )}
                />
              ) : (
                students.map((student) => (
                  <View
                    key={student._id}
                    style={{
                      backgroundColor: colors.surfaceContainer,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <UserAvatar
                        photoUrl={student.profilePhoto}
                        name={formatUserName(student.name)}
                        role="student"
                        size={42}
                        onPress={
                          canManageClass
                            ? () => {
                                setSelectedDetailUser(student);
                                setShowDetailModal(true);
                              }
                            : undefined
                        }
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {canManageClass ? (
                          <Pressable
                            onPress={() => {
                              setSelectedDetailUser(student);
                              setShowDetailModal(true);
                            }}
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text
                              style={{
                                fontSize: FONT_SIZES.md,
                                fontFamily: FONTS.bold,
                                color: colors.primary,
                                textDecorationLine: "underline",
                              }}
                              numberOfLines={1}
                            >
                              {formatUserName(student.name)}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.md,
                              fontFamily: FONTS.bold,
                              color: colors.onSurface,
                            }}
                            numberOfLines={1}
                          >
                            {formatUserName(student.name)}
                          </Text>
                        )}
                        {student.phone && (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.regular,
                              color: colors.onSurfaceVariant,
                              marginTop: 4,
                            }}
                            numberOfLines={1}
                          >
                            {student.phone}
                          </Text>
                        )}
                        {student.email && (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.regular,
                              color: colors.onSurfaceVariant,
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {student.email}
                          </Text>
                        )}
                        {student.guardianName && (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.regular,
                              color: colors.onSurfaceVariant,
                              marginTop: 4,
                            }}
                            numberOfLines={1}
                          >
                            {t("teacher.guardian", "Guardian")}:{" "}
                            {toTitleCase(student.guardianName)}
                            {student.guardianPhone &&
                              ` (${student.guardianPhone})`}
                          </Text>
                        )}
                        {student.admissionDate && (
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.regular,
                              color: colors.onSurfaceVariant,
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {t("teacher.admitted", "Admitted")}:{" "}
                            {formatDate(student.admissionDate)}
                          </Text>
                        )}
                      </View>
                      {canManageClass && (
                        <Pressable
                          accessibilityLabel="Remove student"
                          onPress={() =>
                            handleRemoveStudent(student._id, student.name)
                          }
                          style={{ padding: 8 }}
                        >
                          <MaterialIcons
                            name="remove-circle-outline"
                            size={24}
                            color={colors.error}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB for Add Subject, Post Content or Add Student */}
      {(canManageClass || isClassTeacher || activeTab === "feed") && (
        <Pressable
          onPress={() => {
            if (activeTab === "feed") {
              setShowPostModal(true);
            } else if (activeTab === "subjects") {
              if (canManageClass) {
                setSelectedGlobalSubjectIds([]);
                setShowAddSubjectModal(true);
                setSearchQuery("");
              } else {
                setShowPostModal(true);
              }
            } else {
              if (canManageClass) {
                setShowAddStudentModal(true);
              }
            }
          }}
          style={({ pressed }) => ({
            position: "absolute",
            bottom: 24,
            right: 24,
            backgroundColor: colors.primary,
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: "center",
            alignItems: "center",
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            opacity: pressed ? 0.9 : 1,
          })}
          accessibilityLabel={
            activeTab === "feed"
              ? "Post material"
              : activeTab === "subjects"
              ? canManageClass
                ? "Add subject"
                : "Post material"
              : "Add student"
          }
        >
          <MaterialIcons
            name={activeTab === "feed" ? "post-add" : "add"}
            size={28}
            color="#FFFFFF"
          />
        </Pressable>
      )}

      {/* Add Subject Modal */}
      <Modal
        visible={showAddSubjectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddSubjectModal(false)}
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
                borderRadius: 16,
                padding: 24,
                width: "100%",
                maxWidth: 440,
                maxHeight: "90%",
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  marginBottom: 16,
                }}
              >
                {t("teacher.addSubjectsToClass", "Add Subjects to Class")}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surfaceContainerHighest,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  marginBottom: 16,
                }}
              >
                <MaterialIcons
                  name="search"
                  size={20}
                  color={colors.onSurfaceVariant}
                  style={{ marginRight: 8 }}
                />
                <RNTextInput
                  placeholder={t(
                    "teacher.searchSubjectsPlaceholder",
                    "Search subjects..."
                  )}
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.regular,
                    color: colors.onSurface,
                  }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {globalSubjects.filter((s) =>
                  s.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  <EmptyState
                    icon="library-books"
                    title={
                      searchQuery
                        ? t("teacher.noSubjectsFound", "No Subjects Found")
                        : t(
                            "teacher.noAvailableSubjects",
                            "No Available Subjects"
                          )
                    }
                    message={
                      searchQuery
                        ? t(
                            "teacher.tryDifferentSearch",
                            "Try a different search term."
                          )
                        : t(
                            "teacher.noGlobalSubjectsCreated",
                            "No global subjects have been created yet."
                          )
                    }
                  />
                ) : (
                  globalSubjects
                    .filter((s) =>
                      s.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => {
                      const isAlreadyAdded = subjects.some(
                        (s) =>
                          s.name.toLowerCase() === item.name.toLowerCase() ||
                          (item.code &&
                            s.code &&
                            s.code.toLowerCase() === item.code.toLowerCase())
                      );
                      const isSelected = selectedGlobalSubjectIds.includes(
                        item._id
                      );

                      return (
                        <Pressable
                          key={item._id}
                          disabled={isAlreadyAdded}
                          onPress={() => toggleSubjectSelection(item._id)}
                          style={({ pressed }) => ({
                            backgroundColor: isAlreadyAdded
                              ? colors.surfaceContainerHighest
                              : isSelected
                              ? colors.primary + "10"
                              : pressed
                              ? colors.surfaceContainerHigh
                              : colors.surfaceContainer,
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: isAlreadyAdded
                              ? colors.outlineVariant
                              : isSelected
                              ? colors.primary
                              : colors.outlineVariant,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          })}
                        >
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              borderWidth: 2,
                              borderColor: isAlreadyAdded
                                ? colors.outlineVariant
                                : isSelected
                                ? colors.primary
                                : colors.onSurfaceVariant,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isSelected
                                ? colors.primary
                                : "transparent",
                            }}
                          >
                            {isSelected && (
                              <MaterialIcons
                                name="check"
                                size={16}
                                color={colors.onPrimary}
                              />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.md,
                                  fontFamily: FONTS.semiBold,
                                  color: colors.onSurface,
                                }}
                              >
                                {item.name}
                              </Text>
                              {isAlreadyAdded && (
                                <View
                                  style={{
                                    backgroundColor: colors.success + "20",
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 8,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: FONT_SIZES.xs,
                                      color: colors.success,
                                      fontFamily: FONTS.bold,
                                    }}
                                  >
                                    {t("common.added", "ADDED")}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {item.code && (
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.sm,
                                  color: colors.onSurfaceVariant,
                                  marginTop: 2,
                                  fontFamily: FONTS.regular,
                                }}
                              >
                                {t("common.code", "Code")}: {item.code}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })
                )}
              </ScrollView>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.outlineVariant,
                  paddingTop: 16,
                  gap: 12,
                }}
              >
                <Button
                  variant="text"
                  onPress={() => {
                    setShowAddSubjectModal(false);
                    setSelectedGlobalSubjectIds([]);
                    setSearchQuery("");
                  }}
                >
                  {t("common.cancel", "Cancel")}
                </Button>

                <Button
                  variant="filled"
                  onPress={handleAddSubject}
                  disabled={selectedGlobalSubjectIds.length === 0}
                  loading={addSubjectMutation.isPending}
                >
                  {addSubjectMutation.isPending
                    ? t("common.adding", "Adding...")
                    : `${t("common.add", "Add")} ${
                        selectedGlobalSubjectIds.length > 0
                          ? `${selectedGlobalSubjectIds.length} `
                          : ""
                      }${t("common.selected", "Selected")}`}
                </Button>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Student Modal */}
      <Modal
        visible={showAddStudentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddStudentModal(false)}
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
                borderRadius: 16,
                padding: 24,
                width: "100%",
                maxWidth: 440,
                maxHeight: "90%",
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  marginBottom: 16,
                }}
              >
                {t("teacher.addStudentsToClass", "Add Students to Class")}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surfaceContainerHighest,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  marginBottom: 16,
                }}
              >
                <MaterialIcons
                  name="search"
                  size={20}
                  color={colors.onSurfaceVariant}
                  style={{ marginRight: 8 }}
                />
                <RNTextInput
                  placeholder={t(
                    "teacher.searchStudentsPlaceholder",
                    "Search by name or phone..."
                  )}
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.regular,
                    color: colors.onSurface,
                  }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {filteredAvailableStudents.length === 0 ? (
                  <EmptyState
                    icon="person-off"
                    title={
                      searchQuery
                        ? t("teacher.noStudentsFound", "No Students Found")
                        : t(
                            "teacher.noUnassignedStudents",
                            "No Unassigned Students"
                          )
                    }
                    message={
                      searchQuery
                        ? t(
                            "teacher.tryDifferentSearch",
                            "Try a different search term."
                          )
                        : t(
                            "teacher.allStudentsAssigned",
                            "All students are already assigned to classes."
                          )
                    }
                  />
                ) : (
                  filteredAvailableStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student._id);
                    return (
                      <Pressable
                        key={student._id}
                        onPress={() => toggleStudentSelection(student._id)}
                        style={({ pressed }) => ({
                          backgroundColor: isSelected
                            ? colors.primary + "10"
                            : pressed
                            ? colors.surfaceContainerHigh
                            : colors.surfaceContainer,
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.outlineVariant,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        })}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.onSurfaceVariant,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isSelected
                              ? colors.primary
                              : "transparent",
                          }}
                        >
                          {isSelected && (
                            <MaterialIcons
                              name="check"
                              size={16}
                              color={colors.onPrimary}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.md,
                              fontFamily: FONTS.semiBold,
                              color: colors.onSurface,
                            }}
                          >
                            {formatUserName(student.name)}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginTop: 2,
                              fontFamily: FONTS.regular,
                            }}
                          >
                            {student.phone}
                          </Text>
                          {student.admissionDate && (
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginTop: 4,
                                fontFamily: FONTS.regular,
                              }}
                            >
                              {t("teacher.admitted", "Admitted")}:{" "}
                              {formatDate(student.admissionDate)}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.outlineVariant,
                  paddingTop: 16,
                  gap: 12,
                }}
              >
                <Button
                  variant="text"
                  onPress={() => {
                    setShowAddStudentModal(false);
                    setSearchQuery("");
                    setSelectedStudentIds([]);
                  }}
                >
                  {t("common.cancel", "Cancel")}
                </Button>

                <Button
                  variant="filled"
                  onPress={handleBulkAddStudents}
                  disabled={selectedStudentIds.length === 0}
                  loading={addStudentsMutation.isPending}
                >
                  {addStudentsMutation.isPending
                    ? t("common.adding", "Adding...")
                    : `${t("common.add", "Add")} ${
                        selectedStudentIds.length > 0
                          ? `${selectedStudentIds.length} `
                          : ""
                      }${t("common.selected", "Selected")}`}
                </Button>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <UserDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        user={selectedDetailUser}
      />

      <PostContentModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onSubmit={(formData) => postContentMutation.mutate(formData)}
        subjects={subjects}
        className={
          classData?.name ||
          classData?.label ||
          (classData?.value ? `Class ${classData.value}` : "")
        }
        branch={classData?.branch || ""}
        teacherName={user?.name || ""}
        isLoading={postContentMutation.isPending}
      />
    </View>
  );
}
