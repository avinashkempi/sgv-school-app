import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Share,
  Alert,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";
import formatTimeAgo from "../../utils/formatTimeAgo";
import VibeImageCarousel from "./VibeImageCarousel";
import UserAvatar from "../ui/UserAvatar";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Format count numbers clearly (e.g., 0, 14, 1.2K, 10.5K, 1.5M)
 */
export const formatCount = (count) => {
  const num = Math.max(0, Number(count) || 0);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
};

/**
 * Render caption with highlighted clickable hashtags
 */
const RichCaption = ({ caption, onTagPress, colors }) => {
  if (!caption) return null;

  const parts = caption.split(/(#[a-zA-Z0-9_]+)/g);

  return (
    <Text style={[styles.captionText, { color: colors.onSurface }]}>
      {parts.map((part, index) => {
        if (part.startsWith("#")) {
          return (
            <Text
              key={index}
              onPress={() => onTagPress?.(part)}
              style={[styles.hashtag, { color: colors.primary }]}
            >
              {part}{" "}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const VibeCard = ({
  vibe,
  currentUserId,
  isAdmin,
  isVisible = false,
  onLike,
  onOpenComments,
  onOpenLikes,
  onBookmark,
  onEdit,
  onDelete,
  onTogglePin,
  onTagPress,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Optimistic local states synced with parent/props
  const [isLiked, setIsLiked] = useState(!!vibe.isLiked);
  const [likesCount, setLikesCount] = useState(
    Math.max(0, Number(vibe.likesCount) || 0)
  );
  const [commentsCount, setCommentsCount] = useState(
    Math.max(0, Number(vibe.commentsCount) || 0)
  );
  const [isBookmarked, setIsBookmarked] = useState(!!vibe.isBookmarked);

  useEffect(() => {
    setIsLiked(!!vibe.isLiked);
    setLikesCount(Math.max(0, Number(vibe.likesCount) || 0));
    setCommentsCount(Math.max(0, Number(vibe.commentsCount) || 0));
    setIsBookmarked(!!vibe.isBookmarked);
  }, [vibe.isLiked, vibe.likesCount, vibe.commentsCount, vibe.isBookmarked]);

  // Animation values for Like and Bookmark icons
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  const isSchoolPost = vibe.postAs === "school" || vibe.category === "official";
  const isAuthor = currentUserId && (vibe.author?._id === currentUserId || vibe.author === currentUserId);
  const canModerate = isAdmin || isAuthor;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleLikePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    likeScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 350 }),
      withSpring(1.0, { damping: 10, stiffness: 300 })
    );

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(prev - 1, 0)));

    onLike?.(vibe._id, nextLiked);
  }, [isLiked, vibe._id, onLike, likeScale]);

  const handleDoubleTapLike = useCallback(() => {
    if (!isLiked) {
      likeScale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 350 }),
        withSpring(1.0, { damping: 10, stiffness: 300 })
      );
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
      onLike?.(vibe._id, true);
    }
  }, [isLiked, vibe._id, onLike, likeScale]);

  const handleBookmarkPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    bookmarkScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 350 }),
      withSpring(1.0, { damping: 10, stiffness: 300 })
    );

    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);
    onBookmark?.(vibe._id, nextBookmarked);
  }, [isBookmarked, vibe._id, onBookmark, bookmarkScale]);

  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const APP_DOWNLOAD_URL =
        "https://play.google.com/store/apps/details?id=com.sgvschool.app";
      const authorName = isSchoolPost
        ? "SGV School"
        : vibe.author?.name || "Community Member";
      const shareTitle = isSchoolPost
        ? "✨ SGV School Vibes ✨"
        : `✨ SGV School Vibe by ${authorName} ✨`;

      const messageLines = [shareTitle, "━━━━━━━━━━━━━━━━━━━━"];

      if (vibe.caption && vibe.caption.trim()) {
        messageLines.push(`${vibe.caption.trim()}\n`);
      }

      if (vibe.location && vibe.location.trim()) {
        messageLines.push(`📍 ${vibe.location.trim()}`);
      }

      if (vibe.tags && vibe.tags.length > 0) {
        const formattedTags = vibe.tags
          .map((t) => (t.startsWith("#") ? t : `#${t}`))
          .join(" ");
        messageLines.push(`🏷️ ${formattedTags}`);
      }

      messageLines.push("━━━━━━━━━━━━━━━━━━━━");
      messageLines.push("📲 Download the SGV School App to view more:");
      messageLines.push(APP_DOWNLOAD_URL);

      const shareMessage = messageLines.join("\n");
      const firstImage =
        vibe.images?.[0]?.url ||
        (typeof vibe.images?.[0] === "string" ? vibe.images[0] : null);

      if (Platform.OS === "web") {
        if (firstImage) {
          try {
            const response = await fetch(firstImage);
            const blob = await response.blob();
            const file = new File([blob], "vibe_share.jpg", {
              type: "image/jpeg",
            });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: shareTitle,
                text: shareMessage,
              });
              setIsSharing(false);
              return;
            }
          } catch (e) {
            console.warn("Web file share error:", e);
          }
        }

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
          shareMessage
        )}`;
        if (typeof window !== "undefined") {
          window.open(waUrl, "_blank");
        }
        setIsSharing(false);
        return;
      }

      await Clipboard.setStringAsync(shareMessage).catch(() => {});

      if (firstImage) {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          const localUri = `${
            FileSystem.cacheDirectory
          }vibe_share_${Date.now()}.jpg`;
          const downloadRes = await FileSystem.downloadAsync(
            firstImage,
            localUri
          );

          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: "image/jpeg",
            dialogTitle: shareTitle,
            UTI: "public.jpeg",
          });
          setIsSharing(false);
          return;
        }
      }

      await Share.share({
        title: shareTitle,
        message: shareMessage,
      });
    } catch (err) {
      console.warn("Share error:", err);
    } finally {
      setIsSharing(false);
    }
  }, [
    isSharing,
    isSchoolPost,
    vibe.author?.name,
    vibe.caption,
    vibe.location,
    vibe.tags,
    vibe.images,
  ]);

  const handleMenuPress = useCallback(() => {
    const options = [
      { text: "Share", onPress: handleShare },
      {
        text: isBookmarked ? "Remove from Saved" : "Save Vibe",
        onPress: handleBookmarkPress,
      },
    ];

    if (isAdmin) {
      options.push({
        text: vibe.isPinned ? "Unpin from Top" : "Pin to Top",
        onPress: () => onTogglePin?.(vibe),
      });
    }

    if (canModerate) {
      options.push({ text: "Edit", onPress: () => onEdit?.(vibe) });
      options.push({
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Vibe",
            "Are you sure you want to delete this vibe?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => onDelete?.(vibe),
              },
            ]
          );
        },
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Vibe Options", undefined, options);
  }, [
    handleShare,
    isBookmarked,
    handleBookmarkPress,
    isAdmin,
    vibe,
    onTogglePin,
    canModerate,
    onEdit,
    onDelete,
  ]);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const categoryMeta = useMemo(() => {
    switch (vibe.category) {
      case "achievement":
        return {
          label: "Achievement",
          icon: "emoji-events",
          color: "#D97706",
          bg: "#FEF3C7",
        };
      case "sports":
        return {
          label: "Sports",
          icon: "sports-soccer",
          color: "#059669",
          bg: "#D1FAE5",
        };
      case "arts":
        return {
          label: "Arts & Culture",
          icon: "palette",
          color: "#7C3AED",
          bg: "#EDE9FE",
        };
      case "life":
        return {
          label: "Campus Life",
          icon: "local-florist",
          color: "#0284C7",
          bg: "#E0F2FE",
        };
      case "official":
        return {
          label: "Official",
          icon: "school",
          color: "#2563EB",
          bg: "#DBEAFE",
        };
      default:
        return null;
    }
  }, [vibe.category]);

  const authorRoleLabel = useMemo(() => {
    if (isSchoolPost) return "Official";
    const role = vibe.authorRole || vibe.author?.role;
    if (role === "student") {
      return vibe.author?.currentClass ? `Student • ${vibe.author.currentClass}` : "Student";
    }
    if (role === "teacher") {
      return vibe.author?.designation ? `Faculty • ${vibe.author.designation}` : "Faculty";
    }
    if (role === "admin" || role === "super admin") return "Admin";
    if (role === "staff") return "Staff";
    return role || "Member";
  }, [isSchoolPost, vibe.authorRole, vibe.author]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
        },
      ]}
    >
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          {/* Avatar Icon / UserAvatar */}
          {isSchoolPost ? (
            <View style={styles.schoolAvatarCircle}>
              <MaterialIcons name="school" size={20} color="#2563EB" />
            </View>
          ) : (
            <UserAvatar
              photoUrl={vibe.author?.profilePhoto}
              name={vibe.author?.name || "Community Member"}
              role={vibe.authorRole || vibe.author?.role}
              size={40}
            />
          )}

          {/* Name, Role, Location, Time */}
          <View style={styles.authorDetails}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.authorName, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {isSchoolPost
                  ? "SGV English Medium School"
                  : vibe.author?.name || "Community Member"}
              </Text>
              {isSchoolPost && (
                <MaterialIcons name="verified" size={15} color="#2563EB" style={styles.verifiedBadge} />
              )}
            </View>

            <View style={styles.subMetaRow}>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isSchoolPost
                      ? "#DBEAFE"
                      : colors.surfaceContainerHighest,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    {
                      color: isSchoolPost
                        ? "#1D4ED8"
                        : colors.onSurfaceVariant,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {authorRoleLabel}
                </Text>
              </View>

              {vibe.location ? (
                <Text
                  style={[
                    styles.metaDotText,
                    { color: colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  • {vibe.location}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.metaDotText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                • {formatTimeAgo(vibe.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Category Pill / Pinned & Options Menu */}
        <View style={styles.headerRight}>
          {categoryMeta && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryMeta.bg },
              ]}
            >
              <MaterialIcons
                name={categoryMeta.icon}
                size={12}
                color={categoryMeta.color}
              />
              <Text
                style={[styles.categoryText, { color: categoryMeta.color }]}
              >
                {categoryMeta.label}
              </Text>
            </View>
          )}

          {vibe.isPinned && (
            <View
              style={[
                styles.pinBadge,
                { backgroundColor: colors.tertiaryContainer || "#FEF3C7" },
              ]}
            >
              <MaterialIcons
                name="push-pin"
                size={13}
                color={colors.onTertiaryContainer || "#D97706"}
              />
            </View>
          )}

          <Pressable
            onPress={handleMenuPress}
            hitSlop={12}
            style={({ pressed }) => [
              styles.menuButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <MaterialIcons
              name="more-vert"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        </View>
      </View>

      {/* ──── Media Carousel / Video Player ──── */}
      {vibe.images && vibe.images.length > 0 && (
        <View style={styles.mediaContainer}>
          <VibeImageCarousel
            images={vibe.images}
            width={SCREEN_WIDTH - 24}
            isVisible={isVisible}
            onDoubleTapLike={handleDoubleTapLike}
          />
        </View>
      )}

      {/* ──── Action Bar (Interactive Like, Comment, Share, Bookmark Capsules) ──── */}
      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          {/* Like Pill Button with clear count */}
          <Pressable
            onPress={handleLikePress}
            hitSlop={6}
            style={[
              styles.actionPill,
              {
                backgroundColor: isLiked
                  ? "rgba(255, 45, 85, 0.12)"
                  : colors.surfaceContainerHighest,
                borderColor: isLiked
                  ? "rgba(255, 45, 85, 0.3)"
                  : colors.outlineVariant || "transparent",
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${likesCount} likes, ${isLiked ? 'liked' : 'not liked'}`}
          >
            <Animated.View style={likeAnimatedStyle}>
              {isLiked ? (
                <MaterialIcons name="favorite" size={20} color="#FF2D55" />
              ) : (
                <MaterialIcons
                  name="favorite-border"
                  size={20}
                  color={colors.onSurface}
                />
              )}
            </Animated.View>
            <Text
              style={[
                styles.actionCountText,
                {
                  color: isLiked ? "#FF2D55" : colors.onSurface,
                  fontFamily: "DMSans-Bold",
                },
              ]}
            >
              {formatCount(likesCount)}
            </Text>
          </Pressable>

          {/* Comment Pill Button with clear count */}
          <Pressable
            onPress={() => onOpenComments?.(vibe)}
            hitSlop={6}
            style={[
              styles.actionPill,
              {
                backgroundColor: colors.surfaceContainerHighest,
                borderColor: colors.outlineVariant || "transparent",
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${commentsCount} comments`}
          >
            <FontAwesome
              name="comment-o"
              size={18}
              color={colors.onSurface}
              style={{ marginTop: 1 }}
            />
            <Text
              style={[
                styles.actionCountText,
                { color: colors.onSurface, fontFamily: "DMSans-Bold" },
              ]}
            >
              {formatCount(commentsCount)}
            </Text>
          </Pressable>

          {/* Share Button */}
          <Pressable
            onPress={handleShare}
            disabled={isSharing}
            hitSlop={8}
            style={[
              styles.circleActionBtn,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Share vibe"
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="send" size={18} color={colors.onSurface} />
            )}
          </Pressable>
        </View>

        {/* Bookmark Button */}
        <Pressable
          onPress={handleBookmarkPress}
          hitSlop={8}
          style={[
            styles.circleActionBtn,
            {
              backgroundColor: isBookmarked
                ? "rgba(37, 99, 235, 0.12)"
                : colors.surfaceContainerHighest,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? "Remove from saved" : "Save vibe"}
        >
          <Animated.View style={bookmarkAnimatedStyle}>
            {isBookmarked ? (
              <MaterialIcons name="bookmark" size={20} color={colors.primary} />
            ) : (
              <MaterialIcons
                name="bookmark-border"
                size={20}
                color={colors.onSurface}
              />
            )}
          </Animated.View>
        </Pressable>
      </View>

      {/* ──── Content & Social Summary Section ──── */}
      <View style={styles.contentSection}>
        {/* Detailed Likes Row (Clickable) */}
        <View style={styles.socialSummaryRow}>
          <Pressable
            onPress={() => onOpenLikes?.(vibe._id)}
            hitSlop={6}
            style={styles.likesLinkBtn}
          >
            <View style={styles.tinyHeartIcon}>
              <MaterialIcons name="favorite" size={12} color="#FF2D55" />
            </View>
            <Text style={[styles.likesDetailedText, { color: colors.onSurface }]}>
              {likesCount > 0 ? (
                <>
                  <Text style={{ fontFamily: "DMSans-Bold" }}>
                    {likesCount.toLocaleString()}{" "}
                    {likesCount === 1 ? "person liked" : "people liked"}
                  </Text>
                  <Text style={[styles.viewLikesHint, { color: colors.primary }]}>
                    {" "}• View all
                  </Text>
                </>
              ) : (
                <Text style={{ color: colors.onSurfaceVariant }}>
                  Be the first to like this
                </Text>
              )}
            </Text>
          </Pressable>
        </View>

        {/* ──── Caption ──── */}
        {vibe.caption ? (
          <View style={styles.captionContainer}>
            <Text
              style={styles.captionWrapper}
              numberOfLines={expanded ? undefined : 3}
            >
              <Text style={[styles.captionAuthor, { color: colors.onSurface }]}>
                {isSchoolPost
                  ? "SGV School"
                  : vibe.author?.name
                  ? vibe.author.name.split(" ")[0]
                  : "Author"}{" "}
              </Text>
              <RichCaption
                caption={vibe.caption}
                onTagPress={onTagPress}
                colors={colors}
              />
            </Text>
            {vibe.caption.length > 110 && (
              <Pressable onPress={toggleExpand} hitSlop={8} style={styles.morePressable}>
                <Text
                  style={[styles.moreText, { color: colors.primary }]}
                >
                  {expanded ? "Show less" : "...more"}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* ──── Comments Preview & Add Prompt ──── */}
        <View style={styles.commentsSection}>
          <Pressable
            onPress={() => onOpenComments?.(vibe)}
            style={styles.viewCommentsRow}
            hitSlop={6}
          >
            <Text
              style={[
                styles.viewCommentsText,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {commentsCount > 0
                ? `View all ${commentsCount} ${commentsCount === 1 ? "comment" : "comments"}`
                : "Add a comment..."}
            </Text>
            {commentsCount > 0 && (
              <MaterialIcons
                name="chevron-right"
                size={16}
                color={colors.onSurfaceVariant}
              />
            )}
          </Pressable>

          {/* Quick Add Comment Prompt with Emojis */}
          <Pressable
            onPress={() => onOpenComments?.(vibe)}
            style={[
              styles.addCommentPrompt,
              {
                backgroundColor: colors.surfaceContainerHighest,
                borderColor: colors.outlineVariant || "transparent",
              },
            ]}
          >
            <Text
              style={[styles.addCommentPlaceholder, { color: colors.onSurfaceVariant }]}
            >
              Write a comment...
            </Text>
            <View style={styles.quickEmojisRow}>
              {["❤️", "🔥", "👏"].map((emoji) => (
                <Text key={emoji} style={styles.quickEmojiText}>
                  {emoji}
                </Text>
              ))}
            </View>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  schoolAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  authorDetails: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontFamily: "DMSans-Bold",
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    marginLeft: 1,
  },
  subMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    flexWrap: "nowrap",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: "DMSans-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaDotText: {
    fontSize: 11,
    fontFamily: "DMSans-Regular",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    gap: 3.5,
  },
  categoryText: {
    fontSize: 10.5,
    fontFamily: "DMSans-Bold",
  },
  pinBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  menuButton: {
    padding: 4,
  },
  mediaContainer: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "center",
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionCountText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  circleActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  contentSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  socialSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  likesLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tinyHeartIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 45, 85, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  likesDetailedText: {
    fontSize: 12.5,
    fontFamily: "DMSans-Regular",
  },
  viewLikesHint: {
    fontFamily: "DMSans-Bold",
  },
  captionContainer: {
    marginTop: 2,
    marginBottom: 6,
  },
  captionWrapper: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: "DMSans-Regular",
  },
  captionAuthor: {
    fontFamily: "DMSans-Bold",
  },
  captionText: {
    fontFamily: "DMSans-Regular",
  },
  hashtag: {
    fontFamily: "DMSans-Bold",
  },
  morePressable: {
    marginTop: 2,
    alignSelf: "flex-start",
  },
  moreText: {
    fontSize: 12,
    fontFamily: "DMSans-Bold",
  },
  commentsSection: {
    marginTop: 2,
    gap: 6,
  },
  viewCommentsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  viewCommentsText: {
    fontSize: 12.5,
    fontFamily: "DMSans-Medium",
  },
  addCommentPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  addCommentPlaceholder: {
    fontSize: 12.5,
    fontFamily: "DMSans-Regular",
  },
  quickEmojisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickEmojiText: {
    fontSize: 14,
  },
});

export default React.memo(VibeCard, (prevProps, nextProps) => {
  return (
    prevProps.vibe._id === nextProps.vibe._id &&
    prevProps.vibe.isLiked === nextProps.vibe.isLiked &&
    prevProps.vibe.likesCount === nextProps.vibe.likesCount &&
    prevProps.vibe.isBookmarked === nextProps.vibe.isBookmarked &&
    prevProps.vibe.commentsCount === nextProps.vibe.commentsCount &&
    prevProps.vibe.isPinned === nextProps.vibe.isPinned &&
    prevProps.vibe.author?.profilePhoto === nextProps.vibe.author?.profilePhoto &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});
