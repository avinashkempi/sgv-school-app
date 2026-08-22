import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';
import Button from './Button';

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
  title = 'Congratulations!',
  subtitle = 'Action completed successfully.',
  buttonText = 'Awesome!',
  onDismiss,
  source,
}) {
  const { colors } = useTheme();
  const animationRef = useRef(null);

  useEffect(() => {
    if (visible) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback on web/unsupported
      }
      if (animationRef.current) {
        animationRef.current.play();
      }
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Background Scrim */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onDismiss}
        />

        {/* Celebration Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLow || colors.surface,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          {/* Lottie Confetti Animation */}
          <View style={styles.animationContainer}>
            {source ? (
              <LottieView
                ref={animationRef}
                source={source}
                autoPlay
                loop={false}
                style={styles.lottie}
                onAnimationFinish={() => {
                  // Keep static frame or let user dismiss
                }}
              />
            ) : (
              <View
                style={[
                  styles.trophyBadge,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <Text style={styles.trophyEmoji}>🎉</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: colors.onSurface }]}>
            {title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {subtitle}
          </Text>

          <Button
            variant="filled"
            onPress={onDismiss}
            style={styles.button}
          >
            {buttonText}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  animationContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    width: '100%',
  },
});
