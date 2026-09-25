import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, RADIUS } from "../../theme";

/**
 * QuickActions - Primary 4-button shortcut grid for home screen
 *
 * @param {'student'|'teacher'|'admin'|'super admin'|string} [role='student']
 * @param {Object} [style]
 */
const QuickActions = memo(({ role = "student", style }) => {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const getActionsForRole = () => {
    switch (role) {
      case "teacher":
      case "staff":
        return [
          {
            id: "attendance",
            label: "Take Attend.",
            icon: "how-to-reg",
            route: "/requests",
            accent: colors.primary,
            bg: colors.primaryContainer,
          },
          {
            id: "marks",
            label: "Enter Marks",
            icon: "edit-note",
            route: "/teacher/marks-entry",
            accent: colors.brandBlue || colors.secondary,
            bg: colors.brandBlueContainer || "#EBF2FF",
          },
          {
            id: "schedule",
            label: "Timetable",
            icon: "schedule",
            route: "/teacher/timetable",
            accent: colors.success || "#16A34A",
            bg: colors.successContainer || "#ECFDF5",
          },
          {
            id: "leaves",
            label: "Requests",
            icon: "fact-check",
            route: "/requests",
            accent: colors.warning || "#D97706",
            bg: colors.warningContainer || "#FFFBEB",
          },
        ];

      case "admin":
      case "super admin":
        return [];

      case "student":
      default:
        return [];
    }
  };

  const actions = getActionsForRole();

  // No actions for this role — render nothing
  if (actions.length === 0) return null;

  const handlePress = (route) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    router.push(route);
  };

  return (
    <View style={[styles.container, style]}>
      {actions.map((act) => (
        <Pressable
          key={act.id}
          accessibilityRole="button"
          accessibilityLabel={act.label}
          onPress={() => handlePress(act.route)}
          style={({ pressed }) => [
            styles.actionItem,
            pressed && { transform: [{ scale: 0.94 }], opacity: 0.85 },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isDark
                  ? `${act.accent}20`
                  : act.bg,
                borderColor: isDark
                  ? `${act.accent}30`
                  : "transparent",
              },
            ]}
          >
            <MaterialIcons name={act.icon} size={22} color={act.accent} />
          </View>
          <Text
            style={[
              styles.label,
              { color: colors.textPrimary || colors.onSurface },
            ]}
            numberOfLines={1}
          >
            {act.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

QuickActions.displayName = "QuickActions";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  actionItem: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg || 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
  },
  label: {
    fontSize: FONT_SIZES.xs || 11,
    fontFamily: FONTS.semiBold || FONTS.medium,
    textAlign: "center",
    letterSpacing: 0.1,
  },
});

export default QuickActions;
