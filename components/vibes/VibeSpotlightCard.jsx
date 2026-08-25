import React, { memo, useState } from "react";
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
import { useTheme } from "../../theme";
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
  const { colors } = useTheme();
  const router = useRouter();
  const scale = useSharedValue(1);
  const [imageError, setImageError] = useState(false);

  const { data: spotlightData, isLoading } = useApiQuery(
    ["vibeSpotlight"],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.spotlight}`,
    CACHE_TIERS.VIBES_HOME
  );

  const vibe = spotlightData?.data;

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push("/vibes");
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View
          style={[styles.card, { backgroundColor: colors.surfaceContainer }]}
        >
          <SkeletonLoader width={CARD_WIDTH} height={200} borderRadius={0} />
          <View style={{ padding: 16, gap: 8 }}>
            <SkeletonLoader width={120} height={14} borderRadius={7} />
            <SkeletonLoader width={220} height={18} borderRadius={9} />
          </View>
        </View>
      </View>
    );
  }

  // If no spotlight vibe exists, show a modern community CTA card
  if (!vibe) {
    return (
      <View style={styles.container}>
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.card,
            animatedStyle,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.fallbackHeader}>
            <LinearGradient
              colors={["#FFF3E0", "#FFE082"]}
              style={styles.fallbackIconCircle}
            >
              <MaterialIcons name="auto-awesome" size={24} color="#D97706" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  SGV Campus Vibes
                </Text>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Campus moments, achievements & student highlights
              </Text>
            </View>
            <MaterialIcons
              name="arrow-forward-ios"
              size={16}
              color={colors.primary}
            />
          </View>
        </AnimatedPressable>
      </View>
    );
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons name="stars" size={18} color={badgeConfig.bg} />
          <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>
            Spotlight
          </Text>
        </View>
        <Pressable
          onPress={handlePress}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={[styles.exploreText, { color: colors.primary }]}>
            Explore All Vibes
          </Text>
        </Pressable>
      </View>

      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          animatedStyle,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
            borderWidth: StyleSheet.hairlineWidth,
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
                size={54}
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
            <MaterialIcons name={badgeConfig.icon} size={13} color="#fff" />
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
                <MaterialIcons name="school" size={13} color="#F57F17" />
              </View>
            ) : (
              <UserAvatar
                photoUrl={vibe.author?.profilePhoto}
                name={vibe.author?.name || "SGV Member"}
                role={vibe.authorRole || vibe.author?.role}
                size={22}
              />
            )}
            <Text style={[styles.authorName, { color: colors.onSurface }]}>
              {vibe.postAs === "school"
                ? "SGV English Medium School"
                : vibe.author?.name || "SGV Member"}
            </Text>
            {vibe.postAs === "school" && (
              <MaterialIcons name="verified" size={15} color="#2563EB" />
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
          <View style={styles.cardFooter}>
            <View style={styles.statsGroup}>
              <View style={styles.statItem}>
                <MaterialIcons name="favorite" size={15} color="#FF2D55" />
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
                  size={14}
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
              <Text style={[styles.ctaText, { color: colors.primary }]}>
                View Moment
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={16}
                color={colors.primary}
              />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: "DMSans-Bold",
    letterSpacing: -0.2,
  },
  exploreText: {
    fontSize: 13,
    fontFamily: "DMSans-Bold",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  mediaContainer: {
    height: 190,
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
    paddingHorizontal: 24,
  },
  placeholderText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans-Bold",
    textAlign: "center",
    marginTop: 8,
    opacity: 0.9,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  categoryPill: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryPillText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "DMSans-Bold",
    letterSpacing: 0.2,
  },
  videoIndicator: {
    position: "absolute",
    bottom: 10,
    right: 12,
  },
  cardBody: {
    padding: 16,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  authorAvatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  authorName: {
    fontSize: 13,
    fontFamily: "DMSans-Bold",
  },
  captionText: {
    fontSize: 14,
    fontFamily: "DMSans-Regular",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150,150,150,0.15)",
  },
  statsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 12,
    fontFamily: "DMSans-Medium",
  },
  viewMomentCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: "DMSans-Bold",
  },
  fallbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  fallbackIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "DMSans-Bold",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "DMSans-Regular",
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "DMSans-Bold",
    letterSpacing: 0.5,
  },
});

export default memo(VibeSpotlightCard);
