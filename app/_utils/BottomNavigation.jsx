import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Dimensions, Easing } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { ROUTES } from "../../constants/routes";
import { BlurView } from "expo-blur";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get("window");

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, styles } = useTheme();
  const [activeTab, setActiveTab] = useState(ROUTES.HOME);
  const [user, setUser] = useState(null);

  // Animation refs
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef(0);

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
      activeIcon: "home-filled",
    },
    {
      route: ROUTES.EVENTS,
      label: "Events",
      icon: "event",
      activeIcon: "event-available",
    },
    {
      route: ROUTES.NEWS,
      label: "News",
      icon: "newspaper",
      activeIcon: "newspaper-variant",
    },
    {
      route: ROUTES.PROFILE,
      label: "Profile",
      icon: "menu",
      activeIcon: "menu-open",
    },
    // Show Admin menu if user role includes 'admin'
    ...(user && user.role && user.role.toLowerCase().includes('admin') ? [{
      route: ROUTES.ADMIN,
      label: "Admin",
      icon: "admin-panel-settings",
      activeIcon: "admin-panel-settings",
    }] : []),
  ];

  const handleTabPress = (route, index) => {
    if (route === activeTab) return; // Prevent animation if same tab

    setActiveTab(route);

    // Start ripple animation
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Start glow animation
    glowAnim.setValue(0);
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    activeIndexRef.current = index;
    router.push(route);
  };

  const getActiveIndex = () => {
    return navigationItems.findIndex(item => item.route === activeTab);
  };

  const activeIndex = getActiveIndex();
  const itemWidth = width / navigationItems.length;

  return (
    <View style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "transparent",
      paddingHorizontal: 16,
      paddingBottom: 8,
    }}>
      <BlurView
        intensity={95}
        tint={colors.mode === "dark" ? "dark" : "light"}
        style={{
          flexDirection: "column",
          marginBottom: 20,
          paddingBottom: 12, // Account for safe area
          paddingTop: 12,
          paddingHorizontal: 16,
          borderRadius: 50,
          shadowColor: colors.mode === "dark" ? "#001122" : "#4A90E2",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: colors.mode === "dark" ? 0.3 : 0.2,
          shadowRadius: 12,
          elevation: 5,
          overflow: "hidden",
        }}
      >
        {/* Ripple effect overlay */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.primary,
            opacity: rippleAnim.interpolate({
              inputRange: [0, 0.3, 0.6, 1],
              outputRange: [0, 0.08, 0.04, 0],
            }),
            transform: [{
              scale: rippleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1.2],
              }),
            }],
            borderRadius: 20,
          }}
        />

        {/* Icons Row */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingBottom: 4,
        }}>
          {navigationItems.map((item, index) => {
            const isActive = activeTab === item.route;
            return (
              <Pressable
                key={index}
                onPress={() => handleTabPress(item.route, index)}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                  {item.icon === "newspaper" ? (
                    <MaterialCommunityIcons
                      name={isActive ? item.activeIcon : item.icon}
                      size={26}
                      color={isActive ? colors.primary : colors.mode === "dark" ? colors.white : colors.textSecondary}
                    />
                  ) : (
                    <MaterialIcons
                      name={isActive ? item.activeIcon : item.icon}
                      size={26}
                      color={isActive ? colors.primary : colors.mode === "dark" ? colors.white : colors.textSecondary}
                    />
                  )}
                </Pressable>
            );
          })}
        </View>

        {/* Labels Row */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: 8,
        }}>
          {navigationItems.map((item, index) => {
            const isActive = activeTab === item.route;
            return (
              <View
                key={index}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: width / 5 - 32,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: styles.cardText.fontFamily,
                    color: isActive ? colors.primary : colors.mode === "dark" ? colors.white : colors.textSecondary,
                    textAlign: "center",
                    fontWeight: isActive ? "600" : "400",
                    opacity: isActive ? 1 : 0.8,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
