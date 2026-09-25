import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import {
  getOptimizedCloudinaryUrl,
  getBlurPlaceholderUrl,
  isVideoUrl,
  getVideoPosterUrl,
} from "../../utils/cloudinaryUpload";
import useNetworkQuality from "../../hooks/useNetworkQuality";
import useDoubleTap from "../../hooks/useDoubleTap";
import VibeVideoPlayer from "./VibeVideoPlayer";
import PinchableLightboxModal from "../ui/PinchableLightboxModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const MAX_IMAGE_HEIGHT = Math.min(SCREEN_HEIGHT * 0.65, 520);
const MIN_IMAGE_HEIGHT = 200;

/**
 * Calculates adaptive height based on the image's aspect ratio,
 * clamping between MIN_IMAGE_HEIGHT and MAX_IMAGE_HEIGHT so images fit cleanly
 * without filling the whole phone screen or creating awkward whitespace.
 */
export const calculateAdaptiveHeight = (
  aspectRatio,
  containerWidth = SCREEN_WIDTH
) => {
  if (!aspectRatio || isNaN(aspectRatio) || aspectRatio <= 0) {
    return Math.min(containerWidth, MAX_IMAGE_HEIGHT); // Default 1:1 square
  }
  const naturalHeight = containerWidth / aspectRatio;
  return Math.min(Math.max(naturalHeight, MIN_IMAGE_HEIGHT), MAX_IMAGE_HEIGHT);
};

/**
 * VibeImageCarousel — dynamic aspect-ratio responsive image/video carousel
 * with blurhash progressive loading, adjacent slide preloading, double-tap heart burst,
 * and full-screen lightbox.
 */
const VibeImageCarousel = React.memo(
  ({
    images = [],
    width = SCREEN_WIDTH,
    isVisible = false,
    onDoubleTapLike,
  }) => {
    const { colors } = useTheme();
    const { isSlow } = useNetworkQuality();
    const scrollX = useSharedValue(0);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [detectedRatio, setDetectedRatio] = useState(null);

    // Heart burst animation values
    const heartScale = useSharedValue(0);
    const heartOpacity = useSharedValue(0);

    // Format images/media array into standardized objects
    const formattedImages = useMemo(() => {
      return images.map((img) => {
        if (typeof img === "string") {
          const isVid = isVideoUrl(img);
          return {
            type: isVid ? "video" : "image",
            url: img,
            thumbnailUrl: isVid ? getVideoPosterUrl(img) : "",
            duration: 0,
            aspectRatio: isVid ? 0.562 : 1,
            width: isVid ? 720 : 1080,
            height: isVid ? 1280 : 1080,
          };
        }

        const rawUrl = img?.url || img?.thumbnailUrl || "";
        const isVid =
          img.type === "video" ||
          isVideoUrl(rawUrl) ||
          (typeof img.thumbnailUrl === "string" && isVideoUrl(img.thumbnailUrl));

        let computedRatio = img.aspectRatio;
        if (!computedRatio || computedRatio <= 0) {
          if (img.width && img.height && img.width !== img.height) {
            computedRatio = Number((img.width / img.height).toFixed(3));
          } else if (isVid) {
            computedRatio = 0.562; // Standard 9:16 vertical video default
          } else {
            computedRatio = 1;
          }
        }

        return {
          type: isVid ? "video" : "image",
          url: img.url,
          thumbnailUrl:
            img.thumbnailUrl || (isVid ? getVideoPosterUrl(img.url) : ""),
          duration: img.duration || 0,
          aspectRatio: computedRatio,
          width: img.width || (isVid ? 720 : 1080),
          height: img.height || (isVid ? 1280 : 1080),
        };
      });
    }, [images]);

    // Derive dynamic height from the first item's aspect ratio or real detected ratio
    const primaryAspectRatio =
      detectedRatio || formattedImages[0]?.aspectRatio || 1;
    const carouselHeight = useMemo(() => {
      return calculateAdaptiveHeight(primaryAspectRatio, width);
    }, [primaryAspectRatio, width]);

    // Handle real image dimension detection to refine adaptive height smoothly
    const handleDimensionsDetected = useCallback(
      (naturalWidth, naturalHeight) => {
        if (naturalWidth > 0 && naturalHeight > 0) {
          const ratio = Number((naturalWidth / naturalHeight).toFixed(3));
          if (ratio > 0 && isFinite(ratio)) {
            // Only update if significantly different from initial estimate
            if (Math.abs(ratio - primaryAspectRatio) > 0.05) {
              setDetectedRatio(ratio);
            }
          }
        }
      },
      [primaryAspectRatio]
    );

    // Preload adjacent carousel slides (2 slides ahead) for instantaneous swipe experience
    useEffect(() => {
      if (formattedImages.length <= 1) return;

      // Prefetch next 2 slides
      [1, 2].forEach((offset) => {
        const targetIdx = activeSlideIndex + offset;
        if (
          targetIdx < formattedImages.length &&
          formattedImages[targetIdx]?.type !== "video"
        ) {
          const nextUrl = getOptimizedCloudinaryUrl(
            formattedImages[targetIdx].url,
            {
              width: Math.round(width * (isSlow ? 1.0 : 1.5)),
              isSlow,
            }
          );
          Image.prefetch(nextUrl);
        }
      });
    }, [activeSlideIndex, formattedImages, width, isSlow]);

    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollX.value = event.contentOffset.x;
      },
    });

    const handleMomentumScrollEnd = useCallback(
      (event) => {
        const slide = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveSlideIndex(slide);
      },
      [width]
    );

    const triggerHeartAnimation = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      heartScale.value = withSequence(
        withSpring(1.3, { damping: 10, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 }),
        withTiming(0, { duration: 250 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 250 })
      );
    }, [heartScale, heartOpacity]);

    const handleDoubleTap = useCallback(() => {
      triggerHeartAnimation();
      onDoubleTapLike?.();
    }, [triggerHeartAnimation, onDoubleTapLike]);

    const handlePress = useDoubleTap(handleDoubleTap, null, 280);

    const handleLongPress = useCallback(
      (index) => {
        if (formattedImages[index]?.type === "video") return;
        setSelectedImageIndex(index);
        setLightboxVisible(true);
      },
      [formattedImages]
    );

    const animatedHeartStyle = useAnimatedStyle(() => ({
      transform: [{ scale: heartScale.value }],
      opacity: heartOpacity.value,
    }));

    if (formattedImages.length === 0) return null;

    // Direct render for single image/video — eliminates nested FlatList touch conflicts and half-scrolled offset bugs
    if (formattedImages.length === 1) {
      const singleItem = formattedImages[0];
      return (
        <View style={[styles.container, { width, height: carouselHeight }]}>
          {singleItem.type === "video" ? (
            <VibeVideoPlayer
              url={singleItem.url}
              thumbnailUrl={singleItem.thumbnailUrl}
              width={width}
              height={carouselHeight}
              aspectRatio={singleItem.aspectRatio || primaryAspectRatio}
              isVisible={isVisible}
              isActiveSlide={true}
              onDoubleTapLike={onDoubleTapLike}
              onDimensionsDetected={handleDimensionsDetected}
            />
          ) : (
            <Pressable
              onPress={() => handlePress(0)}
              onLongPress={() => handleLongPress(0)}
              delayLongPress={350}
              style={{ width, height: carouselHeight }}
            >
              <CarouselImage
                url={singleItem.url}
                width={width}
                height={carouselHeight}
                colors={colors}
                isSlow={isSlow}
                onDimensionsDetected={handleDimensionsDetected}
              />
            </Pressable>
          )}

          {/* Double Tap Heart Burst Overlay */}
          <Animated.View
            pointerEvents="none"
            style={[styles.heartBurstContainer, animatedHeartStyle]}
          >
            <MaterialIcons name="favorite" size={90} color="#FF2D55" />
          </Animated.View>

          {/* Full-Screen Pinchable & Dismissible Lightbox Modal */}
          <PinchableLightboxModal
            visible={lightboxVisible}
            imageUrl={getOptimizedCloudinaryUrl(
              singleItem.url,
              { width: 1440 }
            )}
            onClose={() => setLightboxVisible(false)}
          />
        </View>
      );
    }

    return (
      <View style={[styles.container, { width, height: carouselHeight }]}>
        {/* Horizontal Carousel with clean interval snapping and no paging conflicts */}
        <AnimatedFlatList
          data={formattedImages}
          renderItem={({ item, index }) => {
            if (item.type === "video") {
              return (
                <VibeVideoPlayer
                  url={item.url}
                  thumbnailUrl={item.thumbnailUrl}
                  width={width}
                  height={carouselHeight}
                  aspectRatio={item.aspectRatio || primaryAspectRatio}
                  isVisible={isVisible}
                  isActiveSlide={activeSlideIndex === index}
                  onDoubleTapLike={onDoubleTapLike}
                  onDimensionsDetected={
                    index === 0 ? handleDimensionsDetected : undefined
                  }
                />
              );
            }

            return (
              <Pressable
                onPress={() => handlePress(index)}
                onLongPress={() => handleLongPress(index)}
                delayLongPress={350}
                style={{ width, height: carouselHeight }}
              >
                <CarouselImage
                  url={item.url}
                  width={width}
                  height={carouselHeight}
                  colors={colors}
                  isSlow={isSlow}
                  onDimensionsDetected={
                    index === 0 ? handleDimensionsDetected : undefined
                  }
                />
              </Pressable>
            );
          }}
          keyExtractor={(_, index) => `vibe-img-${index}`}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled={true}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          snapToInterval={width}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum={true}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          style={{ width, height: carouselHeight }}
        />

        {/* Double Tap Heart Burst Overlay */}
        <Animated.View
          pointerEvents="none"
          style={[styles.heartBurstContainer, animatedHeartStyle]}
        >
          <MaterialIcons name="favorite" size={90} color="#FF2D55" />
        </Animated.View>

        {/* Multi-Image Counter Pill */}
        <View style={styles.imageCountBadge}>
          <MaterialIcons name="photo-library" size={12} color="#fff" />
          <Text style={styles.imageCountText}>
            {activeSlideIndex + 1}/{formattedImages.length}
          </Text>
        </View>

        {/* Pagination Dot Indicators */}
        <View style={styles.dotsContainer}>
          {formattedImages.map((_, index) => (
            <MiniDot
              key={index}
              index={index}
              scrollX={scrollX}
              itemWidth={width}
              color={colors.primary}
            />
          ))}
        </View>

        {/* Full-Screen Pinchable & Dismissible Lightbox Modal */}
        <PinchableLightboxModal
          visible={lightboxVisible}
          imageUrl={getOptimizedCloudinaryUrl(
            formattedImages[selectedImageIndex]?.url,
            { width: 1440 }
          )}
          onClose={() => setLightboxVisible(false)}
        />
      </View>
    );
  }
);

VibeImageCarousel.displayName = "VibeImageCarousel";

const CarouselImage = React.memo(
  ({ url, width, height, colors, isSlow, onDimensionsDetected }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [showSlowHint, setShowSlowHint] = useState(false);

    // Progressive image delivery:
    // 1. Instant tiny blurred placeholder (< 1KB)
    // 2. High-performance retina image (1.5x width on fast, 1.0x on slow)
    const placeholderUrl = useMemo(() => getBlurPlaceholderUrl(url), [url]);
    const displayUrl = useMemo(() => {
      const scaleFactor = isSlow ? 1.0 : 1.5;
      const base = getOptimizedCloudinaryUrl(url, {
        width: Math.round(width * scaleFactor),
        quality: isSlow ? "eco" : "auto",
        isSlow,
      });
      return retryCount > 0
        ? `${base}${base.includes("?") ? "&" : "?"}retry=${retryCount}`
        : base;
    }, [url, width, isSlow, retryCount]);

    // Show subtle hint if loading exceeds 3.5 seconds
    useEffect(() => {
      if (!loading) {
        setShowSlowHint(false);
        return;
      }
      const timer = setTimeout(() => {
        if (loading) setShowSlowHint(true);
      }, 3500);
      return () => clearTimeout(timer);
    }, [loading]);

    const handleRetry = useCallback(() => {
      setError(false);
      setLoading(true);
      setRetryCount((prev) => prev + 1);
    }, []);

    return (
      <View style={[styles.imageWrapper, { width, height }]}>
        {error ? (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            <MaterialIcons
              name="broken-image"
              size={36}
              color={colors.onSurfaceVariant}
            />
            <Text style={[styles.errorText, { color: colors.onSurfaceVariant }]}>
              Couldn't load photo
            </Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="refresh" size={14} color="#fff" />
              <Text style={styles.retryBtnText}>Tap to Retry</Text>
            </Pressable>
          </View>
        ) : (
          <Image
            source={{ uri: displayUrl }}
            placeholder={placeholderUrl ? { uri: placeholderUrl } : undefined}
            placeholderContentFit="contain"
            style={styles.image}
            contentFit="contain"
            transition={150}
            cachePolicy="memory-disk"
            onLoadStart={() => setLoading(true)}
            onLoad={(e) => {
              setLoading(false);
              if (e?.source?.width && e?.source?.height) {
                onDimensionsDetected?.(e.source.width, e.source.height);
              }
            }}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}

        {/* Subtle Slow Network Hint */}
        {loading && showSlowHint && (
          <View style={styles.slowNetworkPill}>
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ transform: [{ scale: 0.7 }] }}
            />
            <Text style={styles.slowNetworkText}>Loading photo...</Text>
          </View>
        )}
      </View>
    );
  }
);

CarouselImage.displayName = "CarouselImage";

const MiniDot = React.memo(({ index, scrollX, itemWidth, color }) => {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * itemWidth,
      index * itemWidth,
      (index + 1) * itemWidth,
    ];
    return {
      width: interpolate(
        scrollX.value,
        inputRange,
        [6, 18, 6],
        Extrapolation.CLAMP
      ),
      opacity: interpolate(
        scrollX.value,
        inputRange,
        [0.35, 1, 0.35],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
  );
});

MiniDot.displayName = "MiniDot";

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  imageWrapper: {
    backgroundColor: "transparent",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 4,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  heartBurstContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  imageCountBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 5,
  },
  imageCountText: {
    color: "#fff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  slowNetworkPill: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  slowNetworkText: {
    color: "#fff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
});

export default VibeImageCarousel;
