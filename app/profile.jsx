import React, { useState, useMemo } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../utils/storage";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import { useToast } from "../components/ToastProvider";
import { formatDate } from "../utils/date";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useLabel } from "../context/LabelsContext";
import {
  formatUserName,
  formatUserDesignationOrRole,
  toTitleCase,
} from "../utils/userFormatters";

import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../hooks/useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import apiConfig from "../config/apiConfig";

import Card from "../components/Card";
import Button from "../components/Button";
import AppTextInput from "../components/TextInput";
import { LoadingState } from "../components/StateComponents";
import Header from "../components/Header";
import { Image } from "expo-image";
import {
  compressAvatar,
  uploadProfilePhoto,
  getAvatarUrl,
} from "../utils/cloudinaryUpload";
import AppRefreshControl from "../components/ui/AppRefreshControl";

export default function ProfileScreen() {
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();
  const { user: authUser, logout, updateUser } = useAuth();
  const { t } = useLabel();
  const [refreshing, setRefreshing] = useState(false);

  const [showPhotoOptionsModal, setShowPhotoOptionsModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    data: user,
    refetch,
    isLoading,
  } = useApiQuery(["currentUser"], `${apiConfig.baseUrl}/auth/me`, {
    ...CACHE_TIERS.MODERATE,
    placeholderData: authUser ? { user: authUser } : undefined,
    select: (data) => data.user,
  });

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(newPassword);
  const hasNumbersOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isDifferentFromCurrent =
    !currentPassword || newPassword !== currentPassword;
  const passwordsMatch = Boolean(
    confirmPassword && newPassword === confirmPassword
  );

  const strengthScore = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasLetters && hasNumbersOrSpecial) score += 1;
    if (
      newPassword.length >= 10 &&
      /[A-Z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword)
    )
      score += 1;
    return Math.min(score, 3);
  }, [newPassword, hasMinLength, hasLetters, hasNumbersOrSpecial]);

  const strengthDetails = useMemo(() => {
    if (!newPassword) return { label: "", color: "transparent" };
    if (strengthScore <= 1) return { label: "Weak", color: colors.error };
    if (strengthScore === 2)
      return { label: "Good", color: colors.roleStudent || "#E27200" };
    return { label: "Strong", color: colors.success };
  }, [strengthScore, newPassword, colors]);

  const isPasswordFormValid = Boolean(
    currentPassword?.trim() &&
      hasMinLength &&
      isDifferentFromCurrent &&
      passwordsMatch
  );

  const resetPasswordForm = () => {
    setShowChangePasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const changePasswordMutation = useApiMutation({
    mutationFn: (data) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/auth/change-password`,
        "POST"
      )(data),
    onSuccess: async (data) => {
      if (data?.token) {
        await storage.setItem("@auth_token", data.token);
      }
      showToast(t("toasts.passwordResetSuccessfully"), "success");
      resetPasswordForm();
    },
    onError: (error) => {
      showToast(error.message || t("toasts.failedToResetPassword"), "error");
    },
  });

  const updateProfilePhotoMutation = useApiMutation({
    mutationFn: (data) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/auth/profile-photo`,
        "PATCH"
      )(data),
    onSuccess: async (data) => {
      if (data?.user) {
        await updateUser(data.user);
      }
      refetch();
      showToast(
        data?.message || "Profile photo updated successfully",
        "success"
      );
    },
    onError: (error) => {
      showToast(error.message || "Failed to update profile photo", "error");
    },
  });

  const handlePickPhoto = async (source) => {
    // Close modal FIRST and give iOS enough time for the native sheet to fully dismiss
    // before we try to present the native image picker. Without this delay, UIKit
    // on iOS blocks the picker presentation while the modal is still animating out.
    setShowPhotoOptionsModal(false);
    await new Promise((resolve) =>
      setTimeout(resolve, Platform.OS === "ios" ? 600 : 100)
    );

    try {
      let result;

      if (source === "camera") {
        // Request camera permission first
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showToast("Camera permission is required to take photos.", "error");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });
      } else {
        // Gallery — system photo picker on iOS 14+ handles its own permission
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });
      }

      if (
        !result ||
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return; // User cancelled — do nothing
      }

      const picked = result.assets[0];
      if (!picked?.uri) return;

      // Show upload overlay
      setIsUploadingPhoto(true);
      setUploadProgress(0);

      // Compress to 500×500 square JPEG
      const compressedUri = await compressAvatar(picked.uri);

      // Upload to Cloudinary avatars folder
      const uploadResult = await uploadProfilePhoto(
        compressedUri,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Persist to backend
      if (uploadResult?.url) {
        await updateProfilePhotoMutation.mutateAsync({
          profilePhoto: uploadResult.url,
          profilePhotoPublicId: uploadResult.publicId,
        });
      }
    } catch (error) {
      console.error("[Profile] Photo upload error:", error);
      showToast(error.message || "Failed to upload photo", "error");
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  const handleRemovePhoto = () => {
    setShowPhotoOptionsModal(false);
    Alert.alert(
      "Remove Profile Photo?",
      "Are you sure you want to remove your profile picture?",
      [
        { text: t("common.cancel") || "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setIsUploadingPhoto(true);
              await updateProfilePhotoMutation.mutateAsync({
                profilePhoto: null,
                profilePhotoPublicId: null,
              });
            } catch (error) {
              showToast(error.message || "Failed to remove photo", "error");
            } finally {
              setIsUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePasswordSubmit = () => {
    if (
      !currentPassword?.trim() ||
      !newPassword?.trim() ||
      !confirmPassword?.trim()
    ) {
      showToast(t("toasts.allFieldsMandatory"), "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast(t("toasts.passwordMinLength"), "error");
      return;
    }
    if (currentPassword === newPassword) {
      showToast(
        "New password must be different from current password",
        "error"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t("toasts.passwordsDoNotMatch"), "error");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout(router, null, showToast);
  };

  const handleLogin = () => {
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={t("profile.title")} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <LoadingState message={t("profile.loadingProfile")} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.contentPaddingBottom,
        { paddingHorizontal: 16, paddingTop: 16 },
      ]}
      refreshControl={
        <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
      scrollsToTop={true}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: "center", marginTop: 20, marginBottom: 36 }}>
        {/* Avatar Container with Camera Edit Badge */}
        <View style={{ position: "relative", marginBottom: 16 }}>
          <Pressable
            onPress={() => setShowPhotoOptionsModal(true)}
            disabled={isUploadingPhoto}
            style={({ pressed }) => [
              {
                width: 108,
                height: 108,
                borderRadius: 54,
                backgroundColor: colors.surfaceContainerHigh,
                alignItems: "center",
                justifyContent: "center",
                elevation: 6,
                shadowColor: colors.shadow || "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                borderWidth: 3,
                borderColor: colors.surfaceContainerHighest || colors.border,
                overflow: "hidden",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {user?.profilePhoto ? (
              <Image
                source={{ uri: getAvatarUrl(user.profilePhoto, 300) }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primaryContainer,
                }}
              >
                {user?.name ? (
                  <Text
                    style={{
                      fontSize: FONT_SIZES.hero,
                      fontFamily: FONTS.bold,
                      color: colors.onPrimaryContainer,
                    }}
                  >
                    {user.name.trim()[0].toUpperCase()}
                  </Text>
                ) : (
                  <MaterialIcons
                    name="person"
                    size={50}
                    color={colors.primary}
                  />
                )}
              </View>
            )}

            {/* Uploading progress overlay */}
            {isUploadingPhoto && (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(0,0,0,0.65)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator color="#fff" size="small" />
                {uploadProgress > 0 && (
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.bold,
                      marginTop: 4,
                    }}
                  >
                    {uploadProgress}%
                  </Text>
                )}
              </View>
            )}
          </Pressable>

          {/* Floating Camera Button Badge */}
          <Pressable
            onPress={() => setShowPhotoOptionsModal(true)}
            disabled={isUploadingPhoto}
            style={({ pressed }) => [
              {
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: colors.primary,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: colors.background,
                elevation: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MaterialIcons
              name="camera-alt"
              size={18}
              color={colors.onPrimary || "#fff"}
            />
          </Pressable>
        </View>

        {user ? (
          <>
            <Text
              style={{
                fontSize: FONT_SIZES.displayTitle,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
                marginBottom: 8,
              }}
            >
              {formatUserName(user.name)}
            </Text>

            {user.role && (
              <View
                style={{
                  backgroundColor: colors.primaryContainer,
                  paddingVertical: 6,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  marginTop: 4,
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    color: colors.onPrimaryContainer,
                    fontFamily: FONTS.bold,
                    fontSize: FONT_SIZES.sm,
                    textTransform: "uppercase",
                  }}
                >
                  {formatUserDesignationOrRole(user, {
                    fallback:
                      user.role === "support_staff"
                        ? t("profile.supportStaff")
                        : user.role,
                  })}
                </Text>
              </View>
            )}

            <View style={{ width: "100%", paddingHorizontal: 4 }}>
              <Card variant="filled" style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.base,
                    fontFamily: FONTS.bold,
                    color: colors.onSurfaceVariant,
                    marginBottom: 16,
                  }}
                >
                  {t("profile.contactInfo")}
                </Text>

                {user.phone && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ width: 32, alignItems: "center", flexShrink: 0 }}>
                      <MaterialIcons
                        name="phone"
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.medium,
                        color: colors.onSurface,
                        marginLeft: 8,
                        flex: 1,
                        flexShrink: 1,
                      }}
                    >
                      {user.phone}
                    </Text>
                  </View>
                )}

                {user.email && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 32, alignItems: "center", flexShrink: 0 }}>
                      <MaterialIcons
                        name="email"
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.medium,
                        color: colors.onSurface,
                        marginLeft: 8,
                        flex: 1,
                        flexShrink: 1,
                      }}
                    >
                      {user.email}
                    </Text>
                  </View>
                )}
              </Card>

              {(user.role === "student" ||
                user.role === "teacher" ||
                user.role === "staff" ||
                user.role === "admin" ||
                user.role === "super admin" ||
                user.role === "support_staff") && (
                <Card variant="filled" style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.base,
                      fontFamily: FONTS.bold,
                      color: colors.onSurfaceVariant,
                      marginBottom: 16,
                    }}
                  >
                    {user.role === "student"
                      ? t("profile.studentDetails")
                      : t("profile.staffDetails")}
                  </Text>

                  {user.role === "student" && (
                    <>
                      {/* Class & Branch */}
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        {user.currentClass && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.class")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {typeof user.currentClass === "string"
                                ? user.currentClass
                                : user.currentClass?.name ||
                                  user.currentClass?.label ||
                                  "N/A"}
                            </Text>
                          </View>
                        )}
                        {user.currentClass?.branch && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.branch")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.currentClass.branch}
                            </Text>
                          </View>
                        )}
                      </View>

                      {user.guardianName && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginBottom: 4,
                            }}
                          >
                            {t("common.guardianName")}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.medium,
                              color: colors.onSurface,
                            }}
                          >
                            {toTitleCase(user.guardianName)}
                          </Text>
                        </View>
                      )}
                      {user.guardianPhone && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginBottom: 4,
                            }}
                          >
                            {t("common.guardianPhone")}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.medium,
                              color: colors.onSurface,
                            }}
                          >
                            {user.guardianPhone}
                          </Text>
                        </View>
                      )}

                      {/* Personal Details */}
                      <Text
                        style={{
                          fontSize: FONT_SIZES.base,
                          fontFamily: FONTS.bold,
                          color: colors.onSurfaceVariant,
                          marginBottom: 12,
                          marginTop: 8,
                        }}
                      >
                        {t("profile.personalDetails")}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        {user.gender && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.gender")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.gender}
                            </Text>
                          </View>
                        )}
                        {user.bloodGroup && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.bloodGroup")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.bloodGroup}
                            </Text>
                          </View>
                        )}
                        {user.dateOfBirth && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.dateOfBirth")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {formatDate(user.dateOfBirth)}
                            </Text>
                          </View>
                        )}
                        {user.phone2 && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.altPhone")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.phone2}
                            </Text>
                          </View>
                        )}
                      </View>

                      {user.address && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginBottom: 4,
                            }}
                          >
                            {t("common.address")}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.medium,
                              color: colors.onSurface,
                            }}
                          >
                            {user.address}
                          </Text>
                        </View>
                      )}

                      {/* Academic Identifiers */}
                      <Text
                        style={{
                          fontSize: FONT_SIZES.base,
                          fontFamily: FONTS.bold,
                          color: colors.onSurfaceVariant,
                          marginBottom: 12,
                          marginTop: 8,
                        }}
                      >
                        {t("profile.academicIds")}
                      </Text>

                      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {user.regNo && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.regNo")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.regNo}
                            </Text>
                          </View>
                        )}
                        {user.satsNumber && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.satsNo")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.satsNumber}
                            </Text>
                          </View>
                        )}
                        {user.penNumber && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.penNo")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.penNumber}
                            </Text>
                          </View>
                        )}
                        {user.apaarId && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.apaarId")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.apaarId}
                            </Text>
                          </View>
                        )}
                      </View>
                      {user.admissionDate && (
                        <View>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginBottom: 4,
                            }}
                          >
                            {t("common.admissionDate")}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.medium,
                              color: colors.onSurface,
                            }}
                          >
                            {formatDate(user.admissionDate)}
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {(user.role === "teacher" ||
                    user.role === "staff" ||
                    user.role === "admin" ||
                    user.role === "super admin" ||
                    user.role === "support_staff") && (
                    <>
                      {user.designation && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginBottom: 4,
                            }}
                          >
                            {t("common.designation")}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.medium,
                              color: colors.onSurface,
                            }}
                          >
                            {toTitleCase(user.designation)}
                          </Text>
                        </View>
                      )}

                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        {user.dateOfBirth && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.dateOfBirth")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {formatDate(user.dateOfBirth)}
                            </Text>
                          </View>
                        )}
                        {user.bloodGroup && (
                          <View style={{ width: "50%", marginBottom: 16 }}>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.sm,
                                color: colors.onSurfaceVariant,
                                marginBottom: 4,
                              }}
                            >
                              {t("common.bloodGroup")}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.lg,
                                fontFamily: FONTS.medium,
                                color: colors.onSurface,
                              }}
                            >
                              {user.bloodGroup}
                            </Text>
                          </View>
                        )}
                      </View>

                      {user.address && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginBottom: 4,
                            }}
                          >
                            {t("common.address")}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.medium,
                              color: colors.onSurface,
                            }}
                          >
                            {user.address}
                          </Text>
                        </View>
                      )}

                      {user.joiningDate && (
                        <View>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurfaceVariant,
                              marginBottom: 4,
                            }}
                          >
                            {t("common.joiningDate")}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.lg,
                              fontFamily: FONTS.medium,
                              color: colors.onSurface,
                            }}
                          >
                            {formatDate(user.joiningDate)}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </Card>
              )}


            </View>
          </>
        ) : (
          <>
            <Text
              style={{
                fontSize: FONT_SIZES.displayTitle,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
                marginBottom: 4,
              }}
            >
              {t("profile.guestUser")}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZES.base,
                fontFamily: FONTS.regular,
                color: colors.onSurfaceVariant,
              }}
            >
              {t("profile.loginToAccess")}
            </Text>
          </>
        )}
      </View>

      <View style={{ gap: 12 }}>
        {user && (
          <Button
            variant="outlined"
            onPress={() => setShowChangePasswordModal(true)}
            icon="lock"
            style={{ borderColor: colors.primary }}
            textStyle={{ color: colors.primary }}
          >
            {t("profile.resetPassword")}
          </Button>
        )}
        {user ? (
          <Button
            variant="filled"
            onPress={handleLogout}
            style={{ backgroundColor: colors.errorContainer }}
            textStyle={{ color: colors.onErrorContainer }}
            icon="logout"
          >
            {t("common.logOut")}
          </Button>
        ) : (
          <Button variant="filled" onPress={handleLogin} icon="login">
            {t("common.logIn")}
          </Button>
        )}
      </View>

      {/* Reset Password Modal */}
      {showChangePasswordModal && (
        <Modal
          visible={showChangePasswordModal}
          animationType="fade"
          transparent={true}
          onRequestClose={resetPasswordForm}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 24,
                  padding: 24,
                  width: "100%",
                  maxWidth: 420,
                  borderWidth: 1,
                  borderColor: colors.border,
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor:
                          colors.primaryContainer || `${colors.primary}15`,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <MaterialIcons
                        name="lock-reset"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xxl,
                        fontFamily: FONTS.bold,
                        color: colors.textPrimary,
                      }}
                    >
                      {t("profile.resetPassword")}
                    </Text>
                  </View>
                  <Pressable onPress={resetPasswordForm} hitSlop={8}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>

                {/* Current Password Field */}
                <View style={{ marginBottom: 14 }}>
                  <AppTextInput
                    label={t("profile.currentPasswordLabel")}
                    placeholder={t("profile.currentPasswordPlaceholder")}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    rightIcon={
                      showCurrentPassword ? "visibility-off" : "visibility"
                    }
                    onRightIconPress={() =>
                      setShowCurrentPassword(!showCurrentPassword)
                    }
                  />
                </View>

                {/* New Password Field */}
                <View style={{ marginBottom: 10 }}>
                  <AppTextInput
                    label={t("profile.newPasswordLabel")}
                    placeholder={t("profile.newPasswordPlaceholder")}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    rightIcon={
                      showNewPassword ? "visibility-off" : "visibility"
                    }
                    onRightIconPress={() =>
                      setShowNewPassword(!showNewPassword)
                    }
                    error={
                      currentPassword &&
                      newPassword &&
                      currentPassword === newPassword
                        ? "New password must be different from current password"
                        : undefined
                    }
                  />
                </View>

                {/* Password Strength Meter & Live Checklist */}
                {newPassword.length > 0 && (
                  <View
                    style={{
                      marginBottom: 14,
                      backgroundColor:
                        colors.surfaceContainerLow || colors.surfaceContainer,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.medium,
                          color: colors.textSecondary,
                        }}
                      >
                        Password Strength
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: strengthDetails.color,
                        }}
                      >
                        {strengthDetails.label}
                      </Text>
                    </View>
                    {/* Progress Bar Segments */}
                    <View
                      style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}
                    >
                      <View
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor:
                            strengthScore >= 1
                              ? strengthDetails.color
                              : colors.outlineVariant,
                        }}
                      />
                      <View
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor:
                            strengthScore >= 2
                              ? strengthDetails.color
                              : colors.outlineVariant,
                        }}
                      />
                      <View
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor:
                            strengthScore >= 3
                              ? strengthDetails.color
                              : colors.outlineVariant,
                        }}
                      />
                    </View>

                    {/* Requirement Checklist */}
                    <View style={{ gap: 4 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MaterialIcons
                          name={
                            hasMinLength
                              ? "check-circle"
                              : "radio-button-unchecked"
                          }
                          size={14}
                          color={
                            hasMinLength ? colors.success : colors.textSecondary
                          }
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            fontFamily: FONTS.regular,
                            color: hasMinLength
                              ? colors.textPrimary
                              : colors.textSecondary,
                          }}
                        >
                          At least 8 characters
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MaterialIcons
                          name={
                            hasLetters && hasNumbersOrSpecial
                              ? "check-circle"
                              : "radio-button-unchecked"
                          }
                          size={14}
                          color={
                            hasLetters && hasNumbersOrSpecial
                              ? colors.success
                              : colors.textSecondary
                          }
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            fontFamily: FONTS.regular,
                            color:
                              hasLetters && hasNumbersOrSpecial
                                ? colors.textPrimary
                                : colors.textSecondary,
                          }}
                        >
                          Letters & numbers or symbols
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Confirm New Password Field */}
                <View style={{ marginBottom: 20 }}>
                  <AppTextInput
                    label={t("profile.confirmPasswordLabel")}
                    placeholder={t("profile.confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    rightIcon={
                      showConfirmPassword ? "visibility-off" : "visibility"
                    }
                    onRightIconPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    error={
                      confirmPassword.length > 0 &&
                      confirmPassword !== newPassword
                        ? t("toasts.passwordsDoNotMatch")
                        : undefined
                    }
                  />
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Button
                    variant="outlined"
                    onPress={resetPasswordForm}
                    style={{ flex: 1 }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="filled"
                    onPress={handleChangePasswordSubmit}
                    loading={changePasswordMutation.isPending}
                    disabled={
                      !isPasswordFormValid || changePasswordMutation.isPending
                    }
                    style={{ flex: 1 }}
                  >
                    {t("common.save")}
                  </Button>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Photo Options Bottom Sheet / Modal */}
      <Modal
        visible={showPhotoOptionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPhotoOptionsModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowPhotoOptionsModal(false)}
        >
          <Pressable
            style={{
              backgroundColor:
                colors.surfaceContainerLowest ||
                colors.cardBackground ||
                "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: Platform.OS === "ios" ? 40 : 24,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.outlineVariant || "#ccc",
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                fontSize: FONT_SIZES.xl,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Profile Photo
            </Text>

            {/* Option: Camera */}
            <Pressable
              onPress={() => handlePickPhoto("camera")}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: pressed
                    ? colors.surfaceContainerHigh || "#eee"
                    : "transparent",
                  marginBottom: 4,
                },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <MaterialIcons
                  name="photo-camera"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.medium,
                  color: colors.onSurface,
                }}
              >
                Take Photo
              </Text>
            </Pressable>

            {/* Option: Gallery */}
            <Pressable
              onPress={() => handlePickPhoto("gallery")}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: pressed
                    ? colors.surfaceContainerHigh || "#eee"
                    : "transparent",
                  marginBottom: 4,
                },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor:
                    colors.secondaryContainer || colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <MaterialIcons
                  name="photo-library"
                  size={22}
                  color={colors.secondary || colors.primary}
                />
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.medium,
                  color: colors.onSurface,
                }}
              >
                Choose from Gallery
              </Text>
            </Pressable>

            {/* Option: Remove Photo (if photo exists) */}
            {user?.profilePhoto && (
              <Pressable
                onPress={handleRemovePhoto}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: pressed
                      ? colors.errorContainer || "#ffebee"
                      : "transparent",
                    marginBottom: 4,
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.errorContainer || "#ffebee",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={22}
                    color={colors.error || "#d32f2f"}
                  />
                </View>
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.medium,
                    color: colors.error || "#d32f2f",
                  }}
                >
                  Remove Photo
                </Text>
              </Pressable>
            )}

            {/* Option: Cancel */}
            <Pressable
              onPress={() => setShowPhotoOptionsModal(false)}
              style={({ pressed }) => [
                {
                  marginTop: 12,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceContainerHighest || "#eee",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.onSurfaceVariant || "#555",
                }}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
