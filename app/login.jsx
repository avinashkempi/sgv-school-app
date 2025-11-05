import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Header from './_utils/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const { styles, colors, mode } = useTheme();
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) return;

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('@auth_token', data.token);
        await AsyncStorage.setItem('@auth_user', JSON.stringify(data.user));
        router.replace('/');
      } else {
        alert(data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Network error. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <Header title={isSignup ? "Sign Up" : "Login"} />

      <View style={{ marginTop: 20 }}>
        <Text style={[styles.label, { marginBottom: 10 }]}>Email</Text>
        <TextInput
          style={[styles.input, { marginBottom: 20 }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email"
          placeholderTextColor={colors.textSecondary}
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
          onPress={handleAuth}
        >
          <Text style={styles.cardText}>{isSignup ? "Sign Up" : "Login"}</Text>
        </Pressable>

        <Pressable
          style={{ marginTop: 20, alignItems: 'center' }}
          onPress={() => setIsSignup(!isSignup)}
        >
          <Text style={[styles.text, { color: colors.primary }]}>
            {isSignup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
