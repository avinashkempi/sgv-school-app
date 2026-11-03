import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import * as apiFetchModule from '../../utils/apiFetch';

// Mock FCM
jest.mock('../../utils/fcm', () => ({
  getFCMToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  registerFCMTokenWithBackend: jest.fn().mockResolvedValue(true),
  unregisterFCMTokenFromBackend: jest.fn().mockResolvedValue(true),
  flushPendingFCMUnregisters: jest.fn().mockResolvedValue(true),
}));

// Mock Background Sync
jest.mock('../../utils/backgroundSync', () => ({
  registerBackgroundSync: jest.fn().mockResolvedValue(true),
  unregisterBackgroundSync: jest.fn().mockResolvedValue(true),
}));

// Test consumer component
function TestConsumer() {
  const { user, token, isAuthenticated, isDemo, isReady, login, logout, updateUser, switchDemoPersona } = useAuth();

  return (
    <View>
      <Text testID="ready-status">{isReady ? 'ready' : 'loading'}</Text>
      <Text testID="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</Text>
      <Text testID="demo-status">{isDemo ? 'demo' : 'live'}</Text>
      <Text testID="user-name">{user?.name || 'no-user'}</Text>
      <Text testID="user-role">{user?.role || 'no-role'}</Text>
      <Text testID="token-value">{token || 'no-token'}</Text>

      <Pressable
        testID="login-btn"
        onPress={() => login('jwt-token-12345', { id: 'usr-1', name: 'John Doe', role: 'student' })}
      >
        <Text>Login</Text>
      </Pressable>

      <Pressable
        testID="update-user-btn"
        onPress={() => updateUser({ id: 'usr-1', name: 'John Updated', role: 'student' })}
      >
        <Text>Update User</Text>
      </Pressable>

      <Pressable
        testID="demo-switch-btn"
        onPress={() => switchDemoPersona('teacher')}
      >
        <Text>Demo Teacher</Text>
      </Pressable>

      <Pressable
        testID="logout-btn"
        onPress={() => logout({ replace: jest.fn() })}
      >
        <Text>Logout</Text>
      </Pressable>
    </View>
  );
}

describe('AuthContext & useAuth', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('initializes with unauthenticated state when storage is empty', async () => {
    const { findByTestId } = await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const readyNode = await findByTestId('ready-status');
    expect(readyNode.props.children).toBe('ready');

    const authNode = await findByTestId('auth-status');
    expect(authNode.props.children).toBe('unauthenticated');

    const userNode = await findByTestId('user-name');
    expect(userNode.props.children).toBe('no-user');

    const tokenNode = await findByTestId('token-value');
    expect(tokenNode.props.children).toBe('no-token');
  });

  it('hydrates valid session from AsyncStorage on mount', async () => {
    // Generate valid future-dated JWT payload: exp = now + 1 day
    const futureExp = Math.floor(Date.now() / 1000) + 86400;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ id: 'usr-42', exp: futureExp })).toString('base64');
    const validJwt = `${header}.${payload}.mock-signature`;

    const storedUser = { id: 'usr-42', name: 'Aarav Sharma', role: 'student' };

    await AsyncStorage.setItem('@auth_token', validJwt);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(storedUser));

    const { findByTestId } = await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const readyNode = await findByTestId('ready-status');
    expect(readyNode.props.children).toBe('ready');

    const authNode = await findByTestId('auth-status');
    expect(authNode.props.children).toBe('authenticated');

    const userNode = await findByTestId('user-name');
    expect(userNode.props.children).toBe('Aarav Sharma');

    const roleNode = await findByTestId('user-role');
    expect(roleNode.props.children).toBe('student');

    const tokenNode = await findByTestId('token-value');
    expect(tokenNode.props.children).toBe(validJwt);
  });

  it('purges expired token from storage on mount', async () => {
    // Expired JWT payload: exp = now - 1 day
    const pastExp = Math.floor(Date.now() / 1000) - 86400;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ id: 'usr-old', exp: pastExp })).toString('base64');
    const expiredJwt = `${header}.${payload}.mock-signature`;

    await AsyncStorage.setItem('@auth_token', expiredJwt);
    await AsyncStorage.setItem('@auth_user', JSON.stringify({ id: 'usr-old', name: 'Old User' }));

    const { findByTestId } = await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const readyNode = await findByTestId('ready-status');
    expect(readyNode.props.children).toBe('ready');

    const authNode = await findByTestId('auth-status');
    expect(authNode.props.children).toBe('unauthenticated');

    const userNode = await findByTestId('user-name');
    expect(userNode.props.children).toBe('no-user');

    const tokenInStorage = await AsyncStorage.getItem('@auth_token');
    expect(tokenInStorage).toBeNull();
  });

  it('updates state and persists credentials when login is invoked', async () => {
    const setApiFetchTokenSpy = jest.spyOn(apiFetchModule, 'setApiFetchToken');

    const { findByTestId } = await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await findByTestId('ready-status');

    const loginBtn = await findByTestId('login-btn');
    fireEvent.press(loginBtn);

    await waitFor(async () => {
      const authNode = await findByTestId('auth-status');
      expect(authNode.props.children).toBe('authenticated');
    });

    const userNode = await findByTestId('user-name');
    expect(userNode.props.children).toBe('John Doe');

    const roleNode = await findByTestId('user-role');
    expect(roleNode.props.children).toBe('student');

    expect(setApiFetchTokenSpy).toHaveBeenCalledWith('jwt-token-12345');

    const tokenInStorage = await AsyncStorage.getItem('@auth_token');
    const userInStorage = await AsyncStorage.getItem('@auth_user');
    expect(tokenInStorage).toBe('jwt-token-12345');
    expect(JSON.parse(userInStorage)).toEqual(
      expect.objectContaining({ name: 'John Doe', role: 'student' })
    );

    setApiFetchTokenSpy.mockRestore();
  });

  it('clears credentials and notifies on logout', async () => {
    const clearApiFetchTokenSpy = jest.spyOn(apiFetchModule, 'clearApiFetchToken');

    const futureExp = Math.floor(Date.now() / 1000) + 86400;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ id: 'u1', exp: futureExp })).toString('base64');
    const validJwt = `${header}.${payload}.mock-signature`;

    await AsyncStorage.setItem('@auth_token', validJwt);
    await AsyncStorage.setItem('@auth_user', JSON.stringify({ id: 'u1', name: 'Active User' }));

    const { findByTestId } = await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(async () => {
      const authNode = await findByTestId('auth-status');
      expect(authNode.props.children).toBe('authenticated');
    });

    const logoutBtn = await findByTestId('logout-btn');
    fireEvent.press(logoutBtn);

    await waitFor(async () => {
      const authNode = await findByTestId('auth-status');
      expect(authNode.props.children).toBe('unauthenticated');
    });

    const userNode = await findByTestId('user-name');
    expect(userNode.props.children).toBe('no-user');

    expect(clearApiFetchTokenSpy).toHaveBeenCalled();
    const tokenInStorage = await AsyncStorage.getItem('@auth_token');
    expect(tokenInStorage).toBeNull();

    clearApiFetchTokenSpy.mockRestore();
  });

  it('updates user profile via updateUser()', async () => {
    const { findByTestId } = await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await findByTestId('ready-status');

    fireEvent.press(await findByTestId('login-btn'));

    await waitFor(async () => {
      const userNode = await findByTestId('user-name');
      expect(userNode.props.children).toBe('John Doe');
    });

    fireEvent.press(await findByTestId('update-user-btn'));

    await waitFor(async () => {
      const userNode = await findByTestId('user-name');
      expect(userNode.props.children).toBe('John Updated');
    });

    const userInStorage = JSON.parse(await AsyncStorage.getItem('@auth_user'));
    expect(userInStorage.name).toBe('John Updated');
  });

  it('switches demo persona to teacher', async () => {
    const { findByTestId } = await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await findByTestId('ready-status');

    fireEvent.press(await findByTestId('demo-switch-btn'));

    await waitFor(async () => {
      const demoNode = await findByTestId('demo-status');
      expect(demoNode.props.children).toBe('demo');
    });

    const roleNode = await findByTestId('user-role');
    expect(roleNode.props.children).toBe('teacher');

    const tokenNode = await findByTestId('token-value');
    expect(tokenNode.props.children).toBe('demo-token');
  });
});
