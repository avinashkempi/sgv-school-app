import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    RefreshControl,
    ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import PostContentModal from "../../../../components/PostContentModal";
import apiConfig from "../../../../config/apiConfig";
import { useToast } from "../../../../components/ToastProvider";
import AppHeader from "../../../../components/Header";
import { formatDate } from "../../../../utils/date";

export default function SubjectDetailScreen() {
    const { id, subjectId } = useLocalSearchParams(); // classId and subjectId
    const router = useRouter();
    const queryClient = useQueryClient();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const [refreshing, setRefreshing] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const storedUser = await AsyncStorage.getItem("@auth_user");
            if (storedUser) setUser(JSON.parse(storedUser));
        } catch (error) {
            console.error("Failed to load user:", error);
        }
    };

    // Fetch Subject Details
    const { data: subjects } = useApiQuery(
        ['classSubjects', id],
        `${apiConfig.baseUrl}/classes/${id}/subjects`,
        { enabled: !!id }
    );

    const currentSubject = subjects?.find(s => s._id === subjectId);
    const subjectName = currentSubject?.name || "";
    const subjectTeachers = currentSubject?.teachers || [];

    // Fetch Content
    const { data: contentData, isLoading: loading, refetch } = useApiQuery(
        ['subjectContent', subjectId],
        `${apiConfig.baseUrl}/classes/${id}/subjects/${subjectId}/content`,
        { enabled: !!subjectId && !!id }
    );
    const content = contentData || [];

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const postContentMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/classes/${id}/content`, 'POST'),
        onSuccess: () => {
            showToast("Content posted successfully", "success");
            setShowPostModal(false);
            queryClient.invalidateQueries({ queryKey: ['subjectContent', subjectId] });
        },
        onError: (error) => showToast(error.message || "Failed to post content", "error")
    });

    const handlePostContent = (data) => {
        // Add subjectId to the data
        const payload = { ...data, subject: subjectId };
        postContentMutation.mutate(payload);
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
                    <AppHeader
                        title={subjectName || "Subject Details"}
                        subtitle={subjectTeachers.length > 0 ? `Teachers: ${subjectTeachers.map(t => t.name).join(", ")}` : "Class Content"}
                        showBack
                    />

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
                            <MaterialIcons name="assignment" size={20} color="#fff" />
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                Manage Exams
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => router.push({
                                pathname: "/teacher/subject/performance",
                                params: { subjectId }
                            })}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: colors.success,
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
                            <MaterialIcons name="leaderboard" size={20} color="#fff" />
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                Performance
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
                                                By: {item.author?.name || item.teacher?.name || "Teacher"}
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

            {/* FAB to Post Content */}
            <Pressable
                onPress={() => setShowPostModal(true)}
                style={({ pressed }) => ({
                    position: "absolute",
                    bottom: 110,
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
