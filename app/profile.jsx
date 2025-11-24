import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, Switch } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme";
import { SCHOOL } from "../constants/basic-info";
import { Linking } from "react-native";
// import { logFCMToken } from "../utils/fcm"; // Uncomment to log FCM token

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { styles, colors, mode, toggle } = useTheme();
  const [user, setUser] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(mode);

  useEffect(() => {
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
    loadUser();

    // Uncomment the line below to log FCM token to console
    // logFCMToken().catch(err => console.log('FCM token error:', err));
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
      setUser(null);
      const { router } = require('expo-router');
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
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

  const menuItems = [
    {
      label: "Help & Support",
      icon: "help-outline",
      onPress: () => Alert.alert("Help & Support", "Contact us at sgvrss@gmail.com"),
    },
    {
      label: "About App",
      icon: "info-outline",
      onPress: () => Alert.alert("About", "School App v1.0\nBuilt by SGV team!"),
    },
  ];

  const socialItems = [
    { type: "fontawesome", icon: "youtube-play", color: "#FF0000", onPress: () => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube), label: "YouTube" },
    { type: "fontawesome", icon: "instagram", color: "#C13584", onPress: () => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram), label: "Instagram" },
    { type: "material", icon: "location-on", color: colors.primary, onPress: () => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl), label: "Location" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPaddingBottom}>
      {/* Profile Header */}
      <View style={{ alignItems: "center", marginTop: 20, marginBottom: 40 }}>
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.cardBackground,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
          <MaterialIcons name="person" size={50} color={colors.primary} />
        </View>

        {user ? (
          <>
            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 8 }}>
              {user.username}
            </Text>

            {user.phone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <MaterialIcons name="phone" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.textSecondary }}>
                  {user.phone}
                </Text>
              </View>
            )}

            {user.email && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <MaterialIcons name="email" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.textSecondary }}>
                  {user.email}
                </Text>
              </View>
            )}

            {user.role && (
              <View style={{
                backgroundColor: colors.primary + '15',
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: 20,
                marginTop: 4
              }}>
                <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold", fontSize: 12, textTransform: 'uppercase' }}>
                  {user.role}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginBottom: 4 }}>
              Guest User
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.textSecondary }}>
              Login to access all features
            </Text>
          </>
        )}
      </View>

      {/* Settings Section */}
      <Text style={styles.label}>Settings</Text>
      <View style={styles.cardMinimal}>
        {/* Theme Toggle */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border + '40'
        }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12
            }}>
              <MaterialIcons name="brightness-6" size={20} color={colors.textPrimary} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>Dark Mode</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggle}
            trackColor={{ false: "#e0e0e0", true: colors.primary + '80' }}
            thumbColor={mode === 'dark' ? colors.primary : "#f4f3f4"}
          />
        </View>

        {/* Menu Items */}
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={item.onPress}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 16,
              opacity: pressed ? 0.7 : 1,
              borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
              borderBottomColor: colors.border + '40'
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.background,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name={item.icon} size={20} color={colors.textPrimary} />
              </View>
              <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>{item.label}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      {/* Social Links */}
      <Text style={[styles.label, { marginTop: 24 }]}>Follow Us</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
        {socialItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={item.onPress}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              paddingVertical: 20,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            })}
          >
            {item.type === "fontawesome" ? (
              <FontAwesome name={item.icon} size={24} color={item.color} style={{ marginBottom: 8 }} />
            ) : (
              <MaterialIcons name={item.icon} size={24} color={item.color} style={{ marginBottom: 8 }} />
            )}
            <Text style={{ fontSize: 13, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Auth Button */}
      <Pressable
        onPress={user ? handleLogout : () => navigation.navigate('login')}
        style={({ pressed }) => ({
          backgroundColor: user ? colors.error + '15' : colors.primary,
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <MaterialIcons
          name={user ? "logout" : "login"}
          size={20}
          color={user ? colors.error : colors.white}
          style={{ marginRight: 8 }}
        />
        <Text style={{
          fontSize: 16,
          fontFamily: "DMSans-Bold",
          color: user ? colors.error : colors.white
        }}>
          {user ? "Log Out" : "Log In"}
        </Text>
      </Pressable>

      <Text style={{ textAlign: 'center', marginTop: 24, color: colors.textSecondary, fontSize: 12 }}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}
