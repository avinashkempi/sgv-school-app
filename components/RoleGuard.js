import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { useToast } from './ToastProvider';
import { useEffect, useRef } from 'react';

/**
 * RoleGuard — wraps route groups to enforce role-based access.
 *
 * Usage (in a _layout.jsx):
 *   <RoleGuard allowedRoles={['admin', 'super admin']}>
 *     <Stack screenOptions={{ headerShown: false }} />
 *   </RoleGuard>
 *
 * If the user's role doesn't match, they are redirected to home with a toast.
 * Shows a loading spinner while auth is still resolving.
 */
export default function RoleGuard({ allowedRoles = [], children }) {
  const { user, isReady, isAuthenticated, isDemo } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const hasRedirected = useRef(false);

  const userRole = user?.role;
  const hasAccess = userRole && allowedRoles.includes(userRole);

  useEffect(() => {
    if (!isReady || hasRedirected.current) return;

    // Demo users shouldn't access role-restricted routes
    if (isDemo) {
      hasRedirected.current = true;
      showToast('This feature is not available in demo mode', 'info', 2000);
      router.replace('/');
      return;
    }

    // Not authenticated
    if (!isAuthenticated) {
      hasRedirected.current = true;
      router.replace('/login');
      return;
    }

    // Wrong role
    if (userRole && !hasAccess) {
      hasRedirected.current = true;
      showToast('You do not have access to this section', 'error', 2500);
      router.replace('/');
      return;
    }
  }, [isReady, isAuthenticated, isDemo, userRole, hasAccess, router, showToast]);

  // While auth is loading, show spinner
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If user has access, render children
  if (hasAccess) {
    return children;
  }

  // If we're about to redirect, show spinner
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
