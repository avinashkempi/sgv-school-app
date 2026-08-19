import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import apiConfig from "../config/apiConfig";
import { useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useAuth } from '../context/AuthContext';

// UI Components
import TextInput from '../components/TextInput';
import Button from '../components/Button';

import { useToast } from '../components/ToastProvider';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const { styles, colors, mode } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const { login: authLogin } = useAuth();

  const loginMutation = useApiMutation({
    mutationFn: createApiMutationFn(apiConfig.url(apiConfig.endpoints.auth.login), 'POST'),
    onSuccess: async (data) => {
      if (data.token) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Use AuthContext.login — handles cache clearing, FCM, state
        await authLogin(data.token, data.user);

        showToast('Logged in successfully', 'success', 2000);
        router.replace('/');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(data.message || 'Login failed', 'error');
      }
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Login error:', error);
      showToast(error.message || 'Network error. Please try again.', 'error');
    }
  });

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!phone || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Please enter both phone number and password.', 'error');
      return;
    }
    loginMutation.mutate({ phone, password });
  };

  const handleDemoLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { DEMO_USER } = require('../constants/demoData');

    // Use AuthContext.login for demo mode too — ensures cache clearing
    await authLogin('demo-token', DEMO_USER);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/');
  };

  const loading = loginMutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{
            width: 80,
            height: 80,
            backgroundColor: colors.primaryContainer,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <MaterialIcons name="school" size={40} color={colors.onPrimaryContainer} />
          </View>
          <Text style={{
            fontSize: 32,
            fontFamily: "DMSans-Bold",
            color: colors.onBackground,
            marginBottom: 8,
            textAlign: 'center',
            letterSpacing: -1
          }}>
            Welcome Back
          </Text>
          <Text style={{
            fontSize: 16,
            fontFamily: "DMSans-Regular",
            color: colors.onSurfaceVariant,
            textAlign: 'center'
          }}>
            Sign in to continue to School App
          </Text>
        </View>

        {/* Form Section */}
        <View style={{ gap: 24 }}>
          <TextInput
            label="Phone Number"
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="number-pad"
            maxLength={10}
            editable={!loading}
            variant="outlined"
          />

          <TextInput
            label="Password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "visibility" : "visibility-off"}
            onRightIconPress={() => setShowPassword(!showPassword)}
            editable={!loading}
            variant="outlined"
          />

          <View style={{ gap: 16, marginTop: 8 }}>
            <Button
              onPress={handleLogin}
              loading={loading}
              variant="filled"
              size="large"
            >
              Sign In
            </Button>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.outlineVariant }} />
              <Text style={{ marginHorizontal: 16, color: colors.onSurfaceVariant, fontSize: 14 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.outlineVariant }} />
            </View>

            <Button
              variant="outlined"
              onPress={handleDemoLogin}
            >
              View as Guest
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
