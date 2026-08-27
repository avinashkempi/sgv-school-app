import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ToastProvider";
import {
  useApiInfiniteQuery,
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import useTabScrollToTop from "../../hooks/useTabScrollToTop";
import useDoubleBackToExit from "../../hooks/useDoubleBackToExit";
import useNetworkQuality from "../../hooks/useNetworkQuality";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { ROUTES } from "../../constants/routes";
import VibeCard from "../../components/vibes/VibeCard";
import VibeStoriesTray from "../../components/vibes/VibeStoriesTray";
import CreateVibeModal from "../../components/vibes/CreateVibeModal";
import VibeCommentsModal from "../../components/vibes/VibeCommentsModal";
import VibeLikesModal from "../../components/vibes/VibeLikesModal";
import SkeletonLoader from "../../components/SkeletonLoader";

const VIBES_PER_PAGE = 10;

const CATEGORIES = [
  { key: "all", label: "All", icon: "auto-awesome" },
  { key: "official", label: "Official", icon: "school" },
  { key: "achievement", label: "Achievements", icon: "emoji-events" },
  { key: "sports", label: "Sports", icon: "sports-soccer" },
  { key: "arts", label: "Arts & Events", icon: "palette" },
  { key: "life", label: "Campus Life", icon: "local-florist" },
];

export default function VibesScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { colors, styles: themeStyles } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { isConnected, isSlow } = useNetworkQuality();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super admin";
  const scrollRef = useRef(null);

  // Mobile standard gestures
  useTabScrollToTop(scrollRef, "/vibes");
  useTabScrollToTop(scrollRef, ROUTES.VIBES);
  useDoubleBackToExit(true);

  // Navigation / View Tabs: 'feed' | 'my-vibes' | 'saved'
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedCategory, setSelectedCategory] = useState(
    typeof searchParams?.category === "string" ? searchParams.category : "all"
  );
  const [selectedTag, setSelectedTag] = useState(
    typeof searchParams?.tag === "string" ? searchParams.tag : null
  );

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVibe, setEditingVibe] = useState(null);
  const [activeCommentVibe, setActiveCommentVibe] = useState(null);
  const [activeLikesVibeId, setActiveLikesVibeId] = useState(null);

  // Admin pending count query
  const { data: pendingData } = useApiQuery(
    ["pendingVibesCount"],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminPending}?limit=1`,
    {
      ...CACHE_TIERS.REAL_TIME,
      enabled: isAdmin,
    }
  );
  const pendingCount = pendingData?.pendingCount || 0;

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

  // ──── Main Feed Infinite Query ────
  const feedQueryKey = useMemo(
    () => ["vibes", selectedCategory, selectedTag],
    [selectedCategory, selectedTag]
  );

  const {
    data: feedData,
    isLoading: isFeedLoading,
    isFetchingNextPage: isFeedFetchingNext,
    hasNextPage: hasFeedNextPage,
    fetchNextPage: fetchFeedNextPage,
    refetch: refetchFeed,
    isRefetching: isFeedRefetching,
  } = useApiInfiniteQuery(
    feedQueryKey,
    (page) => {
      let url = `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.list}?page=${page}&limit=${VIBES_PER_PAGE}`;
      if (selectedCategory && selectedCategory !== "all") {
        url += `&category=${selectedCategory}`;
      }
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`;
      }
      return url;
    },
    {
      ...CACHE_TIERS.VIBES_FEED,
      enabled: activeTab === "feed",
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

  // ──── My Vibes Infinite Query ────
  const {
    data: myVibesData,
    isLoading: isMyVibesLoading,
    fetchNextPage: fetchMyVibesNext,
    hasNextPage: hasMyVibesNext,
    refetch: refetchMyVibes,
    isRefetching: isMyVibesRefetching,
  } = useApiInfiniteQuery(
    ["myVibes"],
    (page) =>
      `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.myVibes}?page=${page}&limit=${VIBES_PER_PAGE}`,
    {
      ...CACHE_TIERS.REAL_TIME,
      enabled: activeTab === "my-vibes" && isAuthenticated,
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

  // ──── Saved Vibes Infinite Query ────
  const {
    data: savedData,
    isLoading: isSavedLoading,
    fetchNextPage: fetchSavedNext,
    hasNextPage: hasSavedNext,
    refetch: refetchSaved,
    isRefetching: isSavedRefetching,
  } = useApiInfiniteQuery(
    ["savedVibes"],
    (page) =>
      `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.saved}?page=${page}&limit=${VIBES_PER_PAGE}`,
    {
      ...CACHE_TIERS.VIBES_FEED,
      enabled: activeTab === "saved" && isAuthenticated,
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

  const feedVibes = useMemo(
    () => feedData?.pages?.flatMap((p) => p?.data || []) || [],
    [feedData]
  );
  const myVibes = useMemo(
    () => myVibesData?.pages?.flatMap((p) => p?.data || []) || [],
    [myVibesData]
  );
  const savedVibes = useMemo(
    () => savedData?.pages?.flatMap((p) => p?.data || []) || [],
    [savedData]
  );

  // Helper to update vibe across infinite query pages
  const updateVibeInPages = useCallback((oldData, vibeId, updater) => {
    if (!oldData?.pages) return oldData;
    return {
      ...oldData,
      pages: oldData.pages.map((page) => ({
        ...page,
        data: (page.data || []).map((vibe) =>
          vibe._id === vibeId ? updater(vibe) : vibe
        ),
      })),
    };
  }, []);

  // ──── Optimistic Mutations ────
  const likeMutation = useApiMutation({
    mutationFn: async ({ vibeId }) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.toggleLike(vibeId)}`,
        "POST"
      )({});
    },
    onMutate: async ({ vibeId, nextLiked }) => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey });

      const prevFeed = queryClient.getQueryData(feedQueryKey);
      const prevMy = queryClient.getQueryData(["myVibes"]);
      const prevSaved = queryClient.getQueryData(["savedVibes"]);

      const updater = (vibe) => ({
        ...vibe,
        isLiked: nextLiked,
        likesCount: nextLiked
          ? Math.max(0, (Number(vibe.likesCount) || 0) + 1)
          : Math.max((Number(vibe.likesCount) || 1) - 1, 0),
      });

      queryClient.setQueryData(feedQueryKey, (old) =>
        updateVibeInPages(old, vibeId, updater)
      );
      queryClient.setQueryData(["myVibes"], (old) =>
        updateVibeInPages(old, vibeId, updater)
      );
      queryClient.setQueryData(["savedVibes"], (old) =>
        updateVibeInPages(old, vibeId, updater)
      );

      return { prevFeed, prevMy, prevSaved };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevFeed)
        queryClient.setQueryData(feedQueryKey, context.prevFeed);
      if (context?.prevMy)
        queryClient.setQueryData(["myVibes"], context.prevMy);
      if (context?.prevSaved)
        queryClient.setQueryData(["savedVibes"], context.prevSaved);
      showToast("Network error updating like", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
    },
  });

  const bookmarkMutation = useApiMutation({
    mutationFn: async ({ vibeId }) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.toggleBookmark(
          vibeId
        )}`,
        "POST"
      )({});
    },
    onMutate: async ({ vibeId, nextBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey });

      const prevFeed = queryClient.getQueryData(feedQueryKey);
      const prevMy = queryClient.getQueryData(["myVibes"]);
      const prevSaved = queryClient.getQueryData(["savedVibes"]);

      const updater = (vibe) => ({
        ...vibe,
        isBookmarked: nextBookmarked,
      });

      queryClient.setQueryData(feedQueryKey, (old) =>
        updateVibeInPages(old, vibeId, updater)
      );
      queryClient.setQueryData(["myVibes"], (old) =>
        updateVibeInPages(old, vibeId, updater)
      );
      queryClient.setQueryData(["savedVibes"], (old) =>
        updateVibeInPages(old, vibeId, updater)
      );

      return { prevFeed, prevMy, prevSaved };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevFeed)
        queryClient.setQueryData(feedQueryKey, context.prevFeed);
      if (context?.prevMy)
        queryClient.setQueryData(["myVibes"], context.prevMy);
      if (context?.prevSaved)
        queryClient.setQueryData(["savedVibes"], context.prevSaved);
      showToast("Network error updating saved status", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["savedVibes"] });
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.delete(vibeId)}`,
        "DELETE"
      )({});
    },
    onSuccess: () => {
      showToast("Vibe deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["myVibes"] });
      queryClient.invalidateQueries({ queryKey: ["savedVibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
    },
  });

  const pinMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminPin(vibeId)}`,
        "PATCH"
      )({});
    },
    onSuccess: (res) => {
      showToast(res.message || "Updated pin status", "success");
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
    },
  });

  const spotlightMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminSpotlight(
          vibeId
        )}`,
        "PATCH"
      )({});
    },
    onSuccess: (res) => {
      showToast(res.message || "Updated Home Spotlight", "success");
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
    },
  });

  // Action handlers with instant optimistic invocation
  const handleLike = useCallback(
    (vibeId, nextLiked) => {
      if (!isAuthenticated) {
        showToast("Please log in to like vibes", "info");
        return;
      }
      likeMutation.mutate({ vibeId, nextLiked });
    },
    [isAuthenticated, showToast, likeMutation]
  );

  const handleBookmark = useCallback(
    (vibeId, nextBookmarked) => {
      if (!isAuthenticated) {
        showToast("Please log in to save vibes", "info");
        return;
      }
      bookmarkMutation.mutate({ vibeId, nextBookmarked });
    },
    [isAuthenticated, showToast, bookmarkMutation]
  );

  const handleDelete = useCallback(
    (vibe) => {
      deleteMutation.mutate(vibe._id);
    },
    [deleteMutation]
  );

  const handleTogglePin = useCallback(
    (vibe) => {
      pinMutation.mutate(vibe._id);
    },
    [pinMutation]
  );

  const handleToggleSpotlight = useCallback(
    (vibe) => {
      spotlightMutation.mutate(vibe._id);
    },
    [spotlightMutation]
  );

  const handleEdit = useCallback((vibe) => {
    setEditingVibe(vibe);
    setShowCreateModal(true);
  }, []);

  const handleTagPress = useCallback((tag) => {
    setSelectedTag(tag.toLowerCase().replace("#", ""));
    setSelectedCategory("all");
    setActiveTab("feed");
  }, []);

  const onRefresh = useCallback(async () => {
    if (activeTab === "feed") await refetchFeed();
    else if (activeTab === "my-vibes") await refetchMyVibes();
    else if (activeTab === "saved") await refetchSaved();
  }, [activeTab, refetchFeed, refetchMyVibes, refetchSaved]);

  const renderFeedItem = useCallback(
    ({ item }) => (
      <VibeCard
        vibe={item}
        currentUserId={user?.id || user?._id}
        isAdmin={isAdmin}
        isVisible={visibleItemIds.has(item._id)}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onOpenComments={setActiveCommentVibe}
        onOpenLikes={setActiveLikesVibeId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onToggleSpotlight={handleToggleSpotlight}
        onTagPress={handleTagPress}
      />
    ),
    [
      user,
      isAdmin,
      visibleItemIds,
      handleLike,
      handleBookmark,
      handleEdit,
      handleDelete,
      handleTogglePin,
      handleToggleSpotlight,
      handleTagPress,
    ]
  );

  const renderMyVibeItem = useCallback(
    ({ item }) => {
      const statusMeta =
        item.status === "approved"
          ? {
              label: "Approved & Live",
              bg: "#ECFDF5",
              text: "#059669",
              icon: "check-circle",
            }
          : item.status === "rejected"
          ? {
              label: "Not Approved",
              bg: "#FEF2F2",
              text: "#DC2626",
              icon: "cancel",
            }
          : {
              label: "Pending Review",
              bg: "#FFFBEB",
              text: "#D97706",
              icon: "schedule",
            };

      return (
        <View
          style={[
            styles.myVibeCardWrapper,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
            },
          ]}
        >
          {/* Status Header */}
          <View style={styles.myVibeStatusRow}>
            <View
              style={[
                styles.myVibeStatusBadge,
                { backgroundColor: statusMeta.bg },
              ]}
            >
              <MaterialIcons
                name={statusMeta.icon}
                size={14}
                color={statusMeta.text}
              />
              <Text
                style={[styles.myVibeStatusText, { color: statusMeta.text }]}
              >
                {statusMeta.label}
              </Text>
            </View>
            <Text
              style={[styles.myVibeDate, { color: colors.onSurfaceVariant }]}
            >
              {new Date(item.createdAt).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>

          {/* Rejection Note */}
          {item.status === "rejected" && item.rejectionReason && (
            <View style={[styles.rejectionBox, { backgroundColor: "#FEF2F2" }]}>
              <Text style={styles.rejectionTitle}>Admin Feedback:</Text>
              <Text style={styles.rejectionReason}>{item.rejectionReason}</Text>
            </View>
          )}

          {/* Vibe Render */}
          <VibeCard
            vibe={item}
            currentUserId={user?.id || user?._id}
            isAdmin={isAdmin}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onOpenComments={setActiveCommentVibe}
            onOpenLikes={setActiveLikesVibeId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            onToggleSpotlight={handleToggleSpotlight}
            onTagPress={handleTagPress}
          />
        </View>
      );
    },
    [
      colors,
      user,
      isAdmin,
      handleLike,
      handleBookmark,
      handleEdit,
      handleDelete,
      handleTogglePin,
      handleToggleSpotlight,
      handleTagPress,
    ]
  );

  const currentList =
    activeTab === "feed"
      ? feedVibes
      : activeTab === "my-vibes"
      ? myVibes
      : savedVibes;

  const currentLoading =
    activeTab === "feed"
      ? isFeedLoading
      : activeTab === "my-vibes"
      ? isMyVibesLoading
      : isSavedLoading;

  const isRefreshing =
    activeTab === "feed"
      ? isFeedRefetching
      : activeTab === "my-vibes"
      ? isMyVibesRefetching
      : isSavedRefetching;

  // Header Component for Feed FlatList: Stories Tray + Category Filter Pills
  const renderListHeader = useCallback(() => {
    if (activeTab !== "feed") return null;

    return (
      <View style={styles.feedHeaderContainer}>
        {/* Top Stories Tray */}
        <VibeStoriesTray
          hideHeader={true}
          onOpenCreate={() => {
            if (!isAuthenticated) {
              showToast("Please log in to post Vibes", "info");
              return;
            }
            setEditingVibe(null);
            setShowCreateModal(true);
          }}
        />

        {/* Active Tag Filter Indicator */}
        {selectedTag && (
          <View
            style={[
              styles.activeTagBanner,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <View style={styles.activeTagBadge}>
              <MaterialIcons
                name="tag"
                size={14}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={[
                  styles.activeTagText,
                  { color: colors.onPrimaryContainer },
                ]}
              >
                {selectedTag}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedTag(null)}
              hitSlop={8}
              style={styles.clearTagBtn}
            >
              <MaterialIcons
                name="close"
                size={14}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={[
                  styles.clearTagText,
                  { color: colors.onPrimaryContainer },
                ]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
        )}

        {/* Horizontal Category Filter Pills (Material 3 Filter Chips) */}
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.key && !selectedTag;
              return (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light
                    ).catch(() => {});
                    setSelectedCategory(item.key);
                    setSelectedTag(null);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryContainer
                        : colors.surfaceContainerLow,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.outlineVariant || "transparent",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={14}
                    color={
                      isSelected
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant,
                        fontFamily: isSelected
                          ? FONTS.bold
                          : FONTS.medium,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    );
  }, [
    activeTab,
    selectedTag,
    selectedCategory,
    colors,
    isAuthenticated,
    showToast,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ──── Offline / Slow Network Hint Banner ──── */}
      {!isConnected ? (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="cloud-off" size={14} color="#fff" />
          <Text style={styles.offlineBannerText}>
            You're offline. Browsing cached vibes.
          </Text>
        </View>
      ) : isSlow ? (
        <View style={[styles.offlineBanner, { backgroundColor: "#1E293B" }]}>
          <MaterialIcons name="speed" size={14} color="#38BDF8" />
          <Text style={[styles.offlineBannerText, { color: "#E0F2FE" }]}>
            Slow connection • Low-data mode active
          </Text>
        </View>
      ) : null}

      {/* ──── Top App Bar (Material 3 Clean Header) ──── */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.titleWrapper}>
            <Text style={[styles.brandTitle, { color: colors.onSurface }]}>
              Vibes
            </Text>
            <View style={styles.sparkleBadge}>
              <MaterialIcons name="auto-awesome" size={16} color="#F59E0B" />
            </View>
          </View>
        </View>

        <View style={styles.topActions}>
          {/* Admin Approvals Shortcut with Pending Badge */}
          {isAdmin && (
            <Pressable
              onPress={() => router.push("/admin/vibe-approvals")}
              style={[
                styles.actionIconBtn,
                { backgroundColor: colors.surfaceContainerHighest },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Admin Vibe Approvals"
            >
              <MaterialIcons
                name="admin-panel-settings"
                size={20}
                color={colors.primary}
              />
              {pendingCount > 0 && (
                <View style={styles.pendingBadgeCircle}>
                  <Text style={styles.pendingBadgeText}>
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Quick Post Action in Top Bar */}
          <Pressable
            onPress={() => {
              if (!isAuthenticated) {
                showToast("Please log in to post Vibes", "info");
                return;
              }
              setEditingVibe(null);
              setShowCreateModal(true);
            }}
            style={[
              styles.createButton,
              { backgroundColor: colors.primaryContainer },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create Vibe Post"
          >
            <MaterialIcons
              name="add"
              size={18}
              color={colors.onPrimaryContainer}
            />
            <Text
              style={[
                styles.createButtonText,
                { color: colors.onPrimaryContainer },
              ]}
            >
              Post
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ──── Material 3 Segmented Button: Feed / My Posts / Saved ──── */}
      <View style={[styles.segmentWrapper, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.segmentContainer,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => {}
              );
              setActiveTab("feed");
              setSelectedTag(null);
            }}
            style={[
              styles.segmentItem,
              activeTab === "feed" && [
                styles.segmentItemActive,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadow || "#000",
                },
              ],
            ]}
          >
            <MaterialIcons
              name="dynamic-feed"
              size={15}
              color={
                activeTab === "feed" ? colors.primary : colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "feed"
                      ? colors.primary
                      : colors.onSurfaceVariant,
                  fontFamily:
                    activeTab === "feed" ? FONTS.bold : FONTS.medium,
                },
              ]}
            >
              Feed
            </Text>
          </Pressable>

          {isAuthenticated && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                  () => {}
                );
                setActiveTab("my-vibes");
              }}
              style={[
                styles.segmentItem,
                activeTab === "my-vibes" && [
                  styles.segmentItemActive,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadow || "#000",
                  },
                ],
              ]}
            >
              <MaterialIcons
                name="person-outline"
                size={15}
                color={
                  activeTab === "my-vibes"
                    ? colors.primary
                    : colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === "my-vibes"
                        ? colors.primary
                        : colors.onSurfaceVariant,
                    fontFamily:
                      activeTab === "my-vibes"
                        ? FONTS.bold
                        : FONTS.medium,
                  },
                ]}
              >
                My Posts
              </Text>
            </Pressable>
          )}

          {isAuthenticated && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                  () => {}
                );
                setActiveTab("saved");
              }}
              style={[
                styles.segmentItem,
                activeTab === "saved" && [
                  styles.segmentItemActive,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadow || "#000",
                  },
                ],
              ]}
            >
              <MaterialIcons
                name="bookmark-border"
                size={15}
                color={
                  activeTab === "saved"
                    ? colors.primary
                    : colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === "saved"
                        ? colors.primary
                        : colors.onSurfaceVariant,
                    fontFamily:
                      activeTab === "saved" ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                Saved
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ──── Vibes Content Feed ──── */}
      {currentLoading && currentList.length === 0 ? (
        <View style={styles.skeletonContainer}>
          {[1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonCard,
                { backgroundColor: colors.surfaceContainer },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  padding: 14,
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <SkeletonLoader width={40} height={40} borderRadius={20} />
                <View style={{ gap: 4, flex: 1 }}>
                  <SkeletonLoader width={130} height={14} borderRadius={7} />
                  <SkeletonLoader width={80} height={10} borderRadius={5} />
                </View>
              </View>
              <SkeletonLoader width="100%" height={260} borderRadius={0} />
              <View style={{ padding: 14, gap: 8 }}>
                <SkeletonLoader width="35%" height={16} borderRadius={8} />
                <SkeletonLoader width="85%" height={14} borderRadius={7} />
              </View>
            </View>
          ))}
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            <MaterialIcons
              name={
                activeTab === "feed"
                  ? "auto-awesome"
                  : activeTab === "my-vibes"
                  ? "photo-camera"
                  : "bookmark-border"
              }
              size={36}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            {activeTab === "feed"
              ? "No Vibes Yet"
              : activeTab === "my-vibes"
              ? "No Posts Yet"
              : "No Saved Vibes"}
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}
          >
            {activeTab === "feed"
              ? "Be the first to share a campus moment, achievement, or story!"
              : activeTab === "my-vibes"
              ? "Your submitted vibes and approval status will appear here."
              : "Tap the bookmark icon on any post in the feed to save it."}
          </Text>
          <Pressable
            onPress={() => {
              if (activeTab === "feed" || activeTab === "my-vibes") {
                if (!isAuthenticated) {
                  showToast("Please log in to post Vibes", "info");
                  return;
                }
                setEditingVibe(null);
                setShowCreateModal(true);
              } else {
                onRefresh();
              }
            }}
            style={[
              styles.emptyActionButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.emptyActionText}>
              {activeTab === "feed" || activeTab === "my-vibes"
                ? "Create Vibe"
                : "Explore Feed"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          data={currentList}
          ListHeaderComponent={renderListHeader}
          renderItem={
            activeTab === "my-vibes" ? renderMyVibeItem : renderFeedItem
          }
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          scrollsToTop={true}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            themeStyles.contentPaddingBottom,
            styles.listContent,
          ]}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          updateCellsBatchingPeriod={40}
          refreshControl={
            <AppRefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
            />
          }
          onEndReached={() => {
            if (
              activeTab === "feed" &&
              hasFeedNextPage &&
              !isFeedFetchingNext
            ) {
              fetchFeedNextPage();
            } else if (activeTab === "my-vibes" && hasMyVibesNext) {
              fetchMyVibesNext();
            } else if (activeTab === "saved" && hasSavedNext) {
              fetchSavedNext();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFeedFetchingNext ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[
                    styles.loadingMoreText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Loading more vibes...
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* ──── Material 3 Extended Floating Action Button (FAB) ──── */}
      {isAuthenticated && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {}
            );
            setEditingVibe(null);
            setShowCreateModal(true);
          }}
          style={[
            styles.extendedFab,
            {
              backgroundColor: colors.primaryContainer,
              shadowColor: colors.shadow || "#000",
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Post New Vibe"
        >
          <MaterialIcons
            name="add"
            size={22}
            color={colors.onPrimaryContainer}
          />
          <Text
            style={[
              styles.extendedFabText,
              { color: colors.onPrimaryContainer },
            ]}
          >
            Post Vibe
          </Text>
        </Pressable>
      )}

      {/* ──── Create / Edit Modal ──── */}
      <CreateVibeModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingVibe(null);
        }}
        editVibe={editingVibe}
      />

      {/* ──── Comments Bottom Sheet Modal ──── */}
      <VibeCommentsModal
        visible={!!activeCommentVibe}
        onClose={() => setActiveCommentVibe(null)}
        vibe={activeCommentVibe}
      />

      {/* ──── Likes Modal ──── */}
      <VibeLikesModal
        visible={!!activeLikesVibeId}
        onClose={() => setActiveLikesVibeId(null)}
        vibeId={activeLikesVibeId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: "#374151",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    gap: 6,
  },
  offlineBannerText: {
    color: "#F3F4F6",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandTitle: {
    fontSize: FONT_SIZES.title,
    fontFamily: FONTS.bold,
    letterSpacing: -0.6,
  },
  sparkleBadge: {
    marginTop: -2,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  pendingBadgeCircle: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  pendingBadgeText: {
    color: "#fff",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 18,
  },
  createButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 3,
    borderRadius: 18,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 15,
  },
  segmentItemActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: FONT_SIZES.sm,
  },
  feedHeaderContainer: {
    paddingBottom: 4,
  },
  categoriesContainer: {
    paddingVertical: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
  },
  activeTagBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activeTagText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  clearTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  clearTagText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 80,
  },
  skeletonContainer: {
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  emptyActionButton: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionText: {
    color: "#fff",
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
  },
  myVibeCardWrapper: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  myVibeStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  myVibeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  myVibeStatusText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  myVibeDate: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  rejectionBox: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
  },
  rejectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: "#DC2626",
  },
  rejectionReason: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: "#333",
    marginTop: 2,
  },
  extendedFab: {
    position: "absolute",
    bottom: 24,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  extendedFabText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
});


