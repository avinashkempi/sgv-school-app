import { View, Text, FlatList, Pressable, Alert, RefreshControl, Linking } from "react-native";
import { useNavigation, } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import Header from "../components/Header";
import NewsFormModal from "../components/NewsFormModal";
import { useState, useCallback } from "react";

import apiConfig from "../config/apiConfig";

import { useToast } from "../components/ToastProvider";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "../utils/date";

export default function NewsScreen() {
  const _navigation = useNavigation();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch News
  const { data: newsData, refetch } = useApiQuery(
    ['news'],
    apiConfig.url(apiConfig.endpoints.news.list)
  );
  const DUMMY_NEWS = [
    {
      _id: 'n1',
      title: 'School Annual Sports Day',
      description: 'We are excited to announce that the Annual Sports Day will be held on December 20th. All students are requested to register for events by this Friday.',
      creationDate: new Date().toISOString(),
      isPrivate: false
    },
    {
      _id: 'n2',
      title: 'Science Fair Winners',
      description: 'Congratulations to the winners of the Inter-School Science Fair! Our students secured the 1st place in Robotics.',
      creationDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      isPrivate: false
    },
    {
      _id: 'n3',
      title: 'Holiday Announcement',
      description: 'The school will remain closed on Monday, December 25th, for Christmas. We wish everyone a Merry Christmas!',
      creationDate: new Date(Date.now() - 86400000 * 7).toISOString(),
      isPrivate: false
    }
  ];

  const news = (newsData?.news && newsData.news.length > 0) ? newsData.news : DUMMY_NEWS;

  // Check Auth & Admin
  const { data: userData } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    { select: (data) => data.user }
  );
  const isAdmin = userData?.role === 'admin' || userData?.role === 'super admin';

  // Mutations
  const createNewsMutation = useApiMutation({
    mutationFn: createApiMutationFn(apiConfig.url(apiConfig.endpoints.news.create), 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      showToast('News created successfully');
      setIsModalVisible(false);
    },
    onError: (error) => showToast(error.message || 'Failed to create news')
  });

  const updateNewsMutation = useApiMutation({
    mutationFn: (data) => createApiMutationFn(apiConfig.url(apiConfig.endpoints.news.update(data._id)), 'PUT')(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      showToast('News updated successfully');
      setIsModalVisible(false);
      setEditingNews(null);
    },
    onError: (error) => showToast(error.message || 'Failed to update news')
  });

  const deleteNewsMutation = useApiMutation({
    mutationFn: (id) => createApiMutationFn(apiConfig.url(apiConfig.endpoints.news.delete(id)), 'DELETE')(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      showToast('News deleted successfully');
    },
    onError: (error) => showToast(error.message || 'Failed to delete news')
  });

  // Memoize renderItem BEFORE early returns to maintain hooks order
  const renderNewsItem = useCallback(({ item }) => (
    <View style={styles.cardMinimal}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          {item.url ? (
            <Pressable onPress={() => Linking.openURL(item.url)}>
              <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.primary, marginBottom: 8, textDecorationLine: 'underline' }} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 8 }} numberOfLines={2}>
              {item.title}
            </Text>
          )}
          <Text style={{ fontSize: 13, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>
            {formatDate(item.creationDate)}
          </Text>
        </View>
        {item.isPrivate && (
          <View style={{ backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
            <Text style={{ fontSize: 10, fontFamily: "DMSans-Bold", color: colors.textSecondary, textTransform: "uppercase" }}>
              Private
            </Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 15, fontFamily: "DMSans-Regular", color: colors.textSecondary, lineHeight: 22 }} numberOfLines={3}>
        {item.description}
      </Text>

      {item.url && (
        <Pressable onPress={() => {
          Linking.openURL(item.url).catch(err => {
            console.error("Failed to open URL:", err);
            showToast('Failed to open link');
          });
        }} style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 14, fontFamily: "DMSans-SemiBold", color: colors.primary }}>🔗 Open Link</Text>
        </Pressable>
      )}

      {isAdmin && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
          <Pressable
            onPress={() => handleEditNews(item)}
            style={({ pressed }) => ({
              padding: 8,
              backgroundColor: colors.background,
              borderRadius: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Delete News",
                `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => handleDeleteNews(item._id, item.title) },
                ]
              );
            }}
            style={({ pressed }) => ({
              padding: 8,
              backgroundColor: colors.error + '15',
              borderRadius: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="delete-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      )}
    </View>
  ), [styles.cardMinimal, colors, isAdmin, showToast]); // Removed handleEditNews, handleDeleteNews from deps

  // NO LOADING STATE - just show empty state if no data
  // Removed: if (loading && news.length === 0) return <LoadingView />;
  // Removed: if (error && news.length === 0) return <ErrorView />;

  const handleNewsSubmit = (newsData) => {
    if (newsData._id) {
      updateNewsMutation.mutate(newsData);
    } else {
      createNewsMutation.mutate(newsData);
    }
  };

  const handleDeleteNews = (newsId, _newsTitle) => {
    deleteNewsMutation.mutate(newsId);
  };

  const handleEditNews = (newsItem) => {
    setEditingNews(newsItem);
    setIsModalVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
        <Header title="Latest News" subtitle="Stay updated with announcements" />
      </View>

      <FlatList
        data={news}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
            <MaterialIcons name="article" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontFamily: "DMSans-Medium" }}>
              No news available right now
            </Text>
          </View>
        }
        renderItem={renderNewsItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      {/* FAB for Add News */}
      {isAdmin && (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          style={({ pressed }) => ([
            styles.fab,
            { opacity: pressed ? 0.9 : 1, bottom: 130 }
          ])}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
        </Pressable>
      )}

      <NewsFormModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setEditingNews(null);
        }}
        onSubmit={handleNewsSubmit}
        editItem={editingNews}
      />
    </View>
  );
}
