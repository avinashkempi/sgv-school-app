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

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetableScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { _showToast } = useToast();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [currentDay, setCurrentDay] = useState('');

    useEffect(() => {
        // Set current day
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        if (DAYS.includes(today)) {
            setSelectedDay(today);
            setCurrentDay(today);
        } else {
            setSelectedDay('Monday'); // Default to Monday if Sunday
        }
    }, []);

    // Fetch Timetable
    const { data: timetableData, isLoading: loading, refetch } = useApiQuery(
        ['studentTimetable'],
        `${apiConfig.baseUrl}/timetable/my-timetable`
    );

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

    // Process timetable data
    const schedule = {};
    DAYS.forEach(day => schedule[day] = []);

    if (timetableData?.schedule) {
        timetableData.schedule.forEach(daySchedule => {
            schedule[daySchedule.day] = daySchedule.periods.sort((a, b) => {
                return parseTime(a.startTime) - parseTime(b.startTime);
            });
        });
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader title="My Timetable" subtitle="Class Schedule" showBack />

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
                                            backgroundColor: selectedDay === day ? colors.primary : colors.cardBackground,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selectedDay === day ? colors.primary : colors.textSecondary + "20"
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

                        {(!schedule[selectedDay] || schedule[selectedDay].length === 0) ? (
                            <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                <MaterialIcons name="event-busy" size={48} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                    No classes scheduled
                                </Text>
                            </View>
                        ) : (
                            schedule[selectedDay].map((period, index) => (
                                <Card
                                    key={index}
                                    variant="elevated"
                                    style={{ marginBottom: 12 }}
                                    contentStyle={{
                                        flexDirection: "row",
                                        gap: 16,
                                        padding: 16
                                    }}
                                >
                                    {/* Time Column */}
                                    <View style={{ alignItems: "center", justifyContent: "center", width: 60 }}>
                                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                            {period.startTime}
                                        </Text>
                                        <View style={{ width: 1, height: 10, backgroundColor: colors.outlineVariant, marginVertical: 2 }} />
                                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                                            {period.endTime}
                                        </Text>
                                    </View>

                                    {/* Divider */}
                                    <View style={{ width: 4, backgroundColor: colors.primary, borderRadius: 2 }} />

                                    {/* Details Column */}
                                    <View style={{ flex: 1, justifyContent: "center" }}>
                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 4 }}>
                                            {period.subject?.name || "Subject"}
                                        </Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                <MaterialIcons name="person" size={14} color={colors.onSurfaceVariant} />
                                                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
                                                    {period.teacher?.name || "Teacher"}
                                                </Text>
                                            </View>
                                            {period.roomNumber && (
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                    <MaterialIcons name="room" size={14} color={colors.onSurfaceVariant} />
                                                    <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
                                                        Room {period.roomNumber}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </Card>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
