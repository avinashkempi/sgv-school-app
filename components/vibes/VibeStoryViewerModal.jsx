import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
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
import VibeVideoPlayer, {
  getGlobalMuted,
  setGlobalMuted,
} from "./VibeVideoPlayer";
import VibeCommentsModal from "./VibeCommentsModal";
import VibeViewersModal from "./VibeViewersModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STORY_DURATION_MS = 5000; // 5 seconds default per photo story
const QUICK_REACTION_EMOJIS = ["❤️", "🔥", "👏", "🎉", "🙌", "😍"];

/**
 * Animated Segmented Progress Bar
 * Only advances when media is loaded and playback is active!
 * Dynamically scales to video durationMs when provided.
 */
const StoryProgressBar = memo(
  ({
    index,
    currentIndex,
    isPaused,
    isMediaLoaded,
    durationMs = STORY_DURATION_MS,
    onSegmentComplete,
  }) => {
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
          return;
        }

        progress.value = withTiming(
          1,
          {
            duration: durationMs * (1 - progress.value),
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
      durationMs,
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
 * Full-Screen Immersive Instagram & WhatsApp-Style Story Viewer Modal
 *
 * Upgraded Features:
 * - Continuous Multi-Group Navigation: Seamlessly flows across authors & categories without closing
 * - Instant Responsive Tapping: Right 70% = Next, Left 30% = Previous
 * - Clean View on Hold: Holding screen pauses video & timer and hides UI controls completely
 * - Header Sound Controls: Mute/unmute speaker toggle for video stories
 * - Dynamic Duration Sync: Progress bar matches actual video playback length
 * - Quick Emoji Reactions: Floating reaction animations & instant engagement
 * - Story Management: Share story, explore in feed, and delete options menu
 * - Swipe-Up for Viewers: Quick upward swipe to view audience metrics
 */
const VibeStoryViewerModal = ({
  visible,
  onClose,
  groups = [],
  initialGroupIndex = 0,
  stories = [],
  groupTitle = "SGV Campus Story",
  initialIndex = 0,
}) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { isSlow } = useNetworkQuality();

  // Normalize input into an array of story groups
  const normalizedGroups = useMemo(() => {
    if (Array.isArray(groups) && groups.length > 0) {
      return groups;
    }
    if (Array.isArray(stories) && stories.length > 0) {
      return [
        {
          id: "default-group",
          title: groupTitle,
          stories,
        },
      ];
    }
    return [];
  }, [groups, stories, groupTitle]);

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex || 0);
  const [storyIndex, setStoryIndex] = useState(initialIndex || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [activeCommentVibe, setActiveCommentVibe] = useState(null);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [isLikedLocally, setIsLikedLocally] = useState(false);
  const [likesCountLocally, setLikesCountLocally] = useState(0);
  const [detectedVideoDuration, setDetectedVideoDuration] = useState(null);
  const [isMuted, setIsMuted] = useState(getGlobalMuted());
  const [floatingReaction, setFloatingReaction] = useState("❤️");

  // Controls fade animation on press-and-hold (clean full-screen view)
  const controlsOpacity = useSharedValue(1);

  // Gesture transformation shared values for pull down dismiss & horizontal swipe
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Floating heart/emoji animation state
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const viewedIdsRef = useRef(new Set());

  // Reset state when modal opens or initial indexes change
  useEffect(() => {
    if (visible) {
      const validGroupIdx = Math.min(
        Math.max(initialGroupIndex || 0, 0),
        Math.max(normalizedGroups.length - 1, 0)
      );
      const groupStories = normalizedGroups[validGroupIdx]?.stories || [];
      const validStoryIdx = Math.min(
        Math.max(initialIndex || 0, 0),
        Math.max(groupStories.length - 1, 0)
      );

      setGroupIndex(validGroupIdx);
      setStoryIndex(validStoryIdx);
      setIsPaused(false);
      setShowViewersModal(false);
      setShowMenuModal(false);
      setMediaLoaded(false);
      setDetectedVideoDuration(null);
      translateY.value = 0;
      translateX.value = 0;
      scale.value = 1;
      controlsOpacity.value = 1;
    }
  }, [
    visible,
    initialGroupIndex,
    initialIndex,
    normalizedGroups,
    controlsOpacity,
    scale,
    translateX,
    translateY,
  ]);

  const currentGroup =
    normalizedGroups[groupIndex] || normalizedGroups[0] || null;
  const activeStories = useMemo(
    () => currentGroup?.stories || [],
    [currentGroup?.stories]
  );
  const currentVibe = activeStories[storyIndex] || activeStories[0] || null;

  // Permissions: Super Admin, Admin, or the story author can see who viewed / delete
  const isSuperAdminOrAdmin =
    user?.role === "super admin" || user?.role === "admin";
  const isStoryAuthor = !!(
    user?.userId &&
    currentVibe?.author?._id &&
    String(user.userId) === String(currentVibe.author._id)
  );
  const canViewStoryViewers = isSuperAdminOrAdmin || isStoryAuthor;
  const canModerate = isSuperAdminOrAdmin || isStoryAuthor;

  // Sync local like state with current vibe
  useEffect(() => {
    if (currentVibe) {
      setIsLikedLocally(!!currentVibe.isLiked);
      setLikesCountLocally(currentVibe.likesCount || 0);
      setMediaLoaded(false);
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

  // Delete Mutation
  const deleteMutation = useApiMutation({
    mutationFn: async (vibeId) => {
      return createApiMutationFn(
        `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.delete(vibeId)}`,
        "DELETE"
      )({});
    },
    onSuccess: () => {
      showToast("Story deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      handleNext();
    },
    onError: (err) => {
      showToast(err?.message || "Failed to delete story", "error");
    },
  });

  const triggerFloatingReaction = useCallback(
    (reaction = "❤️") => {
      setFloatingReaction(reaction);
      heartScale.value = 0.5;
      heartOpacity.value = 1;
      heartScale.value = withSequence(
        withSpring(1.35, { damping: 10, stiffness: 300 }),
        withTiming(1, { duration: 150 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 300 })
      );
    },
    [heartScale, heartOpacity]
  );

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
      triggerFloatingReaction("❤️");
    }

    likeMutation.mutate(currentVibe._id);
  }, [
    isAuthenticated,
    currentVibe,
    isLikedLocally,
    showToast,
    triggerFloatingReaction,
    likeMutation,
  ]);

  const handleQuickReaction = useCallback(
    (reaction) => {
      if (!isAuthenticated) {
        showToast("Please log in to react to vibes", "info");
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      triggerFloatingReaction(reaction);

      if (!isLikedLocally && currentVibe?._id) {
        setIsLikedLocally(true);
        setLikesCountLocally((prev) => prev + 1);
        likeMutation.mutate(currentVibe._id);
      }
    },
    [
      isAuthenticated,
      showToast,
      triggerFloatingReaction,
      isLikedLocally,
      currentVibe,
      likeMutation,
    ]
  );

  // Advance to next story slide or next group (Continuous Playback)
  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (storyIndex < activeStories.length - 1) {
      // Advance to next story in current group
      setStoryIndex((prev) => prev + 1);
      setDetectedVideoDuration(null);
    } else if (groupIndex < normalizedGroups.length - 1) {
      // Seamlessly transition to next author/group in tray!
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setDetectedVideoDuration(null);
    } else {
      // Reached the end of all campus stories
      handleClose();
    }
  }, [
    storyIndex,
    activeStories.length,
    groupIndex,
    normalizedGroups.length,
    handleClose,
  ]);

  // Go to previous story slide or previous group
  const handlePrevious = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setDetectedVideoDuration(null);
    } else if (groupIndex > 0) {
      const prevGroup = normalizedGroups[groupIndex - 1];
      const prevStories = prevGroup?.stories || [];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(Math.max(prevStories.length - 1, 0));
      setDetectedVideoDuration(null);
    }
  }, [storyIndex, groupIndex, normalizedGroups]);

  // Jump to next group on horizontal swipe
  const handleNextGroup = useCallback(() => {
    if (groupIndex < normalizedGroups.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setDetectedVideoDuration(null);
    } else {
      handleClose();
    }
  }, [groupIndex, normalizedGroups.length, handleClose]);

  // Jump to previous group on horizontal swipe
  const handlePreviousGroup = useCallback(() => {
    if (groupIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(0);
      setDetectedVideoDuration(null);
    }
  }, [groupIndex]);

  // Press and hold anywhere pauses and fades out overlays for a clean view
  const handlePressIn = () => {
    setIsPaused(true);
    controlsOpacity.value = withTiming(0, { duration: 150 });
  };

  const handlePressOut = () => {
    setIsPaused(false);
    controlsOpacity.value = withTiming(1, { duration: 150 });
  };

  // Direct responsive tap zones
  const handleTouchZonePress = useCallback(
    (isRightSide) => {
      if (isRightSide) {
        handleNext();
      } else {
        handlePrevious();
      }
    },
    [handleNext, handlePrevious]
  );

  const handleOpenInFeed = useCallback(() => {
    handleClose();
    router.push({
      pathname: "/vibes",
      params: currentVibe?.category
        ? { category: currentVibe.category }
        : undefined,
    });
  }, [handleClose, router, currentVibe]);

  const handleShareStory = useCallback(async () => {
    if (!currentVibe) return;
    try {
      const APP_DOWNLOAD_URL =
        "https://play.google.com/store/apps/details?id=com.sgvschool.app";
      const authorText =
        currentVibe.postAs === "school"
          ? "SGV Official"
          : formatUserName(currentVibe.author?.name || "Campus");
      const shareMessage = `Check out this Story by ${authorText} on SGV School App!\n${
        currentVibe.caption ? `"${currentVibe.caption}"\n` : ""
      }${APP_DOWNLOAD_URL}`;

      await Share.share({
        message: shareMessage,
        title: "Campus Moment",
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  }, [currentVibe]);

  const handleDeleteStory = useCallback(() => {
    if (!currentVibe?._id) return;
    Alert.alert(
      "Delete Story",
      "Are you sure you want to delete this campus story? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setIsPaused(false),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(currentVibe._id);
          },
        },
      ]
    );
  }, [currentVibe, deleteMutation]);

  const toggleSound = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setGlobalMuted(nextMuted);
  }, [isMuted]);

  const openViewersFromSwipe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsPaused(true);
    setShowViewersModal(true);
  }, []);

  // Aggressive 2-slide ahead image prefetching
  useEffect(() => {
    if (!visible || activeStories.length <= 1) return;
    [1, 2].forEach((offset) => {
      const nextIdx = storyIndex + offset;
      if (nextIdx < activeStories.length) {
        const nextMedia = activeStories[nextIdx]?.images?.[0];
        if (nextMedia && nextMedia.type !== "video" && nextMedia.url) {
          const nextUrl = getFeedImageUrl(nextMedia.url, { isSlow });
          Image.prefetch(nextUrl);
        }
      }
    });
  }, [visible, storyIndex, activeStories, isSlow]);

  // ── Gestures: Swipe down to dismiss, Swipe up for viewers, Horizontal swipe for groups ──
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          // Pull down to dismiss gesture
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
            translateY.value = withTiming(
              SCREEN_HEIGHT,
              { duration: 200 },
              () => {
                runOnJS(handleClose)();
              }
            );
          } else if (
            canViewStoryViewers &&
            (e.translationY < -80 || e.velocityY < -600) &&
            Math.abs(e.translationY) > Math.abs(e.translationX)
          ) {
            // Swipe UP -> open Viewers modal (Instagram-style!)
            runOnJS(openViewersFromSwipe)();
          } else if (e.translationX < -60 || e.velocityX < -500) {
            // Swiped left -> next story group
            translateX.value = withTiming(0, { duration: 150 });
            runOnJS(handleNextGroup)();
          } else if (e.translationX > 60 || e.velocityX > 500) {
            // Swiped right -> previous story group
            translateX.value = withTiming(0, { duration: 150 });
            runOnJS(handlePreviousGroup)();
          } else {
            // Spring back to center
            translateY.value = withSpring(0, { damping: 15 });
            translateX.value = withSpring(0, { damping: 15 });
            scale.value = withSpring(1, { damping: 15 });
          }
        }),
    [
      canViewStoryViewers,
      handleClose,
      handleNextGroup,
      handlePreviousGroup,
      openViewersFromSwipe,
      scale,
      translateX,
      translateY,
    ]
  );

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

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
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
    currentGroup?.badgeColor ||
    (currentVibe.category === "achievement"
      ? "#D97706"
      : currentVibe.category === "sports"
      ? "#059669"
      : currentVibe.category === "arts"
      ? "#7C3AED"
      : currentVibe.category === "life"
      ? "#0284C7"
      : currentVibe.category === "official"
      ? "#2563EB"
      : currentVibe.postAs === "school"
      ? "#2563EB"
      : "#10B981");

  const authorDisplayName =
    currentVibe.postAs === "school"
      ? "SGV Official"
      : currentGroup?.title ||
        formatUserName(currentVibe.author?.name || groupTitle);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar style="light" />
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
                    disableTapControls={true}
                    onDurationDetected={(dur) => setDetectedVideoDuration(dur)}
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

              {/* Floating Heart / Reaction animation */}
              <Animated.View
                style={[styles.floatingHeartContainer, heartAnimatedStyle]}
                pointerEvents="none"
              >
                {floatingReaction === "❤️" ? (
                  <MaterialIcons name="favorite" size={96} color="#EF4444" />
                ) : (
                  <Text style={{ fontSize: 80 }}>{floatingReaction}</Text>
                )}
              </Animated.View>
            </View>

            {/* 2. Top Navigation Overlays: Progress Bars + Header */}
            <Animated.View
              style={[styles.topControls, controlsAnimatedStyle]}
              pointerEvents={isPaused ? "none" : "auto"}
            >
              {/* Segmented Progress Bars (Synchronized to exact video length) */}
              <View style={styles.progressBarsRow}>
                {activeStories.map((_, idx) => (
                  <StoryProgressBar
                    key={`${currentGroup?.id || "grp"}-${idx}`}
                    index={idx}
                    currentIndex={storyIndex}
                    isPaused={
                      isPaused ||
                      !!activeCommentVibe ||
                      showViewersModal ||
                      showMenuModal
                    }
                    isMediaLoaded={isVideo || mediaLoaded}
                    durationMs={
                      isVideo && detectedVideoDuration && detectedVideoDuration > 0
                        ? detectedVideoDuration
                        : STORY_DURATION_MS
                    }
                    onSegmentComplete={handleNext}
                  />
                ))}
              </View>

              {/* Author Header Row */}
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

                  <View style={{ flexShrink: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.authorNameText} numberOfLines={1}>
                        {authorDisplayName}
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

                {/* Right Action Icons: Sound toggle, Options Menu & Close */}
                <View style={styles.headerActionsRight}>
                  {isVideo && (
                    <Pressable
                      onPress={toggleSound}
                      style={({ pressed }) => [
                        styles.headerIconBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isMuted ? "Unmute story video" : "Mute story video"
                      }
                    >
                      <MaterialIcons
                        name={isMuted ? "volume-off" : "volume-up"}
                        size={20}
                        color="#fff"
                      />
                    </Pressable>
                  )}

                  {/* 3-Dots More Options Menu */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      ).catch(() => {});
                      setIsPaused(true);
                      setShowMenuModal(true);
                    }}
                    style={({ pressed }) => [
                      styles.headerIconBtn,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="More options"
                  >
                    <MaterialIcons name="more-vert" size={20} color="#fff" />
                  </Pressable>

                  {/* Close Button */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      ).catch(() => {});
                      handleClose();
                    }}
                    style={({ pressed }) => [
                      styles.headerIconBtn,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Close story"
                  >
                    <MaterialIcons name="close" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </Animated.View>

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

            {/* 4. Bottom Controls: Caption + Quick Emoji Reactions + Bottom Actions */}
            <Animated.View
              style={[styles.bottomControls, controlsAnimatedStyle]}
              pointerEvents={isPaused ? "none" : "auto"}
            >
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

              {/* Quick Reactions Bar (Instagram / WhatsApp Style) */}
              <View style={styles.quickReactionsRow}>
                {QUICK_REACTION_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => handleQuickReaction(emoji)}
                    style={({ pressed }) => [
                      styles.emojiButton,
                      { transform: [{ scale: pressed ? 1.25 : 1 }] },
                    ]}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`React with ${emoji}`}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.actionsRow}>
                {/* Like Button */}
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
                    size={22}
                    color={isLikedLocally ? "#EF4444" : "#fff"}
                  />
                  <Text style={styles.actionCountText}>
                    {likesCountLocally}
                  </Text>
                </Pressable>

                {/* Comments Button */}
                <Pressable
                  onPress={() => {
                    setIsPaused(true);
                    setActiveCommentVibe(currentVibe);
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name="chat-bubble-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.actionCountText}>
                    {currentVibe.commentsCount || 0}
                  </Text>
                </Pressable>

                {/* Viewers Button (Super Admin, Admin, and Story Author) */}
                {canViewStoryViewers && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      ).catch(() => {});
                      setIsPaused(true);
                      setShowViewersModal(true);
                    }}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="View story viewers"
                  >
                    <MaterialIcons
                      name="expand-less"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.actionCountText}>Viewers</Text>
                  </Pressable>
                )}

                {/* Share Button */}
                <Pressable
                  onPress={handleShareStory}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Share story"
                >
                  <MaterialIcons name="share" size={20} color="#fff" />
                </Pressable>

                {/* View Full Post in Feed Button */}
                <Pressable
                  onPress={handleOpenInFeed}
                  style={({ pressed }) => [
                    styles.viewInFeedBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.viewInFeedText}>Feed</Text>
                  <MaterialIcons name="arrow-forward" size={14} color="#fff" />
                </Pressable>
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Comments Bottom Sheet Modal */}
      {activeCommentVibe && (
        <VibeCommentsModal
          visible={!!activeCommentVibe}
          onClose={() => {
            setActiveCommentVibe(null);
            setIsPaused(false);
          }}
          vibe={activeCommentVibe}
        />
      )}

      {/* Story Viewers Bottom Sheet Modal */}
      {showViewersModal && currentVibe?._id && (
        <VibeViewersModal
          visible={showViewersModal}
          onClose={() => {
            setShowViewersModal(false);
            setIsPaused(false);
          }}
          vibeId={currentVibe._id}
        />
      )}

      {/* Story Overflow Options Menu Modal */}
      {showMenuModal && (
        <Modal
          visible={showMenuModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowMenuModal(false);
            setIsPaused(false);
          }}
        >
          <Pressable
            style={styles.menuModalBackdrop}
            onPress={() => {
              setShowMenuModal(false);
              setIsPaused(false);
            }}
          >
            <View style={styles.menuSheetContainer}>
              <View style={styles.sheetHandle} />

              <Pressable
                onPress={() => {
                  setShowMenuModal(false);
                  setIsPaused(false);
                  handleShareStory();
                }}
                style={styles.menuItem}
              >
                <MaterialIcons name="share" size={22} color="#fff" />
                <Text style={styles.menuItemText}>Share Story</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowMenuModal(false);
                  handleOpenInFeed();
                }}
                style={styles.menuItem}
              >
                <MaterialIcons name="open-in-new" size={22} color="#fff" />
                <Text style={styles.menuItemText}>Explore in Campus Feed</Text>
              </Pressable>

              {canModerate && (
                <Pressable
                  onPress={() => {
                    setShowMenuModal(false);
                    handleDeleteStory();
                  }}
                  style={[styles.menuItem, styles.menuItemDestructive]}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={22}
                    color="#EF4444"
                  />
                  <Text style={[styles.menuItemText, { color: "#EF4444" }]}>
                    Delete Story
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  setShowMenuModal(false);
                  setIsPaused(false);
                }}
                style={styles.menuCancelBtn}
              >
                <Text style={styles.menuCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
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
    flex: 1,
    marginRight: 8,
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
  headerActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
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
    bottom: Platform.OS === "ios" ? 34 : 20,
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
  quickReactionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  emojiButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emojiText: {
    fontSize: 22,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  actionCountText: {
    color: "#fff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  viewInFeedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: "auto",
  },
  viewInFeedText: {
    color: "#fff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  menuModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  menuSheetContainer: {
    backgroundColor: "#18181B",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 38 : 22,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  menuItemDestructive: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  menuCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
  },
  menuCancelText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});

export default memo(VibeStoryViewerModal);
