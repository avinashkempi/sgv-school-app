import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { FONTS, FONT_SIZES } from "../../theme";

// Helper for vibrant color palettes per grade
export const getGradePalette = (grade) => {
  switch (grade) {
    case "A+":
      return {
        primary: "#059669", // Emerald
        secondary: "#34D399",
        bg: "rgba(5, 150, 105, 0.12)",
        glow: "rgba(5, 150, 105, 0.35)",
        text: "#065F46", // Dark crisp emerald for high-contrast in light mode
        darkText: "#6EE7B7", // Mint for dark mode
      };
    case "A":
      return {
        primary: "#0284C7", // Sky/Sapphire
        secondary: "#38BDF8",
        bg: "rgba(2, 132, 199, 0.12)",
        glow: "rgba(2, 132, 199, 0.35)",
        text: "#0369A1",
        darkText: "#7DD3FC",
      };
    case "B+":
      return {
        primary: "#7C3AED", // Violet
        secondary: "#A78BFA",
        bg: "rgba(124, 58, 237, 0.12)",
        glow: "rgba(124, 58, 237, 0.35)",
        text: "#5B21B6",
        darkText: "#C4B5FD",
      };
    case "B":
      return {
        primary: "#D97706", // Amber
        secondary: "#FBBF24",
        bg: "rgba(217, 119, 6, 0.12)",
        glow: "rgba(217, 119, 6, 0.35)",
        text: "#92400E",
        darkText: "#FDE68A",
      };
    case "C":
    case "F":
      return {
        primary: "#DC2626", // Crimson
        secondary: "#F87171",
        bg: "rgba(220, 38, 38, 0.12)",
        glow: "rgba(220, 38, 38, 0.35)",
        text: "#991B1B",
        darkText: "#FCA5A5",
      };
    default:
      return {
        primary: "#4B5563",
        secondary: "#9CA3AF",
        bg: "rgba(75, 85, 99, 0.12)",
        glow: "rgba(75, 85, 99, 0.35)",
        text: "#1F2937",
        darkText: "#D1D5DB",
      };
  }
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ReportCardGauge({
  percentage = 0,
  grade = "-",
  size = 136,
  strokeWidth = 11,
  showGrade = true,
  animate = true,
}) {
  const palette = getGradePalette(grade);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const validPct = Math.min(Math.max(Number(percentage) || 0, 0), 100);

  // Animated strokeDashoffset and display number
  const animProgress = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (animate) {
      Animated.timing(animProgress, {
        toValue: validPct,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    } else {
      animProgress.setValue(validPct);
      setDisplayValue(validPct.toFixed(1));
    }
  }, [validPct, animate, animProgress]);

  useEffect(() => {
    const listener = animProgress.addListener(({ value: v }) => {
      setDisplayValue(v.toFixed(1));
    });
    return () => animProgress.removeListener(listener);
  }, [animProgress]);

  const strokeDashoffset = animProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const trackColor = "rgba(255, 255, 255, 0.15)";

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.secondary} />
            <Stop offset="100%" stopColor={palette.primary} />
          </LinearGradient>
        </Defs>

        {/* Background Track Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated Gradient Progress Stroke */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Center Label & Grade */}
      <View style={styles.centerContent}>
        <View style={styles.percentageRow}>
          <Text style={styles.percentageText}>
            {displayValue}
          </Text>
          <Text style={styles.percentSymbol}>
            %
          </Text>
        </View>

        {showGrade && grade && grade !== "-" && (
          <View
            style={[
              styles.gradeChip,
              {
                backgroundColor: palette.primary,
                shadowColor: palette.primary,
              },
            ]}
          >
            <Text style={styles.gradeText}>
              Grade {grade}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  percentageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  percentageText: {
    fontSize: FONT_SIZES.display,
    fontFamily: FONTS.bold,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: "#FFFFFF",
  },
  percentSymbol: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginTop: 2,
    marginLeft: 1,
    color: "rgba(255, 255, 255, 0.95)",
  },
  gradeChip: {
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  gradeText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
});
