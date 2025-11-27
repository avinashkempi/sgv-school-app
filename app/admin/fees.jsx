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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";

export default function AdminFeesScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, collect, structure
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({
        collectedToday: 0,
        collectedThisMonth: 0,
        totalCollected: 0
    });

    // Collect Fees State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [feeDetails, setFeeDetails] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [bookNumber, setBookNumber] = useState("");
    const [manualReceiptNumber, setManualReceiptNumber] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [remarks, setRemarks] = useState("");
    const [processingPayment, setProcessingPayment] = useState(false);

    // Fee Structure State
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedYearId, setSelectedYearId] = useState(null);
    const [structureComponents, setStructureComponents] = useState([]);
    const [newComponent, setNewComponent] = useState({ name: "", amount: "" });
    const [savingStructure, setSavingStructure] = useState(false);

    useEffect(() => {
        loadAnalytics();
        loadClassesAndYears();
    }, []);

    const loadAnalytics = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/fees/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadClassesAndYears = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/classes/admin/init`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setClasses(data.classes);
                setAcademicYears(data.academicYears);
                if (data.academicYears.length > 0) {
                    setSelectedYearId(data.academicYears[0]._id);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const searchStudent = async () => {
        if (!searchQuery.trim()) return;
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/users/search?query=${searchQuery}&role=student`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error(error);
            showToast("Error searching student", "error");
        }
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setSearchResults([]);
        setSearchQuery("");

        // Fetch fee details
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/fees/student/${student._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFeeDetails(data);
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading fee details", "error");
        }
    };

    const handlePayment = async () => {
        if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
            showToast("Invalid amount", "error");
            return;
        }

        try {
            setProcessingPayment(true);
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/fees/payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: selectedStudent._id,
                    amount: Number(paymentAmount),
                    bookNumber,
                    manualReceiptNumber,
                    paymentMethod,
                    remarks
                })
            });

            if (response.ok) {
                showToast("Payment recorded successfully", "success");
                setSelectedStudent(null);
                setFeeDetails(null);
                setFeeDetails(null);
                setPaymentAmount("");
                setBookNumber("");
                setManualReceiptNumber("");
                setRemarks("");
                loadAnalytics(); // Refresh stats
            } else {
                const errorData = await response.json();
                showToast(errorData.message || "Payment failed", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error processing payment", "error");
        } finally {
            setProcessingPayment(false);
        }
    };

    const loadFeeStructure = async (classId) => {
        setSelectedClassId(classId);
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/fees/structure/class/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStructureComponents(data.components || []);
            } else {
                setStructureComponents([]);
            }
        } catch (error) {
            console.error(error);
            setStructureComponents([]);
        }
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

    const saveStructure = async () => {
        if (!selectedClassId || !selectedYearId) {
            showToast("Select class and academic year", "error");
            return;
        }
        if (structureComponents.length === 0) {
            showToast("Add at least one fee component", "error");
            return;
        }

        try {
            setSavingStructure(true);
            const token = await AsyncStorage.getItem("@auth_token");
            const response = await apiFetch(`${apiConfig.baseUrl}/fees/structure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    classId: selectedClassId,
                    academicYearId: selectedYearId,
                    components: structureComponents,
                    paymentSchedule: [] // Can be added later
                })
            });

            if (response.ok) {
                showToast("Fee structure saved", "success");
            } else {
                showToast("Failed to save structure", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error saving structure", "error");
        } finally {
            setSavingStructure(false);
        }
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

            {/* Tabs */}
            <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 16 }}>
                {['dashboard', 'collect', 'structure'].map(tab => (
                    <Pressable
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            alignItems: "center",
                            borderBottomWidth: 2,
                            borderBottomColor: activeTab === tab ? colors.primary : "transparent"
                        }}
                    >
                        <Text style={{
                            color: activeTab === tab ? colors.primary : colors.textSecondary,
                            fontFamily: activeTab === tab ? "DMSans-Bold" : "DMSans-Medium",
                            textTransform: "capitalize"
                        }}>
                            {tab}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {activeTab === 'dashboard' && (
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
                            <View style={{ flex: 1, backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Collected Today</Text>
                                <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.success, marginTop: 4 }}>
                                    ₹{analytics.collectedToday.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>This Month</Text>
                                <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.primary, marginTop: 4 }}>
                                    ₹{analytics.collectedThisMonth.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <View style={{ backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Total Collected (All Time)</Text>
                            <Text style={{ fontSize: 32, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 4 }}>
                                ₹{analytics.totalCollected.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}

                {activeTab === 'collect' && (
                    <View style={{ padding: 16 }}>
                        {!selectedStudent ? (
                            <>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Search Student</Text>
                                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Name or Phone..."
                                        placeholderTextColor={colors.textSecondary}
                                        style={{
                                            flex: 1,
                                            backgroundColor: colors.cardBackground,
                                            padding: 12,
                                            borderRadius: 10,
                                            color: colors.textPrimary
                                        }}
                                    />
                                    <Pressable
                                        onPress={searchStudent}
                                        style={{
                                            backgroundColor: colors.primary,
                                            padding: 12,
                                            borderRadius: 10,
                                            justifyContent: "center"
                                        }}
                                    >
                                        <MaterialIcons name="search" size={24} color="#fff" />
                                    </Pressable>
                                </View>

                                {searchResults.map(student => (
                                    <Pressable
                                        key={student._id}
                                        onPress={() => selectStudent(student)}
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            padding: 16,
                                            borderRadius: 12,
                                            marginBottom: 8,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between"
                                        }}
                                    >
                                        <View>
                                            <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{student.name}</Text>
                                            <Text style={{ color: colors.textSecondary }}>{student.phone}</Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                    </Pressable>
                                ))}
                            </>
                        ) : (
                            <View>
                                <Pressable onPress={() => setSelectedStudent(null)} style={{ marginBottom: 16 }}>
                                    <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>← Back to Search</Text>
                                </Pressable>

                                <View style={{ backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, marginBottom: 24 }}>
                                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>{selectedStudent.name}</Text>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>Class: {feeDetails?.feeStructure ? "Assigned" : "Not Assigned"}</Text>

                                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                        <Text style={{ color: colors.textSecondary }}>Total Fees</Text>
                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary }}>₹{feeDetails?.totalFees || 0}</Text>
                                    </View>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                        <Text style={{ color: colors.textSecondary }}>Paid</Text>
                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.success }}>₹{feeDetails?.paidAmount || 0}</Text>
                                    </View>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.textSecondary + "20", paddingTop: 8 }}>
                                        <Text style={{ color: colors.textSecondary }}>Pending</Text>
                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.error }}>₹{feeDetails?.pendingAmount || 0}</Text>
                                    </View>
                                </View>

                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>Record Payment</Text>

                                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Book No.</Text>
                                        <TextInput
                                            value={bookNumber}
                                            onChangeText={setBookNumber}
                                            placeholder="Optional"
                                            placeholderTextColor={colors.textSecondary}
                                            style={{
                                                backgroundColor: colors.cardBackground,
                                                padding: 12,
                                                borderRadius: 10,
                                                color: colors.textPrimary
                                            }}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Receipt No.</Text>
                                        <TextInput
                                            value={manualReceiptNumber}
                                            onChangeText={setManualReceiptNumber}
                                            placeholder="Optional"
                                            placeholderTextColor={colors.textSecondary}
                                            style={{
                                                backgroundColor: colors.cardBackground,
                                                padding: 12,
                                                borderRadius: 10,
                                                color: colors.textPrimary
                                            }}
                                        />
                                    </View>
                                </View>

                                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Amount</Text>
                                <TextInput
                                    value={paymentAmount}
                                    onChangeText={setPaymentAmount}
                                    keyboardType="numeric"
                                    placeholder="Enter amount"
                                    placeholderTextColor={colors.textSecondary}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        padding: 12,
                                        borderRadius: 10,
                                        color: colors.textPrimary,
                                        marginBottom: 16
                                    }}
                                />

                                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Payment Method</Text>
                                <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                                    {['cash', 'online', 'cheque', 'card'].map(method => (
                                        <Pressable
                                            key={method}
                                            onPress={() => setPaymentMethod(method)}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                backgroundColor: paymentMethod === method ? colors.primary : colors.cardBackground,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: paymentMethod === method ? colors.primary : colors.textSecondary + "20"
                                            }}
                                        >
                                            <Text style={{ color: paymentMethod === method ? "#fff" : colors.textPrimary, textTransform: "capitalize" }}>
                                                {method}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Remarks (Optional)</Text>
                                <TextInput
                                    value={remarks}
                                    onChangeText={setRemarks}
                                    placeholder="e.g. Term 1 Fee"
                                    placeholderTextColor={colors.textSecondary}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        padding: 12,
                                        borderRadius: 10,
                                        color: colors.textPrimary,
                                        marginBottom: 24
                                    }}
                                />

                                <Pressable
                                    onPress={handlePayment}
                                    disabled={processingPayment}
                                    style={{
                                        backgroundColor: colors.primary,
                                        padding: 16,
                                        borderRadius: 12,
                                        alignItems: "center",
                                        opacity: processingPayment ? 0.7 : 1
                                    }}
                                >
                                    {processingPayment ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>Record Payment</Text>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'structure' && (
                    <View style={{ padding: 16 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Select Class</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {classes.map(cls => (
                                    <Pressable
                                        key={cls._id}
                                        onPress={() => loadFeeStructure(cls._id)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            backgroundColor: selectedClassId === cls._id ? colors.primary : colors.cardBackground,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: selectedClassId === cls._id ? colors.primary : colors.textSecondary + "20"
                                        }}
                                    >
                                        <Text style={{ color: selectedClassId === cls._id ? "#fff" : colors.textPrimary }}>
                                            {cls.name} {cls.section}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>

                        {selectedClassId && (
                            <View>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>Fee Components</Text>

                                {structureComponents.map((comp, index) => (
                                    <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, backgroundColor: colors.cardBackground, padding: 12, borderRadius: 10 }}>
                                        <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>{comp.name}</Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                            <Text style={{ color: colors.textPrimary }}>₹{comp.amount}</Text>
                                            <Pressable onPress={() => removeComponent(index)}>
                                                <MaterialIcons name="close" size={20} color={colors.error} />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}

                                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                                    <TextInput
                                        value={newComponent.name}
                                        onChangeText={(t) => setNewComponent({ ...newComponent, name: t })}
                                        placeholder="Name (e.g. Tuition)"
                                        placeholderTextColor={colors.textSecondary}
                                        style={{ flex: 2, backgroundColor: colors.cardBackground, padding: 12, borderRadius: 10, color: colors.textPrimary }}
                                    />
                                    <TextInput
                                        value={newComponent.amount}
                                        onChangeText={(t) => setNewComponent({ ...newComponent, amount: t })}
                                        placeholder="Amount"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textSecondary}
                                        style={{ flex: 1, backgroundColor: colors.cardBackground, padding: 12, borderRadius: 10, color: colors.textPrimary }}
                                    />
                                    <Pressable onPress={addComponent} style={{ backgroundColor: colors.secondary, padding: 12, borderRadius: 10, justifyContent: "center" }}>
                                        <MaterialIcons name="add" size={24} color="#fff" />
                                    </Pressable>
                                </View>

                                <Pressable
                                    onPress={saveStructure}
                                    disabled={savingStructure}
                                    style={{
                                        backgroundColor: colors.primary,
                                        padding: 16,
                                        borderRadius: 12,
                                        alignItems: "center",
                                        marginTop: 32,
                                        opacity: savingStructure ? 0.7 : 1
                                    }}
                                >
                                    {savingStructure ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={{ color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 }}>Save Structure</Text>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
