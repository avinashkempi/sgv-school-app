import React, { useState, useCallback } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../theme";
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

const QUICK_EMOJIS = ["❤️", "🔥", "👏", "🎓", "🎉", "🌟", "🙌"];

export default function VibeCommentsModal({ visible, onClose, vibe }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  const [commentText, setCommentText] = useState("");
  const [postAsSchool, setPostAsSchool] = useState(isAdmin);
  const [submitting, setSubmitting] = useState(false);

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

  // Helper to adjust comments count across feed
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
      queryClient.setQueryData(["myVibes"], updateVibes);
      queryClient.setQueryData(["savedVibes"], updateVibes);
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
        createdAt: new Date().toISOString(),
        user: {
          _id: user?.id || user?._id,
          name: isSchool ? "SGV School" : user?.name || "Me",
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
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["myVibes"] });
      queryClient.invalidateQueries({ queryKey: ["savedVibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
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
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["myVibes"] });
      queryClient.invalidateQueries({ queryKey: ["savedVibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
    },
  });

  const handleSendComment = useCallback(async () => {
    if (!commentText.trim() || submitting) return;

    const payload = {
      text: commentText.trim(),
      postAs: isAdmin && postAsSchool ? "school" : "self",
    };

    setCommentText("");
    setSubmitting(true);

    try {
      await addCommentMutation.mutateAsync(payload);
    } catch (err) {
      console.warn("Comment error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [commentText, submitting, addCommentMutation, isAdmin, postAsSchool]);

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
      return (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.commentRow}
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
              <MaterialIcons name="school" size={16} color="#F57F17" />
            </View>
          ) : (
            <UserAvatar
              photoUrl={item.user?.profilePhoto}
              name={item.user?.name || "User"}
              role={item.user?.role}
              size={32}
            />
          )}

          {/* Comment Content */}
          <View style={styles.commentBody}>
            <View style={styles.commentHeaderRow}>
              <Text style={[styles.commentAuthor, { color: colors.onSurface }]}>
                {isSchool ? "SGV School" : item.user?.name || "User"}
              </Text>
              {isSchool && (
                <MaterialIcons name="verified" size={12} color="#FFB300" />
              )}
              <Text
                style={[styles.commentTime, { color: colors.onSurfaceVariant }]}
              >
                {formatTimeAgo(item.createdAt, { compact: true })}
              </Text>
            </View>

            <Text style={[styles.commentText, { color: colors.onSurface }]}>
              {item.text}
            </Text>
          </View>

          {/* Delete option */}
          {canDelete && (
            <Pressable
              onPress={() => handleDeleteComment(item)}
              hitSlop={10}
              style={styles.deleteButton}
            >
              <MaterialIcons
                name="delete-outline"
                size={18}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          )}
        </Animated.View>
      );
    },
    [colors, user, isAdmin, handleDeleteComment]
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
                onPress={() => setPostAsSchool(!postAsSchool)}
                style={[
                  styles.adminTogglePill,
                  {
                    backgroundColor: postAsSchool ? "#FFF8E1" : colors.surface,
                  },
                ]}
              >
                <MaterialIcons
                  name={postAsSchool ? "school" : "person"}
                  size={14}
                  color={postAsSchool ? "#F57F17" : colors.primary}
                />
                <Text
                  style={[
                    styles.adminToggleText,
                    { color: postAsSchool ? "#E65100" : colors.onSurface },
                  ]}
                >
                  {postAsSchool ? "SGV School" : "Myself"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Input Bar */}
          <View
            style={[styles.inputRow, { borderTopColor: colors.outlineVariant }]}
          >
            <TextInput
              placeholder={user ? "Add a comment..." : "Log in to comment"}
              placeholderTextColor={colors.onSurfaceVariant}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={600}
              editable={!!user && !submitting}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceContainerHighest,
                  color: colors.onSurface,
                },
              ]}
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
                  opacity: commentText.trim() ? 1 : 0.6,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons
                  name="send"
                  size={18}
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    minHeight: "55%",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "DMSans-Bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "DMSans-Bold",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "DMSans-Regular",
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: "DMSans-Bold",
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
    fontSize: 13,
    fontFamily: "DMSans-Bold",
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "DMSans-Regular",
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    fontFamily: "DMSans-Regular",
    lineHeight: 19,
  },
  deleteButton: {
    padding: 4,
  },
  emojiBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emojiButton: {
    padding: 6,
  },
  emojiText: {
    fontSize: 20,
  },
  adminCommentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  adminCommentLabel: {
    fontSize: 11,
    fontFamily: "DMSans-Medium",
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
    fontSize: 11,
    fontFamily: "DMSans-Bold",
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    fontFamily: "DMSans-Regular",
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
