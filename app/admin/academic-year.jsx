import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    StyleSheet,
    Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";
import { formatDate } from "../../utils/date";
import { getCachedData, setCachedData } from "../../utils/cache";

export default function AcademicYearScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState("years"); // "years" | "reports"
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [form, setForm] = useState({
        name: "",
        startDate: "",
        endDate: "",
        isActive: false
    });
    const [saving, setSaving] = useState(false);

    // Reports State
    const [selectedYearId, setSelectedYearId] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        loadUserRole();
        loadYears();
    }, []);

    const loadUserRole = async () => {
        try {
            const storedUser = await AsyncStorage.getItem("@auth_user");
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUserRole(parsedUser.role);
            }
        } catch (error) {
            console.error("Failed to load user role:", error);
        }
    };

    const loadYears = async () => {
        const cacheKey = "@admin_academic_years";
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const cachedData = await getCachedData(cacheKey);
            if (cachedData) {
                setYears(cachedData);
                setLoading(false);
                if (cachedData.length > 0 && !selectedYearId) {
                    setSelectedYearId(cachedData[0]._id);
                }
            }

            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
                silent: !!cachedData
            });

            if (response.ok) {
                const data = await response.json();
                setYears(data);
                setCachedData(cacheKey, data);
                if (data.length > 0 && !selectedYearId) {
                    setSelectedYearId(data[0]._id);
                }
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadReport = async (yearId) => {
        if (!yearId) return;
        setReportLoading(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year/${yearId}/reports`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setReportData(data);
            } else {
                showToast("Failed to load report", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading report", "error");
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "reports" && selectedYearId) {
            loadReport(selectedYearId);
        }
    }, [activeTab, selectedYearId]);

    const handleCreate = async () => {
        if (!form.name || !form.startDate || !form.endDate) {
            showToast("Please fill all fields", "error");
            return;
        }

        // Validate format YYYY-YYYY
        if (!/^\d{4}-\d{4}$/.test(form.name)) {
            showToast("Name must be in YYYY-YYYY format", "error");
            return;
        }

        setSaving(true);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (response.ok) {
                showToast("Academic Year created", "success");
                setShowModal(false);
                setForm({ name: "", startDate: "", endDate: "", isActive: false });
                loadYears();
            } else {
                const data = await response.json();
                showToast(data.msg || "Failed to create", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error creating academic year", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleIncrement = async (id, name) => {
        Alert.alert(
            "Activate & Promote",
            `WARNING: This will activate ${name}, promote all eligible students to the next class, and create history records for the current year. This action cannot be easily undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Proceed",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("@auth_token");
                            // Use /increment endpoint instead of /upgrade
                            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year/increment`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ nextYearId: id }),
                            });

                            if (response.ok) {
                                showToast("Year Incremented & Students Promoted!", "success");
                                loadYears();
                            } else {
                                const errorData = await response.json();
                                showToast(errorData.msg || "Failed to increment year", "error");
                            }
                        } catch (error) {
                            console.error("Increment error:", error);
                            showToast("Error incrementing year", "error");
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadYears();
        if (activeTab === "reports" && selectedYearId) {
            loadReport(selectedYearId);
        }
    };

    const renderYearsTab = () => (
        <View style={{ marginTop: 16 }}>
            {years.map((year) => (
                <View
                    key={year._id}
                    style={{
                        backgroundColor: colors.cardBackground,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 12,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderWidth: year.isActive ? 2 : 0,
                        borderColor: colors.primary
                    }}
                >
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                            {year.name}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                            {formatDate(year.startDate)} - {formatDate(year.endDate)}
                        </Text>
                        {year.isActive && (
                            <View style={{ backgroundColor: colors.primary + "20", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 8 }}>
                                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>ACTIVE</Text>
                            </View>
                        )}
                    </View>

                    {!year.isActive && userRole === 'super admin' && (
                        <Pressable
                            onPress={() => handleIncrement(year._id, year.name)}
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderWidth: 1,
                                borderColor: colors.primary,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8
                            }}
                        >
                            <Text style={{ color: colors.primary, fontWeight: "600" }}>Activate & Promote</Text>
                        </Pressable>
                    )}
                </View>
            ))}
        </View>
    );

    const renderReportsTab = () => (
        <View style={{ marginTop: 16 }}>
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, marginBottom: 16 }}>
                <Picker
                    selectedValue={selectedYearId}
                    onValueChange={(itemValue) => setSelectedYearId(itemValue)}
                    style={{ color: colors.textPrimary }}
                    dropdownIconColor={colors.textPrimary}
                >
                    {years.map((year) => (
                        <Picker.Item key={year._id} label={year.name} value={year._id} />
                    ))}
                </Picker>
            </View>

            {reportLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
            ) : reportData ? (
                <View>
                    {/* Student Summary */}
                    <View style={localStyles.card(colors)}>
                        <Text style={localStyles.cardTitle(colors)}>Student Distribution</Text>
                        {Object.entries(reportData.classWiseStudents || {}).map(([className, students]) => (
                            <View key={className} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                <Text style={{ color: colors.textSecondary }}>{className}</Text>
                                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>{students.length}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Teacher Leaves */}
                    <View style={localStyles.card(colors)}>
                        <Text style={localStyles.cardTitle(colors)}>Teacher Leaves</Text>
                        {reportData.teacherLeaves && reportData.teacherLeaves.length > 0 ? (
                            reportData.teacherLeaves.map((leave, index) => (
                                <View key={index} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
                                    <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>{leave.applicant?.name}</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)} ({leave.leaveType})
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Reason: {leave.reason}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: colors.textSecondary }}>No leaves recorded.</Text>
                        )}
                    </View>

                    {/* Teacher Attendance Summary */}
                    <View style={localStyles.card(colors)}>
                        <Text style={localStyles.cardTitle(colors)}>Teacher Attendance Stats</Text>
                        {reportData.teacherAttendance && reportData.teacherAttendance.length > 0 ? (
                            reportData.teacherAttendance.map((record, index) => (
                                <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                    <Text style={{ color: colors.textSecondary }}>{record.user} ({record.status})</Text>
                                    <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>{record.count} days</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: colors.textSecondary }}>No attendance data.</Text>
                        )}
                    </View>
                </View>
            ) : (
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>Select a year to view reports</Text>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header title="Academic Years" subtitle="Manage & Reports" showBack />

                    {/* Tabs */}
                    <View style={{ flexDirection: "row", marginTop: 16, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 4 }}>
                        <Pressable
                            onPress={() => setActiveTab("years")}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                borderRadius: 8,
                                backgroundColor: activeTab === "years" ? colors.primary : "transparent"
                            }}
                        >
                            <Text style={{ color: activeTab === "years" ? "#fff" : colors.textSecondary, fontWeight: "600" }}>Management</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab("reports")}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                borderRadius: 8,
                                backgroundColor: activeTab === "reports" ? colors.primary : "transparent"
                            }}
                        >
                            <Text style={{ color: activeTab === "reports" ? "#fff" : colors.textSecondary, fontWeight: "600" }}>Reports</Text>
                        </Pressable>
                    </View>

                    {activeTab === "years" ? renderYearsTab() : renderReportsTab()}
                </View>
            </ScrollView>

            {activeTab === "years" && (
                <Pressable
                    onPress={() => setShowModal(true)}
                    style={{
                        position: "absolute",
                        bottom: 110,
                        right: 24,
                        backgroundColor: colors.primary,
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        justifyContent: "center",
                        alignItems: "center",
                        elevation: 6,
                    }}
                >
                    <MaterialIcons name="add" size={28} color="#fff" />
                </Pressable>
            )}

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                            New Academic Year
                        </Text>

                        <TextInput
                            placeholder="Name (e.g. 2025-2026)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 12
                            }}
                            value={form.name}
                            onChangeText={(t) => setForm({ ...form, name: t })}
                        />

                        <TextInput
                            placeholder="Start Date (DD-MM-YYYY)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 12
                            }}
                            value={form.startDate}
                            onChangeText={(t) => setForm({ ...form, startDate: t })}
                        />

                        <TextInput
                            placeholder="End Date (DD-MM-YYYY)"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                color: colors.textPrimary,
                                marginBottom: 24
                            }}
                            value={form.endDate}
                            onChangeText={(t) => setForm({ ...form, endDate: t })}
                        />

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                            <Pressable onPress={() => setShowModal(false)} style={{ padding: 12 }}>
                                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCreate}
                                disabled={saving}
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    opacity: saving ? 0.7 : 1,
                                    minWidth: 80,
                                    alignItems: 'center'
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ color: "#fff", fontWeight: "600" }}>Create</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const localStyles = {
    card: (colors) => ({
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    }),
    cardTitle: (colors) => ({
        fontSize: 16,
        fontWeight: "700",
        color: colors.textPrimary,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 8
    })
};
