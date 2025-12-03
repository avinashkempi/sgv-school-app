import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    TextInput,
    Modal,
    Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdminExamScheduleScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const queryClient = useQueryClient();
    const [selectedClassId, setSelectedClassId] = useState(null);

    // Edit Date State
    const [editingExam, setEditingExam] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [newDate, setNewDate] = useState(new Date());
    const [newRoom, setNewRoom] = useState("");

    // Fetch Classes
    const { data: classesData, isLoading: classesLoading } = useApiQuery(
        ['adminClassesInit'],
        `${apiConfig.baseUrl}/classes/admin/init`
    );
    const classes = classesData?.classes || [];

    // Set initial selected class
    useEffect(() => {
        if (classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0]._id);
        }
    }, [classes, selectedClassId]);

    // Fetch Exams for Selected Class
    const { data: exams = [], isLoading: examsLoading } = useApiQuery(
        ['adminExamSchedule', selectedClassId],
        `${apiConfig.baseUrl}/exams/schedule/class/${selectedClassId}`,
        { enabled: !!selectedClassId }
    );

    const loading = classesLoading || (!!selectedClassId && examsLoading);

    // Update Exam Mutation
    const updateExamMutation = useApiMutation({
        mutationFn: (data) => createApiMutationFn(`${apiConfig.baseUrl}/exams/${data.id}`, 'PUT')(data.body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminExamSchedule', selectedClassId] });
            showToast("Exam date updated", "success");
            setEditingExam(null);
        },
        onError: (error) => showToast(error.message || "Failed to update date", "error")
    });

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setNewDate(selectedDate);
        }
    };

    const saveNewDate = () => {
        if (!editingExam) return;

        updateExamMutation.mutate({
            id: editingExam._id,
            body: {
                date: newDate,
                room: newRoom
            }
        });
    };

    const [showInitModal, setShowInitModal] = useState(false);
    const [initType, setInitType] = useState("FA1");
    const [initTotalMarks, setInitTotalMarks] = useState("100");
    const [initDate, setInitDate] = useState(new Date());
    const [initDuration, setInitDuration] = useState("90");
    const [initInstructions, setInitInstructions] = useState("");
    const [showInitDatePicker, setShowInitDatePicker] = useState(false);

    const initMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/exams/school-wide/init`, 'POST'),
        onSuccess: (data) => {
            showToast(`${data.message}. Created: ${data.created}, Skipped: ${data.skipped}`, "success");
            setShowInitModal(false);
            queryClient.invalidateQueries({ queryKey: ['adminExamSchedule'] });
        },
        onError: (error) => showToast(error.message || "Failed to initialize exams", "error")
    });

    const handleInitDateChange = (event, selectedDate) => {
        setShowInitDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setInitDate(selectedDate);
        }
    };

    const handleInitialize = () => {
        if (!initTotalMarks || isNaN(initTotalMarks) || parseFloat(initTotalMarks) <= 0) {
            showToast("Please enter valid total marks", "error");
            return;
        }

        initMutation.mutate({
            type: initType,
            totalMarks: parseFloat(initTotalMarks),
            date: initDate.toISOString(),
            instructions: initInstructions,
            duration: initDuration ? parseInt(initDuration) : null
        });
    };

    if (loading && classes.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="Exam Schedules" subtitle="Manage Dates" showBack />

                <Pressable
                    onPress={() => setShowInitModal(true)}
                    style={{
                        backgroundColor: colors.primary,
                        padding: 12,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 16,
                        gap: 8
                    }}
                >
                    <MaterialIcons name="playlist-add-check" size={24} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>
                        Initialize School Exams
                    </Text>
                </Pressable>
            </View>

            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Select Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {classes.map(cls => (
                            <Pressable
                                key={cls._id}
                                onPress={() => setSelectedClassId(cls._id)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    backgroundColor: selectedClassId === cls._id ? colors.primary : colors.cardBackground,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: selectedClassId === cls._id ? colors.primary : colors.textSecondary + "20"
                                }}
                            >
                                <Text style={{ color: selectedClassId === cls._id ? "#fff" : colors.textPrimary }}>
                                    {cls.name} {cls.section}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : exams.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                        <MaterialIcons name="event-busy" size={48} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No exams found for this class</Text>
                    </View>
                ) : (
                    exams.map((exam) => (
                        <View
                            key={exam._id}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    {exam.subject?.name}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                    {exam.name} • {exam.type}
                                </Text>
                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                                    <MaterialIcons name="calendar-today" size={14} color={colors.primary} />
                                    <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>
                                        {new Date(exam.date).toLocaleDateString()}
                                    </Text>
                                </View>
                                {exam.room && (
                                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                                        <MaterialIcons name="meeting-room" size={14} color={colors.textSecondary} />
                                        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans-Medium" }}>
                                            {exam.room}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Pressable
                                onPress={() => {
                                    setEditingExam(exam);
                                    setNewDate(new Date(exam.date));
                                    setNewRoom(exam.room || "");
                                    setShowDatePicker(true);
                                }}
                                style={{
                                    padding: 8,
                                    backgroundColor: colors.primary + "15",
                                    borderRadius: 8
                                }}
                            >
                                <MaterialIcons name="edit" size={20} color={colors.primary} />
                            </Pressable>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Date Picker Modal */}
            {editingExam && (
                <Modal
                    transparent={true}
                    visible={!!editingExam}
                    animationType="fade"
                    onRequestClose={() => setEditingExam(null)}
                >
                    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
                        <View style={{ backgroundColor: colors.cardBackground, width: "85%", borderRadius: 16, padding: 20 }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>
                                Reschedule Exam
                            </Text>
                            <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>
                                {editingExam.subject?.name} - {editingExam.name}
                            </Text>

                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 14 }}>Date</Text>
                                <View style={{ alignItems: "center" }}>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={newDate}
                                            mode="date"
                                            display="default"
                                            onChange={handleDateChange}
                                            minimumDate={new Date()}
                                        />
                                    )}
                                    {Platform.OS === 'android' && (
                                        <Pressable
                                            onPress={() => setShowDatePicker(true)}
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                padding: 12,
                                                borderWidth: 1,
                                                borderColor: colors.textSecondary + "40",
                                                borderRadius: 8,
                                                width: "100%",
                                                justifyContent: "center"
                                            }}
                                        >
                                            <MaterialIcons name="calendar-today" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                            <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                                                {newDate.toLocaleDateString()}
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>

                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 14 }}>Room Number</Text>
                                <TextInput
                                    value={newRoom}
                                    onChangeText={setNewRoom}
                                    placeholder="e.g. Room 101"
                                    placeholderTextColor={colors.textSecondary + "80"}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.textSecondary + "40",
                                        borderRadius: 8,
                                        padding: 12,
                                        color: colors.textPrimary,
                                        fontSize: 16,
                                        fontFamily: "DMSans-Medium"
                                    }}
                                />
                            </View>

                            <View style={{ flexDirection: "row", gap: 12 }}>
                                <Pressable
                                    onPress={() => setEditingExam(null)}
                                    style={{ flex: 1, padding: 12, alignItems: "center", borderRadius: 10, backgroundColor: colors.background }}
                                >
                                    <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Bold" }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={saveNewDate}
                                    disabled={updateExamMutation.isPending}
                                    style={{ flex: 1, padding: 12, alignItems: "center", borderRadius: 10, backgroundColor: colors.primary }}
                                >
                                    {updateExamMutation.isPending ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={{ color: "#fff", fontFamily: "DMSans-Bold" }}>Save</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* School-wide Initialization Modal */}
            <Modal
                transparent={true}
                visible={showInitModal}
                animationType="slide"
                onRequestClose={() => setShowInitModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    Initialize School Exams
                                </Text>
                                <Pressable onPress={() => setShowInitModal(false)}>
                                    <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20, fontFamily: "DMSans-Regular" }}>
                                This will create the selected exam type for ALL classes and ALL subjects where it doesn&apos;t exist yet.
                            </Text>

                            {/* Exam Type Selection */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Exam Type *
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        {['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'].map(type => (
                                            <Pressable
                                                key={type}
                                                onPress={() => setInitType(type)}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 10,
                                                    backgroundColor: initType === type ? colors.primary : colors.cardBackground,
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: initType === type ? colors.primary : colors.textSecondary + "20"
                                                }}
                                            >
                                                <Text style={{ color: initType === type ? "#fff" : colors.textPrimary, fontFamily: "DMSans-Medium" }}>
                                                    {type}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Total Marks */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Total Marks *
                                </Text>
                                <TextInput
                                    value={initTotalMarks}
                                    onChangeText={setInitTotalMarks}
                                    keyboardType="numeric"
                                    placeholder="100"
                                    placeholderTextColor={colors.textSecondary + "80"}
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
                                />
                            </View>

                            {/* Date */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Exam Date
                                </Text>
                                <Pressable
                                    onPress={() => setShowInitDatePicker(true)}
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
                                        {initDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </Text>
                                    <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
                                </Pressable>
                                {showInitDatePicker && (
                                    <DateTimePicker
                                        value={initDate}
                                        mode="date"
                                        display="default"
                                        onChange={handleInitDateChange}
                                    />
                                )}
                            </View>

                            {/* Duration */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Duration (minutes)
                                </Text>
                                <TextInput
                                    value={initDuration}
                                    onChangeText={setInitDuration}
                                    keyboardType="numeric"
                                    placeholder="90"
                                    placeholderTextColor={colors.textSecondary + "80"}
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
                                />
                            </View>

                            {/* Instructions */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 14, fontFamily: "DMSans-Medium", color: colors.textSecondary, marginBottom: 8 }}>
                                    Instructions (Optional)
                                </Text>
                                <TextInput
                                    value={initInstructions}
                                    onChangeText={setInitInstructions}
                                    multiline
                                    numberOfLines={3}
                                    placeholder="Enter instructions..."
                                    placeholderTextColor={colors.textSecondary + "80"}
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
                                />
                            </View>

                            {/* Submit Button */}
                            <Pressable
                                onPress={handleInitialize}
                                disabled={initMutation.isPending}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.primary,
                                    borderRadius: 12,
                                    padding: 16,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    opacity: pressed || initMutation.isPending ? 0.7 : 1
                                })}
                            >
                                {initMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="playlist-add-check" size={24} color="#fff" />
                                        <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                            Initialize for All Classes
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
