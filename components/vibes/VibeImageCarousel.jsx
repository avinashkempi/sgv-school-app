import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { getOptimizedCloudinaryUrl } from '../../utils/cloudinaryUpload';
import VibeVideoPlayer from './VibeVideoPlayer';
import SkeletonLoader from '../SkeletonLoader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const MAX_IMAGE_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, 460);
const MIN_IMAGE_HEIGHT = 240;

/**
 * Calculates adaptive height based on the image's aspect ratio,
 * clamping between MIN_IMAGE_HEIGHT and MAX_IMAGE_HEIGHT so images fit cleanly
 * without filling the whole phone screen or creating awkward whitespace.
 */
export const calculateAdaptiveHeight = (aspectRatio, containerWidth = SCREEN_WIDTH) => {
  if (!aspectRatio || isNaN(aspectRatio) || aspectRatio <= 0) {
    return Math.min(containerWidth, MAX_IMAGE_HEIGHT); // Default 1:1 square
  }
  const naturalHeight = containerWidth / aspectRatio;
  return Math.min(Math.max(naturalHeight, MIN_IMAGE_HEIGHT), MAX_IMAGE_HEIGHT);
};

/**
 * VibeImageCarousel — dynamic aspect-ratio responsive image/video carousel with double-tap heart burst and full-screen lightbox.
 */
const VibeImageCarousel = React.memo(({
  images = [],
  width = SCREEN_WIDTH,
  isVisible = false,
  onDoubleTapLike,
}) => {
  const { colors } = useTheme();
  const scrollX = useSharedValue(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Heart burst animation values
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const lastTapRef = useRef(0);

  // Format images/media array into standardized objects
  const formattedImages = useMemo(() => {
    return images.map(img => {
      if (typeof img === 'string') {
        return { type: 'image', url: img, aspectRatio: 1, width: 1080, height: 1080 };
      }
      return {
        type: img.type || 'image',
        url: img.url,
        thumbnailUrl: img.thumbnailUrl || '',
        duration: img.duration || 0,
        aspectRatio: img.aspectRatio || (img.width && img.height ? img.width / img.height : (img.type === 'video' ? 0.562 : 1)),
        width: img.width || 1080,
        height: img.height || 1080
      };
    });
  }, [images]);

  // Derive dynamic height from the first item's aspect ratio
  const primaryAspectRatio = formattedImages[0]?.aspectRatio || 1;
  const carouselHeight = useMemo(() => {
    return calculateAdaptiveHeight(primaryAspectRatio, width);
  }, [primaryAspectRatio, width]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = useCallback((event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveSlideIndex(slide);
  }, [width]);

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

  const handlePress = useCallback((_index) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      triggerHeartAnimation();
      if (onDoubleTapLike) {
        onDoubleTapLike();
      }
    } else {
      // Single tap — note timestamp
      lastTapRef.current = now;
    }
  }, [triggerHeartAnimation, onDoubleTapLike]);

  const handleLongPress = useCallback((index) => {
    if (formattedImages[index]?.type === 'video') return;
    setSelectedImageIndex(index);
    setLightboxVisible(true);
  }, [formattedImages]);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  if (formattedImages.length === 0) return null;

  return (
    <View style={[styles.container, { width, height: carouselHeight }]}>
      {/* Horizontal Carousel */}
      <AnimatedFlatList
        data={formattedImages}
        renderItem={({ item, index }) => {
          if (item.type === 'video') {
            return (
              <VibeVideoPlayer
                url={item.url}
                thumbnailUrl={item.thumbnailUrl}
                width={width}
                height={carouselHeight}
                isVisible={isVisible}
                isActiveSlide={activeSlideIndex === index}
                onDoubleTapLike={onDoubleTapLike}
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
              />
            </Pressable>
          );
        }}
        keyExtractor={(_, index) => `vibe-img-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        snapToInterval={width}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      {/* Double Tap Heart Burst Overlay */}
      <Animated.View pointerEvents="none" style={[styles.heartBurstContainer, animatedHeartStyle]}>
        <MaterialIcons name="favorite" size={90} color="#FF2D55" />
      </Animated.View>

      {/* Multi-Image Counter Pill */}
      {formattedImages.length > 1 && (
        <View style={styles.imageCountBadge}>
          <MaterialIcons name="photo-library" size={12} color="#fff" />
          <Text style={styles.imageCountText}>{formattedImages.length}</Text>
        </View>
      )}

      {/* Pagination Dot Indicators */}
      {formattedImages.length > 1 && (
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
      )}

      {/* Full-Screen Lightbox Modal on Long Press */}
      {lightboxVisible && (
        <Modal
          visible={lightboxVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setLightboxVisible(false)}
        >
          <View style={styles.lightboxContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <Pressable
              onPress={() => setLightboxVisible(false)}
              style={styles.lightboxCloseButton}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </Pressable>
            <Image
              source={{ uri: getOptimizedCloudinaryUrl(formattedImages[selectedImageIndex]?.url, { width: 1440 }) }}
              style={styles.lightboxImage}
              contentFit="contain"
              transition={200}
            />
          </View>
        </Modal>
      )}
    </View>
  );
});

VibeImageCarousel.displayName = 'VibeImageCarousel';

const CarouselImage = React.memo(({ url, width, height, colors }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const displayUrl = useMemo(() => {
    return getOptimizedCloudinaryUrl(url, { width: width * 2 });
  }, [url, width]);

  return (
    <View style={[styles.imageWrapper, { width, height }]}>
      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
          <MaterialIcons name="broken-image" size={40} color={colors.onSurfaceVariant} />
        </View>
      ) : (
        <Image
          source={{ uri: displayUrl }}
          style={styles.image}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      )}
      {loading && (
        <View style={styles.loadingOverlay}>
          <SkeletonLoader width={width} height={height} borderRadius={0} />
        </View>
      )}
    </View>
  );
});

CarouselImage.displayName = 'CarouselImage';

const MiniDot = React.memo(({ index, scrollX, itemWidth, color }) => {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * itemWidth,
      index * itemWidth,
      (index + 1) * itemWidth,
    ];
    return {
      width: interpolate(scrollX.value, inputRange, [6, 18, 6], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />;
});

MiniDot.displayName = 'MiniDot';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  imageWrapper: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBurstContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 5,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 6,
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
});

export default VibeImageCarousel;
