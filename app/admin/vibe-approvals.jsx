import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useToast } from "../../components/ToastProvider";
import {
  useApiInfiniteQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import VibeImageCarousel from "../../components/vibes/VibeImageCarousel";
import RoleGuard from "../../components/RoleGuard";
import UserAvatar from "../../components/ui/UserAvatar";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../../utils/userFormatters";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 24;

const REJECT_REASONS = [
  "Does not meet school community guidelines",
  "Blurry or low-quality photo",
  "Duplicate or redundant submission",
  "Inappropriate or unverified content",
  "Incorrect category selected",
];

const APPROVAL_FILTERS = [
  { key: "all", label: "All" },
  { key: "student", label: "Students" },
  { key: "teacher", label: "Teachers" },
  { key: "sports", label: "Sports" },
  { key: "achievement", label: "Achievements" },
];

export default function VibeApprovalsScreen() {
  const router = useRouter();
  const { colors, isDark, styles: themeStyles } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Status Tab: 'pending' | 'rejected' | 'approved'
  const [statusTab, setStatusTab] = useState("pending");

  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [rejectingVibe, setRejectingVibe] = useState(null); // { vibe, isEditing?: boolean }
  const [isBatchReject, setIsBatchReject] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Viewport visibility tracking for high-performance video autoplay
  const [visibleItemIds, setVisibleItemIds] = useState(new Set());

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const ids = new Set(
      viewableItems.map((vi) => vi.item?._id).filter(Boolean)
    );
    setVisibleItemIds(ids);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const queryKey = ["adminVibes", statusTab];

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useApiInfiniteQuery(
    queryKey,
    (page) =>
      `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminModeration(statusTab)}&page=${page}&limit=20`,
    {
      ...CACHE_TIERS.REAL_TIME,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage?.pagination?.hasMore) {
          const pageNum = Number(lastPage?.pagination?.page);
          if (!isNaN(pageNum) && pageNum > 0) return pageNum + 1;
          return (Array.isArray(allPages) ? allPages.length : 1) + 1;
        }
        return undefined;
      },
      initialPageParam: 1,
    }
  );

  const allVibes = useMemo(
    () => data?.pages?.flatMap((p) => p?.data || []) || [],
    [data?.pages]
  );

  const counts = data?.pages?.[0]?.counts || {};
  const pendingCount = data?.pages?.[0]?.pendingCount ?? counts.pending ?? 0;
  const rejectedCount = data?.pages?.[0]?.rejectedCount ?? counts.rejected ?? 0;
  const approvedCount = data?.pages?.[0]?.approvedCount ?? counts.approved ?? 0;

  // Filter vibes by role or category
  const filteredVibes = useMemo(() => {
    if (activeFilter === "all") return allVibes;
    if (activeFilter === "student") {
      return allVibes.filter(
        (v) => v.author?.role === "student" || v.authorRole === "student"
      );
    }
    if (activeFilter === "teacher") {
      return allVibes.filter(
        (v) =>
          v.author?.role === "teacher" ||
          v.author?.role === "staff" ||
          v.authorRole === "teacher"
      );
    }
    return allVibes.filter((v) => v.category === activeFilter);
  }, [allVibes, activeFilter]);

  // Helper to invalidate all relevant query caches
  const invalidateAllCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["adminVibes"] });
    queryClient.invalidateQueries({ queryKey: ["pendingVibes"] });
    queryClient.invalidateQueries({ queryKey: ["pendingVibesCount"] });
    queryClient.invalidateQueries({ queryKey: ["vibes"] });
    queryClient.invalidateQueries({ queryKey: ["myVibes"] });
    queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
    queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
  }, [queryClient]);

  // Single review mutation (approve, reject, or pending)
  const reviewMutation = useApiMutation({
    mutationFn: async ({ vibeId, action, reason }) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminReview(vibeId)}`,
        "PATCH"
      )({ action, reason });
    },
    onMutate: async ({ vibeId }) => {
      await queryClient.cancelQueries({ queryKey });
      const prevData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: (page.data || []).filter((v) => v._id !== vibeId),
            ...(statusTab === "pending"
              ? { pendingCount: Math.max((page.pendingCount || 1) - 1, 0) }
              : statusTab === "rejected"
              ? { rejectedCount: Math.max((page.rejectedCount || 1) - 1, 0) }
              : { approvedCount: Math.max((page.approvedCount || 1) - 1, 0) }),
          })),
        };
      });

      return { prevData };
    },
    onSuccess: (res) => {
      showToast(res.message || "Updated vibe", "success");
      invalidateAllCaches();
      setRejectingVibe(null);
      setCustomReason("");
    },
    onError: (err, _vars, context) => {
      if (context?.prevData) {
        queryClient.setQueryData(queryKey, context.prevData);
      }
      showToast(err.message || "Failed to update vibe", "error");
    },
  });

  // Batch review mutation
  const batchReviewMutation = useApiMutation({
    mutationFn: async ({ vibeIds, action, reason }) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminBatchReview}`,
        "POST"
      )({ vibeIds, action, reason });
    },
    onSuccess: (res) => {
      showToast(res.message || "Batch update complete", "success");
      setSelectedIds(new Set());
      setRejectingVibe(null);
      setIsBatchReject(false);
      setCustomReason("");
      invalidateAllCaches();
    },
    onError: (err) => {
      showToast(err.message || "Failed batch review", "error");
    },
  });

  // Delete vibe mutation
  const deleteMutation = useApiMutation({
    mutationFn: async ({ vibeId }) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.delete(vibeId)}`,
        "DELETE"
      )({});
    },
    onSuccess: () => {
      showToast("Vibe deleted successfully", "success");
      invalidateAllCaches();
    },
    onError: (err) => {
      showToast(err.message || "Failed to delete vibe", "error");
    },
  });

  const toggleSelect = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (selectedIds.size === filteredVibes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVibes.map((v) => v._id)));
    }
  }, [selectedIds, filteredVibes]);

  const handleApprove = useCallback(
    async (vibe) => {
      setProcessingId(vibe._id);
      try {
        await reviewMutation.mutateAsync({
          vibeId: vibe._id,
          action: "approve",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [reviewMutation]
  );

  const handleRestoreToPending = useCallback(
    async (vibe) => {
      setProcessingId(vibe._id);
      try {
        await reviewMutation.mutateAsync({
          vibeId: vibe._id,
          action: "pending",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [reviewMutation]
  );

  const handleDelete = useCallback(
    (vibe) => {
      Alert.alert(
        "Delete Vibe",
        "Are you sure you want to permanently delete this submission? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setProcessingId(vibe._id);
              try {
                await deleteMutation.mutateAsync({ vibeId: vibe._id });
              } finally {
                setProcessingId(null);
              }
            },
          },
        ]
      );
    },
    [deleteMutation]
  );

  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    await batchReviewMutation.mutateAsync({
      vibeIds: Array.from(selectedIds),
      action: "approve",
    });
  }, [selectedIds, batchReviewMutation]);

  const handleBatchRejectPrompt = useCallback(() => {
    if (selectedIds.size === 0) return;
    setIsBatchReject(true);
    setRejectingVibe({ _id: "batch" });
  }, [selectedIds]);

  const handleConfirmReject = useCallback(async () => {
    const finalReason = customReason.trim() || selectedReason;

    if (isBatchReject) {
      await batchReviewMutation.mutateAsync({
        vibeIds: Array.from(selectedIds),
        action: "reject",
        reason: finalReason,
      });
      return;
    }

    if (!rejectingVibe) return;

    setProcessingId(rejectingVibe._id);
    try {
      await reviewMutation.mutateAsync({
        vibeId: rejectingVibe._id,
        action: "reject",
        reason: finalReason,
      });
    } finally {
      setProcessingId(null);
    }
  }, [
    isBatchReject,
    selectedIds,
    rejectingVibe,
    customReason,
    selectedReason,
    batchReviewMutation,
    reviewMutation,
  ]);

  const handleTabChange = useCallback((newTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStatusTab(newTab);
    setSelectedIds(new Set());
  }, []);

  // Format date safely
  const formatDateTime = useCallback((dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(dateStr);
    }
  }, []);

  // ──── Render Item for Pending Tab ────
  const renderPendingItem = useCallback(
    (item) => {
      const isProcessing = processingId === item._id;
      const isSelected = selectedIds.has(item._id);

      return (
        <View
          key={item._id}
          style={[
            styles.reviewCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: isSelected ? colors.primary : colors.outlineVariant,
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          {/* Author Header */}
          <View style={styles.authorHeader}>
            <Pressable
              onPress={() => toggleSelect(item._id)}
              hitSlop={8}
              style={styles.checkboxTouch}
            >
              <MaterialIcons
                name={isSelected ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={isSelected ? colors.primary : colors.onSurfaceVariant}
              />
            </Pressable>

            <UserAvatar
              photoUrl={item.author?.profilePhoto}
              name={formatUserName(item.author?.name, "Community Member")}
              role={item.author?.role}
              size={36}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.authorName, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {formatUserName(item.author?.name, "Community Member")}
              </Text>
              <Text
                style={[styles.authorRole, { color: colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {formatUserDesignationOrRole(item.author)}
                {item.author?.phone ? ` • ${item.author.phone}` : ""}
              </Text>
            </View>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.surfaceContainerHighest, flexShrink: 0 },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {item.category}
              </Text>
            </View>
          </View>

          {/* Media Preview bounded within card */}
          {item.images && item.images.length > 0 && (
            <VibeImageCarousel
              images={item.images}
              width={CARD_WIDTH}
              isVisible={visibleItemIds.has(item._id)}
            />
          )}

          {/* Caption */}
          {item.caption ? (
            <View style={styles.captionBox}>
              <Text style={[styles.captionText, { color: colors.onSurface }]}>
                {item.caption}
              </Text>
            </View>
          ) : null}

          {/* Location if present */}
          {item.location ? (
            <View style={styles.locationRow}>
              <MaterialIcons
                name="place"
                size={13}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={[styles.locationText, { color: colors.onSurfaceVariant }]}
              >
                {item.location}
              </Text>
            </View>
          ) : null}

          {/* Submitted timestamp */}
          <View style={styles.timeRow}>
            <MaterialIcons
              name="schedule"
              size={13}
              color={colors.onSurfaceVariant}
            />
            <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
              Submitted on {formatDateTime(item.createdAt)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View
            style={[
              styles.actionRow,
              { borderTopColor: colors.outlineVariant },
            ]}
          >
            <Pressable
              onPress={() => {
                setIsBatchReject(false);
                setSelectedReason(REJECT_REASONS[0]);
                setCustomReason("");
                setRejectingVibe(item);
              }}
              disabled={isProcessing}
              style={[styles.rejectBtn, { borderColor: colors.error }]}
            >
              <MaterialIcons name="close" size={18} color={colors.error} />
              <Text style={[styles.rejectBtnText, { color: colors.error }]}>
                Reject
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleApprove(item)}
              disabled={isProcessing}
              style={[styles.approveBtn, { backgroundColor: "#2E7D32" }]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.btnContentRow}>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text
                    style={styles.approveBtnText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Approve & Publish
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [
      colors,
      processingId,
      selectedIds,
      toggleSelect,
      handleApprove,
      visibleItemIds,
      formatDateTime,
    ]
  );

  // ──── Render Item for Rejected Tab ────
  const renderRejectedItem = useCallback(
    (item) => {
      const isProcessing = processingId === item._id;

      return (
        <View
          key={item._id}
          style={[
            styles.reviewCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: isDark ? "rgba(220, 38, 38, 0.4)" : "#FECACA",
              borderWidth: 1.5,
            },
          ]}
        >
          {/* Header Row: Author & Status Pill */}
          <View style={styles.authorHeader}>
            <UserAvatar
              photoUrl={item.author?.profilePhoto}
              name={formatUserName(item.author?.name, "Community Member")}
              role={item.author?.role}
              size={36}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.authorName, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {formatUserName(item.author?.name, "Community Member")}
              </Text>
              <Text
                style={[styles.authorRole, { color: colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {formatUserDesignationOrRole(item.author)}
                {item.author?.phone ? ` • ${item.author.phone}` : ""}
              </Text>
            </View>

            {/* Status & Category Badges */}
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(220, 38, 38, 0.2)"
                      : "#FEE2E2",
                  },
                ]}
              >
                <MaterialIcons name="cancel" size={12} color="#DC2626" />
                <Text style={[styles.statusBadgeText, { color: "#DC2626" }]}>
                  Rejected
                </Text>
              </View>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: colors.surfaceContainerHighest },
                ]}
              >
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {item.category}
                </Text>
              </View>
            </View>
          </View>

          {/* ──── Prominent Rejection Audit Box ──── */}
          <View
            style={[
              styles.rejectedAuditBox,
              {
                backgroundColor: isDark
                  ? "rgba(220, 38, 38, 0.12)"
                  : "#FEF2F2",
                borderColor: isDark ? "rgba(220, 38, 38, 0.3)" : "#FCA5A5",
              },
            ]}
          >
            <View style={styles.rejectedAuditHeader}>
              <MaterialIcons name="error-outline" size={16} color="#DC2626" />
              <Text style={styles.rejectedAuditTitle}>Rejection Feedback</Text>
            </View>

            <Text
              style={[
                styles.rejectedReasonText,
                { color: colors.onSurface },
              ]}
            >
              {item.rejectionReason ||
                "Does not meet school community guidelines"}
            </Text>

            {/* Moderator Audit Info */}
            <View
              style={[
                styles.auditModeratorRow,
                { borderTopColor: isDark ? "rgba(220,38,38,0.2)" : "#FECACA" },
              ]}
            >
              <MaterialIcons
                name="shield"
                size={13}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.auditModeratorText,
                  { color: colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                Reviewed by{" "}
                <Text style={{ fontFamily: FONTS.bold }}>
                  {item.reviewedBy?.name || "Admin"}
                </Text>
                {item.reviewedAt
                  ? ` • ${formatDateTime(item.reviewedAt)}`
                  : item.updatedAt
                  ? ` • ${formatDateTime(item.updatedAt)}`
                  : ""}
              </Text>
            </View>
          </View>

          {/* Media Preview bounded within card */}
          {item.images && item.images.length > 0 && (
            <VibeImageCarousel
              images={item.images}
              width={CARD_WIDTH}
              isVisible={visibleItemIds.has(item._id)}
            />
          )}

          {/* Caption */}
          {item.caption ? (
            <View style={styles.captionBox}>
              <Text style={[styles.captionText, { color: colors.onSurface }]}>
                {item.caption}
              </Text>
            </View>
          ) : null}

          {/* Submitted timestamp */}
          <View style={styles.timeRow}>
            <MaterialIcons
              name="schedule"
              size={13}
              color={colors.onSurfaceVariant}
            />
            <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
              Submitted on {formatDateTime(item.createdAt)}
            </Text>
          </View>

          {/* ──── Rejected Item Actions: Spacious 2-tier layout ──── */}
          <View
            style={[
              styles.rejectedActionsContainer,
              { borderTopColor: colors.outlineVariant },
            ]}
          >
            {/* Primary Action: Re-Approve and Publish Live */}
            <Pressable
              onPress={() => handleApprove(item)}
              disabled={isProcessing}
              style={[styles.fullApproveBtn, { backgroundColor: "#2E7D32" }]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.btnContentRow}>
                  <MaterialIcons name="check-circle" size={18} color="#fff" />
                  <Text style={styles.fullApproveBtnText}>
                    Approve & Publish Live
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Secondary Actions Row: Feedback, Restore, Delete */}
            <View style={styles.rejectedSecondaryRow}>
              {/* Edit Feedback */}
              <Pressable
                onPress={() => {
                  setIsBatchReject(false);
                  setSelectedReason(
                    REJECT_REASONS.includes(item.rejectionReason)
                      ? item.rejectionReason
                      : REJECT_REASONS[0]
                  );
                  setCustomReason(
                    REJECT_REASONS.includes(item.rejectionReason)
                      ? ""
                      : item.rejectionReason || ""
                  );
                  setRejectingVibe({ ...item, isEditing: true });
                }}
                disabled={isProcessing}
                style={[
                  styles.rejectedSecondaryBtn,
                  { borderColor: colors.outlineVariant },
                ]}
              >
                <MaterialIcons
                  name="edit"
                  size={15}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.rejectedSecondaryText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Edit Feedback
                </Text>
              </Pressable>

              {/* Restore to Queue */}
              <Pressable
                onPress={() => handleRestoreToPending(item)}
                disabled={isProcessing}
                style={[
                  styles.rejectedSecondaryBtn,
                  { borderColor: colors.outlineVariant },
                ]}
              >
                <MaterialIcons
                  name="replay"
                  size={15}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.rejectedSecondaryText,
                    { color: colors.primary },
                  ]}
                >
                  Restore Queue
                </Text>
              </Pressable>

              {/* Delete permanently */}
              <Pressable
                onPress={() => handleDelete(item)}
                disabled={isProcessing}
                style={[
                  styles.deleteIconBtn,
                  { borderColor: isDark ? "rgba(220,38,38,0.4)" : "#FECACA" },
                ]}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color={colors.error}
                />
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [
      colors,
      isDark,
      processingId,
      visibleItemIds,
      formatDateTime,
      handleApprove,
      handleRestoreToPending,
      handleDelete,
    ]
  );

  // ──── Render Item for Approved Tab ────
  const renderApprovedItem = useCallback(
    (item) => {
      const isProcessing = processingId === item._id;

      return (
        <View
          key={item._id}
          style={[
            styles.reviewCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: isDark ? "rgba(5, 150, 105, 0.4)" : "#A7F3D0",
              borderWidth: 1.5,
            },
          ]}
        >
          {/* Header Row: Author & Status Pill */}
          <View style={styles.authorHeader}>
            <UserAvatar
              photoUrl={item.author?.profilePhoto}
              name={formatUserName(item.author?.name, "Community Member")}
              role={item.author?.role}
              size={36}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.authorName, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {formatUserName(item.author?.name, "Community Member")}
              </Text>
              <Text
                style={[styles.authorRole, { color: colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {formatUserDesignationOrRole(item.author)}
                {item.author?.phone ? ` • ${item.author.phone}` : ""}
              </Text>
            </View>

            {/* Status & Category Badges */}
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(5, 150, 105, 0.2)"
                      : "#D1FAE5",
                  },
                ]}
              >
                <MaterialIcons name="check-circle" size={12} color="#059669" />
                <Text style={[styles.statusBadgeText, { color: "#059669" }]}>
                  Live
                </Text>
              </View>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: colors.surfaceContainerHighest },
                ]}
              >
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {item.category}
                </Text>
              </View>
            </View>
          </View>

          {/* Media Preview bounded within card */}
          {item.images && item.images.length > 0 && (
            <VibeImageCarousel
              images={item.images}
              width={CARD_WIDTH}
              isVisible={visibleItemIds.has(item._id)}
            />
          )}

          {/* Caption */}
          {item.caption ? (
            <View style={styles.captionBox}>
              <Text style={[styles.captionText, { color: colors.onSurface }]}>
                {item.caption}
              </Text>
            </View>
          ) : null}

          {/* Audit Row: Approved By */}
          <View style={styles.timeRow}>
            <MaterialIcons
              name="verified"
              size={13}
              color={colors.onSurfaceVariant}
            />
            <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
              Approved by {item.reviewedBy?.name || "Admin"}
              {item.reviewedAt ? ` on ${formatDateTime(item.reviewedAt)}` : ""}
            </Text>
          </View>

          {/* Action Row */}
          <View
            style={[
              styles.actionRow,
              { borderTopColor: colors.outlineVariant },
            ]}
          >
            <Pressable
              onPress={() => {
                setIsBatchReject(false);
                setSelectedReason(REJECT_REASONS[0]);
                setCustomReason("");
                setRejectingVibe(item);
              }}
              disabled={isProcessing}
              style={[styles.rejectBtn, { borderColor: colors.error }]}
            >
              <MaterialIcons name="close" size={18} color={colors.error} />
              <Text style={[styles.rejectBtnText, { color: colors.error }]}>
                Reject / Take Down
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleDelete(item)}
              disabled={isProcessing}
              style={[
                styles.deleteIconBtn,
                { borderColor: colors.error, paddingHorizontal: 16 },
              ]}
            >
              <MaterialIcons
                name="delete-outline"
                size={18}
                color={colors.error}
              />
            </Pressable>
          </View>
        </View>
      );
    },
    [
      colors,
      isDark,
      processingId,
      visibleItemIds,
      formatDateTime,
      handleDelete,
    ]
  );

  const renderItem = useCallback(
    ({ item }) => {
      if (statusTab === "rejected") return renderRejectedItem(item);
      if (statusTab === "approved") return renderApprovedItem(item);
      return renderPendingItem(item);
    },
    [statusTab, renderRejectedItem, renderApprovedItem, renderPendingItem]
  );

  return (
    <RoleGuard allowedRoles={["admin", "super admin"]}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: colors.outlineVariant }]}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.onSurface}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
              Vibes Moderation Hub
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Track, approve, & manage community posts
            </Text>
          </View>
        </View>

        {/* ──── Top Segment Control: Pending | Rejected | Approved ──── */}
        <View
          style={[
            styles.segmentWrapper,
            {
              backgroundColor: colors.surfaceContainer,
              borderBottomColor: colors.outlineVariant,
            },
          ]}
        >
          <View
            style={[
              styles.segmentContainer,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            {/* Pending Tab */}
            <Pressable
              onPress={() => handleTabChange("pending")}
              style={[
                styles.segmentItem,
                statusTab === "pending" && [
                  styles.segmentItemActive,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadow || "#000",
                  },
                ],
              ]}
            >
              <MaterialIcons
                name="schedule"
                size={15}
                color={
                  statusTab === "pending"
                    ? colors.primary
                    : colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      statusTab === "pending"
                        ? colors.primary
                        : colors.onSurfaceVariant,
                    fontFamily:
                      statusTab === "pending" ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                Pending
              </Text>
              {pendingCount > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(217, 119, 6, 0.25)"
                        : "#FEF3C7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: isDark ? "#FBBF24" : "#D97706" },
                    ]}
                  >
                    {pendingCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Rejected Tab */}
            <Pressable
              onPress={() => handleTabChange("rejected")}
              style={[
                styles.segmentItem,
                statusTab === "rejected" && [
                  styles.segmentItemActive,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadow || "#000",
                  },
                ],
              ]}
            >
              <MaterialIcons
                name="cancel"
                size={15}
                color={
                  statusTab === "rejected" ? "#DC2626" : colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      statusTab === "rejected"
                        ? "#DC2626"
                        : colors.onSurfaceVariant,
                    fontFamily:
                      statusTab === "rejected" ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                Rejected
              </Text>
              {rejectedCount > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(220, 38, 38, 0.25)"
                        : "#FEE2E2",
                    },
                  ]}
                >
                  <Text style={[styles.tabBadgeText, { color: "#DC2626" }]}>
                    {rejectedCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Approved Tab */}
            <Pressable
              onPress={() => handleTabChange("approved")}
              style={[
                styles.segmentItem,
                statusTab === "approved" && [
                  styles.segmentItemActive,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadow || "#000",
                  },
                ],
              ]}
            >
              <MaterialIcons
                name="check-circle"
                size={15}
                color={
                  statusTab === "approved" ? "#059669" : colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      statusTab === "approved"
                        ? "#059669"
                        : colors.onSurfaceVariant,
                    fontFamily:
                      statusTab === "approved" ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                Approved
              </Text>
              {approvedCount > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(5, 150, 105, 0.25)"
                        : "#D1FAE5",
                    },
                  ]}
                >
                  <Text style={[styles.tabBadgeText, { color: "#059669" }]}>
                    {approvedCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ──── Filter Chips Bar ──── */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={APPROVAL_FILTERS}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            renderItem={({ item }) => {
              const isSelected = activeFilter === item.key;
              return (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light
                    ).catch(() => {});
                    setActiveFilter(item.key);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryContainer
                        : colors.surfaceContainerHigh,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.outlineVariant || "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant,
                        fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />

          {statusTab === "pending" && filteredVibes.length > 0 && (
            <Pressable
              onPress={handleSelectAll}
              style={[
                styles.selectAllBtn,
                { backgroundColor: colors.surfaceContainerHighest },
              ]}
            >
              <MaterialIcons
                name={
                  selectedIds.size === filteredVibes.length &&
                  filteredVibes.length > 0
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.selectAllBtnText, { color: colors.primary }]}
              >
                {selectedIds.size === filteredVibes.length &&
                filteredVibes.length > 0
                  ? "Deselect"
                  : "Select All"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ──── Main Content ──── */}
        {isLoading && filteredVibes.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.onSurfaceVariant }]}
            >
              Loading {statusTab} vibes...
            </Text>
          </View>
        ) : filteredVibes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name={
                statusTab === "pending"
                  ? "check-circle-outline"
                  : statusTab === "rejected"
                  ? "assignment-turned-in"
                  : "verified"
              }
              size={64}
              color={
                statusTab === "pending"
                  ? "#2E7D32"
                  : statusTab === "rejected"
                  ? colors.primary
                  : "#059669"
              }
            />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              {statusTab === "pending"
                ? "All Caught Up!"
                : statusTab === "rejected"
                ? "No Rejected Vibes"
                : "No Approved Vibes"}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}
            >
              {statusTab === "pending"
                ? "No pending vibes matching this filter awaiting approval."
                : statusTab === "rejected"
                ? "None of the community submissions are currently marked as rejected. Whenever a submission is rejected, you will be able to track and manage it here."
                : "Approved community posts will appear here for historical moderation."}
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={[styles.refreshBtn, { borderColor: colors.outline }]}
            >
              <MaterialIcons name="refresh" size={18} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
                Refresh
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredVibes}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              themeStyles.contentPaddingBottom,
              styles.listContent,
            ]}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={[colors.primary]}
              />
            }
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}

        {/* ──── Floating Batch Action Bar (for Pending tab) ──── */}
        {statusTab === "pending" && selectedIds.size > 0 && (
          <View
            style={[
              styles.batchActionBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.batchCountText, { color: colors.onSurface }]}>
              {selectedIds.size} selected
            </Text>
            <View style={styles.batchBtnRow}>
              <Pressable
                onPress={handleBatchRejectPrompt}
                style={[styles.batchRejectBtn, { borderColor: colors.error }]}
              >
                <MaterialIcons name="close" size={16} color={colors.error} />
                <Text
                  style={[styles.batchRejectBtnText, { color: colors.error }]}
                >
                  Reject
                </Text>
              </Pressable>
              <Pressable
                onPress={handleBatchApprove}
                style={[styles.batchApproveBtn, { backgroundColor: "#2E7D32" }]}
              >
                <MaterialIcons name="check" size={16} color="#fff" />
                <Text style={styles.batchApproveBtnText}>
                  Approve ({selectedIds.size})
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ──── Reject / Feedback Modal with KeyboardAvoidingView ──── */}
        {rejectingVibe && (
          <Modal
            visible={!!rejectingVibe}
            transparent
            animationType="slide"
            onRequestClose={() => {
              Keyboard.dismiss();
              setRejectingVibe(null);
              setIsBatchReject(false);
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <Pressable
                style={styles.modalBackdropTouch}
                onPress={() => {
                  Keyboard.dismiss();
                  setRejectingVibe(null);
                  setIsBatchReject(false);
                }}
              />
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    maxHeight: SCREEN_HEIGHT * 0.88,
                  },
                ]}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[styles.modalTitle, { color: colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {rejectingVibe?.isEditing
                        ? "Edit Rejection Feedback"
                        : isBatchReject
                        ? `Reject ${selectedIds.size} Submissions`
                        : "Reject Vibe Submission"}
                    </Text>
                    <Text
                      style={[
                        styles.modalHint,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {rejectingVibe?.isEditing
                        ? "Update the feedback reason sent to the author."
                        : "Select a reason or write custom feedback."}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setRejectingVibe(null);
                      setIsBatchReject(false);
                    }}
                    hitSlop={10}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialIcons
                      name="close"
                      size={22}
                      color={colors.onSurface}
                    />
                  </Pressable>
                </View>

                {/* Scrollable Modal Content */}
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.modalScrollContent}
                  bounces={false}
                >
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Standard Guidelines
                  </Text>

                  {/* Reasons Radio / Pills */}
                  <View style={styles.reasonsContainer}>
                    {REJECT_REASONS.map((r) => {
                      const isSelected = selectedReason === r && !customReason;
                      return (
                        <Pressable
                          key={r}
                          onPress={() => {
                            setSelectedReason(r);
                            setCustomReason("");
                          }}
                          style={[
                            styles.reasonOption,
                            {
                              backgroundColor: isSelected
                                ? colors.primaryContainer
                                : colors.surfaceContainerHighest,
                              borderColor: isSelected
                                ? colors.primary
                                : "transparent",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              isSelected
                                ? "radio-button-checked"
                                : "radio-button-unchecked"
                            }
                            size={18}
                            color={
                              isSelected
                                ? colors.primary
                                : colors.onSurfaceVariant
                            }
                          />
                          <Text
                            style={[
                              styles.reasonOptionText,
                              {
                                color: isSelected
                                  ? colors.onPrimaryContainer
                                  : colors.onSurface,
                                fontFamily: isSelected
                                  ? FONTS.bold
                                  : FONTS.regular,
                              },
                            ]}
                          >
                            {r}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.onSurfaceVariant, marginTop: 12 },
                    ]}
                  >
                    Custom Feedback (Optional)
                  </Text>

                  {/* Custom Note TextInput */}
                  <TextInput
                    placeholder="Type custom feedback reason for the author..."
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[
                      styles.customReasonInput,
                      {
                        backgroundColor: colors.surfaceContainerHighest,
                        color: colors.onSurface,
                        borderColor: customReason.trim()
                          ? colors.primary
                          : colors.outlineVariant,
                      },
                    ]}
                  />
                </ScrollView>

                {/* Fixed Footer with Cancel & Submit Buttons */}
                <View
                  style={[
                    styles.modalActions,
                    { borderTopColor: colors.outlineVariant },
                  ]}
                >
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setRejectingVibe(null);
                      setIsBatchReject(false);
                    }}
                    style={[
                      styles.modalCancelBtn,
                      { borderColor: colors.outline },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalCancelText,
                        { color: colors.onSurface },
                      ]}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      handleConfirmReject();
                    }}
                    style={[
                      styles.modalRejectBtn,
                      {
                        backgroundColor: rejectingVibe?.isEditing
                          ? colors.primary
                          : colors.error,
                      },
                    ]}
                  >
                    <Text style={styles.modalRejectText}>
                      {rejectingVibe?.isEditing
                        ? "Save Feedback"
                        : "Confirm Rejection"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 6,
  },
  segmentItemActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  segmentText: {
    fontSize: FONT_SIZES.sm,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: FONT_SIZES.xs - 2,
    fontFamily: FONTS.bold,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectAllBtnText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 20,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  refreshBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  reviewCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  authorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  checkboxTouch: {
    padding: 2,
  },
  authorName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  authorRole: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.xs - 1,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: FONT_SIZES.xs - 1,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  rejectedAuditBox: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  rejectedAuditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rejectedAuditTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: "#DC2626",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rejectedReasonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    lineHeight: 20,
  },
  auditModeratorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  auditModeratorText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  captionBox: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  captionText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingTop: 2,
  },
  locationText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  rejectBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  approveBtn: {
    flex: 1.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    minWidth: 0,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexShrink: 1,
  },
  approveBtnText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    flexShrink: 1,
  },
  rejectedActionsContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fullApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  fullApproveBtnText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  rejectedSecondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rejectedSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  rejectedSecondaryText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  deleteIconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  batchActionBar: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  batchCountText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  batchBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  batchRejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  batchRejectBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  batchApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  batchApproveBtnText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  modalCloseBtn: {
    padding: 4,
    marginTop: -2,
  },
  modalTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  modalHint: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasonsContainer: {
    gap: 8,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  reasonOptionText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  customReasonInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    minHeight: 80,
    maxHeight: 120,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  modalRejectBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalRejectText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});
