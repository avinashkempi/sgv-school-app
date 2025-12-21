import React, { useState } from 'react';
import { View, TextInput as RNTextInput, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

/**
 * Material 3 Text Input
 * Variants:
 * - filled: Background color, underline indicator (default)
 * - outlined: Border surround
 */
const TextInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    variant = 'outlined', // M3 default is often filled, but outlined is cleaner for data forms
    icon,
    rightIcon,
    onRightIconPress,
    error,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    style,
    inputStyle,
    containerStyle,
    labelStyle,
    iconColor,
    ...props
}) => {
    const { colors, styles } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    // Determine Container Colors
    const getContainerStyles = () => {
        const baseColors = {
            borderColor: error ? colors.error : (isFocused ? colors.primary : colors.outlineVariant),
            backgroundColor: variant === 'filled' ? colors.surfaceContainerHighest : 'transparent',
            borderWidth: variant === 'outlined' ? (isFocused ? 2 : 1) : 0,
            borderBottomWidth: variant === 'filled' ? (isFocused ? 2 : 1) : (variant === 'outlined' ? (isFocused ? 2 : 1) : 0),
        };

        if (variant === 'filled') {
            return {
                backgroundColor: baseColors.backgroundColor,
                borderBottomWidth: baseColors.borderBottomWidth,
                borderBottomColor: baseColors.borderColor,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                paddingHorizontal: 16,
            };
        }

        // Outlined
        return {
            backgroundColor: 'transparent',
            borderWidth: baseColors.borderWidth,
            borderColor: baseColors.borderColor,
            borderRadius: 4,
            paddingHorizontal: 16,
        };
    };

    const getTextColor = () => {
        return error ? colors.error : colors.onSurface;
    };

    return (
        <View style={[styles.inputContainer, containerStyle]}>
            {label && (
                <Text style={[
                    styles.label,
                    {
                        color: error ? colors.error : (isFocused ? colors.primary : colors.onSurfaceVariant),
                        marginBottom: 8
                    },
                    labelStyle
                ]}>
                    {label}
                </Text>
            )}

            <View style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 56,
                },
                getContainerStyles(),
                style
            ]}>
                {icon && (
                    <MaterialIcons
                        name={icon}
                        size={24}
                        color={iconColor || (error ? colors.error : (isFocused ? colors.primary : colors.onSurfaceVariant))}
                        style={{ marginRight: 12 }}
                    />
                )}

                <RNTextInput
                    style={[
                        {
                            flex: 1,
                            fontSize: 16,
                            fontFamily: "DMSans-Regular",
                            color: colors.onSurface,
                            height: '100%',
                        },
                        inputStyle
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.onSurfaceVariant}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    selectionColor={colors.primary}
                    {...props}
                />

                {rightIcon && (
                    <Pressable onPress={onRightIconPress} style={{ padding: 4 }}>
                        <MaterialIcons
                            name={rightIcon}
                            size={24}
                            color={iconColor || (error ? colors.error : colors.onSurfaceVariant)}
                        />
                    </Pressable>
                )}
            </View>

            {error && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};

export default React.memo(TextInput);
