import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { useApiInfiniteQuery, useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { CACHE_TIERS } from '../../utils/cacheConfig';
import VibeCard from '../../components/vibes/VibeCard';
import CreateVibeModal from '../../components/vibes/CreateVibeModal';
import VibeCommentsModal from '../../components/vibes/VibeCommentsModal';
import VibeLikesModal from '../../components/vibes/VibeLikesModal';
import SkeletonLoader from '../../components/SkeletonLoader';

const VIBES_PER_PAGE = 10;

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'auto-awesome' },
  { key: 'official', label: 'Official', icon: 'school' },
  { key: 'achievement', label: 'Achievements', icon: 'emoji-events' },
  { key: 'sports', label: 'Sports', icon: 'sports-soccer' },
  { key: 'arts', label: 'Arts & Events', icon: 'palette' },
  { key: 'life', label: 'Campus Life', icon: 'local-florist' },
];

export default function VibesScreen() {
  const router = useRouter();
  const { colors, styles: themeStyles } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'super admin';

  // Navigation / View Tabs: 'feed' | 'my-vibes' | 'saved'
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVibe, setEditingVibe] = useState(null);
  const [activeCommentVibe, setActiveCommentVibe] = useState(null);
  const [activeLikesVibeId, setActiveLikesVibeId] = useState(null);

  // Admin pending count query
  const { data: pendingData } = useApiQuery(
    ['pendingVibesCount'],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminPending}?limit=1`,
    {
      ...CACHE_TIERS.REAL_TIME,
      enabled: isAdmin,
    }
  );
  const pendingCount = pendingData?.pendingCount || 0;

  // Viewport visibility tracking for high-performance video autoplay (Instagram pattern)
  const [visibleItemIds, setVisibleItemIds] = useState(new Set());

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const ids = new Set(viewableItems.map(vi => vi.item?._id).filter(Boolean));
    setVisibleItemIds(ids);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  // ──── Main Feed Infinite Query ────
  const feedQueryKey = ['vibes', selectedCategory, selectedTag];
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
      if (selectedCategory && selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`;
      }
      return url;
    },
    {
      ...CACHE_TIERS.MODERATE,
      enabled: activeTab === 'feed',
      getNextPageParam: (lastPage) => {
        if (lastPage?.pagination?.hasMore) {
          return lastPage.pagination.page + 1;
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
    ['myVibes'],
    (page) => `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.myVibes}?page=${page}&limit=${VIBES_PER_PAGE}`,
    {
      ...CACHE_TIERS.REAL_TIME,
      enabled: activeTab === 'my-vibes' && isAuthenticated,
      getNextPageParam: (lastPage) => lastPage?.pagination?.hasMore ? lastPage.pagination.page + 1 : undefined,
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
    ['savedVibes'],
    (page) => `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.saved}?page=${page}&limit=${VIBES_PER_PAGE}`,
    {
      ...CACHE_TIERS.MODERATE,
      enabled: activeTab === 'saved' && isAuthenticated,
      getNextPageParam: (lastPage) => lastPage?.pagination?.hasMore ? lastPage.pagination.page + 1 : undefined,
      initialPageParam: 1,
    }
  );

  const feedVibes = useMemo(() => feedData?.pages?.flatMap(p => p?.data || []) || [], [feedData]);
  const myVibes = useMemo(() => myVibesData?.pages?.flatMap(p => p?.data || []) || [], [myVibesData]);
  const savedVibes = useMemo(() => savedData?.pages?.flatMap(p => p?.data || []) || [], [savedData]);

  // ──── Mutations ────
  const likeMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.toggleLike(vibeId)}`,
        'POST'
      )({});
    },
  });

  const bookmarkMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.toggleBookmark(vibeId)}`,
        'POST'
      )({});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedVibes'] });
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.delete(vibeId)}`,
        'DELETE'
      )({});
    },
    onSuccess: () => {
      showToast('Vibe deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['vibes'] });
      queryClient.invalidateQueries({ queryKey: ['myVibes'] });
      queryClient.invalidateQueries({ queryKey: ['savedVibes'] });
      queryClient.invalidateQueries({ queryKey: ['vibeHighlights'] });
      queryClient.invalidateQueries({ queryKey: ['vibeSpotlight'] });
    },
  });

  const pinMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.adminPin(vibeId)}`,
        'PATCH'
      )({});
    },
    onSuccess: (res) => {
      showToast(res.message || 'Updated pin status', 'success');
      queryClient.invalidateQueries({ queryKey: ['vibes'] });
      queryClient.invalidateQueries({ queryKey: ['vibeHighlights'] });
      queryClient.invalidateQueries({ queryKey: ['vibeSpotlight'] });
    },
  });

  // Action handlers
  const handleLike = useCallback((vibeId) => {
    if (!isAuthenticated) {
      showToast('Please log in to like vibes', 'info');
      return;
    }
    likeMutation.mutate(vibeId);
  }, [isAuthenticated, showToast, likeMutation]);

  const handleBookmark = useCallback((vibeId) => {
    if (!isAuthenticated) {
      showToast('Please log in to save vibes', 'info');
      return;
    }
    bookmarkMutation.mutate(vibeId);
  }, [isAuthenticated, showToast, bookmarkMutation]);

  const handleDelete = useCallback((vibe) => {
    deleteMutation.mutate(vibe._id);
  }, [deleteMutation]);

  const handleTogglePin = useCallback((vibe) => {
    pinMutation.mutate(vibe._id);
  }, [pinMutation]);

  const handleEdit = useCallback((vibe) => {
    setEditingVibe(vibe);
    setShowCreateModal(true);
  }, []);

  const handleTagPress = useCallback((tag) => {
    setSelectedTag(tag);
    setSelectedCategory('all');
    setActiveTab('feed');
  }, []);

  const onRefresh = useCallback(async () => {
    if (activeTab === 'feed') await refetchFeed();
    else if (activeTab === 'my-vibes') await refetchMyVibes();
    else if (activeTab === 'saved') await refetchSaved();
  }, [activeTab, refetchFeed, refetchMyVibes, refetchSaved]);

  const renderFeedItem = useCallback(({ item }) => (
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
      onTagPress={handleTagPress}
    />
  ), [user, isAdmin, visibleItemIds, handleLike, handleBookmark, handleEdit, handleDelete, handleTogglePin, handleTagPress]);

  const renderMyVibeItem = useCallback(({ item }) => {
    const statusMeta = item.status === 'approved'
      ? { label: 'Approved & Live', bg: '#E8F5E9', text: '#2E7D32', icon: 'check-circle' }
      : item.status === 'rejected'
        ? { label: 'Not Approved', bg: '#FFEBEE', text: '#C62828', icon: 'cancel' }
        : { label: 'Pending Review', bg: '#FFF8E1', text: '#F57F17', icon: 'schedule' };

    return (
      <View style={[styles.myVibeCard, { backgroundColor: colors.surfaceContainer }]}>
        {/* Status Header */}
        <View style={styles.myVibeStatusRow}>
          <View style={[styles.myVibeStatusBadge, { backgroundColor: statusMeta.bg }]}>
            <MaterialIcons name={statusMeta.icon} size={14} color={statusMeta.text} />
            <Text style={[styles.myVibeStatusText, { color: statusMeta.text }]}>
              {statusMeta.label}
            </Text>
          </View>
          <Text style={[styles.myVibeDate, { color: colors.onSurfaceVariant }]}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Rejection Note */}
        {item.status === 'rejected' && item.rejectionReason && (
          <View style={[styles.rejectionBox, { backgroundColor: '#FFEBEE' }]}>
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
          onTagPress={handleTagPress}
        />
      </View>
    );
  }, [colors, user, isAdmin, handleLike, handleBookmark, handleEdit, handleDelete, handleTogglePin, handleTagPress]);

  const currentList = activeTab === 'feed'
    ? feedVibes
    : activeTab === 'my-vibes'
      ? myVibes
      : savedVibes;

  const currentLoading = activeTab === 'feed'
    ? isFeedLoading
    : activeTab === 'my-vibes'
      ? isMyVibesLoading
      : isSavedLoading;

  const isRefreshing = activeTab === 'feed'
    ? isFeedRefetching
    : activeTab === 'my-vibes'
      ? isMyVibesRefetching
      : isSavedRefetching;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ──── Top App Bar ──── */}
      <View style={[styles.topBar, { borderBottomColor: colors.outlineVariant }]}>
        <View style={styles.brandRow}>
          <View style={styles.titleWrapper}>
            <Text style={[styles.brandTitle, { color: colors.onSurface }]}>Vibes</Text>
            <View style={styles.sparkleBadge}>
              <MaterialIcons name="auto-awesome" size={14} color="#FF9800" />
            </View>
          </View>
        </View>

        <View style={styles.topActions}>
          {/* Admin Approvals Shortcut with Pending Badge */}
          {isAdmin && (
            <Pressable
              onPress={() => router.push('/admin/vibe-approvals')}
              style={[styles.actionIconBtn, { backgroundColor: colors.surfaceContainerHighest }]}
            >
              <MaterialIcons name="admin-panel-settings" size={22} color={colors.primary} />
              {pendingCount > 0 && (
                <View style={styles.pendingBadgeCircle}>
                  <Text style={styles.pendingBadgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Create Vibe Action */}
          <Pressable
            onPress={() => {
              if (!isAuthenticated) {
                showToast('Please log in to post Vibes', 'info');
                return;
              }
              setEditingVibe(null);
              setShowCreateModal(true);
            }}
            style={[styles.createButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Post</Text>
          </Pressable>
        </View>
      </View>

      {/* ──── Navigation Tabs: Feed / My Submissions / Saved ──── */}
      <View style={[styles.tabBar, { borderBottomColor: colors.outlineVariant }]}>
        <Pressable
          onPress={() => { setActiveTab('feed'); setSelectedTag(null); }}
          style={[styles.tabItem, activeTab === 'feed' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'feed' ? colors.primary : colors.onSurfaceVariant, fontFamily: activeTab === 'feed' ? 'DMSans-Bold' : 'DMSans-Medium' }
          ]}>
            Feed
          </Text>
        </Pressable>

        {isAuthenticated && (
          <Pressable
            onPress={() => setActiveTab('my-vibes')}
            style={[styles.tabItem, activeTab === 'my-vibes' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'my-vibes' ? colors.primary : colors.onSurfaceVariant, fontFamily: activeTab === 'my-vibes' ? 'DMSans-Bold' : 'DMSans-Medium' }
            ]}>
              Mine
            </Text>
          </Pressable>
        )}

        {isAuthenticated && (
          <Pressable
            onPress={() => setActiveTab('saved')}
            style={[styles.tabItem, activeTab === 'saved' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'saved' ? colors.primary : colors.onSurfaceVariant, fontFamily: activeTab === 'saved' ? 'DMSans-Bold' : 'DMSans-Medium' }
            ]}>
              Saved
            </Text>
          </Pressable>
        )}
      </View>

      {/* ──── Category Filter Pills (When on Feed tab) ──── */}
      {activeTab === 'feed' && (
        <View style={styles.categoriesContainer}>
          {selectedTag && (
            <View style={styles.activeTagBanner}>
              <Text style={[styles.activeTagText, { color: colors.primary }]}>
                #{selectedTag}
              </Text>
              <Pressable onPress={() => setSelectedTag(null)} hitSlop={8}>
                <MaterialIcons name="close" size={16} color={colors.primary} />
              </Pressable>
            </View>
          )}

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
                    setSelectedCategory(item.key);
                    setSelectedTag(null);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceContainer,
                      borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    }
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={14}
                    color={isSelected ? '#fff' : colors.onSurfaceVariant}
                  />
                  <Text style={[
                    styles.categoryChipText,
                    { color: isSelected ? '#fff' : colors.onSurfaceVariant }
                  ]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* ──── Vibes Content Feed ──── */}
      {currentLoading && currentList.length === 0 ? (
        <View style={styles.skeletonContainer}>
          {[1, 2].map((i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.surfaceContainer }]}>
              <View style={{ flexDirection: 'row', padding: 14, alignItems: 'center', gap: 10 }}>
                <SkeletonLoader width={38} height={38} borderRadius={19} />
                <SkeletonLoader width={120} height={16} borderRadius={8} />
              </View>
              <SkeletonLoader width="100%" height={280} borderRadius={0} />
              <View style={{ padding: 14, gap: 8 }}>
                <SkeletonLoader width="30%" height={16} borderRadius={8} />
                <SkeletonLoader width="80%" height={14} borderRadius={8} />
              </View>
            </View>
          ))}
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="photo-camera" size={56} color={colors.onSurfaceVariant} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            {activeTab === 'feed'
              ? 'No Vibes Yet'
              : activeTab === 'my-vibes'
                ? 'No Posts Yet'
                : 'No Saved Vibes'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            {activeTab === 'feed'
              ? 'Be the first to share a vibe with the school!'
              : activeTab === 'my-vibes'
                ? 'Your posts and approval status will appear here.'
                : 'Tap the bookmark icon on any post to save it for later.'}
          </Text>
          <Pressable
            onPress={() => {
              if (activeTab === 'feed') setShowCreateModal(true);
              else onRefresh();
            }}
            style={[styles.emptyActionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.emptyActionText}>
              {activeTab === 'feed' ? 'Create Vibe' : 'Refresh'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={currentList}
          renderItem={activeTab === 'my-vibes' ? renderMyVibeItem : renderFeedItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[themeStyles.contentPaddingBottom, styles.listContent]}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          onEndReached={() => {
            if (activeTab === 'feed' && hasFeedNextPage && !isFeedFetchingNext) {
              fetchFeedNextPage();
            } else if (activeTab === 'my-vibes' && hasMyVibesNext) {
              fetchMyVibesNext();
            } else if (activeTab === 'saved' && hasSavedNext) {
              fetchSavedNext();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFeedFetchingNext ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingMoreText, { color: colors.onSurfaceVariant }]}>Loading more vibes...</Text>
              </View>
            ) : null
          }
        />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontFamily: 'DMSans-Bold',
    letterSpacing: -0.5,
  },
  sparkleBadge: {
    marginTop: -2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pendingBadgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF2D55',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 20,
  },
  tabText: {
    fontSize: 14,
  },
  categoriesContainer: {
    paddingVertical: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
  activeTagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
    gap: 6,
    backgroundColor: 'rgba(47, 108, 212, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeTagText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
  listContent: {
    paddingTop: 8,
  },
  skeletonContainer: {
    paddingTop: 12,
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
  },
  myVibeCard: {
    marginBottom: 20,
    borderRadius: 0,
    overflow: 'hidden',
  },
  myVibeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  myVibeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  myVibeStatusText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    textTransform: 'uppercase',
  },
  myVibeDate: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
  },
  rejectionBox: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#C62828',
  },
  rejectionTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#C62828',
  },
  rejectionReason: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#333',
    marginTop: 2,
  },
});
