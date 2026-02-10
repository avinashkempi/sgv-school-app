import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../../utils/storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import Header from "../../components/Header";
import Card from "../../components/Card";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";

export default function StudentFeesScreen() {
    const _router = useRouter();
    const { _styles, colors } = useTheme();
    const { _showToast } = useToast();

    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await storage.getItem("@auth_user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        };
        loadUser();
    }, []);

    const userId = user?.id || user?._id;

    // Fetch Fees Data
    const { data: feeData, isLoading: loading, refetch } = useApiQuery(
        ['studentFees', userId],
        `${apiConfig.baseUrl}/fees/student/${userId}`,
        { enabled: !!userId }
    );

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
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                <View>
                    <Header title="My Fees" subtitle="Payment Status & History" showBack />

                    {/* Summary Cards */}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
                        <Card style={{ flex: 1, minWidth: '45%' }} contentStyle={{ alignItems: "center", padding: 16 }}>
                            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 }}>Total Fees</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                ₹{feeData?.totalFees?.toLocaleString() || 0}
                            </Text>
                        </Card>
                        {/* Concession Card - Only if > 0 */}
                        {feeData?.concession > 0 && (
                            <Card style={{ flex: 1, minWidth: '45%' }} contentStyle={{ alignItems: "center", padding: 16 }}>
                                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 }}>Concession</Text>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: "#FF9800" }}>
                                    ₹{feeData.concession.toLocaleString()}
                                </Text>
                            </Card>
                        )}
                        <Card style={{ flex: 1, minWidth: '45%' }} contentStyle={{ alignItems: "center", padding: 16 }}>
                            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 }}>Paid</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.success }}>
                                ₹{feeData?.paidAmount?.toLocaleString() || 0}
                            </Text>
                        </Card>
                        <Card style={{ flex: 1, minWidth: '45%' }} contentStyle={{ alignItems: "center", padding: 16 }}>
                            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 }}>Pending</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.error }}>
                                ₹{feeData?.pendingAmount?.toLocaleString() || 0}
                            </Text>
                        </Card>
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
                            {feeData?.concession > 0 && (
                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                                    <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Medium" }}>Less: Concession</Text>
                                    <Text style={{ color: "#FF9800", fontFamily: "DMSans-Bold" }}>-₹{feeData.concession}</Text>
                                </View>
                            )}
                            <View style={{ height: 1, backgroundColor: colors.textSecondary + "20", marginVertical: 8 }} />
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <Text style={{ color: colors.textPrimary, fontFamily: "DMSans-Bold" }}>Net Payable</Text>
                                <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>
                                    ₹{(feeData?.totalFees - (feeData?.concession || 0))}
                                </Text>
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
                                <Card
                                    key={payment._id}
                                    style={{ marginBottom: 12 }}
                                    variant="elevated"
                                    contentStyle={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: 16
                                    }}
                                >
                                    <View>
                                        <Text style={{ fontFamily: "DMSans-Bold", color: colors.onSurface, fontSize: 16 }}>
                                            ₹{payment.amount.toLocaleString()}
                                        </Text>
                                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
                                            {new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod}
                                        </Text>
                                        {/* Display Installment Number if available */}
                                        {payment.installmentNumber && (
                                            <Text style={{ color: colors.primary, fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                                                Installment {payment.installmentNumber}
                                            </Text>
                                        )}
                                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                                            {payment.receiptNumber ? `Invoice: ${payment.receiptNumber}` : `Receipt: ${payment._id.toString().substr(-6).toUpperCase()}`}
                                        </Text>
                                        {(payment.bookNumber || payment.manualReceiptNumber) && (
                                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>
                                                {payment.bookNumber ? `Book: ${payment.bookNumber}` : ''}
                                                {payment.bookNumber && payment.manualReceiptNumber ? ' | ' : ''}
                                                {payment.manualReceiptNumber ? `Receipt: ${payment.manualReceiptNumber}` : ''}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                            <Text style={{ color: colors.success, fontSize: 10, fontFamily: "DMSans-Bold", textTransform: "uppercase" }}>
                                                {payment.status}
                                            </Text>
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
