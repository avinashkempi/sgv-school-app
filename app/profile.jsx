import React, { useState, } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../utils/storage";
import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import { formatDate } from "../utils/date";

import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";

export default function ProfileScreen() {
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const { data: user, refetch, isLoading } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      staleTime: Infinity,
      select: (data) => data.user
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await storage.removeItem('@auth_token');
      await storage.removeItem('@auth_user');
      const { queryClient } = require('../utils/queryClient');
      queryClient.clear();
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
            marginBottom: 16,
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
    </ScrollView>
  );
}
