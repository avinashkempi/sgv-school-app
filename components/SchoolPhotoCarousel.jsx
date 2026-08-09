import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Image } from 'expo-image';
import { View, FlatList, Dimensions, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { getGoogleDriveEmbedUrl } from '../utils/googleDrive';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SkeletonLoader from './SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// Carousel Item Component with Lazy Loading and Caching
const CarouselItem = React.memo(({ item, width, height }) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const imageUrl = getGoogleDriveEmbedUrl(item);

    if (!imageUrl) return null;

    return (
        <View style={[styles.itemContainer, { width, height }]}>
            <View style={[styles.imageContainer, { backgroundColor: colors.background }]}>
                {loading && (
                    <View style={styles.loadingContainer}>
                        <SkeletonLoader width={width} height={height} borderRadius={0} />
                    </View>
                )}
                {error ? (
                    <View style={[styles.errorContainer, { backgroundColor: colors.cardBackground }]}>
                        <MaterialIcons name="broken-image" size={40} color={colors.textSecondary} />
                    </View>
                ) : (
                    <Image
                        source={imageUrl}
                        style={styles.image}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        recyclingKey={`carousel-${item}`}
                        onLoadStart={() => setLoading(true)}
                        onLoad={() => setLoading(false)}
                        onError={() => {
                            setLoading(false);
                            setError(true);
                        }}
                    />
                )}
            </View>
        </View>
    );
});

CarouselItem.displayName = 'CarouselItem';

// Animated pagination dot
const PaginationDot = React.memo(({ index, scrollX, itemWidth }) => {
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
                [6, 20, 6],
                Extrapolation.CLAMP,
            ),
            opacity: interpolate(
                scrollX.value,
                inputRange,
                [0.5, 1, 0.5],
                Extrapolation.CLAMP,
            ),
        };
    });

    return (
        <Animated.View
            style={[
                styles.dot,
                { backgroundColor: '#fff' },
                dotStyle,
            ]}
        />
    );
});

PaginationDot.displayName = 'PaginationDot';

export default function SchoolPhotoCarousel({ photos }) {
    const { colors } = useTheme();
    const scrollX = useSharedValue(0);
    const flatListRef = useRef(null);
    // Use a ref for activeIndex so the auto-scroll interval doesn't
    // get recreated every time the index changes (fixes interval churn)
    const activeIndexRef = useRef(0);

    const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            activeIndexRef.current = viewableItems[0].index || 0;
        }
    }, []);

    const [viewabilityConfig] = useState(() => ({
        itemVisiblePercentThreshold: 50,
    }));

    // Reanimated scroll handler — runs on UI thread
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    // Auto-scroll logic — stable interval, no churn
    useEffect(() => {
        if (!photos || photos.length <= 1) return;

        const interval = global.setInterval(() => {
            if (flatListRef.current) {
                let nextIndex = activeIndexRef.current + 1;
                if (nextIndex >= photos.length) {
                    nextIndex = 0; // Loop back to start
                }

                flatListRef.current.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
                // activeIndex will be updated by handleViewableItemsChanged
            }
        }, 4000); // Slower auto-scroll for better UX

        return () => global.clearInterval(interval);
    }, [photos]); // Only re-create interval when photo count changes

    // If no photos, collapse gracefully
    if (!photos || photos.length === 0) {
        return null;
    }

    // Calculate item width based on container padding
    const ITEM_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
    const ITEM_HEIGHT = 300; // Increased height for better visibility

    return (
        <View style={styles.container}>
            <View style={[styles.carouselWrapper, { height: ITEM_HEIGHT, width: ITEM_WIDTH, backgroundColor: colors.background }]}>
                <AnimatedFlatList
                    ref={flatListRef}
                    data={photos}
                    renderItem={({ item }) => (
                        <CarouselItem item={item} width={ITEM_WIDTH} height={ITEM_HEIGHT} />
                    )}
                    keyExtractor={(item, index) => `school-photo-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onScroll={scrollHandler}
                    onViewableItemsChanged={handleViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    snapToInterval={ITEM_WIDTH}
                    getItemLayout={(data, index) => ({
                        length: ITEM_WIDTH,
                        offset: ITEM_WIDTH * index,
                        index,
                    })}
                />

                {/* Gradient Overlay for Text/Dots Visibility */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.2)']}
                    style={styles.gradientOverlay}
                    pointerEvents="none"
                />

                {/* Pagination Dots — fully Reanimated, UI-thread driven */}
                {photos.length > 1 && (
                    <View style={styles.pagination}>
                        {photos.map((_, index) => (
                            <PaginationDot
                                key={index}
                                index={index}
                                scrollX={scrollX}
                                itemWidth={ITEM_WIDTH}
                            />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 24,
    },
    carouselWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        position: 'relative',
    },
    itemContainer: {
        overflow: 'hidden',
    },
    imageContainer: {
        flex: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
    },
    pagination: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
});
