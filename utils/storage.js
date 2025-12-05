import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Custom storage utility to handle platform differences.
 * Uses localStorage on Web and AsyncStorage on Native.
 * This avoids issues with expo-secure-store or other native modules on Web.
 */

const isWeb = Platform.OS === 'web';

const storage = {
    getItem: async (key) => {
        if (isWeb) {
            try {
                if (typeof localStorage !== 'undefined') {
                    return localStorage.getItem(key);
                }
            } catch (e) {
                console.error('Local storage is not available:', e);
            }
            return null;
        } else {
            return await AsyncStorage.getItem(key);
        }
    },

    setItem: async (key, value) => {
        if (isWeb) {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(key, value);
                }
            } catch (e) {
                console.error('Local storage is not available:', e);
            }
        } else {
            await AsyncStorage.setItem(key, value);
        }
    },

    removeItem: async (key) => {
        if (isWeb) {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                console.error('Local storage is not available:', e);
            }
        } else {
            await AsyncStorage.removeItem(key);
        }
    },

    multiRemove: async (keys) => {
        if (isWeb) {
            try {
                if (typeof localStorage !== 'undefined') {
                    keys.forEach(key => localStorage.removeItem(key));
                }
            } catch (e) {
                console.error('Local storage is not available:', e);
            }
        } else {
            await AsyncStorage.multiRemove(keys);
        }
    },

    clear: async () => {
        if (isWeb) {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.clear();
                }
            } catch (e) {
                console.error('Local storage is not available:', e);
            }
        } else {
            await AsyncStorage.clear();
        }
    }
};

export default storage;
