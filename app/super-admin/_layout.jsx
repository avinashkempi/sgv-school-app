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
      >
        <Stack.Screen
          name="create-year"
          options={{
            animation: "slide_from_bottom",
            presentation: "modal",
            gestureDirection: "vertical",
          }}
        />
        <Stack.Screen
          name="transition-wizard"
          options={{
            animation: "slide_from_bottom",
            presentation: "modal",
            gestureDirection: "vertical",
          }}
        />
      </Stack>
    </RoleGuard>
  );
}
