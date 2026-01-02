import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useTheme } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';

const EmptyState = ({ icon = "inbox", title, message, actionLabel, onAction }) => {
    const { colors, styles } = useTheme();

    return (
        <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            minHeight: 200
        }}>
            <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.surfaceContainerHighest,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
            }}>
                <MaterialIcons name={icon} size={40} color={colors.onSurfaceVariant} />
            </View>
            <Text style={[styles.titleMedium, { color: colors.onSurface, marginBottom: 8, textAlign: 'center' }]}>
                {title}
            </Text>
            <Text style={[styles.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }]}>
                {message}
            </Text>
            {actionLabel && onAction && (
                <Pressable
                    onPress={onAction}
                    style={({ pressed }) => ({
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 20,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.9 : 1
                    })}
                >
                    <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onPrimary }}>
                        {actionLabel}
                    </Text>
                </Pressable>
            )}
        </View>
    );
};

const LoadingState = ({ message = "Loading..." }) => {
    const { colors, styles } = useTheme();

    return (
        <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            minHeight: 200
        }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 16 }]}>
                {message}
            </Text>
        </View>
    );
};

const ErrorState = ({ title = "Something went wrong", message, onRetry }) => {
    const { colors, styles } = useTheme();

    return (
        <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            minHeight: 200
        }}>
            <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.errorContainer,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
            }}>
                <MaterialIcons name="error-outline" size={40} color={colors.error} />
            </View>
            <Text style={[styles.titleMedium, { color: colors.error, marginBottom: 8, textAlign: 'center' }]}>
                {title}
            </Text>
            {message && (
                <Text style={[styles.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }]}>
                    {message}
                </Text>
            )}
            {onRetry && (
                <Pressable
                    onPress={onRetry}
                    style={({ pressed }) => ({
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 20,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.9 : 1
                    })}
                >
                    <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onPrimary }}>
                        Try Again
                    </Text>
                </Pressable>
            )}
        </View>
    );
};

export { EmptyState, LoadingState, ErrorState };
