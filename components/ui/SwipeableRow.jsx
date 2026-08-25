import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Animated, Pressable } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

/**
 * Standard iOS/Android Swipeable Row Component
 *
 * @param {Function} onDelete - Callback when delete action is pressed or triggered
 * @param {string} deleteIcon - Material icon name (default: "delete")
 * @param {string} deleteColor - Background color for delete action (default: "#EF4444")
 * @param {boolean} enabled - Whether swipe action is enabled (default: true)
 * @param {React.ReactNode} children - Row content
 */
export default function SwipeableRow({
  children,
  onDelete,
  deleteIcon = "delete-outline",
  deleteColor = "#EF4444",
  enabled = true,
}) {
  const swipeableRowRef = useRef(null);

  const close = useCallback(() => {
    swipeableRowRef.current?.close();
  }, []);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    close();
    if (typeof onDelete === "function") {
      onDelete();
    }
  }, [onDelete, close]);

  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: "clamp",
    });

    const opacity = dragX.interpolate({
      inputRange: [-80, -20, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.rightActionsContainer}>
        <Animated.View
          style={[
            styles.actionButtonContainer,
            {
              backgroundColor: deleteColor,
              transform: [{ translateX: trans }],
              opacity,
            },
          ]}
        >
          <Pressable
            onPress={handleDelete}
            style={styles.actionPressable}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Delete item"
            accessibilityRole="button"
          >
            <MaterialIcons name={deleteIcon} size={24} color="#ffffff" />
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  if (!enabled || !onDelete) {
    return children;
  }

  return (
    <Swipeable
      ref={swipeableRowRef}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      containerStyle={styles.swipeContainer}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    overflow: "hidden",
  },
  rightActionsContainer: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginVertical: 4,
  },
  actionButtonContainer: {
    width: 72,
    height: "90%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  actionPressable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
