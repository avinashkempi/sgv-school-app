import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import { useNotifications } from "../hooks/useNotifications";
import YearSelector from "./academic-year/YearSelector";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";

import { useAcademicYear } from "../context/AcademicYearContext";
import { useLabel } from "../context/LabelsContext";

const Header = ({ title, subtitle, variant = "default", showBack = false }) => {
  const router = useRouter();
  const { colors, styles } = useTheme();
  const { unreadCount } = useNotifications();
  const { selectedYear } = useAcademicYear();
  const { t } = useLabel();

  // Fetch user to check if Super Admin for Time Travel UI
  const { data: userData } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      staleTime: Infinity,
      select: (data) => data?.user,
    }
  );

  const isSuperAdmin = userData?.role === 'super admin';

  // "welcome" is effectively a Large Top App Bar
  if (variant === "welcome") {
    return (
      <View style={{
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 4,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <View style={{ flex: 1 }}>
          {isSuperAdmin ? (
            <View style={{ marginBottom: 12 }}>
              <YearSelector />
            </View>
          ) : (
            selectedYear && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: selectedYear.isActive ? colors.primaryContainer : colors.errorContainer,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: selectedYear.isActive ? colors.primary : colors.error,
                marginBottom: 12,
                alignSelf: 'flex-start'
              }}>
                <MaterialIcons
                  name={selectedYear.status === 'archived' ? 'history' : 'calendar-today'}
                  size={12}
                  color={selectedYear.isActive ? colors.onPrimaryContainer : colors.onErrorContainer}
                />
                <Text style={{
                  fontSize: 11,
                  fontFamily: 'DMSans-Bold',
                  marginLeft: 4,
                  color: selectedYear.isActive ? colors.onPrimaryContainer : colors.onErrorContainer
                }}>
                  {selectedYear.name}
                </Text>
              </View>
            )
          )}
          <Text style={[styles.labelLarge, {
            color: colors.onSurfaceVariant,
            marginBottom: 8,
            textTransform: 'uppercase'
          }]}>
            {t('header.welcomeTo', 'Welcome to')}
          </Text>
          <Text style={[styles.headlineLarge, { color: colors.onBackground }]}>
            {title}
          </Text>
        </View>

        {/* Notification Bell */}
        <Pressable
          accessibilityLabel={t('header.notifications', 'Notifications')}
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => ({
            padding: 12,
            marginTop: 4,
            marginLeft: 8,
            backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
            borderRadius: 24, // Circle
            position: 'relative'
          })}
        >
          <MaterialIcons name={unreadCount > 0 ? "notifications-active" : "notifications-none"} size={26} color={unreadCount > 0 ? colors.primary : colors.onSurfaceVariant} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              right: 8,
              top: 8,
              backgroundColor: colors.error,
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: colors.background
            }}>
              <Text style={{ color: colors.onError, fontSize: 10, fontFamily: 'DMSans-Bold' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  }

  // Default variant - standard Center/Small Top App Bar
  return (
    <View style={{ marginBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      {showBack && (
        <Pressable
          accessibilityLabel={t('header.goBack', 'Go back')}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          style={({ pressed }) => ({
            marginRight: 16,
            padding: 8,
            marginLeft: -8,
            backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
            borderRadius: 24,
          })}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
      )}

      <View style={{ flex: 1, paddingRight: 16 }}>
        {isSuperAdmin ? (
          <View style={{ marginBottom: 4 }}>
            <YearSelector />
          </View>
        ) : (
          selectedYear && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selectedYear.isActive ? colors.primaryContainer : colors.errorContainer,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selectedYear.isActive ? colors.primary : colors.error,
              marginBottom: 4,
              alignSelf: 'flex-start'
            }}>
              <MaterialIcons
                name={selectedYear.status === 'archived' ? 'history' : 'calendar-today'}
                size={10}
                color={selectedYear.isActive ? colors.onPrimaryContainer : colors.onErrorContainer}
              />
              <Text style={{
                fontSize: 10,
                fontFamily: 'DMSans-Bold',
                marginLeft: 4,
                color: selectedYear.isActive ? colors.onPrimaryContainer : colors.onErrorContainer
              }}>
                {selectedYear.name}
              </Text>
            </View>
          )
        )}
        <Text style={[styles.titleLarge, { color: colors.onBackground }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.titleSmall, {
            color: colors.onSurfaceVariant,
            marginTop: 2
          }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Notification Bell (Optional in standard headers, but consistent) */}
      <Pressable
        onPress={() => router.push("/notifications")}
        style={({ pressed }) => ({
          padding: 8,
          backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
          borderRadius: 24,
          position: 'relative'
        })}
      >
        <MaterialIcons name={unreadCount > 0 ? "notifications-active" : "notifications-none"} size={26} color={unreadCount > 0 ? colors.primary : colors.onSurfaceVariant} />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            right: 4,
            top: 4,
            backgroundColor: colors.error,
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.background
          }}>
            <Text style={{ color: colors.onError, fontSize: 10, fontFamily: 'DMSans-Bold' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default React.memo(Header);
