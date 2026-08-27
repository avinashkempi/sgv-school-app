import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";

export default function RaiseComplaintScreen() {
  const router = useRouter();
  // eslint-disable-next-line no-unused-vars
  const { styles, colors } = useTheme();
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
          <View style={{ padding: 16, paddingTop: 24 }}>
            <Header
              title={t("complaints.raiseComplaint", "Raise Complaint")}
              showBack
            />
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Visibility Selection (For Students) */}
            {userRole === "student" && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginBottom: 8,
                    fontFamily: FONTS.medium,
                  }}
                >
                  {t("common.to", "To")}
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    onPress={() => setVisibility("teacher")}
                    style={{
                      flex: 1,
                      padding: 16,
                      backgroundColor:
                        visibility === "teacher"
                          ? colors.primary + "15"
                          : colors.cardBackground,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        visibility === "teacher"
                          ? colors.primary
                          : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <MaterialIcons
                      name="person"
                      size={24}
                      color={
                        visibility === "teacher"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={{
                        marginTop: 8,
                        fontFamily: FONTS.bold,
                        color:
                          visibility === "teacher"
                            ? colors.primary
                            : colors.textSecondary,
                      }}
                    >
                      ${t("common.classTeacher", "Class Teacher")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setVisibility("admin")}
                    style={{
                      flex: 1,
                      padding: 16,
                      backgroundColor:
                        visibility === "admin"
                          ? colors.primary + "15"
                          : colors.cardBackground,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        visibility === "admin" ? colors.primary : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <MaterialIcons
                      name="admin-panel-settings"
                      size={24}
                      color={
                        visibility === "admin"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={{
                        marginTop: 8,
                        fontFamily: FONTS.bold,
                        color:
                          visibility === "admin"
                            ? colors.primary
                            : colors.textSecondary,
                      }}
                    >
                      ${t("common.headmaster", "Headmaster")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* For Teachers (Read Only) */}
            {userRole === "teacher" && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginBottom: 8,
                    fontFamily: FONTS.medium,
                  }}
                >
                  To
                </Text>
                <View
                  style={{
                    padding: 16,
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <MaterialIcons
                    name="business"
                    size={24}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      color: colors.textPrimary,
                    }}
                  >
                    $
                    {t(
                      "common.managementSuperAdmin",
                      "Management (Super Admin)"
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* Category */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontFamily: FONTS.medium,
                }}
              >
                {t("common.category", "Category")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {categories.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor:
                          category === cat
                            ? colors.primary
                            : colors.cardBackground,
                        borderRadius: 20,
                      }}
                    >
                      <Text
                        style={{
                          color: category === cat ? "#fff" : colors.textPrimary,
                          fontFamily: FONTS.medium,
                        }}
                      >
                        {t("complaints.category_" + cat, cat)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Title */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontFamily: FONTS.medium,
                }}
              >
                {t("common.subjectLabel", "Subject")}
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t(
                  "complaints.subjectPlaceholder",
                  "Brief subject of the complaint"
                )}
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.cardBackground,
                  padding: 16,
                  borderRadius: 12,
                  color: colors.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: FONT_SIZES.lg,
                }}
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontFamily: FONTS.medium,
                }}
              >
                {t("common.description", "Description")}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t(
                  "common.detailedDescriptionPlaceholder",
                  "Detailed description..."
                )}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={{
                  backgroundColor: colors.cardBackground,
                  padding: 16,
                  borderRadius: 12,
                  color: colors.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: FONT_SIZES.lg,
                  minHeight: 120,
                }}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={raiseComplaintMutation.isPending}
              style={{
                backgroundColor: colors.primary,
                padding: 18,
                borderRadius: 16,
                alignItems: "center",
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
                opacity: raiseComplaintMutation.isPending ? 0.7 : 1,
              }}
            >
              {raiseComplaintMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: FONTS.bold,
                    fontSize: FONT_SIZES.xl,
                  }}
                >
                  ${t("complaints.submitComplaint", "Submit Complaint")}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
