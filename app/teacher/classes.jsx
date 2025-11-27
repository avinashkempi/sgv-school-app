import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function TeacherClassesScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const storedUser = await AsyncStorage.getItem("@auth_user");

            if (!storedUser) {
                router.replace("/login");
                return;
            }

            let parsedUser;
            try {
                parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse stored user:", e);
                await AsyncStorage.removeItem("@auth_user");
                router.replace("/login");
                return;
            }

            const response = await apiFetch(`${apiConfig.baseUrl}/classes/my-classes`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const myClasses = await response.json();
                console.log("[TEACHER_CLASSES] Loaded classes:", myClasses.length);
                setClasses(myClasses);
            } else {
                showToast("Failed to load classes", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100, minHeight: "100%" }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header title="My Classes" subtitle="Manage your assigned classes" />

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ marginTop: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                                    My Classes
                                </Text>
                            </View>
                            {classes.length === 0 ? (
                                <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                    <MaterialIcons name="class" size={48} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                        No classes assigned to you yet.
                                    </Text>
                                </View>
                            ) : (
                                classes.map((cls) => (
                                    <Pressable
                                        key={cls._id}
                                        onPress={() => router.push(`/teacher/class/${cls._id}`)}
                                        style={({ pressed }) => ({
                                            backgroundColor: colors.cardBackground,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 12,
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            opacity: pressed ? 0.9 : 1,
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 4,
                                            elevation: 1,
                                        })}
                                    >
                                        <View>
                                            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                                                {cls.name} {cls.section ? `- ${cls.section}` : ""}
                                            </Text>
                                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                                                {cls.academicYear?.name} • {cls.branch}
                                            </Text>
                                            <View style={{ backgroundColor: colors.primary + "15", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 8 }}>
                                                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>CLASS TEACHER</Text>
                                            </View>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                    </Pressable>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
