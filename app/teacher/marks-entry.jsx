import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, SPACING, RADIUS } from "../../theme";
import { useApiQuery, useApiMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";
import Button from "../../components/Button";
import { LoadingState } from "../../components/StateComponents";
import apiConfig from "../../config/apiConfig";
import { useLabel } from "../../context/LabelsContext";
import { formatUserName } from "../../utils/userFormatters";
import UserAvatar from "../../components/ui/UserAvatar";
import storage from "../../utils/storage";

export default function MarksEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { examId, examName, className, subjectName } = params;
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { t } = useLabel();

  const inputRefs = useRef({});
  const [marksData, setMarksData] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Fetch Exam Details (to get total marks)
  const { data: examDetails } = useApiQuery(
    ["examDetails", examId],
    `${apiConfig.baseUrl}/exams/${examId}`,
    { enabled: !!examId }
  );

  // Fetch Students in Class
  const classId = examDetails?.class?._id || examDetails?.class;

  const { data: students, isLoading: loadingStudents } = useApiQuery(
    ["classStudents", classId],
    `${apiConfig.baseUrl}/classes/${classId}/students`,
    { enabled: !!classId }
  );

  // Fetch Existing Marks
  const { data: existingMarks, isLoading: loadingMarks } = useApiQuery(
    ["examMarks", examId],
    `${apiConfig.baseUrl}/marks/exam/${examId}`,
    { enabled: !!examId }
  );

  const totalMarks = examDetails?.totalMarks || 100;
  const draftStorageKey = `@draft_marks_${examId}`;

  // Initialize marks data when students or existing marks load
  useEffect(() => {
    async function loadInitial() {
      let draftMap = null;
      try {
        const savedDraft = await storage.getItem(draftStorageKey);
        if (savedDraft) {
          draftMap = JSON.parse(savedDraft);
        }
      } catch {
        // Ignore draft parse errors
      }

      if (students && existingMarks) {
        const initialData = {};
        students.forEach((student) => {
          const markEntry = existingMarks.find(
            (m) => m.student._id === student._id || m.student === student._id
          );
          const draftEntry = draftMap ? draftMap[student._id] : null;

          initialData[student._id] = {
            marksObtained: draftEntry?.marksObtained !== undefined
              ? draftEntry.marksObtained
              : markEntry ? String(markEntry.marksObtained) : "",
            remarks: draftEntry?.remarks !== undefined
              ? draftEntry.remarks
              : markEntry ? markEntry.remarks : "",
          };
        });
        setMarksData(initialData);
        if (draftMap) setDraftSaved(true);
      } else if (students) {
        const initialData = {};
        students.forEach((student) => {
          const draftEntry = draftMap ? draftMap[student._id] : null;
          initialData[student._id] = {
            marksObtained: draftEntry?.marksObtained || "",
            remarks: draftEntry?.remarks || "",
          };
        });
        setMarksData(initialData);
        if (draftMap) setDraftSaved(true);
      }
    }

    loadInitial();
  }, [students, existingMarks, draftStorageKey]);

  // Autosave draft on edits (debounced)
  useEffect(() => {
    if (Object.keys(marksData).length === 0) return;
    const timer = setTimeout(async () => {
      try {
        await storage.setItem(draftStorageKey, JSON.stringify(marksData));
        setDraftSaved(true);
      } catch {
        // Ignore storage write issues
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [marksData, draftStorageKey]);

  const bulkMarksMutation = useApiMutation(
    `${apiConfig.baseUrl}/marks/bulk`,
    "POST"
  );

  // Live statistical metrics & validation check
  const stats = useMemo(() => {
    const validScores = Object.values(marksData)
      .map((d) => parseFloat(d?.marksObtained))
      .filter((n) => !isNaN(n) && n >= 0);

    const gradedCount = validScores.length;
    const totalCount = students?.length || 0;
    const avgScore = gradedCount > 0
      ? (validScores.reduce((a, b) => a + b, 0) / gradedCount).toFixed(1)
      : "-";
    const highScore = gradedCount > 0 ? Math.max(...validScores) : "-";
    const lowScore = gradedCount > 0 ? Math.min(...validScores) : "-";

    const invalidStudentIds = [];
    Object.entries(marksData).forEach(([studentId, d]) => {
      const val = parseFloat(d?.marksObtained);
      if (!isNaN(val) && (val > totalMarks || val < 0)) {
        invalidStudentIds.push(studentId);
      }
    });

    return {
      gradedCount,
      totalCount,
      avgScore,
      highScore,
      lowScore,
      hasErrors: invalidStudentIds.length > 0,
      invalidStudentIds,
    };
  }, [marksData, students, totalMarks]);

  const handleMarksChange = (studentId, value) => {
    // Validate input (allow empty or valid decimal numbers)
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setMarksData((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], marksObtained: value },
      }));
      setDraftSaved(false);
    }
  };

  const focusNextStudent = (currentIndex) => {
    if (students && currentIndex < students.length - 1) {
      const nextStudent = students[currentIndex + 1];
      if (nextStudent && inputRefs.current[nextStudent._id]) {
        Haptics.selectionAsync().catch(() => {});
        inputRefs.current[nextStudent._id].focus();
      }
    }
  };

  const handleRequestSubmit = () => {
    if (stats.hasErrors) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast(
        `Marks cannot exceed maximum marks (${totalMarks})`,
        "error"
      );
      return;
    }

    if (stats.gradedCount === 0) {
      showToast("Please enter marks for at least one student", "warning");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setConfirmModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmModalVisible(false);
    setSaving(true);
    try {
      const payload = {
        examId,
        marksData: Object.entries(marksData)
          .filter(([_, data]) => data.marksObtained !== "") // Only send entries with marks
          .map(([studentId, data]) => ({
            studentId,
            marksObtained: parseFloat(data.marksObtained),
            remarks: data.remarks || "",
          })),
      };

      await bulkMarksMutation.mutateAsync(payload);
      // Clear draft on successful sync
      await storage.removeItem(draftStorageKey).catch(() => {});

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast(
        t("toasts.marksSavedSuccessfully", "Marks saved successfully"),
        "success"
      );
      router.back();
    } catch (error) {
      showToast(
        error.message || t("toasts.failedToSaveMarks", "Failed to save marks"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingStudents || loadingMarks) {
    return <LoadingState message={t("common.loading", "Loading marks...")} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <AppHeader
          title={
            examName
              ? `${examName} ${t("teacher.marks", "Marks")}`
              : t("teacher.marksEntry", "Marks Entry")
          }
          subtitle={`${className || ""} - ${subjectName || ""} (Max: ${totalMarks})`}
          showBack={true}
        />
      </View>

      {/* Summary KPI & Draft Status Strip */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 4,
          padding: 12,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.outlineVariant || colors.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.xs,
              fontFamily: FONTS.bold,
              color: colors.onSurfaceVariant,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Live Performance Metrics
          </Text>
          {draftSaved && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialIcons name="cloud-done" size={14} color={colors.secondary} />
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.medium,
                  color: colors.secondary,
                }}
              >
                Draft saved
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.primary,
              }}
            >
              {stats.gradedCount} / {stats.totalCount}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.micro,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
              }}
            >
              Graded
            </Text>
          </View>

          <View style={{ width: 1, height: 20, backgroundColor: colors.outlineVariant || "#E2E8F0" }} />

          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
              }}
            >
              {stats.avgScore}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.micro,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
              }}
            >
              Average
            </Text>
          </View>

          <View style={{ width: 1, height: 20, backgroundColor: colors.outlineVariant || "#E2E8F0" }} />

          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.success,
              }}
            >
              {stats.highScore}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.micro,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
              }}
            >
              High
            </Text>
          </View>

          <View style={{ width: 1, height: 20, backgroundColor: colors.outlineVariant || "#E2E8F0" }} />

          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.onSurfaceVariant,
              }}
            >
              {totalMarks}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.micro,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
              }}
            >
              Max Marks
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <FlatList
          data={students}
          keyExtractor={(item) => item._id}
          scrollEnabled={true}
          bounces={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListHeaderComponent={
            <View style={localStyles.headerRow}>
              <Text
                style={[
                  localStyles.headerText,
                  { color: colors.onSurfaceVariant, flex: 2 },
                ]}
              >
                {t("common.student", "Student")}
              </Text>
              <Text
                style={[
                  localStyles.headerText,
                  { color: colors.onSurfaceVariant, flex: 1, textAlign: "center" },
                ]}
              >
                Marks (/{totalMarks})
              </Text>
            </View>
          }
          renderItem={({ item: student, index }) => {
            const rawVal = marksData[student._id]?.marksObtained;
            const numVal = parseFloat(rawVal);
            const isOverMax = !isNaN(numVal) && (numVal > totalMarks || numVal < 0);

            return (
              <View
                key={student._id}
                style={[
                  localStyles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isOverMax
                      ? colors.error
                      : colors.outlineVariant || colors.border,
                    borderWidth: isOverMax ? 1.5 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    flex: 2,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                    paddingRight: 8,
                  }}
                >
                  <UserAvatar
                    photoUrl={student.profilePhoto}
                    name={formatUserName(student.name)}
                    role="student"
                    size={38}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.semiBold,
                        color: colors.onSurface,
                      }}
                      numberOfLines={1}
                    >
                      {index + 1}. {formatUserName(student.name)}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        color: colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {t("common.roll", "Roll")}: {student.rollNumber || "-"}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1, alignItems: "center" }}>
                  <TextInput
                    ref={(el) => {
                      inputRefs.current[student._id] = el;
                    }}
                    style={[
                      localStyles.input,
                      {
                        color: isOverMax ? colors.error : colors.textPrimary || colors.onSurface,
                        borderColor: isOverMax
                          ? colors.error
                          : colors.fieldBorder || colors.outlineVariant || colors.border,
                        backgroundColor: isOverMax
                          ? colors.error + "12"
                          : colors.fieldBackground || colors.surfaceVariant || "#F8FAFC",
                        fontSize: FONT_SIZES.md,
                        fontFamily: FONTS.bold,
                      },
                    ]}
                    keyboardType="numeric"
                    maxLength={5}
                    returnKeyType={index === (students?.length || 0) - 1 ? "done" : "next"}
                    onSubmitEditing={() => focusNextStudent(index)}
                    blurOnSubmit={index === (students?.length || 0) - 1}
                    selectTextOnFocus={true}
                    value={rawVal || ""}
                    onChangeText={(text) => handleMarksChange(student._id, text)}
                    placeholder="-"
                    placeholderTextColor={colors.onSurfaceVariant}
                    accessibilityLabel={`Marks for ${student.name}, maximum ${totalMarks}`}
                  />
                  {isOverMax && (
                    <Text
                      style={{
                        fontSize: FONT_SIZES.micro,
                        color: colors.error,
                        fontFamily: FONTS.bold,
                        marginTop: 3,
                      }}
                    >
                      Max: {totalMarks}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>

      <View
        style={[
          localStyles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.outlineVariant || colors.border,
          },
        ]}
      >
        <Button
          title={t("teacher.saveMarks", "Review & Save Marks")}
          variant="primary"
          size="lg"
          fullWidth
          loading={saving}
          onPress={handleRequestSubmit}
        />
      </View>

      {/* Confirmation Sheet Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              width: "100%",
              maxWidth: 420,
              borderWidth: 1,
              borderColor: colors.outlineVariant || colors.border,
              elevation: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="grade" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                  }}
                >
                  Submit Marks
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.regular,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  {examName || "Exam"} • {className || ""} - {subjectName || ""}
                </Text>
              </View>
            </View>

            {/* Metrics Breakdown */}
            <View
              style={{
                backgroundColor: colors.surfaceVariant || "#F8FAFC",
                borderRadius: 12,
                padding: 12,
                marginVertical: 12,
                gap: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant }}>
                  Students Graded:
                </Text>
                <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.onSurface }}>
                  {stats.gradedCount} of {stats.totalCount}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant }}>
                  Class Average:
                </Text>
                <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.primary }}>
                  {stats.avgScore} / {totalMarks}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant }}>
                  Highest Score:
                </Text>
                <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.success }}>
                  {stats.highScore}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant }}>
                  Lowest Score:
                </Text>
                <Text style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.bold, color: colors.onSurface }}>
                  {stats.lowScore}
                </Text>
              </View>
            </View>

            {stats.gradedCount < stats.totalCount && (
              <View
                style={{
                  backgroundColor: (colors.warning || "#D97706") + "15",
                  borderLeftWidth: 3,
                  borderLeftColor: colors.warning || "#D97706",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.warning || "#D97706",
                  }}
                >
                  ⚠️ Note: {stats.totalCount - stats.gradedCount} student(s) have no marks entered and will remain unrecorded.
                </Text>
              </View>
            )}

            {/* Modal Actions */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setConfirmModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel and keep editing"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant || colors.border,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.semiBold,
                    color: colors.onSurface,
                  }}
                >
                  Keep Editing
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmSubmit}
                accessibilityRole="button"
                accessibilityLabel="Confirm and save marks"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => ({
                  flex: 1.2,
                  minHeight: 48,
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                    color: colors.onPrimary,
                  }}
                >
                  Confirm & Submit
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: RADIUS.md || 12,
    marginBottom: SPACING.sm || 8,
  },
  input: {
    minWidth: 64,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    elevation: 8,
  },
});
