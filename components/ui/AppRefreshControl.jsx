import React, { useCallback } from 'react';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

/**
 * Standardized Cross-Platform RefreshControl with theme colors and haptic feedback.
 *
 * @param {boolean} refreshing - Current refreshing state
 * @param {Function} onRefresh - Callback when user pulls to refresh
 * @param {object} props - Additional RefreshControl props
 */
export default function AppRefreshControl({
    refreshing,
    onRefresh,
    colors: customColors,
    tintColor: customTintColor,
    progressBackgroundColor: customProgressBg,
    ...props
}) {
    const { colors } = useTheme();

    const handleRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        if (typeof onRefresh === 'function') {
            onRefresh();
        }
    }, [onRefresh]);

    return (
        <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={customColors || [colors.primary]}
            tintColor={customTintColor || colors.primary}
            progressBackgroundColor={customProgressBg || colors.surfaceContainer || colors.surface}
            {...props}
        />
    );
}
