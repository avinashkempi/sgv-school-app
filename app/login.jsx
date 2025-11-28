import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";
import { LinearGradient } from 'expo-linear-gradient';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { styles, colors, mode, gradients } = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) {
      alert('Please enter both phone number and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.auth.login), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        await AsyncStorage.setItem('@auth_token', data.token);
        await AsyncStorage.setItem('@auth_user', JSON.stringify(data.user));
        router.replace('/');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        colors={gradients.primary}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
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
              fontSize: 32,
              fontFamily: "DMSans-Bold",
              color: "#fff",
              marginBottom: 8,
              textAlign: 'center'
            }}>
              Welcome Back
            </Text>
            <Text style={{
              fontSize: 16,
              fontFamily: "DMSans-Regular",
              color: "rgba(255,255,255,0.8)",
              textAlign: 'center'
            }}>
              Sign in to continue to your account
            </Text>
          </View>

          <View style={[styles.card, { padding: 32, borderRadius: 32 }]}>
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.label, { marginLeft: 4, marginBottom: 8 }]}>Phone Number</Text>
              <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56 }]}>
                <MaterialIcons name="phone" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: colors.textPrimary, fontFamily: "DMSans-Regular", height: '100%' }}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!loading}
                  autoComplete="tel"
                />
              </View>
            </View>

            <View style={{ marginBottom: 32 }}>
              <Text style={[styles.label, { marginLeft: 4, marginBottom: 8 }]}>Password</Text>
              <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56 }]}>
                <MaterialIcons name="lock" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: colors.textPrimary, fontFamily: "DMSans-Regular", height: '100%' }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry={!showPassword}
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.buttonLarge,
                {
                  width: "100%",
                  opacity: pressed || loading ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { fontSize: 18 }]}>Sign In</Text>
              )}
            </Pressable>
          </View>

          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              Protected by School Management System
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
