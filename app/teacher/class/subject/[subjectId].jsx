import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../../../theme";
import { useAuth } from "../../../../context/AuthContext";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import PostContentModal from "../../../../components/PostContentModal";
import apiConfig from "../../../../config/apiConfig";
import { useToast } from "../../../../components/ToastProvider";
import AppHeader from "../../../../components/Header";
import UserAvatar from "../../../../components/ui/UserAvatar";
import { formatUserName } from "../../../../utils/userFormatters";
import { useLabel } from "../../../../context/LabelsContext";
import { formatDate } from "../../../../utils/date";
import AppRefreshControl from "../../../../components/ui/AppRefreshControl";
import ClassMediaAttachmentViewer from "../../../../components/class/ClassMediaAttachmentViewer";

export default function SubjectDetailScreen() {
  const { id, subjectId } = useLocalSearchParams(); // classId and subjectId
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { t } = useLabel();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const userId = user?._id || user?.id || user?.userId;
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  // Fetch Subject Details
  const { data: subjects } = useApiQuery(
    ["classSubjects", id],
    `${apiConfig.baseUrl}/classes/${id}/subjects`,
    { enabled: !!id }
  );

  const currentSubject = subjects?.find((s) => s._id === subjectId);
  const subjectName = currentSubject?.name || "";
  const subjectTeachers = currentSubject?.teachers || [];

  // Fetch Content
  const {
    data: contentData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["subjectContent", subjectId],
    `${apiConfig.baseUrl}/classes/${id}/subjects/${subjectId}/content`,
    { enabled: !!subjectId && !!id }
  );
  const content = contentData || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
      queryClient.invalidateQueries({
        queryKey: ["subjectContent", subjectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["studentClassFeed", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["classContentFeed", id],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["subjectContent", subjectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["studentClassFeed", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["classContentFeed", id],
      });
    },
    onError: (error) =>
      showToast(error.message || "Failed to delete post", "error"),
  });

  const handlePostContent = (formData) => {
    const payload = { ...formData, subject: subjectId };
    postContentMutation.mutate(payload);
  };

  const handleDeletePost = (contentId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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

  const getContentTypeColor = (type) => {
    switch (type) {
      case "homework":
        return "#EF4444";
      case "news":
        return "#F59E0B";
      default:
        return "#3B82F6";
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case "homework":
        return "assignment";
      case "news":
        return "campaign";
      default:
        return "menu-book";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={{ padding: 16, paddingTop: 20 }}>
          <AppHeader
            title={
              subjectName || t("teacher.subjectDetails", "Subject Details")
            }
            subtitle={
              subjectTeachers.length > 0
                ? `${t("teacher.teachersLabel", "Teachers")}: ${subjectTeachers
                    .map((t) => t.name)
                    .join(", ")}`
                : t("teacher.classContent", "Class Content")
            }
            showBack
          />

          {/* Quick Actions */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/teacher/subject/performance",
                  params: { subjectId },
                })
              }
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.primary,
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
                elevation: 2,
              })}
            >
              <MaterialIcons name="leaderboard" size={20} color="#fff" />
              <Text
                style={{
                  fontSize: FONT_SIZES.base,
                  fontFamily: FONTS.bold,
                  color: "#fff",
                }}
              >
                {t("teacher.performance", "Performance")}
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ marginTop: 80, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={{ marginTop: 20, gap: 12 }}>
              {content.length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    marginTop: 40,
                    padding: 24,
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
                      color: colors.onSurface,
                      fontSize: FONT_SIZES.mdLg,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    {t("teacher.noContentPostedYet", "No content posted yet.")}
                  </Text>
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.regular,
                      textAlign: "center",
                    }}
                  >
                    Tap the + button below to post homework, study notes, or slides for this subject.
                  </Text>
                </View>
              ) : (
                content.map((item) => {
                  const typeColor = getContentTypeColor(item.type);
                  const authorId = item.author?._id || item.author;
                  const canDelete = isAdmin || (userId && authorId && authorId.toString() === userId.toString());

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
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
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
                            <MaterialIcons
                              name={getContentTypeIcon(item.type)}
                              size={14}
                              color={typeColor}
                            />
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
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.regular,
                              color: colors.onSurfaceVariant,
                            }}
                          >
                            {formatDate(item.createdAt)}
                          </Text>

                          {canDelete && (
                            <Pressable
                              onPress={() => handleDeletePost(item._id)}
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
                          fontSize: FONT_SIZES.lg,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                          lineHeight: 24,
                        }}
                      >
                        {item.title}
                      </Text>

                      {item.description ? (
                        <Text
                          style={{
                            fontSize: FONT_SIZES.base,
                            fontFamily: FONTS.regular,
                            color: colors.onSurfaceVariant,
                            lineHeight: 22,
                          }}
                        >
                          {item.description}
                        </Text>
                      ) : null}

                      {/* Attachments Viewer */}
                      {item.attachments && item.attachments.length > 0 && (
                        <ClassMediaAttachmentViewer attachments={item.attachments} />
                      )}

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <UserAvatar
                            photoUrl={
                              item.author?.profilePhoto ||
                              item.teacher?.profilePhoto
                            }
                            name={formatUserName(
                              item.author?.name || item.teacher?.name,
                              "Teacher"
                            )}
                            role="teacher"
                            size={24}
                          />
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              fontFamily: FONTS.regular,
                            }}
                          >
                            {t("common.by", "By")}:{" "}
                            <Text style={{ fontFamily: FONTS.bold, color: colors.onSurface }}>
                              {formatUserName(
                                item.author?.name || item.teacher?.name,
                                t("common.teacher", "Teacher")
                              )}
                            </Text>
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB to Post Content */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setShowPostModal(true);
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
          elevation: 5,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>

      <PostContentModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onSubmit={handlePostContent}
        defaultSubjectId={subjectId}
        isLoading={postContentMutation.isPending}
      />
    </View>
  );
}
