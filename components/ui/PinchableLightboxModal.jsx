import React, { useCallback, useState, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Standard High-Performance Image Lightbox Modal with:
 * - 2-finger Pinch to Zoom (up to 4x)
 * - Double-Tap to Zoom In / Out (1x ⇄ 2.5x)
 * - Drag/Swipe-Down to Dismiss with velocity detection
 * - Smooth backdrop fade and interactive spring physics
 */
export default function PinchableLightboxModal({ visible, imageUrl, onClose }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  // Transformation shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const dismissTranslateY = useSharedValue(0);

  // Reset all transform values and loading state when modal becomes visible or image changes
  useEffect(() => {
    if (visible) {
      setLoading(true);
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      dismissTranslateY.value = 0;
    }
  }, [
    visible,
    imageUrl,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    dismissTranslateY,
  ]);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (typeof onClose === "function") {
      onClose();
    }
  }, [onClose]);

  const resetTransform = useCallback(() => {
    "worklet";
    scale.value = withSpring(1, { damping: 15 });
    savedScale.value = 1;
    translateX.value = withSpring(0, { damping: 15 });
    translateY.value = withSpring(0, { damping: 15 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    dismissTranslateY.value = withSpring(0, { damping: 15 });
  }, [
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    dismissTranslateY,
  ]);

  // Double Tap to toggle zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > 1.2) {
        resetTransform();
      } else {
        scale.value = withSpring(2.5, { damping: 14, stiffness: 120 });
        savedScale.value = 2.5;
      }
    });

  // Pinch Gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.8, Math.min(savedScale.value * e.scale, 4.5));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetTransform();
      } else if (scale.value > 4) {
        scale.value = withSpring(4, { damping: 14 });
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan Gesture (Zoom pan OR Drag down to dismiss when scale is 1)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        // Pan around the zoomed image
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        // Drag down to dismiss gesture (only positive Y)
        if (e.translationY > 0) {
          dismissTranslateY.value = e.translationY;
        }
      }
    })
    .onEnd((e) => {
      if (scale.value > 1.05) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        // Dismiss if pulled down > 120px or with strong downward velocity
        if (dismissTranslateY.value > 120 || e.velocityY > 600) {
          dismissTranslateY.value = withTiming(
            SCREEN_HEIGHT,
            { duration: 200 },
            () => {
              runOnJS(handleDismiss)();
            }
          );
        } else {
          dismissTranslateY.value = withSpring(0, { damping: 15 });
        }
      }
    });

  const composedGestures = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + dismissTranslateY.value },
        { scale: scale.value },
      ],
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      dismissTranslateY.value,
      [0, SCREEN_HEIGHT * 0.4],
      [1, 0.2],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <StatusBar style="light" />

        {/* Close Button with standard 44pt touch target */}
        <View style={[styles.header, { top: Math.max(insets.top, 16) }]}>
          <Pressable
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close full screen image"
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={26} color="#ffffff" />
          </Pressable>
        </View>

        {/* Interactive Image Container */}
        <View style={styles.imageContainer}>
          {loading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
          <GestureDetector gesture={composedGestures}>
            <Animated.View style={[styles.gestureWrapper, imageAnimatedStyle]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
                onLoadEnd={() => setLoading(false)}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    right: 16,
    zIndex: 50,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  gestureWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
});
