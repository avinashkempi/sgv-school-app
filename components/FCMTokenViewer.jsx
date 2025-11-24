import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme';
import { getFCMToken, logFCMToken } from '../utils/fcm';

export default function FCMTokenViewer() {
    const { styles, colors } = useTheme();
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchToken = async () => {
        setLoading(true);
        setError(null);
        try {
            const fcmToken = await getFCMToken();
            setToken(fcmToken);
            logFCMToken(); // Also log to console
        } catch (err) {
            setError(err.message);
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (token) {
            await Clipboard.setStringAsync(token);
            Alert.alert('Copied!', 'FCM token copied to clipboard');
        }
    };

    useEffect(() => {
        // Auto-fetch on mount
        fetchToken();
    }, []);

    return (
        <View style={[styles.card, { marginBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MaterialIcons name="notifications" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.label, { fontSize: 16, marginBottom: 0 }]}>FCM Registration Token</Text>
            </View>

            {loading && <Text style={styles.text}>Loading token...</Text>}

            {error && (
                <View style={{ backgroundColor: colors.error + '20', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    <Text style={[styles.text, { color: colors.error }]}>{error}</Text>
                </View>
            )}

            {token && (
                <>
                    <ScrollView
                        horizontal
                        style={{
                            backgroundColor: colors.background,
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 12,
                            maxHeight: 100,
                        }}
                    >
                        <Text
                            style={[
                                styles.text,
                                {
                                    fontFamily: 'Courier',
                                    fontSize: 12,
                                    color: colors.textPrimary,
                                },
                            ]}
                            selectable
                        >
                            {token}
                        </Text>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                            onPress={copyToClipboard}
                            style={[styles.buttonLarge, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                        >
                            <MaterialIcons name="content-copy" size={18} color={colors.white} />
                            <Text style={styles.buttonText}>Copy Token</Text>
                        </Pressable>

                        <Pressable
                            onPress={fetchToken}
                            style={[styles.buttonSecondary, { minWidth: 44, justifyContent: 'center', alignItems: 'center' }]}
                        >
                            <MaterialIcons name="refresh" size={20} color={colors.primary} />
                        </Pressable>
                    </View>
                </>
            )}

            {!loading && !token && !error && (
                <Pressable onPress={fetchToken} style={styles.buttonLarge}>
                    <Text style={styles.buttonText}>Get FCM Token</Text>
                </Pressable>
            )}
        </View>
    );
}
