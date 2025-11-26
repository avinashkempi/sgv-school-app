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

export default function CreateExamScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const { subjectId, classId } = params;

    const [loading, setLoading] = useState(false);
    const [examName, setExamName] = useState("");
    const [examType, setExamType] = useState("unit-test");
    const [totalMarks, setTotalMarks] = useState("");
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [instructions, setInstructions] = useState("");
    const [duration, setDuration] = useState("");

    const examTypes = [
        { value: 'unit-test', label: 'Unit Test' },
        { value: 'mid-term', label: 'Mid-Term Exam' },
        { value: 'final', label: 'Final Exam' },
        { value: 'practical', label: 'Practical Exam' },
        { value: 'assignment', label: 'Assignment' }
    ];

    const handleCreateExam = async () => {
        if (!examName.trim()) {
            showToast("Exam name is required", "error");
            return;
        }

        if (!totalMarks || isNaN(totalMarks) || parseFloat(totalMarks) <= 0) {
            showToast("Please enter valid total marks", "error");
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await apiFetch(`${apiConfig.baseUrl}/exams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: examName,
                    type: examType,
                    classId,
                    subjectId,
                    totalMarks: parseFloat(totalMarks),
                    date: date.toISOString(),
                    instructions,
                    duration: duration ? parseInt(duration) : null
                })
            });

            if (response.ok) {
                const exam = await response.json();
                showToast("Exam created successfully", "success");
                router.back();
                // Navigate to marks entry screen
                router.push({
                    pathname: "/teacher/exam/enter-marks",
                    params: { examId: exam._id }
                });
            } else {
                const error = await response.json();
                showToast(error.message || "Failed to create exam", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error creating exam", "error");
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Create Exam"
                        subtitle="Set up a new exam for your students"
                        showBack
                    />

                    {/* Exam Name */}
                    <View style={{ marginTop: 24 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Exam Name *
                        </Text>
                        <TextInput
                            placeholder="e.g., Unit Test 1, Mid-Term Exam"
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
                            value={examName}
                            onChangeText={setExamName}
                        />
                    </View>

                    {/* Exam Type */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Exam Type *
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            {examTypes.map((type) => (
                                <Pressable
                                    key={type.value}
                                    onPress={() => setExamType(type.value)}
                                    style={({ pressed }) => ({
                                        backgroundColor: examType === type.value
                                            ? colors.primary
                                            : colors.cardBackground,
                                        borderWidth: 1,
                                        borderColor: examType === type.value
                                            ? colors.primary
                                            : colors.textSecondary + "30",
                                        borderRadius: 10,
                                        paddingVertical: 12,
                                        paddingHorizontal: 16,
                                        opacity: pressed ? 0.7 : 1
                                    })}
                                >
                                    <Text style={{
                                        fontSize: 14,
                                        fontFamily: "DMSans-SemiBold",
                                        color: examType === type.value ? "#fff" : colors.textPrimary
                                    }}>
                                        {type.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Total Marks */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Total Marks *
                        </Text>
                        <TextInput
                            placeholder="100"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
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
                            value={totalMarks}
                            onChangeText={setTotalMarks}
                        />
                    </View>

                    {/* Date */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Exam Date
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
                                {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                            <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
                        </Pressable>

                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                            />
                        )}
                    </View>

                    {/* Duration (Optional) */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Duration (minutes)
                        </Text>
                        <TextInput
                            placeholder="90"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
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
                            value={duration}
                            onChangeText={setDuration}
                        />
                    </View>

                    {/* Instructions (Optional) */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                            Instructions (Optional)
                        </Text>
                        <TextInput
                            placeholder="Enter exam instructions..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
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
                                minHeight: 100
                            }}
                            value={instructions}
                            onChangeText={setInstructions}
                        />
                    </View>

                    {/* Create Button */}
                    <Pressable
                        onPress={handleCreateExam}
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
                                <MaterialIcons name="add-circle" size={24} color="#fff" />
                                <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    Create Exam & Enter Marks
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}
