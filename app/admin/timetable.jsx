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

import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import SkeletonLoader from "../../components/SkeletonLoader";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import ModernTimePicker from "../../components/ModernTimePicker";
import { useToast } from "../../components/ToastProvider";
import apiConfig from "../../config/apiConfig";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminTimetableScreen() {
    const _router = useRouter();
    const { colors } = useTheme();
    const { showToast } = useToast();

    const queryClient = useQueryClient();
    const [selectedClassId, setSelectedClassId] = useState(null);

    // Filtered State for UI
    const [schedule, setSchedule] = useState({}); // { Monday: [periods], ... }
    const [selectedDay, setSelectedDay] = useState('Monday');

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState(null); // null = new, obj = edit
    const [tempPeriod, setTempPeriod] = useState({
        periodNumber: "",
        startTime: new Date(),
        endTime: new Date(),
        subject: "",
        teacher: ""
    });
    const [showTimePicker, setShowTimePicker] = useState({ show: false, mode: 'start' }); // mode: 'start' | 'end'
    const [cloneModalVisible, setCloneModalVisible] = useState(false);
    const [cloneTargetClasses, setCloneTargetClasses] = useState([]);
    const [cloneTargetDays, setCloneTargetDays] = useState([]);
    const [isCloning, setIsCloning] = useState(false);

    // --- Data Pre-loading ---
    const { data: initData, isLoading } = useApiQuery(
        ['adminClassesInit'],
        `${apiConfig.baseUrl}/classes/admin/init`,
        {
            staleTime: 5 * 60 * 1000, // 5 minutes stale time to prevent heavy overfetching
            cacheTime: Infinity, // Keep data in memory forever (throughout session)
            gcTime: Infinity, // For React Query v5+ support
        }
    );

    // Use stable references for data to avoid infinite loops in useEffect
    const classes = initData?.classes;
    const allSubjects = initData?.subjects;
    const allTimetables = initData?.timetables;

    // Select first class by default
    useEffect(() => {
        if (!selectedClassId && classes && classes.length > 0) {
            setSelectedClassId(classes[0]._id);
        }
    }, [classes, selectedClassId]);

    // --- Side Effects to Update UI from Local Data ---
    useEffect(() => {
        if (!selectedClassId) {
            setSchedule({});
            return;
        }

        // Initialize empty structure
        const scheduleMap = {};
        DAYS.forEach(day => scheduleMap[day] = []);

        if (allTimetables) {
            const classTimetable = allTimetables.find(t => t.class === selectedClassId);

            if (classTimetable && classTimetable.schedule) {
                classTimetable.schedule.forEach(daySchedule => {
                    scheduleMap[daySchedule.day] = daySchedule.periods.map(p => {
                        const subjectObj = allSubjects?.find(s => s._id === (p.subject._id || p.subject));
                        const teacherObj = subjectObj?.teachers?.find(t => t._id === (p.teacher._id || p.teacher));

                        return {
                            ...p,
                            subjectId: p.subject._id || p.subject,
                            teacherId: p.teacher._id || p.teacher,
                            subjectName: subjectObj?.name || 'Unknown',
                            teacherName: teacherObj?.name || 'No Teacher'
                        };
                    });
                });
            }
        }
        setSchedule(scheduleMap);
    }, [selectedClassId, allTimetables, allSubjects]);

    // Save Timetable Mutation
    const saveTimetableMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/timetable`, 'POST'),
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Timetable saved successfully", "success");
            // Invalidate to re-fetch if needed, or we could optimistically update 'allTimetables' in cache
            // For now, simpler to invalidate.
            queryClient.invalidateQueries({ queryKey: ['adminClassesInit'] });
        },
        onError: (_error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast("Failed to save timetable", "error");
        }
    });

    const handleSaveTimetable = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!selectedClassId) return;

        // Convert schedule object back to array format
        // We only need to send: day, periods: [{ periodNumber, startTime, endTime, subject, teacher }]
        const scheduleArray = Object.keys(schedule).map(day => ({
            day,
            periods: schedule[day].map(p => ({
                periodNumber: p.periodNumber,
                startTime: p.startTime,
                endTime: p.endTime,
                subject: p.subjectId,
                teacher: p.teacherId
            }))
        })).filter(day => day.periods.length > 0);

        saveTimetableMutation.mutate({
            classId: selectedClassId,
            schedule: scheduleArray,
            breaks: []
        });
    };

    const openPeriodModal = (period = null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (period) {
            setEditingPeriod(period);
            const _now = new Date(); // Helper to set time parts
            // We need to parse "10:00 AM" back to Date if we want the picker to show it correctly
            // For simplicity, let's just default to now, or implement a parser if strictly needed.
            // A simple parser for "HH:mm PM":
            const parseTime = (timeStr) => {
                const [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = time.split(':');
                if (hours === '12') hours = '00';
                if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
                const d = new Date();
                d.setHours(Number(hours), Number(minutes));
                return d;
            };

            setTempPeriod({
                periodNumber: period.periodNumber,
                startTime: parseTime(period.startTime),
                endTime: parseTime(period.endTime),
                subject: period.subjectId,
                teacher: period.teacherId
            });
        } else {
            setEditingPeriod(null);

            let defaultStartTime = new Date();
            defaultStartTime.setHours(8, 0, 0, 0); // 8:00 AM default

            const currentDayPeriods = schedule[selectedDay] || [];
            if (currentDayPeriods.length > 0) {
                const parseTime = (timeStr) => {
                    const [time, modifier] = timeStr.split(' ');
                    let [hours, minutes] = time.split(':');
                    if (hours === '12') hours = '00';
                    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
                    const d = new Date();
                    d.setHours(Number(hours), Number(minutes));
                    return d;
                };
                let maxDate = new Date(); maxDate.setHours(0, 0, 0, 0);
                for (let p of currentDayPeriods) {
                    let d = parseTime(p.endTime);
                    if (d > maxDate) maxDate = d;
                }
                if (maxDate.getHours() !== 0) defaultStartTime = maxDate;
            }

            let defaultEndTime = new Date(defaultStartTime);
            defaultEndTime.setMinutes(defaultEndTime.getMinutes() + 40);

            setTempPeriod({
                periodNumber: (schedule[selectedDay]?.length || 0) + 1,
                startTime: defaultStartTime,
                endTime: defaultEndTime,
                subject: "",
                teacher: ""
            });
        }
        setModalVisible(true);
    };

    const savePeriod = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!tempPeriod.subject || !tempPeriod.teacher) {
            Alert.alert("Error", "Please select a subject and teacher");
            return;
        }

        const formatTime = (date) => {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        };

        const subjectObj = (allSubjects || []).find(s => s._id === tempPeriod.subject);
        const teacherObj = subjectObj?.teachers?.find(t => t._id === tempPeriod.teacher);

        const newPeriod = {
            periodNumber: Number(tempPeriod.periodNumber),
            startTime: formatTime(tempPeriod.startTime),
            endTime: formatTime(tempPeriod.endTime),
            subjectId: tempPeriod.subject,
            teacherId: tempPeriod.teacher,
            subjectName: subjectObj?.name || 'Unknown',
            teacherName: teacherObj?.name || 'No Teacher'
        };

        const updatedDaySchedule = [...(schedule[selectedDay] || [])];

        if (editingPeriod) {
            const filtered = updatedDaySchedule.filter(p => p !== editingPeriod);
            filtered.push(newPeriod);
            filtered.sort((a, b) => a.periodNumber - b.periodNumber);
            setSchedule({ ...schedule, [selectedDay]: filtered });
        } else {
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
        if (selectedDate) {
            if (showTimePicker.mode === 'start') {
                const diff = tempPeriod.endTime.getTime() - tempPeriod.startTime.getTime();
                const newEndTime = new Date(selectedDate.getTime() + diff);
                setTempPeriod({ ...tempPeriod, startTime: selectedDate, endTime: newEndTime });
            } else {
                setTempPeriod({ ...tempPeriod, endTime: selectedDate });
            }
        }
    };

    const handleCloneTimings = async () => {
        if (cloneTargetClasses.length === 0 || cloneTargetDays.length === 0) {
            Alert.alert("Error", "Please select at least one class and one day.");
            return;
        }

        const sourcePeriods = schedule[selectedDay] || [];
        if (sourcePeriods.length === 0) return;

        setIsCloning(true);

        try {
            const updates = [];
            for (const targetClassId of cloneTargetClasses) {
                const classTimetable = allTimetables?.find(t => t.class === targetClassId);
                const classScheduleMap = {};
                DAYS.forEach(day => classScheduleMap[day] = []);

                if (classTimetable && classTimetable.schedule) {
                    classTimetable.schedule.forEach(daySchedule => {
                        classScheduleMap[daySchedule.day] = daySchedule.periods.map(p => ({
                            periodNumber: p.periodNumber,
                            startTime: p.startTime,
                            endTime: p.endTime,
                            subject: p.subject ? (p.subject._id || p.subject) : null,
                            teacher: p.teacher ? (p.teacher._id || p.teacher) : null
                        }));
                    });
                }

                for (const targetDay of cloneTargetDays) {
                    classScheduleMap[targetDay] = sourcePeriods.map(p => ({
                        periodNumber: p.periodNumber,
                        startTime: p.startTime,
                        endTime: p.endTime,
                        subject: null,
                        teacher: null
                    }));
                }

                const finalScheduleArray = Object.keys(classScheduleMap).map(day => ({
                    day,
                    periods: classScheduleMap[day]
                })).filter(day => day.periods.length > 0);

                const savePromise = createApiMutationFn(`${apiConfig.baseUrl}/timetable`, 'POST')({
                    classId: targetClassId,
                    schedule: finalScheduleArray,
                    breaks: classTimetable?.breaks || []
                });
                updates.push(savePromise);
            }

            await Promise.all(updates);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Timings cloned successfully", "success");
            setCloneModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['adminClassesInit'] });
        } catch (error) {
            console.error("Clone error:", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast("Failed to clone timings", "error");
        } finally {
            setIsCloning(false);
        }
    };

    // Filter subjects for the selected class
    const availableSubjects = (allSubjects || []).filter(s => {
        const subjectClassId = s.class?._id || s.class;
        return String(subjectClassId) === String(selectedClassId);
    });

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
                <View style={{ paddingTop: 24, paddingBottom: 16 }}>
                    <SkeletonLoader width={250} height={32} borderRadius={8} style={{ marginBottom: 8 }} />
                    <SkeletonLoader width={180} height={20} borderRadius={8} style={{ opacity: 0.6 }} />
                </View>
                <View style={{ marginBottom: 24 }}>
                    <SkeletonLoader width={100} height={20} borderRadius={8} style={{ marginBottom: 12 }} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <SkeletonLoader width={110} height={40} borderRadius={20} />
                        <SkeletonLoader width={110} height={40} borderRadius={20} />
                        <SkeletonLoader width={110} height={40} borderRadius={20} />
                    </View>
                </View>
                <View style={{ marginBottom: 24, flexDirection: 'row', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(i => <SkeletonLoader key={i} width={70} height={36} borderRadius={12} />)}
                </View>
                <SkeletonLoader width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
                <SkeletonLoader width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
                <SkeletonLoader width="100%" height={90} borderRadius={16} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ paddingTop: 24, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.background }}>
                <Header title="Manage Timetable" subtitle="Set class schedules" showBack />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Class Selector - Horizontal Scroll */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 16, marginBottom: 8, fontFamily: "DMSans-Medium" }}>
                        Select Class
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                        {(classes || []).map((cls) => (
                            <Pressable
                                key={cls._id}
                                onPress={() => setSelectedClassId(cls._id)}
                                style={{
                                    paddingHorizontal: 20,
                                    paddingVertical: 10,
                                    backgroundColor: selectedClassId === cls._id ? colors.primary : colors.cardBackground,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: selectedClassId === cls._id ? colors.primary : colors.textSecondary + "20",
                                    elevation: selectedClassId === cls._id ? 4 : 0
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
                    </ScrollView>
                </View>

                {selectedClassId ? (
                    <>
                        {/* Day Tabs */}
                        <View style={{ marginBottom: 24 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                                {DAYS.map((day) => (
                                    <Pressable
                                        key={day}
                                        onPress={() => setSelectedDay(day)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            backgroundColor: selectedDay === day ? colors.secondary : "transparent",
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selectedDay === day ? colors.secondary : "transparent"
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
                            </ScrollView>
                        </View>

                        {/* Schedule List */}
                        <View style={{ paddingHorizontal: 16 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    {selectedDay}&apos;s Schedule
                                </Text>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    <Pressable
                                        onPress={() => {
                                            setCloneTargetClasses([]);
                                            setCloneTargetDays([]);
                                            setCloneModalVisible(true);
                                        }}
                                        style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 8, backgroundColor: colors.secondary + "10", borderRadius: 8 }}
                                    >
                                        <MaterialIcons name="content-copy" size={20} color={colors.secondary} />
                                        <Text style={{ color: colors.secondary, fontFamily: "DMSans-Bold" }}>Clone</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => openPeriodModal()}
                                        style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 8, backgroundColor: colors.primary + "10", borderRadius: 8 }}
                                    >
                                        <MaterialIcons name="add" size={20} color={colors.primary} />
                                        <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>Add</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {(!schedule[selectedDay] || schedule[selectedDay].length === 0) ? (
                                <View style={{ padding: 40, alignItems: "center", backgroundColor: colors.cardBackground, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant }}>
                                    <MaterialIcons name="event-note" size={48} color={colors.textSecondary + "40"} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: "DMSans-Medium" }}>No periods scheduled</Text>
                                </View>
                            ) : (
                                schedule[selectedDay].map((period, index) => (
                                    <Pressable
                                        key={index}
                                        onPress={() => openPeriodModal(period)}
                                        style={({ pressed }) => ({
                                            backgroundColor: colors.cardBackground,
                                            padding: 16,
                                            borderRadius: 16,
                                            marginBottom: 12,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 16,
                                            elevation: 2,
                                            transform: [{ scale: pressed ? 0.98 : 1 }]
                                        })}
                                    >
                                        <View style={{
                                            width: 48, height: 48,
                                            borderRadius: 14,
                                            backgroundColor: colors.primary + "15",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}>
                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 18 }}>{period.periodNumber}</Text>
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 16, marginBottom: 4 }}>
                                                {period.subjectName}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <MaterialIcons name="schedule" size={12} color={colors.textSecondary} />
                                                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Medium" }}>
                                                    {period.startTime} - {period.endTime}
                                                </Text>
                                            </View>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                                {period.teacherName}
                                            </Text>
                                        </View>

                                        <Pressable onPress={(e) => { e.stopPropagation(); deletePeriod(period); }} style={{ padding: 8 }}>
                                            <MaterialIcons name="delete-outline" size={24} color={colors.error} />
                                        </Pressable>
                                    </Pressable>
                                ))
                            )}
                        </View>

                        {/* Save Button */}
                        <View style={{ padding: 16 }}>
                            <Pressable
                                onPress={handleSaveTimetable}
                                disabled={saveTimetableMutation.isPending}
                                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.primary,
                                    borderRadius: 14,
                                    padding: 18,
                                    alignItems: "center",
                                    opacity: saveTimetableMutation.isPending ? 0.8 : 1, // Removed pressed opacity in favor of ripple
                                    elevation: 4,
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 8
                                })}
                            >
                                {saveTimetableMutation.isPending ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="save" size={20} color="#fff" />
                                        <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>
                                            Save Changes
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60, opacity: 0.5 }}>
                        <MaterialIcons name="class" size={64} color={colors.textSecondary} />
                        <Text style={{ marginTop: 16, color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 16 }}>
                            Select a class to manage schedule
                        </Text>
                    </View>
                )}
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
                        style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {editingPeriod ? "Edit Period" : "Add Period"}
                            </Text>
                            <Pressable onPress={() => setModalVisible(false)} hitSlop={10} style={{ padding: 4, backgroundColor: colors.background, borderRadius: 20 }}>
                                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Period Number */}
                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Period Number</Text>
                            <TextInput
                                value={String(tempPeriod.periodNumber)}
                                onChangeText={(t) => setTempPeriod({ ...tempPeriod, periodNumber: t })}
                                keyboardType="numeric"
                                style={{
                                    backgroundColor: colors.background,
                                    padding: 16,
                                    borderRadius: 12,
                                    color: colors.textPrimary,
                                    marginBottom: 20,
                                    borderWidth: 1,
                                    borderColor: colors.outlineVariant,
                                    fontFamily: "DMSans-Regular"
                                }}
                            />

                            {/* Time */}
                            <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Start Time</Text>
                                    <Pressable
                                        onPress={() => setShowTimePicker({ show: true, mode: 'start' })}
                                        style={{
                                            backgroundColor: colors.background,
                                            padding: 16,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: colors.outlineVariant,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Regular" }}>
                                            {tempPeriod.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </Text>
                                        <MaterialIcons name="access-time" size={20} color={colors.primary} />
                                    </Pressable>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>End Time</Text>
                                    <Pressable
                                        onPress={() => setShowTimePicker({ show: true, mode: 'end' })}
                                        style={{
                                            backgroundColor: colors.background,
                                            padding: 16,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: colors.outlineVariant,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Regular" }}>
                                            {tempPeriod.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </Text>
                                        <MaterialIcons name="access-time" size={20} color={colors.primary} />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Subject */}
                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Subject</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
                                {availableSubjects.length === 0 ? (
                                    <Text style={{ color: colors.error, fontFamily: "DMSans-Regular" }}>No subjects found for this class.</Text>
                                ) : (
                                    availableSubjects.map(sub => (
                                        <Pressable
                                            key={sub._id}
                                            onPress={() => setTempPeriod({ ...tempPeriod, subject: sub._id, teacher: "" })}
                                            style={{
                                                paddingHorizontal: 16,
                                                paddingVertical: 10,
                                                backgroundColor: tempPeriod.subject === sub._id ? colors.primary : colors.background,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: tempPeriod.subject === sub._id ? colors.primary : colors.outlineVariant
                                            }}
                                        >
                                            <Text style={{
                                                color: tempPeriod.subject === sub._id ? "#fff" : colors.textPrimary,
                                                fontFamily: tempPeriod.subject === sub._id ? "DMSans-Bold" : "DMSans-Medium"
                                            }}>
                                                {sub.name}
                                            </Text>
                                        </Pressable>
                                    ))
                                )}
                            </ScrollView>

                            {/* Teacher */}
                            {tempPeriod.subject && (
                                <>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Teacher</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }} contentContainerStyle={{ gap: 8 }}>
                                        {availableSubjects.find(s => s._id === tempPeriod.subject)?.teachers?.length === 0 ? (
                                            <Text style={{ color: colors.error, fontFamily: "DMSans-Regular" }}>No teachers assigned to this subject.</Text>
                                        ) : (
                                            availableSubjects.find(s => s._id === tempPeriod.subject)?.teachers?.map(t => (
                                                <Pressable
                                                    key={t._id}
                                                    onPress={() => setTempPeriod({ ...tempPeriod, teacher: t._id })}
                                                    style={{
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 10,
                                                        backgroundColor: tempPeriod.teacher === t._id ? colors.secondary : colors.background,
                                                        borderRadius: 12,
                                                        borderWidth: 1,
                                                        borderColor: tempPeriod.teacher === t._id ? colors.secondary : colors.outlineVariant
                                                    }}
                                                >
                                                    <Text style={{
                                                        color: tempPeriod.teacher === t._id ? "#fff" : colors.textPrimary,
                                                        fontFamily: tempPeriod.teacher === t._id ? "DMSans-Bold" : "DMSans-Medium"
                                                    }}>
                                                        {t.name}
                                                    </Text>
                                                </Pressable>
                                            ))
                                        )}
                                    </ScrollView>
                                </>
                            )}

                            <Pressable
                                onPress={savePeriod}
                                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.primary,
                                    padding: 18,
                                    borderRadius: 14,
                                    alignItems: "center",
                                    marginBottom: 20,
                                    opacity: 1, // Removed pressed opacity for ink ripple
                                    elevation: 2
                                })}
                            >
                                <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>
                                    {editingPeriod ? "Update Period" : "Add Period"}
                                </Text>
                            </Pressable>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Clone Timings Modal */}
            <Modal
                visible={cloneModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCloneModalVisible(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                    onPress={() => setCloneModalVisible(false)}
                >
                    <Pressable
                        style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                Clone Timings
                            </Text>
                            <Pressable onPress={() => setCloneModalVisible(false)} hitSlop={10} style={{ padding: 4, backgroundColor: colors.background, borderRadius: 20 }}>
                                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16, fontFamily: "DMSans-Regular" }}>
                                Copy the timing structure from <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{classes?.find(c => c._id === selectedClassId)?.name} {classes?.find(c => c._id === selectedClassId)?.section} - {selectedDay}</Text> to the selected classes and days below. Subjects and teachers will NOT be copied.
                            </Text>

                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Select Target Days</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {DAYS.map(day => (
                                    <Pressable
                                        key={day}
                                        onPress={() => {
                                            if (cloneTargetDays.includes(day)) setCloneTargetDays(cloneTargetDays.filter(d => d !== day));
                                            else setCloneTargetDays([...cloneTargetDays, day]);
                                        }}
                                        style={{
                                            paddingHorizontal: 12, paddingVertical: 8,
                                            borderRadius: 8, borderWidth: 1,
                                            backgroundColor: cloneTargetDays.includes(day) ? colors.primary : colors.background,
                                            borderColor: cloneTargetDays.includes(day) ? colors.primary : colors.outlineVariant
                                        }}
                                    >
                                        <Text style={{ color: cloneTargetDays.includes(day) ? "#fff" : colors.textPrimary, fontFamily: "DMSans-Medium" }}>{day.slice(0, 3)}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Select Target Classes</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                                {(classes || []).map(cls => (
                                    <Pressable
                                        key={cls._id}
                                        onPress={() => {
                                            if (cloneTargetClasses.includes(cls._id)) setCloneTargetClasses(cloneTargetClasses.filter(c => c !== cls._id));
                                            else setCloneTargetClasses([...cloneTargetClasses, cls._id]);
                                        }}
                                        style={{
                                            paddingHorizontal: 12, paddingVertical: 8,
                                            borderRadius: 8, borderWidth: 1,
                                            backgroundColor: cloneTargetClasses.includes(cls._id) ? colors.primary : colors.background,
                                            borderColor: cloneTargetClasses.includes(cls._id) ? colors.primary : colors.outlineVariant
                                        }}
                                    >
                                        <Text style={{ color: cloneTargetClasses.includes(cls._id) ? "#fff" : colors.textPrimary, fontFamily: "DMSans-Medium" }}>{cls.name} {cls.section}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Pressable
                                onPress={handleCloneTimings}
                                disabled={isCloning || !schedule[selectedDay] || schedule[selectedDay].length === 0}
                                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                                style={({ pressed }) => ({
                                    backgroundColor: colors.primary,
                                    padding: 18,
                                    borderRadius: 14,
                                    alignItems: "center",
                                    marginBottom: 20,
                                    opacity: isCloning || !schedule[selectedDay] || schedule[selectedDay].length === 0 ? 0.8 : 1,
                                    elevation: 2
                                })}
                            >
                                {isCloning ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>
                                        {(!schedule[selectedDay] || schedule[selectedDay].length === 0) ? "No periods to clone" : "Clone Timings"}
                                    </Text>
                                )}
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
