import React, { useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
  G,
  Rect,
} from "react-native-svg";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../../theme";

/**
 * Standardized Letter Grade & Performance Helper
 */
const getGradeInfo = (percentage) => {
  const p = Number(percentage) || 0;
  if (p >= 90)
    return {
      grade: "A+",
      label: "Outstanding",
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
    };
  if (p >= 80)
    return {
      grade: "A",
      label: "Excellent",
      color: "#059669",
      bg: "rgba(5, 150, 105, 0.12)",
      border: "rgba(5, 150, 105, 0.3)",
    };
  if (p >= 70)
    return {
      grade: "B+",
      label: "Very Good",
      color: "#0284C7",
      bg: "rgba(2, 132, 199, 0.12)",
      border: "rgba(2, 132, 199, 0.3)",
    };
  if (p >= 60)
    return {
      grade: "B",
      label: "Good",
      color: "#6366F1",
      bg: "rgba(99, 102, 241, 0.12)",
      border: "rgba(99, 102, 241, 0.3)",
    };
  if (p >= 50)
    return {
      grade: "C",
      label: "Average",
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.12)",
      border: "rgba(217, 119, 6, 0.3)",
    };
  if (p >= 35)
    return {
      grade: "D",
      label: "Passing",
      color: "#EA580C",
      bg: "rgba(234, 88, 12, 0.12)",
      border: "rgba(234, 88, 12, 0.3)",
    };
  return {
    grade: "F",
    label: "Needs Focus",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.12)",
    border: "rgba(220, 38, 38, 0.3)",
  };
};

/**
 * PerformanceTrendCard (Redesigned & Decluttered)
 * Streamlined, grade-first exam trend visualizer that integrates Letter Grades directly
 * into chart nodes and hero metrics without repetitive cards or number overload.
 */
const PerformanceTrendCard = ({
  data = [],
  title = "Academic Performance",
  subtitle = "Exam Progression",
  onViewReport,
  embedded = false,
}) => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const [cardWidth, setCardWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const isDark = mode === "dark";

  // Normalize incoming exam trend data
  const normalizedData = (Array.isArray(data) ? data : [])
    .filter((d) => d && (d.examType || d.label))
    .map((d, index) => {
      const rawPct =
        typeof d.percentage === "number"
          ? d.percentage
          : typeof d.value === "number"
          ? d.value
          : 0;
      return {
        examType: d.examType || d.label || `Exam ${index + 1}`,
        percentage: Math.round(Number(rawPct) * 10) / 10,
        subjectCount: d.subjectCount || 0,
      };
    });

  if (normalizedData.length === 0) {
    return null;
  }

  // Key Metrics
  const latestIdx = normalizedData.length - 1;

  const totalPercentage = normalizedData.reduce(
    (acc, curr) => acc + curr.percentage,
    0
  );
  const yearAverage =
    Math.round((totalPercentage / normalizedData.length) * 10) / 10;
  const yearGrade = getGradeInfo(yearAverage);

  // Active exam (selected or latest)
  const activeIdx =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < normalizedData.length
      ? selectedIndex
      : latestIdx;

  const activeExam = normalizedData[activeIdx];
  const activeGrade = getGradeInfo(activeExam.percentage);
  const isLatestSelected = activeIdx === latestIdx;

  const previousExam = activeIdx > 0 ? normalizedData[activeIdx - 1] : null;
  const deltaVsPrev = previousExam
    ? Math.round((activeExam.percentage - previousExam.percentage) * 10) / 10
    : null;

  // Layout width
  const fallbackWidth = Dimensions.get("window").width - 32;
  const effectiveWidth = cardWidth > 0 ? cardWidth : fallbackWidth;

  // SVG Chart Dimensions (Compact 140px height)
  const svgHeight = 145;
  const paddingLeft = 36;
  const paddingRight = 24;
  const paddingTop = 32;
  const paddingBottom = 28;

  const plotWidth = Math.max(effectiveWidth - paddingLeft - paddingRight, 100);
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinates
  const points = normalizedData.map((d, index) => {
    let x = paddingLeft + plotWidth / 2;
    if (normalizedData.length > 1) {
      x = paddingLeft + (index / (normalizedData.length - 1)) * plotWidth;
    }
    const clampedPct = Math.max(0, Math.min(100, d.percentage));
    const y = paddingTop + plotHeight - (clampedPct / 100) * plotHeight;
    return { x, y, ...d };
  });

  // Smooth Bezier Curve Path
  let strokePath = "";
  let areaPath = "";

  if (points.length === 1) {
    strokePath = `M ${points[0].x - 24} ${points[0].y} L ${points[0].x + 24} ${points[0].y}`;
    areaPath = `M ${points[0].x - 24} ${points[0].y} L ${points[0].x + 24} ${points[0].y} L ${points[0].x + 24} ${paddingTop + plotHeight} L ${points[0].x - 24} ${paddingTop + plotHeight} Z`;
  } else if (points.length === 2) {
    const cp1x = points[0].x + (points[1].x - points[0].x) * 0.45;
    const cp1y = points[0].y;
    const cp2x = points[1].x - (points[1].x - points[0].x) * 0.45;
    const cp2y = points[1].y;
    strokePath = `M ${points[0].x} ${points[0].y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[1].x} ${points[1].y}`;
    areaPath = `${strokePath} L ${points[1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`;
  } else {
    strokePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const tension = 0.18;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      strokePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    const lastP = points[points.length - 1];
    const firstP = points[0];
    areaPath = `${strokePath} L ${lastP.x} ${paddingTop + plotHeight} L ${firstP.x} ${paddingTop + plotHeight} Z`;
  }

  const yGridLevels = [100, 75, 50];

  const handleSelectExam = (idx) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedIndex(idx);
  };

  const handleNavigation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onViewReport) {
      onViewReport();
    } else {
      router.push("/student/report-card");
    }
  };

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - cardWidth) > 5) {
          setCardWidth(w);
        }
      }}
      style={
        embedded
          ? { width: "100%" }
          : {
              backgroundColor: colors.surfaceContainerLow || colors.surface,
              borderRadius: RADIUS.lg || 18,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }
      }
    >
      {/* Header (when not embedded) */}
      {!embedded && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons
              name="chart-line"
              size={22}
              color={colors.primary}
            />
            <View>
              <Text style={{ fontSize: FONT_SIZES.md, fontFamily: FONTS.bold, color: colors.onSurface }}>
                {title}
              </Text>
              <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.regular, color: colors.onSurfaceVariant }}>
                {subtitle}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleNavigation}
            style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
          >
            <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.bold, color: colors.primary }}>
              Reports
            </Text>
            <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED GRADE HERO SHOWCASE (Consolidated & Clutter-Free)  */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <View
        style={{
          backgroundColor: activeGrade.bg,
          borderColor: activeGrade.border,
          borderWidth: 1,
          borderRadius: RADIUS.md || 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left: Exam Identifier & Year Cumulative Context */}
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                }}
              >
                {activeExam.examType}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: FONTS.semiBold,
                  color: isLatestSelected ? colors.primary : colors.onSurfaceVariant,
                }}
              >
                {isLatestSelected ? "(Latest Exam)" : "(Selected Exam)"}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 11,
                fontFamily: FONTS.regular,
                color: colors.onSurfaceVariant,
              }}
              numberOfLines={1}
            >
              {activeExam.subjectCount > 0
                ? `${activeExam.subjectCount} Subjects Evaluated • `
                : ""}
              Year Avg: {yearAverage}% ({yearGrade.grade})
            </Text>
          </View>

          {/* Right: Grade Pill, Percentage, & Performance Label */}
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {/* Prominent Letter Grade Badge */}
              <View
                style={{
                  backgroundColor: activeGrade.color,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: RADIUS.sm || 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: FONTS.bold,
                    color: "#FFFFFF",
                  }}
                >
                  Grade {activeGrade.grade}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: activeGrade.color,
                }}
              >
                {activeExam.percentage}%
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: FONTS.medium,
                  color: activeGrade.color,
                }}
              >
                {activeGrade.label}
              </Text>

              {deltaVsPrev !== null && (
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: FONTS.bold,
                    color: deltaVsPrev >= 0 ? "#10B981" : "#EF4444",
                  }}
                >
                  • {deltaVsPrev >= 0 ? `▲ +${deltaVsPrev}%` : `▼ ${deltaVsPrev}%`} vs {previousExam.examType}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 2. GRADED SVG TRENDLINE (Letter Grades on Chart Nodes)        */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <View
        style={{
          backgroundColor: isDark
            ? "rgba(56, 189, 248, 0.05)"
            : "rgba(2, 132, 199, 0.03)",
          borderRadius: RADIUS.md || 14,
          paddingTop: 6,
          paddingBottom: 2,
          paddingHorizontal: 4,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(56, 189, 248, 0.18)"
            : "rgba(2, 132, 199, 0.12)",
          overflow: "hidden",
        }}
      >
        <Svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${effectiveWidth} ${svgHeight}`}
        >
          <Defs>
            {/* Area Fill Gradient */}
            <LinearGradient id="gradedAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary || "#4F46E5"} stopOpacity="0.32" />
              <Stop offset="75%" stopColor={colors.primary || "#4F46E5"} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={colors.primary || "#4F46E5"} stopOpacity="0.00" />
            </LinearGradient>

            {/* Stroke Path Gradient */}
            <LinearGradient id="gradedStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={colors.primary || "#4F46E5"} />
              <Stop offset="100%" stopColor={colors.tertiary || "#0284C7"} />
            </LinearGradient>
          </Defs>

          {/* Reference Gridlines & Y-Axis Labels */}
          {yGridLevels.map((lvl) => {
            const yPos = paddingTop + plotHeight - (lvl / 100) * plotHeight;
            return (
              <G key={`grid-${lvl}`}>
                <Line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={effectiveWidth - paddingRight}
                  y2={yPos}
                  stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
                  strokeWidth="1"
                  strokeDasharray={lvl === 100 ? "" : "3,3"}
                />
                <SvgText
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  fill={colors.onSurfaceVariant || "#757575"}
                  fontSize={10}
                  fontFamily={FONTS.medium}
                  textAnchor="end"
                  opacity="0.75"
                >
                  {lvl}%
                </SvgText>
              </G>
            );
          })}

          {/* Area Fill */}
          {areaPath ? <Path d={areaPath} fill="url(#gradedAreaGrad)" /> : null}

          {/* Line Stroke */}
          {strokePath ? (
            <Path
              d={strokePath}
              fill="none"
              stroke="url(#gradedStrokeGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active Node Guide Line */}
          {points[activeIdx] && (
            <Line
              x1={points[activeIdx].x}
              y1={paddingTop - 2}
              x2={points[activeIdx].x}
              y2={paddingTop + plotHeight}
              stroke={activeGrade.color}
              strokeWidth="1.5"
              strokeDasharray="3,3"
              opacity="0.6"
            />
          )}

          {/* Exam Nodes with Integrated Letter Grades */}
          {points.map((p, idx) => {
            const grade = getGradeInfo(p.percentage);
            const isSelected = idx === activeIdx;

            // Grade Badge Dimensions above node
            const badgeW = 30;
            const badgeH = 18;
            const badgeX = p.x - badgeW / 2;
            const badgeY = Math.max(6, p.y - 25);

            return (
              <G key={`point-${idx}`}>
                {/* Outer Glow Ring for Selected Node */}
                {isSelected && (
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r="11"
                    fill={grade.color}
                    opacity="0.22"
                  />
                )}

                {/* Node Ring */}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "6" : "4.5"}
                  fill={colors.surface || (isDark ? "#1E1B24" : "#FFFFFF")}
                  stroke={isSelected ? grade.color : colors.primary || "#4F46E5"}
                  strokeWidth={isSelected ? "2.5" : "2"}
                />

                {/* Center Node Dot */}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "3" : "2"}
                  fill={grade.color}
                />

                {/* LETTER GRADE BADGE (Placed directly on the graph node) */}
                <G>
                  <Rect
                    x={badgeX}
                    y={badgeY}
                    width={badgeW}
                    height={badgeH}
                    rx="5"
                    fill={isSelected ? grade.color : isDark ? "rgba(0,0,0,0.4)" : "#FFFFFF"}
                    stroke={grade.color}
                    strokeWidth={isSelected ? "1.5" : "1"}
                  />
                  <SvgText
                    x={p.x}
                    y={badgeY + 13}
                    fill={isSelected ? "#FFFFFF" : grade.color}
                    fontSize={10}
                    fontFamily={FONTS.bold}
                    textAnchor="middle"
                  >
                    {grade.grade}
                  </SvgText>
                </G>

                {/* X-Axis Exam Name & Percentage */}
                <SvgText
                  x={p.x}
                  y={paddingTop + plotHeight + 15}
                  fill={isSelected ? colors.onSurface : colors.onSurfaceVariant}
                  fontSize={11}
                  fontFamily={isSelected ? FONTS.bold : FONTS.medium}
                  textAnchor="middle"
                >
                  {p.examType}
                </SvgText>
                <SvgText
                  x={p.x}
                  y={paddingTop + plotHeight + 25}
                  fill={isSelected ? grade.color : colors.onSurfaceVariant}
                  fontSize={9}
                  fontFamily={isSelected ? FONTS.bold : FONTS.regular}
                  textAnchor="middle"
                >
                  {p.percentage}%
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Transparent Interactive Touch Columns */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: paddingLeft,
            right: paddingRight,
            bottom: 0,
            flexDirection: "row",
          }}
        >
          {points.map((_, idx) => (
            <Pressable
              key={`touch-${idx}`}
              onPress={() => handleSelectExam(idx)}
              style={{
                flex: 1,
                height: "100%",
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select ${normalizedData[idx]?.examType}`}
            />
          ))}
        </View>
      </View>

      {/* Footer Helper Note & Detailed Report Link */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          paddingHorizontal: 2,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontFamily: FONTS.regular,
            color: colors.onSurfaceVariant,
          }}
        >
          Tap any exam to inspect grade • Standardized grading
        </Text>

        <Pressable onPress={handleNavigation}>
          <Text
            style={{
              fontSize: 11,
              fontFamily: FONTS.semiBold,
              color: colors.primary,
            }}
          >
            View Full Report Card →
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PerformanceTrendCard;
