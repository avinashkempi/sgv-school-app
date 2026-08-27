import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useTheme, FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import apiConfig from "../config/apiConfig";
import { useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useLabel } from "../context/LabelsContext";
import { useAuth } from "../context/AuthContext";

// UI Components
import TextInput from "../components/TextInput";
import Button from "../components/Button";

import { useToast } from "../components/ToastProvider";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const { styles, colors, mode } = useTheme();
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

        showToast(t("toasts.loggedInSuccessfully"), "success", 2000);
        router.replace("/");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(data.message || t("toasts.loginFailed"), "error");
      }
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Login error:", error);
      showToast(error.message || t("toasts.networkError"), "error");
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

  const handleDemoLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { DEMO_USER } = require("../constants/demoData");

    // Use AuthContext.login for demo mode too — ensures cache clearing
    await authLogin("demo-token", DEMO_USER);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/");
  };

  const loading = loginMutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View
            style={{
              width: 88,
              height: 88,
              backgroundColor: colors.surfaceContainerLowest || "#ffffff",
              borderRadius: 26,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 14,
              elevation: 4,
              borderWidth: 1,
              borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
              padding: 6,
            }}
          >
            <Image
              source={require("../assets/images/icon.png")}
              style={{ width: "100%", height: "100%", borderRadius: 20 }}
              contentFit="contain"
            />
          </View>
          <Text
            style={{
              fontSize: FONT_SIZES.hero,
              fontFamily: FONTS.bold,
              color: colors.onBackground,
              marginBottom: 4,
              textAlign: "center",
              letterSpacing: LETTER_SPACINGS.hero,
            }}
          >
            {t("login.title")}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZES.mdLg,
              fontFamily: FONTS.bold,
              color: colors.primary,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Shri Guru Vidya English Medium School
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZES.base,
              fontFamily: FONTS.regular,
              color: colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            {t("login.subtitle")}
          </Text>
        </View>

        {/* Form Section */}
        <View style={{ gap: 24 }}>
          <TextInput
            label={t("login.phoneLabel")}
            icon="phone"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (phoneError) setPhoneError("");
            }}
            placeholder={t("login.phonePlaceholder")}
            keyboardType="number-pad"
            maxLength={10}
            editable={!loading}
            error={phoneError}
            variant="outlined"
          />

          <TextInput
            label={t("login.passwordLabel")}
            icon="lock"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
            }}
            placeholder={t("login.passwordPlaceholder")}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "visibility" : "visibility-off"}
            onRightIconPress={() => setShowPassword(!showPassword)}
            editable={!loading}
            error={passwordError}
            variant="outlined"
          />

          <View style={{ gap: 16, marginTop: 8 }}>
            <Button
              onPress={handleLogin}
              loading={loading}
              variant="filled"
              size="large"
            >
              {t("login.signInButton")}
            </Button>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 8,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: colors.outlineVariant,
                }}
              />
              <Text
                style={{
                  marginHorizontal: 16,
                  color: colors.onSurfaceVariant,
                  fontSize: FONT_SIZES.base,
                  fontFamily: FONTS.medium,
                }}
              >
                {t("common.or")}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: colors.outlineVariant,
                }}
              />
            </View>

            <Button variant="outlined" onPress={handleDemoLogin}>
              {t("login.viewAsGuestButton")}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
