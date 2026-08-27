import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 24;

const REJECT_REASONS = [
  "Does not meet school community guidelines",
  "Blurry or low-quality photo",
  "Duplicate or redundant submission",
  "Inappropriate or unverified content",
  "Incorrect category selected",
];

const APPROVAL_FILTERS = [
  { key: "all", label: "All Pending" },
  { key: "student", label: "Students" },
  { key: "teacher", label: "Teachers" },
  { key: "sports", label: "Sports" },
  { key: "achievement", label: "Achievements" },
];

export default function VibeApprovalsScreen() {
  const router = useRouter();
  const { colors, styles: themeStyles } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [rejectingVibe, setRejectingVibe] = useState(null);
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

  const queryKey = ["pendingVibes"];

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
      `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminPending}?page=${page}&limit=20`,
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

  const allPendingVibes = useMemo(
    () => data?.pages?.flatMap((p) => p?.data || []) || [],
    [data?.pages]
  );
  const totalPending = data?.pages?.[0]?.pendingCount ?? allPendingVibes.length;

  // Filter pending vibes by role or category
  const filteredPendingVibes = useMemo(() => {
    if (activeFilter === "all") return allPendingVibes;
    if (activeFilter === "student") {
      return allPendingVibes.filter(
        (v) => v.author?.role === "student" || v.authorRole === "student"
      );
    }
    if (activeFilter === "teacher") {
      return allPendingVibes.filter(
        (v) =>
          v.author?.role === "teacher" ||
          v.author?.role === "staff" ||
          v.authorRole === "teacher"
      );
    }
    return allPendingVibes.filter((v) => v.category === activeFilter);
  }, [allPendingVibes, activeFilter]);

  // Single review mutation
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
            pendingCount: Math.max((page.pendingCount || 1) - 1, 0),
          })),
        };
      });

      return { prevData };
    },
    onSuccess: (res) => {
      showToast(res.message || "Updated vibe", "success");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["pendingVibesCount"] });
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
      setRejectingVibe(null);
      setCustomReason("");
    },
    onError: (err, _vars, context) => {
      if (context?.prevData) {
        queryClient.setQueryData(queryKey, context.prevData);
      }
      showToast(err.message || "Failed to review vibe", "error");
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
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["pendingVibesCount"] });
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
    },
    onError: (err) => {
      showToast(err.message || "Failed batch review", "error");
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
    if (selectedIds.size === filteredPendingVibes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPendingVibes.map((v) => v._id)));
    }
  }, [selectedIds, filteredPendingVibes]);

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

  const renderItem = useCallback(
    ({ item }) => {
      const isProcessing = processingId === item._id;
      const isSelected = selectedIds.has(item._id);

      return (
        <View
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
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.onSurface }]}>
                {formatUserName(item.author?.name, "Community Member")}
              </Text>
              <Text
                style={[styles.authorRole, { color: colors.onSurfaceVariant }]}
              >
                {formatUserDesignationOrRole(item.author)}
                {item.author?.phone ? ` • ${item.author.phone}` : ""}
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
              Submitted on{" "}
              {new Date(item.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
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
                <>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.approveBtnText}>Approve & Publish</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [colors, processingId, selectedIds, toggleSelect, handleApprove, visibleItemIds]
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
              Vibes Approvals
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Moderate community submissions
            </Text>
          </View>
          {totalPending > 0 && (
            <View
              style={[
                styles.pendingPill,
                { backgroundColor: colors.errorContainer },
              ]}
            >
              <Text
                style={[
                  styles.pendingPillText,
                  { color: colors.onErrorContainer },
                ]}
              >
                {totalPending} Pending
              </Text>
            </View>
          )}
        </View>

        {/* Filter Chips Bar */}
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

          {filteredPendingVibes.length > 0 && (
            <Pressable
              onPress={handleSelectAll}
              style={[
                styles.selectAllBtn,
                { backgroundColor: colors.surfaceContainerHighest },
              ]}
            >
              <MaterialIcons
                name={
                  selectedIds.size === filteredPendingVibes.length &&
                  filteredPendingVibes.length > 0
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.selectAllBtnText, { color: colors.primary }]}
              >
                {selectedIds.size === filteredPendingVibes.length &&
                filteredPendingVibes.length > 0
                  ? "Deselect"
                  : "Select All"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Content */}
        {isLoading && filteredPendingVibes.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.onSurfaceVariant }]}
            >
              Loading pending vibes...
            </Text>
          </View>
        ) : filteredPendingVibes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="check-circle-outline"
              size={64}
              color="#2E7D32"
            />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              All Caught Up!
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}
            >
              No pending vibes matching this filter awaiting approval.
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
            data={filteredPendingVibes}
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

        {/* ──── Floating Batch Action Bar ──── */}
        {selectedIds.size > 0 && (
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

        {/* ──── Reject Feedback Modal (Single & Batch) ──── */}
        {rejectingVibe && (
          <Modal visible={!!rejectingVibe} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View
                style={[styles.modalCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, { color: colors.onSurface }]}
                  >
                    {isBatchReject
                      ? `Reject ${selectedIds.size} Submissions`
                      : "Reject Vibe Submission"}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setRejectingVibe(null);
                      setIsBatchReject(false);
                    }}
                    hitSlop={10}
                  >
                    <MaterialIcons
                      name="close"
                      size={22}
                      color={colors.onSurface}
                    />
                  </Pressable>
                </View>

                <Text
                  style={[styles.modalHint, { color: colors.onSurfaceVariant }]}
                >
                  Select a reason or write custom feedback. Authors will be
                  notified.
                </Text>

                {/* Reasons Radio / Pills */}
                <View style={styles.reasonsContainer}>
                  {REJECT_REASONS.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => {
                        setSelectedReason(r);
                        setCustomReason("");
                      }}
                      style={[
                        styles.reasonOption,
                        {
                          backgroundColor:
                            selectedReason === r && !customReason
                              ? colors.primaryContainer
                              : colors.surfaceContainerHighest,
                          borderColor:
                            selectedReason === r && !customReason
                              ? colors.primary
                              : "transparent",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          selectedReason === r && !customReason
                            ? "radio-button-checked"
                            : "radio-button-unchecked"
                        }
                        size={18}
                        color={
                          selectedReason === r && !customReason
                            ? colors.primary
                            : colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.reasonOptionText,
                          {
                            color:
                              selectedReason === r && !customReason
                                ? colors.onPrimaryContainer
                                : colors.onSurface,
                            fontFamily:
                              selectedReason === r && !customReason
                                ? FONTS.bold
                                : FONTS.regular,
                          },
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Custom Note */}
                <TextInput
                  placeholder="Or write custom feedback reason..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={customReason}
                  onChangeText={setCustomReason}
                  style={[
                    styles.customReasonInput,
                    {
                      backgroundColor: colors.surfaceContainerHighest,
                      color: colors.onSurface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                />

                {/* Modal Buttons */}
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => {
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
                    onPress={handleConfirmReject}
                    style={[
                      styles.modalRejectBtn,
                      { backgroundColor: colors.error },
                    ]}
                  >
                    <Text style={styles.modalRejectText}>
                      Confirm Rejection
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
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
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  pendingPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingPillText: {
    fontSize: FONT_SIZES.xs,
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
    fontSize: FONT_SIZES.base,
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
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 18,
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
    fontSize: FONT_SIZES.md,
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
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  authorRole: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  captionBox: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  captionText: {
    fontSize: FONT_SIZES.base,
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
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  approveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  approveBtnText: {
    color: "#fff",
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
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
    fontSize: FONT_SIZES.md,
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
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  modalHint: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    marginBottom: 16,
  },
  reasonsContainer: {
    gap: 8,
    marginBottom: 14,
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
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  customReasonInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: FONT_SIZES.base,
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
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
});
