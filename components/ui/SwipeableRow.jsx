import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

/**
 * Animated delete action item for SwipeableRow
 */
const RightActionItem = ({ drag, onDelete, deleteIcon, deleteColor }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const dragVal = typeof drag?.value === "number" ? drag.value : 0;
    const trans = interpolate(
      dragVal,
      [-80, 0],
      [0, 80],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      dragVal,
      [-80, -20, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX: trans }],
      opacity,
    };
  });

  return (
    <View style={styles.rightActionsContainer}>
      <Animated.View
        style={[
          styles.actionButtonContainer,
          { backgroundColor: deleteColor },
          animatedStyle,
        ]}
      >
        <Pressable
          onPress={onDelete}
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

/**
 * Standard iOS/Android Swipeable Row Component
 *
 * @param {Function} onDelete - Callback when delete action is pressed or triggered
 * @param {string} deleteIcon - Material icon name (default: "delete-outline")
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

  const renderRightActions = useCallback(
    (progress, dragX) => (
      <RightActionItem
        drag={dragX}
        onDelete={handleDelete}
        deleteIcon={deleteIcon}
        deleteColor={deleteColor}
      />
    ),
    [handleDelete, deleteIcon, deleteColor]
  );

  if (Platform.OS === "web" || !enabled || !onDelete || !ReanimatedSwipeable) {
    return children;
  }

  return (
    <ReanimatedSwipeable
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
    </ReanimatedSwipeable>
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
