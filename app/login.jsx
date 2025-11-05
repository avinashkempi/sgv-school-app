import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Header from './_utils/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import apiConfig from './config/apiConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { styles, colors, mode } = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }

    try {
      const response = await fetch(apiConfig.url(apiConfig.endpoints.auth.login), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <Header title="Login" />

      <View style={{ marginTop: 20 }}>
        <Text style={[styles.label, { marginBottom: 10 }]}>Email</Text>
        <TextInput
          style={[styles.input, { marginBottom: 20 }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { marginBottom: 10 }]}>Password</Text>
        <TextInput
          style={[styles.input, { marginBottom: 30 }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
        />

        <Pressable
          style={[styles.navCard, { paddingVertical: 15, alignItems: 'center' }]}
          onPress={handleLogin}
        >
          <Text style={styles.cardText}>Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
