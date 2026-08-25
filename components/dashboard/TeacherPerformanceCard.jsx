import React, { useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
  G,
  Rect,
} from "react-native-svg";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";

/**
 * Format raw subject labels into clean, human-friendly titles
 */
const formatSubjectName = (rawName, index) => {
  if (!rawName) return `Subject ${index + 1}`;
  let name = String(rawName).trim();

  // Fix cutoffs like "EVS (Envir" -> "EVS"
  if (name.toLowerCase().startsWith("evs")) return "EVS";
  if (name.includes("(")) {
    const parts = name.split("(");
    const code = parts[0].trim();
    const full = parts[1].replace(")", "").trim();
    if (code.length <= 5 && code.length > 0) return code;
    return full || code;
  }
  return name;
};

/**
 * Get color and grade details based on score
 */
const getScoreGrade = (score, maxScore = 20) => {
  const s = Number(score) || 0;
  const ratio = maxScore > 0 ? s / maxScore : s / 20;

  if (ratio >= 0.85 || s >= 16) {
    return {
      grade: "A+",
      label: "Outstanding",
      color: "#10B981",
      gradientFrom: "#10B981",
      gradientTo: "#059669",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
    };
  }
  if (ratio >= 0.7 || s >= 13) {
    return {
      grade: "A",
      label: "Excellent",
      color: "#0284C7",
      gradientFrom: "#38BDF8",
      gradientTo: "#0284C7",
      bg: "rgba(2, 132, 199, 0.12)",
      border: "rgba(2, 132, 199, 0.3)",
    };
  }
  if (ratio >= 0.5 || s >= 10) {
    return {
      grade: "B+",
      label: "Good",
      color: "#6366F1",
      gradientFrom: "#818CF8",
      gradientTo: "#4F46E5",
      bg: "rgba(99, 102, 241, 0.12)",
      border: "rgba(99, 102, 241, 0.3)",
    };
  }
  if (ratio >= 0.35 || s >= 7) {
    return {
      grade: "C",
      label: "Average",
      color: "#D97706",
      gradientFrom: "#FBBF24",
      gradientTo: "#D97706",
      bg: "rgba(217, 119, 6, 0.12)",
      border: "rgba(217, 119, 6, 0.3)",
    };
  }
  return {
    grade: "D",
    label: "Needs Focus",
    color: "#DC2626",
    gradientFrom: "#F87171",
    gradientTo: "#DC2626",
    bg: "rgba(220, 38, 38, 0.12)",
    border: "rgba(220, 38, 38, 0.3)",
  };
};

/**
 * TeacherPerformanceCard
 * Ultra-premium interactive SVG Class & Subject Performance chart with
 * responsive bars, view mode toggle (Chart vs Ranking Cards), and KPI strip.
 */
const TeacherPerformanceCard = ({
  labels = [],
  data = [],
  title = "Class Performance (Avg Marks)",
  subtitle = "Average marks scored per subject",
  onViewPerformance,
}) => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const [cardWidth, setCardWidth] = useState(0);
  const [viewMode, setViewMode] = useState("chart"); // 'chart' | 'list'
  const [selectedIndex, setSelectedIndex] = useState(null);

  const isDark = mode === "dark";

  // Normalize and clean incoming data - aggregate duplicate subject names
  const rawLabels = Array.isArray(labels) ? labels : [];
  const rawData = Array.isArray(data) ? data : [];

  const aggregatedMap = new Map();
  rawLabels.forEach((lbl, idx) => {
    const val = rawData[idx] !== undefined ? rawData[idx] : 0;
    const marks = Number(val) || 0;
    const cleanName = formatSubjectName(lbl, idx);
    if (!aggregatedMap.has(cleanName)) {
      aggregatedMap.set(cleanName, {
        name: cleanName,
        originalLabel: lbl,
        total: marks,
        count: 1,
      });
    } else {
      const item = aggregatedMap.get(cleanName);
      item.total += marks;
      item.count += 1;
    }
  });

  const normalizedData = Array.from(aggregatedMap.values()).map(
    (item, idx) => ({
      name: item.name,
      originalLabel: item.originalLabel,
      marks: Math.round((item.total / item.count) * 10) / 10,
      rawIndex: idx,
    })
  );

  if (normalizedData.length === 0) {
    return null;
  }

  // Determine scale max
  const maxDataMarks = Math.max(...normalizedData.map((d) => d.marks), 1);
  // Standardize baseline ceiling: if max score <= 20, use 20 or 25; if <= 50, use 50; if <= 100, use 100
  let chartMaxY = 20;
  if (maxDataMarks > 50) chartMaxY = 100;
  else if (maxDataMarks > 25) chartMaxY = 50;
  else if (maxDataMarks > 15) chartMaxY = Math.ceil(maxDataMarks / 5) * 5;
  else chartMaxY = Math.max(15, Math.ceil(maxDataMarks / 3) * 3);

  // Summary KPIs
  const totalMarks = normalizedData.reduce((acc, curr) => acc + curr.marks, 0);
  const classAvg = Math.round((totalMarks / normalizedData.length) * 10) / 10;
  const topSubject = normalizedData.reduce(
    (prev, curr) => (curr.marks > prev.marks ? curr : prev),
    normalizedData[0]
  );

  // Active selected subject (defaults to top subject)
  const activeIdx =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < normalizedData.length
      ? selectedIndex
      : normalizedData.indexOf(topSubject) >= 0
      ? normalizedData.indexOf(topSubject)
      : 0;
  const activeSubject = normalizedData[activeIdx] || normalizedData[0];
  const activeGrade = getScoreGrade(activeSubject.marks, chartMaxY);

  // Sorted for ranking list view
  const sortedSubjects = [...normalizedData].sort((a, b) => b.marks - a.marks);

  // Dimensions
  const fallbackWidth = Dimensions.get("window").width - 32;
  const effectiveWidth = cardWidth > 0 ? cardWidth : fallbackWidth;

  const svgHeight = 220;
  const paddingLeft = 36;
  const paddingRight = 24;
  const paddingTop = 36;
  const paddingBottom = 34;

  const plotWidth = Math.max(effectiveWidth - paddingLeft - paddingRight, 100);
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Y-Axis Grid levels
  const yGridLevels = [
    chartMaxY,
    Math.round(chartMaxY * 0.75),
    Math.round(chartMaxY * 0.5),
    Math.round(chartMaxY * 0.25),
  ];

  // Compute column widths & bar positions
  const columnCount = normalizedData.length;
  const columnWidth = plotWidth / Math.max(columnCount, 1);
  const barWidth = Math.min(Math.max(columnWidth * 0.55, 24), 48);

  const handleNavigation = () => {
    if (onViewPerformance) {
      onViewPerformance();
    } else {
      router.push("/teacher/exams-dashboard");
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
              backgroundColor: "#6366F118",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={24}
              color="#6366F1"
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

        {/* View Exams Link */}
        <Pressable
          onPress={handleNavigation}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#6366F115",
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
              color: "#6366F1",
              marginRight: 2,
            }}
          >
            Exams
          </Text>
          <MaterialIcons name="chevron-right" size={16} color="#6366F1" />
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
        {/* Class Average Marks */}
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
            Class Avg
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
              {classAvg}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "DMSans-Bold",
                color: getScoreGrade(classAvg, chartMaxY).color,
              }}
            >
              {getScoreGrade(classAvg, chartMaxY).grade}
            </Text>
          </View>
        </View>

        {/* Top Scoring Subject */}
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
            Top ({topSubject.name})
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
              {topSubject.marks}
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

        {/* Evaluated Subjects Count */}
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
            Subjects
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
              {normalizedData.length}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "DMSans-Bold",
                color: colors.onSurfaceVariant || "#79747E",
              }}
            >
              Taught
            </Text>
          </View>
        </View>
      </View>

      {/* View Mode Switcher Pills */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
          padding: 4,
          borderRadius: 12,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: colors.outlineVariant
            ? colors.outlineVariant + "25"
            : "rgba(0,0,0,0.06)",
        }}
      >
        <Pressable
          onPress={() => setViewMode("chart")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor:
              viewMode === "chart"
                ? colors.primary || "#6750A4"
                : "transparent",
          }}
        >
          <MaterialCommunityIcons
            name="chart-bar"
            size={16}
            color={
              viewMode === "chart"
                ? "#FFFFFF"
                : colors.onSurfaceVariant || "#79747E"
            }
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "DMSans-Bold",
              color:
                viewMode === "chart"
                  ? "#FFFFFF"
                  : colors.onSurfaceVariant || "#79747E",
            }}
          >
            Bar Chart
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setViewMode("list")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor:
              viewMode === "list" ? colors.primary || "#6750A4" : "transparent",
          }}
        >
          <MaterialCommunityIcons
            name="format-list-numbered"
            size={16}
            color={
              viewMode === "list"
                ? "#FFFFFF"
                : colors.onSurfaceVariant || "#79747E"
            }
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "DMSans-Bold",
              color:
                viewMode === "list"
                  ? "#FFFFFF"
                  : colors.onSurfaceVariant || "#79747E",
            }}
          >
            Subject Rankings
          </Text>
        </Pressable>
      </View>

      {viewMode === "chart" ? (
        /* Interactive SVG Bar Chart */
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
              {normalizedData.map((d, idx) => {
                const g = getScoreGrade(d.marks, chartMaxY);
                return (
                  <LinearGradient
                    key={`barGrad-${idx}`}
                    id={`barGrad-${idx}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <Stop
                      offset="0%"
                      stopColor={g.gradientFrom}
                      stopOpacity="1"
                    />
                    <Stop
                      offset="100%"
                      stopColor={g.gradientTo}
                      stopOpacity="0.75"
                    />
                  </LinearGradient>
                );
              })}
            </Defs>

            {/* Y-Axis Gridlines & Labels */}
            {yGridLevels.map((lvl) => {
              const yPos =
                paddingTop + plotHeight - (lvl / chartMaxY) * plotHeight;
              return (
                <G key={`perf-grid-${lvl}`}>
                  <Line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={effectiveWidth - paddingRight}
                    y2={yPos}
                    stroke={
                      isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                    }
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <SvgText
                    x={paddingLeft - 6}
                    y={yPos + 4}
                    fill={
                      colors.onSurfaceVariant ||
                      (isDark ? "#9E9E9E" : "#757575")
                    }
                    fontSize="10"
                    fontFamily="DMSans-Medium"
                    textAnchor="end"
                    opacity="0.8"
                  >
                    {lvl}
                  </SvgText>
                </G>
              );
            })}

            {/* Baseline */}
            <Line
              x1={paddingLeft}
              y1={paddingTop + plotHeight}
              x2={effectiveWidth - paddingRight}
              y2={paddingTop + plotHeight}
              stroke={
                colors.outlineVariant
                  ? colors.outlineVariant + "60"
                  : "rgba(0,0,0,0.15)"
              }
              strokeWidth="1.5"
            />

            {/* Bars & Score Badges */}
            {normalizedData.map((d, idx) => {
              const grade = getScoreGrade(d.marks, chartMaxY);
              const isSelected = idx === activeIdx;

              const colCenter =
                paddingLeft + idx * columnWidth + columnWidth / 2;
              const barLeft = colCenter - barWidth / 2;
              const calculatedHeight = (d.marks / chartMaxY) * plotHeight;
              const barH = Math.max(calculatedHeight, 4);
              const barTop = paddingTop + plotHeight - barH;

              const badgeW = 34;
              const badgeH = 18;
              const badgeX = colCenter - badgeW / 2;
              const badgeY = Math.max(4, barTop - 22);

              return (
                <G key={`bar-group-${idx}`}>
                  {/* Selection Glow / Background Track */}
                  {isSelected && (
                    <Rect
                      x={colCenter - barWidth / 2 - 4}
                      y={paddingTop - 2}
                      width={barWidth + 8}
                      height={plotHeight + 4}
                      rx="10"
                      fill={grade.color}
                      fillOpacity={0.1}
                    />
                  )}

                  {/* Bar Column with Rounded Caps */}
                  <Rect
                    x={barLeft}
                    y={barTop}
                    width={barWidth}
                    height={barH}
                    rx={Math.min(barWidth / 2, 8)}
                    fill={`url(#barGrad-${idx})`}
                    stroke={isSelected ? "#FFFFFF" : "transparent"}
                    strokeWidth={isSelected ? "2" : "0"}
                  />

                  {/* Value Badge on top */}
                  <Rect
                    x={badgeX}
                    y={badgeY}
                    width={badgeW}
                    height={badgeH}
                    rx="6"
                    fill={
                      isSelected ? grade.color : isDark ? "#383344" : "#EDE7F6"
                    }
                    stroke={isSelected ? "#FFFFFF" : grade.color}
                    strokeWidth={isSelected ? "1.5" : "0.5"}
                  />
                  <SvgText
                    x={colCenter}
                    y={badgeY + 13}
                    fill={
                      isSelected ? "#FFFFFF" : isDark ? "#FFFFFF" : "#1D1B20"
                    }
                    fontSize="10"
                    fontFamily="DMSans-Bold"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {d.marks}
                  </SvgText>

                  {/* Subject Label */}
                  <SvgText
                    x={colCenter}
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
                    {d.name.length > 8 ? `${d.name.substring(0, 7)}…` : d.name}
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
            {normalizedData.map((_, idx) => (
              <Pressable
                key={`perf-touch-${idx}`}
                onPress={() => setSelectedIndex(idx)}
                style={{
                  flex: 1,
                  height: "100%",
                }}
              />
            ))}
          </View>
        </View>
      ) : (
        /* Ranked Subject List View */
        <View style={{ gap: 8 }}>
          {sortedSubjects.map((sub, rankIdx) => {
            const grade = getScoreGrade(sub.marks, chartMaxY);
            const ratio = chartMaxY > 0 ? (sub.marks / chartMaxY) * 100 : 0;
            const isSelected = sub.rawIndex === activeIdx;

            return (
              <Pressable
                key={`ranked-${sub.name}-${rankIdx}`}
                onPress={() => setSelectedIndex(sub.rawIndex)}
                style={({ pressed }) => ({
                  backgroundColor: isSelected
                    ? grade.bg
                    : colors.surface || (isDark ? "#2B2832" : "#FFFFFF"),
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? grade.color
                    : colors.outlineVariant
                    ? colors.outlineVariant + "25"
                    : "rgba(0,0,0,0.06)",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    {/* Rank Badge */}
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        backgroundColor:
                          rankIdx === 0
                            ? "#10B98120"
                            : rankIdx === 1
                            ? "#0284C720"
                            : "rgba(0,0,0,0.05)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "DMSans-Bold",
                          color:
                            rankIdx === 0
                              ? "#10B981"
                              : rankIdx === 1
                              ? "#0284C7"
                              : colors.onSurfaceVariant || "#79747E",
                        }}
                      >
                        #{rankIdx + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "DMSans-Bold",
                          color:
                            colors.onSurface ||
                            (isDark ? "#FFFFFF" : "#1D1B20"),
                        }}
                        numberOfLines={1}
                      >
                        {sub.originalLabel || sub.name}
                      </Text>
                    </View>
                  </View>

                  {/* Marks & Grade Badge */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "DMSans-Bold",
                        color: grade.color,
                      }}
                    >
                      {sub.marks}
                    </Text>
                    <View
                      style={{
                        backgroundColor: grade.color,
                        paddingHorizontal: 6,
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
                        {grade.grade}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Progress Track */}
                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.outlineVariant
                      ? colors.outlineVariant + "30"
                      : "rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, Math.max(5, ratio))}%`,
                      height: "100%",
                      backgroundColor: grade.color,
                      borderRadius: 3,
                    }}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Selected Subject Detail Card */}
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
                  fontSize: 15,
                  fontFamily: "DMSans-Bold",
                  color: colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
                }}
              >
                {activeSubject.originalLabel || activeSubject.name}
              </Text>
              <View
                style={{
                  backgroundColor: activeGrade.color,
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
                  Grade {activeGrade.grade}
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
              {activeGrade.label} performance •{" "}
              {activeSubject.marks >= classAvg
                ? `+${(activeSubject.marks - classAvg).toFixed(1)} vs class avg`
                : `${(activeSubject.marks - classAvg).toFixed(1)} vs class avg`}
            </Text>
          </View>

          {/* Marks Score Callout */}
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 22,
                fontFamily: "DMSans-Bold",
                color: activeGrade.color,
              }}
            >
              {activeSubject.marks}{" "}
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "DMSans-Medium",
                  color: colors.onSurfaceVariant,
                }}
              >
                / {chartMaxY}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TeacherPerformanceCard;
