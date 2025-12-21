import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import { useNotifications } from "../hooks/useNotifications";

const Header = ({ title, subtitle, variant = "default", showBack = false }) => {
  const router = useRouter();
  const { colors, styles } = useTheme();
  const { unreadCount } = useNotifications();

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
          <Text style={{
            fontSize: 14,
            color: colors.onSurfaceVariant,
            fontFamily: "DMSans-Medium",
            marginBottom: 8,
            letterSpacing: 0.25,
            textTransform: 'uppercase'
          }}>
            Welcome to
          </Text>
          <Text style={{
            fontSize: 32, // Headline Medium size roughly
            color: colors.onBackground,
            fontFamily: "DMSans-Bold",
            letterSpacing: 0,
            lineHeight: 40
          }}>
            {title}
          </Text>
        </View>

        {/* Notification Bell */}
        <Pressable
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
        <Text style={{
          fontSize: 22,
          fontFamily: "DMSans-Bold", // Title Large
          color: colors.onBackground,
          letterSpacing: 0
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{
            fontSize: 14,
            color: colors.onSurfaceVariant,
            marginTop: 2,
            fontFamily: "DMSans-Medium", // Title Small
            letterSpacing: 0.1
          }}>
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
            minWidth: 16,
            height: 16,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.background
          }}>
            <Text style={{ color: colors.onError, fontSize: 8, fontFamily: 'DMSans-Bold' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default React.memo(Header);
