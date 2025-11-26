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
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function AdminAttendanceScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [classReport, setClassReport] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            loadClassReport(selectedClass._id);
        }
    }, [selectedClass]);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // Load analytics
            const analyticsResponse = await apiFetch(
                `${apiConfig.baseUrl}/attendance/analytics`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (analyticsResponse.ok) {
                const data = await analyticsResponse.json();
                setAnalytics(data);
            }

            // Load all classes
            const classesResponse = await apiFetch(
                `${apiConfig.baseUrl}/classes`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (classesResponse.ok) {
                const data = await classesResponse.json();
                setClasses(data);
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadClassReport = async (classId) => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");

            // Get last 30 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const response = await apiFetch(
                `${apiConfig.baseUrl}/attendance/class/${classId}/report?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setClassReport(data);
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading class report", "error");
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
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
                    <Header
                        title="Attendance Analytics"
                        subtitle="School-wide attendance overview"
                    />

                    {/* Today's Summary */}
                    <View style={{
                        backgroundColor: colors.primary,
                        borderRadius: 20,
                        padding: 24,
                        marginTop: 20,
                        elevation: 4
                    }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <MaterialIcons name="today" size={24} color="#fff" />
                            <Text style={{ fontSize: 18, color: "#fff", fontFamily: "DMSans-Bold" }}>
                                Today's Attendance
                            </Text>
                        </View>
                        <Text style={{ fontSize: 56, fontFamily: "DMSans-Bold", color: "#fff", marginTop: 4 }}>
                            {analytics?.today?.percentage || 0}%
                        </Text>
                        <View style={{ flexDirection: "row", gap: 24, marginTop: 16 }}>
                            <View>
                                <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    {analytics?.today?.present || 0}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                    Present
                                </Text>
                            </View>
                            <View>
                                <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    {analytics?.today?.absent || 0}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                    Absent
                                </Text>
                            </View>
                            <View>
                                <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    {analytics?.today?.total || 0}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#fff", opacity: 0.8, fontFamily: "DMSans-Regular" }}>
                                    Total
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 30-Day Trend */}
                    {analytics?.trend && analytics.trend.length > 0 && (
                        <View style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 20,
                            elevation: 2
                        }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 12 }}>
                                Last 7 Days Trend
                            </Text>
                            {analytics.trend.slice(-7).reverse().map((day, index) => (
                                <View
                                    key={index}
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingVertical: 12,
                                        borderBottomWidth: index < 6 ? 1 : 0,
                                        borderBottomColor: colors.textSecondary + "20"
                                    }}
                                >
                                    <View>
                                        <Text style={{ fontSize: 15, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                            {new Date(day.date).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: 'short'
                                            })}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                            {day.present} / {day.total} students
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={{
                                            fontSize: 20,
                                            fontFamily: "DMSans-Bold",
                                            color: parseFloat(day.percentage) >= 75 ? colors.success : colors.error
                                        }}>
                                            {day.percentage}%
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Class Selection */}
                    <View style={{ marginTop: 24 }}>
                        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 12 }}>
                            Class Reports
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {classes.map((cls) => (
                                <Pressable
                                    key={cls._id}
                                    onPress={() => setSelectedClass(cls)}
                                    style={({ pressed }) => ({
                                        backgroundColor: selectedClass?._id === cls._id
                                            ? colors.primary
                                            : colors.cardBackground,
                                        borderRadius: 12,
                                        paddingHorizontal: 20,
                                        paddingVertical: 12,
                                        marginRight: 10,
                                        opacity: pressed ? 0.7 : 1,
                                        elevation: selectedClass?._id === cls._id ? 3 : 1
                                    })}
                                >
                                    <Text style={{
                                        fontSize: 15,
                                        fontFamily: "DMSans-Bold",
                                        color: selectedClass?._id === cls._id ? "#fff" : colors.textPrimary
                                    }}>
                                        {cls.name} {cls.section}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Class Report Table */}
                    {selectedClass && classReport.length > 0 && (
                        <View style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 12,
                            elevation: 2
                        }}>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 12 }}>
                                {selectedClass.name} {selectedClass.section} - Last 30 Days
                            </Text>

                            {/* Low Attendance Alerts */}
                            {classReport.filter(s => s.percentage < 75).length > 0 && (
                                <View style={{
                                    backgroundColor: colors.error + "15",
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 16,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 10
                                }}>
                                    <MaterialIcons name="warning" size={24} color={colors.error} />
                                    <Text style={{ fontSize: 13, color: colors.error, fontFamily: "DMSans-SemiBold", flex: 1 }}>
                                        {classReport.filter(s => s.percentage < 75).length} student(s) with attendance below 75%
                                    </Text>
                                </View>
                            )}

                            {classReport
                                .sort((a, b) => a.percentage - b.percentage) // Sort by percentage ascending (low first)
                                .map((student, index) => (
                                    <View
                                        key={student.student._id}
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            paddingVertical: 12,
                                            borderBottomWidth: index < classReport.length - 1 ? 1 : 0,
                                            borderBottomColor: colors.textSecondary + "20"
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                {student.student.name}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                                P: {student.present} | A: {student.absent} | L: {student.late} | E: {student.excused}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: "flex-end" }}>
                                            <Text style={{
                                                fontSize: 20,
                                                fontFamily: "DMSans-Bold",
                                                color: student.percentage >= 75 ? colors.success : colors.error
                                            }}>
                                                {student.percentage}%
                                            </Text>
                                            {student.percentage < 75 && (
                                                <View style={{
                                                    backgroundColor: colors.error + "20",
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 2,
                                                    borderRadius: 4,
                                                    marginTop: 4
                                                }}>
                                                    <Text style={{ fontSize: 10, color: colors.error, fontFamily: "DMSans-Bold" }}>
                                                        LOW
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                        </View>
                    )}

                    {selectedClass && classReport.length === 0 && (
                        <View style={{
                            backgroundColor: colors.cardBackground,
                            borderRadius: 16,
                            padding: 24,
                            marginTop: 12,
                            alignItems: "center"
                        }}>
                            <MaterialIcons name="info-outline" size={48} color={colors.textSecondary} />
                            <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 12, fontFamily: "DMSans-Medium" }}>
                                No attendance data for this class
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
