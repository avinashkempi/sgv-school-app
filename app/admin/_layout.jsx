import { Stack } from 'expo-router';
import RoleGuard from '../../components/RoleGuard';

export default function AdminLayout() {
  return (
    <RoleGuard allowedRoles={['admin', 'super admin']}>
      <Stack screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 200,
        freezeOnBlur: true,
        detachInactiveScreens: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }} />
    </RoleGuard>
  );
}
