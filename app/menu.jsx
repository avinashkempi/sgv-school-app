import React from 'react';
import { View, Text, ScrollView, Pressable, Switch, Linking, } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome, } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useToast } from '../components/ToastProvider';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useLabel } from '../context/LabelsContext';
import { SCHOOL } from '../constants/basic-info';
import Card from '../components/Card';
import Button from '../components/Button';

export default function MenuScreen() {
    const router = useRouter();
    const { styles, colors, mode, toggle, _gradients } = useTheme();
    const { showToast } = useToast();
    const { user, logout } = useAuth();
    const { t } = useLabel();

    const handleLogout = async () => {
        await logout(router, null, showToast);
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

    const navigateToComplaints = () => {
        router.push('/complaints');
    };

    const menuItems = [
        {
            title: t('menu.profile'),
            subtitle: t('menu.profileSubtitle'),
            icon: "person",
            route: "/profile",
            color: colors.primary
        },
        {
            title: "Vibes",
            subtitle: "Community photo feed",
            icon: "auto-awesome",
            route: "/vibes",
            color: "#FF9800"
        },
        {
            title: t('menu.events'),
            subtitle: t('menu.eventsSubtitle'),
            icon: "event",
            route: "/events",
            color: colors.tertiary
        },
        ...(user && (user.role === 'admin' || user.role === 'super admin') ? [{
            title: "Vibes Approvals",
            subtitle: "Review community posts",
            icon: "verified-user",
            route: "/admin/vibe-approvals",
            color: "#2E7D32"
        }] : []),
        // Only show Complaints if user is logged in
        ...(user ? [{
            title: t('menu.complaints'),
            subtitle: t('menu.complaintsSubtitle'),
            icon: "feedback",
            action: navigateToComplaints,
            color: colors.error
        }] : []),
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Header title={t('menu.title')} subtitle={t('menu.subtitle')} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.contentPaddingBottom, { paddingHorizontal: 20 }]}>
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
                <Text style={[styles.titleMedium, { marginTop: 24, marginBottom: 12 }]}>{t('menu.preferences')}</Text>

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
                                    {t('menu.darkMode')}
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: "DMSans-Regular" }}>
                                    {mode === 'dark' ? t('menu.darkModeOnSubtitle') : t('menu.darkModeOffSubtitle')}
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
                <Text style={[styles.titleMedium, { marginTop: 24, marginBottom: 12 }]}>{t('menu.followUs')}</Text>
                <Card variant="outlined" contentStyle={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 24 }}>
                    <Pressable
                        onPress={() => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FF000015', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <FontAwesome name="youtube-play" size={28} color="#FF0000" />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.onSurfaceVariant }}>{t('menu.youtube')}</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#E1306C15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <FontAwesome name="instagram" size={28} color="#E1306C" />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.onSurfaceVariant }}>{t('menu.instagram')}</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}
                        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                    >
                        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <MaterialIcons name="location-on" size={28} color={colors.primary} />
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.onSurfaceVariant }}>{t('menu.location')}</Text>
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
                        {t('common.logOut')}
                    </Button>
                ) : (
                    <Button
                        variant="filled"
                        onPress={() => router.replace('/login')}
                        style={{ marginTop: 24 }}
                        icon="login"
                    >
                        {t('common.logIn')}
                    </Button>
                )}
            </ScrollView>
        </View>
    );
}
