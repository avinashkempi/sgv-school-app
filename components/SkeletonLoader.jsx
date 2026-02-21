import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

export default function SkeletonLoader({ width = '100%', height = 20, style, borderRadius = 8 }) {
    const { colors, mode } = useTheme();
    const animatedValue = useSharedValue(0);

    useEffect(() => {
        animatedValue.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            false
        );
    }, []);

    const baseColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    const highlightColor = mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)';

    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            animatedValue.value,
            [0, 1],
            [-500, 500] // Arbitrary large pixel values to ensure gradient completely passes
        );

        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View
            style={[
                {
                    width,
                    height,
                    backgroundColor: baseColor,
                    borderRadius,
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
                <LinearGradient
                    colors={['transparent', highlightColor, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </Animated.View>
        </View>
    );
}
