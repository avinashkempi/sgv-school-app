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
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';
import apiConfig from '../config/apiConfig';
import apiFetch from '../utils/apiFetch';

const LoginModal = ({ isVisible, onClose, onSuccess }) => {
  // Common
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Login
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const { colors, styles: globalStyles } = useTheme();

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
      const res = await apiFetch(apiConfig.url(apiConfig.endpoints.auth.login), {
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
    <Modal animationType="fade" visible={isVisible} transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={[globalStyles.title, { fontSize: 20, color: colors.textPrimary }]}>Login</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {serverError ? <Text style={[styles.serverError, { color: colors.error }]}>{serverError}</Text> : null}

          <View>
            <TextInput
              placeholder="Enter your phone number"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              style={[globalStyles.input, {
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
                borderColor: colors.border,
                marginBottom: 12,
              }]}
            />
            {errors.phone ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.phone}</Text> : null}

            <TextInput
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[globalStyles.input, {
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
                borderColor: colors.border,
                marginBottom: 12,
              }]}
            />
            {errors.password ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.password}</Text> : null}

            <Pressable
              style={[globalStyles.buttonLarge, { width: "100%", backgroundColor: colors.primary, marginTop: 8 }, loading && { opacity: 0.6 }]}
              onPress={submitLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={[globalStyles.buttonText, { color: colors.white }]}>Login</Text>}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  fieldError: {
    marginTop: -8,
    marginBottom: 12,
    fontSize: 13,
  },
  serverError: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default React.memo(LoginModal);
