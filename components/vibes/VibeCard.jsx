import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { Image } from 'expo-image';
import { getAvatarUrl, getBlurPlaceholderUrl } from '../../utils/cloudinaryUpload';
import formatTimeAgo from '../../utils/formatTimeAgo';
import VibeImageCarousel from './VibeImageCarousel';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Render caption with highlighted clickable hashtags
 */
const RichCaption = ({ caption, onTagPress, colors }) => {
  if (!caption) return null;

  const parts = caption.split(/(#[a-zA-Z0-9_]+)/g);

  return (
    <Text style={[styles.captionText, { color: colors.onSurface }]}>
      {parts.map((part, index) => {
        if (part.startsWith('#')) {
          return (
            <Text
              key={index}
              onPress={() => onTagPress?.(part)}
              style={[styles.hashtag, { color: colors.primary }]}
            >
              {part}{' '}
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
  const [likesCount, setLikesCount] = useState(vibe.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(!!vibe.isBookmarked);

  useEffect(() => {
    setIsLiked(!!vibe.isLiked);
    setLikesCount(vibe.likesCount || 0);
    setIsBookmarked(!!vibe.isBookmarked);
  }, [vibe.isLiked, vibe.likesCount, vibe.isBookmarked]);

  // Animation values for Like and Bookmark icons
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  const isSchoolPost = vibe.postAs === 'school';
  const isAuthor = currentUserId && vibe.author?._id === currentUserId;
  const canModerate = isAdmin || isAuthor;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  const handleLikePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    likeScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 350 }),
      withSpring(1.0, { damping: 10, stiffness: 300 })
    );

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : Math.max(prev - 1, 0));

    onLike?.(vibe._id, nextLiked);
  }, [isLiked, vibe._id, onLike, likeScale]);

  const handleDoubleTapLike = useCallback(() => {
    if (!isLiked) {
      likeScale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 350 }),
        withSpring(1.0, { damping: 10, stiffness: 300 })
      );
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
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
      const APP_DOWNLOAD_URL = 'https://play.google.com/store/apps/details?id=com.sgvschool.app';
      const authorName = isSchoolPost ? 'SGV School' : (vibe.author?.name || 'Community Member');
      const shareTitle = isSchoolPost ? '✨ SGV School Vibes ✨' : `✨ SGV School Vibe by ${authorName} ✨`;

      const messageLines = [
        shareTitle,
        '━━━━━━━━━━━━━━━━━━━━',
      ];

      if (vibe.caption && vibe.caption.trim()) {
        messageLines.push(`${vibe.caption.trim()}\n`);
      }

      if (vibe.location && vibe.location.trim()) {
        messageLines.push(`📍 ${vibe.location.trim()}`);
      }

      if (vibe.tags && vibe.tags.length > 0) {
        const formattedTags = vibe.tags.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' ');
        messageLines.push(`🏷️ ${formattedTags}`);
      }

      messageLines.push('━━━━━━━━━━━━━━━━━━━━');
      messageLines.push('📲 Download the SGV School App to view more:');
      messageLines.push(APP_DOWNLOAD_URL);

      const shareMessage = messageLines.join('\n');
      const firstImage = vibe.images?.[0]?.url || (typeof vibe.images?.[0] === 'string' ? vibe.images[0] : null);

      if (Platform.OS === 'web') {
        if (firstImage) {
          try {
            const response = await fetch(firstImage);
            const blob = await response.blob();
            const file = new File([blob], 'vibe_share.jpg', { type: 'image/jpeg' });
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
            console.warn('Web file share error:', e);
          }
        }

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
        if (typeof window !== 'undefined') {
          window.open(waUrl, '_blank');
        }
        setIsSharing(false);
        return;
      }

      await Clipboard.setStringAsync(shareMessage).catch(() => {});

      if (firstImage) {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          const localUri = `${FileSystem.cacheDirectory}vibe_share_${Date.now()}.jpg`;
          const downloadRes = await FileSystem.downloadAsync(firstImage, localUri);

          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: 'image/jpeg',
            dialogTitle: shareTitle,
            UTI: 'public.jpeg',
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
      console.warn('Share error:', err);
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, isSchoolPost, vibe.author?.name, vibe.caption, vibe.location, vibe.tags, vibe.images]);

  const handleMenuPress = useCallback(() => {
    const options = [
      { text: 'Share', onPress: handleShare },
      { text: isBookmarked ? 'Remove from Saved' : 'Save Vibe', onPress: handleBookmarkPress },
    ];

    if (isAdmin) {
      options.push({
        text: vibe.isPinned ? 'Unpin from Top' : 'Pin to Top',
        onPress: () => onTogglePin?.(vibe)
      });
    }

    if (canModerate) {
      options.push({ text: 'Edit', onPress: () => onEdit?.(vibe) });
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Vibe', 'Are you sure you want to delete this vibe?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(vibe) },
          ]);
        }
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Vibe Options', undefined, options);
  }, [handleShare, isBookmarked, handleBookmarkPress, isAdmin, vibe, onTogglePin, canModerate, onEdit, onDelete]);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const categoryMeta = useMemo(() => {
    switch (vibe.category) {
      case 'achievement':
        return { label: 'Achievement', icon: 'emoji-events', color: '#E65100', bg: '#FFF3E0' };
      case 'sports':
        return { label: 'Sports', icon: 'sports-soccer', color: '#2E7D32', bg: '#E8F5E9' };
      case 'arts':
        return { label: 'Arts & Culture', icon: 'palette', color: '#6A1B9A', bg: '#F3E5F5' };
      case 'life':
        return { label: 'Campus Life', icon: 'local-florist', color: '#00838F', bg: '#E0F7FA' };
      default:
        return null;
    }
  }, [vibe.category]);

  const authorAvatarUri = vibe.author?.profilePhoto ? getAvatarUrl(vibe.author.profilePhoto, 100) : null;
  const authorAvatarBlur = authorAvatarUri ? getBlurPlaceholderUrl(authorAvatarUri) : null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          {/* Avatar Icon / Shield */}
          <View style={[
            styles.avatarCircle,
            {
              backgroundColor: isSchoolPost ? '#FFF8E1' : colors.primaryContainer,
              borderColor: isSchoolPost ? '#FFB300' : 'transparent',
              borderWidth: isSchoolPost ? 1.5 : 0,
              overflow: 'hidden',
            }
          ]}>
            {isSchoolPost ? (
              <MaterialIcons name="school" size={22} color="#F57F17" />
            ) : authorAvatarUri ? (
              <Image
                source={{ uri: authorAvatarUri }}
                placeholder={authorAvatarBlur ? { uri: authorAvatarBlur } : undefined}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: colors.onPrimaryContainer }]}>
                {vibe.author?.name ? vibe.author.name[0].toUpperCase() : 'U'}
              </Text>
            )}
          </View>

          {/* Name & Role */}
          <View style={styles.authorDetails}>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: colors.onSurface }]} numberOfLines={1}>
                {isSchoolPost ? 'SGV School' : (vibe.author?.name || 'Community Member')}
              </Text>
              {isSchoolPost && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={14} color="#FFB300" />
                </View>
              )}
            </View>

            <View style={styles.subMetaRow}>
              {isSchoolPost ? (
                <View style={[styles.roleBadge, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.roleBadgeText, { color: '#E65100' }]}>Official</Text>
                </View>
              ) : vibe.authorRole ? (
                <View style={[styles.roleBadge, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.onSurfaceVariant }]}>
                    {vibe.authorRole === 'student' ? 'Student' : vibe.authorRole === 'teacher' ? 'Teacher' : 'Staff'}
                  </Text>
                </View>
              ) : null}

              {vibe.location ? (
                <Text style={[styles.locationText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                  • {vibe.location}
                </Text>
              ) : null}

              <Text style={[styles.timeAgoText, { color: colors.onSurfaceVariant }]}>
                • {formatTimeAgo(vibe.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Pinned Badge & Menu */}
        <View style={styles.headerRight}>
          {vibe.isPinned && (
            <View style={[styles.pinBadge, { backgroundColor: colors.tertiaryContainer }]}>
              <MaterialIcons name="push-pin" size={12} color={colors.onTertiaryContainer} />
            </View>
          )}
          <Pressable
            onPress={handleMenuPress}
            hitSlop={12}
            style={({ pressed }) => [styles.menuButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <MaterialIcons name="more-vert" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      {/* ──── Media Carousel ──── */}
      {vibe.images && vibe.images.length > 0 && (
        <VibeImageCarousel
          images={vibe.images}
          width={SCREEN_WIDTH}
          isVisible={isVisible}
          onDoubleTapLike={handleDoubleTapLike}
        />
      )}

      {/* ──── Action Bar (Likes, Comments, Share, Bookmark) ──── */}
      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          {/* Like button */}
          <Pressable onPress={handleLikePress} hitSlop={10} style={styles.actionButton}>
            <Animated.View style={likeAnimatedStyle}>
              {isLiked ? (
                <MaterialIcons name="favorite" size={26} color="#FF2D55" />
              ) : (
                <MaterialIcons name="favorite-border" size={26} color={colors.onSurface} />
              )}
            </Animated.View>
          </Pressable>

          {/* Comment button */}
          <Pressable onPress={() => onOpenComments?.(vibe)} hitSlop={10} style={styles.actionButton}>
            <FontAwesome name="comment-o" size={24} color={colors.onSurface} />
          </Pressable>

          {/* Share button */}
          <Pressable onPress={handleShare} disabled={isSharing} hitSlop={10} style={styles.actionButton}>
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="send" size={24} color={colors.onSurface} />
            )}
          </Pressable>
        </View>

        {/* Bookmark button */}
        <Pressable onPress={handleBookmarkPress} hitSlop={10} style={styles.actionButton}>
          <Animated.View style={bookmarkAnimatedStyle}>
            {isBookmarked ? (
              <MaterialIcons name="bookmark" size={26} color={colors.primary} />
            ) : (
              <MaterialIcons name="bookmark-border" size={26} color={colors.onSurface} />
            )}
          </Animated.View>
        </Pressable>
      </View>

      {/* ──── Likes & Category ──── */}
      <View style={styles.contentSection}>
        <View style={styles.likesRow}>
          {likesCount > 0 ? (
            <Pressable onPress={() => onOpenLikes?.(vibe._id)} hitSlop={6}>
              <Text style={[styles.likesCountText, { color: colors.onSurface }]}>
                {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.noLikesText, { color: colors.onSurfaceVariant }]}>
              Be the first to like this
            </Text>
          )}

          {categoryMeta && (
            <View style={[styles.categoryBadge, { backgroundColor: categoryMeta.bg }]}>
              <MaterialIcons name={categoryMeta.icon} size={12} color={categoryMeta.color} />
              <Text style={[styles.categoryText, { color: categoryMeta.color }]}>
                {categoryMeta.label}
              </Text>
            </View>
          )}
        </View>

        {/* ──── Caption ──── */}
        {vibe.caption ? (
          <View style={styles.captionContainer}>
            <Text
              style={[styles.captionWrapper]}
              numberOfLines={expanded ? undefined : 3}
            >
              <Text style={[styles.captionAuthor, { color: colors.onSurface }]}>
                {isSchoolPost ? 'SGV School' : (vibe.author?.name ? vibe.author.name.split(' ')[0] : 'Author')}{' '}
              </Text>
              <RichCaption caption={vibe.caption} onTagPress={onTagPress} colors={colors} />
            </Text>
            {vibe.caption.length > 110 && (
              <Pressable onPress={toggleExpand} hitSlop={6}>
                <Text style={[styles.moreText, { color: colors.onSurfaceVariant }]}>
                  {expanded ? 'less' : 'more'}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* ──── Comments Preview Button ──── */}
        {vibe.commentsCount > 0 ? (
          <Pressable onPress={() => onOpenComments?.(vibe)} style={styles.viewCommentsRow}>
            <Text style={[styles.viewCommentsText, { color: colors.onSurfaceVariant }]}>
              View all {vibe.commentsCount} {vibe.commentsCount === 1 ? 'comment' : 'comments'}
            </Text>
          </Pressable>
        ) : null}

        {/* Quick Add Comment Prompt */}
        <Pressable
          onPress={() => onOpenComments?.(vibe)}
          style={[styles.addCommentPrompt, { borderColor: colors.outlineVariant }]}
        >
          <Text style={[styles.addCommentText, { color: colors.onSurfaceVariant }]}>
            Add a comment...
          </Text>
          <Text style={styles.emojiShortcut}>❤️ 🔥 👏</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  authorDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
  },
  timeAgoText: {
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  menuButton: {
    padding: 4,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 2,
  },
  contentSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  likesCountText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  noLikesText: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
  },
  captionContainer: {
    marginTop: 2,
    marginBottom: 6,
  },
  captionWrapper: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'DMSans-Regular',
  },
  captionAuthor: {
    fontFamily: 'DMSans-Bold',
  },
  captionText: {
    fontFamily: 'DMSans-Regular',
  },
  hashtag: {
    fontFamily: 'DMSans-Bold',
  },
  moreText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    marginTop: 2,
  },
  viewCommentsRow: {
    marginTop: 4,
    marginBottom: 8,
  },
  viewCommentsText: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
  },
  addCommentPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 0.5,
    marginTop: 4,
  },
  addCommentText: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
  },
  emojiShortcut: {
    fontSize: 13,
    letterSpacing: 2,
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
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});
