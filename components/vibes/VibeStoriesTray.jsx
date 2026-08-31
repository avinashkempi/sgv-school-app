import React, { memo, useCallback, useState, useMemo, useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useApiQuery } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import {
  getStoryThumbnailUrl,
  getBlurPlaceholderUrl,
  resolveMediaThumbnail,
} from "../../utils/cloudinaryUpload";
import SkeletonLoader from "../SkeletonLoader";
import VibeStoryViewerModal from "./VibeStoryViewerModal";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../../utils/userFormatters";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Material 3 Expressive vibrant gradient colors for unseen stories
const UNSEEN_GRADIENT = ["#8B5CF6", "#EC4899", "#EF4444", "#F59E0B"];
const OFFICIAL_GRADIENT = ["#3B82F6", "#1D4ED8", "#60A5FA"];
const ACHIEVEMENT_GRADIENT = ["#F59E0B", "#D97706", "#FCD34D"];

/**
 * Single Story Ring Bubble with Material 3 Expressive Gradient Ring & Seen/Unseen State
 */
const StoryBubble = memo(
  ({
    title,
    subtitle,
    imageUri,
    icon,
    ringColor,
    isSpecial: _isSpecial,
    isOfficial,
    isAchievement,
    isViewed,
    badgeIcon,
    onPress,
  }) => {
    const { colors } = useTheme();
    const scale = useSharedValue(1);

    const handlePressIn = () => {
      scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
      onPress?.();
    };

    const optimizedImg = imageUri ? getStoryThumbnailUrl(imageUri) : null;
    const blurPlaceholder = imageUri ? getBlurPlaceholderUrl(imageUri) : null;

    // Determine gradient palette
    const gradientColors = isOfficial
      ? OFFICIAL_GRADIENT
      : isAchievement
      ? ACHIEVEMENT_GRADIENT
      : UNSEEN_GRADIENT;

    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.bubbleContainer, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {/* Outer Story Ring — Gradient for Unseen, Muted Tonal Outline for Seen */}
        {!isViewed ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientRingOuter}
          >
            <View
              style={[
                styles.ringInner,
                { backgroundColor: colors.background },
              ]}
            >
              {optimizedImg ? (
                <Image
                  source={{ uri: optimizedImg }}
                  placeholder={
                    blurPlaceholder ? { uri: blurPlaceholder } : undefined
                  }
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : isOfficial ? (
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor: colors.surfaceContainerLowest || "#ffffff",
                      padding: 4,
                    },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={{ width: "100%", height: "100%", borderRadius: 24 }}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor: ringColor || colors.primary,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={icon || "school"}
                    size={24}
                    color="#fff"
                  />
                </View>
              )}
            </View>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.seenRingOuter,
              {
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.12)",
              },
            ]}
          >
            <View
              style={[
                styles.ringInner,
                { backgroundColor: colors.background },
              ]}
            >
              {optimizedImg ? (
                <Image
                  source={{ uri: optimizedImg }}
                  placeholder={
                    blurPlaceholder ? { uri: blurPlaceholder } : undefined
                  }
                  style={[styles.avatarImage, { opacity: 0.85 }]}
                  contentFit="cover"
                  transition={200}
                />
              ) : isOfficial ? (
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor: colors.surfaceContainerLowest || "#ffffff",
                      padding: 4,
                    },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={{ width: "100%", height: "100%", borderRadius: 24 }}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor: colors.surfaceContainerHighest,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={icon || "school"}
                    size={24}
                    color={colors.onSurfaceVariant}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Floating Mini Badge */}
        {badgeIcon && (
          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: isOfficial
                  ? "#2563EB"
                  : isAchievement
                  ? "#F59E0B"
                  : "#8B5CF6",
                borderColor: colors.background,
              },
            ]}
          >
            <MaterialIcons name={badgeIcon} size={10} color="#fff" />
          </View>
        )}

        {/* Title */}
        <Text
          style={[
            styles.bubbleLabel,
            {
              color: isViewed ? colors.onSurfaceVariant : colors.onSurface,
              fontFamily: isViewed ? FONTS.medium : FONTS.bold,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Subtitle */}
        {subtitle ? (
          <Text
            style={[
              styles.bubbleSublabel,
              {
                color: colors.onSurfaceVariant,
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </AnimatedPressable>
    );
  }
);

StoryBubble.displayName = "StoryBubble";

/**
 * Pulsing Live Indicator Dot
 */
const PulsingLiveDot = memo(() => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  return (
    <View style={styles.liveDotContainer}>
      <Animated.View style={[styles.liveDotGlow, animatedStyle]} />
      <View style={styles.liveDotCore} />
    </View>
  );
});

PulsingLiveDot.displayName = "PulsingLiveDot";

/**
 * Format author's first name for story circle labels in Title Case
 */
const formatAuthorName = (name) => {
  const formatted = formatUserName(name, "Campus");
  const first = formatted.trim().split(/\s+/)[0];
  return first;
};

/**
 * VibeStoriesTray — horizontal story bar displayed near the top of the Home Page and Vibes feed.
 */
const VibeStoriesTray = ({ onOpenCreate, hideHeader = false }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Full-screen Story Viewer State
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);

  const { data: highlightsData, isLoading } = useApiQuery(
    ["vibeHighlights"],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.highlights}`,
    CACHE_TIERS.VIBES_HOME
  );

  const officialVibes = useMemo(
    () => highlightsData?.data?.official || [],
    [highlightsData]
  );
  const achievementVibes = useMemo(
    () => highlightsData?.data?.achievements || [],
    [highlightsData]
  );
  const authorStories = useMemo(
    () => highlightsData?.data?.stories || [],
    [highlightsData]
  );

  // Prefetch story avatars/thumbnails when highlights data arrives
  useEffect(() => {
    if (!highlightsData?.data) return;
    const urlsToPrefetch = [
      officialVibes[0]?.images?.[0]?.url,
      achievementVibes[0]?.images?.[0]?.url,
      ...authorStories.map((s) => s.author?.profilePhoto || s.latestImage),
    ].filter(Boolean);

    urlsToPrefetch.forEach((url) => {
      Image.prefetch(getStoryThumbnailUrl(url));
    });
  }, [highlightsData, officialVibes, achievementVibes, authorStories]);

  const handleOpenOfficialStories = useCallback(() => {
    if (officialVibes.length > 0) {
      setActiveStoryGroup({
        stories: officialVibes,
        title: "SGV Official Broadcasts",
      });
    } else {
      router.push("/vibes");
    }
  }, [officialVibes, router]);

  const handleOpenAchievementStories = useCallback(() => {
    if (achievementVibes.length > 0) {
      setActiveStoryGroup({
        stories: achievementVibes,
        title: "Campus Achievements",
      });
    } else {
      router.push("/vibes");
    }
  }, [achievementVibes, router]);

  const handleOpenAuthorStories = useCallback(
    (story) => {
      if (story.vibes && story.vibes.length > 0) {
        setActiveStoryGroup({
          stories: story.vibes,
          title: formatUserName(story.author?.name, "Campus Moment"),
        });
      } else {
        router.push("/vibes");
      }
    },
    [router]
  );

  // Combined stories array with seen/unseen calculation
  const trayItems = useMemo(() => {
    const isOfficialViewed =
      officialVibes.length > 0 && officialVibes.every((v) => v.isViewed);
    const isAchievementsViewed =
      achievementVibes.length > 0 && achievementVibes.every((v) => v.isViewed);

    const items = [
      { id: "create-action", type: "create" },
      {
        id: "official-story",
        type: "official",
        title: "Official",
        subtitle:
          officialVibes.length === 1
            ? "1 live"
            : officialVibes.length > 1
            ? `${officialVibes.length} live`
            : "Notices",
        icon: "school",
        ringColor: "#2563EB",
        isSpecial: true,
        isOfficial: true,
        isViewed: isOfficialViewed,
        badgeIcon: "verified",
        imageUri: resolveMediaThumbnail(
          officialVibes[0]?.images?.[0],
          "story"
        ),
        onPress: handleOpenOfficialStories,
      },
      {
        id: "achievement-story",
        type: "achievement",
        title: "Achievements",
        subtitle:
          achievementVibes.length === 1
            ? "1 win"
            : achievementVibes.length > 1
            ? `${achievementVibes.length} wins`
            : "Spotlight",
        icon: "emoji-events",
        ringColor: "#F59E0B",
        isSpecial: true,
        isAchievement: true,
        isViewed: isAchievementsViewed,
        badgeIcon: "star",
        imageUri: resolveMediaThumbnail(
          achievementVibes[0]?.images?.[0],
          "story"
        ),
        onPress: handleOpenAchievementStories,
      },
    ];

    authorStories.forEach((story, idx) => {
      const authorName = formatAuthorName(story.author?.name);
      const role = formatUserDesignationOrRole(story.author);
      const isStoryViewed = story.isViewed || story.unviewedCount === 0;

      items.push({
        id: story.author?._id || `story-${idx}`,
        type: "author",
        title: authorName,
        subtitle: role,
        imageUri: story.author?.profilePhoto || story.latestImage,
        ringColor:
          story.author?.role === "teacher" ? "#8B5CF6" : colors.primary,
        isSpecial: false,
        isViewed: isStoryViewed,
        badgeIcon: story.author?.role === "teacher" ? "school" : undefined,
        onPress: () => handleOpenAuthorStories(story),
      });
    });

    return items;
  }, [
    officialVibes,
    achievementVibes,
    authorStories,
    colors.primary,
    handleOpenOfficialStories,
    handleOpenAchievementStories,
    handleOpenAuthorStories,
  ]);

  const renderTrayItem = useCallback(
    ({ item }) => {
      if (item.type === "create") {
        return (
          <AnimatedPressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {}
              );
              onOpenCreate?.();
            }}
            style={styles.bubbleContainer}
            accessibilityRole="button"
            accessibilityLabel="Post Vibe"
          >
            <View
              style={[
                styles.addOuterRing,
                { borderColor: colors.outlineVariant || "rgba(0,0,0,0.15)" },
              ]}
            >
              <View
                style={[
                  styles.addInnerBox,
                  { backgroundColor: colors.surfaceContainerHighest },
                ]}
              >
                <MaterialIcons name="add" size={24} color={colors.primary} />
              </View>
            </View>
            <Text
              style={[
                styles.bubbleLabel,
                { color: colors.onSurface, fontFamily: FONTS.bold },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {isAuthenticated ? "Post Vibe" : "Share"}
            </Text>
            <Text
              style={[
                styles.bubbleSublabel,
                { color: colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              New Moment
            </Text>
          </AnimatedPressable>
        );
      }

      return (
        <StoryBubble
          title={item.title}
          subtitle={item.subtitle}
          imageUri={item.imageUri}
          icon={item.icon}
          ringColor={item.ringColor}
          isSpecial={item.isSpecial}
          isOfficial={item.isOfficial}
          isAchievement={item.isAchievement}
          isViewed={item.isViewed}
          badgeIcon={item.badgeIcon}
          onPress={item.onPress}
        />
      );
    },
    [colors, isAuthenticated, onOpenCreate]
  );

  return (
    <View style={[styles.container, hideHeader && styles.containerNoHeader]}>
      {!hideHeader && (
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Campus Moments
            </Text>
            <PulsingLiveDot />
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => {}
              );
              router.push("/vibes");
            }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              View All
            </Text>
          </Pressable>
        </View>
      )}

      {isLoading && authorStories.length === 0 ? (
        <View style={{ flexDirection: "row", gap: 14, paddingHorizontal: 2 }}>
          {[1, 2, 3, 4].map((key) => (
            <View key={key} style={styles.bubbleContainer}>
              <SkeletonLoader width={66} height={66} borderRadius={33} />
              <SkeletonLoader
                width={48}
                height={10}
                borderRadius={5}
                style={{ marginTop: 6 }}
              />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={trayItems}
          renderItem={renderTrayItem}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={3}
        />
      )}

      {/* Full-Screen Interactive Story Viewer Modal */}
      {activeStoryGroup && (
        <VibeStoryViewerModal
          visible={!!activeStoryGroup}
          onClose={() => setActiveStoryGroup(null)}
          stories={activeStoryGroup.stories}
          groupTitle={activeStoryGroup.title}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginTop: 4,
  },
  containerNoHeader: {
    marginBottom: 8,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
  liveDotContainer: {
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  liveDotGlow: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
  },
  liveDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  viewAllText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 2,
  },
  bubbleContainer: {
    alignItems: "center",
    width: 72,
  },
  gradientRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  seenRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  ringInner: {
    width: "100%",
    height: "100%",
    borderRadius: 31,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  iconWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badgePill: {
    position: "absolute",
    bottom: 22,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  bubbleLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    textAlign: "center",
    width: "100%",
  },
  bubbleSublabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginTop: 1,
    width: "100%",
  },
  addOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  addInnerBox: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default memo(VibeStoriesTray);
