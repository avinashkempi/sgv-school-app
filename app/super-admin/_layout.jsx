import { Stack } from 'expo-router';
import RoleGuard from '../../components/RoleGuard';

export default function SuperAdminLayout() {
  return (
    <RoleGuard allowedRoles={['super admin']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
