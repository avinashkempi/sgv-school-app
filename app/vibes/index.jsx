import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ToastProvider";
import {
  useApiInfiniteQuery,
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import { useNotifications } from "../../hooks/useNotifications";
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

const DEFAULT_FEED_CATEGORIES = [
  { key: "all", label: "All", icon: "auto-awesome" },
  { key: "general", label: "General", icon: "bubble-chart" },
  { key: "official", label: "Official", icon: "school" },
  { key: "achievement", label: "Achievements", icon: "emoji-events" },
  { key: "sports", label: "Sports", icon: "sports-soccer" },
  { key: "arts", label: "Arts & Events", icon: "palette" },
  { key: "life", label: "Campus Life", icon: "local-florist" },
];

export default function VibesScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { colors, styles: themeStyles, mode } = useTheme();
  const isDark = mode === "dark";
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
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

  const getParam = useCallback((val) => {
    if (Array.isArray(val)) return val[0];
    if (typeof val === "string") return val;
    return null;
  }, []);

  const rawTargetVibeId = getParam(searchParams?.vibeId) || getParam(searchParams?.id);
  const targetVibeId = rawTargetVibeId ? String(rawTargetVibeId) : null;

  const [selectedCategory, setSelectedCategory] = useState(
    getParam(searchParams?.category) || "all"
  );
  const [selectedTag, setSelectedTag] = useState(
    getParam(searchParams?.tag)
  );

  // In-Feed Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Sync searchParams category and tag on navigation / deep-linking
  useEffect(() => {
    const cat = getParam(searchParams?.category);
    const tag = getParam(searchParams?.tag);
    if (cat) {
      setSelectedCategory(cat);
    }
    if (tag !== undefined) {
      setSelectedTag(tag);
    }
  }, [searchParams?.category, searchParams?.tag, getParam]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVibe, setEditingVibe] = useState(null);
  const [activeCommentVibe, setActiveCommentVibe] = useState(null);
  const [activeLikesVibeId, setActiveLikesVibeId] = useState(null);

  // Target Vibe Query (from deep link, spotlight, or notification)
  const { data: targetVibeData } = useApiQuery(
    ["targetVibe", targetVibeId],
    targetVibeId && apiConfig.endpoints.vibes?.getById
      ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.getById(targetVibeId)}`
      : null,
    {
      ...CACHE_TIERS.REAL_TIME,
      enabled: !!targetVibeId,
      select: (data) => data?.data || null,
    }
  );

  useEffect(() => {
    if (targetVibeId && scrollRef.current) {
      const timer = setTimeout(() => {
        try {
          scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch (_) {}
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [targetVibeId, targetVibeData]);

  const openCommentsParam = getParam(searchParams?.openComments);
  useEffect(() => {
    if (openCommentsParam === "true" && targetVibeData) {
      setActiveCommentVibe(targetVibeData);
    }
  }, [openCommentsParam, targetVibeData]);

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

  // Dynamic Categories Query
  const { data: serverCategoriesData } = useApiQuery(
    ["vibeCategories"],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.categories}`,
    {
      ...CACHE_TIERS.VIBES_FEED,
      staleTime: 1000 * 60 * 30,
    }
  );

  const feedCategories = useMemo(() => {
    if (
      Array.isArray(serverCategoriesData?.data) &&
      serverCategoriesData.data.length > 0
    ) {
      return [
        { key: "all", label: "All", icon: "auto-awesome" },
        ...serverCategoriesData.data,
      ];
    }
    return DEFAULT_FEED_CATEGORIES;
  }, [serverCategoriesData]);

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
    () => ["vibes", selectedCategory, selectedTag, debouncedSearch],
    [selectedCategory, selectedTag, debouncedSearch]
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
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
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

  const rawFeedVibes = useMemo(
    () => feedData?.pages?.flatMap((p) => p?.data || []) || [],
    [feedData]
  );

  const feedVibes = useMemo(() => {
    if (!targetVibeData || !targetVibeData._id) return rawFeedVibes;
    const filtered = rawFeedVibes.filter(
      (v) => String(v._id) !== String(targetVibeData._id)
    );
    return [targetVibeData, ...filtered];
  }, [rawFeedVibes, targetVibeData]);

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
    onSuccess: (_res, vibeId) => {
      showToast("Vibe deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["myVibes"] });
      queryClient.invalidateQueries({ queryKey: ["savedVibes"] });
      queryClient.invalidateQueries({ queryKey: ["userVibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
      queryClient.invalidateQueries({ queryKey: ["pendingVibes"] });
      queryClient.invalidateQueries({ queryKey: ["pendingVibesCount"] });
      if (vibeId) {
        queryClient.invalidateQueries({ queryKey: ["targetVibe", String(vibeId)] });
      }
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

  const handleCategorySelect = useCallback((categoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedCategory(categoryKey);
    setSelectedTag(null);
    try {
      scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (_) {}
  }, []);

  const handleResetFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedCategory("all");
    setSelectedTag(null);
    setSearchQuery("");
    setDebouncedSearch("");
    setShowSearchBar(false);
    try {
      scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (_) {}
  }, []);

  const handleTagPress = useCallback((tag) => {
    const cleanTag = tag.toLowerCase().replace("#", "");
    setSelectedTag(cleanTag);
    setSelectedCategory("all");
    setActiveTab("feed");
    try {
      scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (_) {}
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
              bg: isDark ? "rgba(5, 150, 105, 0.18)" : "#ECFDF5",
              text: isDark ? "#34D399" : "#059669",
              icon: "check-circle",
            }
          : item.status === "rejected"
          ? {
              label: "Not Approved",
              bg: isDark ? "rgba(220, 38, 38, 0.18)" : "#FEF2F2",
              text: isDark ? "#F87171" : "#DC2626",
              icon: "cancel",
            }
          : {
              label: "Pending Review",
              bg: isDark ? "rgba(217, 119, 6, 0.18)" : "#FFFBEB",
              text: isDark ? "#FBBF24" : "#D97706",
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
                size={13}
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
            <View
              style={[
                styles.rejectionBox,
                {
                  backgroundColor: isDark
                    ? "rgba(220,38,38,0.12)"
                    : "#FEF2F2",
                },
              ]}
            >
              <Text style={styles.rejectionTitle}>Admin Feedback:</Text>
              <Text
                style={[
                  styles.rejectionReason,
                  { color: colors.onSurfaceVariant },
                ]}
                numberOfLines={3}
              >
                {item.rejectionReason}
              </Text>
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
      isDark,
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

  // Selected category metadata for empty state & chips
  const currentCategoryObj = useMemo(() => {
    return (
      feedCategories.find((c) => c.key === selectedCategory) || {
        key: selectedCategory,
        label: selectedCategory,
        icon: "auto-awesome",
      }
    );
  }, [feedCategories, selectedCategory]);

  // Header Component for Feed FlatList: Stories Tray + Category Filter Pills
  // KEPT ALWAYS MOUNTED so filters and stories NEVER vanish when switching or empty!
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

        {/* Active Search Filter Indicator */}
        {debouncedSearch ? (
          <View
            style={[
              styles.activeFilterBanner,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <View style={styles.activeFilterBadge}>
              <MaterialIcons
                name="search"
                size={15}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={[
                  styles.activeFilterText,
                  { color: colors.onPrimaryContainer },
                ]}
                numberOfLines={1}
              >
                Search: "{debouncedSearch}"
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSearchQuery("");
                setDebouncedSearch("");
              }}
              hitSlop={8}
              style={styles.clearFilterBtn}
            >
              <MaterialIcons
                name="close"
                size={15}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={[
                  styles.clearFilterText,
                  { color: colors.onPrimaryContainer },
                ]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Active Tag Filter Indicator */}
        {selectedTag && (
          <View
            style={[
              styles.activeFilterBanner,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <View style={styles.activeFilterBadge}>
              <MaterialIcons
                name="tag"
                size={15}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={[
                  styles.activeFilterText,
                  { color: colors.onPrimaryContainer },
                ]}
                numberOfLines={1}
              >
                #{selectedTag}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedTag(null)}
              hitSlop={8}
              style={styles.clearFilterBtn}
            >
              <MaterialIcons
                name="close"
                size={15}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={[
                  styles.clearFilterText,
                  { color: colors.onPrimaryContainer },
                ]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
        )}

        {/* Horizontal Category Filter Pills (Material 3 Minimalist Chips) */}
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={feedCategories}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.key && !selectedTag;
              return (
                <Pressable
                  onPress={() => handleCategorySelect(item.key)}
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
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${item.label}`}
                >
                  <MaterialIcons
                    name={item.icon || "auto-awesome"}
                    size={15}
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
    feedCategories,
    selectedCategory,
    selectedTag,
    debouncedSearch,
    colors,
    handleCategorySelect,
    isAuthenticated,
    showToast,
  ]);

  // Contextual Empty State / Inline Loading component for ListEmptyComponent
  const renderEmptyComponent = useCallback(() => {
    // 1. If currently loading initial page for this view, show inline skeleton cards
    // without unmounting the header or chips!
    if (currentLoading) {
      return (
        <View style={styles.skeletonContainer}>
          {[1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonCard,
                { backgroundColor: colors.surfaceContainer },
              ]}
            >
              <View style={styles.skeletonHeader}>
                <SkeletonLoader width={38} height={38} borderRadius={19} />
                <View style={{ gap: 4, flex: 1 }}>
                  <SkeletonLoader width={130} height={14} borderRadius={7} />
                  <SkeletonLoader width={85} height={10} borderRadius={5} />
                </View>
              </View>
              <SkeletonLoader width="100%" height={240} borderRadius={0} />
              <View style={styles.skeletonBody}>
                <SkeletonLoader width="35%" height={16} borderRadius={8} />
                <SkeletonLoader width="85%" height={14} borderRadius={7} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    // 2. Empty State for Feed tab
    if (activeTab === "feed") {
      const isFiltered =
        selectedCategory !== "all" || !!selectedTag || !!debouncedSearch;

      let emptyIcon = "auto-awesome";
      let emptyTitle = "No Vibes Yet";
      let emptySubtitle =
        "Be the first to share a campus moment, achievement, or story!";

      if (debouncedSearch) {
        emptyIcon = "search-off";
        emptyTitle = `No Results for "${debouncedSearch}"`;
        emptySubtitle =
          "Try searching for different keywords, captions, or campus tags.";
      } else if (selectedTag) {
        emptyIcon = "tag";
        emptyTitle = `No Vibes Tagged #${selectedTag}`;
        emptySubtitle =
          "No campus posts found with this hashtag. Explore all posts or create one!";
      } else if (selectedCategory !== "all") {
        emptyIcon = currentCategoryObj.icon || "bubble-chart";
        emptyTitle = `No ${currentCategoryObj.label} Vibes Yet`;
        emptySubtitle = `There are currently no vibes posted in ${currentCategoryObj.label}. Share the first update!`;
      }

      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            <MaterialIcons
              name={emptyIcon}
              size={34}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            {emptyTitle}
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}
          >
            {emptySubtitle}
          </Text>

          {/* Action Buttons: 1-Tap Reset & Create Post */}
          <View style={styles.emptyActionRow}>
            {isFiltered && (
              <Pressable
                onPress={handleResetFilters}
                style={[
                  styles.emptyResetBtn,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.outlineVariant || "transparent",
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Explore All Vibes"
              >
                <MaterialIcons
                  name="auto-awesome"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.emptyResetText, { color: colors.primary }]}
                >
                  Explore All Vibes
                </Text>
              </Pressable>
            )}

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
                styles.emptyPrimaryBtn,
                { backgroundColor: colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Create Vibe Post"
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyPrimaryBtnText}>Create Vibe</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // 3. Empty State for My Posts tab
    if (activeTab === "my-vibes") {
      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            <MaterialIcons
              name="photo-camera"
              size={34}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No Posts Yet
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}
          >
            Your submitted vibes, approval statuses, and admin feedback will appear here.
          </Text>
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
              styles.emptyPrimaryBtn,
              { backgroundColor: colors.primary, marginTop: 12 },
            ]}
          >
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyPrimaryBtnText}>Post a Vibe</Text>
          </Pressable>
        </View>
      );
    }

    // 4. Empty State for Saved tab
    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: colors.surfaceContainerHighest },
          ]}
        >
          <MaterialIcons
            name="bookmark-border"
            size={34}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
          No Saved Vibes
        </Text>
        <Text
          style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}
        >
          Tap the bookmark icon on any post in the feed to save it for quick access later.
        </Text>
        <Pressable
          onPress={() => setActiveTab("feed")}
          style={[
            styles.emptyPrimaryBtn,
            { backgroundColor: colors.primary, marginTop: 12 },
          ]}
        >
          <MaterialIcons name="dynamic-feed" size={18} color="#FFFFFF" />
          <Text style={styles.emptyPrimaryBtnText}>Explore Feed</Text>
        </Pressable>
      </View>
    );
  }, [
    currentLoading,
    activeTab,
    selectedCategory,
    selectedTag,
    debouncedSearch,
    currentCategoryObj,
    colors,
    handleResetFilters,
    isAuthenticated,
    showToast,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ──── Offline / Slow Network Banner ──── */}
      {!isConnected ? (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="cloud-off" size={13} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>
            You're offline. Browsing cached vibes.
          </Text>
        </View>
      ) : isSlow ? (
        <View style={[styles.offlineBanner, { backgroundColor: "#1E293B" }]}>
          <MaterialIcons name="speed" size={13} color="#38BDF8" />
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
              <MaterialIcons name="auto-awesome" size={15} color="#F59E0B" />
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
                size={19}
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

          {/* Search Toggle Action in Top Bar */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowSearchBar((prev) => !prev);
            }}
            style={[
              styles.actionIconBtn,
              {
                backgroundColor: showSearchBar
                  ? colors.primaryContainer
                  : colors.surfaceContainerHighest,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search Vibes"
          >
            <MaterialIcons
              name="search"
              size={19}
              color={showSearchBar ? colors.primary : colors.onSurface}
            />
          </Pressable>

          {/* Notification Bell Action */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push("/notifications");
            }}
            style={[
              styles.actionIconBtn,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <MaterialIcons
              name={unreadCount > 0 ? "notifications-active" : "notifications-none"}
              size={19}
              color={unreadCount > 0 ? colors.primary : colors.onSurface}
            />
            {unreadCount > 0 && (
              <View style={styles.pendingBadgeCircle}>
                <Text style={styles.pendingBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

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
              size={17}
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

      {/* ──── Expandable In-Feed Search Bar ──── */}
      {showSearchBar && (
        <View
          style={[
            styles.searchBarWrapper,
            {
              backgroundColor: colors.surfaceContainerHighest,
              borderColor: colors.outlineVariant || "transparent",
            },
          ]}
        >
          <MaterialIcons
            name="search"
            size={18}
            color={colors.onSurfaceVariant}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholder="Search captions, tags..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              style={styles.clearSearchBtn}
            >
              <MaterialIcons
                name="cancel"
                size={16}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          )}
        </View>
      )}

      {/* ──── Segmented Button: Feed / My Posts / Saved ──── */}
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

      {/* ──── Vibes Content Feed (Always mounted FlatList) ──── */}
      <FlatList
        ref={scrollRef}
        data={currentList}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyComponent}
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

      {/* ──── Extended Floating Action Button (FAB) ──── */}
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
            size={20}
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
    fontSize: FONT_SIZES.xl,
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
    backgroundColor: "#DC2626",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
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
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
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
    fontFamily: FONTS.medium,
  },
  feedHeaderContainer: {
    paddingBottom: 2,
  },
  categoriesContainer: {
    paddingVertical: 6,
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
  activeFilterBanner: {
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
  activeFilterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  activeFilterText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 8,
  },
  clearFilterText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 85,
    flexGrow: 1,
  },
  skeletonContainer: {
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 22,
    overflow: "hidden",
  },
  skeletonHeader: {
    flexDirection: "row",
    padding: 14,
    alignItems: "center",
    gap: 10,
  },
  skeletonBody: {
    padding: 14,
    gap: 8,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 45,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 14,
  },
  emptyActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  emptyResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyResetText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  emptyPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emptyPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.sm,
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
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  myVibeCardWrapper: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 22,
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
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
});
