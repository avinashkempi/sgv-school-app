import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import storage from "../../utils/storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function RaiseComplaintScreen() {
    const router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Academic");
    const [priority, setPriority] = useState("Medium");
    const [visibility, setVisibility] = useState("teacher"); // 'teacher', 'admin' (for students)
    const [userRole, setUserRole] = useState(null);


    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const userStr = await storage.getItem("@auth_user");
        if (userStr) {
            const user = JSON.parse(userStr);
            const role = user.role;
            setUserRole(role);
            if (role === 'teacher') {
                setCategory("Management");
                setVisibility("super_admin");
            }
        }
    };

    const raiseComplaintMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/complaints`, 'POST'),
        onSuccess: () => {
            showToast("Complaint raised successfully", "success");
            router.back();
            // Invalidate queries if needed, but we don't have easy access to queryClient here unless we import it
            // Assuming the list page will refetch on focus or we can rely on stale time
        },
        onError: (error) => showToast(error.message || "Failed to raise complaint", "error")
    });

    const handleSubmit = () => {
        if (!title.trim() || !description.trim()) {
            showToast("Please fill all fields", "error");
            return;
        }

        raiseComplaintMutation.mutate({
            title,
            description,
            category,
            priority,
            visibility
        });
    };

    const categories = userRole === 'teacher'
        ? ['Management', 'Facility', 'Other']
        : ['Academic', 'Facility', 'Transport', 'Discipline', 'Other'];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="Raise Complaint" showBack />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Visibility Selection (For Students) */}
                {userRole === 'student' && (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>To</Text>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <Pressable
                                onPress={() => setVisibility('teacher')}
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    backgroundColor: visibility === 'teacher' ? colors.primary + "15" : colors.cardBackground,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: visibility === 'teacher' ? colors.primary : "transparent",
                                    alignItems: "center"
                                }}
                            >
                                <MaterialIcons name="person" size={24} color={visibility === 'teacher' ? colors.primary : colors.textSecondary} />
                                <Text style={{
                                    marginTop: 8,
                                    fontFamily: "DMSans-Bold",
                                    color: visibility === 'teacher' ? colors.primary : colors.textSecondary
                                }}>Class Teacher</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => setVisibility('admin')}
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    backgroundColor: visibility === 'admin' ? colors.primary + "15" : colors.cardBackground,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: visibility === 'admin' ? colors.primary : "transparent",
                                    alignItems: "center"
                                }}
                            >
                                <MaterialIcons name="admin-panel-settings" size={24} color={visibility === 'admin' ? colors.primary : colors.textSecondary} />
                                <Text style={{
                                    marginTop: 8,
                                    fontFamily: "DMSans-Bold",
                                    color: visibility === 'admin' ? colors.primary : colors.textSecondary
                                }}>Headmaster</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* For Teachers (Read Only) */}
                {userRole === 'teacher' && (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>To</Text>
                        <View style={{
                            padding: 16,
                            backgroundColor: colors.cardBackground,
                            borderRadius: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12
                        }}>
                            <MaterialIcons name="business" size={24} color={colors.primary} />
                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>Management (Super Admin)</Text>
                        </View>
                    </View>
                )}

                {/* Category */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {categories.map(cat => (
                                <Pressable
                                    key={cat}
                                    onPress={() => setCategory(cat)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        backgroundColor: category === cat ? colors.primary : colors.cardBackground,
                                        borderRadius: 20
                                    }}
                                >
                                    <Text style={{
                                        color: category === cat ? "#fff" : colors.textPrimary,
                                        fontFamily: "DMSans-Medium"
                                    }}>{cat}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Title */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Subject</Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Brief subject of the complaint"
                        placeholderTextColor={colors.textSecondary}
                        style={{
                            backgroundColor: colors.cardBackground,
                            padding: 16,
                            borderRadius: 12,
                            color: colors.textPrimary,
                            fontFamily: "DMSans-Medium",
                            fontSize: 16
                        }}
                    />
                </View>

                {/* Description */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Description</Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Detailed description..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        style={{
                            backgroundColor: colors.cardBackground,
                            padding: 16,
                            borderRadius: 12,
                            color: colors.textPrimary,
                            fontFamily: "DMSans-Medium",
                            fontSize: 16,
                            minHeight: 120
                        }}
                    />
                </View>

                {/* Submit Button */}
                <Pressable
                    onPress={handleSubmit}
                    disabled={raiseComplaintMutation.isPending}
                    style={{
                        backgroundColor: colors.primary,
                        padding: 18,
                        borderRadius: 16,
                        alignItems: "center",
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                        opacity: raiseComplaintMutation.isPending ? 0.7 : 1
                    }}
                >
                    {raiseComplaintMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 18 }}>Submit Complaint</Text>
                    )}
                </Pressable>

            </ScrollView>
        </View>
    );
}
