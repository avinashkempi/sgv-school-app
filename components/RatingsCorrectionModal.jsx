import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../theme";
import Card from "./Card";
import Button from "./Button";
import Badge from "./ui/Badge";
import TextInput from "./TextInput";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";
import { useToast } from "./ToastProvider";
import { getISTMonthYear } from "../utils/date";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function RatingsCorrectionModal({
  visible,
  onClose,
  subjectItem, // { subjectId, subjectName, classId, className, teacherName, currentMonth, currentYear, ratedCount, totalStudents }
  onSuccess,
}) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("move"); // 'move' | 'delete'
  const [targetMonth, setTargetMonth] = useState(1);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [overwriteTarget, setOverwriteTarget] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize target month/year when modal opens
  useEffect(() => {
    if (visible && subjectItem) {
      const currentMY = getISTMonthYear();
      const srcMonth = subjectItem.currentMonth || currentMY.month;
      const srcYear = subjectItem.currentYear || currentMY.year;

      // Suggest the previous month as the default target (most common mistake: entered current month instead of past month)
      if (srcMonth === 1) {
        setTargetMonth(12);
        setTargetYear(srcYear - 1);
      } else {
        setTargetMonth(srcMonth - 1);
        setTargetYear(srcYear);
      }
      setActiveTab("move");
      setOverwriteTarget(false);
      setDeleteReason("");
      setConfirmText("");
    }
  }, [visible, subjectItem]);

  if (!visible || !subjectItem) return null;

  const {
    subjectId,
    subjectName = "Subject",
    className = "Class",
    teacherName,
    currentMonth,
    currentYear,
    ratedCount = 0,
  } = subjectItem;

  const sourceMonthName = MONTH_NAMES[currentMonth - 1] || `Month ${currentMonth}`;
  const targetMonthName = MONTH_NAMES[targetMonth - 1] || `Month ${targetMonth}`;

  // Execute Move / Shift Month
  const handleShiftMonth = async () => {
    if (targetMonth === currentMonth && targetYear === currentYear) {
      Alert.alert(
        "Invalid Target Month",
        "Target month and year cannot be identical to the current month and year."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const res = await apiFetch(
        `${apiConfig.baseUrl}/student-ratings/admin/shift-month`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: subjectId || undefined,
            classId: subjectItem?.classId && !subjectId ? subjectItem.classId : undefined,
            allInMonth: subjectItem?.allInMonth ? true : undefined,
            sourceMonth: currentMonth,
            sourceYear: currentYear,
            targetMonth,
            targetYear,
            overwriteTarget,
            reason: `Admin correction: moved ratings from ${sourceMonthName} ${currentYear} to ${targetMonthName} ${targetYear}`,
          }),
        }
      );

      const data = res && typeof res.json === "function" ? await res.json() : res;

      if (data?.hasConflict && !overwriteTarget) {
        const doOverwrite = async () => {
          setOverwriteTarget(true);
          try {
            setIsSubmitting(true);
            const overwriteRes = await apiFetch(
              `${apiConfig.baseUrl}/student-ratings/admin/shift-month`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subjectId: subjectId || undefined,
                  classId: subjectItem?.classId && !subjectId ? subjectItem.classId : undefined,
                  allInMonth: subjectItem?.allInMonth ? true : undefined,
                  sourceMonth: currentMonth,
                  sourceYear: currentYear,
                  targetMonth,
                  targetYear,
                  overwriteTarget: true,
                  reason: `Admin correction: overwritten & moved from ${sourceMonthName} to ${targetMonthName}`,
                }),
              }
            );
            const overwriteData =
              overwriteRes && typeof overwriteRes.json === "function"
                ? await overwriteRes.json()
                : overwriteRes;

            if (overwriteRes?.ok || overwriteData?.success) {
              showToast(
                overwriteData.message ||
                  `Successfully moved ratings to ${targetMonthName} ${targetYear}`,
                "success"
              );
              onSuccess?.(overwriteData);
              onClose();
            } else {
              Alert.alert("Failed", overwriteData?.message || "Failed to move ratings.");
            }
          } catch (e) {
            Alert.alert("Error", e?.message || "Error moving ratings.");
          } finally {
            setIsSubmitting(false);
          }
        };

        const conflictMsg = `${targetMonthName} ${targetYear} already contains ${data.targetCount} rating(s). Would you like to overwrite them with the ratings from ${sourceMonthName}?`;
        if (Platform.OS === "web") {
          // On Web, Alert.alert ignores callbacks; use window.confirm
          if (typeof window !== "undefined" && window.confirm(conflictMsg)) {
            await doOverwrite();
          }
        } else {
          Alert.alert(
            "Ratings Already Exist",
            conflictMsg,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Overwrite", style: "destructive", onPress: doOverwrite },
            ]
          );
        }
        return;
      }

      if (res?.ok || data?.success) {
        showToast(
          data?.message ||
            `Successfully moved ${data?.data?.movedCount || ""} ratings to ${targetMonthName} ${targetYear}!`,
          "success"
        );
        onSuccess?.(data);
        onClose();
      } else {
        Alert.alert("Failed", data?.message || "Could not move ratings.");
      }
    } catch (err) {
      console.error("Error shifting ratings:", err);
      Alert.alert("Error", err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Bulk Delete
  const handleBulkDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert("Confirmation Required", "Please type DELETE to confirm bulk deletion.");
      return;
    }

    const doDelete = async () => {
      try {
        setIsSubmitting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

        const payload = {
          subjectId: subjectId || undefined,
          classId: subjectItem?.classId && !subjectId ? subjectItem.classId : undefined,
          allInMonth: subjectItem?.allInMonth ? true : undefined,
          month: currentMonth,
          year: currentYear,
          reason: deleteReason.trim() || "Admin bulk deletion of mistaken ratings",
        };

        const queryParams = new URLSearchParams();
        if (payload.subjectId) queryParams.append("subjectId", payload.subjectId);
        if (payload.classId) queryParams.append("classId", payload.classId);
        if (payload.allInMonth) queryParams.append("allInMonth", "true");
        if (payload.month) queryParams.append("month", String(payload.month));
        if (payload.year) queryParams.append("year", String(payload.year));
        if (payload.reason) queryParams.append("reason", payload.reason);

        // Attempt 1: Standard DELETE with body & query params
        let res = await apiFetch(
          `${apiConfig.baseUrl}/student-ratings/admin/bulk?${queryParams.toString()}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        let data = res && typeof res.json === "function" ? await res.json() : res;

        // Attempt 2: If DELETE returned error (or body was stripped by proxy), try POST fallback
        if (!res?.ok && !data?.success) {
          try {
            const fallbackRes = await apiFetch(
              `${apiConfig.baseUrl}/student-ratings/admin/bulk-delete`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
            const fallbackData =
              fallbackRes && typeof fallbackRes.json === "function"
                ? await fallbackRes.json()
                : fallbackRes;

            if (fallbackRes?.ok || fallbackData?.success) {
              res = fallbackRes;
              data = fallbackData;
            }
          } catch (_) {}
        }

        if (res?.ok || data?.success) {
          showToast(
            data?.message ||
              `Deleted ${data?.data?.deletedCount || ratedCount} ratings successfully.`,
            "success"
          );
          onSuccess?.(data);
          onClose();
        } else {
          Alert.alert("Failed", data?.message || "Could not delete ratings.");
        }
      } catch (err) {
        console.error("Error deleting ratings:", err);
        Alert.alert("Error", err?.message || "An unexpected error occurred.");
      } finally {
        setIsSubmitting(false);
      }
    };

    // On Web, typing "DELETE" is already explicit confirmation.
    // Alert.alert in react-native-web ignores buttons and never calls onPress, which blocks deletion.
    if (Platform.OS === "web") {
      await doDelete();
    } else {
      Alert.alert(
        "Confirm Permanent Deletion",
        `Are you absolutely sure you want to delete all ${ratedCount} student ratings for ${subjectName} in ${sourceMonthName} ${currentYear}? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Delete",
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark
                ? colors.surfaceContainer || "#1E1E24"
                : colors.surface || "#FFFFFF",
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.outlineVariant }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: colors.primaryContainer || "#E0E7FF" },
                ]}
              >
                <MaterialIcons
                  name="edit-calendar"
                  size={20}
                  color={colors.primary || "#4F46E5"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  Manage Ratings
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
                  Correct mistaken submission period
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceContainerHigh || "#2E2E34" }]}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Subject Context Card */}
            <Card
              style={[
                styles.contextCard,
                {
                  backgroundColor: isDark
                    ? colors.surfaceContainerLow || "#141418"
                    : colors.surfaceContainerLowest || "#F8F9FA",
                  borderColor: colors.outlineVariant,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={[styles.contextSubject, { color: colors.onSurface }]} numberOfLines={1}>
                  {subjectName}
                </Text>
                <Badge
                  variant="success"
                  label={`${ratedCount} Rated`}
                  size="sm"
                />
              </View>
              <Text style={[styles.contextDetail, { color: colors.onSurfaceVariant }]}>
                Class: <Text style={{ fontWeight: "700", color: colors.onSurface }}>{className}</Text>
                {teacherName ? ` • Teacher: ${teacherName}` : ""}
              </Text>
              <Text style={[styles.contextDetail, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                Current Submission: <Text style={{ fontWeight: "700", color: colors.primary }}>{sourceMonthName} {currentYear}</Text>
              </Text>
            </Card>

            {/* Segmented Control Tabs */}
            <View style={[styles.tabSelector, { backgroundColor: colors.surfaceContainerHigh || "#2A2A30" }]}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab("move");
                }}
                style={[
                  styles.tabButton,
                  activeTab === "move" && [
                    styles.tabButtonActive,
                    { backgroundColor: colors.surface || "#FFFFFF" },
                  ],
                ]}
              >
                <MaterialIcons
                  name="swap-horiz"
                  size={18}
                  color={activeTab === "move" ? colors.primary : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === "move" ? colors.primary : colors.onSurfaceVariant,
                      fontFamily: activeTab === "move" ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  Move to Month
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab("delete");
                }}
                style={[
                  styles.tabButton,
                  activeTab === "delete" && [
                    styles.tabButtonActive,
                    { backgroundColor: colors.surface || "#FFFFFF" },
                  ],
                ]}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color={activeTab === "delete" ? colors.error || "#DC2626" : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === "delete" ? colors.error || "#DC2626" : colors.onSurfaceVariant,
                      fontFamily: activeTab === "delete" ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  Bulk Delete
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: MOVE TO ANOTHER MONTH */}
            {activeTab === "move" && (
              <View style={styles.tabContent}>
                <View style={[styles.infoBanner, { backgroundColor: isDark ? "#1E293B" : "#EFF6FF", borderColor: "#93C5FD" }]}>
                  <MaterialIcons name="lightbulb" size={18} color="#2563EB" style={{ marginTop: 2 }} />
                  <Text style={[styles.infoBannerText, { color: isDark ? "#93C5FD" : "#1E40AF" }]}>
                    Mistakenly entered ratings under {sourceMonthName}? Move all {ratedCount} student evaluations to the correct month instantly without re-typing.
                  </Text>
                </View>

                {/* Target Month Picker */}
                <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>
                  Select Destination Month:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.monthScroll}
                >
                  {MONTH_NAMES.map((name, idx) => {
                    const mNum = idx + 1;
                    const isSelected = targetMonth === mNum;
                    const isCurrentSource = mNum === currentMonth && targetYear === currentYear;

                    return (
                      <TouchableOpacity
                        key={mNum}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setTargetMonth(mNum);
                        }}
                        style={[
                          styles.monthChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark
                              ? colors.surfaceContainerHigh || "#2A2A30"
                              : colors.surfaceVariant || "#E5E7EB",
                            borderColor: isCurrentSource ? colors.error : "transparent",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.monthChipText,
                            {
                              color: isSelected
                                ? "#FFFFFF"
                                : isDark
                                ? colors.onSurface
                                : colors.onSurfaceVariant,
                              fontFamily: isSelected ? FONTS.bold : FONTS.regular,
                            },
                          ]}
                        >
                          {name.slice(0, 3)}
                        </Text>
                        {isCurrentSource && (
                          <Text style={{ fontSize: 9, color: isSelected ? "#FFFFFF" : colors.error }}>
                            (Current)
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Target Year */}
                <View style={styles.yearRow}>
                  <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>Target Year:</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <TouchableOpacity
                        key={y}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setTargetYear(y);
                        }}
                        style={[
                          styles.yearChip,
                          {
                            backgroundColor:
                              targetYear === y
                                ? colors.primary
                                : isDark
                                ? colors.surfaceContainerHigh
                                : colors.surfaceVariant,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.yearChipText,
                            {
                              color: targetYear === y ? "#FFFFFF" : colors.onSurface,
                              fontFamily: targetYear === y ? FONTS.bold : FONTS.regular,
                            },
                          ]}
                        >
                          {y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Overwrite Toggle Option */}
                <TouchableOpacity
                  onPress={() => setOverwriteTarget(!overwriteTarget)}
                  style={styles.checkboxRow}
                >
                  <MaterialIcons
                    name={overwriteTarget ? "check-box" : "check-box-outline-blank"}
                    size={22}
                    color={overwriteTarget ? colors.primary : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.checkboxLabel, { color: colors.onSurface }]}>
                    Overwrite ratings if {targetMonthName} {targetYear} already has entries
                  </Text>
                </TouchableOpacity>

                {/* Move Action Button */}
                <Button
                  title={
                    isSubmitting
                      ? "Moving Ratings..."
                      : `Move ${ratedCount} Ratings to ${targetMonthName} ${targetYear}`
                  }
                  onPress={handleShiftMonth}
                  disabled={isSubmitting || (targetMonth === currentMonth && targetYear === currentYear)}
                  variant="primary"
                  icon="swap-horiz"
                  style={{ marginTop: 16 }}
                />
              </View>
            )}

            {/* TAB 2: BULK DELETE */}
            {activeTab === "delete" && (
              <View style={styles.tabContent}>
                <View
                  style={[
                    styles.dangerBanner,
                    {
                      backgroundColor: isDark ? "#450A0A" : "#FEF2F2",
                      borderColor: isDark ? "#991B1B" : "#FCA5A5",
                    },
                  ]}
                >
                  <MaterialIcons name="warning" size={22} color="#DC2626" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dangerBannerTitle, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                      Destructive Action
                    </Text>
                    <Text style={[styles.dangerBannerText, { color: isDark ? "#F87171" : "#B91C1C" }]}>
                      This will permanently delete all {ratedCount} student ratings for {subjectName} in{" "}
                      {sourceMonthName} {currentYear}. The subject will return to "Pending" status in the
                      monthly tracker.
                    </Text>
                  </View>
                </View>

                {/* Reason */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
                    Reason for Deletion (Logged in Audit Trail):
                  </Text>
                  <TextInput
                    value={deleteReason}
                    onChangeText={setDeleteReason}
                    placeholder="e.g. Teacher entered October evaluations under November"
                    style={{ marginTop: 6 }}
                  />
                </View>

                {/* Type DELETE to Confirm */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.fieldLabel, { color: colors.error || "#DC2626" }]}>
                    Type "DELETE" to confirm permanent removal:
                  </Text>
                  <TextInput
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder="Type DELETE"
                    autoCapitalize="characters"
                    style={{ marginTop: 6 }}
                  />
                </View>

                {/* Delete Button */}
                <Button
                  title={
                    isSubmitting
                      ? "Deleting Ratings..."
                      : `Permanently Delete ${ratedCount} Ratings`
                  }
                  onPress={handleBulkDelete}
                  disabled={isSubmitting || confirmText.trim().toUpperCase() !== "DELETE"}
                  variant="destructive"
                  icon="delete-forever"
                  style={{ marginTop: 16 }}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: FONT_SIZES.mdLg || 17,
    fontFamily: FONTS.bold,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.regular,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contextCard: {
    padding: 14,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  contextSubject: {
    fontSize: FONT_SIZES.md || 15,
    fontFamily: FONTS.bold,
    flex: 1,
    marginRight: 8,
  },
  contextDetail: {
    fontSize: FONT_SIZES.sm || 13,
    fontFamily: FONTS.regular,
  },
  tabSelector: {
    flexDirection: "row",
    borderRadius: RADIUS.md || 10,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: FONT_SIZES.sm || 13,
  },
  tabContent: {
    gap: 8,
  },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm || 13,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  dangerBanner: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dangerBannerTitle: {
    fontSize: FONT_SIZES.sm || 14,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  dangerBannerText: {
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.regular,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: FONT_SIZES.sm || 13,
    fontFamily: FONTS.bold,
    marginTop: 6,
    marginBottom: 4,
  },
  monthScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm || 8,
    alignItems: "center",
    minWidth: 54,
    borderWidth: 1,
  },
  monthChipText: {
    fontSize: FONT_SIZES.sm || 13,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.sm || 8,
  },
  yearChipText: {
    fontSize: FONT_SIZES.sm || 13,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm || 13,
    fontFamily: FONTS.medium,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 4,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.regular,
  },
});
