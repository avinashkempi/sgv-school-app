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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdminExamScheduleScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [exams, setExams] = useState([]);

    // Edit Date State
    const [editingExam, setEditingExam] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [newDate, setNewDate] = useState(new Date());
    const [newRoom, setNewRoom] = useState("");

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/admin/init`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setClasses(data.classes);
                if (data.classes.length > 0) {
                    loadExams(data.classes[0]._id);
                } else {
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const loadExams = async (classId) => {
        setSelectedClassId(classId);
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/exams/schedule/class/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setExams(data);
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading exams", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setNewDate(selectedDate);
        }
    };

    const saveNewDate = async () => {
        if (!editingExam) return;

        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/exams/${editingExam._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: newDate,
                    room: newRoom
                })
            });

            if (response.ok) {
                showToast("Exam date updated", "success");
                setEditingExam(null);
                loadExams(selectedClassId); // Refresh list
            } else {
                showToast("Failed to update date", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error updating exam", "error");
        }
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
            </View>

            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Select Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {classes.map(cls => (
                            <Pressable
                                key={cls._id}
                                onPress={() => loadExams(cls._id)}
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
                                    style={{ flex: 1, padding: 12, alignItems: "center", borderRadius: 10, backgroundColor: colors.primary }}
                                >
                                    <Text style={{ color: "#fff", fontFamily: "DMSans-Bold" }}>Save</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}
