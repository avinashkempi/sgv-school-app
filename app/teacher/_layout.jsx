import { Stack } from "expo-router";
import RoleGuard from "../../components/RoleGuard";

export default function TeacherLayout() {
  return (
    <RoleGuard allowedRoles={["teacher", "staff", "admin", "super admin"]}>
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
        <Stack.Screen name="dashboard" options={{ animation: "fade" }} />
        <Stack.Screen name="classes" options={{ animation: "fade" }} />
        <Stack.Screen
          name="subject/create-exam"
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
