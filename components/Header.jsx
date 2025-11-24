import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../theme";

const Header = ({ title, subtitle, variant = "default" }) => {
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
    <View style={{ marginBottom: 24 }}>
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
  );
};

export default React.memo(Header);
