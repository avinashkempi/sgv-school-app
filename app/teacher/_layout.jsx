import { Stack } from 'expo-router';
import RoleGuard from '../../components/RoleGuard';

export default function TeacherLayout() {
  return (
    <RoleGuard allowedRoles={['teacher', 'admin', 'super admin']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
