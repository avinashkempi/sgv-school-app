import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../../hooks/useApi";
import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useToast } from "../../../components/ToastProvider";
import AppHeader from "../../../components/Header";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function MarkAttendanceScreen() {
    const _router = useRouter();
    const params = useLocalSearchParams();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { classId, subjectId, date: initialDate } = params;

    const [selectedDate, setSelectedDate] = useState(initialDate ? new Date(initialDate + 'T00:00:00') : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [students, setStudents] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalStatuses, setOriginalStatuses] = useState({});

    const dateStr = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

    // ─── Cached queries for class & subject (fetched once) ───
    const { data: classData } = useApiQuery(
        ['class', classId],
        `${apiConfig.baseUrl}/classes/${classId}`,
        { enabled: !!classId, staleTime: 5 * 60 * 1000 }
    );

    const { data: subjectData } = useApiQuery(
        ['subject', subjectId],
        `${apiConfig.baseUrl}/subjects/${subjectId}`,
        { enabled: !!subjectId, staleTime: 5 * 60 * 1000 }
    );

    // ─── Attendance data with silent background refresh ───
    const attendanceEndpoint = useMemo(() => {
        if (subjectId) return `/attendance/subject/${subjectId}/date/${dateStr}`;
        if (classId) return `/attendance/class/${classId}/date/${dateStr}`;
        return null;
    }, [classId, subjectId, dateStr]);

    const {
        data: attendanceData,
        isLoading,
        isFetching,
        refetch
    } = useApiQuery(
        ['attendance', classId || subjectId, dateStr],
        `${apiConfig.baseUrl}${attendanceEndpoint}`,
        {
            enabled: !!attendanceEndpoint,
            placeholderData: keepPreviousData,
            staleTime: 30 * 1000, // 30 seconds
        }
    );

    // ─── Populate local state from query data ───
    useEffect(() => {
        if (attendanceData && Array.isArray(attendanceData)) {
            // Apply on-leave auto-absent logic
            const processed = attendanceData.map(s =>
                s.onLeave && !s.status ? { ...s, status: 'absent' } : s
            );
            setStudents(processed);
            const origMap = {};
            attendanceData.forEach(s => { origMap[s.student._id] = s.status; });
            setOriginalStatuses(origMap);
            setHasUnsavedChanges(false);
        }
    }, [attendanceData]);

    // ─── Save mutation with cache invalidation ───
    const saveMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/attendance/mark`, 'POST'),
        onSuccess: () => {
            showToast("Attendance saved successfully", "success");
            setHasUnsavedChanges(false);
            // Invalidate this date's cache so it refetches fresh data
            queryClient.invalidateQueries({ queryKey: ['attendance', classId || subjectId, dateStr] });
        },
        onError: (error) => {
            showToast(error.message || "Failed to save attendance", "error");
        }
    });
    const saving = saveMutation.isPending;

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleStatusChange = (studentId, newStatus) => {
        setStudents(prevStudents =>
            prevStudents.map(s =>
                s.student._id === studentId
                    ? { ...s, status: newStatus }
                    : s
            )
        );
        setHasUnsavedChanges(true);
    };

    const handleMarkAllPresent = () => {
        setStudents(prevStudents =>
            prevStudents.map(s => s.onLeave ? { ...s, status: 'absent' } : { ...s, status: 'present' })
        );
        setHasUnsavedChanges(true);
    };

    const handleSaveAttendance = () => {
        const attendanceRecords = students
            .filter(s => s.status !== null)
            .map(s => ({
                studentId: s.student._id,
                status: s.status,
                remarks: s.remarks || ''
            }));

        if (attendanceRecords.length === 0) {
            showToast("Please mark attendance for at least one student", "warning");
            return;
        }

        saveMutation.mutate({
            classId,
            subjectId: null,
            date: dateStr,
            attendanceRecords
        });
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return colors.success;
            case 'absent': return colors.error;
            case 'late': return '#FF9800';
            case 'excused': return '#2196F3';
            default: return colors.textSecondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return 'check-circle';
            case 'absent': return 'cancel';
            case 'late': return 'schedule';
            case 'excused': return 'verified';
            default: return 'radio-button-unchecked';
        }
    };

    // Fetch if current date is holiday
    const { data: holidayData } = useApiQuery(
        ['holidayStatus', dateStr],
        `${apiConfig.baseUrl}/events?startDate=${dateStr}&endDate=${dateStr}&isHoliday=true`,
        { staleTime: 60 * 1000 }
    );
    const holidayEvent = (holidayData?.event && holidayData.event.length > 0) ? holidayData.event[0] : null;
    const isSunday = selectedDate.getDay() === 0;
    const isHoliday = isSunday || !!holidayEvent;
    const holidayReason = isSunday ? 'Sunday (Weekend)' : holidayEvent?.title;

    // Computed counts
    const presentCount = useMemo(() => students.filter(s => s.status === 'present').length, [students]);
    const absentCount = useMemo(() => students.filter(s => s.status === 'absent').length, [students]);
    const lateCount = useMemo(() => students.filter(s => s.status === 'late').length, [students]);
    const unmarkedCount = useMemo(() => students.filter(s => !s.status).length, [students]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
                        title="Mark Attendance"
                        subtitle={subjectData ? `${subjectData.name} - ${classData?.name}` : classData?.name}
                    />

                    {/* Date Navigation & Picker */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
                        <Pressable
                            onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }}
                            style={({ pressed }) => ({ backgroundColor: colors.cardBackground, padding: 12, borderRadius: 12, elevation: 2, opacity: pressed ? 0.7 : 1 })}
                        >
                            <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
                        </Pressable>

                        <Pressable
                            onPress={() => setShowDatePicker(true)}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: colors.cardBackground,
                                borderRadius: 12,
                                padding: 12,
                                marginHorizontal: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                elevation: 2,
                                gap: 12,
                                opacity: pressed ? 0.7 : 1
                            })}
                        >
                            <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                    Selected Date
                                </Text>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 2 }}>
                                    {selectedDate.toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>
                        </Pressable>

                        <Pressable
                            onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }}
                            style={({ pressed }) => ({ backgroundColor: colors.cardBackground, padding: 12, borderRadius: 12, elevation: 2, opacity: pressed ? 0.7 : 1 })}
                        >
                            <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
                        </Pressable>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    {/* Silent refresh spinner */}
                    {isFetching && !isLoading && (
                        <View style={{ alignItems: 'center', marginTop: 12 }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    )}

                    {isHoliday && (
                        <View style={{ backgroundColor: colors.primary + '15', marginVertical: 16, padding: 16, borderRadius: 12, alignItems: 'center', borderColor: colors.primary, borderWidth: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>🌴 Holiday</Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>{holidayReason}</Text>
                        </View>
                    )}

                    {/* Action Buttons — Mark All Present + Save */}
                    {!isHoliday && !isLoading && students.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <Pressable
                                onPress={handleMarkAllPresent}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    backgroundColor: colors.success + '15',
                                    borderWidth: 1.5,
                                    borderColor: colors.success,
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    opacity: pressed ? 0.7 : 1
                                })}
                            >
                                <MaterialIcons name="check-circle" size={18} color={colors.success} />
                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.success }}>All Present</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleSaveAttendance}
                                disabled={saving}
                                style={({ pressed }) => ({
                                    flex: 1.5,
                                    backgroundColor: colors.primary,
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    opacity: pressed || saving ? 0.7 : 1,
                                    elevation: 3
                                })}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="save" size={18} color="#fff" />
                                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: '#fff' }}>Save Attendance</Text>
                                        {hasUnsavedChanges && (
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF9800', marginLeft: 2 }} />
                                        )}
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}

                    {/* Live Counter */}
                    {!isHoliday && !isLoading && students.length > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.success }}>{presentCount} P</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error }} />
                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.error }}>{absentCount} A</Text>
                            </View>
                            {lateCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF9800' }} />
                                    <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: '#FF9800' }}>{lateCount} L</Text>
                                </View>
                            )}
                            {unmarkedCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF9800' }} />
                                    <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: '#FF9800' }}>{unmarkedCount} ?</Text>
                                </View>
                            )}
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.textSecondary }}>/ {students.length}</Text>
                        </View>
                    )}

                    {/* Students List Header */}
                    {!isHoliday && (
                        <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                Students ({students.length})
                            </Text>
                        </View>

                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 60 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        students.map((studentData, index) => {
                            const statusColor = studentData.status ? getStatusColor(studentData.status) : null;
                            const borderColor = studentData.onLeave ? '#FF9800' : statusColor;

                            return (
                                <Pressable
                                    key={studentData.student._id}
                                    onPress={() => {
                                        const newStatus = studentData.status === 'present' ? 'absent' : 'present';
                                        handleStatusChange(studentData.student._id, newStatus);
                                    }}
                                    style={({ pressed }) => ({
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 12,
                                        padding: 12,
                                        marginBottom: 8,
                                        elevation: 1,
                                        opacity: pressed ? 0.85 : 1,
                                        ...(borderColor && { borderLeftWidth: 4, borderLeftColor: borderColor }),
                                    })}
                                >
                                    {/* Top row: name + status badge */}
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ fontSize: 15, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                {index + 1}. {studentData.student.name}
                                            </Text>
                                            {studentData.onLeave && (
                                                <View style={{ backgroundColor: '#FF9800' + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                                    <Text style={{ fontSize: 10, fontFamily: "DMSans-Bold", color: '#FF9800' }}>ON LEAVE</Text>
                                                </View>
                                            )}
                                        </View>
                                        {studentData.status ? (
                                            <View style={{
                                                backgroundColor: getStatusColor(studentData.status) + '20',
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                <MaterialIcons
                                                    name={getStatusIcon(studentData.status)}
                                                    size={16}
                                                    color={getStatusColor(studentData.status)}
                                                />
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontFamily: "DMSans-Bold",
                                                    color: getStatusColor(studentData.status),
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {studentData.status}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>Tap to mark</Text>
                                        )}
                                    </View>

                                    {/* Leave reason */}
                                    {studentData.onLeave && studentData.leaveReason && (
                                        <Text style={{ fontSize: 11, color: '#FF9800', marginTop: 4, fontFamily: "DMSans-Medium" }}>
                                            Reason: {studentData.leaveReason}
                                        </Text>
                                    )}

                                    {/* Fine-tune P/A/L/E row — visible when status is set */}
                                    {studentData.status && (
                                        <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                                            {['present', 'absent', 'late', 'excused'].map((status) => (
                                                <Pressable
                                                    key={status}
                                                    onPress={() => handleStatusChange(studentData.student._id, status)}
                                                    style={({ pressed }) => ({
                                                        flex: 1,
                                                        backgroundColor: studentData.status === status
                                                            ? getStatusColor(status) + "20"
                                                            : 'transparent',
                                                        borderWidth: studentData.status === status ? 1.5 : 1,
                                                        borderColor: studentData.status === status
                                                            ? getStatusColor(status)
                                                            : colors.textSecondary + "20",
                                                        borderRadius: 6,
                                                        paddingVertical: 6,
                                                        alignItems: "center",
                                                        opacity: pressed ? 0.7 : 1
                                                    })}
                                                >
                                                    <Text style={{
                                                        fontSize: 10,
                                                        fontFamily: "DMSans-Bold",
                                                        color: studentData.status === status
                                                            ? getStatusColor(status)
                                                            : colors.textSecondary + '80',
                                                    }}>
                                                        {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'E'}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })
                    )}

                    {/* Bottom Save Button (after student list) */}
                    {!isLoading && students.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <Pressable
                                onPress={handleMarkAllPresent}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    backgroundColor: colors.success + '15',
                                    borderWidth: 1.5,
                                    borderColor: colors.success,
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    opacity: pressed ? 0.7 : 1
                                })}
                            >
                                <MaterialIcons name="check-circle" size={18} color={colors.success} />
                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.success }}>All Present</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleSaveAttendance}
                                disabled={saving}
                                style={({ pressed }) => ({
                                    flex: 1.5,
                                    backgroundColor: colors.primary,
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    opacity: pressed || saving ? 0.7 : 1,
                                    elevation: 3
                                })}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="save" size={18} color="#fff" />
                                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: '#fff' }}>Save Attendance</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                    </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
