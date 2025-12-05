import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    TextInput,
    FlatList
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../../utils/storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiFetch from "../../utils/apiFetch";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function AdminFeesScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, collect, structure, students
    const queryClient = useQueryClient();


    // Collect Fees State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [bookNumber, setBookNumber] = useState("");
    const [manualReceiptNumber, setManualReceiptNumber] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [remarks, setRemarks] = useState("");

    // Fee Structure State
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [selectedYearId, setSelectedYearId] = useState(null);
    const [newComponent, setNewComponent] = useState({ name: "", amount: "" });

    // Specific Student Fee State
    const [structureType, setStructureType] = useState('class_default'); // 'class_default', 'student_specific'
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [studentSearchResults, setStudentSearchResults] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Fetch Analytics
    const { data: analytics = { collectedToday: 0, collectedThisMonth: 0, totalCollected: 0 }, isLoading: analyticsLoading } = useApiQuery(
        ['feeAnalytics'],
        `${apiConfig.baseUrl}/fees/analytics`
    );

    // Fetch Classes and Years
    const { data: initData, isLoading: initLoading } = useApiQuery(
        ['adminClassesInit'],
        `${apiConfig.baseUrl}/classes/admin/init`
    );
    const classes = initData?.classes || [];
    const academicYears = initData?.academicYears || [];

    useEffect(() => {
        if (academicYears.length > 0 && !selectedYearId) {
            setSelectedYearId(academicYears[0]._id);
        }
    }, [academicYears, selectedYearId]);

    // Fetch All Students
    const { data: allStudentsResponse, isLoading: studentsLoading } = useApiQuery(
        ['allStudents'],
        `${apiConfig.baseUrl}/users?role=student&limit=100`,
        { enabled: activeTab === 'students' }
    );
    const allStudents = allStudentsResponse?.data || [];

    // Fetch Fee Details for Selected Student
    const { data: feeDetails, refetch: refetchFeeDetails } = useApiQuery(
        ['feeDetails', selectedStudent?._id],
        `${apiConfig.baseUrl}/fees/student/${selectedStudent?._id}`,
        { enabled: !!selectedStudent }
    );

    // Fetch Fee Structure for Selected Class
    const { data: structureData } = useApiQuery(
        ['feeStructure', selectedClassId],
        `${apiConfig.baseUrl}/fees/structure/class/${selectedClassId}`,
        { enabled: !!selectedClassId }
    );
    const [structureComponents, setStructureComponents] = useState([]);

    useEffect(() => {
        if (structureData?.components) {
            setStructureComponents(structureData.components);
        } else {
            setStructureComponents([]);
        }
    }, [structureData]);

    const loading = analyticsLoading || initLoading;

    // Mutations
    const paymentMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/fees/payment`, 'POST'),
        onSuccess: () => {
            showToast("Payment recorded successfully", "success");
            setSelectedStudent(null);
            setPaymentAmount("");
            setBookNumber("");
            setManualReceiptNumber("");
            setRemarks("");
            queryClient.invalidateQueries({ queryKey: ['feeAnalytics'] });
            queryClient.invalidateQueries({ queryKey: ['feeDetails'] });
        },
        onError: (error) => showToast(error.message || "Payment failed", "error")
    });

    const saveStructureMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/fees/structure`, 'POST'),
        onSuccess: () => {
            showToast("Fee structure saved", "success");
            queryClient.invalidateQueries({ queryKey: ['feeStructure'] });
        },
        onError: (error) => showToast(error.message || "Failed to save structure", "error")
    });



    const searchStudent = async (query, setResults, classId = null) => {
        if (!query.trim()) return;
        try {
            const token = await storage.getItem("@auth_token");
            let url = `${apiConfig.baseUrl}/users/search?query=${query}&role=student`;
            if (classId) {
                url += `&classId=${classId}`;
            }
            const response = await apiFetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setResults(data);
            }
        } catch (error) {
            console.error(error);
            showToast("Error searching student", "error");
        }
    };

    const selectStudent = (student) => {
        setSelectedStudent(student);
        setSearchResults([]);
        setSearchQuery("");
    };

    const handlePayment = () => {
        if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
            showToast("Invalid amount", "error");
            return;
        }

        paymentMutation.mutate({
            studentId: selectedStudent._id,
            amount: Number(paymentAmount),
            bookNumber,
            manualReceiptNumber,
            paymentMethod,
            remarks
        });
    };



    const addComponent = () => {
        if (!newComponent.name || !newComponent.amount) {
            showToast("Please fill name and amount", "error");
            return;
        }
        setStructureComponents([...structureComponents, { ...newComponent, amount: Number(newComponent.amount) }]);
        setNewComponent({ name: "", amount: "" });
    };

    const removeComponent = (index) => {
        const updated = [...structureComponents];
        updated.splice(index, 1);
        setStructureComponents(updated);
    };

    const saveStructure = () => {
        if (!selectedClassId || !selectedYearId) {
            showToast("Select class and academic year", "error");
            return;
        }
        if (structureComponents.length === 0) {
            showToast("Add at least one fee component", "error");
            return;
        }
        if (structureType === 'student_specific' && selectedStudents.length === 0) {
            showToast("Select at least one student", "error");
            return;
        }

        saveStructureMutation.mutate({
            classId: selectedClassId,
            academicYearId: selectedYearId,
            components: structureComponents,
            paymentSchedule: [], // Can be added later
            type: structureType,
            students: structureType === 'student_specific' ? selectedStudents.map(s => s._id) : []
        });
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
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="Fees Management" subtitle="Track and collect fees" showBack />
            </View>

            {/* Tabs - Segmented Control */}
            <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                <View style={{
                    flexDirection: "row",
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 4
                }}>
                    {['dashboard', 'collect', 'structure', 'students'].map(tab => (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: activeTab === tab ? colors.background : "transparent",
                                borderRadius: 12,
                                shadowColor: activeTab === tab ? "#000" : "transparent",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: activeTab === tab ? 0.1 : 0,
                                shadowRadius: 4,
                                elevation: activeTab === tab ? 2 : 0
                            }}
                        >
                            <Text style={{
                                color: activeTab === tab ? colors.primary : colors.textSecondary,
                                fontFamily: activeTab === tab ? "DMSans-Bold" : "DMSans-Medium",
                                textTransform: "capitalize",
                                fontSize: 13
                            }}>
                                {tab}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {activeTab === 'dashboard' && (
                    <View style={{ padding: 16 }}>
                        {/* Hero Card */}
                        <View style={{
                            backgroundColor: colors.primary,
                            borderRadius: 24,
                            padding: 24,
                            marginBottom: 20,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 16,
                            elevation: 8
                        }}>
                            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "DMSans-Medium", marginBottom: 8 }}>Total Collected (All Time)</Text>
                            <Text style={{ fontSize: 36, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                ₹{analytics.totalCollected.toLocaleString()}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                                <MaterialIcons name="trending-up" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 12 }}>Updated just now</Text>
                            </View>
                        </View>

                        {/* Stats Grid */}
                        <View style={{ flexDirection: "row", gap: 16 }}>
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.cardBackground,
                                padding: 20,
                                borderRadius: 20,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2
                            }}>
                                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.success + "15", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                                    <MaterialIcons name="today" size={20} color={colors.success} />
                                </View>
                                <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans-Medium" }}>Collected Today</Text>
                                <Text style={{ fontSize: 22, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 4 }}>
                                    ₹{analytics.collectedToday.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.cardBackground,
                                padding: 20,
                                borderRadius: 20,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2
                            }}>
                                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.secondary + "15", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                                    <MaterialIcons name="calendar-today" size={20} color={colors.secondary} />
                                </View>
                                <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans-Medium" }}>This Month</Text>
                                <Text style={{ fontSize: 22, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 4 }}>
                                    ₹{analytics.collectedThisMonth.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {activeTab === 'collect' && (
                    <View style={{ padding: 16 }}>
                        {!selectedStudent ? (
                            <View style={{ marginTop: 20 }}>
                                <View style={{ alignItems: "center", marginBottom: 32 }}>
                                    <View style={{ width: 64, height: 64, backgroundColor: colors.primary + "15", borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                                        <MaterialIcons name="person-search" size={32} color={colors.primary} />
                                    </View>
                                    <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 8 }}>Find Student</Text>
                                    <Text style={{ color: colors.textSecondary, textAlign: "center", maxWidth: "80%" }}>
                                        Search by name or phone number to collect fees
                                    </Text>
                                </View>

                                <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Enter student name..."
                                        placeholderTextColor={colors.textSecondary}
                                        style={{
                                            flex: 1,
                                            backgroundColor: colors.cardBackground,
                                            padding: 16,
                                            borderRadius: 16,
                                            color: colors.textPrimary,
                                            fontSize: 16,
                                            fontFamily: "DMSans-Medium",
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 8,
                                            elevation: 2
                                        }}
                                    />
                                    <Pressable
                                        onPress={() => searchStudent(searchQuery, setSearchResults)}
                                        style={{
                                            backgroundColor: colors.primary,
                                            width: 56,
                                            borderRadius: 16,
                                            justifyContent: "center",
                                            alignItems: "center",
                                            shadowColor: colors.primary,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                            elevation: 4
                                        }}
                                    >
                                        <MaterialIcons name="search" size={28} color="#fff" />
                                    </Pressable>
                                </View>

                                {searchResults.length > 0 && (
                                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 20, padding: 8 }}>
                                        {searchResults.map((student, index) => (
                                            <Pressable
                                                key={student._id}
                                                onPress={() => selectStudent(student)}
                                                style={{
                                                    padding: 16,
                                                    borderRadius: 12,
                                                    marginBottom: index === searchResults.length - 1 ? 0 : 8,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    backgroundColor: colors.background
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "10", justifyContent: "center", alignItems: "center" }}>
                                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 16 }}>
                                                            {student.name.charAt(0)}
                                                        </Text>
                                                    </View>
                                                    <View>
                                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 16 }}>{student.name}</Text>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{student.phone}</Text>
                                                    </View>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View>
                                <Pressable
                                    onPress={() => setSelectedStudent(null)}
                                    style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, alignSelf: "flex-start" }}
                                >
                                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.cardBackground, justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                                        <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
                                    </View>
                                    <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Back to Search</Text>
                                </Pressable>

                                {/* Student Profile Card */}
                                <View style={{
                                    backgroundColor: colors.cardBackground,
                                    padding: 24,
                                    borderRadius: 24,
                                    marginBottom: 24,
                                    alignItems: "center"
                                }}>
                                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                                        <Text style={{ fontSize: 32, fontFamily: "DMSans-Bold", color: colors.primary }}>{selectedStudent.name.charAt(0)}</Text>
                                    </View>
                                    <Text style={{ fontSize: 22, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>{selectedStudent.name}</Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
                                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.background, borderRadius: 8, marginRight: 8 }}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans-Medium" }}>
                                                {feeDetails?.feeStructure ? "Fee Structure Assigned" : "No Structure"}
                                            </Text>
                                        </View>
                                        <Text style={{ color: colors.textSecondary }}>• {selectedStudent.phone}</Text>
                                    </View>

                                    <View style={{ flexDirection: "row", width: "100%", gap: 12 }}>
                                        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, borderRadius: 16, alignItems: "center" }}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Total Fees</Text>
                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 18 }}>₹{feeDetails?.totalFees || 0}</Text>
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: colors.success + "10", padding: 16, borderRadius: 16, alignItems: "center" }}>
                                            <Text style={{ color: colors.success, fontSize: 12, marginBottom: 4 }}>Paid</Text>
                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.success, fontSize: 18 }}>₹{feeDetails?.paidAmount || 0}</Text>
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: colors.error + "10", padding: 16, borderRadius: 16, alignItems: "center" }}>
                                            <Text style={{ color: colors.error, fontSize: 12, marginBottom: 4 }}>Pending</Text>
                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.error, fontSize: 18 }}>₹{feeDetails?.pendingAmount || 0}</Text>
                                        </View>
                                    </View>
                                </View>

                                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>Record New Payment</Text>

                                <View style={{ backgroundColor: colors.cardBackground, padding: 20, borderRadius: 24 }}>
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Amount</Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 16, paddingHorizontal: 16 }}>
                                            <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginRight: 8 }}>₹</Text>
                                            <TextInput
                                                value={paymentAmount}
                                                onChangeText={setPaymentAmount}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={colors.textSecondary}
                                                style={{
                                                    flex: 1,
                                                    paddingVertical: 16,
                                                    fontSize: 20,
                                                    fontFamily: "DMSans-Bold",
                                                    color: colors.textPrimary
                                                }}
                                            />
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Receipt No.</Text>
                                            <TextInput
                                                value={manualReceiptNumber}
                                                onChangeText={setManualReceiptNumber}
                                                placeholder="Optional"
                                                placeholderTextColor={colors.textSecondary}
                                                style={{
                                                    backgroundColor: colors.background,
                                                    padding: 14,
                                                    borderRadius: 12,
                                                    color: colors.textPrimary,
                                                    fontFamily: "DMSans-Medium"
                                                }}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Book No.</Text>
                                            <TextInput
                                                value={bookNumber}
                                                onChangeText={setBookNumber}
                                                placeholder="Optional"
                                                placeholderTextColor={colors.textSecondary}
                                                style={{
                                                    backgroundColor: colors.background,
                                                    padding: 14,
                                                    borderRadius: 12,
                                                    color: colors.textPrimary,
                                                    fontFamily: "DMSans-Medium"
                                                }}
                                            />
                                        </View>
                                    </View>

                                    <View style={{ marginBottom: 24 }}>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 12, fontFamily: "DMSans-Medium" }}>Payment Method</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View style={{ flexDirection: "row", gap: 10 }}>
                                                {['cash', 'online', 'cheque', 'card'].map(method => (
                                                    <Pressable
                                                        key={method}
                                                        onPress={() => setPaymentMethod(method)}
                                                        style={{
                                                            paddingHorizontal: 16,
                                                            paddingVertical: 10,
                                                            backgroundColor: paymentMethod === method ? colors.primary : colors.background,
                                                            borderRadius: 12,
                                                            borderWidth: 1,
                                                            borderColor: paymentMethod === method ? colors.primary : colors.textSecondary + "10"
                                                        }}
                                                    >
                                                        <Text style={{
                                                            color: paymentMethod === method ? "#fff" : colors.textPrimary,
                                                            textTransform: "capitalize",
                                                            fontFamily: "DMSans-Medium"
                                                        }}>
                                                            {method}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    </View>

                                    <View style={{ marginBottom: 32 }}>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Remarks</Text>
                                        <TextInput
                                            value={remarks}
                                            onChangeText={setRemarks}
                                            placeholder="Add a note (optional)"
                                            placeholderTextColor={colors.textSecondary}
                                            style={{
                                                backgroundColor: colors.background,
                                                padding: 14,
                                                borderRadius: 12,
                                                color: colors.textPrimary,
                                                fontFamily: "DMSans-Medium"
                                            }}
                                        />
                                    </View>

                                    <Pressable
                                        onPress={handlePayment}
                                        disabled={paymentMutation.isPending}
                                        style={{
                                            backgroundColor: colors.primary,
                                            padding: 18,
                                            borderRadius: 16,
                                            alignItems: "center",
                                            shadowColor: colors.primary,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                            elevation: 4,
                                            opacity: paymentMutation.isPending ? 0.7 : 1
                                        }}
                                    >
                                        {paymentMutation.isPending ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={{ color: "#fff", fontSize: 18, fontFamily: "DMSans-Bold" }}>
                                                Pay ₹{paymentAmount || "0"}
                                            </Text>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {
                    activeTab === 'structure' && (
                        <View style={{ padding: 16 }}>
                            {/* 1. Context Header (Sticky-like) */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontFamily: "DMSans-Medium" }}>Select Class & Year</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        {classes.map(cls => (
                                            <Pressable
                                                key={cls._id}
                                                onPress={() => setSelectedClassId(cls._id)}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 8,
                                                    backgroundColor: selectedClassId === cls._id ? colors.primary : colors.cardBackground,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    borderColor: selectedClassId === cls._id ? colors.primary : colors.textSecondary + "20"
                                                }}
                                            >
                                                <Text style={{ color: selectedClassId === cls._id ? "#fff" : colors.textPrimary, fontFamily: "DMSans-Medium" }}>
                                                    {cls.name} {cls.section}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {selectedClassId ? (
                                <View>
                                    {/* 2. Target Selection (Segmented Control) */}
                                    <View style={{
                                        flexDirection: "row",
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 12,
                                        padding: 4,
                                        marginBottom: 24
                                    }}>
                                        <Pressable
                                            onPress={() => setStructureType('class_default')}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                alignItems: "center",
                                                backgroundColor: structureType === 'class_default' ? colors.background : "transparent",
                                                borderRadius: 10,
                                                shadowColor: structureType === 'class_default' ? "#000" : "transparent",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: structureType === 'class_default' ? 0.1 : 0,
                                                shadowRadius: 4,
                                                elevation: structureType === 'class_default' ? 2 : 0
                                            }}
                                        >
                                            <Text style={{
                                                color: structureType === 'class_default' ? colors.primary : colors.textSecondary,
                                                fontFamily: "DMSans-Bold"
                                            }}>Class Default</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => setStructureType('student_specific')}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                alignItems: "center",
                                                backgroundColor: structureType === 'student_specific' ? colors.background : "transparent",
                                                borderRadius: 10,
                                                shadowColor: structureType === 'student_specific' ? "#000" : "transparent",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: structureType === 'student_specific' ? 0.1 : 0,
                                                shadowRadius: 4,
                                                elevation: structureType === 'student_specific' ? 2 : 0
                                            }}
                                        >
                                            <Text style={{
                                                color: structureType === 'student_specific' ? colors.primary : colors.textSecondary,
                                                fontFamily: "DMSans-Bold"
                                            }}>Specific Student</Text>
                                        </Pressable>
                                    </View>

                                    {/* 3. Student Selection (Conditional) */}
                                    {structureType === 'student_specific' && (
                                        <View style={{ marginBottom: 24 }}>
                                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                                                <TextInput
                                                    value={studentSearchQuery}
                                                    onChangeText={setStudentSearchQuery}
                                                    placeholder="Search student..."
                                                    placeholderTextColor={colors.textSecondary}
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor: colors.cardBackground,
                                                        padding: 12,
                                                        borderRadius: 12,
                                                        color: colors.textPrimary,
                                                        fontFamily: "DMSans-Medium"
                                                    }}
                                                />
                                                <Pressable
                                                    onPress={() => searchStudent(studentSearchQuery, setStudentSearchResults, selectedClassId)}
                                                    style={{
                                                        backgroundColor: colors.primary,
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: 12,
                                                        justifyContent: "center",
                                                        alignItems: "center"
                                                    }}
                                                >
                                                    <MaterialIcons name="search" size={24} color="#fff" />
                                                </Pressable>
                                            </View>

                                            {/* Search Results */}
                                            {studentSearchResults.length > 0 && (
                                                <View style={{ maxHeight: 150, backgroundColor: colors.cardBackground, borderRadius: 12, marginBottom: 12, padding: 8 }}>
                                                    <ScrollView nestedScrollEnabled>
                                                        {studentSearchResults.map(student => (
                                                            <Pressable
                                                                key={student._id}
                                                                onPress={() => {
                                                                    if (!selectedStudents.find(s => s._id === student._id)) {
                                                                        setSelectedStudents([...selectedStudents, student]);
                                                                    }
                                                                    setStudentSearchResults([]);
                                                                    setStudentSearchQuery("");
                                                                }}
                                                                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + "10" }}
                                                            >
                                                                <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>{student.name}</Text>
                                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{student.phone}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}

                                            {/* Selected Students Chips */}
                                            {selectedStudents.length > 0 && (
                                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                                    {selectedStudents.map((student, index) => (
                                                        <View key={student._id} style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            backgroundColor: colors.primary + "15",
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 8,
                                                            borderRadius: 20,
                                                            borderWidth: 1,
                                                            borderColor: colors.primary + "30"
                                                        }}>
                                                            <Text style={{ color: colors.primary, marginRight: 6, fontFamily: "DMSans-Medium" }}>{student.name}</Text>
                                                            <Pressable onPress={() => {
                                                                const newSelected = [...selectedStudents];
                                                                newSelected.splice(index, 1);
                                                                setSelectedStudents(newSelected);
                                                            }}>
                                                                <MaterialIcons name="close" size={16} color={colors.primary} />
                                                            </Pressable>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* 4. Fee Components (The Core) */}
                                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 20, marginBottom: 24 }}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>Fee Breakdown</Text>
                                            <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                                <Text style={{ color: colors.success, fontFamily: "DMSans-Bold", fontSize: 12 }}>
                                                    {structureComponents.length} Items
                                                </Text>
                                            </View>
                                        </View>

                                        {structureComponents.length === 0 ? (
                                            <View style={{ alignItems: "center", paddingVertical: 20 }}>
                                                <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>No fee components added yet.</Text>
                                            </View>
                                        ) : (
                                            <View>
                                                {structureComponents.map((comp, index) => (
                                                    <View key={index} style={{
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        paddingVertical: 12,
                                                        borderBottomWidth: index === structureComponents.length - 1 ? 0 : 1,
                                                        borderBottomColor: colors.textSecondary + "10"
                                                    }}>
                                                        <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium", fontSize: 16 }}>{comp.name}</Text>
                                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                                            <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Bold", fontSize: 16 }}>₹{comp.amount}</Text>
                                                            <Pressable onPress={() => removeComponent(index)} hitSlop={10}>
                                                                <MaterialIcons name="remove-circle-outline" size={20} color={colors.error} />
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                ))}

                                                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.textSecondary + "20", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                                    <Text style={{ color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Total Amount</Text>
                                                    <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold", fontSize: 20 }}>
                                                        ₹{structureComponents.reduce((sum, item) => sum + Number(item.amount), 0)}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {/* 5. Adding Components (Action) */}
                                    <View style={{ marginBottom: 32 }}>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 12, fontFamily: "DMSans-Medium" }}>Add New Component</Text>
                                        <View style={{ flexDirection: "row", gap: 12 }}>
                                            <TextInput
                                                value={newComponent.name}
                                                onChangeText={(t) => setNewComponent({ ...newComponent, name: t })}
                                                placeholder="Name (e.g. Tuition)"
                                                placeholderTextColor={colors.textSecondary}
                                                style={{
                                                    flex: 2,
                                                    backgroundColor: colors.cardBackground,
                                                    padding: 16,
                                                    borderRadius: 12,
                                                    color: colors.textPrimary,
                                                    fontFamily: "DMSans-Medium"
                                                }}
                                            />
                                            <TextInput
                                                value={newComponent.amount}
                                                onChangeText={(t) => setNewComponent({ ...newComponent, amount: t })}
                                                placeholder="Amount"
                                                keyboardType="numeric"
                                                placeholderTextColor={colors.textSecondary}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: colors.cardBackground,
                                                    padding: 16,
                                                    borderRadius: 12,
                                                    color: colors.textPrimary,
                                                    fontFamily: "DMSans-Medium"
                                                }}
                                            />
                                            <Pressable
                                                onPress={addComponent}
                                                style={{
                                                    backgroundColor: colors.secondary,
                                                    width: 56,
                                                    borderRadius: 12,
                                                    justifyContent: "center",
                                                    alignItems: "center"
                                                }}
                                            >
                                                <MaterialIcons name="add" size={28} color="#fff" />
                                            </Pressable>
                                        </View>
                                    </View>

                                    {/* 6. Save Action */}
                                    <Pressable
                                        onPress={saveStructure}
                                        disabled={saveStructureMutation.isPending}
                                        style={{
                                            backgroundColor: colors.primary,
                                            padding: 18,
                                            borderRadius: 16,
                                            alignItems: "center",
                                            shadowColor: colors.primary,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                            elevation: 4,
                                            opacity: saveStructureMutation.isPending ? 0.7 : 1
                                        }}
                                    >
                                        {saveStructureMutation.isPending ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 18 }}>Save Fee Structure</Text>
                                        )}
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={{ alignItems: "center", marginTop: 40 }}>
                                    <MaterialIcons name="class" size={48} color={colors.textSecondary + "40"} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Medium" }}>Select a class to manage fees</Text>
                                </View>
                            )}
                        </View>
                    )
                }

                {
                    activeTab === 'students' && (
                        <View style={{ padding: 16 }}>
                            {/* Search Header */}
                            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                                <TextInput
                                    value={studentSearchQuery}
                                    onChangeText={setStudentSearchQuery}
                                    placeholder="Search students..."
                                    placeholderTextColor={colors.textSecondary}
                                    style={{
                                        flex: 1,
                                        backgroundColor: colors.cardBackground,
                                        padding: 12,
                                        borderRadius: 12,
                                        color: colors.textPrimary,
                                        fontFamily: "DMSans-Medium"
                                    }}
                                />
                                <View style={{
                                    backgroundColor: colors.primary,
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    justifyContent: "center",
                                    alignItems: "center"
                                }}>
                                    <MaterialIcons name="search" size={24} color="#fff" />
                                </View>
                            </View>

                            {studentsLoading ? (
                                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                            ) : (
                                <FlatList
                                    data={allStudents.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()))}
                                    scrollEnabled={false}
                                    keyExtractor={(item) => item._id}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            onPress={() => {
                                                setSelectedStudent(item);
                                                setActiveTab('collect');
                                            }}
                                            style={{
                                                backgroundColor: colors.cardBackground,
                                                padding: 16,
                                                borderRadius: 16,
                                                marginBottom: 12,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                shadowColor: "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.05,
                                                shadowRadius: 8,
                                                elevation: 2
                                            }}
                                        >
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + "10", justifyContent: "center", alignItems: "center" }}>
                                                    <Text style={{ fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 18 }}>
                                                        {item.name.charAt(0)}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 16 }}>{item.name}</Text>
                                                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.phone}</Text>
                                                </View>
                                            </View>
                                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                        </Pressable>
                                    )}
                                    ListEmptyComponent={() => (
                                        <View style={{ alignItems: "center", marginTop: 40 }}>
                                            <MaterialIcons name="person-off" size={48} color={colors.textSecondary + "40"} />
                                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: "DMSans-Medium" }}>No students found</Text>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    )
                }

            </ScrollView >
        </View >
    );
}
