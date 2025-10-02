import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

export default function useFade(duration = 100, toValue = 1) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [anim, duration, toValue]);

  return anim;
}
