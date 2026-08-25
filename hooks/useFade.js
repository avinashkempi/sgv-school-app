import { useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

/**
 * useFade — UI-thread fade-in animation using Reanimated.
 *
 * Returns an animated style object ready to spread into
 * Reanimated's <Animated.View style={fadeStyle}>.
 *
 * @param {number} duration  – animation duration in ms (default 200)
 * @param {number} toValue   – target opacity (default 1)
 */
export default function useFade(duration = 200, toValue = 1) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(toValue, {
      duration,
      easing: Easing.out(Easing.quad),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, toValue]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return fadeStyle;
}
