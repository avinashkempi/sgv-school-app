import { Stack } from 'expo-router';
import RoleGuard from '../../components/RoleGuard';

export default function StudentLayout() {
  return (
    <RoleGuard allowedRoles={['student']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
