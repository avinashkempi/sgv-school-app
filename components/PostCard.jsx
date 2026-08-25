import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  FadeIn,
} from "react-native-reanimated";
import { useTheme } from "../theme";
import { getOptimizedCloudinaryUrl } from "../utils/cloudinaryUpload";
import SkeletonLoader from "./SkeletonLoader";
import UserAvatar from "./ui/UserAvatar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const IMAGE_HEIGHT = 200;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

/**
 * Optimizes an image URL for display via Cloudinary.
 */
const getDisplayUrl = (url) => {
  if (!url) return null;
  return getOptimizedCloudinaryUrl(url, { width: Math.round(CARD_WIDTH * 2) });
};

/**
 * Format a date into a relative or absolute string.
 */
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
};

// Mini image carousel for post cards
const PostImageCarousel = React.memo(({ images, width }) => {
  const { colors } = useTheme();
  const scrollX = useSharedValue(0);

  const displayUrls = useMemo(
    () => images.map(getDisplayUrl).filter(Boolean),
    [images]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  if (displayUrls.length === 0) return null;

  if (displayUrls.length === 1) {
    return <SingleImage url={displayUrls[0]} width={width} />;
  }

  return (
    <View>
      <AnimatedFlatList
        data={displayUrls}
        renderItem={({ item }) => <SingleImage url={item} width={width} />}
        keyExtractor={(item, index) => `post-img-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToInterval={width}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
      {/* Pagination dots */}
      <View style={styles.dotsContainer}>
        {displayUrls.map((_, index) => (
          <MiniDot
            key={index}
            index={index}
            scrollX={scrollX}
            itemWidth={width}
            color={colors.primary}
          />
        ))}
      </View>
    </View>
  );
});

PostImageCarousel.displayName = "PostImageCarousel";

const SingleImage = React.memo(({ url, width }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[styles.imageWrapper, { width, height: IMAGE_HEIGHT }]}>
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
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
      {loading && (
        <View style={styles.loadingOverlay}>
          <SkeletonLoader
            width={width}
            height={IMAGE_HEIGHT}
            borderRadius={0}
          />
        </View>
      )}
    </View>
  );
});

SingleImage.displayName = "SingleImage";

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
        [0.3, 1, 0.3],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
  );
});

MiniDot.displayName = "MiniDot";

/**
 * PostCard — displays a single post with images, title, description, and metadata.
 *
 * @param {Object} post - The post data
 * @param {boolean} isAdmin - Whether the current user is an admin
 * @param {Function} onEdit - Callback for edit action
 * @param {Function} onDelete - Callback for delete action
 * @param {Function} onTogglePin - Callback for pin toggle action
 */
const PostCard = ({ post, isAdmin, onEdit, onDelete, onTogglePin }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const descriptionNeedsExpand =
    post.description && post.description.length > 120;
  const cardWidth = CARD_WIDTH;

  const categoryColor =
    post.category === "achievement"
      ? { bg: "#FFF3E0", text: "#E65100", icon: "emoji-events" }
      : {
          bg: colors.primaryContainer,
          text: colors.onPrimaryContainer,
          icon: "campaign",
        };

  const handleLongPress = useCallback(() => {
    if (!isAdmin) return;
    Alert.alert("Post Actions", post.title, [
      { text: "Edit", onPress: () => onEdit?.(post) },
      {
        text: post.isPinned ? "Unpin" : "Pin to Top",
        onPress: () => onTogglePin?.(post),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => onDelete?.(post),
              },
            ]
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [isAdmin, post, onEdit, onDelete, onTogglePin]);

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surfaceContainer,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        {/* Image carousel */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <View style={styles.imageSection}>
            <PostImageCarousel images={post.imageUrls} width={cardWidth} />
            {/* Image count badge */}
            {post.imageUrls.length > 1 && (
              <View
                style={[
                  styles.imageCountBadge,
                  { backgroundColor: "rgba(0,0,0,0.6)" },
                ]}
              >
                <MaterialIcons name="photo-library" size={12} color="#fff" />
                <Text style={styles.imageCountText}>
                  {post.imageUrls.length}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.contentSection}>
          {/* Category badge + pin + time */}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryColor.bg },
              ]}
            >
              <MaterialIcons
                name={categoryColor.icon}
                size={12}
                color={categoryColor.text}
              />
              <Text
                style={[styles.categoryText, { color: categoryColor.text }]}
              >
                {post.category === "achievement" ? "Achievement" : "General"}
              </Text>
            </View>
            {post.isPinned && (
              <View
                style={[
                  styles.pinBadge,
                  { backgroundColor: colors.tertiaryContainer },
                ]}
              >
                <MaterialIcons
                  name="push-pin"
                  size={11}
                  color={colors.onTertiaryContainer}
                />
                <Text
                  style={[
                    styles.pinText,
                    { color: colors.onTertiaryContainer },
                  ]}
                >
                  Pinned
                </Text>
              </View>
            )}
            <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
              {formatTimeAgo(post.createdAt)}
            </Text>

            {/* Admin 3 Dots Menu Button */}
            {isAdmin && (
              <Pressable
                onPress={handleLongPress}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.adminMenuButton,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceContainerHighest
                      : "transparent",
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Post options"
              >
                <MaterialIcons
                  name="more-vert"
                  size={20}
                  color={colors.onSurface}
                />
              </Pressable>
            )}
          </View>

          {/* Title */}
          <Text
            style={[styles.title, { color: colors.onSurface }]}
            numberOfLines={2}
          >
            {post.title}
          </Text>

          {/* Description */}
          {post.description ? (
            <View>
              <Text
                style={[styles.description, { color: colors.onSurfaceVariant }]}
                numberOfLines={expanded ? undefined : 3}
              >
                {post.description}
              </Text>
              {descriptionNeedsExpand && (
                <Pressable onPress={() => setExpanded(!expanded)}>
                  <Text style={[styles.readMore, { color: colors.primary }]}>
                    {expanded ? "Show less" : "Read more"}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* Posted by */}
          {post.postedBy?.name && (
            <View style={styles.postedByRow}>
              <UserAvatar
                photoUrl={post.postedBy.profilePhoto}
                name={post.postedBy.name}
                role={post.postedBy.role}
                size={20}
              />
              <Text
                style={[
                  styles.postedByText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {post.postedBy.name}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  imageSection: {
    position: "relative",
  },
  imageWrapper: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  imageCountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "DMSans-Bold",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  contentSection: {
    padding: 16,
    paddingTop: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "DMSans-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pinBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  pinText: {
    fontSize: 10,
    fontFamily: "DMSans-Medium",
  },
  timeText: {
    fontSize: 12,
    fontFamily: "DMSans-Regular",
    marginLeft: "auto",
  },
  title: {
    fontSize: 17,
    fontFamily: "DMSans-Bold",
    lineHeight: 22,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: "DMSans-Regular",
    lineHeight: 20,
  },
  readMore: {
    fontSize: 13,
    fontFamily: "DMSans-Medium",
    marginTop: 4,
  },
  postedByRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },
  postedByText: {
    fontSize: 12,
    fontFamily: "DMSans-Medium",
  },
  adminMenuButton: {
    padding: 4,
    borderRadius: 16,
    marginLeft: 4,
  },
});

export default React.memo(PostCard);
