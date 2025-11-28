import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";

const Header = ({ title, subtitle, variant = "default" }) => {
  const router = useRouter();
  const { colors, styles } = useTheme();

  // Variant "welcome" is for home page style
  if (variant === "welcome") {
    return (
      <View style={{ marginTop: 10, marginBottom: 32 }}>
        <Text style={{
          fontSize: 16,
          color: colors.textSecondary,
          fontFamily: "DMSans-Medium",
          marginBottom: 8,
          letterSpacing: 0.5,
          textTransform: 'uppercase'
        }}>
          Welcome to
        </Text>
        <Text style={{
          fontSize: 36,
          color: colors.textPrimary,
          fontFamily: "DMSans-Bold",
          letterSpacing: -1.5,
          lineHeight: 42
        }}>
          {title}
        </Text>
      </View>
    );
  }

  // Default variant - minimalist header with optional subtitle
  return (
    <View style={{ marginBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text style={{
          fontSize: 28,
          fontFamily: "DMSans-Bold",
          color: colors.textPrimary,
          letterSpacing: -1
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{
            fontSize: 16,
            color: colors.textSecondary,
            marginTop: 4,
            fontFamily: "DMSans-Regular"
          }}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Notification Bell */}
      <Pressable
        onPress={() => router.push("/notifications")}
        style={({ pressed }) => ({
          padding: 10,
          backgroundColor: colors.cardBackground,
          borderRadius: 14,
          opacity: pressed ? 0.7 : 1,
          borderWidth: 1,
          borderColor: colors.border,
          ...styles.shadow
        })}
      >
        <MaterialIcons name="notifications-none" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
};

export default React.memo(Header);
