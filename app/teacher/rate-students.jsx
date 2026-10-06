import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, RADIUS, SPACING } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/ui/Badge";
import UserAvatar from "../../components/ui/UserAvatar";
import ProgressBar from "../../components/ui/ProgressBar";
import TextInput from "../../components/TextInput";
import { LoadingState, EmptyState } from "../../components/StateComponents";
import { useLabel } from "../../context/LabelsContext";

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

const DATA_POINTS = [
  {
    key: "classEngagement",
    label: "Class Engagement",
    desc: "Attentiveness, listening, participation, and answering questions",
    icon: "record-voice-over",
  },
  {
    key: "homeworkClasswork",
    label: "Homework & Classwork",
    desc: "Completes homework & classwork on time, regularly, and responsibly",
    icon: "assignment-turned-in",
  },
  {
    key: "behaviourSocial",
    label: "Behaviour & Social Skills",
    desc: "Discipline, respectful behaviour, cooperation, and teamwork",
    icon: "groups",
  },
  {
    key: "englishComm",
    label: "English Communication",
    desc: "Speaks in English, expresses ideas clearly, communicates confidently",
    icon: "chat",
  },
];

const SCALE_LABELS = {
  1: {
    label: "Needs significant improvement",
    shortLabel: "Significant Imp.",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: "warning",
  },
  2: {
    label: "Needs improvement",
    shortLabel: "Needs Imp.",
    color: "#EA580C",
    bg: "#FFEDD5",
    icon: "trending-down",
  },
  3: {
    label: "Average / Meets expectation",
    shortLabel: "Meets Expectation",
    color: "#6750A4",
    bg: "#EADDFF",
    icon: "done",
  },
  4: {
    label: "Good",
    shortLabel: "Good",
    color: "#16A34A",
    bg: "#DCFCE7",
    icon: "thumb-up",
  },
  5: {
    label: "Excellent",
    shortLabel: "Excellent",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "star",
  },
};

export default function RateStudentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    subjectId,
    subjectName = "Subject",
    className = "Class",
    month: monthParam,
    year: yearParam,
  } = params;

  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { t } = useLabel();

  const month = parseInt(monthParam, 10) || new Date().getMonth() + 1;
  const year = parseInt(yearParam, 10) || new Date().getFullYear();
  const monthName = MONTH_NAMES[month - 1];

  // Local ratings state map: { [studentId]: { classEngagement, homeworkClasswork, behaviourSocial, englishComm } }
  const [ratingsMap, setRatingsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'unrated' | 'rated'
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch subject details and existing ratings
  const {
    data: subjectData,
    isLoading,
    refetch,
  } = useApiQuery(
    ["subjectRatings", subjectId, month, year],
    `${apiConfig.baseUrl}/student-ratings/subject/${subjectId}?month=${month}&year=${year}`,
    {
      enabled: !!subjectId,
    }
  );

  const students = useMemo(
    () => subjectData?.students || [],
    [subjectData?.students]
  );

  // Initialize ratings from fetched data
  useEffect(() => {
    if (students.length > 0) {
      const initialMap = {};
      students.forEach((item) => {
        if (item.rating) {
          initialMap[item._id] = {
            classEngagement: item.rating.classEngagement,
            homeworkClasswork: item.rating.homeworkClasswork,
            behaviourSocial: item.rating.behaviourSocial,
            englishComm: item.rating.englishComm,
          };
        }
      });
      setRatingsMap(initialMap);
      setHasUnsavedChanges(false);
    }
  }, [students]);

  // Bulk save mutation
  const bulkSaveMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/student-ratings/bulk`,
      "POST"
    ),
  });

  // Calculate live completion count
  const ratedStudentIds = useMemo(() => {
    return Object.keys(ratingsMap).filter((id) => {
      const r = ratingsMap[id];
      return (
        r &&
        r.classEngagement >= 1 &&
        r.homeworkClasswork >= 1 &&
        r.behaviourSocial >= 1 &&
        r.englishComm >= 1
      );
    });
  }, [ratingsMap]);

  const ratedCount = ratedStudentIds.length;
  const totalCount = students.length;
  const completionPercent =
    totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0;

  // Filtered students for list display
  const filteredStudents = useMemo(() => {
    let list = students;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = (s.name || "").toLowerCase();
        const regNo = (s.regNo || "").toLowerCase();
        return name.includes(q) || regNo.includes(q);
      });
    }

    if (filterTab === "unrated") {
      list = list.filter((s) => !ratedStudentIds.includes(s._id));
    } else if (filterTab === "rated") {
      list = list.filter((s) => ratedStudentIds.includes(s._id));
    }

    return list;
  }, [students, searchQuery, filterTab, ratedStudentIds]);

  // Handle single criteria rating tap
  const handleRate = useCallback(
    (studentId, criteriaKey, score) => {
      Haptics.selectionAsync().catch(() => {});
      setRatingsMap((prev) => {
        const studentRatings = prev[studentId] || {};
        return {
          ...prev,
          [studentId]: {
            ...studentRatings,
            [criteriaKey]: score,
          },
        };
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Quick preset action: set all 4 points for a student to a specific score (e.g. 3)
  const handleQuickFill = useCallback(
    (studentId, score) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setRatingsMap((prev) => ({
        ...prev,
        [studentId]: {
          classEngagement: score,
          homeworkClasswork: score,
          behaviourSocial: score,
          englishComm: score,
        },
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Save all completed ratings
  const handleSave = async () => {
    // Only send entries that have all 4 data points filled
    const validEntries = Object.entries(ratingsMap)
      .filter(([_, r]) => {
        return (
          r &&
          r.classEngagement >= 1 &&
          r.homeworkClasswork >= 1 &&
          r.behaviourSocial >= 1 &&
          r.englishComm >= 1
        );
      })
      .map(([studentId, r]) => ({
        studentId,
        classEngagement: r.classEngagement,
        homeworkClasswork: r.homeworkClasswork,
        behaviourSocial: r.behaviourSocial,
        englishComm: r.englishComm,
      }));

    if (validEntries.length === 0) {
      showToast(
        t(
          "teacher.noCompleteRatingsToSave",
          "Please rate at least one student on all 4 criteria to save."
        ),
        "warning"
      );
      return;
    }

    setIsSaving(true);
    try {
      await bulkSaveMutation.mutateAsync({
        subjectId,
        month,
        year,
        ratings: validEntries,
      });

      setHasUnsavedChanges(false);
      showToast(
        t(
          "teacher.ratingsSavedSuccess",
          `Ratings saved successfully for ${validEntries.length} student(s)!`
        ),
        "success"
      );

      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["teacherRatingsSubjects", month, year],
        }),
        queryClient.invalidateQueries({
          queryKey: ["subjectRatings", subjectId, month, year],
        }),
        queryClient.invalidateQueries({ queryKey: ["submissionTracker"] }),
      ]);
      refetch();
    } catch (err) {
      console.error("Error saving ratings:", err);
      showToast(
        err?.message ||
          t("teacher.failedToSaveRatings", "Failed to save ratings. Please try again."),
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        t("common.unsavedChanges", "Unsaved Changes"),
        t(
          "teacher.unsavedRatingsWarning",
          "You have unsaved ratings. Are you sure you want to go back? Unsaved progress will be lost."
        ),
        [
          { text: t("common.cancel", "Cancel"), style: "cancel" },
          {
            text: t("common.discard", "Discard & Leave"),
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // Render individual student card
  const renderStudentItem = ({ item: student }) => {
    const studentRating = ratingsMap[student._id] || {};
    const isComplete =
      studentRating.classEngagement >= 1 &&
      studentRating.homeworkClasswork >= 1 &&
      studentRating.behaviourSocial >= 1 &&
      studentRating.englishComm >= 1;

    // Calculate student average score if partially or fully rated
    const validScores = [
      studentRating.classEngagement,
      studentRating.homeworkClasswork,
      studentRating.behaviourSocial,
      studentRating.englishComm,
    ].filter((s) => s >= 1);

    const averageScore =
      validScores.length > 0
        ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
        : null;

    return (
      <Card
        variant="elevated"
        style={[
          styles.studentCard,
          isComplete && {
            borderColor: colors.outlineVariant,
          },
        ]}
        contentStyle={styles.studentCardContent}
      >
        {/* Student Header */}
        <View style={styles.studentHeader}>
          <View style={styles.studentIdentityRow}>
            <UserAvatar user={student} size={42} />
            <View style={styles.studentTextInfo}>
              <Text
                style={[styles.studentName, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {student.name}
              </Text>
              <Text
                style={[
                  styles.studentRoll,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {student.regNo ? `Reg: ${student.regNo}` : "Student"} •{" "}
                {student.gender || "Student"}
              </Text>
            </View>
          </View>

          {/* Right Status Badge & Live Average */}
          <View style={styles.studentStatusCol}>
            {isComplete ? (
              <Badge
                variant="success"
                icon="check-circle"
                label={`★ ${averageScore}`}
                size="md"
              />
            ) : validScores.length > 0 ? (
              <Badge
                variant="warning"
                icon="hourglass-empty"
                label={`${validScores.length}/4 Rated`}
                size="sm"
              />
            ) : (
              <Badge
                variant="neutral"
                label={t("common.unrated", "Unrated")}
                size="sm"
              />
            )}
          </View>
        </View>

        {/* Quick Fill Row */}
        <View
          style={[
            styles.quickFillRow,
            {
              backgroundColor: colors.surfaceContainer || "#F3F4F6",
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <Text
            style={[styles.quickFillLabel, { color: colors.onSurfaceVariant }]}
          >
            Quick Rate:
          </Text>
          <View style={styles.quickFillButtons}>
            {[
              { val: 3, label: "All 3s (Average)" },
              { val: 4, label: "All 4s (Good)" },
              { val: 5, label: "All 5s (Top)" },
            ].map((preset) => (
              <TouchableOpacity
                key={preset.val}
                onPress={() => handleQuickFill(student._id, preset.val)}
                style={[
                  styles.quickFillPill,
                  {
                    backgroundColor: colors.surfaceContainerLowest || colors.surface,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickFillPillText,
                    { color: colors.primary },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* The 4 Criteria Rating Rows */}
        <View style={styles.criteriaContainer}>
          {DATA_POINTS.map((dp) => {
            const currentScore = studentRating[dp.key];
            const currentLabelInfo = currentScore
              ? SCALE_LABELS[currentScore]
              : null;

            return (
              <View key={dp.key} style={styles.criteriaRow}>
                <View style={styles.criteriaMeta}>
                  <Text
                    style={[
                      styles.criteriaLabel,
                      { color: colors.onSurface },
                    ]}
                  >
                    {dp.label}
                  </Text>
                  {currentLabelInfo && (
                    <Text
                      style={[
                        styles.criteriaScoreDesc,
                        { color: currentLabelInfo.color },
                      ]}
                    >
                      {currentLabelInfo.shortLabel}
                    </Text>
                  )}
                </View>

                {/* 1-5 Chip Buttons */}
                <View style={styles.chipsRow}>
                  {[1, 2, 3, 4, 5].map((score) => {
                    const isSelected = currentScore === score;
                    const scaleInfo = SCALE_LABELS[score];

                    return (
                      <TouchableOpacity
                        key={score}
                        onPress={() => handleRate(student._id, dp.key, score)}
                        style={[
                          styles.chipButton,
                          {
                            backgroundColor: isSelected
                              ? scaleInfo.color
                              : colors.surfaceContainerHighest || "#E5E7EB",
                            borderColor: isSelected
                              ? scaleInfo.color
                              : "transparent",
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected ? "#FFFFFF" : colors.onSurface,
                              fontFamily: isSelected
                                ? FONTS.bold
                                : FONTS.medium,
                            },
                          ]}
                        >
                          {score}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <AppHeader
          title={`${subjectName} Ratings`}
          subtitle={`${className} • ${monthName} ${year}`}
          showBack={true}
          onBack={handleBack}
          rightAction={
            <TouchableOpacity
              onPress={() => setShowGuideModal(true)}
              style={[
                styles.guideHeaderBtn,
                { backgroundColor: colors.primaryContainer || "#EADDFF" },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="help-outline"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Progress & Search Top Panel */}
      <View
        style={[
          styles.topControlPanel,
          {
            backgroundColor: colors.surfaceContainerLow || colors.surface,
            borderBottomColor: colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.progressSummaryRow}>
          <Text
            style={[styles.progressCountText, { color: colors.onSurface }]}
          >
            {ratedCount} of {totalCount} Students Rated
          </Text>
          <Text
            style={[
              styles.progressPercentText,
              {
                color:
                  completionPercent === 100
                    ? colors.success
                    : colors.primary,
              },
            ]}
          >
            {completionPercent}%
          </Text>
        </View>

        <ProgressBar
          progress={completionPercent}
          max={100}
          variant={completionPercent === 100 ? "success" : "primary"}
          height={6}
          borderRadius={3}
          style={{ marginBottom: 10 }}
        />

        {/* Filter Pills + Search */}
        <View style={styles.filterPillsRow}>
          {[
            { key: "all", label: `All (${totalCount})` },
            { key: "unrated", label: `Unrated (${totalCount - ratedCount})` },
            { key: "rated", label: `Rated (${ratedCount})` },
          ].map((pill) => {
            const isActive = filterTab === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setFilterTab(pill.key);
                }}
                style={[
                  styles.filterPillBtn,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.surfaceContainer,
                    borderColor: isActive
                      ? colors.primary
                      : colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isActive
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                      fontFamily: isActive ? FONTS.bold : FONTS.medium,
                    },
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search input */}
        <View style={{ marginTop: 8 }}>
          <TextInput
            placeholder={t(
              "teacher.searchStudentsPlaceholder",
              "Search student by name or roll..."
            )}
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon="search"
            clearButton={true}
            size="sm"
          />
        </View>
      </View>

      {/* Main Student List */}
      {isLoading ? (
        <View style={{ marginTop: 60, flex: 1 }}>
          <LoadingState
            message={t("teacher.loadingClassStudents", "Loading students...")}
          />
        </View>
      ) : students.length === 0 ? (
        <View style={{ marginTop: 40, flex: 1 }}>
          <EmptyState
            icon="people-outline"
            title={t("teacher.noStudentsFound", "No Students Found")}
            message={t(
              "teacher.noStudentsInClass",
              "There are no active students in this class for the selected academic year."
            )}
          />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item._id}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ marginTop: 24 }}>
              <EmptyState
                icon="search-off"
                title={t("teacher.noMatchingStudents", "No matching students")}
                message={t(
                  "teacher.tryDifferentFilter",
                  "Try a different search term or filter tab."
                )}
              />
            </View>
          }
        />
      )}

      {/* Sticky Bottom Save Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.outlineVariant,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={styles.bottomMeta}>
          <Text
            style={[styles.bottomStatusText, { color: colors.onSurface }]}
          >
            {ratedCount} / {totalCount} completed
          </Text>
          {hasUnsavedChanges ? (
            <View style={styles.unsavedDotRow}>
              <View
                style={[
                  styles.unsavedDot,
                  { backgroundColor: colors.tertiary || "#D97706" },
                ]}
              />
              <Text
                style={[
                  styles.unsavedText,
                  { color: colors.tertiary || "#D97706" },
                ]}
              >
                Unsaved edits
              </Text>
            </View>
          ) : (
            <Text
              style={[styles.allSavedText, { color: colors.success || "#16A34A" }]}
            >
              All saved
            </Text>
          )}
        </View>

        <Button
          title={
            isSaving
              ? t("common.saving", "Saving...")
              : t("common.saveRatings", "Save Ratings")
          }
          variant="filled"
          size="md"
          loading={isSaving}
          disabled={isSaving || ratedCount === 0}
          icon="save"
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </View>

      {/* Rating Guidelines Modal */}
      <Modal
        visible={showGuideModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGuideModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="menu-book" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  Rating Guide
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGuideModal(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <Text style={[styles.guideSectionTitle, { color: colors.primary }]}>
                1 to 5 Score Meaning
              </Text>
              {Object.entries(SCALE_LABELS).map(([num, item]) => (
                <View key={num} style={styles.scaleGuideRow}>
                  <View
                    style={[
                      styles.scaleGuideNum,
                      { backgroundColor: item.bg, borderColor: item.color },
                    ]}
                  >
                    <Text style={[styles.scaleGuideNumText, { color: item.color }]}>
                      {num}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scaleGuideLabel, { color: colors.onSurface }]}>
                      {item.label}
                    </Text>
                  </View>
                </View>
              ))}

              <View style={[styles.guideDivider, { backgroundColor: colors.outlineVariant }]} />

              <Text style={[styles.guideSectionTitle, { color: colors.primary }]}>
                The 4 Evaluation Criteria
              </Text>
              {DATA_POINTS.map((dp) => (
                <View key={dp.key} style={styles.criteriaGuideItem}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <MaterialIcons name={dp.icon} size={18} color={colors.primary} />
                    <Text style={[styles.criteriaGuideLabel, { color: colors.onSurface }]}>
                      {dp.label}
                    </Text>
                  </View>
                  <Text style={[styles.criteriaGuideDesc, { color: colors.onSurfaceVariant }]}>
                    {dp.desc}
                  </Text>
                </View>
              ))}

              <View
                style={[
                  styles.guideNoticeBox,
                  { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
                ]}
              >
                <MaterialIcons name="info" size={18} color={colors.primary} />
                <Text style={[styles.guideNoticeText, { color: colors.onSurfaceVariant }]}>
                  Ratings are confidential and evaluated monthly by school leaders to track student growth and identify learning gaps.
                </Text>
              </View>
            </ScrollView>

            <Button
              title="Got It"
              variant="filled"
              size="md"
              fullWidth={true}
              onPress={() => setShowGuideModal(false)}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
  },
  guideHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topControlPanel: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  progressSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressCountText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
  },
  progressPercentText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPillBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full || 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: FONT_SIZES.xs,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    paddingBottom: 100, // Space for sticky bottom bar
  },
  studentCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  studentCardContent: {
    padding: 14,
  },
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  studentIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  studentTextInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  studentRoll: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  studentStatusCol: {
    alignItems: "flex-end",
  },
  quickFillRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  quickFillLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  quickFillButtons: {
    flexDirection: "row",
    flex: 1,
    gap: 6,
    justifyContent: "flex-end",
  },
  quickFillPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  quickFillPillText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },
  criteriaContainer: {
    gap: 10,
  },
  criteriaRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 8,
  },
  criteriaMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  criteriaLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
  },
  criteriaScoreDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  chipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  chipButton: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  bottomMeta: {
    flex: 1,
  },
  bottomStatusText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  unsavedDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  unsavedText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  allSavedText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  saveBtn: {
    minWidth: 140,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: "85%",
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  modalCloseBtn: {
    padding: 4,
  },
  guideSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scaleGuideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  scaleGuideNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleGuideNumText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  scaleGuideLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  guideDivider: {
    height: 1,
    marginVertical: 14,
  },
  criteriaGuideItem: {
    marginBottom: 10,
  },
  criteriaGuideLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  criteriaGuideDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    lineHeight: 16,
  },
  guideNoticeBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 10,
    alignItems: "center",
  },
  guideNoticeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 16,
  },
});
