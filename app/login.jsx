import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Header from "../components/Header";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { styles, colors, mode } = useTheme();
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
      />

      <Header title="Login" />

      <View style={{ marginTop: 20 }}>
        <Text style={[styles.label, { marginBottom: 8, fontSize: 14 }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { marginBottom: 16 }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter phone number"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          maxLength={10}
          editable={!loading}
        />

        <Text style={[styles.label, { marginBottom: 8, fontSize: 14 }]}>Password</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            placeholderTextColor={colors.textSecondary}
            editable={!loading}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderLeftWidth: 0,
              height: 50, // Match input height
              justifyContent: 'center',
              paddingHorizontal: 12,
              borderTopRightRadius: 12,
              borderBottomRightRadius: 12
            }}
          >
            <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.buttonLarge, { width: "100%", alignItems: 'center', opacity: loading ? 0.7 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
