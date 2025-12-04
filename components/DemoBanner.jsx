import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DemoBanner() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Demo Mode • Log in for full access</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FF9800',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    text: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'DMSans-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
