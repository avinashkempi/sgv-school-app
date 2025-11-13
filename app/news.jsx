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

export default function NewsScreen() {
  const navigation = useNavigation();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(apiConfig.url(apiConfig.endpoints.news.list));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.news) {
          setNews(result.news);
        } else {
          setNews([]);
        }
      } catch (err) {
        console.warn('Failed to fetch news:', err.message);
        setError(err.message);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
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
      setNews((prevNews) =>
        prevNews.map(item => item._id === newNews._id ? { ...newNews, updatedAt: new Date().toISOString() } : item)
      );
      setEditingNews(null);
    } else {
      // Add new news
      setNews((prevNews) => [{ ...newNews, createdAt: new Date().toISOString() }, ...prevNews]);
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
        setNews((prevNews) => prevNews.filter(item => item._id !== newsId));
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
