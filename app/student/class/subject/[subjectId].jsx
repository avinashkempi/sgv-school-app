import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../../../../utils/storage";
import { useTheme } from "../../../../theme";
import apiConfig from "../../../../config/apiConfig";
import apiFetch from "../../../../utils/apiFetch";
import { useToast } from "../../../../components/ToastProvider";
import Header from "../../../../components/Header";
import { formatDate } from "../../../../utils/date";

import { getCachedData, setCachedData } from "../../../../utils/cache";
import { useNetworkStatus } from "../../../../components/NetworkStatusProvider";

export default function StudentSubjectDetailScreen() {
    const { id, subjectId } = useLocalSearchParams(); // classId and subjectId
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();
    const { isConnected } = useNetworkStatus();

    const [subjectName, setSubjectName] = useState("");
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const cacheKeyContent = `@subject_content_${subjectId}`;
        try {
            const token = await storage.getItem("@auth_token");

            // 1. Try cache
            const cachedContent = await getCachedData(cacheKeyContent);
            if (cachedContent) {
                setContent(cachedContent);
                setLoading(false);

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
                                    <View
                                        key={item._id}
                                        style={{
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
                                        }}
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

                                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>
                                                By: {item.author?.name || "Teacher"}
                                            </Text>
                                            <View style={{ backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                                <Text style={{ fontSize: 10, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase" }}>
                                                    {item.type}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
