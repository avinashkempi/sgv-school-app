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
import { useTheme } from "../../theme";

/**
 * Attendance Health Status Helper
 */
const getAttendanceHealth = (pct) => {
  const p = Number(pct) || 0;
  if (p >= 85)
    return {
      label: "High Attendance",
      shortLabel: "Excellent",
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
    };
  if (p >= 75)
    return {
      label: "Good Attendance",
      shortLabel: "Good",
      color: "#0284C7",
      bg: "rgba(2, 132, 199, 0.12)",
      border: "rgba(2, 132, 199, 0.3)",
    };
  if (p >= 50)
    return {
      label: "Moderate Attendance",
      shortLabel: "Moderate",
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.12)",
      border: "rgba(217, 119, 6, 0.3)",
    };
  if (p > 0)
    return {
      label: "Low Attendance",
      shortLabel: "Low",
      color: "#DC2626",
      bg: "rgba(220, 38, 38, 0.12)",
      border: "rgba(220, 38, 38, 0.3)",
    };
  return {
    label: "No Data / Holiday",
    shortLabel: "No Data",
    color: "#9CA3AF",
    bg: "rgba(156, 163, 175, 0.12)",
    border: "rgba(156, 163, 175, 0.25)",
  };
};

/**
 * TeacherAttendanceTrendCard
 * Ultra-premium interactive SVG attendance trend chart with executive KPI metrics,
 * smooth spline visualization, interactive node scrubbing, and dark mode support.
 */
const TeacherAttendanceTrendCard = ({
  labels = [],
  data = [],
  title = "Attendance Trend (Last 7 Days)",
  subtitle = "Daily student presence percentage",
  onViewAttendance,
  classId,
}) => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const [cardWidth, setCardWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const isDark = mode === "dark";

  // Normalize incoming data
  const normalizedData = (Array.isArray(labels) ? labels : []).map(
    (label, index) => {
      const rawVal =
        Array.isArray(data) && data[index] !== undefined ? data[index] : 0;
      const percentage = Math.round(Number(rawVal) * 10) / 10;
      return {
        label: label || `Day ${index + 1}`,
        percentage: isNaN(percentage)
          ? 0
          : Math.max(0, Math.min(100, percentage)),
      };
    }
  );

  if (normalizedData.length === 0) {
    return null;
  }

  // Active attendance days (exclude pure zeros for realistic average calculation if applicable)
  const markedDays = normalizedData.filter((d) => d.percentage > 0);
  const totalPercentage = (
    markedDays.length > 0 ? markedDays : normalizedData
  ).reduce((acc, curr) => acc + curr.percentage, 0);
  const activeAverage =
    (markedDays.length > 0 ? markedDays : normalizedData).length > 0
      ? Math.round(
          (totalPercentage /
            (markedDays.length > 0 ? markedDays : normalizedData).length) *
            10
        ) / 10
      : 0;

  // Peak attendance day
  const peakDay = normalizedData.reduce(
    (prev, curr) => (curr.percentage > prev.percentage ? curr : prev),
    normalizedData[0]
  );

  // Trend calculation (latest marked day vs first marked day)
  const firstMarked = markedDays.length > 0 ? markedDays[0] : normalizedData[0];
  const lastMarked =
    markedDays.length > 0
      ? markedDays[markedDays.length - 1]
      : normalizedData[normalizedData.length - 1];
  const trendDelta =
    firstMarked && lastMarked && firstMarked !== lastMarked
      ? Math.round((lastMarked.percentage - firstMarked.percentage) * 10) / 10
      : null;

  // Active selected day (defaults to last day if none selected)
  const activeIdx =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < normalizedData.length
      ? selectedIndex
      : normalizedData.length - 1;
  const activeDay = normalizedData[activeIdx];
  const activeHealth = getAttendanceHealth(activeDay.percentage);

  // Dynamic width calculation
  const fallbackWidth = Dimensions.get("window").width - 32;
  const effectiveWidth = cardWidth > 0 ? cardWidth : fallbackWidth;

  // SVG Layout Dimensions
  const svgHeight = 210;
  const paddingLeft = 38;
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
    const y = paddingTop + plotHeight - (d.percentage / 100) * plotHeight;
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
    if (onViewAttendance) {
      onViewAttendance();
    } else if (classId) {
      router.push({
        pathname: "/teacher/class/attendance",
        params: { classId },
      });
    } else {
      router.push("/teacher/attendance");
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
      style={{
        backgroundColor:
          colors.surfaceContainer || (isDark ? "#1E1B24" : "#F7F3FB"),
        borderRadius: 24,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.outlineVariant
          ? colors.outlineVariant + "35"
          : "rgba(0,0,0,0.06)",
        shadowColor: colors.shadow || "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.2 : 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      {/* Header */}
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
            marginRight: 8,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: (colors.primary || "#6750A4") + "18",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={24}
              color={colors.primary || "#6750A4"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "DMSans-Bold",
                color: colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
                letterSpacing: 0.1,
                lineHeight: 22,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "DMSans-Medium",
                color:
                  colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#49454F"),
                marginTop: 1,
                lineHeight: 16,
              }}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        {/* Direct Action Link */}
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
            flexShrink: 0,
          })}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "DMSans-Bold",
              color: colors.primary || "#6750A4",
              marginRight: 2,
            }}
          >
            View All
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={16}
            color={colors.primary || "#6750A4"}
          />
        </Pressable>
      </View>

      {/* KPI Summary Metrics Strip */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {/* 7-Day Average Card */}
        <View
          style={{
            flex: 1,
            minWidth: 95,
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
              fontSize: 11,
              fontFamily: "DMSans-Medium",
              color:
                colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
              marginBottom: 2,
            }}
          >
            Avg Presence
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "DMSans-Bold",
                color: colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
              }}
            >
              {activeAverage}%
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "DMSans-Bold",
                color: getAttendanceHealth(activeAverage).color,
              }}
            >
              {getAttendanceHealth(activeAverage).shortLabel}
            </Text>
          </View>
        </View>

        {/* Peak Day Card */}
        <View
          style={{
            flex: 1,
            minWidth: 95,
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
              fontSize: 11,
              fontFamily: "DMSans-Medium",
              color:
                colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            Peak ({peakDay.label})
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "DMSans-Bold",
                color: "#10B981",
              }}
            >
              {peakDay.percentage}%
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "DMSans-Bold",
                color: "#10B981",
              }}
            >
              Max
            </Text>
          </View>
        </View>

        {/* Weekly Trend Card */}
        <View
          style={{
            flex: 1,
            minWidth: 95,
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
              fontSize: 11,
              fontFamily: "DMSans-Medium",
              color:
                colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#79747E"),
              marginBottom: 2,
            }}
          >
            7D Trend
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
                  fontSize: 15,
                  fontFamily: "DMSans-Bold",
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
                fontSize: 13,
                fontFamily: "DMSans-Bold",
                color: colors.primary || "#6750A4",
              }}
            >
              Active
            </Text>
          )}
        </View>
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
            <LinearGradient id="attendanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={colors.primary || "#6750A4"}
                stopOpacity="0.4"
              />
              <Stop
                offset="65%"
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
              id="attendanceStrokeGrad"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <Stop offset="0%" stopColor={colors.primary || "#6750A4"} />
              <Stop offset="60%" stopColor="#7C3AED" />
              <Stop offset="100%" stopColor="#06B6D4" />
            </LinearGradient>

            {/* Active Node Glow */}
            <LinearGradient id="activeNodeGlowAtt" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={activeHealth.color}
                stopOpacity="0.6"
              />
              <Stop
                offset="100%"
                stopColor={activeHealth.color}
                stopOpacity="0.1"
              />
            </LinearGradient>
          </Defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yGridLevels.map((lvl) => {
            const yPos = paddingTop + plotHeight - (lvl / 100) * plotHeight;
            return (
              <G key={`att-grid-${lvl}`}>
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
                  x={paddingLeft - 6}
                  y={yPos + 4}
                  fill={
                    colors.onSurfaceVariant || (isDark ? "#9E9E9E" : "#757575")
                  }
                  fontSize="10"
                  fontFamily="DMSans-Medium"
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
            <Path d={areaPath} fill="url(#attendanceAreaGrad)" />
          ) : null}

          {/* Curve Line Stroke */}
          {strokePath ? (
            <Path
              d={strokePath}
              fill="none"
              stroke="url(#attendanceStrokeGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active Column Vertical Guide Line */}
          {points[activeIdx] && (
            <Line
              x1={points[activeIdx].x}
              y1={paddingTop - 4}
              x2={points[activeIdx].x}
              y2={paddingTop + plotHeight}
              stroke={activeHealth.color}
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.6"
            />
          )}

          {/* Data Points & Floating Badges */}
          {points.map((p, idx) => {
            const health = getAttendanceHealth(p.percentage);
            const isSelected = idx === activeIdx;
            const badgeWidth = 42;
            const badgeHeight = 20;
            const badgeX = p.x - badgeWidth / 2;
            const badgeY = Math.max(4, p.y - 28);

            return (
              <G key={`att-point-${idx}`}>
                {/* Outer Glow Ring for Selected Point */}
                {isSelected && (
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r="13"
                    fill="url(#activeNodeGlowAtt)"
                  />
                )}

                {/* Outer Ring */}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "7" : "5"}
                  fill={colors.surface || (isDark ? "#2B2832" : "#FFFFFF")}
                  stroke={
                    isSelected ? health.color : colors.primary || "#6750A4"
                  }
                  strokeWidth={isSelected ? "3" : "2"}
                />

                {/* Inner Solid Dot */}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "3.5" : "2.5"}
                  fill={health.color}
                />

                {/* Floating Percentage Badge (On active node or peak node) */}
                {(isSelected ||
                  (p.percentage === peakDay.percentage &&
                    peakDay.percentage > 0)) && (
                  <G>
                    <Rect
                      x={badgeX}
                      y={badgeY}
                      width={badgeWidth}
                      height={badgeHeight}
                      rx="6"
                      fill={
                        isSelected
                          ? health.color
                          : isDark
                          ? "#3E3947"
                          : "#EDE7F6"
                      }
                      stroke={isSelected ? "#FFFFFF" : health.color}
                      strokeWidth={isSelected ? "1.5" : "0.5"}
                    />
                    <SvgText
                      x={p.x}
                      y={badgeY + 14}
                      fill={
                        isSelected ? "#FFFFFF" : isDark ? "#FFFFFF" : "#1D1B20"
                      }
                      fontSize="10.5"
                      fontFamily="DMSans-Bold"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {p.percentage}%
                    </SvgText>
                  </G>
                )}

                {/* X-Axis Day Label */}
                <SvgText
                  x={p.x}
                  y={paddingTop + plotHeight + 18}
                  fill={
                    isSelected
                      ? colors.primary || "#6750A4"
                      : colors.onSurfaceVariant || "#757575"
                  }
                  fontSize={isSelected ? "11.5" : "10.5"}
                  fontFamily={isSelected ? "DMSans-Bold" : "DMSans-Medium"}
                  fontWeight={isSelected ? "bold" : "normal"}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Touch Hitboxes */}
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
              key={`att-touch-${idx}`}
              onPress={() => setSelectedIndex(idx)}
              style={{
                flex: 1,
                height: "100%",
              }}
            />
          ))}
        </View>
      </View>

      {/* Selected Day Detail Card */}
      <View
        style={{
          marginTop: 14,
          backgroundColor: activeHealth.bg,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: activeHealth.border,
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
                  fontSize: 15,
                  fontFamily: "DMSans-Bold",
                  color: colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
                }}
              >
                {activeDay.label}
              </Text>
              <View
                style={{
                  backgroundColor: activeHealth.color,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "DMSans-Bold",
                    color: "#FFFFFF",
                  }}
                >
                  {activeHealth.shortLabel}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "DMSans-Regular",
                color:
                  colors.onSurfaceVariant || (isDark ? "#CAC4D0" : "#49454F"),
              }}
            >
              {activeDay.percentage === 0
                ? "No attendance recorded or school holiday"
                : `${activeHealth.label} recorded on this date`}
            </Text>
          </View>

          {/* Percentage Callout */}
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 22,
                fontFamily: "DMSans-Bold",
                color: activeHealth.color,
              }}
            >
              {activeDay.percentage}%
            </Text>
            {activeIdx > 0 &&
              normalizedData[activeIdx - 1].percentage > 0 &&
              activeDay.percentage > 0 && (
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "DMSans-Bold",
                    color:
                      activeDay.percentage >=
                      normalizedData[activeIdx - 1].percentage
                        ? "#10B981"
                        : "#EF4444",
                  }}
                >
                  {activeDay.percentage >=
                  normalizedData[activeIdx - 1].percentage
                    ? "▲"
                    : "▼"}{" "}
                  {Math.abs(
                    Math.round(
                      (activeDay.percentage -
                        normalizedData[activeIdx - 1].percentage) *
                        10
                    ) / 10
                  )}
                  % vs prev day
                </Text>
              )}
          </View>
        </View>
      </View>

      {/* Quick Scrub Day Chips */}
      <View style={{ marginTop: 14 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {normalizedData.map((item, idx) => {
            const isSelected = idx === activeIdx;
            const health = getAttendanceHealth(item.percentage);

            return (
              <Pressable
                key={`chip-${item.label}-${idx}`}
                onPress={() => setSelectedIndex(idx)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isSelected
                    ? colors.primary || "#6750A4"
                    : colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
                  paddingHorizontal: 12,
                  paddingVertical: 7,
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
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: isSelected ? "#FFFFFF" : health.color,
                    marginRight: 6,
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "DMSans-Bold",
                    color: isSelected
                      ? "#FFFFFF"
                      : colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

export default TeacherAttendanceTrendCard;
