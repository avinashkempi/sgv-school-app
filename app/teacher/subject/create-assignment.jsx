import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import apiFetch from "../../../utils/apiFetch";
import { useToast } from "../../../components/ToastProvider";
import Header from "../../../components/Header";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function CreateAssignmentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const { subjectId, classId } = params;

    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) {
            showToast("Title is required", "error");
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await apiFetch(`${apiConfig.baseUrl}/assignments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    classId,
                    subjectId,
                    dueDate: dueDate.toISOString()
                })
            });

            if (response.ok) {
                showToast("Assignment created successfully", "success");
                router.back();
            } else {
                const error = await response.json();
                showToast(error.message || "Failed to create assignment", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error creating assignment", "error");
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Create Assignment"
                        subtitle="New task for students"
                        showBack
                    />

                    {/* Title */}
                    <View style={{ marginTop: 24 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Assignment Title *
                        </Text>
                        <TextInput
                            placeholder="e.g., Chapter 5 Exercises"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.cardBackground,
                                padding: 14,
                                borderRadius: 12,
                                color: colors.textPrimary,
                                fontSize: 16,
                                fontFamily: "DMSans-Regular",
                                borderWidth: 1,
                                borderColor: colors.textSecondary + "20"
                            }}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Due Date */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Due Date
                        </Text>
                        <Pressable
                            onPress={() => setShowDatePicker(true)}
                            style={{
                                backgroundColor: colors.cardBackground,
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.textSecondary + "20",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}
                        >
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Regular", color: colors.textPrimary }}>
                                {dueDate.toLocaleDateString('en-GB', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </Text>
                            <MaterialIcons name="event" size={20} color={colors.textSecondary} />
                        </Pressable>

                        {showDatePicker && (
                            <DateTimePicker
                                value={dueDate}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>

                    {/* Description */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Description / Instructions
                        </Text>
                        <TextInput
                            placeholder="Enter detailed instructions..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                            style={{
                                backgroundColor: colors.cardBackground,
                                padding: 14,
                                borderRadius: 12,
                                color: colors.textPrimary,
                                fontSize: 16,
                                fontFamily: "DMSans-Regular",
                                borderWidth: 1,
                                borderColor: colors.textSecondary + "20",
                                minHeight: 150
                            }}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Create Button */}
                    <Pressable
                        onPress={handleCreate}
                        disabled={loading}
                        style={({ pressed }) => ({
                            backgroundColor: colors.primary,
                            borderRadius: 12,
                            padding: 16,
                            marginTop: 32,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            opacity: pressed || loading ? 0.7 : 1,
                            elevation: 3
                        })}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="add-task" size={24} color="#fff" />
                                <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    Publish Assignment
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}
