import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image as RNImage,
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
 * Features:
 * - Cross-platform rock-solid playback on iPhones (iOS AVPlayer), Android, and Web browsers.
 * - `playsInline={true}` to prevent iOS Safari and WKWebView from blocking inline playback.
 * - Universal H.264 streaming with automatic raw URL fallback if transcoding encounters an error.
 * - Handled async promises on play/pause preventing uncaught DOMException rejections on Web browsers.
 * - Ambient blurred letterbox backdrop.
 * - Single-tap sound toggle, double-tap heart burst, long-press play/pause, or full-screen expansion.
 */
const VibeVideoPlayer = React.memo(
  ({
    url,
    thumbnailUrl,
    width,
    height,
    aspectRatio,
    isVisible = true,
    isActiveSlide = true,
    onDoubleTapLike,
    onPressMedia,
    disableTapControls = false,
    onDurationDetected,
    onDimensionsDetected,
    onReady,
    contentFit = "contain",
  }) => {
    const { isSlow } = useNetworkQuality();
    const [isMuted, setIsMuted] = useState(globalIsMuted);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlayOverlay, setShowPlayOverlay] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [useOptimizedSource, setUseOptimizedSource] = useState(true);
    const [naturalRatio, setNaturalRatio] = useState(
      aspectRatio && aspectRatio > 0 && aspectRatio !== 1 ? aspectRatio : null
    );

    useEffect(() => {
      if (aspectRatio && aspectRatio > 0 && aspectRatio !== 1) {
        setNaturalRatio((prev) =>
          !prev || Math.abs(aspectRatio - prev) > 0.05 ? aspectRatio : prev
        );
      }
    }, [aspectRatio]);

    const playOverlayOpacity = useSharedValue(0);
    const muteBadgeOpacity = useSharedValue(0);

    // Optimized adaptive video streaming URL or raw fallback URL
    const videoSource = useMemo(() => {
      if (!url) return null;
      if (useOptimizedSource) {
        return getOptimizedVideoUrl(url, { isSlow });
      }
      return url;
    }, [url, isSlow, useOptimizedSource]);

    const posterUrl = useMemo(
      () => getVideoPosterUrl(url, thumbnailUrl),
      [url, thumbnailUrl]
    );
    const posterBlurUrl = useMemo(
      () => (posterUrl ? getBlurPlaceholderUrl(posterUrl) : ""),
      [posterUrl]
    );

    // Pre-detect real video dimensions via poster image URL
    useEffect(() => {
      if (posterUrl) {
        RNImage.getSize(
          posterUrl,
          (w, h) => {
            if (w > 0 && h > 0) {
              const r = Number((w / h).toFixed(3));
              if (r > 0 && isFinite(r)) {
                setNaturalRatio((prev) =>
                  !prev || Math.abs(r - prev) > 0.05 ? r : prev
                );
                onDimensionsDetected?.(w, h);
              }
            }
          },
          () => {}
        );
      }
    }, [posterUrl, onDimensionsDetected]);

    // Compute exact video render dimensions within container { width, height }
    const effectiveRatio =
      naturalRatio ||
      (aspectRatio && aspectRatio > 0 && aspectRatio !== 1 ? aspectRatio : null) ||
      (width && height && width !== height ? width / height : null) ||
      1.778;

    const { renderWidth, renderHeight } = useMemo(() => {
      const targetW = width || 390;
      if (!effectiveRatio || effectiveRatio <= 0) {
        return { renderWidth: targetW, renderHeight: height || 220 };
      }
      const targetH = Math.round(targetW / effectiveRatio);
      return { renderWidth: targetW, renderHeight: targetH };
    }, [width, effectiveRatio, height]);

    const playerWidth = contentFit === "cover" ? width : (renderWidth || width);
    const playerHeight = contentFit === "cover" ? height : (renderHeight || height);

    // Native expo-video player instance
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

      if (isVisible && isActiveSlide && !hasError) {
        try {
          const res = player.play();
          if (res && typeof res.catch === "function") {
            res.catch(() => {});
          }
          setIsPlaying(true);
        } catch (_) {}
      } else {
        try {
          player.pause();
          setIsPlaying(false);
        } catch (_) {}
      }
    }, [player, isVisible, isActiveSlide, hasError]);

    // Listen to player status, errors, and video dimensions
    useEffect(() => {
      if (!player) return;

      const checkCurrentVideoSize = () => {
        const trackSize =
          player.videoTrack?.size ||
          player.availableVideoTracks?.[0]?.size;
        if (trackSize?.width && trackSize?.height) {
          const r = Number((trackSize.width / trackSize.height).toFixed(3));
          if (r > 0 && isFinite(r)) {
            setNaturalRatio((prev) =>
              !prev || Math.abs(r - prev) > 0.05 ? r : prev
            );
            onDimensionsDetected?.(trackSize.width, trackSize.height);
          }
        }
      };

      // Check current status immediately
      if (player.status === "readyToPlay" || player.playing) {
        setIsReady(true);
        setHasError(false);
        checkCurrentVideoSize();
        if (player.duration && player.duration > 0) {
          onDurationDetected?.(player.duration * 1000);
        }
        onReady?.();
      }

      const statusSub = player.addListener?.("statusChange", (status) => {
        if (status.status === "readyToPlay") {
          setIsReady(true);
          setHasError(false);
          checkCurrentVideoSize();
          if (player.duration && player.duration > 0) {
            onDurationDetected?.(player.duration * 1000);
          }
          onReady?.();
        } else if (status.status === "error") {
          // If optimized video URL failed, try falling back to the raw source
          if (useOptimizedSource && url) {
            setUseOptimizedSource(false);
          } else {
            setHasError(true);
          }
        }
        setIsPlaying(player.playing);
      });

      const playingSub = player.addListener?.("playingChange", (payload) => {
        setIsPlaying(payload.isPlaying);
        if (payload.isPlaying) {
          setIsReady(true);
          setHasError(false);
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

      const playToEndSub = player.addListener?.("playToEnd", () => {
        if (player.loop) {
          try {
            player.replay();
          } catch (_) {}
        }
      });

      return () => {
        statusSub?.remove?.();
        playingSub?.remove?.();
        playToEndSub?.remove?.();
        videoTrackSub?.remove?.();
        sourceLoadSub?.remove?.();
      };
    }, [
      player,
      url,
      useOptimizedSource,
      onDurationDetected,
      onDimensionsDetected,
      onReady,
    ]);

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
      setIsMuted(nextMuted);
      setGlobalMuted(nextMuted);
      if (player) {
        player.muted = nextMuted;
        if (!nextMuted && !isPlaying) {
          try {
            const res = player.play();
            if (res && typeof res.catch === "function") {
              res.catch(() => {});
            }
            setIsPlaying(true);
          } catch (_) {}
        }
      }
      triggerMuteBadge();
    }, [isMuted, player, isPlaying, triggerMuteBadge]);

    const togglePlayPause = useCallback(() => {
      if (!player) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (isPlaying) {
        try {
          player.pause();
        } catch (_) {}
        setIsPlaying(false);
        setShowPlayOverlay(true);
        playOverlayOpacity.value = withSequence(
          withSpring(1, { damping: 10, stiffness: 350 }),
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 250 }, () => setShowPlayOverlay(false))
        );
      } else {
        try {
          const res = player.play();
          if (res && typeof res.catch === "function") {
            res.catch(() => {});
          }
        } catch (_) {}
        setIsPlaying(true);
        setShowPlayOverlay(true);
        playOverlayOpacity.value = withSequence(
          withSpring(1, { damping: 10, stiffness: 350 }),
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 200 }, () => setShowPlayOverlay(false))
        );
      }
    }, [player, isPlaying, playOverlayOpacity]);

    const handleSingleTap = useCallback(() => {
      if (typeof onPressMedia === "function") {
        onPressMedia();
      } else {
        toggleMute();
      }
    }, [onPressMedia, toggleMute]);

    // Double tap -> heart like, single tap -> toggle mute / open media viewer
    const handlePress = useDoubleTap(
      useCallback(() => {
        onDoubleTapLike?.();
      }, [onDoubleTapLike]),
      handleSingleTap,
      280
    );

    const handleRetry = useCallback(() => {
      setHasError(false);
      setUseOptimizedSource(false);
      setIsReady(false);
      if (player) {
        try {
          player.replace(url);
          const res = player.play();
          if (res && typeof res.catch === "function") {
            res.catch(() => {});
          }
        } catch (_) {}
      }
    }, [player, url]);

    const playOverlayStyle = useAnimatedStyle(() => ({
      opacity: playOverlayOpacity.value,
      transform: [{ scale: playOverlayOpacity.value }],
    }));

    const muteBadgeStyle = useAnimatedStyle(() => ({
      opacity: muteBadgeOpacity.value,
    }));

    return (
      <View
        style={[
          styles.container,
          { width: playerWidth, height: playerHeight },
        ]}
      >
        {/* Ambient blurred backdrop only when covering a larger container */}
        {contentFit === "cover" && posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            blurRadius={Platform.OS === "ios" ? 30 : 16}
            cachePolicy="memory-disk"
          />
        ) : null}
        {contentFit === "cover" ? (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0, 0, 0, 0.55)" },
            ]}
          />
        ) : null}

        {/* Video Stage: Exactly matches player dimensions */}
        <View
          style={[
            styles.videoStage,
            contentFit === "cover"
              ? StyleSheet.absoluteFillObject
              : { width: playerWidth, height: playerHeight },
          ]}
        >
          {/* Native expo-video View */}
          {player && (
            <VideoView
              player={player}
              style={styles.video}
              contentFit={contentFit}
              nativeControls={false}
              playsInline={true}
              allowsPictureInPicture={false}
              fullscreenOptions={{ isEnabled: false }}
            />
          )}

          {/* Instant Poster Image shown until video is buffered & ready */}
          {(!isReady || !isVisible || !isActiveSlide) && (
            <Image
              source={{ uri: posterUrl }}
              placeholder={posterBlurUrl ? { uri: posterBlurUrl } : undefined}
              placeholderContentFit={contentFit}
              style={[StyleSheet.absoluteFill, styles.posterImage]}
              contentFit={contentFit}
              cachePolicy="memory-disk"
              transition={150}
              onLoad={(e) => {
                if (e?.source?.width && e?.source?.height) {
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

          {/* Full-width touch overlay to handle single-tap and double-tap gestures */}
          {!disableTapControls ? (
            <Pressable
              onPress={handlePress}
              onLongPress={togglePlayPause}
              delayLongPress={250}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}

          {/* Play / Pause Centered Overlay Animation — perfectly centered inside video surface */}
          {showPlayOverlay && (
            <Animated.View
              pointerEvents="none"
              style={[styles.centerOverlay, playOverlayStyle]}
            >
              <View style={styles.iconCircle}>
                <MaterialIcons
                  name={isPlaying ? "play-arrow" : "pause"}
                  size={34}
                  color="#fff"
                />
              </View>
            </Animated.View>
          )}

          {/* Center Sound Toggle Toast (Instagram Style) — perfectly centered inside video surface */}
          <Animated.View
            pointerEvents="none"
            style={[styles.centerOverlay, muteBadgeStyle]}
          >
            <View style={styles.iconCircle}>
              <MaterialIcons
                name={isMuted ? "volume-off" : "volume-up"}
                size={30}
                color="#fff"
              />
            </View>
          </Animated.View>
        </View>

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
        {isVisible && isActiveSlide && !isReady && !hasError && (
          <View pointerEvents="none" style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}

        {/* Error Fallback & Retry Pill */}
        {hasError && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={28} color="#ffffff" />
            <Text style={styles.errorText}>Video playback error</Text>
            <Pressable onPress={handleRetry} style={styles.retryButton}>
              <MaterialIcons name="refresh" size={16} color="#ffffff" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
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
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  videoStage: {
    position: "relative",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  posterImage: {
    width: "100%",
    height: "100%",
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
    zIndex: 30,
    overflow: "visible",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  muteButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 25,
  },
  videoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    zIndex: 25,
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
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    gap: 8,
    zIndex: 20,
    padding: 16,
  },
  errorText: {
    color: "#ffffff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  retryText: {
    color: "#ffffff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
});

export default VibeVideoPlayer;
