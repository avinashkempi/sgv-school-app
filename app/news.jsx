import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import Header from "./_utils/Header";
import NewsFormModal from "./_utils/NewsFormModal";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiConfig from "./config/apiConfig";
import { useToast } from "./_utils/ToastProvider";
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_EXPIRY } from "./utils/cache";

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

  useEffect(() => {
    const checkAuth = async () => {
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
    };

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

    const fetchFreshNews = async () => {
      try {
        const response = await fetch(apiConfig.url(apiConfig.endpoints.news.list));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.news) {
          globalNews = result.news;
          setNews(globalNews);
          // Cache the fresh data
          await setCachedData(CACHE_KEYS.NEWS, result.news);
          setLoading(false);
          globalNewsLoading = false;
          newsFetched = true;
        } else {
          globalNews = [];
          setNews([]);
          setLoading(false);
          globalNewsLoading = false;
          newsFetched = true;
        }
      } catch (err) {
        console.warn('Failed to fetch fresh news:', err.message);
        // Don't override existing cached data if fetch fails
        if (!globalNews.length) {
          setError(err.message);
          globalNewsError = err.message;
        }
      }
    };

    fetchNews();
  }, []); // Empty dependency array to fetch only once per session

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Latest News" />
        <Text style={styles.empty}>Loading news...</Text>
      </View>
    );
  }

  if (error) {
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

      const response = await fetch(apiConfig.url(apiConfig.endpoints.news.delete(newsId)), {
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

  return (
    <View style={styles.container}>
      <Header title="Latest News" />

      {isAuthenticated && (
        <Pressable
          style={[styles.button, { marginHorizontal: 16, marginBottom: 16, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-end', flexDirection: 'row' }]}
          onPress={() => setIsModalVisible(true)}
        >
          <MaterialIcons name="add" size={16} color={colors.white} />
          <Text style={[styles.buttonText, { marginLeft: 4, fontSize: 14 }]}>Add News</Text>
        </Pressable>
      )}

      <FlatList
        data={news}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <Text style={styles.empty}>No news available right now</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, styles.cardCompact]}>
            <View style={styles.headerRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{new Date(item.creationDate).toLocaleDateString()}</Text>
              </View>
              <MaterialCommunityIcons
                name="calendar-text"
                size={20}
                color={colors.primary}
                style={styles.smallLeftMargin}
              />
              {isAdmin && (
                <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
                  <Pressable
                    onPress={() => handleEditNews(item)}
                    style={{ padding: 4, marginRight: 8 }}
                  >
                    <MaterialIcons name="edit" size={20} color={colors.primary} />
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
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="delete" size={20} color={colors.error || '#ff4444'} />
                  </Pressable>
                </View>
              )}
            </View>
            <Text style={styles.newsText}>{item.title}</Text>
            <Text style={styles.newsDescription}>{item.description}</Text>
            {item.url && (
              <Pressable onPress={() => {
                // Handle URL opening - could use Linking.openURL in a real app
                console.log('Open URL:', item.url);
                showToast('Link: ' + item.url);
              }}>
                <Text style={[styles.newsFile, { color: colors.primary, textDecorationLine: 'underline' }]}>Link</Text>
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
              {item.privateNews && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="lock" size={14} color={colors.textSecondary} />
                  <Text style={[styles.privateNews, { fontSize: 12, marginLeft: 4 }]}>Private</Text>
                </View>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.contentPaddingBottom}
      />

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
