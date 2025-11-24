import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { ROUTES } from "../constants/routes";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState(ROUTES.HOME);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  // Load user on mount and when pathname changes
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@auth_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn('Failed to load user', e);
        setUser(null);
      }
    };
    loadUser();
  }, [pathname]);

  const navigationItems = [
    {
      route: ROUTES.HOME,
      label: "Home",
      icon: "home",
    },
    {
      route: ROUTES.EVENTS,
      label: "Events",
      icon: "event",
    },
    {
      route: ROUTES.NEWS,
      label: "News",
      icon: "article",
    },
    {
      route: ROUTES.PROFILE,
      label: "Menu",
      icon: "menu",
    },
    // Show Admin menu if user role includes 'admin'
    ...(user && user.role && user.role.toLowerCase().includes('admin') ? [{
      route: ROUTES.ADMIN,
      label: "Admin",
      icon: "admin-panel-settings",
    }] : []),
  ];

  const handleTabPress = (route) => {
    if (route === activeTab) return;
    setActiveTab(route);
    router.push(route);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      {/* Top border */}
      <View style={[styles.topBorder, { backgroundColor: colors.border }]} />

      {navigationItems.map((item, index) => {
        const isActive = activeTab === item.route;
        return (
          <Pressable
            key={item.route}
            onPress={() => handleTabPress(item.route)}
            style={({ pressed }) => [
              styles.tabItem,
              { opacity: pressed ? 0.6 : 1 }
            ]}
          >
            {/* Active indicator */}
            {isActive && (
              <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
            )}

            {/* Icon */}
            <MaterialIcons
              name={item.icon}
              size={24}
              color={isActive ? colors.primary : colors.textSecondary}
              style={{ marginBottom: 4 }}
            />

            {/* Label */}
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontFamily: isActive ? "DMSans-Bold" : "DMSans-Medium",
                }
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
