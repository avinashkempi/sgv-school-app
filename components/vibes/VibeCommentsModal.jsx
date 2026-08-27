import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import formatTimeAgo from "../../utils/formatTimeAgo";
import UserAvatar from "../ui/UserAvatar";
import { formatUserName } from "../../utils/userFormatters";

const QUICK_EMOJIS = ["❤️", "🔥", "👏", "🎓", "🎉", "🌟", "🙌"];

export default function VibeCommentsModal({ visible, onClose, vibe }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  const [commentText, setCommentText] = useState("");
  const [postAsSchool, setPostAsSchool] = useState(isAdmin);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, name, text }
  const inputRef = useRef(null);

  const vibeId = vibe?._id;
  const queryKey = ["vibeComments", vibeId];

  const { data, isLoading } = useApiQuery(
    queryKey,
    vibeId
      ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.getComments(vibeId)}`
      : null,
    {
      ...CACHE_TIERS.VIBES_REALTIME,
      enabled: !!vibeId && visible,
    }
  );

  const comments = data?.data || [];

  // Helper to adjust comments count across feed without trashing infinite scroll pagination
  const adjustCommentsCount = useCallback(
    (delta) => {
      const updateVibes = (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: (page.data || []).map((v) =>
              v._id === vibeId
                ? {
                    ...v,
                    commentsCount: Math.max((v.commentsCount || 0) + delta, 0),
                  }
                : v
            ),
          })),
        };
      };

      queryClient.setQueriesData({ queryKey: ["vibes"] }, updateVibes);
      queryClient.setQueriesData({ queryKey: ["myVibes"] }, updateVibes);
      queryClient.setQueriesData({ queryKey: ["savedVibes"] }, updateVibes);

      // Update spotlight query in-memory if matching
      queryClient.setQueryData(["vibeSpotlight"], (old) => {
        if (!old?.data || old.data._id !== vibeId) return old;
        return {
          ...old,
          data: {
            ...old.data,
            commentsCount: Math.max((old.data.commentsCount || 0) + delta, 0),
          },
        };
      });

      // Update highlights query in-memory if matching
      queryClient.setQueryData(["vibeHighlights"], (old) => {
        if (!old?.data) return old;
        const updateList = (list) =>
          (list || []).map((v) =>
            v._id === vibeId
              ? {
                  ...v,
                  commentsCount: Math.max((v.commentsCount || 0) + delta, 0),
                }
              : v
          );
        return {
          ...old,
          data: {
            ...old.data,
            official: updateList(old.data.official),
            achievements: updateList(old.data.achievements),
            stories: (old.data.stories || []).map((st) => ({
              ...st,
              vibes: updateList(st.vibes),
            })),
          },
        };
      });
    },
    [vibeId, queryClient]
  );

  // Add comment mutation with optimistic insertion
  const addCommentMutation = useApiMutation({
    mutationFn: async (payload) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.addComment(vibeId)}`,
        "POST"
      )(payload);
    },
    onMutate: async (newCommentPayload) => {
      await queryClient.cancelQueries({ queryKey });

      const prevComments = queryClient.getQueryData(queryKey);
      const isSchool = newCommentPayload.postAs === "school";

      const optimisticComment = {
        _id: `temp-${Date.now()}`,
        text: newCommentPayload.text,
        postAs: newCommentPayload.postAs,
        parentComment: replyingTo
          ? {
              _id: replyingTo.id,
              text: replyingTo.text,
              user: { name: replyingTo.name },
            }
          : null,
        likesCount: 0,
        isLiked: false,
        createdAt: new Date().toISOString(),
        user: {
          _id: user?.id || user?._id,
          name: isSchool ? "SGV School" : formatUserName(user?.name, "Me"),
          profilePhoto: isSchool ? null : user?.profilePhoto,
          role: user?.role,
        },
      };

      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        data: [...(old?.data || []), optimisticComment],
      }));

      adjustCommentsCount(1);

      return { prevComments };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevComments) {
        queryClient.setQueryData(queryKey, context.prevComments);
      }
      adjustCommentsCount(-1);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Toggle comment like mutation
  const likeCommentMutation = useApiMutation({
    mutationFn: async (commentId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.toggleCommentLike(
          commentId
        )}`,
        "POST"
      )({});
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });

      const prevComments = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((c) => {
            if (c._id === commentId) {
              const nextLiked = !c.isLiked;
              const delta = nextLiked ? 1 : -1;
              return {
                ...c,
                isLiked: nextLiked,
                likesCount: Math.max((c.likesCount || 0) + delta, 0),
              };
            }
            return c;
          }),
        };
      });

      return { prevComments };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevComments) {
        queryClient.setQueryData(queryKey, context.prevComments);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete comment mutation with optimistic removal
  const deleteCommentMutation = useApiMutation({
    mutationFn: async (commentId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.deleteComment(
          commentId
        )}`,
        "DELETE"
      )({});
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });

      const prevComments = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        data: (old?.data || []).filter((c) => c._id !== commentId),
      }));

      adjustCommentsCount(-1);

      return { prevComments };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevComments) {
        queryClient.setQueryData(queryKey, context.prevComments);
      }
      adjustCommentsCount(1);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleStartReply = useCallback((comment) => {
    const authorName =
      comment.postAs === "school"
        ? "SGV School"
        : formatUserName(comment.user?.name, "User");
    setReplyingTo({
      id: comment._id,
      name: authorName,
      text: comment.text,
    });
    setCommentText((prev) => (prev ? prev : `@${authorName} `));
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleToggleLikeComment = useCallback(
    (commentId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      likeCommentMutation.mutate(commentId);
    },
    [likeCommentMutation]
  );

  const handleSendComment = useCallback(async () => {
    if (!commentText.trim() || submitting) return;

    const payload = {
      text: commentText.trim(),
      postAs: isAdmin && postAsSchool ? "school" : "self",
      ...(replyingTo?.id ? { parentComment: replyingTo.id } : {}),
    };

    setCommentText("");
    setReplyingTo(null);
    setSubmitting(true);

    try {
      await addCommentMutation.mutateAsync(payload);
    } catch (err) {
      console.warn("Comment error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [commentText, submitting, addCommentMutation, isAdmin, postAsSchool, replyingTo]);

  const handleDeleteComment = useCallback(
    (comment) => {
      Alert.alert(
        "Delete Comment",
        "Are you sure you want to remove this comment?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteCommentMutation.mutate(comment._id),
          },
        ]
      );
    },
    [deleteCommentMutation]
  );

  const handleQuickEmoji = useCallback((emoji) => {
    setCommentText((prev) => `${prev}${emoji}`);
  }, []);

  const renderCommentItem = useCallback(
    ({ item }) => {
      const isSchool = item.postAs === "school";
      const isAuthor =
        user?.id === item.user?._id || user?._id === item.user?._id;
      const canDelete = isAdmin || isAuthor;
      const parentName = item.parentComment?.user?.name
        ? formatUserName(item.parentComment.user.name, "User")
        : null;

      return (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[
            styles.commentRow,
            item.parentComment && styles.nestedCommentRow,
          ]}
        >
          {/* Avatar */}
          {isSchool ? (
            <View
              style={[
                styles.commentAvatar,
                {
                  backgroundColor: "#FFF8E1",
                  borderColor: "#FFB300",
                  borderWidth: 1,
                  overflow: "hidden",
                },
              ]}
            >
              <Image
                source={require("../../assets/images/icon.png")}
                style={{ width: "100%", height: "100%", borderRadius: 16 }}
                contentFit="cover"
              />
            </View>
          ) : (
            <UserAvatar
              photoUrl={item.user?.profilePhoto}
              name={formatUserName(item.user?.name, "User")}
              role={item.user?.role}
              size={32}
            />
          )}

          {/* Comment Content */}
          <View style={styles.commentBody}>
            <View style={styles.commentHeaderRow}>
              <Text style={[styles.commentAuthor, { color: colors.onSurface }]}>
                {isSchool ? "SGV School" : formatUserName(item.user?.name, "User")}
              </Text>
              {isSchool && (
                <MaterialIcons name="verified" size={13} color="#FFB300" />
              )}
              <Text
                style={[styles.commentTime, { color: colors.onSurfaceVariant }]}
              >
                {formatTimeAgo(item.createdAt, { compact: true })}
              </Text>
            </View>

            {/* Replying context badge if threaded */}
            {parentName && (
              <View
                style={[
                  styles.replyBadge,
                  { backgroundColor: colors.surfaceContainerHighest },
                ]}
              >
                <MaterialIcons
                  name="reply"
                  size={12}
                  color={colors.primary}
                />
                <Text
                  style={[styles.replyBadgeText, { color: colors.onSurfaceVariant }]}
                >
                  Replying to @{parentName}
                </Text>
              </View>
            )}

            <Text style={[styles.commentText, { color: colors.onSurface }]}>
              {item.text}
            </Text>

            {/* Action Bar (Reply + Delete) */}
            <View style={styles.commentActionsRow}>
              <Pressable
                onPress={() => handleStartReply(item)}
                hitSlop={8}
                style={styles.replyButton}
              >
                <Text
                  style={[styles.replyButtonText, { color: colors.primary }]}
                >
                  Reply
                </Text>
              </Pressable>

              {canDelete && (
                <Pressable
                  onPress={() => handleDeleteComment(item)}
                  hitSlop={8}
                  style={styles.deleteButton}
                >
                  <Text
                    style={[
                      styles.replyButtonText,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Comment Like Heart */}
          <Pressable
            onPress={() => handleToggleLikeComment(item._id)}
            hitSlop={10}
            style={styles.likeCommentButton}
          >
            <MaterialIcons
              name={item.isLiked ? "favorite" : "favorite-border"}
              size={16}
              color={item.isLiked ? "#FF2D55" : colors.onSurfaceVariant}
            />
            {item.likesCount > 0 && (
              <Text
                style={[
                  styles.commentLikeCount,
                  {
                    color: item.isLiked ? "#FF2D55" : colors.onSurfaceVariant,
                  },
                ]}
              >
                {item.likesCount}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      );
    },
    [
      colors,
      user,
      isAdmin,
      handleDeleteComment,
      handleStartReply,
      handleToggleLikeComment,
    ]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.handleBar} />
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                Comments ({comments.length})
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <MaterialIcons
                  name="close"
                  size={22}
                  color={colors.onSurface}
                />
              </Pressable>
            </View>
          </View>

          {/* Comments List */}
          {isLoading && comments.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={48}
                color={colors.onSurfaceVariant}
              />
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                No comments yet
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Start the conversation!
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderCommentItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Replying banner indicator */}
          {replyingTo && (
            <View
              style={[
                styles.replyingBanner,
                { backgroundColor: colors.surfaceContainerHighest },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.replyingBannerText, { color: colors.onSurface }]}
              >
                Replying to <Text style={{ fontFamily: FONTS.bold }}>@{replyingTo.name}</Text>
              </Text>
              <Pressable onPress={handleCancelReply} hitSlop={8}>
                <MaterialIcons
                  name="close"
                  size={16}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>
          )}

          {/* Quick Emoji Reaction Bar */}
          <View
            style={[styles.emojiBar, { borderTopColor: colors.outlineVariant }]}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => handleQuickEmoji(emoji)}
                style={styles.emojiButton}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {/* Admin Identity Toggle for Comment */}
          {isAdmin && (
            <View
              style={[
                styles.adminCommentRow,
                { backgroundColor: colors.surfaceContainerHighest },
              ]}
            >
              <Text
                style={[
                  styles.adminCommentLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Comment as:
              </Text>
              <Pressable
                onPress={() => setPostAsSchool(false)}
                style={[
                  styles.adminTogglePill,
                  !postAsSchool && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.adminToggleText,
                    {
                      color: !postAsSchool ? "#fff" : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Me
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPostAsSchool(true)}
                style={[
                  styles.adminTogglePill,
                  postAsSchool && {
                    backgroundColor: "#FFB300",
                  },
                ]}
              >
                <MaterialIcons
                  name="school"
                  size={14}
                  color={postAsSchool ? "#000" : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.adminToggleText,
                    {
                      color: postAsSchool ? "#000" : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  SGV School
                </Text>
              </Pressable>
            </View>
          )}

          {/* Input Area */}
          <View
            style={[
              styles.inputRow,
              {
                borderTopColor: colors.outlineVariant,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <UserAvatar
              photoUrl={postAsSchool ? null : user?.profilePhoto}
              name={postAsSchool ? "School" : formatUserName(user?.name, "Me")}
              role={postAsSchool ? "school" : user?.role}
              size={34}
            />
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceContainerHighest,
                  color: colors.onSurface,
                },
              ]}
              placeholder={
                replyingTo
                  ? `Reply to @${replyingTo.name}...`
                  : "Add a comment for SGV..."
              }
              placeholderTextColor={colors.onSurfaceVariant}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={600}
            />
            <Pressable
              onPress={handleSendComment}
              disabled={!commentText.trim() || submitting}
              style={[
                styles.sendButton,
                {
                  backgroundColor: commentText.trim()
                    ? colors.primary
                    : colors.surfaceContainerHighest,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons
                  name="arrow-upward"
                  size={20}
                  color={commentText.trim() ? "#fff" : colors.onSurfaceVariant}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    maxHeight: "85%",
    minHeight: "50%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  nestedCommentRow: {
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(128,128,128,0.2)",
    paddingLeft: 8,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  commentBody: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  commentTime: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginLeft: 4,
  },
  replyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  replyBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  commentText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.base,
  },
  commentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  replyButton: {
    paddingVertical: 2,
  },
  replyButtonText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  deleteButton: {
    paddingVertical: 2,
  },
  likeCommentButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingLeft: 6,
  },
  commentLikeCount: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  replyingBannerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  emojiBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emojiButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emojiText: {
    fontSize: FONT_SIZES.xxl,
  },
  adminCommentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  adminCommentLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  adminTogglePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  adminToggleText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    maxHeight: 90,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
});
