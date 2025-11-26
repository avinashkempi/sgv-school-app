import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { useNavigationContext } from '../context/NavigationContext';
import { ROUTES } from '../constants/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHOOL } from '../constants/basic-info';
import { Linking } from 'react-native';
import { useToast } from './ToastProvider';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85;

export default function SideDrawer() {
    const { isDrawerOpen, closeDrawer } = useNavigationContext();
    const { styles, colors, mode, toggle } = useTheme();
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { showToast } = useToast();

    useEffect(() => {
        if (isDrawerOpen) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 10,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: DRAWER_WIDTH,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 10,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isDrawerOpen]);

    const handleNavigation = (route) => {
        closeDrawer();
        setTimeout(() => {
            router.push(route);
        }, 300);
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('@auth_token');
            await AsyncStorage.removeItem('@auth_user');
            closeDrawer();
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

    const handleHelpSupport = () => {
        showToast('Contact us at sgvrss@gmail.com', 'info');
    };

    const handleAbout = () => {
        showToast('School App v1.0 - Built by SGV team!', 'info');
    };

    if (!isDrawerOpen && slideAnim._value === DRAWER_WIDTH) return null;

    const gradientColors = mode === 'dark'
        ? [colors.primary + '40', colors.primary + '10']
        : [colors.primary + '20', colors.primary + '05'];

    return (
        <>
            <Animated.View
                pointerEvents={isDrawerOpen ? 'auto' : 'none'}
                style={{
                    opacity: fadeAnim,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                }}
            >
                <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
            </Animated.View>

            <Animated.View
                pointerEvents={isDrawerOpen ? 'auto' : 'none'}
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: DRAWER_WIDTH,
                    backgroundColor: colors.background,
                    zIndex: 1000,
                    shadowColor: "#000",
                    shadowOffset: { width: -4, height: 0 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 16,
                    transform: [{ translateX: slideAnim }],
                }}
            >
                {/* Header with Gradient */}
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={localStyles.header}
                >
                    <View style={localStyles.headerContent}>
                        <View>
                            <Text style={[localStyles.headerTitle, { color: colors.textPrimary }]}>Menu</Text>
                            <Text style={[localStyles.headerSubtitle, { color: colors.textSecondary }]}>
                                {SCHOOL.name}
                            </Text>
                        </View>
                        <Pressable onPress={closeDrawer} style={localStyles.closeButton}>
                            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                        </Pressable>
                    </View>
                </LinearGradient>

                <ScrollView
                    style={localStyles.scrollView}
                    contentContainerStyle={localStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Navigation Section */}
                    <View style={localStyles.section}>
                        <Text style={[localStyles.sectionTitle, { color: colors.textSecondary }]}>Navigate</Text>
                        <MenuItem
                            icon="event"
                            label="Events"
                            onPress={() => handleNavigation(ROUTES.EVENTS)}
                            colors={colors}
                        />
                        <MenuItem
                            icon="article"
                            label="News"
                            onPress={() => handleNavigation(ROUTES.NEWS)}
                            colors={colors}
                        />
                    </View>

                    {/* Divider */}
                    <View style={[localStyles.divider, { backgroundColor: colors.border }]} />

                    {/* Settings Section */}
                    <View style={localStyles.section}>
                        <Text style={[localStyles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>
                        <View style={[localStyles.menuCard, { backgroundColor: colors.cardBackground }]}>
                            <View style={localStyles.menuCardContent}>
                                <MaterialIcons name="brightness-6" size={22} color={colors.primary} />
                                <Text style={[localStyles.menuText, { color: colors.textPrimary }]}>Dark Mode</Text>
                            </View>
                            <Switch
                                value={mode === 'dark'}
                                onValueChange={toggle}
                                trackColor={{ false: "#e0e0e0", true: colors.primary + '60' }}
                                thumbColor={mode === 'dark' ? colors.primary : "#f4f3f4"}
                            />
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={[localStyles.divider, { backgroundColor: colors.border }]} />

                    {/* Support Section */}
                    <View style={localStyles.section}>
                        <Text style={[localStyles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
                        <MenuItem
                            icon="help-outline"
                            label="Help & Support"
                            onPress={handleHelpSupport}
                            colors={colors}
                        />
                        <MenuItem
                            icon="info-outline"
                            label="About App"
                            onPress={handleAbout}
                            colors={colors}
                        />
                    </View>

                    {/* Divider */}
                    <View style={[localStyles.divider, { backgroundColor: colors.border }]} />

                    {/* Social Media Section */}
                    <View style={localStyles.section}>
                        <Text style={[localStyles.sectionTitle, { color: colors.textSecondary }]}>Follow Us</Text>
                        <View style={localStyles.socialContainer}>
                            <SocialButton onPress={() => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube)}>
                                <FontAwesome name="youtube-play" size={26} color="#FF0000" />
                            </SocialButton>
                            <SocialButton onPress={() => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram)}>
                                <FontAwesome name="instagram" size={26} color="#C13584" />
                            </SocialButton>
                            <SocialButton onPress={() => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl)}>
                                <MaterialIcons name="location-on" size={26} color={colors.primary} />
                            </SocialButton>
                        </View>
                    </View>

                    {/* Logout Button */}
                    <Pressable
                        onPress={handleLogout}
                        style={({ pressed }) => [
                            localStyles.logoutButton,
                            {
                                backgroundColor: colors.error + '15',
                                transform: [{ scale: pressed ? 0.97 : 1 }]
                            }
                        ]}
                    >
                        <MaterialIcons name="logout" size={20} color={colors.error} />
                        <Text style={[localStyles.logoutText, { color: colors.error }]}>Log Out</Text>
                    </Pressable>
                </ScrollView>
            </Animated.View>
        </>
    );
}

// Menu Item Component with animation
function MenuItem({ icon, label, onPress, colors }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[localStyles.menuCard, { backgroundColor: colors.cardBackground }]}
            >
                <MaterialIcons name={icon} size={22} color={colors.primary} />
                <Text style={[localStyles.menuText, { color: colors.textPrimary }]}>{label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
        </Animated.View>
    );
}

// Social Button Component with animation
function SocialButton({ children, onPress }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={localStyles.socialButton}
            >
                {children}
            </Pressable>
        </Animated.View>
    );
}

const localStyles = StyleSheet.create({
    header: {
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'DMSans-Bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        fontFamily: 'DMSans-Regular',
        opacity: 0.8,
    },
    closeButton: {
        padding: 8,
        borderRadius: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'DMSans-Bold',
        textTransform: 'uppercase',
        marginBottom: 12,
        letterSpacing: 1,
        marginTop: 8,
    },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    menuCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuText: {
        fontSize: 15,
        fontFamily: 'DMSans-Medium',
        flex: 1,
        marginLeft: 14,
    },
    divider: {
        height: 1,
        marginVertical: 12,
        opacity: 0.2,
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
        marginBottom: 8,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 14,
        marginTop: 16,
        gap: 8,
    },
    logoutText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 16,
    },
});
