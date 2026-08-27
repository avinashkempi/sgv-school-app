import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, LETTER_SPACINGS } from "../../theme";
import {
  getAvatarUrl,
  getBlurPlaceholderUrl,
} from "../../utils/cloudinaryUpload";
import { formatUserName } from "../../utils/userFormatters";

/**
 * Extracts 1-2 initials from a user's name.
 * e.g. "Avinash Kempi" -> "AK", "John" -> "J", "" -> "?"
 */
const getInitials = (name) => {
  const formatted = formatUserName(name);
  if (!formatted) return "?";
  const parts = formatted.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Deterministic background color generator for initials based on name or role.
 */
const getFallbackBgColor = (role, name, colors) => {
  if (role) {
    switch (role.toLowerCase()) {
      case "super admin":
      case "admin":
        return colors.errorContainer || "#FFEBEE";
      case "teacher":
        return colors.primaryContainer || "#E3F2FD";
      case "staff":
      case "support_staff":
        return colors.secondaryContainer || "#E8F5E9";
      case "student":
        return colors.tertiaryContainer || "#FFF3E0";
      default:
        break;
    }
  }

  // Generate subtle pastel hue based on name hash if no role or default
  if (!name) return colors.surfaceContainerHigh || "#ECEFF1";

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [
    "#E8EAF6", // Indigo-50
    "#E1F5FE", // Light Blue-50
    "#E0F2F1", // Teal-50
    "#F1F8E9", // Light Green-50
    "#FFF8E1", // Amber-50
    "#FBE9E7", // Deep Orange-50
    "#F3E5F5", // Purple-50
  ];
  return hues[Math.abs(hash) % hues.length];
};

const getFallbackTextColor = (role, name, colors) => {
  if (role) {
    switch (role.toLowerCase()) {
      case "super admin":
      case "admin":
        return colors.error || "#D32F2F";
      case "teacher":
        return colors.primary || "#1976D2";
      case "staff":
      case "support_staff":
        return colors.secondary || "#388E3C";
      case "student":
        return colors.tertiary || "#F57C00";
      default:
        break;
    }
  }
  return colors.primary || "#1976D2";
};

/**
 * Reusable User Avatar Component
 *
 * @param {Object} props
 * @param {string} [props.photoUrl] - Cloudinary or remote image URL
 * @param {string} [props.name] - User's full name for fallback initials
 * @param {string} [props.role] - User role for semantic tinting
 * @param {number} [props.size=40] - Diameter / dimensions in px
 * @param {'circle'|'rounded'} [props.shape='circle'] - Avatar shape
 * @param {boolean} [props.showBorder=false] - Whether to show border ring
 * @param {string} [props.borderColor] - Custom border color
 * @param {Function} [props.onPress] - Optional press handler
 * @param {Object} [props.style] - Additional container styles
 * @param {Object} [props.textStyle] - Additional initial text styles
 */
const UserAvatar = ({
  photoUrl,
  name = "",
  role,
  size = 40,
  shape = "circle",
  showBorder = false,
  borderColor,
  onPress,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);

  const borderRadius = shape === "circle" ? size / 2 : Math.max(8, size / 4);
  const fontSize = Math.max(10, Math.round(size * 0.38));

  // Face-cropped optimized Cloudinary URL
  const optimizedUrl = useMemo(() => {
    if (!photoUrl || imageError) return null;
    return getAvatarUrl(photoUrl, Math.max(80, Math.round(size * 2)));
  }, [photoUrl, size, imageError]);

  const blurPlaceholder = useMemo(() => {
    if (!optimizedUrl) return null;
    return getBlurPlaceholderUrl(optimizedUrl);
  }, [optimizedUrl]);

  const initials = useMemo(() => getInitials(name), [name]);
  const fallbackBg = useMemo(
    () => getFallbackBgColor(role, name, colors),
    [role, name, colors]
  );
  const fallbackText = useMemo(
    () => getFallbackTextColor(role, name, colors),
    [role, name, colors]
  );

  const isSchoolIdentity = useMemo(() => {
    const r = role ? String(role).toLowerCase().trim() : "";
    const n = name ? String(name).toLowerCase().trim() : "";
    return (
      r === "school" ||
      n === "sgv school" ||
      n === "sgv official" ||
      n === "shri guru vidya" ||
      n === "shri guru vidya english medium school" ||
      n.includes("sgv school") ||
      n.includes("shri guru vidya")
    );
  }, [role, name]);

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius,
      backgroundColor: isSchoolIdentity && !optimizedUrl ? (colors.surfaceContainerLowest || "#ffffff") : fallbackBg,
      borderWidth: showBorder || (isSchoolIdentity && !optimizedUrl) ? 1.5 : 0,
      borderColor: borderColor || (isSchoolIdentity && !optimizedUrl ? (colors.outlineVariant || "rgba(0,0,0,0.08)") : (colors.border || "rgba(0,0,0,0.08)")),
    },
    style,
  ];

  const content = (
    <View style={containerStyle}>
      {optimizedUrl ? (
        <Image
          source={{ uri: optimizedUrl }}
          placeholder={blurPlaceholder ? { uri: blurPlaceholder } : undefined}
          style={{ width: "100%", height: "100%", borderRadius }}
          contentFit="cover"
          transition={150}
          onError={() => setImageError(true)}
        />
      ) : isSchoolIdentity ? (
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: "88%", height: "88%", borderRadius: borderRadius * 0.88 }}
          contentFit="contain"
        />
      ) : initials !== "?" ? (
        <Text
          style={[
            styles.initialsText,
            {
              fontSize,
              color: fallbackText,
            },
            textStyle,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {initials}
        </Text>
      ) : (
        <MaterialIcons
          name="person"
          size={Math.round(size * 0.55)}
          color={fallbackText}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        hitSlop={6}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  initialsText: {
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.xs,
    textAlign: "center",
    includeFontPadding: false,
  },
});

export default React.memo(UserAvatar);
