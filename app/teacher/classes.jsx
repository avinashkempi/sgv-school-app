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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function TeacherClassesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { action } = params;
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
        <View style={styles.container}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                contentContainerStyle={{ paddingBottom: 100, minHeight: "100%" }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <Header title="My Classes" subtitle="Manage your assigned classes" />

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ gap: 24 }}>
                            <View>
                                <Text style={styles.sectionTitle}>
                                    My Classes
                                </Text>
                                {classes.length === 0 ? (
                                    <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                        <MaterialIcons name="class" size={48} color={colors.textSecondary} />
                                        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontFamily: "DMSans-Medium" }}>
                                            No classes assigned to you yet.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        {classes.map((cls) => (
                                            <Pressable
                                                key={cls._id}
                                                onPress={() => {
                                                    if (action === 'attendance') {
                                                        router.push({
                                                            pathname: "/teacher/class/attendance",
                                                            params: { classId: cls._id }
                                                        });
                                                    } else {
                                                        router.push(`/teacher/class/${cls._id}`);
                                                    }
                                                }}
                                                style={({ pressed }) => [
                                                    styles.cardMinimal,
                                                    {
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        padding: 20,
                                                        opacity: pressed ? 0.9 : 1,
                                                    }
                                                ]}
                                            >
                                                <View>
                                                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                                        {cls.name} {cls.section ? `- ${cls.section}` : ""}
                                                    </Text>
                                                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, fontFamily: "DMSans-Regular" }}>
                                                        {cls.academicYear?.name} • {cls.branch}
                                                    </Text>
                                                    <View style={{
                                                        backgroundColor: colors.primary + "15",
                                                        alignSelf: "flex-start",
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 4,
                                                        borderRadius: 8,
                                                        marginTop: 10
                                                    }}>
                                                        <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "DMSans-Bold" }}>CLASS TEACHER</Text>
                                                    </View>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
