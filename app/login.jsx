import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  LETTER_SPACINGS,
  SPACING,
  RADIUS,
} from "../theme";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import apiConfig from "../config/apiConfig";
import { useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useLabel } from "../context/LabelsContext";
import { useAuth } from "../context/AuthContext";

// UI Components
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import Badge from "../components/ui/Badge";
import Divider from "../components/ui/Divider";
import { useToast } from "../components/ToastProvider";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { showToast } = useToast();
  const { login: authLogin } = useAuth();
  const { t } = useLabel();

  const loginMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      apiConfig.url(apiConfig.endpoints.auth.login),
      "POST"
    ),
    onSuccess: async (data) => {
      if (data.token) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Use AuthContext.login — handles cache clearing, FCM, state
        await authLogin(data.token, data.user);

        showToast(t("toasts.loggedInSuccessfully", "Logged in successfully"), "success", 2000);
        router.replace("/");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(data.message || t("toasts.loginFailed", "Login failed"), "error");
      }
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Login error:", error);
      showToast(error.message || t("toasts.networkError", "Network error"), "error");
    },
  });

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let hasError = false;
    if (!phone || phone.trim().length === 0) {
      setPhoneError("Phone number is required");
      hasError = true;
    } else if (phone.trim().length < 10) {
      setPhoneError("Enter a valid 10-digit number");
      hasError = true;
    } else {
      setPhoneError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    loginMutation.mutate({ phone, password });
  };

  const [showDemoRoleModal, setShowDemoRoleModal] = useState(false);

  const handleSelectDemoRole = async (roleKey) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const {
      DEMO_STUDENT_USER,
      DEMO_TEACHER_USER,
      DEMO_ADMIN_USER,
    } = require("../constants/demoData");

    let targetUser = DEMO_STUDENT_USER;
    if (roleKey === "teacher") targetUser = DEMO_TEACHER_USER;
    if (roleKey === "admin") targetUser = DEMO_ADMIN_USER;

    setShowDemoRoleModal(false);
    await authLogin("demo-token", targetUser);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.replace("/");
  };

  const loading = loginMutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: SPACING.xxl || 24,
            paddingVertical: SPACING.xxl || 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.contentWrapper}>
          {/* Top Tour Action */}
        <View style={styles.topTourBar}>
          <TouchableOpacity
            onPress={() => router.push("/onboarding")}
            style={[
              styles.tourButton,
              {
                backgroundColor: colors.surfaceContainerLow || "rgba(0,0,0,0.04)",
                borderColor: colors.outlineVariant + "50",
              },
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="lightbulb-outline"
              size={15}
              color={colors.primary}
            />
            <Text style={[styles.tourText, { color: colors.onSurfaceVariant }]}>
              Explore Features
            </Text>
          </TouchableOpacity>
        </View>

        {/* Brand & Logo Header */}
        <View style={styles.headerSection}>
          {/* Subtle radial glow */}
          <LinearGradient
            colors={[colors.primary + "18", colors.primary + "06", "transparent"]}
            pointerEvents="none"
            style={styles.logoGlow}
          />

          {/* Elevated Logo Card */}
          <View
            style={[
              styles.logoCard,
              {
                backgroundColor: colors.surfaceContainerLowest || "#ffffff",
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>

          {/* Digital Campus Pill */}
          <View style={styles.badgeWrapper}>
            <Badge
              label="DIGITAL CAMPUS"
              variant="brand"
              size="sm"
              dot
            />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colors.onBackground,
                letterSpacing: LETTER_SPACINGS.display,
              },
            ]}
          >
            {t("login.title", "Welcome Back")}
          </Text>

          <Text style={[styles.schoolName, { color: colors.primary }]}>
            Shri Guru Vidya English Medium School
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {t(
              "login.subtitle",
              "Sign in with your registered mobile number to access your portal"
            )}
          </Text>
        </View>

        {/* Form Section */}
        <View style={[styles.formContainer, { gap: SPACING.lg || 16 }]}>
          <TextInput
            label={t("login.phoneLabel", "Mobile Number")}
            icon="phone"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (phoneError) setPhoneError("");
            }}
            placeholder={t("login.phonePlaceholder", "Enter 10-digit mobile number")}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!loading}
            error={phoneError}
            variant="outlined"
          />

          <TextInput
            label={t("login.passwordLabel", "Password")}
            icon="lock"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
            }}
            placeholder={t("login.passwordPlaceholder", "Enter your password")}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "visibility" : "visibility-off"}
            onRightIconPress={() => setShowPassword(!showPassword)}
            editable={!loading}
            error={passwordError}
            variant="outlined"
          />

          <View style={[styles.actionsGroup, { gap: SPACING.md || 12 }]}>
            <Button
              onPress={handleLogin}
              loading={loading}
              variant="filled"
              size="lg"
              fullWidth
              icon={<MaterialIcons name="login" size={18} color="#FFFFFF" />}
            >
              {t("login.signInButton", "Sign In")}
            </Button>

            <Divider label={t("common.or", "OR")} inset={SPACING.lg || 16} />

            <Button
              variant="outlined"
              size="lg"
              fullWidth
              onPress={() => setShowDemoRoleModal(true)}
              icon={<MaterialIcons name="bolt" size={18} color={colors.primary} />}
            >
              {t("login.viewAsGuestButton", "Explore Demo as Guest")}
            </Button>
          </View>
        </View>

        {/* Footer Support Info */}
        <View style={styles.footerSection}>
          <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
            Trouble logging in? Contact School Admin
          </Text>
          <Text style={[styles.versionText, { color: colors.outline }]}>
            SGV Digital Campus • v2.0
          </Text>
        </View>
        </View>
      </ScrollView>

      {/* Multi-Role Demo Persona Modal */}
      <Modal
        visible={showDemoRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDemoRoleModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDemoRoleModal(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? colors.surfaceContainer : colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Choose Demo Persona
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Explore the school app from any perspective
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDemoRoleModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close persona selector"
              >
                <MaterialIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.roleList}>
              {[
                {
                  id: "student",
                  title: "Student",
                  subtitle: "Harshika Patil • Class 3A",
                  icon: "school",
                },
                {
                  id: "teacher",
                  title: "Teacher",
                  subtitle: "Mrs. Savita Patil • Kannada & Math",
                  icon: "person",
                },
                {
                  id: "admin",
                  title: "School Admin",
                  subtitle: "Mr. Rajesh Biradar • Vice Principal",
                  icon: "admin-panel-settings",
                },
              ].map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor:
                        isDark ? (colors.fieldBackground || "#000000") : colors.surfaceContainerLowest || "#F8FAFC",
                      borderColor: isDark ? colors.fieldBorder || colors.outlineVariant : colors.outlineVariant,
                    },
                  ]}
                  onPress={() => handleSelectDemoRole(role.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Explore as ${role.title}: ${role.subtitle}`}
                >
                  <View
                    style={[
                      styles.roleIconContainer,
                      { backgroundColor: colors.primaryContainer },
                    ]}
                  >
                    <MaterialIcons name={role.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={[styles.roleCardTitle, { color: colors.textPrimary }]}>
                      {role.title}
                    </Text>
                    <Text
                      style={[styles.roleCardSubtitle, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {role.subtitle}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  contentWrapper: {
    flexGrow: 1,
    justifyContent: "center",
  },
  topTourBar: {
    alignItems: "flex-end",
    marginBottom: SPACING.md || 12,
  },
  tourButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full || 999,
    borderWidth: 1,
  },
  tourText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: SPACING.xxl || 28,
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -24,
  },
  logoCard: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.xxl || 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md || 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    padding: 8,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.lg || 18,
  },
  badgeWrapper: {
    marginBottom: SPACING.sm || 8,
  },
  title: {
    fontSize: FONT_SIZES.display,
    fontFamily: FONTS.bold,
    marginBottom: 4,
    textAlign: "center",
  },
  schoolName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  formContainer: {
    width: "100%",
  },
  actionsGroup: {
    marginTop: SPACING.sm || 8,
  },
  footerSection: {
    alignItems: "center",
    marginTop: SPACING.xxl || 32,
    gap: 4,
  },
  footerText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    textAlign: "center",
  },
  versionText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg || 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    padding: SPACING.xl || 20,
    gap: SPACING.lg || 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg || 18,
    fontFamily: FONTS.bold,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm || 13,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  roleList: {
    gap: SPACING.sm || 8,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
    gap: 12,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm || 8,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextContainer: {
    flex: 1,
  },
  roleCardTitle: {
    fontSize: FONT_SIZES.sm || 14,
    fontFamily: FONTS.semiBold,
  },
  roleCardSubtitle: {
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
});
