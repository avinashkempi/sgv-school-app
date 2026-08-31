import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ToastProvider";
import { formatUserName } from "../../utils/userFormatters";
import { useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import {
  getFeedImageUrl,
  getStoryThumbnailUrl,
  getBlurPlaceholderUrl,
} from "../../utils/cloudinaryUpload";
import useNetworkQuality from "../../hooks/useNetworkQuality";
import { FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import formatTimeAgo from "../../utils/formatTimeAgo";
import VibeVideoPlayer from "./VibeVideoPlayer";
import VibeCommentsModal from "./VibeCommentsModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STORY_DURATION_MS = 5000; // 5 seconds per story photo

/**
 * Animated Segmented Progress Bar
 * Only advances when media is loaded and playback is active!
 */
const StoryProgressBar = memo(
  ({ index, currentIndex, isPaused, isMediaLoaded, onSegmentComplete }) => {
    const progress = useSharedValue(0);

    useEffect(() => {
      if (index < currentIndex) {
        // Completed slide
        progress.value = 1;
      } else if (index > currentIndex) {
        // Future slide
        progress.value = 0;
      } else {
        // Current active slide
        if (!isMediaLoaded) {
          progress.value = 0;
          return;
        }

        if (isPaused) {
          // Paused on hold
          return;
        }

        progress.value = withTiming(
          1,
          {
            duration: STORY_DURATION_MS * (1 - progress.value),
            easing: Easing.linear,
          },
          (finished) => {
            if (finished) {
              runOnJS(onSegmentComplete)();
            }
          }
        );
      }
    }, [
      currentIndex,
      index,
      isPaused,
      isMediaLoaded,
      progress,
      onSegmentComplete,
    ]);

    const barStyle = useAnimatedStyle(() => ({
      width: `${progress.value * 100}%`,
    }));

    return (
      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressBarFill, barStyle]} />
      </View>
    );
  }
);

StoryProgressBar.displayName = "StoryProgressBar";

/**
 * Full-Screen Immersive Instagram-Style Story Viewer Modal
 *
 * Features:
 * - Segmented progress bars with media load gating
 * - Horizontal swipe for fast slide navigation
 * - Vertical pull-down gesture to dismiss with spring physics & backdrop fade
 * - Tap left 30% for previous, tap right 70% for next, hold to pause
 * - Double tap on media for heart burst & like
 * - Frosted glass captions and bottom action bar
 * - Server & client view tracking
 */
const VibeStoryViewerModal = ({
  visible,
  onClose,
  stories = [],
  groupTitle = "SGV Campus Story",
  initialIndex = 0,
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { isSlow } = useNetworkQuality();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [activeCommentVibe, setActiveCommentVibe] = useState(null);
  const [isLikedLocally, setIsLikedLocally] = useState(false);
  const [likesCountLocally, setLikesCountLocally] = useState(0);

  // Gesture transformation shared values for pull down dismiss & horizontal swipe
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Floating heart animation state
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const lastTapRef = useRef(0);
  const viewedIdsRef = useRef(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(Math.min(initialIndex, Math.max(stories.length - 1, 0)));
      setIsPaused(false);
      setMediaLoaded(false);
      translateY.value = 0;
      translateX.value = 0;
      scale.value = 1;
    }
  }, [visible, initialIndex, stories.length, translateY, translateX, scale]);

  const currentVibe = stories[currentIndex];

  // Sync local like state with current vibe
  useEffect(() => {
    if (currentVibe) {
      setIsLikedLocally(!!currentVibe.isLiked);
      setLikesCountLocally(currentVibe.likesCount || 0);
      setMediaLoaded(false); // reset media load state for new slide
    }
  }, [currentVibe]);

  // Record view of current vibe (server-side & client-side)
  useEffect(() => {
    if (
      visible &&
      currentVibe?._id &&
      !viewedIdsRef.current.has(currentVibe._id)
    ) {
      viewedIdsRef.current.add(currentVibe._id);

      if (isAuthenticated) {
        createApiMutationFn(
          `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.recordView(
            currentVibe._id
          )}`,
          "POST"
        )({}).catch(() => {});
      }
    }
  }, [visible, currentVibe, isAuthenticated]);

  // Flush view highlights query on close
  const handleClose = useCallback(() => {
    if (viewedIdsRef.current.size > 0) {
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
    }
    onClose();
  }, [onClose, queryClient]);

  // Like Mutation
  const likeMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.toggleLike(vibeId)}`,
        "POST"
      )({});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
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
      showToast("Please log in to like vibes", "info");
      return;
    }
    if (!currentVibe) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const nextState = !isLikedLocally;
    setIsLikedLocally(nextState);
    setLikesCountLocally((prev) =>
      nextState ? prev + 1 : Math.max(prev - 1, 0)
    );

    if (nextState) {
      triggerFloatingHeart();
    }

    likeMutation.mutate(currentVibe._id);
  }, [
    isAuthenticated,
    currentVibe,
    isLikedLocally,
    showToast,
    triggerFloatingHeart,
    likeMutation,
  ]);

  // Advance to next story slide
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  }, [currentIndex, stories.length, handleClose]);

  // Go to previous story slide
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handlePressIn = () => {
    setIsPaused(true);
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  const handleOpenInFeed = useCallback(() => {
    handleClose();
    router.push({
      pathname: "/vibes",
      params: currentVibe?.category
        ? { category: currentVibe.category }
        : undefined,
    });
  }, [handleClose, router, currentVibe]);

  // Aggressive 2-slide ahead image prefetching
  useEffect(() => {
    if (!visible || !stories || stories.length <= 1) return;
    [1, 2].forEach((offset) => {
      const nextIdx = currentIndex + offset;
      if (nextIdx < stories.length) {
        const nextMedia = stories[nextIdx]?.images?.[0];
        if (nextMedia && nextMedia.type !== "video" && nextMedia.url) {
          const nextUrl = getFeedImageUrl(nextMedia.url, { isSlow });
          Image.prefetch(nextUrl);
        }
      }
    });
  }, [visible, currentIndex, stories, isSlow]);

  // Double tap on story media detection
  const handleTouchZonePress = useCallback(
    (isRightSide) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 280;

      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        // Double tap!
        handleToggleLike();
      } else {
        // Single tap -> Navigate
        if (isRightSide) {
          handleNext();
        } else {
          handlePrevious();
        }
      }
      lastTapRef.current = now;
    },
    [handleToggleLike, handleNext, handlePrevious]
  );

  // ── Instagram-Style Gestures: Swipe down to dismiss & horizontal swipe navigation ──
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Pull down to dismiss gesture (primary on downward translation)
      if (
        e.translationY > 0 &&
        Math.abs(e.translationY) > Math.abs(e.translationX) * 0.8
      ) {
        translateY.value = e.translationY;
        scale.value = interpolate(
          e.translationY,
          [0, SCREEN_HEIGHT * 0.5],
          [1, 0.85],
          Extrapolation.CLAMP
        );
      } else {
        // Horizontal story slide hint
        translateX.value = e.translationX * 0.4;
      }
    })
    .onEnd((e) => {
      if (translateY.value > 120 || e.velocityY > 700) {
        // Pull down dismiss threshold met
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
      } else if (e.translationX < -60 || e.velocityX < -500) {
        // Swiped left -> next story
        translateX.value = withTiming(0, { duration: 150 });
        runOnJS(handleNext)();
      } else if (e.translationX > 60 || e.velocityX > 500) {
        // Swiped right -> previous story
        translateX.value = withTiming(0, { duration: 150 });
        runOnJS(handlePrevious)();
      } else {
        // Spring back to center
        translateY.value = withSpring(0, { damping: 15 });
        translateX.value = withSpring(0, { damping: 15 });
        scale.value = withSpring(1, { damping: 15 });
      }
    });

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT * 0.4],
      [1, 0.25],
      Extrapolation.CLAMP
    ),
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  if (!visible || !currentVibe) return null;

  const currentMedia = currentVibe.images?.[0];
  const isVideo = currentMedia?.type === "video";
  const mediaUrl = currentMedia?.url;
  const optimizedImage = mediaUrl
    ? getFeedImageUrl(mediaUrl, { isSlow })
    : null;
  const authorAvatar = currentVibe.author?.profilePhoto
    ? getStoryThumbnailUrl(currentVibe.author.profilePhoto)
    : null;
  const authorAvatarBlur = authorAvatar
    ? getBlurPlaceholderUrl(authorAvatar)
    : null;
  const timeAgo = formatTimeAgo(currentVibe.createdAt, { compact: false });

  const badgeColor =
    currentVibe.category === "achievement"
      ? "#F59E0B"
      : currentVibe.postAs === "school" || currentVibe.category === "official"
      ? "#2563EB"
      : "#10B981";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <GestureHandlerRootView style={styles.rootGestureContainer}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.modalRoot, modalAnimatedStyle]}>
            {/* 1. Media Stage Background */}
            <View style={styles.mediaStage}>
              {isVideo ? (
                <>
                  {currentMedia?.thumbnailUrl && (
                    <Image
                      source={{ uri: currentMedia.thumbnailUrl }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      blurRadius={Platform.OS === "ios" ? 30 : 15}
                      cachePolicy="memory-disk"
                    />
                  )}
                  <View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: "rgba(0,0,0,0.5)" },
                    ]}
                  />
                  <VibeVideoPlayer
                    url={mediaUrl}
                    thumbnailUrl={currentMedia?.thumbnailUrl}
                    width={SCREEN_WIDTH}
                    height={SCREEN_HEIGHT}
                    isVisible={visible && !isPaused}
                    isActiveSlide={true}
                    onDoubleTapLike={handleToggleLike}
                  />
                </>
              ) : optimizedImage ? (
                <>
                  {/* Ambient blurred backdrop for letterboxed aspect ratios */}
                  <Image
                    source={{ uri: optimizedImage }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    blurRadius={Platform.OS === "ios" ? 30 : 15}
                    cachePolicy="memory-disk"
                  />
                  <View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: "rgba(0,0,0,0.45)" },
                    ]}
                  />

                  {/* Main crisp image with progressive loading */}
                  <Image
                    source={{ uri: optimizedImage }}
                    style={styles.foregroundImage}
                    contentFit="contain"
                    transition={150}
                    cachePolicy="memory-disk"
                    onLoad={() => setMediaLoaded(true)}
                  />
                </>
              ) : (
                <View style={styles.placeholderMedia}>
                  <MaterialIcons
                    name="auto-awesome"
                    size={64}
                    color="rgba(255,255,255,0.4)"
                  />
                </View>
              )}

              {/* Shimmer loading spinner while image buffers */}
              {!isVideo && !mediaLoaded && (
                <View style={styles.mediaLoaderContainer}>
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}

              {/* Floating Heart animation on Like */}
              <Animated.View
                style={[styles.floatingHeartContainer, heartAnimatedStyle]}
                pointerEvents="none"
              >
                <MaterialIcons name="favorite" size={96} color="#EF4444" />
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
                    isMediaLoaded={isVideo || mediaLoaded}
                    onSegmentComplete={handleNext}
                  />
                ))}
              </View>

              {/* Author Header */}
              <View style={styles.authorHeaderRow}>
                <View style={styles.authorInfoGroup}>
                  <View
                    style={[styles.avatarRing, { borderColor: badgeColor }]}
                  >
                    {currentVibe.postAs === "school" ? (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: "#FFF8E1", overflow: "hidden" },
                        ]}
                      >
                        <Image
                          source={require("../../assets/images/icon.png")}
                          style={styles.avatarImg}
                          contentFit="cover"
                        />
                      </View>
                    ) : authorAvatar ? (
                      <Image
                        source={{ uri: authorAvatar }}
                        placeholder={
                          authorAvatarBlur
                            ? { uri: authorAvatarBlur }
                            : undefined
                        }
                        style={styles.avatarImg}
                        contentFit="cover"
                        transition={150}
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: badgeColor },
                        ]}
                      >
                        <MaterialIcons
                          name="person"
                          size={18}
                          color="#fff"
                        />
                      </View>
                    )}
                  </View>

                  <View>
                    <View style={styles.nameRow}>
                      <Text style={styles.authorNameText} numberOfLines={1}>
                        {currentVibe.postAs === "school"
                          ? "SGV Official"
                          : formatUserName(currentVibe.author?.name || groupTitle)}
                      </Text>
                      {currentVibe.postAs === "school" && (
                        <MaterialIcons
                          name="verified"
                          size={15}
                          color="#60A5FA"
                        />
                      )}
                    </View>
                    <View style={styles.subInfoRow}>
                      <Text style={styles.timeAgoText}>{timeAgo}</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: badgeColor },
                        ]}
                      >
                        <Text style={styles.categoryBadgeText}>
                          {currentVibe.category?.toUpperCase() || "VIBE"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Close Button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light
                    ).catch(() => {});
                    handleClose();
                  }}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close story"
                >
                  <MaterialIcons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* 3. Touch Zones (Left 30% = Prev, Right 70% = Next, Hold = Pause) */}
            <View style={styles.touchZonesContainer}>
              <Pressable
                style={styles.touchZoneLeft}
                onPress={() => handleTouchZonePress(false)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              />
              <Pressable
                style={styles.touchZoneRight}
                onPress={() => handleTouchZonePress(true)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              />
            </View>

            {/* 4. Bottom Controls: Frosted Glass Caption + Like + Comments + View in Feed */}
            <View style={styles.bottomControls}>
              {currentVibe.caption ? (
                <BlurView
                  intensity={Platform.OS === "ios" ? 45 : 80}
                  tint="dark"
                  style={styles.captionGlassBox}
                >
                  <Text style={styles.captionText} numberOfLines={3}>
                    {currentVibe.caption}
                  </Text>
                </BlurView>
              ) : null}

              <View style={styles.actionsRow}>
                {/* Quick Like Action */}
                <Pressable
                  onPress={handleToggleLike}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name={isLikedLocally ? "favorite" : "favorite-border"}
                    size={26}
                    color={isLikedLocally ? "#EF4444" : "#fff"}
                  />
                  <Text style={styles.actionCountText}>
                    {likesCountLocally}
                  </Text>
                </Pressable>

                {/* Comments Button */}
                <Pressable
                  onPress={() => setActiveCommentVibe(currentVibe)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name="chat-bubble-outline"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.actionCountText}>
                    {currentVibe.commentsCount || 0}
                  </Text>
                </Pressable>

                {/* View Full Post in Feed Button */}
                <Pressable
                  onPress={handleOpenInFeed}
                  style={({ pressed }) => [
                    styles.viewInFeedBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.viewInFeedText}>Explore in Feed</Text>
                  <MaterialIcons name="arrow-forward" size={15} color="#fff" />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>

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
  rootGestureContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  mediaStage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  foregroundImage: {
    width: "100%",
    height: "100%",
    maxWidth: SCREEN_WIDTH,
    maxHeight: SCREEN_HEIGHT,
  },
  placeholderMedia: {
    justifyContent: "center",
    alignItems: "center",
  },
  mediaLoaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 4,
  },
  floatingHeartContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  topControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 48 : 32,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 15,
  },
  progressBarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  authorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorInfoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorNameText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  timeAgoText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  dotSeparator: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: FONT_SIZES.xs,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.xs,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  touchZonesContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 8,
  },
  touchZoneLeft: {
    width: "30%",
    height: "100%",
  },
  touchZoneRight: {
    width: "70%",
    height: "100%",
  },
  bottomControls: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 36 : 24,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 15,
    gap: 10,
  },
  captionGlassBox: {
    padding: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor:
      Platform.OS === "android" ? "rgba(0,0,0,0.65)" : "transparent",
  },
  captionText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.sm,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  actionCountText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  viewInFeedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginLeft: "auto",
  },
  viewInFeedText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});

export default memo(VibeStoryViewerModal);
