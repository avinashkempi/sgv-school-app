import React, { useState, } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    ActivityIndicator,
    Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import { useToast } from "../../../components/ToastProvider";
import { useApiMutation, createApiMutationFn, useApiQuery } from "../../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import AppHeader from "../../../components/Header";
import DateTimePicker from "@react-native-community/datetimepicker";

const EXAM_TYPES = [
    { type: 'FA1', label: 'Formative Assessment 1', color: '#4CAF50', icon: 'assignment' },
    { type: 'FA2', label: 'Formative Assessment 2', color: '#2196F3', icon: 'assignment' },
    { type: 'SA1', label: 'Summative Assessment 1', color: '#FF9800', icon: 'assessment' },
    { type: 'FA3', label: 'Formative Assessment 3', color: '#9C27B0', icon: 'assignment' },
    { type: 'FA4', label: 'Formative Assessment 4', color: '#E91E63', icon: 'assignment' },
    { type: 'SA2', label: 'Summative Assessment 2', color: '#F44336', icon: 'assessment' },
];

export default function InitializeExamScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { subjectId, classId } = params;

    const [showInitModal, setShowInitModal] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [totalMarks, setTotalMarks] = useState("");
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [instructions, setInstructions] = useState("");
    const [duration, setDuration] = useState("");

    const [showBulkInitModal, setShowBulkInitModal] = useState(false);

    // Fetch exam status
    const { data: examStatus, isLoading, refetch } = useApiQuery(
        ['examStatus', classId, subjectId],
        `${apiConfig.baseUrl}/exams/standardized?classId=${classId}&subjectId=${subjectId}`,
        { enabled: !!classId && !!subjectId }
    );

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const createExamMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/exams/standardized`, 'POST'),
        onSuccess: (exam) => {
            showToast(`${selectedType} initialized successfully`, "success");
            setShowInitModal(false);
            resetForm();
            refetch();
            queryClient.invalidateQueries({ queryKey: ['classExams', classId] });
            // Navigate to marks entry screen
            router.push({
                pathname: "/teacher/exam/enter-marks",
                params: { examId: exam._id }
            });
        },
        onError: (error) => showToast(error.message || "Failed to initialize exam", "error")
    });

    const bulkCreateMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/exams/standardized/bulk`, 'POST'),
        onSuccess: (results) => {
            const createdCount = results.filter(r => r.status === 'created').length;
            showToast(`Successfully initialized ${createdCount} exams`, "success");
            setShowBulkInitModal(false);
            resetForm();
            refetch();
            queryClient.invalidateQueries({ queryKey: ['classExams', classId] });
        },
        onError: (error) => showToast(error.message || "Failed to bulk initialize", "error")
    });

    const resetForm = () => {
        setSelectedType(null);
        setTotalMarks("");
        setDate(new Date());
        setInstructions("");
        setDuration("");
    };

    const handleInitializeExam = () => {
        if (!totalMarks || isNaN(totalMarks) || parseFloat(totalMarks) <= 0) {
            showToast("Please enter valid total marks", "error");
            return;
        }

        createExamMutation.mutate({
            type: selectedType,
            classId,
            subjectId,
            totalMarks: parseFloat(totalMarks),
            date: date.toISOString(),
            instructions,
            duration: duration ? parseInt(duration) : null
        });
    };

    const handleBulkInitialize = () => {
        if (!totalMarks || isNaN(totalMarks) || parseFloat(totalMarks) <= 0) {
            showToast("Please enter valid total marks", "error");
            return;
        }

        bulkCreateMutation.mutate({
            classId,
            subjectId,
            totalMarks: parseFloat(totalMarks),
            date: date.toISOString(),
            instructions,
            duration: duration ? parseInt(duration) : null
        });
    };

    const openInitModal = (type) => {
        setSelectedType(type);
        setShowInitModal(true);
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const getExamCardStatus = (type) => {
        const status = examStatus?.find(e => e.type === type);
        if (!status) return { initialized: false, marksEntered: false };
        return {
            initialized: status.exists,
            marksEntered: status.marksEntered,
            marksCount: status.marksCount || 0,
            exam: status.exam
        };
    };

    const handleExamCardPress = (type) => {
        const status = getExamCardStatus(type);
        if (status.initialized && status.exam) {
            // Navigate to marks entry
            router.push({
                pathname: "/teacher/exam/enter-marks",
                params: { examId: status.exam._id }
            });
        } else {
            // Open initialization modal
            openInitModal(type);
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
                        title="Manage Assessments"
                        subtitle="Initialize and manage the 6 fixed assessments"
                        showBack
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 }}>
                        <Text style={{
                            fontSize: 14,
                            color: colors.textSecondary,
                            fontFamily: "DMSans-Regular",
                            flex: 1
                        }}>
                            Tap on an assessment to initialize or enter marks
                        </Text>

                        <Pressable
                            onPress={() => {
                                resetForm();
                                setShowBulkInitModal(true);
                            }}
                            style={{
                                backgroundColor: colors.primary + '15',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.primary + '30'
                            }}
                        >
                            <Text style={{
                                fontSize: 13,
                                fontFamily: "DMSans-Medium",
                                color: colors.primary
                            }}>
                                Initialize All
                            </Text>
                        </Pressable>
                    </View>

                    {/* Exam Cards */}
                    <View style={{ gap: 12 }}>
                        {EXAM_TYPES.map((examType) => {
                            const status = getExamCardStatus(examType.type);
                            return (
                                <Pressable
                                    key={examType.type}
                                    onPress={() => handleExamCardPress(examType.type)}
                                    style={({ pressed }) => ({
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 16,
                                        padding: 18,
                                        borderWidth: 2,
                                        borderColor: status.initialized ? examType.color + '40' : colors.textSecondary + '20',
                                        opacity: pressed ? 0.7 : 1,
                                        elevation: status.initialized ? 3 : 1
                                    })}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                            <View style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 12,
                                                backgroundColor: examType.color + '20',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: 12
                                            }}>
                                                <MaterialIcons name={examType.icon} size={24} color={examType.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 18,
                                                    fontFamily: "DMSans-Bold",
                                                    color: colors.textPrimary
                                                }}>
                                                    {examType.type}
                                                </Text>
                                                <Text style={{
                                                    fontSize: 13,
                                                    color: colors.textSecondary,
                                                    fontFamily: "DMSans-Regular"
                                                }}>
                                                    {examType.label}
                                                </Text>
                                                {status.initialized && (
                                                    <Text style={{
                                                        fontSize: 12,
                                                        color: examType.color,
                                                        fontFamily: "DMSans-Medium",
                                                        marginTop: 4
                                                    }}>
                                                        {status.marksEntered
                                                            ? `✓ ${status.marksCount} marks entered`
                                                            : "Tap to enter marks"}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {status.initialized ? (
                                            <MaterialIcons
                                                name={status.marksEntered ? "check-circle" : "edit"}
                                                size={28}
                                                color={status.marksEntered ? colors.success : examType.color}
                                            />
                                        ) : (
                                            <MaterialIcons name="add-circle-outline" size={28} color={colors.textSecondary} />
                                        )}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Legend */}
                    <View style={{
                        backgroundColor: colors.cardBackground,
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 24
                    }}>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 12 }}>
                            Legend
                        </Text>
                        <View style={{ gap: 8 }}>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <MaterialIcons name="add-circle-outline" size={20} color={colors.textSecondary} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 8, fontFamily: "DMSans-Regular" }}>
                                    Not initialized - Tap to set up
                                </Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <MaterialIcons name="edit" size={20} color={colors.primary} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 8, fontFamily: "DMSans-Regular" }}>
                                    Initialized - Tap to enter marks
                                </Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 8, fontFamily: "DMSans-Regular" }}>
                                    Marks entered - Tap to edit
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Initialize Exam Modal */}
            <Modal
                visible={showInitModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowInitModal(false);
                    resetForm();
                }}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end'
                }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        maxHeight: '80%'
                    }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    Initialize {selectedType}
                                </Text>
                                <Pressable onPress={() => { setShowInitModal(false); resetForm(); }}>
                                    <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            {/* Total Marks */}
                            <View style={{ marginBottom: 16 }}>
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
                            <View style={{ marginBottom: 16 }}>
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

                            {/* Duration */}
                            <View style={{ marginBottom: 16 }}>
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

                            {/* Instructions */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Instructions (Optional)
                                </Text>
                                <TextInput
                                    placeholder="Enter exam instructions..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={3}
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
                                        minHeight: 80
                                    }}
                                    value={instructions}
                                    onChangeText={setInstructions}
                                />
                            </View>

                            {/* Initialize Button */}
                            <Pressable
                                onPress={handleInitializeExam}
                                disabled={createExamMutation.isPending}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.primary,
                                    borderRadius: 12,
                                    padding: 16,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    opacity: pressed || createExamMutation.isPending ? 0.7 : 1
                                })}
                            >
                                {createExamMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="check-circle" size={24} color="#fff" />
                                        <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                            Initialize & Enter Marks
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Bulk Initialize Modal */}
            <Modal
                visible={showBulkInitModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowBulkInitModal(false);
                    resetForm();
                }}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end'
                }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        maxHeight: '80%'
                    }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    Initialize All Exams
                                </Text>
                                <Pressable onPress={() => { setShowBulkInitModal(false); resetForm(); }}>
                                    <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20, fontFamily: "DMSans-Regular" }}>
                                This will create all 6 standardized exams (FA1-SA2) that don&apos;t exist yet. Existing exams will be skipped.
                            </Text>

                            {/* Total Marks */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Total Marks (Default) *
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
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Default Exam Date
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

                            {/* Duration */}
                            <View style={{ marginBottom: 16 }}>
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

                            {/* Instructions */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Instructions (Optional)
                                </Text>
                                <TextInput
                                    placeholder="Enter default instructions..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={3}
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
                                        minHeight: 80
                                    }}
                                    value={instructions}
                                    onChangeText={setInstructions}
                                />
                            </View>

                            {/* Initialize Button */}
                            <Pressable
                                onPress={handleBulkInitialize}
                                disabled={bulkCreateMutation.isPending}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.primary,
                                    borderRadius: 12,
                                    padding: 16,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    opacity: pressed || bulkCreateMutation.isPending ? 0.7 : 1
                                })}
                            >
                                {bulkCreateMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="playlist-add-check" size={24} color="#fff" />
                                        <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                            Initialize All Exams
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
