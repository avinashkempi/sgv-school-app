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
    { icon: "youtube-play", color: "#FF0000", onPress: () => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube) },
    { icon: "instagram", color: "#C13584", onPress: () => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram) },
    { icon: "map-marker", color: colors.primary, onPress: () => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl) },
  ];

  return (
    <ScrollView style={[styles.container, { paddingHorizontal: 16 }]} contentContainerStyle={styles.contentPaddingBottom}>
      {/* User Profile Section */}
      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <View style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}>
          <MaterialIcons name="person" size={30} color={colors.white} />
        </View>
        {user ? (
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.heading, { fontSize: 18 }]}>{user.username}</Text>
            <Text style={[styles.text, { fontSize: 14 }]}>{user.email || "No email"}</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.heading, { fontSize: 18 }]}>Guest</Text>
            <Text style={[styles.text, { fontSize: 14 }]}>Login for more features</Text>
          </View>
        )}
      </View>

      {/* Account Section */}
      <View style={{ marginBottom: 20 }}>
        {user ? (
          <Pressable
            onPress={handleLogout}
            style={[styles.buttonLarge, { flexDirection: "row", width: "100%", justifyContent: "center" }]}
          >
            <MaterialIcons name="logout" size={20} color={colors.white} />
            <Text style={[styles.buttonText, { marginLeft: 8 }]}>Logout</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => navigation.navigate('login')}
            style={[styles.buttonLarge, { flexDirection: "row", width: "100%", justifyContent: "center" }]}
          >
            <MaterialIcons name="login" size={20} color={colors.white} />
            <Text style={[styles.buttonText, { marginLeft: 8 }]}>Login</Text>
          </Pressable>
        )}
      </View>

      {/* Theme Section */}
      <View style={{ marginBottom: 20 }}>
        <Pressable
          onPress={toggle}
          style={[styles.buttonSecondary, { flexDirection: "row", width: "100%", justifyContent: "center", alignItems: "center" }]}
        >
          <MaterialIcons
            name={mode === "dark" ? "light-mode" : "dark-mode"}
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.buttonText, { marginLeft: 8, color: colors.primary }]}>
            {mode === "dark" ? "Light Mode" : "Dark Mode"}
          </Text>
        </Pressable>
      </View>

      {/* Menu Items */}
      <View style={{ marginBottom: 16 }}>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={item.onPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              marginBottom: 4,
            }}
          >
            <MaterialIcons name={item.icon} size={20} color={colors.primary} />
            <Text style={[styles.cardText, { marginLeft: 12 }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Social Media */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 20, paddingHorizontal: 16 }}>
        {socialItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={item.onPress}
            style={{
              alignItems: "center",
              padding: 8,
              flex: 1,
            }}
          >
            <FontAwesome name={item.icon} size={24} color={item.color} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
