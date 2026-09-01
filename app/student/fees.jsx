import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import Card from "../../components/Card";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";
import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import AppRefreshControl from "../../components/ui/AppRefreshControl";

export default function StudentFeesScreen() {
  const _router = useRouter();
  const { _styles, colors } = useTheme();
  const { t } = useLabel();
  const { _showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const { user, userId: authUserId } = useAuth();

  const userId = user?.id || user?._id || authUserId;

  // Fetch Fees Data
  const {
    data: feeData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["studentFees", userId],
    `${apiConfig.baseUrl}/fees/student/${userId}`,
    { enabled: !!userId && userId !== "undefined", ...CACHE_TIERS.STABLE }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
      >
        <View>
          <Header
            title={t("student.myFees", "My Fees")}
            subtitle={t(
              "student.paymentStatusHistory",
              "Payment Status & History"
            )}
            showBack
          />

          {/* Summary Cards */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 24,
              flexWrap: "wrap",
            }}
          >
            <Card
              style={{ flex: 1, minWidth: "45%" }}
              contentStyle={{ alignItems: "center", padding: 16 }}
            >
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  fontSize: FONT_SIZES.sm,
                  marginBottom: 4,
                }}
              >
                {t("student.totalFees", "Total Fees")}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                }}
              >
                ₹{feeData?.totalFees?.toLocaleString() || 0}
              </Text>
            </Card>
            {/* Concession Card - Only if > 0 */}
            {feeData?.concession > 0 && (
              <Card
                style={{ flex: 1, minWidth: "45%" }}
                contentStyle={{ alignItems: "center", padding: 16 }}
              >
                <Text
                  style={{
                    color: colors.onSurfaceVariant,
                    fontSize: FONT_SIZES.sm,
                    marginBottom: 4,
                  }}
                >
                  {t("student.concession", "Concession")}
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: "#FF9800",
                  }}
                >
                  ₹{feeData.concession.toLocaleString()}
                </Text>
              </Card>
            )}
            <Card
              style={{ flex: 1, minWidth: "45%" }}
              contentStyle={{ alignItems: "center", padding: 16 }}
            >
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  fontSize: FONT_SIZES.sm,
                  marginBottom: 4,
                }}
              >
                {t("student.paid", "Paid")}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.success,
                }}
              >
                ₹{feeData?.paidAmount?.toLocaleString() || 0}
              </Text>
            </Card>
            <Card
              style={{ flex: 1, minWidth: "45%" }}
              contentStyle={{ alignItems: "center", padding: 16 }}
            >
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  fontSize: FONT_SIZES.sm,
                  marginBottom: 4,
                }}
              >
                {t("student.pending", "Pending")}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.error,
                }}
              >
                ₹{feeData?.pendingAmount?.toLocaleString() || 0}
              </Text>
            </Card>
          </View>

          {/* Fee Breakdown */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.textPrimary,
                marginBottom: 16,
              }}
            >
              {t("student.feeBreakdown", "Fee Breakdown")}
            </Text>
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 16,
                padding: 16,
              }}
            >
              {feeData?.feeStructure?.components?.map((comp, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: FONTS.medium,
                    }}
                  >
                    {comp.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    ₹{comp.amount}
                  </Text>
                </View>
              ))}
              {feeData?.concession > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: FONTS.medium,
                    }}
                  >
                    {t("student.lessConcession", "Less: Concession")}
                  </Text>
                  <Text style={{ color: "#FF9800", fontFamily: FONTS.bold }}>
                    -₹{feeData.concession}
                  </Text>
                </View>
              )}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.textSecondary + "20",
                  marginVertical: 8,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: FONTS.bold,
                  }}
                >
                  {t("student.netPayable", "Net Payable")}
                </Text>
                <Text
                  style={{ color: colors.primary, fontFamily: FONTS.bold }}
                >
                  ₹
                  {(
                    (feeData?.totalFees || 0) - (feeData?.concession || 0)
                  ).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Installment Schedule & Overdue Status */}
          {feeData?.installmentSchedule &&
            feeData.installmentSchedule.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                    marginBottom: 16,
                  }}
                >
                  {t("student.installmentSchedule", "Installment Schedule")}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  {feeData.installmentSchedule.map((inst, index) => {
                    const isPaid = inst.status === "paid";
                    const isOverdue = inst.status === "overdue";
                    const isDueSoon = inst.status === "due_soon";
                    const isPartial = inst.status === "partial";

                    const badgeColor = isPaid
                      ? colors.success
                      : isOverdue
                      ? colors.error
                      : isDueSoon
                      ? colors.warning || "#FFB020"
                      : isPartial
                      ? colors.primary
                      : colors.textSecondary;
                    const badgeBg = badgeColor + "15";
                    const badgeText = isPaid
                      ? t("common.paidUppercase", "PAID")
                      : isOverdue
                      ? t("student.overdueUppercase", "OVERDUE")
                      : isDueSoon
                      ? t("student.dueSoonUppercase", "DUE SOON")
                      : isPartial
                      ? t("student.partialUppercase", "PARTIAL")
                      : t("student.upcomingUppercase", "UPCOMING");

                    return (
                      <View
                        key={index}
                        style={{
                          paddingVertical: 12,
                          borderBottomWidth:
                            index === feeData.installmentSchedule.length - 1
                              ? 0
                              : 1,
                          borderBottomColor: colors.textSecondary + "10",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text
                            style={{
                              fontFamily: FONTS.bold,
                              color: colors.textPrimary,
                              fontSize: FONT_SIZES.md,
                            }}
                          >
                            {inst.description}
                          </Text>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: FONT_SIZES.sm,
                              marginTop: 2,
                            }}
                          >
                            {t("student.target", "Target")}: ₹
                            {inst.amount.toLocaleString()} •{" "}
                            {inst.dueDate
                              ? `${t("student.due", "Due")} ${new Date(
                                  inst.dueDate
                                ).toLocaleDateString()}`
                              : t("student.noDueDate", "No due date")}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: badgeBg,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: badgeColor,
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.bold,
                            }}
                          >
                            {badgeText}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

          {/* Payment History */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.textPrimary,
                marginBottom: 16,
              }}
            >
              {t("student.paymentHistory", "Payment History")}
            </Text>
            {!feeData?.payments || feeData.payments.length === 0 ? (
              <View style={{ alignItems: "center", padding: 24, opacity: 0.6 }}>
                <MaterialIcons
                  name="receipt-long"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                  {t("student.noPaymentsYet", "No payments recorded yet")}
                </Text>
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
                    padding: 16,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                        fontSize: FONT_SIZES.md,
                      }}
                    >
                      ₹{payment.amount.toLocaleString()}
                    </Text>
                    <Text
                      style={{
                        color: colors.onSurfaceVariant,
                        fontSize: FONT_SIZES.sm,
                        marginTop: 4,
                      }}
                    >
                      {new Date(payment.paymentDate).toLocaleDateString()} •{" "}
                      {payment.paymentMethod}
                    </Text>
                    {/* Display Installment Number if available */}
                    {payment.installmentNumber && (
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: FONT_SIZES.sm,
                          marginTop: 2,
                          fontWeight: "600",
                        }}
                      >
                        ${t("student.installment", "Installment")} $
                        {payment.installmentNumber}
                      </Text>
                    )}
                    <Text
                      style={{
                        color: colors.onSurfaceVariant,
                        fontSize: FONT_SIZES.sm,
                        marginTop: 2,
                      }}
                    >
                      {payment.receiptNumber
                        ? `${t("student.invoice", "Invoice")}: ${
                            payment.receiptNumber
                          }`
                        : `${t("student.receipt", "Receipt")}: ${payment._id
                            .toString()
                            .substr(-6)
                            .toUpperCase()}`}
                    </Text>
                    {(payment.bookNumber || payment.manualReceiptNumber) && (
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          color: colors.onSurfaceVariant,
                          marginTop: 2,
                        }}
                      >
                        {payment.bookNumber
                          ? `${t("student.book", "Book")}: ${
                              payment.bookNumber
                            }`
                          : ""}
                        {payment.bookNumber && payment.manualReceiptNumber
                          ? " | "
                          : ""}
                        {payment.manualReceiptNumber
                          ? `${t("student.receipt", "Receipt")}: ${
                              payment.manualReceiptNumber
                            }`
                          : ""}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View
                      style={{
                        backgroundColor: colors.success + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.success,
                          fontSize: FONT_SIZES.micro,
                          fontFamily: FONTS.bold,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("common." + payment.status, payment.status)}
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
