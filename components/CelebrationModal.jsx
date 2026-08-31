import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Modal, Pressable } from "react-native";
import LottieView from "lottie-react-native";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../theme";
import Button from "./Button";

/**
 * CelebrationModal - Auto-cleaning celebration modal for submissions & accomplishments
 * Ensures zero memory leak on low-RAM Android devices
 *
 * @param {boolean} visible - Controls modal visibility
 * @param {string} title - Celebration headline (e.g. "Homework Submitted!")
 * @param {string} subtitle - Congratulatory message
 * @param {string} buttonText - Dismiss button text (default: "Awesome!")
 * @param {Function} onDismiss - Callback when dismissed
 * @param {string|object} source - Lottie JSON source (optional, uses built-in SVG fallback if omitted)
 */
export default function CelebrationModal({
  visible = false,
  title = "Congratulations!",
  subtitle = "Action completed successfully.",
  buttonText = "Awesome!",
  onDismiss,
  source,
}) {
  const { colors } = useTheme();
  const animationRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // Gentle vibration feedback on open
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        // Haptics not available on some low-end Androids, ignore safely
      }
    } else {
      // Memory protection: reset animation memory when closed
      if (animationRef.current) {
        animationRef.current.reset();
      }
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLowest || "#ffffff",
              borderColor: colors.outlineVariant || "#e0e0e0",
            },
          ]}
          onPress={(e) => e.stopPropagation()} // Prevent closing on card tap
        >
          {/* Visual Highlight */}
          <View style={styles.animationWrap}>
            {source ? (
              <LottieView
                ref={animationRef}
                source={source}
                autoPlay
                loop={false}
                style={styles.lottie}
                renderMode="HARDWARE"
              />
            ) : (
              <View
                style={[
                  styles.trophyBadge,
                  { backgroundColor: colors.primaryContainer || "#e8f0fe" },
                ]}
              >
                <Text style={styles.trophyEmoji}>🎉</Text>
              </View>
            )}
          </View>

          {/* Texts */}
          <Text
            style={[
              styles.title,
              { color: colors.onSurface || "#1f1f1f" },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.onSurfaceVariant || "#49454f" },
            ]}
          >
            {subtitle}
          </Text>

          {/* Action Button */}
          <Button
            variant="filled"
            label={buttonText}
            onPress={onDismiss}
            style={styles.button}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  animationWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  lottie: {
    width: 120,
    height: 120,
  },
  trophyBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  trophyEmoji: {
    fontSize: FONT_SIZES.jumbo,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: LINE_HEIGHTS.sm,
    marginBottom: 20,
  },
  button: {
    width: "100%",
  },
});
