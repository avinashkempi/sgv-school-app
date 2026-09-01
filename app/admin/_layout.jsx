import { Stack } from "expo-router";
import RoleGuard from "../../components/RoleGuard";

export default function AdminLayout() {
  return (
    <RoleGuard allowedRoles={["admin", "super admin"]}>
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
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="classes" options={{ animation: "fade" }} />
        <Stack.Screen
          name="send-notification"
          options={{
            animation: "slide_from_bottom",
            presentation: "modal",
            gestureDirection: "vertical",
          }}
        />
        <Stack.Screen
          name="import-data"
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
