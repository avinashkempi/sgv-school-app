import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    TextInput,
    Modal,
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";
import ModernTimePicker from "../../components/ModernTimePicker";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminTimetableScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [subjects, setSubjects] = useState([]);

    // Timetable State
    const [schedule, setSchedule] = useState({}); // { Monday: [periods], ... }
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [timetableLoading, setTimetableLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState(null); // null = new, obj = edit
    const [tempPeriod, setTempPeriod] = useState({
        periodNumber: "",
        startTime: new Date(),
        endTime: new Date(),
        subject: "",
        teacher: "",
        subject: "",
        teacher: ""
    });
    const [showTimePicker, setShowTimePicker] = useState({ show: false, mode: 'start' }); // mode: 'start' | 'end'

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            loadClassData(selectedClassId);
        }
    }, [selectedClassId]);

    const loadClasses = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/admin/init`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setClasses(data.classes);
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading classes", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadClassData = async (classId) => {
        setTimetableLoading(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // 1. Fetch Subjects & Teachers
            const detailsRes = await apiFetch(`${apiConfig.baseUrl}/classes/${classId}/full-details`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (detailsRes.ok) {
                const data = await detailsRes.json();
                setSubjects(data.subjects);
            }

            // 2. Fetch Existing Timetable
            const timetableRes = await apiFetch(`${apiConfig.baseUrl}/timetable/class/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (timetableRes.ok) {
                const timetableData = await timetableRes.json();
                // Convert array to object map
                const scheduleMap = {};
                DAYS.forEach(day => scheduleMap[day] = []);

                timetableData.schedule.forEach(daySchedule => {
                    scheduleMap[daySchedule.day] = daySchedule.periods.map(p => ({
                        ...p,
                        subject: p.subject?._id || p.subject, // Handle populated vs unpopulated
                        teacher: p.teacher?._id || p.teacher
                    }));
                });
                setSchedule(scheduleMap);
            } else {
                // Initialize empty schedule
                const emptySchedule = {};
                DAYS.forEach(day => emptySchedule[day] = []);
                setSchedule(emptySchedule);
            }

        } catch (error) {
            console.error(error);
            showToast("Error loading timetable", "error");
        } finally {
            setTimetableLoading(false);
        }
    };

    const handleSaveTimetable = async () => {
        if (!selectedClassId) return;

        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("@auth_token");

            // Convert schedule object back to array format
            const scheduleArray = Object.keys(schedule).map(day => ({
                day,
                periods: schedule[day]
            })).filter(day => day.periods.length > 0);

            const response = await apiFetch(`${apiConfig.baseUrl}/timetable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    classId: selectedClassId,
                    schedule: scheduleArray,
                    breaks: [] // Can add breaks later
                })
            });

            if (response.ok) {
                showToast("Timetable saved successfully", "success");
            } else {
                showToast("Failed to save timetable", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error saving timetable", "error");
        } finally {
            setSaving(false);
        }
    };

    const openPeriodModal = (period = null) => {
        if (period) {
            setEditingPeriod(period);
            // Parse times for picker
            // Assuming time format "HH:mm AM/PM" or similar, need to parse to Date object
            // For simplicity, let's just use current date with parsed time or default
            setTempPeriod({
                ...period,
                startTime: new Date(), // TODO: Parse actual time string
                endTime: new Date()
            });
        } else {
            setEditingPeriod(null);
            setTempPeriod({
                periodNumber: (schedule[selectedDay]?.length || 0) + 1,
                startTime: new Date(),
                endTime: new Date(),
                subject: "",
                teacher: "",
                subject: "",
                teacher: ""
            });
        }
        setModalVisible(true);
    };

    const savePeriod = () => {
        if (!tempPeriod.subject || !tempPeriod.teacher) {
            Alert.alert("Error", "Please select a subject and teacher");
            return;
        }

        const formatTime = (date) => {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const newPeriod = {
            periodNumber: Number(tempPeriod.periodNumber),
            subject: tempPeriod.subject,
            teacher: tempPeriod.teacher,
            startTime: formatTime(tempPeriod.startTime),
            endTime: formatTime(tempPeriod.endTime),
            startTime: formatTime(tempPeriod.startTime),
            endTime: formatTime(tempPeriod.endTime)
        };

        const updatedDaySchedule = [...(schedule[selectedDay] || [])];

        if (editingPeriod) {
            // Update existing
            const index = updatedDaySchedule.findIndex(p => p.periodNumber === editingPeriod.periodNumber); // Identify by period number? Or index?
            // Better to use index from map, but for now let's just push/replace
            // Actually, let's just replace based on periodNumber if unique, or just use array index if passed
            // Simplified: Remove old, add new, sort
            const filtered = updatedDaySchedule.filter(p => p !== editingPeriod);
            filtered.push(newPeriod);
            filtered.sort((a, b) => a.periodNumber - b.periodNumber);
            setSchedule({ ...schedule, [selectedDay]: filtered });
        } else {
            // Add new
            updatedDaySchedule.push(newPeriod);
            updatedDaySchedule.sort((a, b) => a.periodNumber - b.periodNumber);
            setSchedule({ ...schedule, [selectedDay]: updatedDaySchedule });
        }

        setModalVisible(false);
    };

    const deletePeriod = (period) => {
        const updatedDaySchedule = schedule[selectedDay].filter(p => p !== period);
        setSchedule({ ...schedule, [selectedDay]: updatedDaySchedule });
    };

    const onTimeConfirm = (selectedDate) => {
        const mode = showTimePicker.mode;

        if (selectedDate) {
            if (mode === 'start') {
                setTempPeriod({ ...tempPeriod, startTime: selectedDate });
            } else {
                setTempPeriod({ ...tempPeriod, endTime: selectedDate });
            }
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header title="Manage Timetable" subtitle="Set class schedules" showBack />

                    {/* Class Selector */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>
                            Select Class
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                {classes.map((cls) => (
                                    <Pressable
                                        key={cls._id}
                                        onPress={() => setSelectedClassId(cls._id)}
                                        style={{
                                            paddingHorizontal: 20,
                                            paddingVertical: 10,
                                            backgroundColor: selectedClassId === cls._id ? colors.primary : colors.cardBackground,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: selectedClassId === cls._id ? colors.primary : colors.textSecondary + "20"
                                        }}
                                    >
                                        <Text style={{
                                            color: selectedClassId === cls._id ? "#fff" : colors.textPrimary,
                                            fontFamily: selectedClassId === cls._id ? "DMSans-Bold" : "DMSans-Medium"
                                        }}>
                                            {cls.name} {cls.section}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {selectedClassId && (
                        <>
                            {/* Day Tabs */}
                            <View style={{ marginTop: 24 }}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        {DAYS.map((day) => (
                                            <Pressable
                                                key={day}
                                                onPress={() => setSelectedDay(day)}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 8,
                                                    backgroundColor: selectedDay === day ? colors.secondary : "transparent",
                                                    borderRadius: 12,
                                                }}
                                            >
                                                <Text style={{
                                                    color: selectedDay === day ? "#fff" : colors.textSecondary,
                                                    fontFamily: "DMSans-Bold"
                                                }}>
                                                    {day.slice(0, 3)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Schedule Editor */}
                            <View style={{ marginTop: 20 }}>
                                {timetableLoading ? (
                                    <ActivityIndicator size="large" color={colors.primary} />
                                ) : (
                                    <View>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                                {selectedDay}'s Schedule
                                            </Text>
                                            <Pressable
                                                onPress={() => openPeriodModal()}
                                                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                                            >
                                                <MaterialIcons name="add" size={20} color={colors.primary} />
                                                <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>Add Period</Text>
                                            </Pressable>
                                        </View>

                                        {(!schedule[selectedDay] || schedule[selectedDay].length === 0) ? (
                                            <View style={{ padding: 20, alignItems: "center", backgroundColor: colors.cardBackground, borderRadius: 12 }}>
                                                <Text style={{ color: colors.textSecondary }}>No periods added for this day</Text>
                                            </View>
                                        ) : (
                                            schedule[selectedDay].map((period, index) => {
                                                const subject = subjects.find(s => s._id === period.subject);
                                                const teacher = subject?.teachers?.find(t => t._id === period.teacher);

                                                return (
                                                    <View
                                                        key={index}
                                                        style={{
                                                            backgroundColor: colors.cardBackground,
                                                            padding: 16,
                                                            borderRadius: 12,
                                                            marginBottom: 12,
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            gap: 12
                                                        }}
                                                    >
                                                        <View style={{
                                                            width: 40, height: 40,
                                                            borderRadius: 20,
                                                            backgroundColor: colors.background,
                                                            alignItems: "center",
                                                            justifyContent: "center"
                                                        }}>
                                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{period.periodNumber}</Text>
                                                        </View>

                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 16 }}>
                                                                {subject?.name || "Unknown Subject"}
                                                            </Text>
                                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                                                {period.startTime} - {period.endTime} • {teacher?.name || "No Teacher"}
                                                            </Text>
                                                        </View>

                                                        <Pressable onPress={() => deletePeriod(period)}>
                                                            <MaterialIcons name="delete-outline" size={24} color={colors.error} />
                                                        </Pressable>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Save Button */}
                            <Pressable
                                onPress={handleSaveTimetable}
                                disabled={saving}
                                style={{
                                    backgroundColor: colors.primary,
                                    borderRadius: 12,
                                    padding: 16,
                                    marginTop: 32,
                                    alignItems: "center",
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>
                                        Save Timetable
                                    </Text>
                                )}
                            </Pressable>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Add/Edit Period Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                    onPress={() => setModalVisible(false)}
                >
                    <Pressable
                        style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {editingPeriod ? "Edit Period" : "Add Period"}
                            </Text>
                            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView>
                            {/* Period Number */}
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Period Number</Text>
                            <TextInput
                                value={String(tempPeriod.periodNumber)}
                                onChangeText={(t) => setTempPeriod({ ...tempPeriod, periodNumber: t })}
                                keyboardType="numeric"
                                style={{
                                    backgroundColor: colors.background,
                                    padding: 12,
                                    borderRadius: 10,
                                    color: colors.textPrimary,
                                    marginBottom: 16
                                }}
                            />

                            {/* Time */}
                            <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Start Time</Text>
                                    <Pressable
                                        onPress={() => setShowTimePicker({ show: true, mode: 'start' })}
                                        style={{ backgroundColor: colors.background, padding: 12, borderRadius: 10 }}
                                    >
                                        <Text style={{ color: colors.textPrimary }}>
                                            {tempPeriod.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </Pressable>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>End Time</Text>
                                    <Pressable
                                        onPress={() => setShowTimePicker({ show: true, mode: 'end' })}
                                        style={{ backgroundColor: colors.background, padding: 12, borderRadius: 10 }}
                                    >
                                        <Text style={{ color: colors.textPrimary }}>
                                            {tempPeriod.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* Subject */}
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Subject</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {subjects.map(sub => (
                                        <Pressable
                                            key={sub._id}
                                            onPress={() => setTempPeriod({ ...tempPeriod, subject: sub._id, teacher: "" })} // Reset teacher on subject change
                                            style={{
                                                paddingHorizontal: 16,
                                                paddingVertical: 8,
                                                backgroundColor: tempPeriod.subject === sub._id ? colors.primary : colors.background,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: tempPeriod.subject === sub._id ? colors.primary : colors.textSecondary + "20"
                                            }}
                                        >
                                            <Text style={{ color: tempPeriod.subject === sub._id ? "#fff" : colors.textPrimary }}>
                                                {sub.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* Teacher */}
                            {tempPeriod.subject && (
                                <>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Teacher</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: "row", gap: 8 }}>
                                            {subjects.find(s => s._id === tempPeriod.subject)?.teachers?.map(t => (
                                                <Pressable
                                                    key={t._id}
                                                    onPress={() => setTempPeriod({ ...tempPeriod, teacher: t._id })}
                                                    style={{
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 8,
                                                        backgroundColor: tempPeriod.teacher === t._id ? colors.secondary : colors.background,
                                                        borderRadius: 20,
                                                        borderWidth: 1,
                                                        borderColor: tempPeriod.teacher === t._id ? colors.secondary : colors.textSecondary + "20"
                                                    }}
                                                >
                                                    <Text style={{ color: tempPeriod.teacher === t._id ? "#fff" : colors.textPrimary }}>
                                                        {t.name}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </>
                            )}



                            <Pressable
                                onPress={savePeriod}
                                style={{
                                    backgroundColor: colors.primary,
                                    padding: 16,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    marginBottom: 20
                                }}
                            >
                                <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>
                                    {editingPeriod ? "Update Period" : "Add Period"}
                                </Text>
                            </Pressable>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <ModernTimePicker
                visible={showTimePicker.show}
                onClose={() => setShowTimePicker({ ...showTimePicker, show: false })}
                onConfirm={onTimeConfirm}
                value={showTimePicker.mode === 'start' ? tempPeriod.startTime : tempPeriod.endTime}
                title={showTimePicker.mode === 'start' ? "Select Start Time" : "Select End Time"}
            />
        </View>
    );
}
