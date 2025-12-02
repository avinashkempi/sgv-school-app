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
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherScheduleScreen() {
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
            setSelectedDay('Monday');
        }
    }, []);

    const { data: scheduleData, isLoading: loading, refetch } = useApiQuery(
        ['teacherSchedule'],
        `${apiConfig.baseUrl}/timetable/my-schedule`
    );

    // Process schedule data
    const schedule = React.useMemo(() => {
        if (!scheduleData) return {};

        const scheduleMap = {};
        DAYS.forEach(day => {
            scheduleMap[day] = (scheduleData[day] || []).sort((a, b) => {
                const timeA = a.startTime || "";
                const timeB = b.startTime || "";
                return timeA.localeCompare(timeB);
            });
        });
        return scheduleMap;
    }, [scheduleData]);

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
                    <AppHeader title="My Schedule" subtitle="Teaching Timetable" showBack />

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
                                <MaterialIcons name="free-breakfast" size={48} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
                                    No classes scheduled
                                </Text>
                            </View>
                        ) : (
                            schedule[selectedDay].map((period, index) => (
                                <View
                                    key={index}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        flexDirection: "row",
                                        gap: 16,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 1,
                                        borderLeftWidth: 4,
                                        borderLeftColor: colors.secondary
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

                                    {/* Details Column */}
                                    <View style={{ flex: 1, justifyContent: "center" }}>
                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
                                            {period.className}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: colors.primary, fontFamily: "DMSans-Medium", marginBottom: 4 }}>
                                            {period.subject?.name || "Subject"}
                                        </Text>

                                        {period.roomNumber && (
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                <MaterialIcons name="room" size={14} color={colors.textSecondary} />
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                    Room {period.roomNumber}
                                                </Text>
                                            </View>
                                        )}
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
