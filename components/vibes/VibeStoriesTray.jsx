import React, { memo, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { CACHE_TIERS } from '../../utils/cacheConfig';
import { getStoryThumbnailUrl } from '../../utils/cloudinaryUpload';
import SkeletonLoader from '../SkeletonLoader';
import VibeStoryViewerModal from './VibeStoryViewerModal';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Single Story Ring Bubble with Spring Motion & Haptics
 */
const StoryBubble = memo(({
  title,
  subtitle,
  imageUri,
  icon,
  ringColor,
  isSpecial,
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  const optimizedImg = imageUri ? getStoryThumbnailUrl(imageUri) : null;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.bubbleContainer, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[
        styles.ringOuter,
        { borderColor: ringColor || colors.primary }
      ]}>
        <View style={[styles.ringInner, { backgroundColor: colors.surfaceContainer }]}>
          {optimizedImg ? (
            <Image
              source={{ uri: optimizedImg }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[
              styles.iconWrapper,
              { backgroundColor: ringColor ? ringColor + '20' : colors.primaryContainer }
            ]}>
              <MaterialIcons
                name={icon || 'auto-awesome'}
                size={26}
                color={ringColor || colors.primary}
              />
            </View>
          )}

          {/* Badge indicator on bottom-right of circle */}
          {badgeIcon && (
            <View style={[styles.badgePill, { backgroundColor: ringColor || colors.primary }]}>
              <MaterialIcons name={badgeIcon} size={11} color="#fff" />
            </View>
          )}
        </View>
      </View>

      <Text
        style={[
          styles.bubbleLabel,
          {
            color: colors.onSurface,
            fontFamily: isSpecial ? 'DMSans-Bold' : 'DMSans-Medium',
          }
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[styles.bubbleSublabel, { color: colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      )}
    </AnimatedPressable>
  );
});

StoryBubble.displayName = 'StoryBubble';

/**
 * VibeStoriesTray — horizontal story bar displayed near the top of the Home Page.
 */
const VibeStoriesTray = ({ onOpenCreate }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Full-screen Story Viewer State
  const [activeStoryGroup, setActiveStoryGroup] = useState(null); // { stories: [], title: '' }

  const { data: highlightsData, isLoading } = useApiQuery(
    ['vibeHighlights'],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.highlights}`,
    {
      ...CACHE_TIERS.MODERATE,
      staleTime: 60 * 1000, // 1 min freshness
    }
  );

  const officialVibes = useMemo(() => highlightsData?.data?.official || [], [highlightsData]);
  const achievementVibes = useMemo(() => highlightsData?.data?.achievements || [], [highlightsData]);
  const authorStories = useMemo(() => highlightsData?.data?.stories || [], [highlightsData]);

  const handleOpenOfficialStories = useCallback(() => {
    if (officialVibes.length > 0) {
      setActiveStoryGroup({
        stories: officialVibes,
        title: 'SGV Official',
      });
    } else {
      router.push({ pathname: '/vibes', params: { category: 'official' } });
    }
  }, [officialVibes, router]);

  const handleOpenAchievementStories = useCallback(() => {
    if (achievementVibes.length > 0) {
      setActiveStoryGroup({
        stories: achievementVibes,
        title: 'Achievements Spotlight',
      });
    } else {
      router.push({ pathname: '/vibes', params: { category: 'achievement' } });
    }
  }, [achievementVibes, router]);

  const handleOpenAuthorStories = useCallback((story) => {
    if (story.vibes && story.vibes.length > 0) {
      setActiveStoryGroup({
        stories: story.vibes,
        title: story.author?.name || 'Campus Moment',
      });
    } else {
      router.push('/vibes');
    }
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Campus Moments
          </Text>
          <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
        </View>
        <Pressable
          onPress={() => router.push('/vibes')}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            View All
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Add Vibe Action Bubble */}
        <AnimatedPressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenCreate?.();
          }}
          style={styles.bubbleContainer}
          accessibilityRole="button"
          accessibilityLabel="Post Vibe"
        >
          <View style={[styles.addOuterRing, { borderColor: colors.outlineVariant }]}>
            <View style={[styles.addInnerBox, { backgroundColor: colors.surfaceContainerHighest }]}>
              <MaterialIcons name="add" size={28} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.bubbleLabel, { color: colors.onSurface, fontFamily: 'DMSans-Bold' }]}>
            {isAuthenticated ? 'Post Vibe' : 'Share'}
          </Text>
          <Text style={[styles.bubbleSublabel, { color: colors.onSurfaceVariant }]}>
            New Moment
          </Text>
        </AnimatedPressable>

        {/* 2. Official School Stories Bubble */}
        <StoryBubble
          title="Official"
          subtitle={officialVibes.length > 0 ? `${officialVibes.length} live` : 'Notices'}
          icon="school"
          ringColor="#2563EB" // Vibrant Royal Blue
          isSpecial={true}
          badgeIcon="verified"
          imageUri={officialVibes[0]?.images?.[0]?.url}
          onPress={handleOpenOfficialStories}
        />

        {/* 3. Achievements Stories Bubble */}
        <StoryBubble
          title="Achievements"
          subtitle={achievementVibes.length > 0 ? `${achievementVibes.length} wins` : 'Spotlight'}
          icon="emoji-events"
          ringColor="#F59E0B" // Gold / Amber
          isSpecial={true}
          badgeIcon="star"
          imageUri={achievementVibes[0]?.images?.[0]?.url}
          onPress={handleOpenAchievementStories}
        />

        {/* 4. Loading Skeleton or Real Author Story Rings */}
        {isLoading && authorStories.length === 0 ? (
          [1, 2, 3].map((key) => (
            <View key={key} style={styles.bubbleContainer}>
              <SkeletonLoader width={64} height={64} borderRadius={32} />
              <SkeletonLoader width={48} height={10} borderRadius={5} style={{ marginTop: 6 }} />
            </View>
          ))
        ) : (
          authorStories.map((story, idx) => {
            const authorName = story.author?.name ? story.author.name.split(' ')[0] : 'Campus';
            const role = story.author?.role === 'teacher' ? 'Faculty' : (story.author?.currentClass || 'Student');

            return (
              <StoryBubble
                key={story.author?._id || `story-${idx}`}
                title={authorName}
                subtitle={role}
                imageUri={story.latestImage}
                ringColor={story.author?.role === 'teacher' ? '#8B5CF6' : colors.primary}
                isSpecial={false}
                badgeIcon={story.author?.role === 'teacher' ? 'school' : undefined}
                onPress={() => handleOpenAuthorStories(story)}
              />
            );
          })
        )}
      </ScrollView>

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
    marginBottom: 20,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    letterSpacing: -0.2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  scrollContent: {
    paddingHorizontal: 2,
    gap: 14,
    paddingVertical: 2,
  },
  bubbleContainer: {
    alignItems: 'center',
    width: 68,
  },
  ringOuter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ringInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  iconWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleLabel: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  bubbleSublabel: {
    fontSize: 10,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
    marginTop: 1,
    width: '100%',
  },
  addOuterRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addInnerBox: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(VibeStoriesTray);
