import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Image } from 'expo-image';
import { View, FlatList, Dimensions, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import { getGoogleDriveEmbedUrl } from '../utils/googleDrive';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Carousel Item Component with Lazy Loading and Caching
const CarouselItem = React.memo(({ item, width, height }) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const imageUrl = getGoogleDriveEmbedUrl(item);

    if (!imageUrl) return null;

    return (
        <View style={[styles.itemContainer, { width, height }]}>
            <View style={[styles.imageContainer, { backgroundColor: colors.cardBackground }]}>
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
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
                        transition={500}
                        cachePolicy="memory-disk"
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

export default function SchoolPhotoCarousel({ photos }) {
    const { colors } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);

    // Hooks MUST be called before any early return to avoid "Rendered more hooks" error
    const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index || 0);
        }
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    // Auto-scroll logic
    useEffect(() => {
        if (!photos || photos.length <= 1) return;

        const interval = setInterval(() => {
            if (flatListRef.current) {
                let nextIndex = activeIndex + 1;
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

        return () => clearInterval(interval);
    }, [activeIndex, photos]);

    // If no photos, collapse gracefully
    if (!photos || photos.length === 0) {
        return null;
    }

    // Calculate item width based on container padding
    const ITEM_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
    const ITEM_HEIGHT = 220; // Fixed height for a sleek look

    return (
        <View style={styles.container}>
            <View style={[styles.carouselWrapper, { height: ITEM_HEIGHT, width: ITEM_WIDTH }]}>
                <FlatList
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
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    onViewableItemsChanged={handleViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    scrollEventThrottle={32}
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
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.gradientOverlay}
                    pointerEvents="none"
                />

                {/* Pagination Dots */}
                {photos.length > 1 && (
                    <View style={styles.pagination}>
                        {photos.map((_, index) => {
                            const inputRange = [
                                (index - 1) * ITEM_WIDTH,
                                index * ITEM_WIDTH,
                                (index + 1) * ITEM_WIDTH,
                            ];

                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [6, 20, 6],
                                extrapolate: 'clamp',
                            });

                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.5, 1, 0.5],
                                extrapolate: 'clamp',
                            });

                            return (
                                <Animated.View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        {
                                            width: dotWidth,
                                            backgroundColor: '#fff', // Always white on dark gradient
                                            opacity,
                                        },
                                    ]}
                                />
                            );
                        })}
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
        backgroundColor: '#f0f0f0', // Placeholder bg
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
        height: 80,
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
