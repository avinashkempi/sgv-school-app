import { Stack } from 'expo-router';
import RoleGuard from '../../components/RoleGuard';

export default function StudentLayout() {
  return (
    <RoleGuard allowedRoles={['student']}>
      <Stack screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 200,
        freezeOnBlur: true,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }} />
    </RoleGuard>
  );
}
