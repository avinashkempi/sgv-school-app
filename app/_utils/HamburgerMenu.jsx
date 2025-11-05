import React, { useState, useRef, useEffect } from "react";
import { View, Pressable, Animated, Text } from "react-native";
import { Link } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { ROUTES } from "../../constants/routes";
import { SCHOOL } from "../../constants/basic-info";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from "react-native";
import ThemeToggle from "./ThemeToggle";

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [user, setUser] = useState(null);
  const { colors, styles, mode, toggle: toggleTheme } = useTheme();
  const radioScale = useRef(new Animated.Value(1)).current;

  // Load user on mount
  React.useEffect(() => {
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

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['@auth_token', '@auth_user']);
      setUser(null);
      setIsOpen(false);
    } catch (e) {
      console.warn('Failed to logout', e);
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
    { label: "About", route: ROUTES.ABOUT, icon: "info" },
    { label: "Events", route: ROUTES.EVENTS, icon: "event" },
    { label: "News", route: ROUTES.NEWS, icon: "newspaper" },
    { label: "Contact Us", route: ROUTES.CONTACT, icon: "contact-page" },
  ];

  const socialItems = [
    { label: "YouTube", icon: "youtube-play", color: "#FF0000", onPress: () => handlePress(SCHOOL.socials.youtubeAppUrl, SCHOOL.socials.youtube) },
    { label: "Instagram", icon: "instagram", color: "#C13584", onPress: () => handlePress(SCHOOL.socials.instagramAppUrl, SCHOOL.socials.instagram) },
    { label: "Map", icon: "map-marker", color: colors.primary, onPress: () => handlePress(SCHOOL.mapAppUrl, SCHOOL.mapUrl) },
  ];

  const socialAnimations = socialItems.map(() => useRef(new Animated.Value(0)).current);

  // Animate social icons on menu open
  useEffect(() => {
    if (isOpen) {
      const animations = socialAnimations.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 100,
          delay: index * 100,
          useNativeDriver: true,
        })
      );
      Animated.stagger(100, animations).start();
    } else {
      socialAnimations.forEach(anim => anim.setValue(0));
    }
  }, [isOpen]);

  // Animate radio button on theme change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(radioScale, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(radioScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  const menuTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  const menuOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={{ position: "absolute", top: 10, left: 10, zIndex: 1000 }}>
      <Pressable onPress={toggleMenu} style={{ padding: 10 }}>
        <View style={{ width: 24, height: 18, justifyContent: "space-between" }}>
          <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 1.5 }} />
          <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 1.5 }} />
          <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 1.5 }} />
        </View>
      </Pressable>

      {isOpen && (
        <>
          {/* Backdrop to close menu on outside click */}
          <Pressable
            style={{
              position: "absolute",
              top: -60,
              left: -20,
              width: "100%",
              height: "100%",
              zIndex: -1,
            }}
            onPress={toggleMenu}
          />
          <Animated.View
            style={{
              position: "absolute",
              top: 50,
              left: 0,
              width: 200,
              backgroundColor: colors.background,
              borderRadius: 8,
              padding: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              transform: [{ translateY: menuTranslateY }],
              opacity: menuOpacity,
            }}
          >
          {/* User greeting */}
          {user && (
            <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[styles.cardText, { fontWeight: 'bold' }]}>Hi, {user.username}</Text>
            </View>
          )}

          {/* Navigation items */}
          {menuItems.map((item, index) => (
            <Link key={index} href={item.route} asChild>
              <Pressable
                onPress={() => setIsOpen(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                {item.icon === "newspaper" ? (
                  <MaterialCommunityIcons name={item.icon} size={20} color={colors.primary} />
                ) : (
                  <MaterialIcons name={item.icon} size={20} color={colors.primary} />
                )}
                <Text style={[styles.cardText, { marginLeft: 10 }]}>{item.label}</Text>
              </Pressable>
            </Link>
          ))}

          {/* Auth item */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }}>
            {user ? (
              <Pressable
                onPress={handleLogout}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <MaterialIcons name="logout" size={20} color={colors.primary} />
                <Text style={[styles.cardText, { marginLeft: 10 }]}>Logout</Text>
              </Pressable>
            ) : (
              <Link href="/login" asChild>
                <Pressable
                  onPress={() => setIsOpen(false)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <MaterialIcons name="login" size={20} color={colors.primary} />
                  <Text style={[styles.cardText, { marginLeft: 10 }]}>Login / Signup</Text>
                </Pressable>
              </Link>
            )}
          </View>

          {/* Theme Toggle */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={[styles.cardText, { fontWeight: 'bold' }]}>Dark Mode</Text>
              <Pressable onPress={toggleTheme} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.cardText, { marginRight: 8 }]}>{mode === "dark" ? "On" : "Off"}</Text>
                <Animated.View style={{ transform: [{ scale: radioScale }] }}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: mode === "dark" ? colors.primary : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {mode === "dark" && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.background }} />}
                  </View>
                </Animated.View>
              </Pressable>
            </View>
          </View>

          {/* Social media */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 8, paddingHorizontal: 12 }}>
              {socialItems.map((item, index) => (
                <Animated.View
                  key={index}
                  style={{
                    alignItems: "center",
                    padding: 8,
                    opacity: socialAnimations[index],
                    transform: [{ scale: socialAnimations[index].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                  }}
                >
                  <Pressable onPress={() => { item.onPress(); setIsOpen(false); }}>
                    <FontAwesome name={item.icon} size={20} color={item.color} />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </View>
        </Animated.View>
        </>
      )}
    </View>
  );
};

export default HamburgerMenu;
