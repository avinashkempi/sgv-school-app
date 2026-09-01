import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";
import Card from "./Card";

/**
 * Parses date into standard App Date Tile representation (Month, Day, Weekday)
 */
const parseDateTile = (dateStr) => {
  if (!dateStr) return { month: "EXAM", day: "--", weekday: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: "EXAM", day: "--", weekday: "" };

  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

  return { month, day, weekday };
};

/**
 * Standard Exam Card Item — Consistent with App Card Design Language
 */
const ExamCardItem = React.memo(
  ({
    exam,
    colors,
    isDark,
    onExamPress,
    getExamTypeColor,
    isToday,
    isPast,
    getDaysUntil,
  }) => {
    const examColor = getExamTypeColor(exam.standardizedType);
    const past = isPast(exam.date);
    const today = isToday(exam.date);
    const daysLabel = getDaysUntil(exam.date);
    const subjectName = exam.subject?.name || exam.name || "Exam";
    const { month, day, weekday } = useMemo(
      () => parseDateTile(exam.date),
      [exam.date]
    );

    return (
      <Card
        variant="elevated"
        style={{
          marginBottom: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: today
            ? colors.error + "40"
            : colors.outlineVariant + "25",
          backgroundColor: today
            ? isDark
              ? colors.error + "10"
              : colors.error + "06"
            : colors.surfaceContainerLow,
        }}
        contentStyle={{ padding: 14 }}
      >
        <Pressable
          onPress={() => onExamPress?.(exam)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {/* Main Content Layout: Date Tile on Left + Info on Right */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            {/* Standard App Date Tile */}
            <View
              style={{
                width: 52,
                height: 64,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: today
                  ? colors.error + "50"
                  : past
                  ? colors.outlineVariant + "30"
                  : examColor + "40",
                backgroundColor: today
                  ? colors.error + "15"
                  : past
                  ? colors.surfaceContainerHigh
                  : examColor + "10",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 4,
                flexShrink: 0,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.bold,
                  letterSpacing: 0.5,
                  color: today
                    ? colors.error
                    : past
                    ? colors.onSurfaceVariant
                    : examColor,
                  textTransform: "uppercase",
                }}
              >
                {month}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: today ? colors.error : colors.onSurface,
                  marginTop: -2,
                  lineHeight: 24,
                }}
              >
                {day}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.medium,
                  color: today ? colors.error : colors.onSurfaceVariant,
                  marginTop: -2,
                }}
              >
                {weekday}
              </Text>
            </View>

            {/* Right Information Section */}
            <View style={{ flex: 1, minWidth: 0 }}>
              {/* Top Row: Exam Type Badge + Status / Countdown Pill */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                {/* Standardized Type Tag */}
                <View
                  style={{
                    backgroundColor: examColor + "18",
                    paddingHorizontal: 8,
                    paddingVertical: 2.5,
                    borderRadius: 6,
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
                    {exam.standardizedType || "EXAM"}
                  </Text>
                </View>

                {/* Status Indicator */}
                {today ? (
                  <View
                    style={{
                      backgroundColor: colors.error,
                      paddingHorizontal: 7,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: "#FFFFFF",
                      }}
                    />
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: FONT_SIZES.micro,
                        fontFamily: FONTS.bold,
                        letterSpacing: LETTER_SPACINGS.micro,
                      }}
                    >
                      TODAY
                    </Text>
                  </View>
                ) : exam.marksPublished ? (
                  <View
                    style={{
                      backgroundColor: colors.success + "18",
                      paddingHorizontal: 7,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={11}
                      color={colors.success}
                    />
                    <Text
                      style={{
                        color: colors.success,
                        fontSize: FONT_SIZES.micro,
                        fontFamily: FONTS.bold,
                        letterSpacing: LETTER_SPACINGS.micro,
                      }}
                    >
                      MARKS OUT
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: past
                        ? colors.surfaceContainerHigh
                        : daysLabel.toLowerCase().includes("tomorrow")
                        ? "#FF980018"
                        : colors.primaryContainer,
                      paddingHorizontal: 8,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.micro,
                        fontFamily: FONTS.bold,
                        color: past
                          ? colors.onSurfaceVariant
                          : daysLabel.toLowerCase().includes("tomorrow")
                          ? "#E65100"
                          : colors.primary,
                      }}
                    >
                      {daysLabel}
                    </Text>
                  </View>
                )}
              </View>

              {/* Subject Title */}
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  marginBottom: 6,
                  lineHeight: 22,
                }}
                numberOfLines={1}
              >
                {subjectName}
              </Text>

              {/* Meta Chips: Marks, Duration, Start Time, Room */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {/* Total Marks */}
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <MaterialIcons
                    name="grade"
                    size={13}
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

                {/* Duration */}
                {exam.duration ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MaterialIcons
                      name="schedule"
                      size={13}
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
                ) : null}

                {/* Start Time */}
                {exam.startTime ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MaterialIcons
                      name="access-time"
                      size={13}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      {exam.startTime}
                    </Text>
                  </View>
                ) : null}

                {/* Room */}
                {exam.room ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MaterialIcons
                      name="meeting-room"
                      size={13}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      {exam.room}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Instructions preview if available */}
              {exam.instructions ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 5,
                    marginTop: 6,
                    paddingTop: 6,
                    borderTopWidth: 1,
                    borderTopColor: colors.outlineVariant + "15",
                  }}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={12}
                    color={colors.onSurfaceVariant}
                    style={{ marginTop: 1 }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.regular,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {exam.instructions}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Action Row for Published Results */}
          {exam.marksPublished && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: colors.outlineVariant + "20",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialIcons
                  name="insights"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                    color: colors.primary,
                  }}
                >
                  View Marks & Report Card
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={18}
                color={colors.primary}
              />
            </View>
          )}
        </Pressable>
      </Card>
    );
  }
);

ExamCardItem.displayName = "ExamCardItem";

/**
 * ExamTimeline Component — Uses App Standard Card Design
 *
 * @param {Array} exams - Array of exam objects sorted by date
 * @param {Function} onExamPress - Handler for exam press
 */
export default function ExamTimeline({ exams = [], onExamPress }) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

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
    if (diffDays <= 7) return `In ${diffDays} days`;
    return `In ${Math.ceil(diffDays / 7)}w`;
  };

  const getExamTypeColor = (type) => {
    const typeColors = {
      FA1: "#2563EB",
      FA2: "#0284C7",
      SA1: "#7C3AED",
      FA3: "#D97706",
      FA4: "#DB2777",
      SA2: "#DC2626",
    };
    return typeColors[type] || "#2563EB";
  };

  if (!exams || exams.length === 0) {
    return (
      <Card
        variant="filled"
        style={{
          alignItems: "center",
          paddingVertical: 32,
          paddingHorizontal: 20,
          borderRadius: 16,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <MaterialIcons
            name="event-available"
            size={24}
            color={colors.primary}
          />
        </View>
        <Text
          style={{
            color: colors.onSurface,
            fontSize: FONT_SIZES.sm,
            fontFamily: FONTS.bold,
          }}
        >
          No exams in this list
        </Text>
        <Text
          style={{
            color: colors.onSurfaceVariant,
            fontSize: FONT_SIZES.xs,
            fontFamily: FONTS.regular,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          There are no exams matching this section.
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ marginBottom: 8 }}>
      {exams.map((exam, index) => (
        <ExamCardItem
          key={exam._id || index}
          exam={exam}
          colors={colors}
          isDark={isDark}
          onExamPress={onExamPress}
          getExamTypeColor={getExamTypeColor}
          isToday={isToday}
          isPast={isPast}
          getDaysUntil={getDaysUntil}
        />
      ))}
    </View>
  );
}
