import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    StyleSheet,
    Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";
import { formatDate } from "../../utils/date";
import { getCachedData, setCachedData } from "../../utils/cache";

export default function AcademicYearScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [form, setForm] = useState({
        name: "",
        startDate: "",
        endDate: "",
        isActive: false
    });

    useEffect(() => {
        loadUserRole();
        loadYears();
    }, []);

    const loadUserRole = async () => {
        try {
            const storedUser = await AsyncStorage.getItem("@auth_user");
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                console.log("Stored user data:", parsedUser);
                console.log("User role from AsyncStorage:", parsedUser.role);
                setUserRole(parsedUser.role);
            }

            // Fetch fresh user data from backend to sync with database
            const token = await AsyncStorage.getItem("@auth_token");
            if (token) {
                try {
                    const response = await apiFetch(`${apiConfig.baseUrl}/users/me`, {
                        method: "GET",
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.ok) {
                        const freshUserData = await response.json();
                        console.log("Fresh user data from backend:", freshUserData);
                        console.log("Fresh user role:", freshUserData.role);

                        // Update AsyncStorage with fresh data
                        await AsyncStorage.setItem("@auth_user", JSON.stringify(freshUserData));
                        setUserRole(freshUserData.role);
                    }
                } catch (error) {
                    console.error("Failed to fetch fresh user data:", error);
                    // Continue with cached data if fetch fails
                }
            }
        } catch (error) {
            console.error("Failed to load user role:", error);
        }
    };

    const loadYears = async () => {
        const cacheKey = "@admin_academic_years";
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // 1. Try cache
            const cachedData = await getCachedData(cacheKey);
            if (cachedData) {
                setYears(cachedData);
                setLoading(false);
                console.log("[ACADEMIC_YEAR] Loaded from cache");
            }

            // 2. Fetch API (Silent if cache exists)
            const fetchFromApi = async () => {
                const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                    silent: !!cachedData
                });

                if (response.ok) {
                    const data = await response.json();
                    setYears(data);
                    setCachedData(cacheKey, data);
                    console.log("[ACADEMIC_YEAR] Refreshed from API");
                } else {
                    if (!cachedData) showToast("Failed to load academic years", "error");
                }
            };

            await fetchFromApi();

        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreate = async () => {
        if (!form.name || !form.startDate || !form.endDate) {
            showToast("Please fill all fields", "error");
            return;
        }

        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (response.ok) {
                showToast("Academic Year created", "success");
                setShowModal(false);
                setForm({ name: "", startDate: "", endDate: "", isActive: false });
                loadYears();
            } else {
                const data = await response.json();
                showToast(data.msg || "Failed to create", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error creating academic year", "error");
        }
    };

    const handleUpgrade = async (id, name) => {
        Alert.alert(
            "Upgrade Academic Year",
            `Are you sure you want to set ${name} as the active academic year? This will deactivate the current one.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Upgrade",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("@auth_token");
                            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year/upgrade`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ id }),
                            });

                            console.log("Upgrade response status:", response.status);

                            if (response.ok) {
                                showToast("Academic Year Upgraded!", "success");
                                loadYears();
                            } else {
                                const errorData = await response.json();
                                console.log("Upgrade error:", errorData);
                                showToast(errorData.msg || `Failed to upgrade (Status: ${response.status})`, "error");
                            }
                        } catch (error) {
                            console.error("Upgrade error:", error);
                            showToast(error.message || "Error upgrading", "error");
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadYears();
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header title="Academic Years" subtitle="Manage school years" showBack />

                    <View style={{ marginTop: 16 }}>
                        {years.map((year) => (
                            <View
                                key={year._id}
                                style={{
                                    backgroundColor: colors.cardBackground,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 12,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderWidth: year.isActive ? 2 : 0,
                                    borderColor: colors.primary
                                }}
                            >
                                <View>
                                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                                        {year.name}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                                        {formatDate(year.startDate)} - {formatDate(year.endDate)}
                                    </Text>
                                    {year.isActive && (
                                        <View style={{ backgroundColor: colors.primary + "20", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 8 }}>
                                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>ACTIVE</Text>
                                        </View>
                                    )}
                                </View>

                                {!year.isActive && userRole === 'super admin' && (
                                    <Pressable
                                        onPress={() => handleUpgrade(year._id, year.name)}
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            borderWidth: 1,
                                            borderColor: colors.primary,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 8
                                        }}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: "600" }}>Set Active</Text>
                                    </Pressable>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <Pressable
                onPress={() => setShowModal(true)}
                style={{
                    position: "absolute",
                    bottom: 90,
                    right: 24,
                    backgroundColor: colors.primary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 6,
                }}
            >
                <MaterialIcons name="add" size={28} color="#fff" />
            </Pressable>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                            New Academic Year
                        </Text>

                        <TextInput
                            placeholder="Name (e.g. 2025-2026)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 12
                            }}
                            value={form.name}
                            onChangeText={(t) => setForm({ ...form, name: t })}
                        />

                        <TextInput
                            placeholder="Start Date (DD-MM-YYYY)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 12
                            }}
                            value={form.startDate}
                            onChangeText={(t) => setForm({ ...form, startDate: t })}
                        />

                        <TextInput
                            placeholder="End Date (DD-MM-YYYY)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 24
                            }}
                            value={form.endDate}
                            onChangeText={(t) => setForm({ ...form, endDate: t })}
                        />

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                            <Pressable onPress={() => setShowModal(false)} style={{ padding: 12 }}>
                                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCreate}
                                style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>Create</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
