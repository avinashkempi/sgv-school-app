import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import Card from "../Card";
import { getGradePalette } from "./ReportCardGauge";

const TARGET_PRESETS = [
  { grade: "A+", label: "90% (A+)", target: 90 },
  { grade: "A", label: "80% (A)", target: 80 },
  { grade: "B+", label: "70% (B+)", target: 70 },
  { grade: "B", label: "60% (B)", target: 60 },
];

export default function TargetScoreCalculator({ exams = [] }) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const [selectedTarget, setSelectedTarget] = useState(90);

  // Weights mapping
  const weights = { FA1: 10, FA2: 10, SA1: 30, FA3: 10, FA4: 10, SA2: 30 };

  // Separate completed and pending exams
  const completedExams = exams.filter(
    (e) => e.isCompleted && e.percentage !== null && e.percentage > 0
  );
  const pendingExams = exams.filter((e) => !e.isCompleted);

  // Calculate current completed weighted sum
  const completedWeightSum = completedExams.reduce(
    (sum, e) => sum + (weights[e.examType] || 0),
    0
  );
  const completedWeightedScore = completedExams.reduce(
    (sum, e) => sum + (e.percentage * (weights[e.examType] || 0)),
    0
  );

  // Total pending weight
  const pendingWeightSum = pendingExams.reduce(
    (sum, e) => sum + (weights[e.examType] || 0),
    0
  );

  // If no pending exams, all exams are done!
  const allCompleted = pendingExams.length === 0;

  // Calculate required percentage in pending exams
  let requiredPercentage = 0;
  let statusType = "achievable"; // 'achieved' | 'achievable' | 'impossible'

  if (!allCompleted && pendingWeightSum > 0) {
    const targetPoints = selectedTarget * (completedWeightSum + pendingWeightSum);
    const neededPoints = targetPoints - completedWeightedScore;
    requiredPercentage = Math.round((neededPoints / pendingWeightSum) * 10) / 10;

    if (requiredPercentage <= 0) {
      statusType = "achieved";
      requiredPercentage = 0;
    } else if (requiredPercentage > 100) {
      statusType = "impossible";
    } else {
      statusType = "achievable";
    }
  }

  const getTargetPalette = () => {
    if (selectedTarget >= 90) return getGradePalette("A+");
    if (selectedTarget >= 80) return getGradePalette("A");
    if (selectedTarget >= 70) return getGradePalette("B+");
    return getGradePalette("B");
  };

  const activePalette = getTargetPalette();

  return (
    <Card
      variant="outlined"
      style={[
        styles.card,
        {
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.08)",
        },
      ]}
      contentStyle={{ padding: 18 }}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.primaryContainer },
          ]}
        >
          <MaterialIcons
            name="track-changes"
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
            Target Goal Simulator
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}
          >
            Calculate marks needed in upcoming exams
          </Text>
        </View>
      </View>

      {/* Target Preset Chips */}
      <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
        SELECT YOUR TARGET OVERALL GRADE
      </Text>
      <View style={styles.presetsRow}>
        {TARGET_PRESETS.map((preset) => {
          const isSelected = selectedTarget === preset.target;
          return (
            <TouchableOpacity
              key={preset.target}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surfaceContainerHigh,
                  borderColor: isSelected
                    ? colors.primary
                    : "transparent",
                },
              ]}
              onPress={() => setSelectedTarget(preset.target)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color: isSelected ? "#FFFFFF" : colors.onSurface,
                    fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results Display */}
      {allCompleted ? (
        <View
          style={[
            styles.resultBox,
            { backgroundColor: colors.surfaceContainerHighest },
          ]}
        >
          <MaterialIcons name="done-all" size={24} color={colors.success} />
          <Text style={[styles.allDoneText, { color: colors.onSurface }]}>
            All academic exams for this term are completed!
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.025)",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
            },
          ]}
        >
          <View style={styles.kpiRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kpiLabel, { color: colors.onSurfaceVariant }]}>
                Required in Remaining (
                {pendingExams.map((e) => e.examType).join(", ")})
              </Text>
              <Text
                style={[
                  styles.kpiValue,
                  {
                    color:
                      statusType === "impossible"
                        ? colors.error
                        : statusType === "achieved"
                        ? colors.success
                        : activePalette.primary,
                  },
                ]}
              >
                {statusType === "impossible"
                  ? "> 100%"
                  : `${requiredPercentage}%`}
              </Text>
            </View>

            <View
              style={[
                styles.badgeStatus,
                {
                  backgroundColor:
                    statusType === "achieved"
                      ? "rgba(16, 185, 129, 0.15)"
                      : statusType === "impossible"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(2, 132, 199, 0.15)",
                },
              ]}
            >
              <MaterialIcons
                name={
                  statusType === "achieved"
                    ? "check-circle"
                    : statusType === "impossible"
                    ? "warning"
                    : "star"
                }
                size={16}
                color={
                  statusType === "achieved"
                    ? colors.success
                    : statusType === "impossible"
                    ? colors.error
                    : colors.primary
                }
              />
              <Text
                style={[
                  styles.badgeStatusText,
                  {
                    color:
                      statusType === "achieved"
                        ? colors.success
                        : statusType === "impossible"
                        ? colors.error
                        : colors.primary,
                  },
                ]}
              >
                {statusType === "achieved"
                  ? "Achieved!"
                  : statusType === "impossible"
                  ? "Stretch Goal"
                  : "Achievable"}
              </Text>
            </View>
          </View>

          {/* Progress gauge bar */}
          {statusType === "achievable" && (
            <View style={styles.meterContainer}>
              <View
                style={[
                  styles.meterTrack,
                  { backgroundColor: colors.surfaceContainerHighest },
                ]}
              >
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${Math.min(requiredPercentage, 100)}%`,
                      backgroundColor: activePalette.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.meterHelper, { color: colors.onSurfaceVariant }]}>
                Score ~{Math.round(requiredPercentage)}% in upcoming exams to reach your {selectedTarget}% goal.
              </Text>
            </View>
          )}

          {statusType === "impossible" && (
            <Text style={[styles.tipText, { color: colors.onSurfaceVariant }]}>
              Tip: Even if 100% isn't reachable for this target, scoring your highest will maximize your class ranking!
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FONT_SIZES.mdLg,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetText: {
    fontSize: FONT_SIZES.xs,
  },
  resultBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  allDoneText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    marginLeft: 8,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  kpiValue: {
    fontSize: 26,
    fontFamily: FONTS.bold,
    marginTop: 2,
    lineHeight: 30,
  },
  badgeStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeStatusText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  meterContainer: {
    gap: 6,
    marginTop: 4,
  },
  meterTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: 3,
  },
  meterHelper: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  tipText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    lineHeight: 16,
  },
});
