import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import storage from '../utils/storage';
import { useRouter } from 'expo-router';
import apiConfig from "../config/apiConfig";
import { useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { LinearGradient } from 'expo-linear-gradient';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { styles, colors, mode } = useTheme();
  const router = useRouter();

  const loginMutation = useApiMutation({
    mutationFn: createApiMutationFn(apiConfig.url(apiConfig.endpoints.auth.login), 'POST'),
    onSuccess: async (data) => {
      if (data.token) {
        await storage.setItem('@auth_token', data.token);
        await storage.setItem('@auth_user', JSON.stringify(data.user));
        router.replace('/');
      } else {
        alert(data.message || 'Login failed');
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      alert(error.message || 'Network error. Please try again.');
    }
  });

  const handleLogin = () => {
    if (!phone || !password) {
      alert('Please enter both phone number and password.');
      return;
    }

    loginMutation.mutate({ phone, password });
  };

  const loading = loginMutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={['#0B57D0', '#0842A0']} // Google Blue Gradient
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View style={{
              width: 80,
              height: 80,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 24,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)'
            }}>
              <MaterialIcons name="school" size={40} color="#fff" />
            </View>
            <Text style={{
              fontSize: 36,
              fontFamily: "DMSans-Bold",
              color: "#fff",
              marginBottom: 8,
              textAlign: 'center',
              letterSpacing: -1
            }}>
              Welcome
            </Text>
            <Text style={{
              fontSize: 16,
              fontFamily: "DMSans-Regular",
              color: "rgba(255,255,255,0.8)",
              textAlign: 'center'
            }}>
              School Management System
            </Text>
          </View>

          <View style={{ gap: 24 }}>
            <View>
              <Text style={[styles.label, { marginLeft: 4, marginBottom: 8, color: "rgba(255,255,255,0.9)" }]}>Phone Number</Text>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 56,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.1)'
              }}>
                <MaterialIcons name="phone" size={20} color="#444746" style={{ marginRight: 12 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: "#1F1F1F", fontFamily: "DMSans-Regular", height: '100%' }}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#747775"
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!loading}
                  autoComplete="tel"
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { marginLeft: 4, marginBottom: 8, color: "rgba(255,255,255,0.9)" }]}>Password</Text>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 56,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.1)'
              }}>
                <MaterialIcons name="lock" size={20} color="#444746" style={{ marginRight: 12 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: "#1F1F1F", fontFamily: "DMSans-Regular", height: '100%' }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#747775"
                  editable={!loading}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#444746" />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.buttonLarge,
                {
                  width: "100%",
                  marginTop: 8,
                  backgroundColor: "#fff",
                  opacity: pressed || loading ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.buttonText, { fontSize: 18, color: colors.primary }]}>Sign In</Text>
              )}
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <Text style={{ marginHorizontal: 16, color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            </View>

            <Pressable
              onPress={async () => {
                const { DEMO_USER } = require('../constants/demoData');
                await storage.setItem('@auth_token', 'demo-token');
                await storage.setItem('@auth_user', JSON.stringify(DEMO_USER));
                router.replace('/');
              }}
              style={({ pressed }) => ({
                paddingVertical: 16,
                borderRadius: 100,
                borderWidth: 1.5,
                borderColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
                backgroundColor: 'transparent'
              })}
            >
              <Text style={{
                color: '#fff',
                fontSize: 16,
                fontFamily: "DMSans-Bold",
              }}>
                View as Guest
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
