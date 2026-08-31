import React, { forwardRef } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AppBottomSheet from "../ui/AppBottomSheet";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { getGradePalette } from "./ReportCardGauge";

const GRADING_SCALE = [
  {
    grade: "A+",
    range: "90% – 100%",
    label: "Outstanding",
    desc: "Exemplary understanding and mastery across all topics.",
  },
  {
    grade: "A",
    range: "70% – 89%",
    label: "Excellent",
    desc: "Thorough conceptual clarity and consistent high performance.",
  },
  {
    grade: "B+",
    range: "50% – 69%",
    label: "Good / Above Average",
    desc: "Solid foundational knowledge with steady achievements.",
  },
  {
    grade: "B",
    range: "30% – 49%",
    label: "Average / Passing",
    desc: "Meets basic requirements with room for focused practice.",
  },
  {
    grade: "C",
    range: "Below 30%",
    label: "Needs Improvement",
    desc: "Requires additional revision and remedial support.",
  },
];

const EXAM_WEIGHTAGES = [
  { name: "FA1", title: "Formative Assessment 1", weight: "10%", type: "Formative" },
  { name: "FA2", title: "Formative Assessment 2", weight: "10%", type: "Formative" },
  { name: "SA1", title: "Summative Assessment 1 (Midterm)", weight: "30%", type: "Summative" },
  { name: "FA3", title: "Formative Assessment 3", weight: "10%", type: "Formative" },
  { name: "FA4", title: "Formative Assessment 4", weight: "10%", type: "Formative" },
  { name: "SA2", title: "Summative Assessment 2 (Final)", weight: "30%", type: "Summative" },
];

const GradingScaleSheet = forwardRef((props, ref) => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <AppBottomSheet
      ref={ref}
      snapPoints={["50%", "85%"]}
      index={-1}
      scrollable={true}
      {...props}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <MaterialIcons
              name="analytics"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                { color: colors.onSurface },
              ]}
            >
              Grading Scheme & Weights
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Continuous & Comprehensive Evaluation
            </Text>
          </View>
        </View>

        {/* Section 1: Grade Bands */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.onSurface },
          ]}
        >
          Grade Criteria
        </Text>
        <View style={styles.tableContainer}>
          {GRADING_SCALE.map((item) => {
            const palette = getGradePalette(item.grade);
            return (
              <View
                key={item.grade}
                style={[
                  styles.gradeRow,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.03)"
                      : "rgba(0, 0, 0, 0.02)",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.gradeBadge,
                    { backgroundColor: palette.bg, borderColor: palette.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.gradeBadgeText,
                      { color: isDark ? palette.darkText : palette.text },
                    ]}
                  >
                    {item.grade}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.rangeRow}>
                    <Text
                      style={[
                        styles.itemLabel,
                        { color: isDark ? palette.darkText : palette.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.itemRange,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {item.range}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.itemDesc,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {item.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Section 2: Weightage Breakdown */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.onSurface, marginTop: 24 },
          ]}
        >
          Assessment Weightages
        </Text>
        <View
          style={[
            styles.weightBox,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(0, 0, 0, 0.02)",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
            },
          ]}
        >
          <View style={styles.weightGrid}>
            {EXAM_WEIGHTAGES.map((exam) => (
              <View key={exam.name} style={styles.weightItem}>
                <View style={styles.weightHeader}>
                  <Text style={[styles.examCode, { color: colors.primary }]}>
                    {exam.name}
                  </Text>
                  <View
                    style={[
                      styles.weightPill,
                      {
                        backgroundColor:
                          exam.type === "Summative"
                            ? colors.primaryContainer
                            : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weightValue,
                        {
                          color:
                            exam.type === "Summative"
                              ? colors.onPrimaryContainer
                              : colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {exam.weight}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.examTitle, { color: colors.onSurfaceVariant }]}
                  numberOfLines={1}
                >
                  {exam.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Formula Note */}
          <View
            style={[
              styles.infoNote,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            <MaterialIcons
              name="info"
              size={18}
              color={colors.primary}
            />
            <Text
              style={[styles.infoNoteText, { color: colors.onSurfaceVariant }]}
            >
              Overall percentage is computed by summing the weighted contributions of all completed exams.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppBottomSheet>
  );
});

GradingScaleSheet.displayName = "GradingScaleSheet";

export default GradingScaleSheet;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 12,
  },
  tableContainer: {
    gap: 8,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  gradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeBadgeText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  itemRange: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  itemDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: 18,
  },
  weightBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  weightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  weightItem: {
    width: "48%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  weightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  examCode: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  weightPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  weightValue: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  examTitle: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.regular,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
});
