import { Stack } from "expo-router";
import RoleGuard from "../../components/RoleGuard";

export default function StudentLayout() {
  return (
    <RoleGuard allowedRoles={["student"]}>
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
        <Stack.Screen name="class" options={{ animation: "fade" }} />
      </Stack>
    </RoleGuard>
  );
}
