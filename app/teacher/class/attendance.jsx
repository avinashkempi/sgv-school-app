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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import apiFetch from "../../../utils/apiFetch";
import { useToast } from "../../../components/ToastProvider";
import Header from "../../../components/Header";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function MarkAttendanceScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const { classId, subjectId } = params;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [students, setStudents] = useState([]);
    const [classData, setClassData] = useState(null);
    const [subjectData, setSubjectData] = useState(null);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // Load class/subject info
            if (classId) {
                const classResponse = await apiFetch(`${apiConfig.baseUrl}/classes/${classId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (classResponse.ok) {
                    const data = await classResponse.json();
                    setClassData(data);
                }
            }

            if (subjectId) {
                const subjectResponse = await apiFetch(`${apiConfig.baseUrl}/subjects/${subjectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (subjectResponse.ok) {
                    const data = await subjectResponse.json();
                    setSubjectData(data);
                }
            }

            // Load attendance for selected date
            const dateStr = selectedDate.toISOString().split('T')[0];
            const endpoint = subjectId
                ? `/attendance/subject/${subjectId}/date/${dateStr}`
                : `/attendance/class/${classId}/date/${dateStr}`;

            const response = await apiFetch(`${apiConfig.baseUrl}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStudents(data);
            } else {
                showToast("Failed to load attendance", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleStatusChange = (studentId, newStatus) => {
        setStudents(prevStudents =>
            prevStudents.map(s =>
                s.student._id === studentId
                    ? { ...s, status: newStatus }
                    : s
            )
        );
    };

    const handleMarkAllPresent = () => {
        setStudents(prevStudents =>
            prevStudents.map(s => ({ ...s, status: 'present' }))
        );
    };



    const handleSaveAttendance = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("@auth_token");

            // Prepare attendance records
            const attendanceRecords = students
                .filter(s => s.status !== null)
                .map(s => ({
                    studentId: s.student._id,
                    status: s.status,
                    remarks: s.remarks || ''
                }));

            if (attendanceRecords.length === 0) {
                showToast("Please mark attendance for at least one student", "warning");
                setSaving(false);
                return;
            }

            const dateStr = selectedDate.toISOString().split('T')[0];

            const response = await apiFetch(`${apiConfig.baseUrl}/attendance/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    classId,
                    subjectId: null, // Force class-based attendance
                    date: dateStr,
                    attendanceRecords
                })
            });

            if (response.ok) {
                showToast("Attendance saved successfully", "success");
                loadData();
            } else {
                const error = await response.json();
                showToast(error.message || "Failed to save attendance", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error saving attendance", "error");
        } finally {
            setSaving(false);
        }
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

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Mark Attendance"
                        subtitle={subjectData ? `${subjectData.name} - ${classData?.name}` : classData?.name}
                    />

                    {/* Date Picker */}
                    <Pressable
                        onPress={() => setShowDatePicker(true)}
                        style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 12,
                            padding: 16,
                            marginTop: 20,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            elevation: 2
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
                            <View>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                                    Selected Date
                                </Text>
                                <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 2 }}>
                                    {selectedDate.toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>
                        </View>
                        <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
                    </Pressable>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    {/* Quick Actions */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                        <Pressable
                            onPress={handleMarkAllPresent}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: colors.success + "15",
                                borderRadius: 12,
                                padding: 14,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                opacity: pressed ? 0.7 : 1
                            })}
                        >
                            <MaterialIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.success }}>
                                All Present
                            </Text>
                        </Pressable>


                    </View>

                    {/* Attendance Summary */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 8 }}>
                        <View style={{ flex: 1, backgroundColor: colors.success + '15', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.success }}>
                                {students.filter(s => s.status === 'present').length}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.success, fontFamily: "DMSans-Medium" }}>Present</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: colors.error + '15', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.error }}>
                                {students.filter(s => s.status === 'absent').length}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.error, fontFamily: "DMSans-Medium" }}>Absent</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: colors.primary + '15', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.primary }}>
                                {students.length}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "DMSans-Medium" }}>Total</Text>
                        </View>
                    </View>

                    {/* Students List */}
                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>
                        Students List
                    </Text>

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 60 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        students.map((studentData, index) => (
                            <View
                                key={studentData.student._id}
                                style={{
                                    backgroundColor: colors.cardBackground,
                                    borderRadius: 12,
                                    padding: 14,
                                    marginBottom: 10,
                                    elevation: 1
                                }}
                            >
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                            {index + 1}. {studentData.student.name}
                                        </Text>
                                        {studentData.student.email && (
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                                {studentData.student.email}
                                            </Text>
                                        )}
                                    </View>
                                    {studentData.status && (
                                        <MaterialIcons
                                            name={getStatusIcon(studentData.status)}
                                            size={24}
                                            color={getStatusColor(studentData.status)}
                                        />
                                    )}
                                </View>

                                {/* Status Buttons */}
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {['present', 'absent', 'late', 'excused'].map((status) => (
                                        <Pressable
                                            key={status}
                                            onPress={() => handleStatusChange(studentData.student._id, status)}
                                            style={({ pressed }) => ({
                                                flex: 1,
                                                backgroundColor: studentData.status === status
                                                    ? getStatusColor(status) + "20"
                                                    : colors.background,
                                                borderWidth: studentData.status === status ? 2 : 1,
                                                borderColor: studentData.status === status
                                                    ? getStatusColor(status)
                                                    : colors.textSecondary + "30",
                                                borderRadius: 8,
                                                paddingVertical: 10,
                                                alignItems: "center",
                                                opacity: pressed ? 0.7 : 1
                                            })}
                                        >
                                            <Text style={{
                                                fontSize: 11,
                                                fontFamily: "DMSans-Bold",
                                                color: studentData.status === status
                                                    ? getStatusColor(status)
                                                    : colors.textSecondary,
                                                textTransform: "uppercase"
                                            }}>
                                                {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'E'}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        ))
                    )}

                    {/* Save Button */}
                    {!loading && (
                        <Pressable
                            onPress={handleSaveAttendance}
                            disabled={saving}
                            style={({ pressed }) => ({
                                backgroundColor: colors.primary,
                                borderRadius: 12,
                                padding: 16,
                                marginTop: 24,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                opacity: pressed || saving ? 0.7 : 1,
                                elevation: 3
                            })}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <MaterialIcons name="save" size={24} color="#fff" />
                                    <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                        Save Attendance
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
