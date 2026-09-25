import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme, FONTS, FONT_SIZES, RADIUS, SPACING } from "../../theme";
import Badge from "../ui/Badge";

/**
 * OnboardingPage — Single slide for the onboarding tour.
 * Designed with Material 3 surface elevation, glowing radial hero backdrop,
 * and high-contrast typography for consumer-grade polish.
 */
export default function OnboardingPage({ item, width }) {
  const { colors } = useTheme();
  const accent = item.accentColor || colors.primary;

  return (
    <View style={[styles.container, { width }]}>
      {/* Hero Graphic Container */}
      <View style={styles.heroSection}>
        {/* Soft radial backdrop gradient */}
        <LinearGradient
          colors={[accent + "18", accent + "04", "transparent"]}
          style={styles.heroGlow}
          pointerEvents="none"
        />

        {/* Outer decorative ring */}
        <View
          style={[
            styles.outerRing,
            { borderColor: accent + "20" },
          ]}
        >
          {/* Inner hero icon surface */}
          <View
            style={[
              styles.iconSurface,
              {
                backgroundColor: colors.surfaceContainerLow || colors.surface,
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
                shadowColor: accent,
              },
            ]}
          >
            <LinearGradient
              colors={[accent + "14", accent + "06"]}
              style={styles.iconGradient}
            >
              <MaterialIcons name={item.icon} size={54} color={accent} />
            </LinearGradient>
          </View>
        </View>

        {/* Category Badge */}
        <View style={styles.badgeWrapper}>
          <Badge
            label={item.badge}
            variant="filled"
            size="md"
            style={{
              backgroundColor: accent + "18",
              borderColor: accent + "30",
              borderWidth: 1,
            }}
            textStyle={{
              color: accent,
              fontFamily: FONTS.bold,
              letterSpacing: 1,
              fontSize: 10,
            }}
          />
        </View>
      </View>

      {/* Text Section */}
      <View style={styles.textSection}>
        <Text
          style={[
            styles.title,
            { color: colors.onBackground },
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.onSurfaceVariant },
          ]}
        >
          {item.subtitle}
        </Text>

        {/* Feature Highlights Grid / Pills */}
        {item.highlights && item.highlights.length > 0 && (
          <View style={styles.highlightsContainer}>
            {item.highlights.map((highlight, idx) => (
              <View
                key={idx}
                style={[
                  styles.highlightPill,
                  {
                    backgroundColor: colors.surfaceContainerLowest || colors.surface,
                    borderColor: colors.outlineVariant + "60" || "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.highlightDot,
                    { backgroundColor: accent },
                  ]}
                >
                  <MaterialIcons name="check" size={10} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    styles.highlightText,
                    { color: colors.onSurface },
                  ]}
                >
                  {highlight}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xxl || 28,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xxl || 32,
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -20,
  },
  outerRing: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  iconSurface: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.xxl || 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWrapper: {
    marginTop: SPACING.lg || 16,
  },
  textSection: {
    alignItems: "center",
    maxWidth: 340,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    lineHeight: 34,
    textAlign: "center",
    marginBottom: SPACING.sm || 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm || 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: SPACING.xl || 24,
  },
  highlightsContainer: {
    width: "100%",
    gap: SPACING.sm || 8,
  },
  highlightPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
    gap: 10,
  },
  highlightDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs || 12,
    flexShrink: 1,
  },
});
