import React, { useState, } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../utils/storage";
import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import { formatDate } from "../utils/date";

import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";

import Card from "../components/Card";
import Button from "../components/Button";

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
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.contentPaddingBottom, { paddingHorizontal: 16, paddingTop: 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <View style={{ alignItems: "center", marginTop: 20, marginBottom: 40 }}>
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          elevation: 5,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        }}>
          <MaterialIcons name="person" size={50} color={colors.primary} />
        </View>

        {user ? (
          <>
            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 8 }}>
              {user.name}
            </Text>

            {user.role && (
              <View style={{
                backgroundColor: colors.primaryContainer,
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: 20,
                marginTop: 4,
                marginBottom: 24
              }}>
                <Text style={{ color: colors.onPrimaryContainer, fontFamily: "DMSans-Bold", fontSize: 12, textTransform: 'uppercase' }}>
                  {user.role}
                </Text>
              </View>
            )}

            <View style={{ width: '100%', paddingHorizontal: 4 }}>
              <Card variant="filled" style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 16 }}>CONTACT INFO</Text>

                {user.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ width: 32, alignItems: 'center' }}><MaterialIcons name="phone" size={20} color={colors.primary} /></View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface, marginLeft: 8 }}>{user.phone}</Text>
                  </View>
                )}

                {user.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 32, alignItems: 'center' }}><MaterialIcons name="email" size={20} color={colors.primary} /></View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface, marginLeft: 8 }}>{user.email}</Text>
                  </View>
                )}
              </Card>

              {(user.role === 'student' || user.role === 'class teacher' || user.role === 'staff') && (
                <Card variant="filled" style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 16 }}>
                    {user.role === 'student' ? 'STUDENT DETAILS' : 'STAFF DETAILS'}
                  </Text>

                  {user.role === 'student' && (
                    <>
                      {user.guardianName && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Guardian Name</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.guardianName}</Text>
                        </View>
                      )}
                      {user.guardianPhone && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Guardian Phone</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.guardianPhone}</Text>
                        </View>
                      )}
                      {user.admissionDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Admission Date</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.admissionDate)}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {(user.role === 'class teacher' || user.role === 'staff') && (
                    <>
                      {user.designation && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Designation</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.designation}</Text>
                        </View>
                      )}
                      {user.joiningDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Joining Date</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.joiningDate)}</Text>
                        </View>
                      )}
                    </>
                  )}
                </Card>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 4 }}>
              Guest User
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.onSurfaceVariant }}>
              Login to access all features
            </Text>
          </>
        )}
      </View>

      <View>
        {user ? (
          <Button
            variant="filled"
            onPress={handleLogout}
            style={{ backgroundColor: colors.errorContainer }}
            textStyle={{ color: colors.onErrorContainer }}
            icon="logout"
          >
            Log Out
          </Button>
        ) : (
          <Button
            variant="filled"
            onPress={handleLogin}
            icon="login"
          >
            Log In
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
