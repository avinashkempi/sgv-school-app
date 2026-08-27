import React, { memo, useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import {
  resolveMediaThumbnail,
  getBlurPlaceholderUrl,
  isVideoUrl,
} from "../../utils/cloudinaryUpload";
import SkeletonLoader from "../SkeletonLoader";
import UserAvatar from "../ui/UserAvatar";
import { formatUserName } from "../../utils/userFormatters";
import HomeModuleContainer from "../home/HomeModuleContainer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const formatCount = (num) => {
  const n = Math.max(0, Number(num) || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
};

const VibeSpotlightCard = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const scale = useSharedValue(1);
  const [imageError, setImageError] = useState(false);

  const { data: spotlightData, isLoading } = useApiQuery(
    ["vibeSpotlight"],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.spotlight}`,
    CACHE_TIERS.VIBES_HOME
  );

  const vibe = spotlightData?.data;

  useEffect(() => {
    setImageError(false);
  }, [vibe?._id]);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    router.push("/vibes");
  };

  const amberAccent = isDark ? "#FFB74D" : "#D97706";

  if (isLoading) {
    return (
      <HomeModuleContainer
        title="Campus Spotlight"
        icon="auto-awesome"
        accentColor={amberAccent}
        lightBg="rgba(226, 114, 0, 0.045)"
        darkBg="rgba(255, 183, 77, 0.07)"
        lightBorder="rgba(226, 114, 0, 0.14)"
        darkBorder="rgba(255, 183, 77, 0.18)"
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <SkeletonLoader width={CARD_WIDTH} height={180} borderRadius={0} />
          <View style={{ padding: 14, gap: 8 }}>
            <SkeletonLoader width={120} height={14} borderRadius={7} />
            <SkeletonLoader width={220} height={18} borderRadius={9} />
          </View>
        </View>
      </HomeModuleContainer>
    );
  }

  // If no vibe is explicitly chosen by admin for spotlight, don't render the card
  if (!vibe) {
    return null;
  }

  const primaryMedia = vibe.images?.[0];
  const optimizedCover = resolveMediaThumbnail(primaryMedia, "hero");
  const coverBlurPlaceholder = primaryMedia?.url
    ? getBlurPlaceholderUrl(primaryMedia.url)
    : null;
  const isVideo =
    primaryMedia?.type === "video" ||
    isVideoUrl(primaryMedia?.url) ||
    isVideoUrl(primaryMedia);

  const badgeConfig =
    vibe.category === "achievement"
      ? { label: "Achievement Spotlight", bg: "#D97706", icon: "emoji-events" }
      : vibe.postAs === "school" || vibe.category === "official"
        ? { label: "Official Broadcast", bg: "#2563EB", icon: "school" }
        : { label: "Campus Spotlight", bg: colors.primary, icon: "auto-awesome" };

  return (
    <HomeModuleContainer
      title="Campus Spotlight"
      icon="auto-awesome"
      accentColor={amberAccent}
      actionText="All Vibes"
      onActionPress={handlePress}
      lightBg="rgba(226, 114, 0, 0.045)"
      darkBg="rgba(255, 183, 77, 0.07)"
      lightBorder="rgba(226, 114, 0, 0.14)"
      darkBorder="rgba(255, 183, 77, 0.18)"
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          animatedStyle,
          {
            backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={vibe.caption || "Spotlight Vibe"}
      >
        {/* Cover Image with Cloudinary WebP delivery */}
        <View style={styles.mediaContainer}>
          {optimizedCover && !imageError ? (
            <Image
              source={{ uri: optimizedCover }}
              placeholder={
                coverBlurPlaceholder ? { uri: coverBlurPlaceholder } : undefined
              }
              style={styles.coverImage}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              onError={() => setImageError(true)}
            />
          ) : (
            <LinearGradient
              colors={
                vibe.category === "achievement"
                  ? ["#B45309", "#D97706", "#F59E0B"]
                  : vibe.postAs === "school" || vibe.category === "official"
                    ? ["#1E40AF", "#2563EB", "#3B82F6"]
                    : ["#1E293B", "#334155", "#475569"]
              }
              style={styles.placeholderMedia}
            >
              <MaterialIcons
                name={badgeConfig.icon}
                size={48}
                color="rgba(255,255,255,0.85)"
              />
              <Text style={styles.placeholderText}>
                {vibe.caption ? vibe.caption.slice(0, 60) : badgeConfig.label}
              </Text>
            </LinearGradient>
          )}

          {/* Sleek Gradient Overlay at bottom */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.imageOverlay}
          />

          {/* Category / Type Badge */}
          <View
            style={[styles.categoryPill, { backgroundColor: badgeConfig.bg }]}
          >
            <MaterialIcons name={badgeConfig.icon} size={12} color="#fff" />
            <Text style={styles.categoryPillText}>{badgeConfig.label}</Text>
          </View>

          {/* Video indicator */}
          {isVideo && (
            <View style={styles.videoIndicator}>
              <MaterialIcons name="play-circle-filled" size={24} color="#fff" />
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.cardBody}>
          <View style={styles.authorRow}>
            {vibe.postAs === "school" ? (
              <View
                style={[
                  styles.authorAvatarCircle,
                  {
                    backgroundColor: "#FFF8E1",
                    borderColor: "#FFB300",
                    borderWidth: 1,
                  },
                ]}
              >
                <Image
                  source={require("../../assets/images/icon.png")}
                  style={{ width: "100%", height: "100%", borderRadius: 10 }}
                  contentFit="cover"
                />
              </View>
            ) : (
              <UserAvatar
                photoUrl={vibe.author?.profilePhoto}
                name={formatUserName(vibe.author?.name, "SGV Member")}
                role={vibe.authorRole || vibe.author?.role}
                size={22}
              />
            )}
            <Text
              style={[
                styles.authorName,
                { color: colors.onSurface, flexShrink: 1 },
              ]}
              numberOfLines={1}
            >
              {vibe.postAs === "school"
                ? "SGV School"
                : formatUserName(vibe.author?.name, "SGV Member")}
            </Text>
            {vibe.postAs === "school" && (
              <MaterialIcons
                name="verified"
                size={14}
                color="#2563EB"
                style={{ flexShrink: 0 }}
              />
            )}
          </View>

          {vibe.caption ? (
            <Text
              style={[styles.captionText, { color: colors.onSurfaceVariant }]}
              numberOfLines={2}
            >
              {vibe.caption}
            </Text>
          ) : null}

          {/* Footer with reactions and CTA */}
          <View
            style={[
              styles.cardFooter,
              {
                borderTopColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <View style={styles.statsGroup}>
              <View style={styles.statItem}>
                <MaterialIcons name="favorite" size={14} color="#FF2D55" />
                <Text
                  style={[
                    styles.statNumber,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {formatCount(vibe.likesCount)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={13}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.statNumber,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {formatCount(vibe.commentsCount)}
                </Text>
              </View>
            </View>

            <View style={styles.viewMomentCta}>
              <Text style={[styles.ctaText, { color: amberAccent }]}>
                View Moment
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={13}
                color={amberAccent}
              />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </HomeModuleContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  mediaContainer: {
    height: 184,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  placeholderMedia: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  placeholderText: {
    color: "#fff",
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginTop: 6,
    opacity: 0.9,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  categoryPill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillText: {
    color: "#fff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  videoIndicator: {
    position: "absolute",
    bottom: 8,
    right: 10,
  },
  cardBody: {
    padding: 14,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  authorAvatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  authorName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  captionText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.md,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  statsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  viewMomentCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ctaText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});

export default memo(VibeSpotlightCard);
