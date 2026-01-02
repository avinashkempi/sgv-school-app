import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Button from './Button';

const DateRangePicker = ({ onRangeSelect, selectedRange, visible, onClose }) => {
    const { colors, styles } = useTheme();
    const [activePreset, setActivePreset] = useState(selectedRange || 'thisMonth');

    const presets = [
        { id: 'today', label: 'Today', icon: 'today' },
        { id: 'thisWeek', label: 'This Week', icon: 'date-range' },
        { id: 'thisMonth', label: 'This Month', icon: 'calendar-month' },
        { id: 'last30Days', label: 'Last 30 Days', icon: 'calendar-today' },
        { id: 'thisYear', label: 'This Year', icon: 'calendar-view-year' },
        { id: 'lastYear', label: 'Last Year', icon: 'history' },
        { id: 'allTime', label: 'All Time', icon: 'all-inclusive' },
    ];

    const handleSelect = (presetId) => {
        setActivePreset(presetId);
    };

    const handleApply = () => {
        onRangeSelect(activePreset);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <View style={[
                    styles.card,
                    {
                        width: '90%',
                        maxWidth: 400,
                        padding: 0,
                        overflow: 'hidden',
                        backgroundColor: colors.surface
                    }
                ]}>
                    {/* Header */}
                    <View style={{
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.outline,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Text style={[styles.titleLarge, { color: colors.onSurface }]}>Select Date Range</Text>
                        <Pressable onPress={onClose} style={{ padding: 4 }}>
                            <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
                        </Pressable>
                    </View>

                    {/* Presets */}
                    <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 20 }}>
                        <View style={{ gap: 12 }}>
                            {presets.map((preset) => (
                                <Pressable
                                    key={preset.id}
                                    onPress={() => handleSelect(preset.id)}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 16,
                                        borderRadius: 16,
                                        backgroundColor: activePreset === preset.id
                                            ? colors.primaryContainer
                                            : pressed
                                                ? colors.surfaceContainerHighest
                                                : colors.surfaceContainer,
                                        borderWidth: activePreset === preset.id ? 2 : 1,
                                        borderColor: activePreset === preset.id ? colors.primary : colors.outline
                                    })}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        backgroundColor: activePreset === preset.id
                                            ? colors.primary + '20'
                                            : colors.surfaceContainerHighest,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <MaterialIcons
                                            name={preset.icon}
                                            size={22}
                                            color={activePreset === preset.id ? colors.primary : colors.onSurfaceVariant}
                                        />
                                    </View>
                                    <Text style={{
                                        fontSize: 16,
                                        fontFamily: activePreset === preset.id ? 'DMSans-Bold' : 'DMSans-Medium',
                                        color: activePreset === preset.id ? colors.onPrimaryContainer : colors.onSurface,
                                        flex: 1
                                    }}>
                                        {preset.label}
                                    </Text>
                                    {activePreset === preset.id && (
                                        <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={{
                        padding: 20,
                        borderTopWidth: 1,
                        borderTopColor: colors.outline,
                        flexDirection: 'row',
                        gap: 12
                    }}>
                        <Button
                            variant="outlined"
                            onPress={onClose}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="filled"
                            onPress={handleApply}
                            style={{ flex: 1 }}
                        >
                            Apply
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default DateRangePicker;
