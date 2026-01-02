import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Card from './Card';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * StatCard Component
 * Displays a statistic with icon, value, label, and optional trend
 * 
 * @param {String} label - Stat label
 * @param {String|Number} value - Main value to display
 * @param {String} icon - MaterialIcons icon name
 * @param {String} color - Primary color for the card
 * @param {String} trend - Optional trend indicator ('up', 'down', 'neutral')
 * @param {String|Number} trendValue - Optional trend value to display
 * @param {String} subtitle - Optional subtitle text
 * @param {Boolean} gradient - Whether to use gradient background
 */
export default function StatCard({
    label,
    value,
    icon = 'analytics',
    color = '#2196F3',
    trend,
    trendValue,
    subtitle,
    gradient = false,
    variant = 'default' // 'default', 'compact', 'large'
}) {
    const { colors } = useTheme();

    const getTrendIcon = () => {
        if (trend === 'up') return 'trending-up';
        if (trend === 'down') return 'trending-down';
        return 'trending-flat';
    };

    const getTrendColor = () => {
        if (trend === 'up') return colors.success;
        if (trend === 'down') return colors.error;
        return colors.onSurfaceVariant;
    };

    const getSize = () => {
        if (variant === 'compact') {
            return {
                iconSize: 20,
                valueSize: 20,
                labelSize: 11,
                padding: 12
            };
        }
        if (variant === 'large') {
            return {
                iconSize: 32,
                valueSize: 32,
                labelSize: 14,
                padding: 20
            };
        }
        return {
            iconSize: 24,
            valueSize: 24,
            labelSize: 12,
            padding: 16
        };
    };

    const size = getSize();

    const CardContent = () => (
        <View style={{ padding: size.padding }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                    <Text style={{
                        fontSize: size.labelSize,
                        fontFamily: 'DMSans-Medium',
                        color: gradient ? '#FFFFFF' : colors.onSurfaceVariant,
                        marginBottom: 8,
                        opacity: gradient ? 0.9 : 1
                    }}>
                        {label}
                    </Text>
                    <Text style={{
                        fontSize: size.valueSize,
                        fontFamily: 'DMSans-Bold',
                        color: gradient ? '#FFFFFF' : colors.onSurface,
                        marginBottom: subtitle || trend ? 6 : 0
                    }}>
                        {value}
                    </Text>
                    {subtitle && (
                        <Text style={{
                            fontSize: size.labelSize - 1,
                            fontFamily: 'DMSans-Regular',
                            color: gradient ? '#FFFFFF' : colors.onSurfaceVariant,
                            opacity: gradient ? 0.8 : 0.7
                        }}>
                            {subtitle}
                        </Text>
                    )}
                    {trend && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 4
                        }}>
                            <MaterialIcons
                                name={getTrendIcon()}
                                size={14}
                                color={gradient ? '#FFFFFF' : getTrendColor()}
                            />
                            {trendValue && (
                                <Text style={{
                                    fontSize: 11,
                                    fontFamily: 'DMSans-Bold',
                                    color: gradient ? '#FFFFFF' : getTrendColor()
                                }}>
                                    {trendValue}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
                <View style={{
                    backgroundColor: gradient ? 'rgba(255,255,255,0.2)' : color + '15',
                    width: size.iconSize + 16,
                    height: size.iconSize + 16,
                    borderRadius: (size.iconSize + 16) / 2,
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <MaterialIcons
                        name={icon}
                        size={size.iconSize}
                        color={gradient ? '#FFFFFF' : color}
                    />
                </View>
            </View>
        </View>
    );

    if (gradient) {
        return (
            <Card
                variant="elevated"
                style={{ flex: 1, minWidth: variant === 'compact' ? 140 : 160, overflow: 'hidden' }}
                contentStyle={{ padding: 0 }}
            >
                <LinearGradient
                    colors={[color, color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 12 }}
                >
                    <CardContent />
                </LinearGradient>
            </Card>
        );
    }

    return (
        <Card
            variant="elevated"
            style={{ flex: 1, minWidth: variant === 'compact' ? 140 : 160 }}
            contentStyle={{ padding: 0 }}
        >
            <CardContent />
        </Card>
    );
}
