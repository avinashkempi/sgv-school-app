import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
} from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import Card from "../Card";
import { getGradePalette } from "./ReportCardGauge";

export default function ReportCardTrends({
  insightsData,
  reportCardData,
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const screenWidth = Dimensions.get("window").width;

  const [selectedExamIndex, setSelectedExamIndex] = useState(null);

  // Extract exam trend data
  const rawExamTrends =
    insightsData?.examTrends ||
    reportCardData?.exams?.map((e) => ({
      exam: e.examType,
      percentage: e.percentage || 0,
      isCompleted: e.isCompleted,
    })) ||
    [];

  const examTrends = rawExamTrends.map((e) => ({
    exam: e.exam || e.examType,
    percentage: typeof e.percentage === "number" ? e.percentage : parseFloat(e.percentage) || 0,
    isCompleted: e.isCompleted !== false && (typeof e.percentage === "number" ? e.percentage > 0 : parseFloat(e.percentage) > 0),
  }));

  // Completed points for SVG plotting
  const validPoints = examTrends.filter((e) => e.percentage > 0);

  // Layout calculations for SVG
  const chartWidth = screenWidth - 64;
  const chartHeight = 180;
  const padLeft = 32;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 28;
  const plotWidth = Math.max(chartWidth - padLeft - padRight, 100);
  const plotHeight = chartHeight - padTop - padBottom;

  const points = validPoints.map((d, index) => {
    let x = padLeft + plotWidth / 2;
    if (validPoints.length > 1) {
      x = padLeft + (index / (validPoints.length - 1)) * plotWidth;
    }
    const clampedPct = Math.max(0, Math.min(100, d.percentage));
    const y = padTop + plotHeight - (clampedPct / 100) * plotHeight;
    return { x, y, ...d };
  });

  // Calculate smooth Bezier path
  let strokePath = "";
  let areaPath = "";

  if (points.length === 1) {
    strokePath = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`;
    areaPath = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y} L ${points[0].x + 20} ${padTop + plotHeight} L ${points[0].x - 20} ${padTop + plotHeight} Z`;
  } else if (points.length >= 2) {
    strokePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const tension = 0.2;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      strokePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    const lastP = points[points.length - 1];
    const firstP = points[0];
    areaPath = `${strokePath} L ${lastP.x} ${padTop + plotHeight} L ${firstP.x} ${padTop + plotHeight} Z`;
  }

  // Active selected exam point
  const activeIdx =
    selectedExamIndex !== null && selectedExamIndex < validPoints.length
      ? selectedExamIndex
      : validPoints.length - 1;
  const activePoint = validPoints[activeIdx] || validPoints[0];
  const activeExamReport = reportCardData?.exams?.find(
    (e) => e.examType === activePoint?.exam
  );

  // Calculate delta vs previous
  const prevPoint = activeIdx > 0 ? validPoints[activeIdx - 1] : null;
  const delta = prevPoint
    ? parseFloat((activePoint.percentage - prevPoint.percentage).toFixed(1))
    : null;

  // Extract Subject Summaries
  const subjectSummaries =
    insightsData?.subjectSummary ||
    (() => {
      const subjectMap = {};
      reportCardData?.exams?.forEach((exam) => {
        if (exam.isCompleted && Array.isArray(exam.subjects)) {
          exam.subjects.forEach((sub) => {
            if (sub.obtainedMarks !== null) {
              if (!subjectMap[sub.subject]) {
                subjectMap[sub.subject] = { total: 0, max: 0, count: 0 };
              }
              subjectMap[sub.subject].total += sub.obtainedMarks;
              subjectMap[sub.subject].max += sub.maxMarks;
              subjectMap[sub.subject].count++;
            }
          });
        }
      });

      return Object.keys(subjectMap)
        .map((name) => {
          const s = subjectMap[name];
          const avg = s.max > 0 ? (s.total / s.max) * 100 : 0;
          return {
            subject: name,
            average: parseFloat(avg.toFixed(1)),
            examCount: s.count,
          };
        })
        .sort((a, b) => b.average - a.average);
    })();

  const classAverage = reportCardData?.classStatistics?.classAverage || 68.4;

  return (
    <View style={styles.container}>
      {/* 1. Spline Performance Trend Card */}
      <Card variant="filled" style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Performance Trajectory
            </Text>
            <Text
              style={[styles.cardSub, { color: colors.onSurfaceVariant }]}
            >
              Term progression across assessments
            </Text>
          </View>

          {delta !== null && (
            <View
              style={[
                styles.deltaBadge,
                {
                  backgroundColor:
                    delta >= 0
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                },
              ]}
            >
              <MaterialIcons
                name={delta >= 0 ? "trending-up" : "trending-down"}
                size={16}
                color={delta >= 0 ? colors.success : colors.error}
              />
              <Text
                style={[
                  styles.deltaText,
                  { color: delta >= 0 ? colors.success : colors.error },
                ]}
              >
                {delta >= 0 ? `+${delta}%` : `${delta}%`}
              </Text>
            </View>
          )}
        </View>

        {/* Selected Exam Highlight Banner */}
        {activePoint && (
          <View
            style={[
              styles.inspectorBanner,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.03)",
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View>
              <Text style={[styles.inspExamName, { color: colors.onSurface }]}>
                {activePoint.exam} Assessment
              </Text>
              <Text
                style={[styles.inspHelper, { color: colors.onSurfaceVariant }]}
              >
                {activeExamReport?.classRank
                  ? `Rank #${activeExamReport.classRank} in Class`
                  : "Score Recorded"}
              </Text>
            </View>
            <View style={styles.inspScoreWrap}>
              <Text style={[styles.inspScore, { color: colors.primary }]}>
                {activePoint.percentage}%
              </Text>
            </View>
          </View>
        )}

        {/* SVG Chart */}
        {points.length > 0 ? (
          <View style={styles.chartWrapper}>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.35" />
                  <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Y Axis Grid Lines (25, 50, 75, 100) */}
              {[25, 50, 75, 100].map((lvl) => {
                const y = padTop + plotHeight - (lvl / 100) * plotHeight;
                return (
                  <React.Fragment key={lvl}>
                    <Line
                      x1={padLeft}
                      y1={y}
                      x2={chartWidth - padRight}
                      y2={y}
                      stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <SvgText
                      x={padLeft - 6}
                      y={y + 3}
                      fill={colors.onSurfaceVariant}
                      fontSize="9"
                      fontFamily={FONTS.regular}
                      textAnchor="end"
                    >
                      {lvl}%
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Class Average Reference Line */}
              {classAverage > 0 && (
                <Line
                  x1={padLeft}
                  y1={padTop + plotHeight - (classAverage / 100) * plotHeight}
                  x2={chartWidth - padRight}
                  y2={padTop + plotHeight - (classAverage / 100) * plotHeight}
                  stroke={colors.tertiary || "#F59E0B"}
                  strokeDasharray="2 2"
                  strokeWidth="1.2"
                  opacity="0.6"
                />
              )}

              {/* Gradient Fill Area Under Curve */}
              {areaPath !== "" && <Path d={areaPath} fill="url(#trendGradient)" />}

              {/* Smooth Stroke Line */}
              {strokePath !== "" && (
                <Path
                  d={strokePath}
                  stroke={colors.primary}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              )}

              {/* Touch Points & Labels */}
              {points.map((p, i) => {
                const isSelected = activeIdx === i;
                return (
                  <React.Fragment key={p.exam}>
                    {/* Outer glow ring for selected */}
                    {isSelected && (
                      <Circle
                        cx={p.x}
                        cy={p.y}
                        r="10"
                        fill={colors.primary}
                        opacity="0.2"
                      />
                    )}
                    {/* Inner point dot */}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? "5.5" : "4"}
                      fill={isSelected ? "#FFF" : colors.primary}
                      stroke={colors.primary}
                      strokeWidth="2.5"
                    />
                    {/* X-axis Exam Label */}
                    <SvgText
                      x={p.x}
                      y={chartHeight - 8}
                      fill={isSelected ? colors.primary : colors.onSurfaceVariant}
                      fontSize="10"
                      fontFamily={isSelected ? FONTS.bold : FONTS.medium}
                      textAnchor="middle"
                    >
                      {p.exam}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>

            {/* Tap handlers overlay */}
            <View style={[styles.touchRow, { width: chartWidth, left: 0 }]}>
              {points.map((p, idx) => (
                <TouchableOpacity
                  key={p.exam}
                  style={styles.touchArea}
                  onPress={() => setSelectedExamIndex(idx)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: FONT_SIZES.sm }}>
              Trend data will appear as exam marks are published.
            </Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
              Your Marks %
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.tertiary || "#F59E0B" },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
              Class Avg ({classAverage}%)
            </Text>
          </View>
        </View>
      </Card>

      {/* 2. Subject Mastery Matrix */}
      <Card variant="filled" style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Subject Mastery Matrix
            </Text>
            <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
              Ranked average across all exams
            </Text>
          </View>
        </View>

        <View style={styles.subjectList}>
          {subjectSummaries.map((sub, idx) => {
            const palette = getGradePalette(
              sub.average >= 90
                ? "A+"
                : sub.average >= 70
                ? "A"
                : sub.average >= 50
                ? "B+"
                : sub.average >= 30
                ? "B"
                : "C"
            );
            const isTop = idx === 0;
            const isBottom =
              idx === subjectSummaries.length - 1 &&
              subjectSummaries.length > 2;

            return (
              <View key={sub.subject} style={styles.subjectRow}>
                <View style={styles.subTitleRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      style={[
                        styles.subName,
                        { color: colors.onSurface },
                      ]}
                    >
                      {sub.subject}
                    </Text>
                    {isTop && (
                      <View style={styles.topBadge}>
                        <MaterialIcons name="star" size={12} color="#D97706" />
                        <Text style={styles.topBadgeText}>Top</Text>
                      </View>
                    )}
                    {isBottom && (
                      <View style={styles.focusBadge}>
                        <Text style={styles.focusBadgeText}>Focus</Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.subAvg,
                      { color: isDark ? palette.darkText : palette.text },
                    ]}
                  >
                    {sub.average}%
                  </Text>
                </View>

                {/* Progress bar */}
                <View
                  style={[
                    styles.subTrack,
                    { backgroundColor: colors.surfaceContainerHighest },
                  ]}
                >
                  <View
                    style={[
                      styles.subFill,
                      {
                        width: `${Math.min(sub.average, 100)}%`,
                        backgroundColor: palette.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  cardSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  deltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deltaText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  inspectorBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  inspExamName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  inspHelper: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  inspScoreWrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  inspScore: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  chartWrapper: {
    position: "relative",
    alignItems: "center",
    marginVertical: 4,
  },
  touchRow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
  },
  touchArea: {
    flex: 1,
    height: "100%",
  },
  emptyBox: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  subjectList: {
    gap: 14,
    marginTop: 4,
  },
  subjectRow: {
    gap: 6,
  },
  subTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  subAvg: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  topBadgeText: {
    color: "#D97706",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  focusBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  focusBadgeText: {
    color: "#DC2626",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  subTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  subFill: {
    height: "100%",
    borderRadius: 3,
  },
});
