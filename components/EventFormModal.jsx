import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../theme";
import { formatISTDisplayDate, formatDate } from "../utils/date";

export default function EventFormModal({
  isVisible,
  onClose,
  selectedDate,
  onSuccess,
  editItem = null,
  isLoading = false,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSchoolEvent, setIsSchoolEvent] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const isEditing = !!editItem;

  useEffect(() => {
    if (isVisible) {
      if (isEditing && editItem) {
        setTitle(editItem.title || "");
        setDescription(editItem.description || "");
        setIsSchoolEvent(
          editItem.isSchoolEvent !== undefined ? editItem.isSchoolEvent : false
        );
        setIsHoliday(
          editItem.isHoliday !== undefined ? editItem.isHoliday : false
        );
      } else {
        setTitle("");
        setDescription("");
        setIsSchoolEvent(false);
        setIsHoliday(false);
      }
      setErrors({});
      setTouched({});
    }
  }, [isVisible, isEditing, editItem]);

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "title":
        if (!value.trim()) error = "Title is required";
        else if (value.trim().length < 3)
          error = "Title must be at least 3 characters";
        break;
      case "description":
        if (value.trim() && value.trim().length < 5)
          error = "Description must be at least 5 characters if provided";
        break;
    }
    return error;
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field, value) => {
    if (field === "title") setTitle(value);
    if (field === "description") setDescription(value);

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = () => {
    const titleError = validateField("title", title);
    const descriptionError = validateField("description", description);

    setErrors({
      title: titleError,
      description: descriptionError,
    });
    setTouched({
      title: true,
      description: true,
    });

    if (titleError || descriptionError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Pass data to parent component
    onSuccess({
      title: title.trim(),
      date: isEditing ? editItem.date : selectedDate,
      description: description.trim(),
      isSchoolEvent: isSchoolEvent,
      isHoliday: isHoliday,
      _id: editItem?._id,
    });
  };

  const formattedDisplayDate = formatISTDisplayDate(
    isEditing ? editItem?.date : selectedDate,
    { weekday: "short", day: "numeric", month: "short", year: "numeric" }
  ) || formatDate(isEditing ? editItem?.date : selectedDate);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
                borderColor: colors.outlineVariant ? colors.outlineVariant + "35" : "rgba(0,0,0,0.1)",
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View
                  style={[
                    styles.headerIconContainer,
                    {
                      backgroundColor: isDark
                        ? colors.primaryContainer
                        : colors.primaryContainer + "60",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isEditing ? "edit-calendar" : "event"}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: colors.onSurface || colors.textPrimary },
                    ]}
                  >
                    {isEditing ? "Edit Event" : "Create New Event"}
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: colors.onSurfaceVariant || colors.textSecondary },
                    ]}
                  >
                    {isEditing ? "Update event details" : "Schedule a school activity"}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerHighest
                      : "rgba(0,0,0,0.05)",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Selected Date Chip */}
            <View
              style={[
                styles.dateBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(208, 188, 255, 0.12)"
                    : "rgba(79, 55, 139, 0.08)",
                  borderColor: isDark
                    ? "rgba(208, 188, 255, 0.25)"
                    : "rgba(79, 55, 139, 0.2)",
                },
              ]}
            >
              <MaterialIcons
                name="calendar-today"
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.dateBadgeText,
                  { color: colors.primary },
                ]}
              >
                {formattedDisplayDate}
              </Text>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.onSurfaceVariant || colors.textSecondary },
                ]}
              >
                EVENT TITLE *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerHigh
                      : "rgba(0,0,0,0.025)",
                    color: colors.textPrimary,
                    borderColor:
                      errors.title && touched.title
                        ? colors.error
                        : colors.outlineVariant
                        ? colors.outlineVariant + "40"
                        : "rgba(0,0,0,0.12)",
                  },
                ]}
                placeholder="e.g. Science Fair, Annual Day, Sports Meet"
                placeholderTextColor={colors.textSecondary + "80"}
                value={title}
                onChangeText={(text) => handleChange("title", text)}
                onBlur={() => handleBlur("title", title)}
                maxLength={100}
              />
              {errors.title && touched.title && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.title}
                </Text>
              )}
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.onSurfaceVariant || colors.textSecondary },
                ]}
              >
                DESCRIPTION (OPTIONAL)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerHigh
                      : "rgba(0,0,0,0.025)",
                    color: colors.textPrimary,
                    borderColor:
                      errors.description && touched.description
                        ? colors.error
                        : colors.outlineVariant
                        ? colors.outlineVariant + "40"
                        : "rgba(0,0,0,0.12)",
                  },
                ]}
                placeholder="Add agenda, dress code, timings, or additional info..."
                placeholderTextColor={colors.textSecondary + "80"}
                value={description}
                onChangeText={(text) => handleChange("description", text)}
                onBlur={() => handleBlur("description", description)}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {errors.description && touched.description && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.description}
                </Text>
              )}
            </View>

            {/* Toggle Card 1: School Event */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setIsSchoolEvent(!isSchoolEvent);
              }}
              style={({ pressed }) => [
                styles.toggleCard,
                {
                  backgroundColor: isSchoolEvent
                    ? isDark
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(245, 158, 11, 0.08)"
                    : isDark
                    ? colors.surfaceContainerHigh
                    : "rgba(0,0,0,0.02)",
                  borderColor: isSchoolEvent
                    ? "#F59E0B"
                    : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.toggleCardLeft}>
                <View
                  style={[
                    styles.toggleIconContainer,
                    {
                      backgroundColor: isSchoolEvent
                        ? "rgba(245, 158, 11, 0.2)"
                        : isDark
                        ? colors.surfaceContainerHighest
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="school"
                    size={20}
                    color={isSchoolEvent ? "#F59E0B" : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.toggleTitle,
                      {
                        color: isSchoolEvent
                          ? isDark
                            ? "#FBBF24"
                            : "#D97706"
                          : colors.textPrimary,
                      },
                    ]}
                  >
                    Official School Event
                  </Text>
                  <Text
                    style={[
                      styles.toggleSubtitle,
                      { color: colors.onSurfaceVariant || colors.textSecondary },
                    ]}
                  >
                    Highlights in calendar with special badge
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name={isSchoolEvent ? "check-circle" : "radio-button-unchecked"}
                size={22}
                color={isSchoolEvent ? "#F59E0B" : colors.textSecondary + "60"}
              />
            </Pressable>

            {/* Toggle Card 2: Holiday */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setIsHoliday(!isHoliday);
              }}
              style={({ pressed }) => [
                styles.toggleCard,
                {
                  backgroundColor: isHoliday
                    ? isDark
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(239, 68, 68, 0.08)"
                    : isDark
                    ? colors.surfaceContainerHigh
                    : "rgba(0,0,0,0.02)",
                  borderColor: isHoliday
                    ? "#EF4444"
                    : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.toggleCardLeft}>
                <View
                  style={[
                    styles.toggleIconContainer,
                    {
                      backgroundColor: isHoliday
                        ? "rgba(239, 68, 68, 0.2)"
                        : isDark
                        ? colors.surfaceContainerHighest
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="beach-access"
                    size={20}
                    color={isHoliday ? "#EF4444" : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.toggleTitle,
                      {
                        color: isHoliday
                          ? isDark
                            ? "#F87171"
                            : "#DC2626"
                          : colors.textPrimary,
                      },
                    ]}
                  >
                    Mark as Holiday
                  </Text>
                  <Text
                    style={[
                      styles.toggleSubtitle,
                      { color: colors.onSurfaceVariant || colors.textSecondary },
                    ]}
                  >
                    Skips daily student/staff attendance
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name={isHoliday ? "check-circle" : "radio-button-unchecked"}
                size={22}
                color={isHoliday ? "#EF4444" : colors.textSecondary + "60"}
              />
            </Pressable>

            {isHoliday && (
              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(239, 68, 68, 0.12)"
                      : "rgba(239, 68, 68, 0.06)",
                    borderColor: isDark
                      ? "rgba(239, 68, 68, 0.25)"
                      : "rgba(239, 68, 68, 0.2)",
                  },
                ]}
              >
                <MaterialIcons
                  name="info-outline"
                  size={16}
                  color={colors.error || "#EF4444"}
                  style={{ marginRight: 6, marginTop: 1 }}
                />
                <Text
                  style={[
                    styles.warningText,
                    { color: colors.error || "#EF4444" },
                  ]}
                >
                  Marking as holiday will disable attendance tracking and clear existing records for this day.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerHighest
                      : "rgba(0,0,0,0.05)",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={onClose}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: isLoading ? 0.7 : pressed ? 0.9 : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text
                      style={[styles.submitBtnText, { color: colors.white }]}
                    >
                      {isEditing ? "Updating..." : "Creating..."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <MaterialIcons
                      name={isEditing ? "check" : "add"}
                      size={18}
                      color={colors.white}
                    />
                    <Text
                      style={[styles.submitBtnText, { color: colors.white }]}
                    >
                      {isEditing ? "Update Event" : "Create Event"}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
  },
  container: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  dateBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  errorText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.medium,
    marginTop: 4,
    marginLeft: 4,
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  toggleCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  toggleSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  warningText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    lineHeight: LINE_HEIGHTS.xs,
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  submitBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});

