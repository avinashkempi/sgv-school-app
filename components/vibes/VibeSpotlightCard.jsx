import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { CACHE_TIERS } from '../../utils/cacheConfig';
import { getHeroBannerUrl, getBlurPlaceholderUrl } from '../../utils/cloudinaryUpload';
import SkeletonLoader from '../SkeletonLoader';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VibeSpotlightCard = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const scale = useSharedValue(1);


  const { data: spotlightData, isLoading } = useApiQuery(
    ['vibeSpotlight'],
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
    router.push('/vibes');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
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
              borderColor: colors.outlineVariant,
              borderWidth: 1,
            }
          ]}
        >
          <View style={styles.fallbackHeader}>
            <View style={[styles.fallbackIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="auto-awesome" size={24} color="#FF9800" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  SGV Vibes
                </Text>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                Campus moments, achievements & creative stories
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  const coverImageUri = vibe.images?.[0]?.url;
  const optimizedCover = coverImageUri ? getHeroBannerUrl(coverImageUri) : null;
  const coverBlurPlaceholder = coverImageUri ? getBlurPlaceholderUrl(coverImageUri) : null;
  const isVideo = vibe.images?.[0]?.type === 'video';


  const badgeConfig = vibe.category === 'achievement'
    ? { label: 'Achievement Spotlight', bg: '#F59E0B', icon: 'emoji-events' }
    : vibe.postAs === 'school' || vibe.category === 'official'
      ? { label: 'Official Broadcast', bg: '#2563EB', icon: 'school' }
      : { label: 'Campus Spotlight', bg: colors.primary, icon: 'auto-awesome' };

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
          }
        ]}
        accessibilityRole="button"
        accessibilityLabel={vibe.caption || 'Spotlight Vibe'}
      >
        {/* Cover Image with Cloudinary WebP delivery */}
        <View style={styles.mediaContainer}>
          {optimizedCover ? (
            <Image
              source={{ uri: optimizedCover }}
              placeholder={coverBlurPlaceholder ? { uri: coverBlurPlaceholder } : undefined}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.placeholderMedia, { backgroundColor: colors.surfaceContainerHighest }]}>
              <MaterialIcons name="auto-awesome" size={48} color={colors.primary} />
            </View>
          )}

          {/* Sleek Gradient Overlay at bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={styles.imageOverlay}
          />

          {/* Category / Type Badge */}
          <View style={[styles.categoryPill, { backgroundColor: badgeConfig.bg }]}>
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
            <Text style={[styles.authorName, { color: colors.onSurface }]}>
              {vibe.postAs === 'school' ? 'SGV English Medium School' : (vibe.author?.name || 'SGV Member')}
            </Text>
            {vibe.postAs === 'school' && (
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
                <MaterialIcons name="favorite" size={14} color="#EF4444" />
                <Text style={[styles.statNumber, { color: colors.onSurfaceVariant }]}>
                  {vibe.likesCount || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="chat-bubble-outline" size={14} color={colors.onSurfaceVariant} />
                <Text style={[styles.statNumber, { color: colors.onSurfaceVariant }]}>
                  {vibe.commentsCount || 0}
                </Text>
              </View>
            </View>

            <View style={styles.viewMomentCta}>
              <Text style={[styles.ctaText, { color: colors.primary }]}>
                View Moment
              </Text>
              <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    letterSpacing: -0.2,
  },
  exploreText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  mediaContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderMedia: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  categoryPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryPillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 0.2,
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 12,
  },
  cardBody: {
    padding: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  authorName: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  captionText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.15)',
  },
  statsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
  },
  viewMomentCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  fallbackIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 0.5,
  },
});

export default memo(VibeSpotlightCard);
