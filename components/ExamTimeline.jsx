import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";

/**
 * Single timeline item — animated with Reanimated on UI thread.
 * Extracted as a separate component so each item owns its own shared values.
 */
const ExamTimelineItem = React.memo(
  ({
    exam,
    index,
    isLast,
    colors,
    onExamPress,
    getExamTypeColor,
    isToday,
    isPast,
    getDaysUntil,
    formatDate,
  }) => {
    const examColor = getExamTypeColor(exam.standardizedType);
    const past = isPast(exam.date);
    const today = isToday(exam.date);
    const daysLabel = getDaysUntil(exam.date);

    // Each item owns its animation shared value
    const progress = useSharedValue(0);

    useEffect(() => {
      progress.value = withDelay(
        index * 80,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [{ translateX: (1 - progress.value) * 30 }],
    }));

    return (
      <Animated.View
        style={[
          {
            flexDirection: "row",
            marginBottom: isLast ? 0 : 4,
          },
          animatedStyle,
        ]}
      >
        {/* Timeline Column */}
        <View style={{ alignItems: "center", width: 24 }}>
          {/* Dot */}
          <View
            style={{
              width: today ? 14 : 10,
              height: today ? 14 : 10,
              borderRadius: today ? 7 : 5,
              backgroundColor: past
                ? colors.outlineVariant
                : today
                ? colors.error
                : examColor,
              borderWidth: today ? 2.5 : 1.5,
              borderColor: today
                ? colors.error + "30"
                : past
                ? colors.surfaceContainerHighest
                : examColor + "30",
              marginTop: 4,
              ...(today
                ? {
                    shadowColor: colors.error,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 4,
                    elevation: 3,
                  }
                : {}),
            }}
          />

          {/* Gradient Connector Line */}
          {!isLast && (
            <View
              style={{
                width: 2,
                flex: 1,
                marginVertical: 2,
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={[
                  past ? colors.outlineVariant + "60" : examColor + "60",
                  past ? colors.outlineVariant + "20" : examColor + "20",
                ]}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>

        {/* Exam Card */}
        <Pressable
          onPress={() => onExamPress?.(exam)}
          style={({ pressed }) => ({
            flex: 1,
            marginLeft: 10,
            backgroundColor: pressed
              ? colors.surfaceContainerHigh
              : today
              ? examColor + "08"
              : colors.surfaceContainerHighest,
            borderRadius: 12,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: past
              ? colors.outlineVariant
              : today
              ? colors.error
              : examColor,
            opacity: past ? 0.65 : 1,
            marginBottom: 10,
            ...(today
              ? {
                  borderWidth: 1,
                  borderColor: colors.error + "20",
                }
              : {}),
          })}
        >
          {/* Top Row: Type Badge + Date */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  backgroundColor: examColor + "18",
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 5,
                }}
              >
                <Text
                  style={{
                    color: examColor,
                    fontSize: FONT_SIZES.micro,
                    fontFamily: FONTS.bold,
                    letterSpacing: LETTER_SPACINGS.xs,
                  }}
                >
                  {exam.standardizedType}
                </Text>
              </View>
              {today && (
                <View
                  style={{
                    backgroundColor: colors.error,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 5,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <MaterialIcons name="circle" size={5} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.bold,
                      letterSpacing: LETTER_SPACINGS.micro,
                    }}
                  >
                    TODAY
                  </Text>
                </View>
              )}
              {exam.marksPublished && (
                <View
                  style={{
                    backgroundColor: colors.success + "18",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 5,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <MaterialIcons
                    name="check-circle"
                    size={10}
                    color={colors.success}
                  />
                  <Text
                    style={{
                      color: colors.success,
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    MARKS OUT
                  </Text>
                </View>
              )}
            </View>

            {/* Countdown / Date Badge */}
            <View
              style={{
                backgroundColor: past
                  ? colors.surfaceContainerHigh
                  : today
                  ? colors.error + "15"
                  : colors.primaryContainer,
                paddingHorizontal: 8,
                paddingVertical: 2.5,
                borderRadius: 6,
                alignItems: "center",
                minWidth: 46,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.bold,
                  color: past
                    ? colors.onSurfaceVariant
                    : today
                    ? colors.error
                    : colors.primary,
                }}
              >
                {daysLabel}
              </Text>
            </View>
          </View>

          {/* Subject Name */}
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
              marginBottom: 4,
            }}
          >
            {exam.subject?.name || exam.name}
          </Text>

          {/* Bottom Row: Date + Marks + Duration */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginTop: 2,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <MaterialIcons
                name="calendar-today"
                size={12}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                }}
              >
                {formatDate(exam.date)}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <MaterialIcons
                name="assessment"
                size={12}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                }}
              >
                {exam.totalMarks} marks
              </Text>
            </View>
            {exam.duration && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <MaterialIcons
                  name="schedule"
                  size={12}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  {exam.duration}m
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

ExamTimelineItem.displayName = "ExamTimelineItem";

/**
 * ExamTimeline Component — Enhanced with Reanimated
 * Visual timeline showing upcoming and past exams with UI-thread animations
 *
 * @param {Array} exams - Array of exam objects sorted by date
 * @param {Function} onExamPress - Handler for exam press
 */
export default function ExamTimeline({ exams = [], onExamPress }) {
  const { colors } = useTheme();

  const isToday = (date) => {
    const today = new Date();
    const examDate = new Date(date);
    return today.toDateString() === examDate.toDateString();
  };

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(date);
    examDate.setHours(0, 0, 0, 0);
    return examDate < today;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(date);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
    if (diffDays <= 7) return `${diffDays} days`;
    return `${Math.ceil(diffDays / 7)}w`;
  };

  const getExamTypeColor = (type) => {
    const typeColors = {
      FA1: "#2196F3",
      FA2: "#03A9F4",
      SA1: "#9C27B0",
      FA3: "#FF9800",
      FA4: "#FF5722",
      SA2: "#E91E63",
    };
    return typeColors[type] || "#2196F3";
  };

  if (!exams || exams.length === 0) {
    return (
      <View
        style={{
          alignItems: "center",
          paddingVertical: 48,
          backgroundColor: colors.surfaceContainerHighest,
          borderRadius: 16,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons
            name="event-available"
            size={36}
            color={colors.primary}
          />
        </View>
        <Text
          style={{
            color: colors.onSurfaceVariant,
            fontSize: FONT_SIZES.md,
            fontFamily: FONTS.medium,
          }}
        >
          No exams scheduled
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 8 }}>
      {exams.map((exam, index) => (
        <ExamTimelineItem
          key={exam._id || index}
          exam={exam}
          index={index}
          isLast={index === exams.length - 1}
          colors={colors}
          onExamPress={onExamPress}
          getExamTypeColor={getExamTypeColor}
          isToday={isToday}
          isPast={isPast}
          getDaysUntil={getDaysUntil}
          formatDate={formatDate}
        />
      ))}
    </View>
  );
}
