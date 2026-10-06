import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FONTS, FONT_SIZES } from "../../theme";
import VibeVideoPlayer from "./VibeVideoPlayer";
import {
  getBlurPlaceholderUrl,
  getVideoPosterUrl,
  isVideoUrl,
} from "../../utils/cloudinaryUpload";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Single Pinchable Zoomable Image Item for Fullscreen Lightbox
 */
const ZoomableImageItem = React.memo(
  ({
    imageUrl,
    onDismiss,
    onDoubleTapLike,
    width = SCREEN_WIDTH,
    height = SCREEN_HEIGHT,
  }) => {
    const [loading, setLoading] = useState(true);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const dismissTranslateY = useSharedValue(0);

    const resetTransform = useCallback(() => {
      "worklet";
      scale.value = withSpring(1, { damping: 15 });
      savedScale.value = 1;
      translateX.value = withSpring(0, { damping: 15 });
      translateY.value = withSpring(0, { damping: 15 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      dismissTranslateY.value = withSpring(0, { damping: 15 });
    }, [
      scale,
      savedScale,
      translateX,
      translateY,
      savedTranslateX,
      savedTranslateY,
      dismissTranslateY,
    ]);

    const doubleTapGesture = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd(() => {
        if (scale.value > 1.2) {
          resetTransform();
        } else {
          scale.value = withSpring(2.5, { damping: 14, stiffness: 120 });
          savedScale.value = 2.5;
        }
        if (onDoubleTapLike) {
          runOnJS(onDoubleTapLike)();
        }
      });

    const pinchGesture = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = Math.max(0.8, Math.min(savedScale.value * e.scale, 4.5));
      })
      .onEnd(() => {
        if (scale.value < 1) {
          resetTransform();
        } else if (scale.value > 4) {
          scale.value = withSpring(4, { damping: 14 });
          savedScale.value = 4;
        } else {
          savedScale.value = scale.value;
        }
      });

    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        if (scale.value > 1.05) {
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        } else {
          if (e.translationY > 0) {
            dismissTranslateY.value = e.translationY;
          }
        }
      })
      .onEnd((e) => {
        if (scale.value > 1.05) {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        } else {
          if (dismissTranslateY.value > 120 || e.velocityY > 600) {
            dismissTranslateY.value = withTiming(
              SCREEN_HEIGHT,
              { duration: 200 },
              () => {
                if (onDismiss) runOnJS(onDismiss)();
              }
            );
          } else {
            dismissTranslateY.value = withSpring(0, { damping: 15 });
          }
        }
      });

    const composedGestures = Gesture.Race(
      doubleTapGesture,
      Gesture.Simultaneous(pinchGesture, panGesture)
    );

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + dismissTranslateY.value },
        { scale: scale.value },
      ],
    }));

    return (
      <View style={[styles.slideContainer, { width, height }]}>
        {loading && (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={[styles.zoomableWrapper, animatedStyle]}>
            <Image
              source={{ uri: imageUrl }}
              placeholder={
                imageUrl ? { uri: getBlurPlaceholderUrl(imageUrl) } : undefined
              }
              style={styles.fullImage}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
              onLoadEnd={() => setLoading(false)}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);
ZoomableImageItem.displayName = "ZoomableImageItem";

/**
 * VibeMediaViewerModal — Universal Fullscreen Media Lightbox for Vibes
 *
 * Ground-up rewrite solving:
 * 1. Image & Video failures on iPhones, Android, and Web browsers.
 * 2. Multi-item carousels with swipeable pager, index dots, and counter ("2 / 5").
 * 3. Pinch-to-zoom & double-tap zoom for photos.
 * 4. Video player integration with audio toggle, play/pause, and looping.
 * 5. Pull-down dismiss gesture and Material 3 close button.
 */
export default function VibeMediaViewerModal({
  visible,
  media = [],
  initialIndex = 0,
  onClose,
  authorName = "",
  onDoubleTapLike,
}) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const flatListRef = useRef(null);

  // Normalize media into standardized items
  const normalizedMedia = useMemo(() => {
    if (!Array.isArray(media) || media.length === 0) return [];
    return media.map((item) => {
      if (typeof item === "string") {
        const isVid = isVideoUrl(item);
        return {
          type: isVid ? "video" : "image",
          url: item,
          thumbnailUrl: isVid ? getVideoPosterUrl(item) : "",
          aspectRatio: isVid ? 0.562 : 1,
        };
      }
      const rawUrl = item?.url || item?.thumbnailUrl || "";
      const isVid =
        item?.type === "video" ||
        isVideoUrl(rawUrl) ||
        (typeof item?.thumbnailUrl === "string" && isVideoUrl(item.thumbnailUrl));
      return {
        type: isVid ? "video" : "image",
        url: item.url || rawUrl,
        thumbnailUrl:
          item.thumbnailUrl || (isVid ? getVideoPosterUrl(item.url) : ""),
        aspectRatio: item.aspectRatio || (isVid ? 0.562 : 1),
        duration: item.duration || 0,
      };
    });
  }, [media]);

  // Sync initial index whenever modal opens
  useEffect(() => {
    if (visible) {
      const idx = Math.min(
        Math.max(initialIndex || 0, 0),
        Math.max(normalizedMedia.length - 1, 0)
      );
      setCurrentIndex(idx);
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        } catch (_) {}
      }, 50);
    }
  }, [visible, initialIndex, normalizedMedia.length]);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (typeof onClose === "function") {
      onClose();
    }
  }, [onClose]);

  const handleMomentumScrollEnd = useCallback((e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const nextIdx = Math.round(offsetX / SCREEN_WIDTH);
    if (nextIdx >= 0) {
      setCurrentIndex(nextIdx);
    }
  }, []);

  const renderMediaItem = useCallback(
    ({ item, index }) => {
      const isCurrent = index === currentIndex;

      if (item.type === "video") {
        return (
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
            <VibeVideoPlayer
              url={item.url}
              thumbnailUrl={item.thumbnailUrl}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              aspectRatio={item.aspectRatio}
              isVisible={visible && isCurrent}
              isActiveSlide={isCurrent}
              onDoubleTapLike={onDoubleTapLike}
              disableTapControls={false}
            />
          </View>
        );
      }

      return (
        <ZoomableImageItem
          imageUrl={item.url}
          onDismiss={handleDismiss}
          onDoubleTapLike={onDoubleTapLike}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
        />
      );
    },
    [currentIndex, visible, handleDismiss, onDoubleTapLike]
  );

  if (!visible || normalizedMedia.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <StatusBar style="light" />

        {/* Top Header Bar */}
        <View
          style={[
            styles.headerBar,
            {
              top: Math.max(insets.top, Platform.OS === "ios" ? 14 : 10),
            },
          ]}
        >
          {/* Left: Author Info & Counter */}
          <View style={styles.headerLeft}>
            {authorName ? (
              <Text style={styles.authorTitle} numberOfLines={1}>
                {authorName}
              </Text>
            ) : null}
            {normalizedMedia.length > 1 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {normalizedMedia.length}
                </Text>
              </View>
            )}
          </View>

          {/* Right: Close Button (Accessible 44pt touch target) */}
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close media viewer"
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={26} color="#ffffff" />
          </Pressable>
        </View>

        {/* Swipeable Media Pager */}
        <FlatList
          ref={flatListRef}
          data={normalizedMedia}
          keyExtractor={(_, idx) => `media_lightbox_${idx}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderMediaItem}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          initialScrollIndex={
            currentIndex < normalizedMedia.length ? currentIndex : 0
          }
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews={Platform.OS !== "web"}
          style={styles.pager}
        />

        {/* Bottom Pagination Dots (If multiple items) */}
        {normalizedMedia.length > 1 && (
          <View
            style={[
              styles.dotsContainer,
              { bottom: Math.max(insets.bottom, 20) },
            ]}
          >
            {normalizedMedia.map((_, idx) => (
              <View
                key={`dot_${idx}`}
                style={[
                  styles.dot,
                  idx === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000",
  },
  headerBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 16,
  },
  authorTitle: {
    color: "#ffffff",
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  counterBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  counterText: {
    color: "#ffffff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  pager: {
    flex: 1,
  },
  slideContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  zoomableWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  centerLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  dotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 100,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: "#ffffff",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
});
