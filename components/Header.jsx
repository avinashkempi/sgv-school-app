import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";

const Header = ({ title, subtitle, variant = "default" }) => {
  const router = useRouter();
  const { colors } = useTheme();

  // Variant "welcome" is for home page style
  if (variant === "welcome") {
    return (
      <View style={{ marginTop: 20, marginBottom: 32 }}>
        <Text style={{
          fontSize: 16,
          color: colors.textSecondary,
          fontFamily: "DMSans-Medium",
          marginBottom: 4
        }}>
          Welcome to
        </Text>
        <Text style={{
          fontSize: 32,
          color: colors.textPrimary,
          fontFamily: "DMSans-Bold",
          letterSpacing: -1
        }}>
          {title}
        </Text>
      </View>
    );
  }

  // Default variant - minimalist header with optional subtitle
  return (
    <View style={{ marginBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 28,
          fontWeight: "700",
          color: colors.textPrimary,
          letterSpacing: -0.5
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{
            fontSize: 15,
            color: colors.textSecondary,
            marginTop: 4
          }}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Notification Bell */}
      <Pressable
        onPress={() => router.push("/notifications")}
        style={({ pressed }) => ({
          padding: 8,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          opacity: pressed ? 0.7 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        })}
      >
        <MaterialIcons name="notifications-none" size={24} color={colors.textPrimary} />
        {/* We could add a badge here if we had the count */}
      </Pressable>
    </View>
  );
};

export default React.memo(Header);
