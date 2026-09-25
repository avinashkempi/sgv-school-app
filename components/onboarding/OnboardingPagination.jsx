import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme, RADIUS } from "../../theme";

/**
 * OnboardingPagination — Displays progress dots for onboarding.
 * The active slide expands into a horizontal capsule.
 */
export default function OnboardingPagination({
  total = 4,
  activeIndex = 0,
  activeColor,
  inactiveColor,
}) {
  const { colors } = useTheme();
  const active = activeColor || colors.primary;
  const inactive = inactiveColor || colors.outlineVariant || "rgba(0,0,0,0.12)";

  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive
                ? [styles.activeDot, { backgroundColor: active, shadowColor: active }]
                : [styles.inactiveDot, { backgroundColor: inactive }],
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: RADIUS.full || 9999,
  },
  activeDot: {
    width: 28,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveDot: {
    width: 8,
    opacity: 0.45,
  },
});
