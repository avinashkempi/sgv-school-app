import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme";
import { SCHOOL } from "../constants/basic-info";
import { Linking } from "react-native";

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

  const themeOptions = [
    { key: "light", label: "Light", icon: "wb-sunny" },
    { key: "dark", label: "Dark", icon: "nightlight-round" },
    { key: "system", label: "Auto", icon: "settings-suggest" },
  ];

  const handleThemeChange = async (newTheme) => {
    try {
      if (newTheme === "system") {
        await AsyncStorage.removeItem("@theme_mode");
        setSelectedTheme("system");
        toggle();
      } else {
        await AsyncStorage.setItem("@theme_mode", newTheme);
        setSelectedTheme(newTheme);
        if (newTheme !== mode) {
          toggle();
        }
      }
    } catch (e) {
      console.warn('Failed to save theme preference', e);
      Alert.alert("Error", "Failed to save theme preference");
    }
  };

  const menuItems = [
    {
      label: "Help & Support",
      icon: "help",
      onPress: () => Alert.alert("Help & Support", "Contact us at sgvrss@gmail.com"),
    },
    {
      label: "About",
      icon: "info",
      onPress: () => Alert.alert("About", "School App v1.0\nBuilt by SGV team!"),
    },
  ];

  const socialItems = [
    { type: "fontawesome", icon: "youtube", color: "#FF0000", onPress: () => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube), label: "YouTube" },
    { type: "fontawesome", icon: "instagram", color: "#C13584", onPress: () => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram), label: "Instagram" },
    { type: "material", icon: "location-on", color: colors.primary, onPress: () => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl), label: "Location" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPaddingBottom}>
      {/* Profile Header - No Card */}
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}>
          <MaterialIcons name="person" size={40} color={colors.white} />
        </View>
        {user ? (
          <>
            <Text style={[styles.heading, { fontSize: 20, marginBottom: 4 }]}>{user.username}</Text>
            <Text style={[styles.text, { fontSize: 13, marginBottom: 8 }]}>{user.email || "No email"}</Text>
            {user.phone && (
              <Text style={[styles.text, { fontSize: 13, marginBottom: 4 }]}>📱 {user.phone}</Text>
            )}
            {user.role && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.badge, { backgroundColor: colors.primary, paddingVertical: 4, paddingHorizontal: 12 }]}>
                  <Text style={{ color: colors.white, fontFamily: "DMSans-SemiBold", fontSize: 12 }}>{user.role}</Text>
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.heading, { fontSize: 20, marginBottom: 4 }]}>Guest User</Text>
            <Text style={[styles.text, { fontSize: 13, marginBottom: 0 }]}>Login for full access</Text>
          </>
        )}
      </View>

      {/* Auth Button */}
      <Pressable
        onPress={user ? handleLogout : () => navigation.navigate('login')}
        style={[styles.buttonLarge, { marginBottom: 16, flexDirection: "row", justifyContent: "center", gap: 8 }]}
      >
        <MaterialIcons name={user ? "exit-to-app" : "person-add"} size={18} color={colors.white} />
        <Text style={styles.buttonText}>{user ? "Logout" : "Login"}</Text>
      </Pressable>

      {/* Theme Toggle */}
      <Pressable
        onPress={toggle}
        style={[styles.buttonSecondary, { marginBottom: 24, flexDirection: "row", justifyContent: "center", gap: 8 }]}
      >
        <MaterialIcons
          name={mode === "dark" ? "wb-sunny" : "nightlight-round"}
          size={18}
          color={colors.primary}
        />
        <Text style={[styles.buttonText, { color: colors.primary }]}>
          {mode === "dark" ? "Light Mode" : "Dark Mode"}
        </Text>
      </Pressable>

      {/* Menu Items */}
      {menuItems.map((item, index) => (
        <Pressable
          key={index}
          onPress={item.onPress}
          style={[styles.card, { flexDirection: "row", alignItems: "center", marginBottom: 8 }]}
        >
          <MaterialIcons name={item.icon} size={20} color={colors.primary} style={{ marginRight: 12 }} />
          <Text style={[styles.text, { flex: 1, marginBottom: 0 }]}>{item.label}</Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.textSecondary} />
        </Pressable>
      ))}

      {/* Social Links */}
      <Text style={[styles.label, { fontSize: 12, marginTop: 24, marginBottom: 12 }]}>Follow Us</Text>
      <View style={[styles.card, { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", paddingVertical: 16 }]}>
        {socialItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={item.onPress}
            style={{ alignItems: "center" }}
          >
            {item.type === "fontawesome" ? (
              <FontAwesome name={item.icon} size={28} color={item.color} />
            ) : (
              <MaterialIcons name={item.icon} size={28} color={item.color} />
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
