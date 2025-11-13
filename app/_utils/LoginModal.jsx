import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/apiConfig';

const LoginModal = ({ isVisible, onClose, onSuccess }) => {
  // Common
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Login
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const phoneRegex = /^[6-9]\d{9}$/;

  const resetState = () => {
    setLoading(false);
    setServerError('');
    setPhone('');
    setPassword('');
    setErrors({});
  };

  const handleClose = () => {
    resetState();
    onClose && onClose();
  };

  const validateLogin = () => {
    const errs = {};
    if (!phone.trim()) errs.phone = 'Phone number is required';
    else if (!phoneRegex.test(phone)) errs.phone = 'Invalid phone number (10 digits starting with 6-9)';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
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

  const submitLogin = async () => {
    setServerError('');
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const res = await fetch(apiConfig.url(apiConfig.endpoints.auth.login), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
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
            <Text style={styles.title}>Login</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

          <View>
            <TextInput
              placeholder="Enter your phone number"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
            />
            {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

            <Pressable style={styles.submit} onPress={submitLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Login</Text>}
            </Pressable>
          </View>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
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

export default React.memo(LoginModal);
