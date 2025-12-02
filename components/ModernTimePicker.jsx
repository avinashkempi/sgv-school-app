import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme';

/**
 * ModernTimePicker
 * A consistent, minimalist time picker that uses a modal with a spinner style on both platforms.
 * 
 * @param {boolean} visible - Whether the picker is visible
 * @param {Function} onClose - Callback when closed/cancelled
 * @param {Function} onConfirm - Callback when time is selected (returns Date object)
 * @param {Date} value - Current/Initial time value
 * @param {string} title - Optional title for the header
 */
export default function ModernTimePicker({ visible, onClose, onConfirm, value, title = "Select Time" }) {
    const { colors } = useTheme();
    const [tempDate, setTempDate] = useState(value || new Date());

    useEffect(() => {
        if (visible && value) {
            setTempDate(value);
        }
    }, [visible, value]);

    const handleChange = (event, selectedDate) => {
        if (selectedDate) {
            setTempDate(selectedDate);
        }
    };

    const handleConfirm = () => {
        onConfirm(tempDate);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.container, { backgroundColor: colors.cardBackground }]} onPress={e => e.stopPropagation()}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                    </View>

                    {/* Picker */}
                    <View style={styles.pickerContainer}>
                        <DateTimePicker
                            value={tempDate}
                            mode="time"
                            display="spinner"
                            onChange={handleChange}
                            textColor={colors.textPrimary}
                            themeVariant={colors.dark ? "dark" : "light"}
                            style={styles.picker}
                        />
                    </View>

                    {/* Footer Actions */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <Pressable onPress={onClose} style={[styles.button, styles.cancelButton]}>
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleConfirm} style={[styles.button, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.buttonText, { color: '#fff' }]}>Confirm</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '90%',
        maxWidth: 340,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontFamily: 'DMSans-Bold',
    },
    pickerContainer: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    picker: {
        height: 180,
        width: '100%',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'DMSans-Bold',
    }
});
