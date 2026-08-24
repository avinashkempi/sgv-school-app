import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ToastProvider';
import { useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { getFeedImageUrl, getStoryThumbnailUrl } from '../../utils/cloudinaryUpload';
import VibeVideoPlayer from './VibeVideoPlayer';
import VibeCommentsModal from './VibeCommentsModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION_MS = 5000; // 5 seconds per story slide

/**
 * Animated Segmented Progress Bar
 */
const StoryProgressBar = memo(({ index, currentIndex, isPaused, onSegmentComplete }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (index < currentIndex) {
      // Already completed
      progress.value = 1;
    } else if (index > currentIndex) {
      // Future slide
      progress.value = 0;
    } else {
      // Current active slide
      progress.value = 0;
      if (!isPaused) {
        progress.value = withTiming(
          1,
          {
            duration: STORY_DURATION_MS,
            easing: Easing.linear,
          },
          (finished) => {
            if (finished) {
              runOnJS(onSegmentComplete)();
            }
          }
        );
      }
    }
  }, [currentIndex, index, isPaused, progress, onSegmentComplete]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.progressBarTrack}>
      <Animated.View style={[styles.progressBarFill, barStyle]} />
    </View>
  );
});

StoryProgressBar.displayName = 'StoryProgressBar';

/**
 * Full-Screen Immersive Story Viewer Modal
 *
 * @param {boolean} visible - Whether modal is displayed
 * @param {Function} onClose - Close callback
 * @param {Array} stories - Array of Vibe objects in this story group
 * @param {string} groupTitle - Title of the story group ('Official', 'Achievements', or Author Name)
 * @param {number} initialIndex - Starting story index
 */
const VibeStoryViewerModal = ({
  visible,
  onClose,
  stories = [],
  groupTitle = 'SGV Campus Story',
  initialIndex = 0,
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [activeCommentVibe, setActiveCommentVibe] = useState(null);
  const [isLikedLocally, setIsLikedLocally] = useState(false);
  const [likesCountLocally, setLikesCountLocally] = useState(0);

  // Floating heart animation state
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  // Reset index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(Math.min(initialIndex, Math.max(stories.length - 1, 0)));
      setIsPaused(false);
    }
  }, [visible, initialIndex, stories.length]);

  const currentVibe = stories[currentIndex];

  // Sync local like state with current vibe
  useEffect(() => {
    if (currentVibe) {
      setIsLikedLocally(!!currentVibe.isLiked);
      setLikesCountLocally(currentVibe.likesCount || 0);
    }
  }, [currentVibe]);

  // Like Mutation
  const likeMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.toggleLike(vibeId)}`,
        'POST'
      )({});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vibes'] });
      queryClient.invalidateQueries({ queryKey: ['vibeHighlights'] });
    },
  });

  const triggerFloatingHeart = useCallback(() => {
    heartScale.value = 0.5;
    heartOpacity.value = 1;
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 300 }),
      withTiming(1, { duration: 150 })
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 400 }),
      withTiming(0, { duration: 300 })
    );
  }, [heartScale, heartOpacity]);

  const handleToggleLike = useCallback(() => {
    if (!isAuthenticated) {
      showToast('Please log in to like vibes', 'info');
      return;
    }
    if (!currentVibe) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const nextState = !isLikedLocally;
    setIsLikedLocally(nextState);
    setLikesCountLocally(prev => nextState ? prev + 1 : Math.max(prev - 1, 0));

    if (nextState) {
      triggerFloatingHeart();
    }

    likeMutation.mutate(currentVibe._id);
  }, [isAuthenticated, currentVibe, isLikedLocally, showToast, triggerFloatingHeart, likeMutation]);

  // Advance to next story
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  // Go to previous story
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handlePressIn = () => {
    setIsPaused(true);
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  const handleOpenInFeed = useCallback(() => {
    onClose();
    router.push({
      pathname: '/vibes',
      params: currentVibe?.category ? { category: currentVibe.category } : undefined,
    });
  }, [onClose, router, currentVibe]);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  if (!visible || !currentVibe) return null;

  const currentMedia = currentVibe.images?.[0];
  const isVideo = currentMedia?.type === 'video';
  const mediaUrl = currentMedia?.url;
  const optimizedImage = mediaUrl ? getFeedImageUrl(mediaUrl) : null;
  const authorAvatar = currentVibe.author?.profilePhoto ? getStoryThumbnailUrl(currentVibe.author.profilePhoto) : null;

  const timeAgo = (() => {
    if (!currentVibe.createdAt) return '';
    const diffHours = Math.floor((new Date() - new Date(currentVibe.createdAt)) / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  })();

  const badgeColor = currentVibe.category === 'achievement'
    ? '#F59E0B'
    : currentVibe.postAs === 'school' || currentVibe.category === 'official'
      ? '#2563EB'
      : '#10B981';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.modalRoot}>
        {/* 1. Media Stage Background */}
        <View style={styles.mediaStage}>
          {isVideo ? (
            <>
              {currentMedia?.thumbnailUrl && (
                <Image
                  source={{ uri: currentMedia.thumbnailUrl }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  blurRadius={Platform.OS === 'ios' ? 30 : 15}
                  cachePolicy="memory-disk"
                />
              )}
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
              <VibeVideoPlayer
                url={mediaUrl}
                thumbnailUrl={currentMedia?.thumbnailUrl}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                isVisible={visible && !isPaused}
                isActiveSlide={true}
              />
            </>
          ) : optimizedImage ? (
            <>
              {/* Ambient blurred backdrop for letterboxed areas */}
              <Image
                source={{ uri: optimizedImage }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                blurRadius={Platform.OS === 'ios' ? 30 : 15}
                cachePolicy="memory-disk"
              />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />

              {/* Main crisp image fitted to screen without cropping */}
              <Image
                source={{ uri: optimizedImage }}
                style={styles.foregroundImage}
                contentFit="contain"
                transition={150}
                cachePolicy="memory-disk"
              />
            </>
          ) : (
            <View style={styles.placeholderMedia}>
              <MaterialIcons name="auto-awesome" size={64} color="rgba(255,255,255,0.4)" />
            </View>
          )}

          {/* Floating Heart animation on Like */}
          <Animated.View style={[styles.floatingHeartContainer, heartAnimatedStyle]} pointerEvents="none">
            <MaterialIcons name="favorite" size={90} color="#EF4444" />
          </Animated.View>
        </View>

        {/* 2. Top Navigation Overlays: Progress Bars + Header */}
        <View style={styles.topControls}>
          {/* Segmented Progress Bars */}
          <View style={styles.progressBarsRow}>
            {stories.map((_, idx) => (
              <StoryProgressBar
                key={idx}
                index={idx}
                currentIndex={currentIndex}
                isPaused={isPaused || !!activeCommentVibe}
                onSegmentComplete={handleNext}
              />
            ))}
          </View>

          {/* Author Header */}
          <View style={styles.authorHeaderRow}>
            <View style={styles.authorInfoGroup}>
              <View style={[styles.avatarRing, { borderColor: badgeColor }]}>
                {authorAvatar ? (
                  <Image source={{ uri: authorAvatar }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: badgeColor }]}>
                    <MaterialIcons name={currentVibe.postAs === 'school' ? 'school' : 'person'} size={18} color="#fff" />
                  </View>
                )}
              </View>

              <View>
                <View style={styles.nameRow}>
                  <Text style={styles.authorNameText} numberOfLines={1}>
                    {currentVibe.postAs === 'school' ? 'SGV Official' : (currentVibe.author?.name || groupTitle)}
                  </Text>
                  {currentVibe.postAs === 'school' && (
                    <MaterialIcons name="verified" size={15} color="#60A5FA" />
                  )}
                </View>
                <View style={styles.subInfoRow}>
                  <Text style={styles.timeAgoText}>{timeAgo}</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.categoryBadgeText}>
                      {currentVibe.category?.toUpperCase() || 'VIBE'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Close Button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onClose();
              }}
              style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close story"
            >
              <MaterialIcons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* 3. Invisible Touch Zones (Left 35% = Prev, Right 65% = Next, Hold = Pause) */}
        <View style={styles.touchZonesContainer}>
          <Pressable
            style={styles.touchZoneLeft}
            onPress={handlePrevious}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
          <Pressable
            style={styles.touchZoneRight}
            onPress={handleNext}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
        </View>

        {/* 4. Bottom Controls: Caption + Like + Comments + View in Feed */}
        <View style={styles.bottomControls}>
          {currentVibe.caption ? (
            <View style={styles.captionGlassBox}>
              <Text style={styles.captionText} numberOfLines={3}>
                {currentVibe.caption}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            {/* Quick Like Action */}
            <Pressable
              onPress={handleToggleLike}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={8}
            >
              <MaterialIcons
                name={isLikedLocally ? 'favorite' : 'favorite-border'}
                size={28}
                color={isLikedLocally ? '#EF4444' : '#fff'}
              />
              <Text style={styles.actionCountText}>{likesCountLocally}</Text>
            </Pressable>

            {/* Comments Button */}
            <Pressable
              onPress={() => setActiveCommentVibe(currentVibe)}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={8}
            >
              <MaterialIcons name="chat-bubble-outline" size={26} color="#fff" />
              <Text style={styles.actionCountText}>{currentVibe.commentsCount || 0}</Text>
            </Pressable>

            {/* View Full Post in Feed Button */}
            <Pressable
              onPress={handleOpenInFeed}
              style={({ pressed }) => [styles.viewInFeedBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.viewInFeedText}>Explore in Feed</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Comments Bottom Sheet Modal */}
      {activeCommentVibe && (
        <VibeCommentsModal
          visible={!!activeCommentVibe}
          onClose={() => setActiveCommentVibe(null)}
          vibe={activeCommentVibe}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  mediaStage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foregroundImage: {
    width: '100%',
    height: '100%',
    maxWidth: SCREEN_WIDTH,
    maxHeight: SCREEN_HEIGHT,
  },
  placeholderMedia: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeartContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 28,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  progressBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  authorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorNameText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  timeAgoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
  },
  dotSeparator: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchZonesContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  touchZoneLeft: {
    width: '35%',
    height: '100%',
  },
  touchZoneRight: {
    width: '65%',
    height: '100%',
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
    gap: 12,
  },
  captionGlassBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  captionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionCountText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  viewInFeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  viewInFeedText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
});

export default memo(VibeStoryViewerModal);
