import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../theme";
import Card from "./Card";
import Badge from "./ui/Badge";
import ProgressBar from "./ui/ProgressBar";

/**
 * ExamCard Component
 * Reusable card for displaying exam information
 *
 * @param {Object} exam - Exam object
 * @param {Function} onPress - Optional press handler
 * @param {Function} onEnterMarks - Handler for enter marks action
 * @param {Function} onEdit - Handler for edit action
 * @param {Function} onDelete - Handler for delete action
 * @param {Function} onPublish - Handler for publish marks action
 * @param {Boolean} showActions - Whether to show action buttons
 */
export default function ExamCard({
  exam,
  onPress,
  onEnterMarks,
  onEdit,
  onDelete,
  onPublish,
  showActions = true,
  showProgress = false,
  marksEntered = 0,
  totalStudents = 0,
}) {
  const { colors } = useTheme();

  const getExamTypeColor = (type) => {
    const typeColors = {
      FA1: "#2196F3",
      FA2: "#03A9F4",
      SA1: "#9C27B0",
      FA3: "#FF9800",
      FA4: "#FF5722",
      SA2: "#F44336",
    };
    return typeColors[type] || "#2196F3";
  };

  const typeColor = getExamTypeColor(exam.standardizedType);

  const formatDate = (date) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const progressPercentage =
    totalStudents > 0 ? (marksEntered / totalStudents) * 100 : 0;

  return (
    <Card
      variant="elevated"
      style={{ marginBottom: 12 }}
      contentStyle={{ padding: 0 }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          padding: 16,
        })}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  backgroundColor: typeColor + "18",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: typeColor + "30",
                }}
              >
                <Text
                  style={{
                    color: typeColor,
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.bold,
                  }}
                >
                  {exam.standardizedType}
                </Text>
              </View>
              {exam.marksPublished && (
                <Badge
                  label="Published"
                  variant="success"
                  size="sm"
                  dot
                />
              )}
            </View>
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
                marginBottom: 4,
              }}
            >
              {exam.name}
            </Text>
            {exam.subject && (
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                }}
              >
                {exam.subject.name}
              </Text>
            )}
          </View>
          <Badge
            label={exam.status || "Scheduled"}
            variant={
              exam.status === "completed"
                ? "success"
                : exam.status === "ongoing"
                ? "warning"
                : exam.status === "cancelled"
                ? "error"
                : "neutral"
            }
            size="sm"
          />
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: colors.outlineVariant,
            marginBottom: 12,
          }}
        />

        {/* Details */}
        <View
          style={{
            flexDirection: "row",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: showProgress ? 12 : 0,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons
              name="calendar-today"
              size={16}
              color={colors.onSurfaceVariant}
            />
            <Text
              style={{
                color: colors.onSurface,
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.medium,
              }}
            >
              {formatDate(exam.date)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons
              name="assessment"
              size={16}
              color={colors.onSurfaceVariant}
            />
            <Text
              style={{
                color: colors.onSurface,
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.medium,
              }}
            >
              {exam.totalMarks} marks
            </Text>
          </View>
          {exam.duration && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialIcons
                name="schedule"
                size={16}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: colors.onSurface,
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.medium,
                }}
              >
                {exam.duration} mins
              </Text>
            </View>
          )}
          {exam.startTime && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialIcons
                name="access-time"
                size={16}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: colors.onSurface,
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.medium,
                }}
              >
                {exam.startTime}
              </Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {showProgress && (
          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                }}
              >
                Marks Entry Progress
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.bold,
                  color: colors.primary,
                }}
              >
                {marksEntered}/{totalStudents} ({progressPercentage.toFixed(0)}
                %)
              </Text>
            </View>
            <ProgressBar
              progress={totalStudents > 0 ? marksEntered / totalStudents : 0}
              variant={progressPercentage === 100 ? "success" : "primary"}
              height={6}
            />
          </View>
        )}

        {/* Action Buttons */}
        {showActions && (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {onEnterMarks && (
              <Pressable
                onPress={onEnterMarks}
                style={({ pressed }) => ({
                  flex: 1,
                  minWidth: 100,
                  backgroundColor: pressed
                    ? colors.primary + "DD"
                    : colors.primary,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: RADIUS.md || 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                })}
              >
                <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                  }}
                >
                  Enter Marks
                </Text>
              </Pressable>
            )}
            {onPublish && !exam.marksPublished && (
              <Pressable
                onPress={onPublish}
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.success + "DD"
                    : colors.success,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: RADIUS.md || 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                })}
              >
                <MaterialIcons name="publish" size={18} color="#FFFFFF" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                  }}
                >
                  Publish
                </Text>
              </Pressable>
            )}
            {onEdit && (
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.surfaceContainerHighest
                    : colors.surfaceContainerHigh,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: RADIUS.md || 12,
                })}
              >
                <MaterialIcons name="edit" size={18} color={colors.onSurface} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                onPress={onDelete}
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.errorContainer
                    : colors.errorContainer + "80",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: RADIUS.md || 12,
                })}
              >
                <MaterialIcons name="delete" size={18} color={colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    </Card>
  );
}
