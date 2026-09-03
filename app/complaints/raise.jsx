import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import Header from "../../components/Header";
import Button from "../../components/Button";
import TextInput from "../../components/TextInput";
import Card from "../../components/Card";
import { useLabel } from "../../context/LabelsContext";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";

export default function RaiseComplaintScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLabel();
  const { showToast } = useToast();
  const { user } = useAuth();
  const userRole = user?.role;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Facilities");
  // eslint-disable-next-line no-unused-vars
  const [priority, setPriority] = useState("Medium");
  const [visibility, setVisibility] = useState("all_admins");
  // eslint-disable-next-line no-unused-vars
  const [targetTeacher, setTargetTeacher] = useState("");

  useEffect(() => {
    if (userRole === "teacher") {
      setCategory("Management");
      setVisibility("super_admin");
    }
  }, [userRole]);

  const raiseComplaintMutation = useApiMutation({
    mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/complaints`, "POST"),
    onSuccess: () => {
      showToast(
        t("complaints.raisedSuccess", "Complaint raised successfully"),
        "success"
      );
      router.back();
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("complaints.raisedFailure", "Failed to raise complaint"),
        "error"
      ),
  });

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      showToast(t("common.fillAllFields", "Please fill all fields"), "error");
      return;
    }

    raiseComplaintMutation.mutate({
      title,
      description,
      category,
      priority,
      visibility,
    });
  };

  const categories =
    userRole === "teacher"
      ? ["Management", "Facility", "Other"]
      : ["Academic", "Facility", "Transport", "Discipline", "Other"];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: SPACING.lg || 16,
              paddingTop: SPACING.md || 12,
            }}
          >
            <Header
              title={t("complaints.raiseComplaint", "Raise Complaint")}
              subtitle={t("complaints.submitIssue", "Submit an issue or grievance")}
              variant="modal"
            />
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: SPACING.lg || 16,
              paddingBottom: SPACING.xxxl || 40,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Visibility Selection (For Students) */}
            {userRole === "student" && (
              <View style={{ marginBottom: SPACING.xl || 20 }}>
                <Text
                  style={{
                    color: colors.onSurfaceVariant,
                    marginBottom: SPACING.xs || 8,
                    fontFamily: FONTS.medium,
                    fontSize: FONT_SIZES.sm,
                  }}
                >
                  {t("common.to", "To")}
                </Text>
                <View style={{ flexDirection: "row", gap: SPACING.md || 12 }}>
                  <Pressable
                    onPress={() => setVisibility("teacher")}
                    style={{
                      flex: 1,
                      padding: SPACING.lg || 16,
                      backgroundColor:
                        visibility === "teacher"
                          ? colors.primaryContainer
                          : colors.surfaceContainer,
                      borderRadius: RADIUS.md || 12,
                      borderWidth: 1.5,
                      borderColor:
                        visibility === "teacher"
                          ? colors.primary
                          : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <MaterialIcons
                      name="person"
                      size={ICON_SIZES.md || 24}
                      color={
                        visibility === "teacher"
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={{
                        marginTop: SPACING.xs || 8,
                        fontFamily: FONTS.bold,
                        fontSize: FONT_SIZES.sm,
                        color:
                          visibility === "teacher"
                            ? colors.onPrimaryContainer
                            : colors.onSurfaceVariant,
                      }}
                    >
                      {t("common.classTeacher", "Class Teacher")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setVisibility("admin")}
                    style={{
                      flex: 1,
                      padding: SPACING.lg || 16,
                      backgroundColor:
                        visibility === "admin"
                          ? colors.primaryContainer
                          : colors.surfaceContainer,
                      borderRadius: RADIUS.md || 12,
                      borderWidth: 1.5,
                      borderColor:
                        visibility === "admin" ? colors.primary : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <MaterialIcons
                      name="admin-panel-settings"
                      size={ICON_SIZES.md || 24}
                      color={
                        visibility === "admin"
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={{
                        marginTop: SPACING.xs || 8,
                        fontFamily: FONTS.bold,
                        fontSize: FONT_SIZES.sm,
                        color:
                          visibility === "admin"
                            ? colors.onPrimaryContainer
                            : colors.onSurfaceVariant,
                      }}
                    >
                      {t("common.headmaster", "Headmaster")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* For Teachers (Read Only) */}
            {userRole === "teacher" && (
              <View style={{ marginBottom: SPACING.xl || 20 }}>
                <Text
                  style={{
                    color: colors.onSurfaceVariant,
                    marginBottom: SPACING.xs || 8,
                    fontFamily: FONTS.medium,
                    fontSize: FONT_SIZES.sm,
                  }}
                >
                  {t("common.to", "To")}
                </Text>
                <Card
                  variant="filled"
                  noMargin
                  contentStyle={{
                    padding: SPACING.md || 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.md || 12,
                  }}
                >
                  <MaterialIcons
                    name="business"
                    size={ICON_SIZES.md || 24}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      fontSize: FONT_SIZES.sm,
                      color: colors.onSurface,
                    }}
                  >
                    {t(
                      "common.managementSuperAdmin",
                      "Management (Super Admin)"
                    )}
                  </Text>
                </Card>
              </View>
            )}

            {/* Category */}
            <View style={{ marginBottom: SPACING.xl || 20 }}>
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  marginBottom: SPACING.xs || 8,
                  fontFamily: FONTS.medium,
                  fontSize: FONT_SIZES.sm,
                }}
              >
                {t("common.category", "Category")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: SPACING.sm || 8 }}>
                  {categories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={{
                          paddingHorizontal: SPACING.lg || 16,
                          paddingVertical: SPACING.xs || 8,
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.surfaceContainerHighest,
                          borderRadius: RADIUS.full || 20,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.onPrimary : colors.onSurfaceVariant,
                            fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                            fontSize: FONT_SIZES.xs,
                          }}
                        >
                          {t("complaints.category_" + cat, cat)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Subject / Title */}
            <View style={{ marginBottom: SPACING.lg || 16 }}>
              <TextInput
                label={t("common.subjectLabel", "Subject")}
                value={title}
                onChangeText={setTitle}
                placeholder={t(
                  "complaints.subjectPlaceholder",
                  "Brief subject of the complaint"
                )}
                variant="outlined"
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: SPACING.xxl || 24 }}>
              <TextInput
                label={t("common.description", "Description")}
                value={description}
                onChangeText={setDescription}
                placeholder={t(
                  "common.detailedDescriptionPlaceholder",
                  "Detailed description..."
                )}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                inputStyle={{ height: 110, paddingTop: 10 }}
                style={{ height: 120, alignItems: "flex-start" }}
                variant="outlined"
              />
            </View>

            {/* Submit Button */}
            <Button
              variant="filled"
              size="lg"
              fullWidth
              onPress={handleSubmit}
              loading={raiseComplaintMutation.isPending}
            >
              {t("complaints.submitComplaint", "Submit Complaint")}
            </Button>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
