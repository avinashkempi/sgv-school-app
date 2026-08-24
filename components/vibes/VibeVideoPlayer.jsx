import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getOptimizedVideoUrl, getVideoPosterUrl } from '../../utils/cloudinaryUpload';

// Global mute state across the app session (Instagram pattern)
let globalIsMuted = true;
const muteListeners = new Set();
const setGlobalMuted = (muted) => {
  globalIsMuted = muted;
  muteListeners.forEach(listener => listener(muted));
};

/**
 * VibeVideoPlayer — High-performance viewport-aware video player for Vibes.
 * Uses expo-video native hardware player with automatic pause/play and global audio control.
 *
 * @param {string} url - Cloudinary video stream URL
 * @param {string} [thumbnailUrl] - Poster image URL
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @param {boolean} isVisible - Whether this video card is centered in viewport
 * @param {boolean} [isActiveSlide=true] - Whether this slide is active in carousel
 * @param {Function} [onDoubleTapLike] - Double-tap heart trigger
 */
const VibeVideoPlayer = React.memo(({
  url,
  thumbnailUrl,
  width,
  height,
  isVisible,
  isActiveSlide = true,
  onDoubleTapLike,
}) => {
  const [isMuted, setIsMuted] = useState(globalIsMuted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const lastTapRef = useRef(0);
  const playOverlayOpacity = useSharedValue(0);
  const muteBadgeOpacity = useSharedValue(0);

  // Optimized video streaming URL & Poster URL
  const videoSource = useMemo(() => getOptimizedVideoUrl(url), [url]);
  const posterUrl = useMemo(() => getVideoPosterUrl(url, thumbnailUrl), [url, thumbnailUrl]);

  // Sync with global mute changes from other cards
  useEffect(() => {
    const onMuteChange = (muted) => {
      setIsMuted(muted);
    };
    muteListeners.add(onMuteChange);
    return () => muteListeners.delete(onMuteChange);
  }, []);

  // Initialize native expo-video player
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  // Sync mute state to native player
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [player, isMuted]);

  // Viewport & Active Slide Playback Controller (Instagram Pattern)
  useEffect(() => {
    if (!player) return;

    if (isVisible && isActiveSlide) {
      try {
        player.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Video play error:', err);
      }
    } else {
      try {
        player.pause();
        setIsPlaying(false);
      } catch (err) {
        console.warn('Video pause error:', err);
      }
    }
  }, [player, isVisible, isActiveSlide]);

  // Listen to player status
  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        setIsReady(true);
      }
      setIsPlaying(player.playing);
    });

    const playToEndSub = player.addListener('playToEnd', () => {
      if (player.loop) {
        player.replay();
      }
    });

    return () => {
      statusSub?.remove?.();
      playToEndSub?.remove?.();
    };
  }, [player]);

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

  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double Tap -> Heart Burst
      if (onDoubleTapLike) {
        onDoubleTapLike();
      }
    } else {
      // Single Tap -> Toggle Mute (Instagram behavior) or Play/Pause
      toggleMute();
    }
    lastTapRef.current = now;
  }, [onDoubleTapLike, toggleMute]);

  const playOverlayStyle = useAnimatedStyle(() => ({
    opacity: playOverlayOpacity.value,
    transform: [{ scale: playOverlayOpacity.value }],
  }));

  const muteBadgeStyle = useAnimatedStyle(() => ({
    opacity: muteBadgeOpacity.value,
  }));

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Poster Image shown until video is buffered & ready, or when off-screen */}
      {(!isReady || !isVisible) && (
        <Image
          source={{ uri: posterUrl }}
          style={[StyleSheet.absoluteFill, styles.posterImage]}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      )}

      {/* Native expo-video View */}
      {isVisible && (
        <Pressable
          onPress={handlePress}
          onLongPress={togglePlayPause}
          delayLongPress={250}
          style={[styles.videoWrapper, { width, height }]}
        >
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
            allowsFullscreen={false}
          />
        </Pressable>
      )}

      {/* Play / Pause Centered Overlay Animation */}
      {showPlayOverlay && (
        <Animated.View pointerEvents="none" style={[styles.centerOverlay, playOverlayStyle]}>
          <View style={styles.iconCircle}>
            <MaterialIcons
              name={isPlaying ? 'play-arrow' : 'pause'}
              size={36}
              color="#fff"
            />
          </View>
        </Animated.View>
      )}

      {/* Center Sound Toggle Toast (Instagram Style) */}
      <Animated.View pointerEvents="none" style={[styles.centerOverlay, muteBadgeStyle]}>
        <View style={styles.iconCircle}>
          <MaterialIcons
            name={isMuted ? 'volume-off' : 'volume-up'}
            size={32}
            color="#fff"
          />
        </View>
      </Animated.View>

      {/* Bottom-Right Audio Button */}
      <Pressable
        onPress={toggleMute}
        hitSlop={12}
        style={styles.muteButton}
      >
        <MaterialIcons
          name={isMuted ? 'volume-off' : 'volume-up'}
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
      {isVisible && !isReady && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  );
});

VibeVideoPlayer.displayName = 'VibeVideoPlayer';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  videoWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  videoBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    zIndex: 10,
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 5,
  },
});

export default VibeVideoPlayer;
