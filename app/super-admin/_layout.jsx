import { Stack } from "expo-router";
import RoleGuard from "../../components/RoleGuard";

export default function SuperAdminLayout() {
  return (
    <RoleGuard allowedRoles={["super admin"]}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 200,
          freezeOnBlur: true,
          detachInactiveScreens: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
    </RoleGuard>
  );
}
