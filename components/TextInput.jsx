import React, { useState, useCallback } from "react";
import { View, TextInput as RNTextInput, Text, Pressable, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "../theme";

/**
 * Material 3 Modern Text Input
 * 
 * Variants:
 * - outlined: Crisp 1.5px border surround with rounded corners (default)
 * - filled: Subtle container background with bottom indicator
 * 
 * Props:
 * - label: Field label text
 * - helperText: Non-error assistive guidance text
 * - error: Error message text (renders in error tone)
 * - icon: Left MaterialIcons name
 * - rightIcon: Right MaterialIcons name (or action toggle)
 * - onRightIconPress: Handler for right icon click
 */
const TextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  variant = "outlined",
  icon,
  rightIcon,
  onRightIconPress,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  style,
  inputStyle,
  containerStyle,
  labelStyle,
  iconColor,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors, styles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  }, [onFocus]);

  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  }, [onBlur]);

  const handleRightIconPress = useCallback((e) => {
    if (onRightIconPress) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics fallback
      }
      onRightIconPress(e);
    }
  }, [onRightIconPress]);

  // Determine Container Styles
  const getContainerStyles = () => {
    const borderColor = error
      ? colors.error
      : isFocused
      ? colors.primary
      : colors.outlineVariant || colors.border || "#E5E7EB";

    // Only apply focus box-shadow on Web to avoid native layout shifts/blurs on iOS/Android
    const focusGlow =
      isFocused && !error && Platform.OS === "web"
        ? {
            boxShadow: `0 0 0 3px ${colors.brandOrangeContainer || "rgba(255, 94, 28, 0.12)"}`,
          }
        : {};

    if (variant === "filled") {
      return {
        backgroundColor: colors.surfaceContainerHighest || "#E8EAEE",
        borderBottomWidth: 2,
        borderBottomColor: borderColor,
        borderTopLeftRadius: RADIUS.md || 12,
        borderTopRightRadius: RADIUS.md || 12,
        paddingHorizontal: SPACING.lg || 16,
        ...focusGlow,
      };
    }

    // Outlined - keep borderWidth constant at 1.5 to prevent layout recalculation and focus drops
    return {
      backgroundColor: colors.surface || "#FFFFFF",
      borderWidth: 1.5,
      borderColor: borderColor,
      borderRadius: RADIUS.md || 12,
      paddingHorizontal: SPACING.lg || 16,
      ...focusGlow,
    };
  };

  const activeIconColor =
    iconColor ||
    (error
      ? colors.error
      : isFocused
      ? colors.primary
      : colors.onSurfaceVariant || colors.textSecondary);

  return (
    <View style={[{ width: "100%" }, containerStyle]}>
      {label && (
        <Text
          style={[
            styles?.labelMedium,
            {
              color: error
                ? colors.error
                : isFocused
                ? colors.primary
                : colors.textPrimary || colors.onSurface,
              marginBottom: SPACING.xs || 6,
              fontFamily: FONTS.semiBold || FONTS.medium,
              fontSize: FONT_SIZES.xs || 12,
              letterSpacing: 0.2,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            height: 48,
          },
          getContainerStyles(),
          style,
        ]}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={ICON_SIZES.md || 20}
            color={activeIconColor}
            style={{ marginRight: SPACING.sm || 10 }}
          />
        )}

        <RNTextInput
          style={[
            {
              flex: 1,
              fontSize: FONT_SIZES.sm || 14,
              fontFamily: FONTS.regular,
              color: colors.onSurface,
              height: "100%",
            },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted || colors.onSurfaceVariant + "80"}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.primary}
          {...props}
        />

        {rightIcon && (
          <Pressable
            accessibilityRole="button"
            onPress={handleRightIconPress}
            hitSlop={8}
            style={{ padding: SPACING.xs || 4 }}
          >
            <MaterialIcons
              name={rightIcon}
              size={ICON_SIZES.md || 20}
              color={activeIconColor}
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: SPACING.xs || 4, marginLeft: 2 }}>
          <MaterialIcons name="error-outline" size={13} color={colors.error} style={{ marginRight: 4 }} />
          <Text
            style={[
              styles?.caption,
              {
                color: colors.error,
                fontFamily: FONTS.regular,
                fontSize: FONT_SIZES.xs || 12,
              },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : helperText ? (
        <Text
          style={[
            styles?.caption,
            {
              color: colors.textSecondary || colors.onSurfaceVariant,
              marginTop: SPACING.xs || 4,
              marginLeft: 2,
              fontFamily: FONTS.regular,
              fontSize: FONT_SIZES.xs || 12,
            },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

export default React.memo(TextInput);
