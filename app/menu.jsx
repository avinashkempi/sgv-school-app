import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useToast } from '../components/ToastProvider';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHOOL } from '../constants/basic-info';
import { LinearGradient } from 'expo-linear-gradient';

export default function MenuScreen() {
    const router = useRouter();
    const { styles, colors, mode, toggle, gradients } = useTheme();
    const { showToast } = useToast();

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('@auth_token');
            await AsyncStorage.removeItem('@auth_user');
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handlePress = async (appUrl, fallbackUrl) => {
        try {
            const supported = await Linking.canOpenURL(appUrl);
            if (supported) {
                await Linking.openURL(appUrl);
            } else {
                await Linking.openURL(fallbackUrl);
            }
        } catch (err) {
            console.error("Failed to open link:", err);
        }
    };

    const [user, setUser] = useState(null);

    React.useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('@auth_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.warn('Failed to load user', e);
        }
    };

    const navigateToComplaints = () => {
        router.push('/complaints');
    };

    const menuItems = [
        {
            title: "Profile",
            subtitle: "View & edit your profile",
            icon: "person",
            route: "/profile",
            color: "#673AB7"
        },
        {
            title: "Events",
            subtitle: "School calendar & upcoming events",
            icon: "event",
            route: "/events",
            color: "#4CAF50"
        },
        {
            title: "News",
            subtitle: "Latest announcements & updates",
            icon: "article",
            route: "/news",
            color: "#2196F3"
        },
        // Only show Complaints if user is logged in
        ...(user ? [{
            title: "Complaints & Feedback",
            subtitle: "Raise issues or share feedback",
            icon: "feedback",
            action: navigateToComplaints,
            color: "#FF5722"
        }] : []),

    ];

    return (
        <View style={styles.container}>
            <Header title="Menu" subtitle="Settings & More" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Quick Actions Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                    {menuItems.map((item, index) => (
                        <Pressable
                            key={index}
                            onPress={() => item.route ? router.push(item.route) : item.action()}
                            style={({ pressed }) => ({
                                width: '48%',
                                backgroundColor: colors.cardBackground,
                                borderRadius: 20,
                                padding: 16,
                                marginBottom: 4,
                                borderWidth: 1,
                                borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                shadowColor: colors.shadow,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: mode === 'dark' ? 0.2 : 0.04,
                                shadowRadius: 8,
                                elevation: 2,
                                opacity: pressed ? 0.9 : 1,
                                transform: [{ scale: pressed ? 0.98 : 1 }]
                            })}
                        >
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 14,
                                backgroundColor: item.color + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 12
                            }}>
                                <MaterialIcons name={item.icon} size={24} color={item.color} />
                            </View>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
                                {item.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans-Medium", lineHeight: 16 }}>
                                {item.subtitle}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Settings Section */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginLeft: 4 }]}>Preferences</Text>

                <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 20,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                backgroundColor: colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MaterialIcons name={mode === 'dark' ? "dark-mode" : "light-mode"} size={22} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                    Dark Mode
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                    {mode === 'dark' ? 'Easy on the eyes' : 'Bright and clear'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={mode === 'dark'}
                            onValueChange={toggle}
                            trackColor={{ false: "#e0e0e0", true: colors.primary + '60' }}
                            thumbColor={mode === 'dark' ? colors.primary : "#f4f3f4"}
                        />
                    </View>
                </View>

                {/* Socials Section */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginLeft: 4 }]}>Follow Us</Text>
                <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 24 }]}>
                    <Pressable
                        onPress={() => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FF000015', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <FontAwesome name="youtube-play" size={28} color="#FF0000" />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>YouTube</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#C1358415', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <FontAwesome name="instagram" size={28} color="#C13584" />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>Instagram</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <MaterialIcons name="location-on" size={28} color={colors.primary} />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>Location</Text>
                    </Pressable>
                </View>

                {/* Logout / Login Button */}
                {user ? (
                    <Pressable
                        onPress={handleLogout}
                        style={({ pressed }) => ({
                            marginTop: 24,
                            backgroundColor: colors.error + '10',
                            borderRadius: 16,
                            padding: 18,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            borderWidth: 1,
                            borderColor: colors.error + '20',
                            opacity: pressed ? 0.8 : 1
                        })}
                    >
                        <MaterialIcons name="logout" size={22} color={colors.error} />
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.error }}>
                            Log Out
                        </Text>
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={() => router.replace('/login')}
                        style={({ pressed }) => ({
                            marginTop: 24,
                            backgroundColor: colors.primary,
                            borderRadius: 16,
                            padding: 18,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            opacity: pressed ? 0.9 : 1,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                        })}
                    >
                        <MaterialIcons name="login" size={22} color="#fff" />
                        <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: "#fff" }}>
                            Log In
                        </Text>
                    </Pressable>
                )}

                <Text style={{ textAlign: 'center', marginTop: 24, color: colors.textSecondary, fontSize: 12, fontFamily: "DMSans-Regular" }}>
                    App Version 1.0.0 • Build 2024
                </Text>

            </ScrollView>
        </View>
    );
}
