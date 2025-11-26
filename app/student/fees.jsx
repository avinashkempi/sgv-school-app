import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
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

export default function StudentFeesScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [feeData, setFeeData] = useState(null);

    useEffect(() => {
        loadFees();
    }, []);

    const loadFees = async () => {
        try {
            const token = await AsyncStorage.getItem("@auth_token");
            const userStr = await AsyncStorage.getItem("@user");
            const user = JSON.parse(userStr);

            const response = await apiFetch(`${apiConfig.baseUrl}/fees/student/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setFeeData(data);
            } else {
                showToast("Failed to load fees", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error loading fees", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadFees();
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
                    <Header title="My Fees" subtitle="Payment Status & History" showBack />

                    {/* Summary Cards */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                        <View style={{ flex: 1, backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, alignItems: "center" }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Total Fees</Text>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                ₹{feeData?.totalFees?.toLocaleString() || 0}
                            </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, alignItems: "center" }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Paid</Text>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.success }}>
                                ₹{feeData?.paidAmount?.toLocaleString() || 0}
                            </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, alignItems: "center" }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Pending</Text>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.error }}>
                                ₹{feeData?.pendingAmount?.toLocaleString() || 0}
                            </Text>
                        </View>
                    </View>

                    {/* Fee Breakdown */}
                    <View style={{ marginTop: 24 }}>
                        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>
                            Fee Breakdown
                        </Text>
                        <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16 }}>
                            {feeData?.feeStructure?.components?.map((comp, index) => (
                                <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                                    <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>{comp.name}</Text>
                                    <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Bold" }}>₹{comp.amount}</Text>
                                </View>
                            ))}
                            <View style={{ height: 1, backgroundColor: colors.textSecondary + "20", marginVertical: 8 }} />
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Bold" }}>Total</Text>
                                <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>₹{feeData?.totalFees}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Payment History */}
                    <View style={{ marginTop: 24 }}>
                        <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 16 }}>
                            Payment History
                        </Text>
                        {(!feeData?.payments || feeData.payments.length === 0) ? (
                            <View style={{ alignItems: "center", padding: 24, opacity: 0.6 }}>
                                <MaterialIcons name="receipt-long" size={48} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No payments recorded yet</Text>
                            </View>
                        ) : (
                            feeData.payments.map((payment) => (
                                <View
                                    key={payment._id}
                                    style={{
                                        backgroundColor: colors.cardBackground,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <View>
                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.textPrimary, fontSize: 16 }}>
                                            ₹{payment.amount}
                                        </Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                            {new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod}
                                        </Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                            Receipt: {payment.receiptNumber}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                            <Text style={{ color: colors.success, fontSize: 10, fontFamily: "DMSans-Bold", textTransform: "uppercase" }}>
                                                {payment.status}
                                            </Text>
                                        </View>
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
