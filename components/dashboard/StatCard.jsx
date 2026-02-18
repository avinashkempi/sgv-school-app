import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const StatCard = ({ title, value, subtitle, icon, trend, trendValue, color, onPress, loading = false }) => {
    const { colors, styles } = useTheme();

    const isPositive = trendValue >= 0;
    const trendColor = isPositive ? colors.success : colors.error;

    const CardContent = () => (
        <View style={[
            styles.card,
            {
                backgroundColor: colors.surfaceContainer,
                borderRadius: 24,
                padding: 20,
                flex: 1,
                minWidth: 150,
                margin: 6
            }
        ]}>
            {loading ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', height: 100 }}>
                    <MaterialCommunityIcons name="loading" size={32} color={colors.onSurfaceVariant} />
                    <Text style={[styles.bodySmall, { marginTop: 8, color: colors.onSurfaceVariant }]}>Loading...</Text>
                </View>
            ) : (
                <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{
                            backgroundColor: color + '20',
                            padding: 10,
                            borderRadius: 14
                        }}>
                            <MaterialCommunityIcons name={icon} size={24} color={color} />
                        </View>
                        {trend && trendValue !== undefined && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: trendColor + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 }}>
                                <MaterialCommunityIcons name={isPositive ? "arrow-up" : "arrow-down"} size={14} color={trendColor} />
                                <Text style={{ fontSize: 12, color: trendColor, fontFamily: styles.labelMedium.fontFamily, marginLeft: 2 }}>
                                    {Math.abs(trendValue)}%
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.titleSmall, { opacity: 0.7, marginBottom: 4 }]}>{title}</Text>
                    <Text style={[styles.headlineMedium, { color: colors.onSurface }]}>{value}</Text>
                    {subtitle && (
                        <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, fontFamily: 'DMSans-Medium', marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
                    )}
                </>
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }]
                })}
            >
                <CardContent />
            </Pressable>
        );
    }

    return <CardContent />;
};

export default StatCard;
