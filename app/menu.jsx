import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Linking, } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome, } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useToast } from '../components/ToastProvider';
import Header from '../components/Header';
import storage from '../utils/storage';
import { SCHOOL } from '../constants/basic-info';
import Card from '../components/Card';
import Button from '../components/Button';

export default function MenuScreen() {
    const router = useRouter();
    const { styles, colors, mode, toggle, _gradients } = useTheme();
    const { _showToast } = useToast();

    const handleLogout = async () => {
        try {
            await storage.removeItem('@auth_token');
            await storage.removeItem('@auth_user');
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
            const storedUser = await storage.getItem('@auth_user');
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
            subtitle: "School calendar & upcoming",
            icon: "event",
            route: "/events",
            color: "#4CAF50"
        },

        // Only show Complaints if user is logged in
        ...(user ? [{
            title: "Complaints",
            subtitle: "Raise issues or feedback",
            icon: "feedback",
            action: navigateToComplaints,
            color: "#FF5722"
        }] : []),

    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Header title="Menu" subtitle="Settings & More" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
                {/* Quick Actions Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                    {menuItems.map((item, index) => (
                        <Card
                            key={index}
                            variant="elevated"
                            onPress={() => item.route ? router.push(item.route) : item.action()}
                            style={{
                                width: '48%',
                                marginBottom: 4,
                            }}
                            contentStyle={{ padding: 16 }}
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
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 4 }}>
                                {item.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium", lineHeight: 16 }}>
                                {item.subtitle}
                            </Text>
                        </Card>
                    ))}
                </View>

                {/* Settings Section */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Preferences</Text>

                <Card variant="filled" style={{ padding: 0, overflow: 'hidden' }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                backgroundColor: colors.primaryContainer,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MaterialIcons name={mode === 'dark' ? "dark-mode" : "light-mode"} size={22} color={colors.onPrimaryContainer} />
                            </View>
                            <View>
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                    Dark Mode
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: "DMSans-Regular" }}>
                                    {mode === 'dark' ? 'Easy on the eyes' : 'Bright and clear'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={mode === 'dark'}
                            onValueChange={toggle}
                            trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
                            thumbColor={mode === 'dark' ? colors.onPrimary : colors.outline}
                        />
                    </View>
                </Card>

                {/* Socials Section */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Follow Us</Text>
                <Card variant="outlined" contentStyle={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 24 }}>
                    <Pressable
                        onPress={() => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FF000015', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <FontAwesome name="youtube-play" size={28} color="#FF0000" />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.onSurfaceVariant }}>YouTube</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#C1358415', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <FontAwesome name="instagram" size={28} color="#C13584" />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.onSurfaceVariant }}>Instagram</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <MaterialIcons name="location-on" size={28} color={colors.primary} />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.onSurfaceVariant }}>Location</Text>
                    </Pressable>
                </Card>

                {/* Logout / Login Button */}
                {user ? (
                    <Button
                        variant="tonal"
                        onPress={handleLogout}
                        style={{ marginTop: 24, backgroundColor: colors.errorContainer }}
                        textStyle={{ color: colors.onErrorContainer }}
                        icon="logout"
                    >
                        Log Out
                    </Button>
                ) : (
                    <Button
                        variant="filled"
                        onPress={() => router.replace('/login')}
                        style={{ marginTop: 24 }}
                        icon="login"
                    >
                        Log In
                    </Button>
                )}
            </ScrollView>
        </View>
    );
}
