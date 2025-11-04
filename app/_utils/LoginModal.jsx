import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/apiConfig';

export default function LoginModal({ isVisible, onClose, onSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' or 'signup'

  // Common
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState({});

  // Signup
  const [username, setUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupErrors, setSignupErrors] = useState({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const resetState = () => {
    setLoading(false);
    setServerError('');
    setLoginEmail('');
    setLoginPassword('');
    setLoginErrors({});
    setUsername('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupErrors({});
  };

  const handleClose = () => {
    resetState();
    onClose && onClose();
  };

  const validateLogin = () => {
    const errs = {};
    if (!loginEmail.trim()) errs.email = 'Email is required';
    else if (!emailRegex.test(loginEmail)) errs.email = 'Invalid email';
    if (!loginPassword) errs.password = 'Password is required';
    else if (loginPassword.length < 8) errs.password = 'Password must be at least 8 characters';
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateSignup = () => {
    const errs = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!signupEmail.trim()) errs.email = 'Email is required';
    else if (!emailRegex.test(signupEmail)) errs.email = 'Invalid email';
    if (!signupPassword) errs.password = 'Password is required';
    else if (signupPassword.length < 8) errs.password = 'Password must be at least 8 characters';
    setSignupErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const storeAuth = async (token, user) => {
    try {
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(user));
      return true;
    } catch (e) {
      console.error('Failed to persist auth', e);
      return false;
    }
  };

  const submitSignup = async () => {
    setServerError('');
    if (!validateSignup()) return;
    setLoading(true);
    try {
      const res = await fetch(apiConfig.url(apiConfig.endpoints.auth.signup), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: signupEmail.trim(), password: signupPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message || (data.errors && data.errors[0] && data.errors[0].msg) || 'Signup failed');
        setLoading(false);
        return;
      }
      // Store auth data and notify parent
      const stored = await storeAuth(data.token, data.user);
      if (!stored) {
        setServerError('Failed to save login data');
        setLoading(false);
        return;
      }
      
      setLoading(false);
      onSuccess && onSuccess(data.user);
      handleClose();
    } catch (err) {
      console.error(err);
      setServerError('Network error during signup');
      setLoading(false);
    }
  };

  const submitLogin = async () => {
    setServerError('');
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const res = await fetch(apiConfig.url(apiConfig.endpoints.auth.login), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message || (data.errors && data.errors[0] && data.errors[0].msg) || 'Login failed');
        setLoading(false);
        return;
      }
      // Store auth data and notify parent
      const stored = await storeAuth(data.token, data.user);
      if (!stored) {
        setServerError('Failed to save login data');
        setLoading(false);
        return;
      }
      
      setLoading(false);
      onSuccess && onSuccess(data.user);
      handleClose();
    } catch (err) {
      console.error(err);
      setServerError('Network error during login');
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" visible={isVisible} transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setTab('login')} style={[styles.tab, tab === 'login' && styles.tabActive]}>
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('signup')} style={[styles.tab, tab === 'signup' && styles.tabActive]}>
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>Signup</Text>
            </TouchableOpacity>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

          {tab === 'login' ? (
            <View>
              <TextInput
                placeholder="Enter your email address"
                placeholderTextColor="#999"
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              {loginErrors.email ? <Text style={styles.fieldError}>{loginErrors.email}</Text> : null}

              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                style={styles.input}
              />
              {loginErrors.password ? <Text style={styles.fieldError}>{loginErrors.password}</Text> : null}

              <Pressable style={styles.submit} onPress={submitLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Login</Text>}
              </Pressable>
            </View>
          ) : (
            <View>
              <TextInput
                placeholder="Choose a username (letters & numbers only)"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                style={styles.input}
              />
              {signupErrors.username ? <Text style={styles.fieldError}>{signupErrors.username}</Text> : null}

              <TextInput
                placeholder="Enter your email address"
                placeholderTextColor="#999"
                value={signupEmail}
                onChangeText={setSignupEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              {signupErrors.email ? <Text style={styles.fieldError}>{signupErrors.email}</Text> : null}

              <TextInput
                placeholder="Choose a password (min. 8 characters)"
                placeholderTextColor="#999"
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry
                style={styles.input}
              />
              {signupErrors.password ? <Text style={styles.fieldError}>{signupErrors.password}</Text> : null}

              <Pressable style={styles.submit} onPress={submitSignup} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Signup</Text>}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1f6feb',
  },
  tabText: {
    fontSize: 16,
    color: '#333',
  },
  tabTextActive: {
    color: '#fff',
  },
  closeButton: {
    marginLeft: 'auto',
    padding: 6,
  },
  closeText: { fontSize: 18, color: '#666' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  submit: {
    backgroundColor: '#1f6feb',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '600' },
  fieldError: { color: '#c00', marginTop: 4 },
  serverError: { color: '#c00', marginBottom: 8, textAlign: 'center' },
});
