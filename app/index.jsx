import { MaterialIcons } from "@expo/vector-icons";
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import useFade from "../hooks/useFade";
import { useTheme } from "../theme";
import useSchoolInfo from "../hooks/useSchoolInfo";
import Header from "../components/Header";
import Card from "../components/Card";
import SchoolPhotoCarousel from "../components/SchoolPhotoCarousel";
import { useToast } from "../components/ToastProvider";
import { useNetworkStatus } from "../components/NetworkStatusProvider";
import SegmentedControl from "../components/SegmentedControl";
import PostFeed from "../components/PostFeed";
import CreatePostModal from "../components/CreatePostModal";
import apiConfig from "../config/apiConfig";
import { useApiQuery } from "../hooks/useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useLabel } from '../context/LabelsContext';
import { useQueryClient } from '@tanstack/react-query';

import AdminDashboard from "../components/dashboard/AdminDashboard";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";

const POST_TABS = [
  { key: 'general', label: 'General' },
  { key: 'achievement', label: 'Achievements' },
];

export default function HomeScreen() {
  // eslint-disable-next-line no-unused-vars
  const router = useRouter();
  const fadeStyle = useFade();
  const { styles: themeStyles, colors } = useTheme();
  const { schoolInfo: SCHOOL, refresh } = useSchoolInfo();
  const [refreshing, setRefreshing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const { showToast } = useToast();
  // eslint-disable-next-line no-unused-vars
  const { isConnected } = useNetworkStatus();
  const { updateUser, isAuthenticated } = useAuth();
  const { t } = useLabel();
  const queryClient = useQueryClient();

  // Post state
  const [activeTab, setActiveTab] = useState('general');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const { data: userData, isError, error, refetch: refetchUser } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      ...CACHE_TIERS.STABLE,
      enabled: isAuthenticated,
      retry: false,
      select: (data) => data.user,
    }
  );

  const isAdmin = userData?.role === 'admin' || userData?.role === 'super admin';

  // Guard: skip redundant updateUser calls to avoid full-tree context re-renders
  const lastUserIdRef = useRef(null);
  useEffect(() => {
    if (userData && userData._id !== lastUserIdRef.current) {
      lastUserIdRef.current = userData._id;
      updateUser(userData);
    }
  }, [userData, updateUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refresh(true),
        refetchUser(),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ]);
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Suppress error
    } finally {
      setRefreshing(false);
    }
  };

  // Auth errors (401) are handled globally by queryClient.QueryCache.onError
  // No need for duplicate handling here — it caused double-logout race conditions

  const handleEditPost = useCallback((post) => {
    setEditingPost(post);
    setShowCreatePost(true);
  }, []);

  const handleCloseCreatePost = useCallback(() => {
    setShowCreatePost(false);
    setEditingPost(null);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[themeStyles.contentPaddingBottom, { paddingHorizontal: 16, paddingTop: 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Large M3 Header */}
        <Header
          title={SCHOOL.name}
          subtitle={userData?.name ? `Welcome, ${userData.name.split(' ')[0]}` : "Welcome"}
          variant="welcome"
        />

        {/* School Photo Carousel - Keep as is, looks good */}
        <SchoolPhotoCarousel photos={SCHOOL.photoUrl || SCHOOL.photoUrls} />

        {/* Role Based Dashboard */}
        <View style={{ marginBottom: 16 }}>
          {userData?.role === 'admin' || userData?.role === 'super admin' ? (
            <AdminDashboard />
          ) : userData?.role === 'teacher' ? (
            <TeacherDashboard />
          ) : userData?.role === 'student' ? (
            <StudentDashboard />
          ) : null}
        </View>

        {/* ═══════════ Vibes Community Banner ═══════════ */}
        <Pressable
          onPress={() => router.push('/vibes')}
          style={({ pressed }) => [
            localStyles.vibesBanner,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
              opacity: pressed ? 0.9 : 1,
            }
          ]}
        >
          <View style={[localStyles.vibesIconCircle, { backgroundColor: '#FFF3E0' }]}>
            <MaterialIcons name="auto-awesome" size={24} color="#FF9800" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[themeStyles.titleMedium, { color: colors.onSurface, marginBottom: 0 }]}>
                Vibes
              </Text>
              <View style={localStyles.newBadge}>
                <Text style={localStyles.newBadgeText}>NEW</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, fontFamily: 'DMSans-Regular', marginTop: 2 }}>
              Explore photos, achievements & campus moments
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
        </Pressable>

        {/* ═══════════ Posts Section ═══════════ */}
        <View style={localStyles.postsSection}>
          {/* Section Header */}
          <View style={localStyles.postsSectionHeader}>
            <View style={localStyles.postsSectionTitleRow}>
              <View style={[localStyles.sectionIcon, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="dynamic-feed" size={22} color={colors.onPrimaryContainer} />
              </View>
              <Text style={[themeStyles.titleLarge, { marginBottom: 0 }]}>Updates</Text>
            </View>
          </View>

          {/* Segmented Control — General / Achievements */}
          <SegmentedControl
            tabs={POST_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            style={{ marginBottom: 8 }}
          />

          {/* Post Feed — switches based on active tab */}
          <PostFeed
            category={activeTab}
            onEditPost={handleEditPost}
          />
        </View>

        {/* About Us Section */}
        <Animated.View style={fadeStyle}>
          <Card variant="filled">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primaryContainer,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name="apartment" size={24} color={colors.onPrimaryContainer} />
              </View>
              <Text style={[themeStyles.titleLarge, { marginBottom: 0 }]}>
                {t('home.aboutUs')}
              </Text>
            </View>
            <Text style={[themeStyles.bodyLarge, { marginBottom: 0 }]}>{SCHOOL.about}</Text>
          </Card>
        </Animated.View>

        {/* Branches Section */}
        <Animated.View style={fadeStyle}>
          <Card variant="filled">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.secondaryContainer,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name="school" size={24} color={colors.onSecondaryContainer} />
              </View>
              <Text style={[themeStyles.titleLarge, { marginBottom: 0 }]}>
                {t('home.branches')}
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.secondary,
                  marginTop: 8,
                  marginRight: 10
                }} />
                <Text style={[themeStyles.bodyLarge, { flex: 1, marginBottom: 0 }]}>
                  <Text style={themeStyles.titleMedium}>{t('home.branchMangasuli')}</Text>
                  {"\n"}{t('home.branchMangasuliDesc')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.secondary,
                  marginTop: 8,
                  marginRight: 10
                }} />
                <Text style={[themeStyles.bodyLarge, { flex: 1, marginBottom: 0 }]}>
                  <Text style={themeStyles.titleMedium}>{t('home.branchUgarKhurd')}</Text>
                  {"\n"}{t('home.branchUgarKhurdDesc')}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Mission Section */}
        <Animated.View style={fadeStyle}>
          <Card variant="filled">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.tertiaryContainer,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name="flag" size={24} color={colors.onTertiaryContainer} />
              </View>
              <Text style={[themeStyles.titleLarge, { marginBottom: 0 }]}>
                {t('home.ourMission')}
              </Text>
            </View>
            <Text style={[themeStyles.bodyLarge, { marginBottom: 0 }]}>{SCHOOL.mission}</Text>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button — Admin Only */}
      {isAdmin && (
        <Pressable
          onPress={() => { setEditingPost(null); setShowCreatePost(true); }}
          style={({ pressed }) => [
            localStyles.fab,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            }
          ]}
        >
          <MaterialIcons name="add" size={28} color={colors.onPrimary} />
        </Pressable>
      )}

      {/* Create / Edit Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={handleCloseCreatePost}
        editPost={editingPost}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  vibesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  vibesIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  postsSection: {
    marginBottom: 24,
  },
  postsSectionHeader: {
    marginBottom: 12,
  },
  postsSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
