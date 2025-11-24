import { View, Text, FlatList, Pressable, Alert, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import Header from "../components/Header";
import NewsFormModal from "../components/NewsFormModal";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";
import { useToast } from "../components/ToastProvider";
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_EXPIRY } from "../utils/cache";

// Global cache for news to persist across component re-mounts
let globalNews = [];
let globalNewsLoading = true;
let globalNewsError = null;
let newsFetched = false;

export default function NewsScreen() {
  const navigation = useNavigation();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const [news, setNews] = useState(globalNews);
  const [loading, setLoading] = useState(globalNewsLoading);
  const [error, setError] = useState(globalNewsError);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = await AsyncStorage.getItem('@auth_token');
    const storedUser = await AsyncStorage.getItem('@auth_user');
    setIsAuthenticated(!!token);

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        const isAdminRole = !!(parsedUser && (parsedUser.role === 'admin' || parsedUser.role === 'super admin'));
        setIsAdmin(isAdminRole);
      } catch (e) {
        console.warn('Failed to parse stored user', e);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, []);

  const fetchFreshNews = useCallback(async () => {
    try {
      console.log('[NEWS] Fetching fresh news from API...');
      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.news.list));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[NEWS] API response:', result);

      if (result.success && result.news) {
        console.log(`[NEWS] Received ${result.news.length} news items from API`);

        // Validate the data structure
        if (!Array.isArray(result.news)) {
          throw new Error('Invalid news data structure from API');
        }

        globalNews = result.news;
        setNews(globalNews);
        // Cache the fresh data
        await setCachedData(CACHE_KEYS.NEWS, result.news);
        setLoading(false);
        globalNewsLoading = false;
        newsFetched = true;
        console.log('[NEWS] Fresh news cached successfully');
      } else {
        console.warn('[NEWS] API response missing success flag or news data');
        globalNews = [];
        setNews([]);
        setLoading(false);
        globalNewsLoading = false;
        newsFetched = true;
      }
    } catch (err) {
      console.error('[NEWS] Failed to fetch fresh news:', err.message);
      // Set error even if we have cached data, so user knows fresh fetch failed
      setError(err.message);
      globalNewsError = err.message;
      // Don't set loading to false if we have cached data
      if (!globalNews.length) {
        setLoading(false);
        globalNewsLoading = false;
        newsFetched = true;
      }
    }
  }, []);

  useEffect(() => {
    if (newsFetched) {
      // If already fetched, use cached data
      setNews(globalNews);
      setLoading(globalNewsLoading);
      setError(globalNewsError);
      checkAuth();
      return;
    }

    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get cached data first
        const cachedNews = await getCachedData(CACHE_KEYS.NEWS, CACHE_EXPIRY.NEWS);
        if (cachedNews) {
          globalNews = cachedNews;
          setNews(globalNews);
          setLoading(false);
          globalNewsLoading = false;
          newsFetched = true;
          // Fetch fresh data in background
          fetchFreshNews();
          checkAuth();
          return;
        }

        // No cache, fetch from API
        await fetchFreshNews();
        checkAuth();
      } catch (err) {
        console.warn('Failed to fetch news:', err.message);
        setError(err.message);
        globalNewsError = err.message;
        globalNews = [];
        setNews([]);
        setLoading(false);
        globalNewsLoading = false;
        newsFetched = true;
        checkAuth();
      }
    };

    fetchNews();
  }, [checkAuth, fetchFreshNews]);

  // Background fetch on focus
  useFocusEffect(
    useCallback(() => {
      // If we already have data, fetch fresh data in background silently
      if (newsFetched || globalNews.length > 0) {
        fetchFreshNews();
      }
    }, [fetchFreshNews])
  );

  if (loading && news.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Latest News" />
        <Text style={styles.empty}>Loading news...</Text>
      </View>
    );
  }

  if (error && news.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Latest News" />
        <Text style={styles.empty}>Error loading news: {error}</Text>
      </View>
    );
  }

  const handleNewsCreated = (newNews) => {
    if (editingNews) {
      // Update existing news
      globalNews = globalNews.map(item => item._id === newNews._id ? { ...newNews, updatedAt: new Date().toISOString() } : item);
      setNews(globalNews);
      setEditingNews(null);
    } else {
      // Add new news
      globalNews = [{ ...newNews, createdAt: new Date().toISOString() }, ...globalNews];
      setNews(globalNews);
    }
  };

  const handleDeleteNews = async (newsId, newsTitle) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        showToast('Please login to delete news');
        return;
      }

      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.news.delete(newsId)), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete news');
      }

      const result = await response.json();
      if (result.success) {
        globalNews = globalNews.filter(item => item._id !== newsId);
        setNews(globalNews);
        showToast(`News "${newsTitle}" deleted successfully`);
      } else {
        throw new Error(result.message || 'Failed to delete news');
      }
    } catch (error) {
      console.error('Delete news error:', error);
      showToast(error.message || 'Failed to delete news');
    }
  };

  const handleEditNews = (newsItem) => {
    setEditingNews(newsItem);
    setIsModalVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[NEWS] Refreshing news from API...');
      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.news.list));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.news) {
        globalNews = result.news;
        setNews(globalNews);
        await setCachedData(CACHE_KEYS.NEWS, result.news);
        console.log('[NEWS] Refreshed successfully');
      }
    } catch (err) {
      console.error('[NEWS] Refresh failed:', err.message);
      showToast('Failed to refresh news');
    } finally {
      setRefreshing(false);
    }
  };

  // Memoize renderItem to prevent recreating function on every render
  const renderNewsItem = useCallback(({ item }) => (
    <View style={styles.cardMinimal}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 8 }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.textSecondary, lineHeight: 20, marginBottom: 12 }} numberOfLines={3}>
            {item.description}
          </Text>

          {/* Metadata row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 13, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>
              {new Date(item.creationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
            {item.privateNews && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="lock" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 13, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>Private</Text>
              </View>
            )}
          </View>

          {item.url && (
            <Pressable onPress={() => {
              console.log('Open URL:', item.url);
              showToast('Link: ' + item.url);
            }} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: "DMSans-SemiBold", color: colors.primary }}>🔗 View Link</Text>
            </Pressable>
          )}
        </View>

        {isAdmin && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
    </View>
  ), [styles.cardMinimal, colors, isAdmin, showToast, handleEditNews, handleDeleteNews]);

  return (
    <View style={styles.container}>
      <Header title="Latest News" subtitle="Stay updated with announcements" />

      <FlatList
        data={news}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No news available right now</Text>
        }
        renderItem={renderNewsItem}
        contentContainerStyle={styles.contentPaddingBottom}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      {/* FAB for Add News */}
      {isAuthenticated && (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          style={({ pressed }) => ([
            styles.fab,
            { opacity: pressed ? 0.9 : 1 }
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
        onSuccess={handleNewsCreated}
        editItem={editingNews}
      />
    </View>
  );
}
