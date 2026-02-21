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
    Modal
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";
import { formatDate } from "../../utils/date";

export default function AcademicYearScreen() {
    const _router = useRouter();
    const { colors } = useTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("years"); // "years" | "reports"
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: "",
        startDate: "",
        endDate: "",
        isActive: false
    });
    const [selectedYearId, setSelectedYearId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch User Role
    const { data: userData } = useApiQuery(
        ['currentUser'],
        `${apiConfig.baseUrl}/auth/me`,
        { select: (data) => data.user }
    );
    const userRole = userData?.role;

    // Fetch Academic Years
    const { data: years = [], isLoading: loadingYears, refetch: refetchYears } = useApiQuery(
        ['academicYears'],
        `${apiConfig.baseUrl}/academic-year`
    );

    // Fetch Reports
    const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = useApiQuery(
        ['academicYearReport', selectedYearId],
        `${apiConfig.baseUrl}/academic-year/${selectedYearId}/reports`,
        {
            enabled: !!selectedYearId && activeTab === "reports",
        }
    );

    // Set default selected year
    useEffect(() => {
        if (years.length > 0 && !selectedYearId) {
            setSelectedYearId(years[0]._id);
        }
    }, [years, selectedYearId]);

    // Mutations
    const createYearMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/academic-year`, 'POST'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academicYears'] });
            showToast("Academic Year created", "success");
            setShowModal(false);
            setForm({ name: "", startDate: "", endDate: "", isActive: false });
        },
        onError: (error) => showToast(error.message || "Failed to create", "error")
    });

    const incrementYearMutation = useApiMutation({
        mutationFn: (nextYearId) => createApiMutationFn(`${apiConfig.baseUrl}/academic-year/increment`, 'POST')({ nextYearId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academicYears'] });
            showToast("Year Incremented & Students Promoted!", "success");
        },
        onError: (error) => showToast(error.message || "Failed to increment year", "error")
    });

    const handleCreate = () => {
        if (!form.name || !form.startDate || !form.endDate) {
            showToast("Please fill all fields", "error");
            return;
        }

        // Validate format YYYY-YYYY
        if (!/^\d{4}-\d{4}$/.test(form.name)) {
            showToast("Name must be in YYYY-YYYY format", "error");
            return;
        }

        createYearMutation.mutate(form);
    };

    const handleIncrement = (id, name) => {
        Alert.alert(
            "Activate & Promote",
            `WARNING: This will activate ${name}, promote all eligible students to the next class, and create history records for the current year. This action cannot be easily undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Proceed",
                    style: "destructive",
                    onPress: () => incrementYearMutation.mutate(id),
                },
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchYears(), refetchReport()]);
        setRefreshing(false);
    };

    const renderYearsTab = () => (
        <View style={{ marginTop: 16 }}>
            {years.map((year) => (
                <View
                    key={year._id}
                    style={{
                        backgroundColor: colors.surfaceContainerLow,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 12,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderWidth: year.isActive ? 2 : 1,
                        borderColor: year.isActive ? colors.primary : colors.outlineVariant
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                            {year.name}
                        </Text>
                        <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.onSurfaceVariant, marginTop: 4 }}>
                            {formatDate(year.startDate)} - {formatDate(year.endDate)}
                        </Text>
                        {year.isActive && (
                            <View style={{ backgroundColor: colors.primary + "20", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 8 }}>
                                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "DMSans-Bold" }}>ACTIVE</Text>
                            </View>
                        )}
                    </View>

                    {!year.isActive && userRole === 'super admin' && (
                        <Pressable
                            onPress={() => handleIncrement(year._id, year.name)}
                            disabled={incrementYearMutation.isPending}
                            style={({ pressed }) => ({
                                backgroundColor: pressed ? colors.primaryContainer : 'transparent',
                                borderWidth: 1,
                                borderColor: colors.primary,
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 10,
                                opacity: incrementYearMutation.isPending ? 0.6 : 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6
                            })}
                        >
                            {incrementYearMutation.isPending ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <MaterialIcons name="sync" size={16} color={colors.primary} />
                            )}
                            <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold", fontSize: 13 }}>
                                {incrementYearMutation.isPending ? 'Processing...' : 'Activate & Promote'}
                            </Text>
                        </Pressable>
                    )}
                </View>
            ))}
        </View>
    );

    const renderReportsTab = () => (
        <View style={{ marginTop: 16 }}>
            <View style={{
                backgroundColor: colors.surfaceContainerHigh,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.outlineVariant
            }}>
                <Picker
                    selectedValue={selectedYearId}
                    onValueChange={(itemValue) => setSelectedYearId(itemValue)}
                    style={{ color: colors.onSurface }}
                    dropdownIconColor={colors.onSurfaceVariant}
                >
                    {years.map((year) => (
                        <Picker.Item key={year._id} label={year.name} value={year._id} />
                    ))}
                </Picker>
            </View>

            {reportLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : reportData ? (
                <View>
                    {/* Student Summary */}
                    <View style={localStyles.card(colors)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <MaterialIcons name="people" size={20} color={colors.primary} />
                            <Text style={localStyles.cardTitle(colors)}>Student Distribution</Text>
                        </View>
                        {Object.entries(reportData.classWiseStudents || {}).map(([className, students]) => (
                            <View key={className} style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.outlineVariant + '40'
                            }}>
                                <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium", fontSize: 14 }}>{className}</Text>
                                <View style={{ backgroundColor: colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 }}>
                                    <Text style={{ color: colors.onPrimaryContainer, fontFamily: "DMSans-Bold", fontSize: 14 }}>{students.length}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Teacher Leaves */}
                    <View style={localStyles.card(colors)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <MaterialIcons name="event-busy" size={20} color={colors.error} />
                            <Text style={localStyles.cardTitle(colors)}>Teacher Leaves</Text>
                        </View>
                        {reportData.teacherLeaves && reportData.teacherLeaves.length > 0 ? (
                            reportData.teacherLeaves.map((leave, index) => (
                                <View key={index} style={{
                                    marginBottom: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.outlineVariant + '40',
                                    paddingBottom: 10
                                }}>
                                    <Text style={{ color: colors.onSurface, fontFamily: "DMSans-Bold", fontSize: 14 }}>{leave.applicant?.name}</Text>
                                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Regular", fontSize: 12, marginTop: 2 }}>
                                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)} ({leave.leaveType})
                                    </Text>
                                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Regular", fontSize: 12 }}>Reason: {leave.reason}</Text>
                                </View>
                            ))
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                                <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>No leaves recorded.</Text>
                            </View>
                        )}
                    </View>

                    {/* Teacher Attendance Summary */}
                    <View style={localStyles.card(colors)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <MaterialIcons name="fact-check" size={20} color={colors.secondary} />
                            <Text style={localStyles.cardTitle(colors)}>Teacher Attendance Stats</Text>
                        </View>
                        {reportData.teacherAttendance && reportData.teacherAttendance.length > 0 ? (
                            reportData.teacherAttendance.map((record, index) => (
                                <View key={index} style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: 'center',
                                    paddingVertical: 6
                                }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium", fontSize: 14 }}>
                                            {record.user}
                                        </Text>
                                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Regular", fontSize: 12, opacity: 0.7 }}>
                                            {record.status}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: colors.secondaryContainer, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                                        <Text style={{ color: colors.onSecondaryContainer, fontFamily: "DMSans-Bold", fontSize: 13 }}>{record.count} days</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                                <MaterialIcons name="info-outline" size={16} color={colors.onSurfaceVariant} />
                                <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>No attendance data.</Text>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <MaterialIcons name="bar-chart" size={48} color={colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium", marginTop: 12 }}>Select a year to view reports</Text>
                </View>
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
                    <View style={{
                        flexDirection: "row",
                        marginTop: 16,
                        backgroundColor: colors.surfaceContainerHigh,
                        borderRadius: 100,
                        padding: 4,
                        height: 48
                    }}>
                        <Pressable
                            onPress={() => setActiveTab("years")}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 100,
                                backgroundColor: activeTab === "years" ? colors.primary : "transparent"
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialIcons name="date-range" size={16} color={activeTab === "years" ? "#fff" : colors.onSurfaceVariant} />
                                <Text style={{ color: activeTab === "years" ? "#fff" : colors.onSurfaceVariant, fontFamily: "DMSans-Bold", fontSize: 14 }}>Management</Text>
                            </View>
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab("reports")}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 100,
                                backgroundColor: activeTab === "reports" ? colors.primary : "transparent"
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialIcons name="assessment" size={16} color={activeTab === "reports" ? "#fff" : colors.onSurfaceVariant} />
                                <Text style={{ color: activeTab === "reports" ? "#fff" : colors.onSurfaceVariant, fontFamily: "DMSans-Bold", fontSize: 14 }}>Reports</Text>
                            </View>
                        </Pressable>
                    </View>

                    {activeTab === "years" ? renderYearsTab() : renderReportsTab()}
                </View>
            </ScrollView>

            {activeTab === "years" && (
                <Pressable
                    onPress={() => setShowModal(true)}
                    style={({ pressed }) => ({
                        position: "absolute",
                        bottom: 130,
                        right: 24,
                        backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        justifyContent: "center",
                        alignItems: "center",
                        elevation: 6,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4
                    })}
                >
                    <MaterialIcons name="add" size={28} color="#fff" />
                </Pressable>
            )}

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                    <View style={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 20, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 20 }}>
                            New Academic Year
                        </Text>

                        <TextInput
                            placeholder="Name (e.g. 2025-2026)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            style={{
                                backgroundColor: colors.surfaceContainerHighest,
                                padding: 14,
                                borderRadius: 12,
                                color: colors.onSurface,
                                fontFamily: "DMSans-Medium",
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: colors.outlineVariant
                            }}
                            value={form.name}
                            onChangeText={(t) => setForm({ ...form, name: t })}
                        />

                        <TextInput
                            placeholder="Start Date (DD-MM-YYYY)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            style={{
                                backgroundColor: colors.surfaceContainerHighest,
                                padding: 14,
                                borderRadius: 12,
                                color: colors.onSurface,
                                fontFamily: "DMSans-Medium",
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: colors.outlineVariant
                            }}
                            value={form.startDate}
                            onChangeText={(t) => setForm({ ...form, startDate: t })}
                        />

                        <TextInput
                            placeholder="End Date (DD-MM-YYYY)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            style={{
                                backgroundColor: colors.surfaceContainerHighest,
                                padding: 14,
                                borderRadius: 12,
                                color: colors.onSurface,
                                fontFamily: "DMSans-Medium",
                                marginBottom: 24,
                                borderWidth: 1,
                                borderColor: colors.outlineVariant
                            }}
                            value={form.endDate}
                            onChangeText={(t) => setForm({ ...form, endDate: t })}
                        />

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                            <Pressable
                                onPress={() => setShowModal(false)}
                                style={({ pressed }) => ({
                                    padding: 12,
                                    borderRadius: 10,
                                    backgroundColor: pressed ? colors.surfaceContainerHigh : 'transparent'
                                })}
                            >
                                <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Bold" }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCreate}
                                disabled={createYearMutation.isPending}
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                                    paddingHorizontal: 24,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    opacity: createYearMutation.isPending ? 0.7 : 1,
                                    minWidth: 80,
                                    alignItems: 'center'
                                })}
                            >
                                {createYearMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ color: "#fff", fontFamily: "DMSans-Bold" }}>Create</Text>
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
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.outlineVariant + '30',
    }),
    cardTitle: (colors) => ({
        fontSize: 16,
        fontFamily: "DMSans-Bold",
        color: colors.onSurface,
        flex: 1
    })
};
