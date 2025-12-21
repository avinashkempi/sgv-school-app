import React from 'react';
import { Text, Pressable, ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

/**
 * Material 3 Button
 * Variants:
 * - filled: High emphasis (Primary)
 * - tonal: Medium emphasis (Secondary Container)
 * - outlined: Medium emphasis (Border)
 * - text: Low emphasis (Text only)
 * - elevated: High emphasis (Surface + Shadow)
 */
const Button = ({
    children,
    onPress,
    variant = 'filled',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    style,
    textStyle,
    ...props
}) => {
    const { colors, styles } = useTheme();

    // Determine Colors based on Variant
    const getColors = () => {
        if (disabled) {
            return {
                bg: colors.onSurface + '1F', // 12% opacity onSurface
                text: colors.onSurface + '61', // 38% opacity onSurface
                border: 'transparent',
            };
        }

        switch (variant) {
            case 'filled':
                return { bg: colors.primary, text: colors.onPrimary, border: 'transparent' };
            case 'tonal':
                return { bg: colors.secondaryContainer, text: colors.onSecondaryContainer, border: 'transparent' };
            case 'outlined':
                return { bg: 'transparent', text: colors.primary, border: colors.outline };
            case 'text':
                return { bg: 'transparent', text: colors.primary, border: 'transparent' };
            case 'elevated':
                return { bg: colors.surfaceContainerLow, text: colors.primary, border: 'transparent', elevation: 1 };
            default:
                return { bg: colors.primary, text: colors.onPrimary, border: 'transparent' };
        }
    };

    const themeColors = getColors();

    const containerStyle = [
        {
            backgroundColor: themeColors.bg,
            paddingVertical: 10,
            paddingHorizontal: 24,
            borderRadius: 100, // Pill shape
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: variant === 'outlined' ? 1 : 0,
            borderColor: themeColors.border,
            minHeight: 40,
        },
        variant === 'elevated' && !disabled && {
            elevation: 1,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2
        },
        style,
    ];

    const labelStyle = [
        {
            fontFamily: "DMSans-Medium",
            fontSize: 14,
            lineHeight: 20,
            letterSpacing: 0.1,
            color: themeColors.text,
            textAlign: 'center',
        },
        (icon || loading) && iconPosition === 'left' && { marginLeft: 8 },
        (icon || loading) && iconPosition === 'right' && { marginRight: 8 },
        textStyle,
    ];

    return (
        <Pressable
            onPress={!disabled && !loading ? onPress : null}
            style={({ pressed }) => [
                containerStyle,
                pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.98 }] }
            ]}
            android_ripple={{ color: themeColors.text, opacity: 0.12, borderless: false }}
            {...props}
        >
            {loading ? (
                <ActivityIndicator size="small" color={themeColors.text} style={{ marginRight: 8 }} />
            ) : null}

            {!loading && icon && iconPosition === 'left' && (
                <MaterialIcons name={icon} size={18} color={themeColors.text} />
            )}

            <Text style={labelStyle}>{children}</Text>

            {!loading && icon && iconPosition === 'right' && (
                <MaterialIcons name={icon} size={18} color={themeColors.text} />
            )}
        </Pressable>
    );
};

export default React.memo(Button);
