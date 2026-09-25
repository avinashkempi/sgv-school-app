import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  getBlurPlaceholderUrl,
} from "../../utils/cloudinaryUpload";
import useNetworkQuality from "../../hooks/useNetworkQuality";
import { FONTS, FONT_SIZES, LETTER_SPACINGS } from "../../theme";
import useDoubleTap from "../../hooks/useDoubleTap";

// Global mute state across the app session (Instagram pattern)
let globalIsMuted = true;
const muteListeners = new Set();
export const setGlobalMuted = (muted) => {
  globalIsMuted = muted;
  muteListeners.forEach((listener) => listener(muted));
};
export const getGlobalMuted = () => globalIsMuted;

/**
 * VibeVideoPlayer — Viewport-aware video player for Vibes.
 * Uses native expo-video with automatic pause/play, adaptive streaming quality,
 * ambient blurred letterbox backdrop, and smooth playback.
 *
 * @param {string} url - Cloudinary video stream URL
 * @param {string} [thumbnailUrl] - Poster image URL
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @param {boolean} isVisible - Whether this video card is in viewport
 * @param {boolean} [isActiveSlide=true] - Whether this slide is active in carousel
 * @param {Function} [onDoubleTapLike] - Double-tap heart trigger
 * @param {boolean} [disableTapControls=false] - Disable internal taps for story viewer navigation
 * @param {Function} [onDurationDetected] - Callback with duration in ms
 */
const VibeVideoPlayer = React.memo(
  ({
    url,
    thumbnailUrl,
    width,
    height,
    aspectRatio,
    isVisible,
    isActiveSlide = true,
    onDoubleTapLike,
    disableTapControls = false,
    onDurationDetected,
    onDimensionsDetected,
  }) => {
    const { isSlow } = useNetworkQuality();
    const [isMuted, setIsMuted] = useState(globalIsMuted);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlayOverlay, setShowPlayOverlay] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [naturalRatio, setNaturalRatio] = useState(
      aspectRatio && aspectRatio > 0 ? aspectRatio : null
    );

    useEffect(() => {
      if (aspectRatio && aspectRatio > 0) {
        setNaturalRatio((prev) =>
          !prev || Math.abs(aspectRatio - prev) > 0.05 ? aspectRatio : prev
        );
      }
    }, [aspectRatio]);

    const playOverlayOpacity = useSharedValue(0);
    const muteBadgeOpacity = useSharedValue(0);

    // Optimized adaptive video streaming URL & Poster URL
    const videoSource = useMemo(
      () => (url ? getOptimizedVideoUrl(url, { isSlow }) : null),
      [url, isSlow]
    );
    const posterUrl = useMemo(
      () => getVideoPosterUrl(url, thumbnailUrl),
      [url, thumbnailUrl]
    );
    const posterBlurUrl = useMemo(
      () => (posterUrl ? getBlurPlaceholderUrl(posterUrl) : ""),
      [posterUrl]
    );

    // Compute exact video render dimensions within container { width, height }
    const effectiveRatio =
      naturalRatio ||
      aspectRatio ||
      (width && height ? width / height : 0.562);

    const { renderWidth, renderHeight } = useMemo(() => {
      if (!width || !height || !effectiveRatio || effectiveRatio <= 0) {
        return { renderWidth: width, renderHeight: height };
      }
      const containerRatio = width / height;
      if (effectiveRatio > containerRatio) {
        // Video is wider than container: fits container width, height adjusted to aspect ratio
        const w = width;
        const h = Math.min(height, Math.round(width / effectiveRatio));
        return { renderWidth: w, renderHeight: h };
      } else {
        // Video is taller than container: fits container height, width adjusted to aspect ratio
        const h = height;
        const w = Math.min(width, Math.round(height * effectiveRatio));
        return { renderWidth: w, renderHeight: h };
      }
    }, [width, height, effectiveRatio]);

    // Pass videoSource directly so native player allocates once and doesn't get destroyed on every scroll
    const player = useVideoPlayer(videoSource, (p) => {
      p.loop = true;
      p.muted = globalIsMuted;
    });

    // Sync with global mute changes from other cards
    useEffect(() => {
      const onMuteChange = (muted) => {
        setIsMuted(muted);
        if (player) {
          player.muted = muted;
        }
      };
      muteListeners.add(onMuteChange);
      return () => muteListeners.delete(onMuteChange);
    }, [player]);

    // Sync mute state to native player
    useEffect(() => {
      if (player) {
        player.muted = isMuted;
      }
    }, [player, isMuted]);

    // Viewport & Active Slide Playback Controller
    useEffect(() => {
      if (!player) return;

      if (isVisible && isActiveSlide) {
        try {
          player.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn("Video play error:", err);
        }
      } else {
        try {
          player.pause();
          setIsPlaying(false);
        } catch (err) {
          console.warn("Video pause error:", err);
        }
      }
    }, [player, isVisible, isActiveSlide]);

    // Listen to player status and video dimensions
    useEffect(() => {
      if (!player) return;

      // Check current status immediately in case it loaded before listener
      if (player.status === "readyToPlay") {
        setIsReady(true);
        if (player.duration && player.duration > 0) {
          onDurationDetected?.(player.duration * 1000);
        }
      }
      if (player.playing) {
        setIsPlaying(true);
        setIsReady(true);
      }

      const statusSub = player.addListener("statusChange", (status) => {
        if (status.status === "readyToPlay") {
          setIsReady(true);
          if (player.duration && player.duration > 0) {
            onDurationDetected?.(player.duration * 1000);
          }
        }
        setIsPlaying(player.playing);
      });

      const playingSub = player.addListener?.("playingChange", (payload) => {
        setIsPlaying(payload.isPlaying);
        if (payload.isPlaying) {
          setIsReady(true);
        }
      });

      const videoTrackSub = player.addListener?.("videoTrackChange", (payload) => {
        const size = payload?.videoTrack?.size;
        if (size?.width && size?.height) {
          const r = Number((size.width / size.height).toFixed(3));
          if (r > 0 && isFinite(r)) {
            setNaturalRatio(r);
            onDimensionsDetected?.(size.width, size.height);
          }
        }
      });

      const sourceLoadSub = player.addListener?.("sourceLoad", (payload) => {
        const size = payload?.availableVideoTracks?.[0]?.size;
        if (size?.width && size?.height) {
          const r = Number((size.width / size.height).toFixed(3));
          if (r > 0 && isFinite(r)) {
            setNaturalRatio(r);
            onDimensionsDetected?.(size.width, size.height);
          }
        }
      });

      const playToEndSub = player.addListener("playToEnd", () => {
        if (player.loop) {
          player.replay();
        }
      });

      return () => {
        statusSub?.remove?.();
        playingSub?.remove?.();
        playToEndSub?.remove?.();
        videoTrackSub?.remove?.();
        sourceLoadSub?.remove?.();
      };
    }, [player, onDurationDetected, onDimensionsDetected]);

    const triggerMuteBadge = useCallback(() => {
      muteBadgeOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 250 })
      );
    }, [muteBadgeOpacity]);

    const toggleMute = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const nextMuted = !isMuted;
      setGlobalMuted(nextMuted);
      triggerMuteBadge();
    }, [isMuted, triggerMuteBadge]);

    const togglePlayPause = useCallback(() => {
      if (!player) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
        setShowPlayOverlay(true);
        playOverlayOpacity.value = withSequence(
          withSpring(1, { damping: 10, stiffness: 350 }),
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 250 }, () => setShowPlayOverlay(false))
        );
      } else {
        player.play();
        setIsPlaying(true);
        setShowPlayOverlay(true);
        playOverlayOpacity.value = withSequence(
          withSpring(1, { damping: 10, stiffness: 350 }),
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 200 }, () => setShowPlayOverlay(false))
        );
      }
    }, [player, isPlaying, playOverlayOpacity]);

    // Double tap -> heart like, single tap -> toggle mute
    const handlePress = useDoubleTap(
      useCallback(() => {
        onDoubleTapLike?.();
      }, [onDoubleTapLike]),
      toggleMute,
      280
    );

    const playOverlayStyle = useAnimatedStyle(() => ({
      opacity: playOverlayOpacity.value,
      transform: [{ scale: playOverlayOpacity.value }],
    }));

    const muteBadgeStyle = useAnimatedStyle(() => ({
      opacity: muteBadgeOpacity.value,
    }));

    return (
      <View style={[styles.container, { width, height }]}>
        {/* Ambient blurred backdrop fills the card container behind pillarboxed/letterboxed video */}
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            blurRadius={Platform.OS === "ios" ? 30 : 16}
            cachePolicy="memory-disk"
          />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0, 0, 0, 0.55)" },
          ]}
        />

        {/* Video Stage: Perfectly sized and centered with aspect ratio preservation */}
        <View
          style={[
            styles.videoStage,
            { width: renderWidth, height: renderHeight },
          ]}
        >
          {/* Native expo-video View */}
          {player && (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls={false}
              fullscreenOptions={{ isEnabled: false }}
            />
          )}

          {/* Instant Poster Image shown until video is buffered & ready */}
          {(!isReady || !isVisible || !isActiveSlide) && (
            <Image
              source={{ uri: posterUrl }}
              placeholder={posterBlurUrl ? { uri: posterBlurUrl } : undefined}
              placeholderContentFit="contain"
              style={[StyleSheet.absoluteFill, styles.posterImage]}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
              onLoad={(e) => {
                if (!aspectRatio && e?.source?.width && e?.source?.height) {
                  const r = Number((e.source.width / e.source.height).toFixed(3));
                  if (r > 0 && isFinite(r)) {
                    if (!naturalRatio || Math.abs(r - naturalRatio) > 0.05) {
                      setNaturalRatio(r);
                      onDimensionsDetected?.(e.source.width, e.source.height);
                    }
                  }
                }
              }}
            />
          )}
        </View>

        {/* Full-width touch overlay to handle single-tap mute and double-tap like across the entire card */}
        {!disableTapControls ? (
          <Pressable
            onPress={handlePress}
            onLongPress={togglePlayPause}
            delayLongPress={250}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}

        {/* Play / Pause Centered Overlay Animation */}
        {showPlayOverlay && (
          <Animated.View
            pointerEvents="none"
            style={[styles.centerOverlay, playOverlayStyle]}
          >
            <View style={styles.iconCircle}>
              <MaterialIcons
                name={isPlaying ? "play-arrow" : "pause"}
                size={36}
                color="#fff"
              />
            </View>
          </Animated.View>
        )}

        {/* Center Sound Toggle Toast (Instagram Style) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.centerOverlay, muteBadgeStyle]}
        >
          <View style={styles.iconCircle}>
            <MaterialIcons
              name={isMuted ? "volume-off" : "volume-up"}
              size={32}
              color="#fff"
            />
          </View>
        </Animated.View>

        {/* Bottom-Right Audio Button */}
        <Pressable onPress={toggleMute} hitSlop={12} style={styles.muteButton}>
          <MaterialIcons
            name={isMuted ? "volume-off" : "volume-up"}
            size={18}
            color="#fff"
          />
        </Pressable>

        {/* Video Indicator Pill */}
        <View style={styles.videoBadge}>
          <MaterialIcons name="videocam" size={13} color="#fff" />
          <Text style={styles.videoBadgeText}>VIDEO</Text>
        </View>

        {/* Loading Spinner */}
        {isVisible && isActiveSlide && !isReady && (
          <View pointerEvents="none" style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </View>
    );
  }
);

VibeVideoPlayer.displayName = "VibeVideoPlayer";

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "#000",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  videoStage: {
    position: "relative",
    backgroundColor: "transparent",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  posterImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  videoWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  muteButton: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  videoBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    zIndex: 10,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.xs,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    zIndex: 5,
  },
});

export default VibeVideoPlayer;
