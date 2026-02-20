import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import AppHeader from "../../components/Header";
import apiConfig from "../../config/apiConfig";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SchoolTimetableScreen() {
    const { colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [currentDay, setCurrentDay] = useState('');

    useEffect(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        if (DAYS.includes(today)) {
            setSelectedDay(today);
            setCurrentDay(today);
        } else {
            setSelectedDay('Monday');
        }
    }, []);

    // Fetch all timetables
    const { data: timetables, isLoading: loading, refetch } = useApiQuery(
        ['schoolTimetable'],
        `${apiConfig.baseUrl}/timetable/all`
    );

    // Auto-select first class
    useEffect(() => {
        if (!selectedClassId && timetables && timetables.length > 0) {
            setSelectedClassId(timetables[0].class?._id || timetables[0].class);
        }
    }, [timetables, selectedClassId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Helper to parse time string to minutes for sorting
    const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    // Build schedule for selected class & day
    const getSchedule = () => {
        if (!timetables || !selectedClassId) return [];
        const classTimetable = timetables.find(t => {
            const cid = t.class?._id || t.class;
            return String(cid) === String(selectedClassId);
        });
        if (!classTimetable) return [];
        const daySchedule = classTimetable.schedule?.find(s => s.day === selectedDay);
        if (!daySchedule) return [];
        return [...daySchedule.periods].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
    };

    const dayPeriods = getSchedule();

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const classes = (timetables || []).map(t => t.class).filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader title="School Timetable" subtitle="All classes schedule" showBack />

                    {/* Class Selector */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>
                            Select Class
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {classes.map((cls) => {
                                    const cid = cls._id || cls;
                                    const isSelected = String(cid) === String(selectedClassId);
                                    return (
                                        <Pressable
                                            key={String(cid)}
                                            onPress={() => setSelectedClassId(cid)}
                                            style={{
                                                paddingHorizontal: 18,
                                                paddingVertical: 9,
                                                backgroundColor: isSelected ? colors.primary : colors.cardBackground,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: isSelected ? colors.primary : colors.textSecondary + "20",
                                                elevation: isSelected ? 3 : 0,
                                            }}
                                        >
                                            <Text style={{
                                                color: isSelected ? "#fff" : colors.textPrimary,
                                                fontFamily: isSelected ? "DMSans-Bold" : "DMSans-Medium",
                                                fontSize: 14
                                            }}>
                                                {cls.name} {cls.section || ""}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Day Tabs */}
                    <View style={{ marginTop: 20 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {DAYS.map((day) => (
                                    <Pressable
                                        key={day}
                                        onPress={() => setSelectedDay(day)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            backgroundColor: selectedDay === day ? colors.secondary : colors.cardBackground,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selectedDay === day ? colors.secondary : colors.textSecondary + "20"
                                        }}
                                    >
                                        <Text style={{
                                            color: selectedDay === day ? "#fff" : colors.textPrimary,
                                            fontFamily: selectedDay === day ? "DMSans-Bold" : "DMSans-Medium"
                                        }}>
                                            {day.slice(0, 3)}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Schedule List */}
                    <View style={{ marginTop: 24 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {selectedDay}
                            </Text>
                            {selectedDay === currentDay && (
                                <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 12, color: colors.success, fontFamily: "DMSans-Bold" }}>TODAY</Text>
                                </View>
                            )}
                        </View>

                        {dayPeriods.length === 0 ? (
                            <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                <MaterialIcons name="event-busy" size={48} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                    No classes scheduled
                                </Text>
                            </View>
                        ) : (
                            dayPeriods.map((period, index) => (
                                <View
                                    key={index}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        flexDirection: "row",
                                        gap: 16,
                                        elevation: 1,
                                        borderLeftWidth: 4,
                                        borderLeftColor: colors.primary,
                                    }}
                                >
                                    {/* Time Column */}
                                    <View style={{ alignItems: "center", justifyContent: "center", width: 60 }}>
                                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                            {period.startTime}
                                        </Text>
                                        <View style={{ width: 1, height: 10, backgroundColor: colors.textSecondary + "40", marginVertical: 2 }} />
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                            {period.endTime}
                                        </Text>
                                    </View>

                                    {/* Divider */}
                                    <View style={{ width: 1, backgroundColor: colors.textSecondary + "20" }} />

                                    {/* Details */}
                                    <View style={{ flex: 1, justifyContent: "center" }}>
                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
                                            {period.subject?.name || "Subject"}
                                        </Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                            <MaterialIcons name="person" size={14} color={colors.textSecondary} />
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                {period.teacher?.name || "Teacher"}
                                            </Text>
                                        </View>
                                        {period.roomNumber && (
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                                                <MaterialIcons name="room" size={14} color={colors.textSecondary} />
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                    Room {period.roomNumber}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Period badge */}
                                    <View style={{
                                        width: 32, height: 32,
                                        borderRadius: 10,
                                        backgroundColor: colors.primary + "15",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        alignSelf: "center"
                                    }}>
                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 14 }}>
                                            {period.periodNumber}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
