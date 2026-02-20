import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme';

/**
 * ModernTimePicker
 * Uses native time picker approaches for maximum reliability across iOS and Android.
 */
export default function ModernTimePicker({ visible, onClose, onConfirm, value, title = "Select Time" }) {
    const { colors } = useTheme();
    const [tempDate, setTempDate] = useState(value || new Date());

    useEffect(() => {
        if (visible && value) {
            setTempDate(value);
        }
    }, [visible, value]);

    if (!visible) return null;

    if (Platform.OS === 'android') {
        return (
            <DateTimePicker
                value={tempDate}
                mode="time"
                display="default"
                onChange={(event, selectedDate) => {
                    // Always close picker first
                    onClose();

                    // IF the user pressed OK, the type will be 'set'
                    if (event.type === 'set' && selectedDate) {
                        onConfirm(selectedDate);
                    }
                }}
            />
        );
    }

    // iOS Implementation uses standard Bottom Sheet UI for Time Pickers
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.iosOverlay}>
                <Pressable style={styles.iosBackdrop} onPress={onClose} />
                <View style={[styles.iosContainer, { backgroundColor: colors.cardBackground }]}>
                    <View style={[styles.iosHeader, { borderBottomColor: colors.border }]}>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={[styles.iosButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                        </Pressable>
                        <Text style={[styles.iosTitle, { color: colors.textPrimary }]}>{title}</Text>
                        <Pressable
                            hitSlop={10}
                            onPress={() => {
                                onConfirm(tempDate);
                                onClose();
                            }}
                        >
                            <Text style={[styles.iosButtonText, { color: colors.primary, fontFamily: 'DMSans-Bold' }]}>Done</Text>
                        </Pressable>
                    </View>
                    <DateTimePicker
                        value={tempDate}
                        mode="time"
                        display="spinner"
                        onChange={(e, date) => setTempDate(date || tempDate)}
                        textColor={colors.textPrimary}
                        themeVariant={colors.dark ? "dark" : "light"}
                        style={{ height: 216, width: '100%' }}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    iosOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    iosBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    iosContainer: {
        paddingBottom: 30, // Safe area padding
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iosHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iosButtonText: {
        fontSize: 16,
        fontFamily: 'DMSans-Medium',
    },
    iosTitle: {
        fontSize: 16,
        fontFamily: 'DMSans-Bold',
    }
});
