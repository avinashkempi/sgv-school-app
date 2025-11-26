import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../../../theme";
import apiConfig from "../../../../config/apiConfig";
import apiFetch from "../../../../utils/apiFetch";
import { useToast } from "../../../../components/ToastProvider";
import Header from "../../../../components/Header";
import { formatDate } from "../../../../utils/date";
import { getCachedData, setCachedData } from "../../../../utils/cache";
import { useNetworkStatus } from "../../../../components/NetworkStatusProvider";
import PostContentModal from "../../../../components/PostContentModal";

export default function SubjectDetailScreen() {
    const { id, subjectId } = useLocalSearchParams(); // classId and subjectId
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const { isConnected } = useNetworkStatus();

    const [subjectName, setSubjectName] = useState("");
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const cacheKeyContent = `@subject_content_${subjectId}`;
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const storedUser = await AsyncStorage.getItem("@auth_user");
            if (storedUser) setUser(JSON.parse(storedUser));

            // 1. Try cache
            const cachedContent = await getCachedData(cacheKeyContent);
            if (cachedContent) {
                setContent(cachedContent);
                setLoading(false);
                console.log(`[SUBJECT] Loaded content for ${subjectId} from cache`);
            }

            // 2. Fetch API
            const fetchFromApi = async () => {
                // Fetch Subject Details (to get name)
                const subjectsRes = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/subjects`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedContent
                });

                if (subjectsRes.ok) {
                    const subjects = await subjectsRes.json();
                    const currentSubject = subjects.find(s => s._id === subjectId);
                    if (currentSubject) setSubjectName(currentSubject.name);
                }

                // Fetch Content for this subject
                const contentRes = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/subjects/${subjectId}/content`, {
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedContent
                });

                if (contentRes.ok) {
                    const contentData = await contentRes.json();
                    setContent(contentData);
                    setCachedData(cacheKeyContent, contentData);
                    console.log(`[SUBJECT] Refreshed content for ${subjectId} from API`);
                } else {
                    if (!cachedContent) showToast("Failed to load content", "error");
                }
            };

            if (isConnected) {
                await fetchFromApi();
            } else if (!cachedContent) {
                showToast("No internet connection", "error");
            }

        } catch (error) {
            console.error(error);
            if (!content.length) showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadData();
        } finally {
            setRefreshing(false);
        }
    };

    const handlePostContent = async (data) => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // Add subjectId to the data
            const payload = { ...data, subject: subjectId };

            const response = await apiFetch(`${apiConfig.baseUrl}/classes/${id}/content`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showToast("Content posted successfully", "success");
                setShowPostModal(false);
                onRefresh();
            } else {
                const errorData = await response.json();
                showToast(errorData.msg || "Failed to post content", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error posting content", "error");
        }
    };

    const getContentTypeColor = (type) => {
        switch (type) {
            case "homework": return colors.error;
            case "news": return colors.primary;
            default: return colors.secondary;
        }
    };

    const getContentTypeIcon = (type) => {
        switch (type) {
            case "homework": return "assignment";
            case "news": return "campaign";
            default: return "note";
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header title={subjectName || "Subject Details"} subtitle="Class Content" showBack />

                    {/* Quick Actions */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                        <Pressable
                            onPress={() => router.push({
                                pathname: "/teacher/subject/create-exam",
                                params: { subjectId, classId: id }
                            })}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: colors.primary,
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                opacity: pressed ? 0.9 : 1,
                                elevation: 3
                            })}
                        >
                            <MaterialIcons name="add-circle" size={20} color="#fff" />
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                New Exam
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => router.push({
                                pathname: "/teacher/subject/create-assignment",
                                params: { subjectId, classId: id }
                            })}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: "#FF9800",
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                opacity: pressed ? 0.9 : 1,
                                elevation: 3
                            })}
                        >
                            <MaterialIcons name="add-task" size={20} color="#fff" />
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                New Assignment
                            </Text>
                        </Pressable>
                    </View>

                    {loading ? (
                        <View style={{ marginTop: 100, alignItems: "center" }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ marginTop: 24 }}>
                            {content.length === 0 ? (
                                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                    <MaterialIcons name="article" size={48} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                        No content posted yet.
                                    </Text>
                                </View>
                            ) : (
                                content.map((item) => (
                                    <Pressable
                                        key={item._id}
                                        onPress={() => {
                                            if (item.type === 'assignment') {
                                                router.push({
                                                    pathname: "/teacher/assignment/submissions",
                                                    params: { assignmentId: item._id, title: item.title }
                                                });
                                            }
                                        }}
                                        style={({ pressed }) => ({
                                            backgroundColor: colors.cardBackground,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 12,
                                            borderLeftWidth: 4,
                                            borderLeftColor: getContentTypeColor(item.type),
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 4,
                                            elevation: 1,
                                            opacity: pressed ? 0.9 : 1
                                        })}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                <View style={{ backgroundColor: getContentTypeColor(item.type) + "20", padding: 6, borderRadius: 8 }}>
                                                    <MaterialIcons name={getContentTypeIcon(item.type)} size={20} color={getContentTypeColor(item.type)} />
                                                </View>
                                                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
                                                    {item.title}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                {formatDate(item.createdAt)}
                                            </Text>
                                        </View>

                                        <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
                                            {item.description}
                                        </Text>

                                        {item.type === 'assignment' && (
                                            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                <MaterialIcons name="event" size={14} color={colors.error} />
                                                <Text style={{ fontSize: 12, color: colors.error, fontFamily: "DMSans-Medium" }}>
                                                    Due: {new Date(item.dueDate).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>
                                                By: {item.author?.name || item.teacher?.name || "Teacher"}
                                            </Text>
                                            <View style={{ backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                                <Text style={{ fontSize: 10, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase" }}>
                                                    {item.type}
                                                </Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* FAB to Post Content */}
            <Pressable
                onPress={() => setShowPostModal(true)}
                style={({ pressed }) => ({
                    position: "absolute",
                    bottom: 90,
                    right: 24,
                    backgroundColor: colors.primary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 4,
                    zIndex: 9999,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    opacity: pressed ? 0.9 : 1,
                })}
            >
                <MaterialIcons name="add" size={28} color="#fff" />
            </Pressable>

            <PostContentModal
                visible={showPostModal}
                onClose={() => setShowPostModal(false)}
                onSubmit={handlePostContent}
            />
        </View>
    );
}
