import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Image as RNImage,
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
import VibeVideoPlayer from "./VibeVideoPlayer";
import PinchableLightboxModal from "../ui/PinchableLightboxModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

/**
 * Calculates display dimensions retaining original dimensions (up to a maximum size)
 * without expanding to fill the container and without imposing any minimum height.
 * - If media is smaller than maximum bounds: retains original width & height.
 * - If media exceeds maximum bounds: scales down proportionally (never cropped).
 * - Imposes NO minimum height.
 */
export const calculateMediaDisplaySize = ({
  naturalWidth,
  naturalHeight,
  aspectRatio,
  containerWidth = SCREEN_WIDTH,
}) => {
  const maxWidth = Math.min(containerWidth || SCREEN_WIDTH, 620);
  const maxHeight = Math.min(Math.round(SCREEN_HEIGHT * 0.72), 540);

  // If natural width and height are known (> 0)
  if (naturalWidth && naturalHeight && naturalWidth > 0 && naturalHeight > 0) {
    if (naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
      // Retain original dimensions without expanding to fill container
      return {
        width: Math.round(naturalWidth),
        height: Math.round(naturalHeight),
      };
    }
    // Proportional scale down to fit within maximum size (never crop)
    const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
    return {
      width: Math.max(1, Math.round(naturalWidth * scale)),
      height: Math.max(1, Math.round(naturalHeight * scale)),
    };
  }

  // If only aspectRatio is known
  if (aspectRatio && aspectRatio > 0) {
    let targetW = maxWidth;
    let targetH = Math.round(maxWidth / aspectRatio);
    if (targetH > maxHeight) {
      targetH = maxHeight;
      targetW = Math.round(maxHeight * aspectRatio);
    }
    return {
      width: Math.min(targetW, maxWidth),
      height: targetH,
    };
  }

  // Neutral fallback before dimensions load
  const fallbackW = Math.min(maxWidth, 400);
  return {
    width: fallbackW,
    height: Math.round(fallbackW * 0.75),
  };
};

export const calculateAdaptiveHeight = (
  aspectRatio,
  containerWidth = SCREEN_WIDTH,
  isVideo = false
) => {
  const size = calculateMediaDisplaySize({
    aspectRatio: aspectRatio || (isVideo ? 1.778 : 1.33),
    containerWidth,
  });
  return size.height;
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
    const [detectedDimensions, setDetectedDimensions] = useState({});

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
            aspectRatio: isVid ? 1.778 : undefined,
            width: undefined,
            height: undefined,
          };
        }

        const rawUrl = img?.url || img?.thumbnailUrl || "";
        const isVid =
          img.type === "video" ||
          isVideoUrl(rawUrl) ||
          (typeof img.thumbnailUrl === "string" && isVideoUrl(img.thumbnailUrl));

        let computedRatio = img.aspectRatio;
        let itemWidth = img.width;
        let itemHeight = img.height;

        if (isVid) {
          const isDummySchemaDefault =
            !computedRatio ||
            computedRatio <= 0 ||
            computedRatio === 1 ||
            (itemWidth === 1080 && itemHeight === 1080);

          if (isDummySchemaDefault) {
            computedRatio = 1.778;
            itemWidth = undefined;
            itemHeight = undefined;
          }
        } else if (!computedRatio || computedRatio <= 0) {
          if (itemWidth && itemHeight) {
            computedRatio = Number((itemWidth / itemHeight).toFixed(3));
          }
        }

        return {
          type: isVid ? "video" : "image",
          url: img.url,
          thumbnailUrl:
            img.thumbnailUrl || (isVid ? getVideoPosterUrl(img.url) : ""),
          duration: img.duration || 0,
          aspectRatio: computedRatio,
          width: itemWidth || undefined,
          height: itemHeight || undefined,
        };
      });
    }, [images]);

    // Calculate display dimensions for each media slide
    const slideDimensions = useMemo(() => {
      return formattedImages.map((item, index) => {
        const detected = detectedDimensions[index];
        const isVid = item.type === "video";
        const naturalW = detected?.width || (isVid ? undefined : item.width);
        const naturalH = detected?.height || (isVid ? undefined : item.height);
        return calculateMediaDisplaySize({
          naturalWidth: naturalW,
          naturalHeight: naturalH,
          aspectRatio: item.aspectRatio || (isVid ? 1.778 : 1.33),
          containerWidth: width,
        });
      });
    }, [formattedImages, detectedDimensions, width]);

    const activeSlideSize =
      slideDimensions[activeSlideIndex] ||
      slideDimensions[0] || {
        width: Math.min(width, 400),
        height: 220,
      };
    const carouselHeight = activeSlideSize.height;

    // Handle real media dimension detection to refine adaptive size smoothly
    const handleDimensionsDetected = useCallback(
      (index, naturalWidth, naturalHeight) => {
        if (naturalWidth > 0 && naturalHeight > 0) {
          setDetectedDimensions((prev) => {
            const existing = prev[index];
            if (
              existing &&
              existing.width === naturalWidth &&
              existing.height === naturalHeight
            ) {
              return prev;
            }
            return {
              ...prev,
              [index]: { width: naturalWidth, height: naturalHeight },
            };
          });
        }
      },
      []
    );

    // Pre-detect real video dimensions from poster image thumbnail
    useEffect(() => {
      formattedImages.forEach((item, index) => {
        if (item.type === "video" && item.thumbnailUrl) {
          RNImage.getSize(
            item.thumbnailUrl,
            (w, h) => {
              if (w > 0 && h > 0) {
                handleDimensionsDetected(index, w, h);
              }
            },
            () => {}
          );
        }
      });
    }, [formattedImages, handleDimensionsDetected]);

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

    const openFullscreen = useCallback(
      (index) => {
        setSelectedImageIndex(index);
        setLightboxVisible(true);
      },
      []
    );

    const handlePressImage = useCallback(
      (index) => {
        let lastTap = 0;
        let timer = null;
        return () => {
          const now = Date.now();
          if (now - lastTap < 280) {
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            lastTap = 0;
            triggerHeartAnimation();
            onDoubleTapLike?.();
          } else {
            lastTap = now;
            timer = setTimeout(() => {
              openFullscreen(index);
              timer = null;
            }, 280);
          }
        };
      },
      [triggerHeartAnimation, onDoubleTapLike, openFullscreen]
    );

    // Cached click handlers per item index
    const pressHandlers = useRef(new Map());
    const getPressHandler = useCallback(
      (index) => {
        if (!pressHandlers.current.has(index)) {
          pressHandlers.current.set(index, handlePressImage(index));
        }
        return pressHandlers.current.get(index);
      },
      [handlePressImage]
    );

    const animatedHeartStyle = useAnimatedStyle(() => ({
      transform: [{ scale: heartScale.value }],
      opacity: heartOpacity.value,
    }));

    if (formattedImages.length === 0) return null;

    // Direct render for single image/video — eliminates nested FlatList touch conflicts and half-scrolled offset bugs
    if (formattedImages.length === 1) {
      const singleItem = formattedImages[0];
      const singleSize = slideDimensions[0] || activeSlideSize;

      return (
        <View
          style={[
            styles.container,
            {
              width: "100%",
              height: singleSize.height,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          {singleItem.type === "video" ? (
            <View
              style={{
                width: singleSize.width,
                height: singleSize.height,
                alignSelf: "center",
              }}
            >
              <VibeVideoPlayer
                url={singleItem.url}
                thumbnailUrl={singleItem.thumbnailUrl}
                width={singleSize.width}
                height={singleSize.height}
                aspectRatio={singleItem.aspectRatio}
                isVisible={isVisible}
                isActiveSlide={true}
                onDoubleTapLike={onDoubleTapLike}
                onDimensionsDetected={(w, h) => handleDimensionsDetected(0, w, h)}
                contentFit="contain"
              />
              <Pressable
                onPress={() => openFullscreen(0)}
                style={styles.videoExpandButton}
                hitSlop={8}
                accessibilityLabel="Open video full screen"
                accessibilityRole="button"
              >
                <MaterialIcons name="fullscreen" size={20} color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={getPressHandler(0)}
              onLongPress={() => openFullscreen(0)}
              delayLongPress={350}
              style={{
                width: singleSize.width,
                height: singleSize.height,
                alignSelf: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel="View photo full screen"
            >
              <CarouselImage
                url={singleItem.url}
                width={singleSize.width}
                height={singleSize.height}
                colors={colors}
                isSlow={isSlow}
                onDimensionsDetected={(w, h) => handleDimensionsDetected(0, w, h)}
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
            media={formattedImages}
            initialIndex={selectedImageIndex}
            onClose={() => setLightboxVisible(false)}
            onDoubleTapLike={onDoubleTapLike}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.container,
          {
            width: "100%",
            height: carouselHeight,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {/* Horizontal Carousel with clean interval snapping and no paging conflicts */}
        <AnimatedFlatList
          data={formattedImages}
          renderItem={({ item, index }) => {
            const itemSize = slideDimensions[index] || activeSlideSize;
            const slideHeight = Math.min(itemSize.height, carouselHeight);
            const slideWidth = itemSize.width;

            if (item.type === "video") {
              return (
                <View
                  style={{
                    width,
                    height: carouselHeight,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View style={{ width: slideWidth, height: slideHeight }}>
                    <VibeVideoPlayer
                      url={item.url}
                      thumbnailUrl={item.thumbnailUrl}
                      width={slideWidth}
                      height={slideHeight}
                      aspectRatio={item.aspectRatio}
                      isVisible={isVisible}
                      isActiveSlide={activeSlideIndex === index}
                      onDoubleTapLike={onDoubleTapLike}
                      onDimensionsDetected={(w, h) =>
                        handleDimensionsDetected(index, w, h)
                      }
                      contentFit="contain"
                    />
                    <Pressable
                      onPress={() => openFullscreen(index)}
                      style={styles.videoExpandButton}
                      hitSlop={8}
                      accessibilityLabel="Open video full screen"
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="fullscreen" size={20} color="#ffffff" />
                    </Pressable>
                  </View>
                </View>
              );
            }

            return (
              <View
                style={{
                  width,
                  height: carouselHeight,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={getPressHandler(index)}
                  onLongPress={() => openFullscreen(index)}
                  delayLongPress={350}
                  style={{
                    width: slideWidth,
                    height: slideHeight,
                    alignSelf: "center",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View photo full screen"
                >
                  <CarouselImage
                    url={item.url}
                    width={slideWidth}
                    height={slideHeight}
                    colors={colors}
                    isSlow={isSlow}
                    onDimensionsDetected={(w, h) =>
                      handleDimensionsDetected(index, w, h)
                    }
                  />
                </Pressable>
              </View>
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
          media={formattedImages}
          initialIndex={selectedImageIndex}
          onClose={() => setLightboxVisible(false)}
          onDoubleTapLike={onDoubleTapLike}
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
              <MaterialIcons name="refresh" size={14} color={colors.onPrimary} />
              <Text style={[styles.retryBtnText, { color: colors.onPrimary }]}>Tap to Retry</Text>
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
  videoExpandButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
