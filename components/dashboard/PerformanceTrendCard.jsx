import React, { useState } from "react";
import { View, Text, Pressable, Dimensions, ScrollView } from "react-native";
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
import { useTheme, FONTS, FONT_SIZES } from "../../theme";

/**
 * Grade & Achievement Helper
 */
const getGradeInfo = (percentage) => {
  const p = Number(percentage) || 0;
  if (p >= 90)
    return {
      grade: "A+",
      label: "Outstanding",
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.14)",
      border: "rgba(16, 185, 129, 0.3)",
    };
  if (p >= 80)
    return {
      grade: "A",
      label: "Excellent",
      color: "#059669",
      bg: "rgba(5, 150, 105, 0.14)",
      border: "rgba(5, 150, 105, 0.3)",
    };
  if (p >= 70)
    return {
      grade: "B+",
      label: "Very Good",
      color: "#0284C7",
      bg: "rgba(2, 132, 199, 0.14)",
      border: "rgba(2, 132, 199, 0.3)",
    };
  if (p >= 60)
    return {
      grade: "B",
      label: "Good",
      color: "#6366F1",
      bg: "rgba(99, 102, 241, 0.14)",
      border: "rgba(99, 102, 241, 0.3)",
    };
  if (p >= 50)
    return {
      grade: "C",
      label: "Average",
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.14)",
      border: "rgba(217, 119, 6, 0.3)",
    };
  if (p >= 35)
    return {
      grade: "D",
      label: "Passing",
      color: "#EA580C",
      bg: "rgba(234, 88, 12, 0.14)",
      border: "rgba(234, 88, 12, 0.3)",
    };
  return {
    grade: "F",
    label: "Needs Focus",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.14)",
    border: "rgba(220, 38, 38, 0.3)",
  };
};

/**
 * Format exam labels (e.g. FA1 -> Formative Assessment 1)
 */
const getExamFullName = (shortName) => {
  const map = {
    FA1: "Formative Assessment 1",
    FA2: "Formative Assessment 2",
    FA3: "Formative Assessment 3",
    FA4: "Formative Assessment 4",
    SA1: "Summative Assessment 1",
    SA2: "Summative Assessment 2",
    MID: "Midterm Examination",
    FINAL: "Final Examination",
    PRE: "Pre-Board Examination",
  };
  return map[shortName] || shortName;
};

/**
 * PerformanceTrendCard
 * Ultra-premium, interactive SVG performance trend card with executive KPIs,
 * curved spline graph, glowing nodes, and exam-wise breakdown pills.
 */
const PerformanceTrendCard = ({
  data = [],
  title = "Performance Trend",
  subtitle = "Academic Year • Exam Average",
  onViewReport,
  embedded = false,
}) => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const [cardWidth, setCardWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const isDark = mode === "dark";

  // Normalize incoming data
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

  // Key Performance Metrics
  const latest = normalizedData[normalizedData.length - 1];
  const previous =
    normalizedData.length > 1
      ? normalizedData[normalizedData.length - 2]
      : null;
  const trendDelta = previous
    ? Math.round((latest.percentage - previous.percentage) * 10) / 10
    : null;
  const totalPercentage = normalizedData.reduce(
    (acc, curr) => acc + curr.percentage,
    0
  );
  const yearAverage =
    Math.round((totalPercentage / normalizedData.length) * 10) / 10;
  const bestExam = normalizedData.reduce(
    (prev, curr) => (curr.percentage > prev.percentage ? curr : prev),
    normalizedData[0]
  );

  // Active selected exam (defaults to latest if none selected)
  const activeIdx =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < normalizedData.length
      ? selectedIndex
      : normalizedData.length - 1;
  const activeExam = normalizedData[activeIdx];
  const activeGrade = getGradeInfo(activeExam.percentage);

  // Dynamic width calculation
  const fallbackWidth = Dimensions.get("window").width - 32;
  const effectiveWidth = cardWidth > 0 ? cardWidth : fallbackWidth;

  // SVG Layout Dimensions
  const svgHeight = 200;
  const paddingLeft = 40;
  const paddingRight = 24;
  const paddingTop = 32;
  const paddingBottom = 30;

  const plotWidth = Math.max(effectiveWidth - paddingLeft - paddingRight, 100);
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate (x, y) coordinates for all data points
  const points = normalizedData.map((d, index) => {
    let x = paddingLeft + plotWidth / 2;
    if (normalizedData.length > 1) {
      x = paddingLeft + (index / (normalizedData.length - 1)) * plotWidth;
    }
    // y: clamped between paddingTop (100%) and paddingTop + plotHeight (0%)
    const clampedPct = Math.max(0, Math.min(100, d.percentage));
    const y = paddingTop + plotHeight - (clampedPct / 100) * plotHeight;
    return { x, y, ...d };
  });

  // Build smooth Cubic Bezier Path
  let strokePath = "";
  let areaPath = "";

  if (points.length === 1) {
    strokePath = `M ${points[0].x - 30} ${points[0].y} L ${points[0].x + 30} ${
      points[0].y
    }`;
    areaPath = `M ${points[0].x - 30} ${points[0].y} L ${points[0].x + 30} ${
      points[0].y
    } L ${points[0].x + 30} ${paddingTop + plotHeight} L ${points[0].x - 30} ${
      paddingTop + plotHeight
    } Z`;
  } else if (points.length === 2) {
    const cp1x = points[0].x + (points[1].x - points[0].x) * 0.45;
    const cp1y = points[0].y;
    const cp2x = points[1].x - (points[1].x - points[0].x) * 0.45;
    const cp2y = points[1].y;
    strokePath = `M ${points[0].x} ${points[0].y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[1].x} ${points[1].y}`;
    areaPath = `${strokePath} L ${points[1].x} ${paddingTop + plotHeight} L ${
      points[0].x
    } ${paddingTop + plotHeight} Z`;
  } else {
    // Multi-point cubic spline
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
    areaPath = `${strokePath} L ${lastP.x} ${paddingTop + plotHeight} L ${
      firstP.x
    } ${paddingTop + plotHeight} Z`;
  }

  // Grid Y-Axis Reference lines (100%, 75%, 50%, 25%, 0%)
  const yGridLevels = [100, 75, 50, 25];

  const handleNavigation = () => {
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
              backgroundColor:
                colors.surfaceContainer || (isDark ? "#1E1B24" : "#F7F3FB"),
              borderRadius: 24,
              padding: 18,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.outlineVariant
                ? colors.outlineVariant + "35"
                : "rgba(0,0,0,0.06)",
            }
      }
    >
      {/* Header (hidden when embedded in HomeModuleContainer) */}
      {!embedded && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: (colors.primary || "#6750A4") + "1A",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons
                name="trending-up"
                size={24}
                color={colors.primary || "#6750A4"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
                  letterSpacing: 0.1,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.medium,
                  color:
                    colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#49454F"),
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          </View>

          {/* View Details Button */}
          <Pressable
            onPress={handleNavigation}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: (colors.primary || "#6750A4") + "15",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 100,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.bold,
                color: colors.primary || "#6750A4",
                marginRight: 2,
              }}
            >
              Reports
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={16}
              color={colors.primary || "#6750A4"}
            />
          </Pressable>
        </View>
      )}

      {/* KPI Summary Metrics Strip */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {/* Year Average Card */}
        <View
          style={{
            flex: 1,
            minWidth: 100,
            backgroundColor: colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.outlineVariant
              ? colors.outlineVariant + "25"
              : "rgba(0,0,0,0.05)",
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.xs,
              fontFamily: FONTS.medium,
              color:
                colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
              marginBottom: 2,
            }}
          >
            Year Avg
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
              }}
            >
              {yearAverage}%
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.xs,
                fontFamily: FONTS.bold,
                color: getGradeInfo(yearAverage).color,
              }}
            >
              {getGradeInfo(yearAverage).grade}
            </Text>
          </View>
        </View>

        {/* Latest Exam Card */}
        <View
          style={{
            flex: 1,
            minWidth: 100,
            backgroundColor: colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.outlineVariant
              ? colors.outlineVariant + "25"
              : "rgba(0,0,0,0.05)",
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.xs,
              fontFamily: FONTS.medium,
              color:
                colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            Latest ({latest.examType})
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: getGradeInfo(latest.percentage).color,
              }}
            >
              {latest.percentage}%
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.xs,
                fontFamily: FONTS.bold,
                color: getGradeInfo(latest.percentage).color,
              }}
            >
              {getGradeInfo(latest.percentage).grade}
            </Text>
          </View>
        </View>

        {/* Growth / Momentum Card */}
        <View
          style={{
            flex: 1,
            minWidth: 100,
            backgroundColor: colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.outlineVariant
              ? colors.outlineVariant + "25"
              : "rgba(0,0,0,0.05)",
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.xs,
              fontFamily: FONTS.medium,
              color:
                colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
              marginBottom: 2,
            }}
          >
            Trend
          </Text>
          {trendDelta !== null ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name={
                  trendDelta >= 0 ? "arrow-top-right" : "arrow-bottom-right"
                }
                size={18}
                color={trendDelta >= 0 ? "#10B981" : "#EF4444"}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: trendDelta >= 0 ? "#10B981" : "#EF4444",
                  marginLeft: 2,
                }}
              >
                {trendDelta >= 0 ? `+${trendDelta}%` : `${trendDelta}%`}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.bold,
                color: colors.primary || "#6750A4",
              }}
            >
              Baseline
            </Text>
          )}
        </View>

        {/* Peak Score Card (if multiple exams) */}
        {normalizedData.length > 1 && (
          <View
            style={{
              flex: 1,
              minWidth: 100,
              backgroundColor:
                colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.outlineVariant
                ? colors.outlineVariant + "25"
                : "rgba(0,0,0,0.05)",
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.xs,
                fontFamily: FONTS.medium,
                color:
                  colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
                marginBottom: 2,
              }}
            >
              Best ({bestExam.examType})
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: "#10B981",
              }}
            >
              {bestExam.percentage}%
            </Text>
          </View>
        )}
      </View>

      {/* Interactive SVG Smooth Line Graph */}
      <View
        style={{
          backgroundColor: colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
          borderRadius: 18,
          paddingTop: 8,
          paddingBottom: 4,
          paddingHorizontal: 6,
          borderWidth: 1,
          borderColor: colors.outlineVariant
            ? colors.outlineVariant + "20"
            : "rgba(0,0,0,0.04)",
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
            <LinearGradient
              id="performanceAreaGrad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop
                offset="0%"
                stopColor={colors.primary || "#6750A4"}
                stopOpacity="0.45"
              />
              <Stop
                offset="70%"
                stopColor={colors.primary || "#6750A4"}
                stopOpacity="0.08"
              />
              <Stop
                offset="100%"
                stopColor={colors.primary || "#6750A4"}
                stopOpacity="0.00"
              />
            </LinearGradient>

            {/* Stroke Path Gradient */}
            <LinearGradient
              id="performanceStrokeGrad"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <Stop offset="0%" stopColor={colors.primary || "#6750A4"} />
              <Stop offset="100%" stopColor={colors.tertiary || "#7D5260"} />
            </LinearGradient>

            {/* Selected Node Glow */}
            <LinearGradient id="activeNodeGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={activeGrade.color}
                stopOpacity="0.6"
              />
              <Stop
                offset="100%"
                stopColor={activeGrade.color}
                stopOpacity="0.1"
              />
            </LinearGradient>
          </Defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yGridLevels.map((lvl) => {
            const yPos = paddingTop + plotHeight - (lvl / 100) * plotHeight;
            return (
              <G key={`grid-${lvl}`}>
                <Line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={effectiveWidth - paddingRight}
                  y2={yPos}
                  stroke={
                    isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                  }
                  strokeWidth="1"
                  strokeDasharray={lvl === 100 || lvl === 50 ? "" : "3,3"}
                />
                <SvgText
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  fill={
                    colors.onSurfaceVariant || (isDark ? "#9E9E9E" : "#757575")
                  }
                  fontSize={FONT_SIZES.micro}
                  fontFamily={FONTS.medium}
                  textAnchor="end"
                  opacity="0.8"
                >
                  {lvl}%
                </SvgText>
              </G>
            );
          })}

          {/* Area Under Curve */}
          {areaPath ? (
            <Path d={areaPath} fill="url(#performanceAreaGrad)" />
          ) : null}

          {/* Curve Line Stroke */}
          {strokePath ? (
            <Path
              d={strokePath}
              fill="none"
              stroke="url(#performanceStrokeGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active Exam Column Vertical Guide Line */}
          {points[activeIdx] && (
            <Line
              x1={points[activeIdx].x}
              y1={paddingTop - 4}
              x2={points[activeIdx].x}
              y2={paddingTop + plotHeight}
              stroke={activeGrade.color}
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.6"
            />
          )}

          {/* Data Points & Floating Badges */}
          {points.map((p, idx) => {
            const grade = getGradeInfo(p.percentage);
            const isSelected = idx === activeIdx;
            const badgeWidth = 44;
            const badgeHeight = 20;
            const badgeX = p.x - badgeWidth / 2;
            const badgeY = Math.max(4, p.y - 28);

            return (
              <G key={`point-${idx}`}>
                {/* Outer Glow Ring for Selected Point */}
                {isSelected && (
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r="13"
                    fill="url(#activeNodeGlow)"
                  />
                )}

                {/* Outer Ring */}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "7" : "5"}
                  fill={colors.surface || (isDark ? "#2B2832" : "#FFFFFF")}
                  stroke={
                    isSelected ? grade.color : colors.primary || "#6750A4"
                  }
                  strokeWidth={isSelected ? "3" : "2"}
                />

                {/* Inner Solid Dot */}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "3.5" : "2.5"}
                  fill={grade.color}
                />

                {/* Floating Percentage Badge (Always visible on active, or if <= 5 points) */}
                {(isSelected || points.length <= 4) && (
                  <G>
                    <Rect
                      x={badgeX}
                      y={badgeY}
                      width={badgeWidth}
                      height={badgeHeight}
                      rx="6"
                      fill={
                        isSelected
                          ? grade.color
                          : isDark
                          ? "#3E3947"
                          : "#EDE7F6"
                      }
                      stroke={isSelected ? "#FFFFFF" : grade.color}
                      strokeWidth={isSelected ? "1.5" : "0.5"}
                    />
                    <SvgText
                      x={p.x}
                      y={badgeY + 14}
                      fill={
                        isSelected ? "#FFFFFF" : isDark ? "#FFFFFF" : "#1D1B20"
                      }
                      fontSize={FONT_SIZES.xs}
                      fontFamily={FONTS.bold}
                      textAnchor="middle"
                    >
                      {p.percentage}%
                    </SvgText>
                  </G>
                )}

                {/* X-Axis Exam Label */}
                <SvgText
                  x={p.x}
                  y={paddingTop + plotHeight + 18}
                  fill={
                    isSelected
                      ? colors.primary || "#6750A4"
                      : colors.onSurfaceVariant || "#757575"
                  }
                  fontSize={isSelected ? FONT_SIZES.sm : FONT_SIZES.xs}
                  fontFamily={isSelected ? FONTS.bold : FONTS.medium}
                  textAnchor="middle"
                >
                  {p.examType}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Transparent Interactive Touch Targets over each exam node */}
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
              onPress={() => setSelectedIndex(idx)}
              style={{
                flex: 1,
                height: "100%",
              }}
            />
          ))}
        </View>
      </View>

      {/* Selected Exam Highlight Card & Insight */}
      <View
        style={{
          marginTop: 14,
          backgroundColor: activeGrade.bg,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: activeGrade.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 2,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
                }}
              >
                {activeExam.examType}
              </Text>
              <View
                style={{
                  backgroundColor: activeGrade.color,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.micro,
                    fontFamily: FONTS.bold,
                    color: "#FFFFFF",
                  }}
                >
                  Grade {activeGrade.grade}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.medium,
                  color: activeGrade.color,
                }}
              >
                • {activeGrade.label}
              </Text>
            </View>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.regular,
                color:
                  colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#49454F"),
              }}
              numberOfLines={1}
            >
              {getExamFullName(activeExam.examType)}
              {activeExam.subjectCount > 0
                ? ` (${activeExam.subjectCount} subjects)`
                : ""}
            </Text>
          </View>

          {/* Percentage Callout */}
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: FONT_SIZES.xl,
                fontFamily: FONTS.bold,
                color: activeGrade.color,
              }}
            >
              {activeExam.percentage}%
            </Text>
            {activeIdx > 0 && (
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.bold,
                  color:
                    activeExam.percentage >=
                    normalizedData[activeIdx - 1].percentage
                      ? "#10B981"
                      : "#EF4444",
                }}
              >
                {activeExam.percentage >=
                normalizedData[activeIdx - 1].percentage
                  ? "▲"
                  : "▼"}{" "}
                {Math.abs(
                  Math.round(
                    (activeExam.percentage -
                      normalizedData[activeIdx - 1].percentage) *
                      10
                  ) / 10
                )}
                % vs {normalizedData[activeIdx - 1].examType}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Interactive Exam Selector Chips */}
      {normalizedData.length > 1 && (
        <View style={{ marginTop: 14 }}>
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.bold,
              color:
                colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Exam History
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {normalizedData.map((item, idx) => {
              const isSelected = idx === activeIdx;
              const grade = getGradeInfo(item.percentage);

              return (
                <Pressable
                  key={item.examType}
                  onPress={() => setSelectedIndex(idx)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isSelected
                      ? colors.primary || "#6750A4"
                      : colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? colors.primary || "#6750A4"
                      : colors.outlineVariant
                      ? colors.outlineVariant + "35"
                      : "rgba(0,0,0,0.08)",
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: isSelected ? "#FFFFFF" : grade.color,
                      marginRight: 8,
                    }}
                  />
                  <View>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: isSelected
                          ? "#FFFFFF"
                          : colors.onSurface ||
                            (isDark ? "#FFFFFF" : "#1D1B20"),
                      }}
                    >
                      {item.examType}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.medium,
                        color: isSelected
                          ? "rgba(255, 255, 255, 0.85)"
                          : colors.onSurfaceVariant ||
                            (isDark ? "#CAC4D0" : "#79747E"),
                      }}
                    >
                      {item.percentage}%
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default PerformanceTrendCard;
