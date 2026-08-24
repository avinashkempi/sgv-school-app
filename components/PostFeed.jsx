import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { useApiInfiniteQuery, useApiMutation, createApiMutationFn } from '../hooks/useApi';
import { CACHE_TIERS } from '../utils/cacheConfig';
import apiConfig from '../config/apiConfig';
import PostCard from './PostCard';
import SkeletonLoader from './SkeletonLoader';
import { useAuth } from '../context/AuthContext';

const POSTS_PER_PAGE = 15;

/**
 * PostFeed — infinite-scroll feed of posts filtered by category.
 *
 * @param {string} category - 'general' or 'achievement'
 * @param {Function} onEditPost - Callback when admin taps edit
 */
const PostFeed = ({ category, onEditPost }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'super admin';

  const queryKey = ['posts', category];

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useApiInfiniteQuery(
    queryKey,
    (page) => `${apiConfig.baseUrl}${apiConfig.endpoints.posts.list}?category=${category}&page=${page}&limit=${POSTS_PER_PAGE}`,
    {
      ...CACHE_TIERS.MODERATE,
      getNextPageParam: (lastPage) => {
        if (lastPage?.pagination?.hasMore) {
          return lastPage.pagination.page + 1;
        }
        return undefined;
      },
      initialPageParam: 1,
    }
  );

  // Flatten pages into a single posts array
  const posts = data?.pages?.flatMap(page => page?.data || []) || [];

  // Delete mutation
  const deleteMutation = useApiMutation({
    mutationFn: async (postId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.posts.delete(postId)}`,
        'DELETE'
      )();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Pin toggle mutation
  const pinMutation = useApiMutation({
    mutationFn: async (postId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.posts.togglePin(postId)}`,
        'PATCH'
      )({});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handleDelete = useCallback((post) => {
    deleteMutation.mutate(post._id);
  }, [deleteMutation]);

  const handleTogglePin = useCallback((post) => {
    pinMutation.mutate(post._id);
  }, [pinMutation]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }) => (
    <PostCard
      post={item}
      isAdmin={isAdmin}
      onEdit={onEditPost}
      onDelete={handleDelete}
      onTogglePin={handleTogglePin}
    />
  ), [isAdmin, onEditPost, handleDelete, handleTogglePin]);

  const keyExtractor = useCallback((item) => item._id, []);

  // Loading state — show skeleton cards
  if (isLoading && posts.length === 0) {
    return (
      <View style={styles.skeletonContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.surfaceContainer }]}>
            <SkeletonLoader width="100%" height={200} borderRadius={0} />
            <View style={{ padding: 16, gap: 10 }}>
              <SkeletonLoader width="40%" height={16} borderRadius={8} />
              <SkeletonLoader width="90%" height={18} borderRadius={8} />
              <SkeletonLoader width="60%" height={14} borderRadius={8} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Empty state
  if (!isLoading && posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainerHighest }]}>
          <MaterialIcons
            name={category === 'achievement' ? 'emoji-events' : 'article'}
            size={48}
            color={colors.onSurfaceVariant}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
          {category === 'achievement' ? 'No Achievements Yet' : 'No Posts Yet'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
          {isAdmin
            ? `Tap the + button to add your first ${category === 'achievement' ? 'achievement' : 'post'}`
            : `${category === 'achievement' ? 'Achievements' : 'Posts'} will appear here once published`
          }
        </Text>
        {!isRefetching && (
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryButton, { borderColor: colors.outline }]}
          >
            <MaterialIcons name="refresh" size={16} color={colors.primary} />
            <Text style={[styles.retryText, { color: colors.primary }]}>Refresh</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false} // Parent ScrollView handles scroll
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingMoreText, { color: colors.onSurfaceVariant }]}>Loading more...</Text>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 8,
  },
  skeletonContainer: {
    paddingTop: 8,
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
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
});

export default React.memo(PostFeed);
