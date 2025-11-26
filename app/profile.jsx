import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import { formatDate } from "../utils/date";

export default function ProfileScreen() {
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@auth_user');
      const token = await AsyncStorage.getItem('@auth_token');

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          if (token) {
            try {
              const apiConfig = require('../config/apiConfig').default;
              const apiFetch = require('../utils/apiFetch').default;

              const response = await apiFetch(`${apiConfig.baseUrl}/users/me`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                const freshUserData = await response.json();
                await AsyncStorage.setItem('@auth_user', JSON.stringify(freshUserData));
                setUser(freshUserData);
              }
            } catch (err) {
              console.log("Failed to refresh profile:", err);
            }
          }
        } catch (parseError) {
          console.error("Failed to parse stored user:", parseError);
          await AsyncStorage.removeItem('@auth_user');
        }
      }
    } catch (e) {
      console.warn('Failed to load user', e);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
      setUser(null);
      const { router } = require('expo-router');
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      showToast('Failed to logout. Please try again.', 'error');
    }
  };

  const handleLogin = () => {
    const { router } = require('expo-router');
    router.replace('/login');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPaddingBottom}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
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
              {user.name}
            </Text>

            {user.role && (
              <View style={{
                backgroundColor: colors.primary + '15',
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: 20,
                marginTop: 4,
                marginBottom: 16
              }}>
                <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold", fontSize: 12, textTransform: 'uppercase' }}>
                  {user.role}
                </Text>
              </View>
            )}

            <View style={{ width: '100%', paddingHorizontal: 20 }}>
              <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.textSecondary, marginBottom: 12 }}>CONTACT INFO</Text>

                {user.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ width: 32, alignItems: 'center' }}><MaterialIcons name="phone" size={20} color={colors.primary} /></View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary, marginLeft: 8 }}>{user.phone}</Text>
                  </View>
                )}

                {user.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 32, alignItems: 'center' }}><MaterialIcons name="email" size={20} color={colors.primary} /></View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary, marginLeft: 8 }}>{user.email}</Text>
                  </View>
                )}
              </View>

              {(user.role === 'student' || user.role === 'class teacher' || user.role === 'staff') && (
                <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.textSecondary, marginBottom: 12 }}>
                    {user.role === 'student' ? 'STUDENT DETAILS' : 'STAFF DETAILS'}
                  </Text>

                  {user.role === 'student' && (
                    <>
                      {user.guardianName && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Guardian Name</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>{user.guardianName}</Text>
                        </View>
                      )}
                      {user.guardianPhone && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Guardian Phone</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>{user.guardianPhone}</Text>
                        </View>
                      )}
                      {user.admissionDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Admission Date</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>{formatDate(user.admissionDate)}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {(user.role === 'class teacher' || user.role === 'staff') && (
                    <>
                      {user.designation && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Designation</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>{user.designation}</Text>
                        </View>
                      )}
                      {user.joiningDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Joining Date</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>{formatDate(user.joiningDate)}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
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

      <View style={{ paddingHorizontal: 20 }}>
        <Pressable
          onPress={user ? handleLogout : handleLogin}
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
      </View>

      <Text style={{ textAlign: 'center', marginTop: 24, color: colors.textSecondary, fontSize: 12 }}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}
