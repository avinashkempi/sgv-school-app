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
  rightIconAccessibilityLabel,
  accessibilityLabel,
  accessibilityHint,
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
  const { colors, styles, mode } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const isDark = mode === "dark";

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

  // Determine Container Styles (Uber black appearance with Material 3 precision)
  const getContainerStyles = () => {
    const defaultBorderColor =
      colors.fieldBorder ||
      (isDark ? "#2C2C32" : colors.outlineVariant || colors.border || "#E5E7EB");

    const borderColor = error
      ? colors.error
      : isFocused
      ? colors.fieldBorderFocused || colors.primary
      : defaultBorderColor;

    // Only apply focus box-shadow on Web to avoid native layout shifts/blurs on iOS/Android
    const focusGlow =
      isFocused && !error && Platform.OS === "web"
        ? {
            boxShadow: `0 0 0 3px ${
              isDark
                ? "rgba(208, 188, 255, 0.22)"
                : colors.primaryContainer || "rgba(79, 70, 229, 0.15)"
            }`,
          }
        : {};

    const fieldBg =
      colors.fieldBackground ||
      (isDark ? "#000000" : colors.surface || "#FFFFFF");

    if (variant === "filled") {
      return {
        backgroundColor: isDark ? fieldBg : (colors.surfaceContainerHighest || "#E8EAEE"),
        borderWidth: isDark ? 1.5 : 0,
        borderColor: borderColor,
        borderBottomWidth: 2,
        borderBottomColor: borderColor,
        borderTopLeftRadius: RADIUS.md || 12,
        borderTopRightRadius: RADIUS.md || 12,
        borderRadius: isDark ? (RADIUS.md || 12) : 0,
        paddingHorizontal: SPACING.lg || 16,
        ...focusGlow,
      };
    }

    // Outlined - Uber black appearance: deep solid black surface with clean 1.5px border
    return {
      backgroundColor: fieldBg,
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
              color: colors.textPrimary || colors.onSurface || (isDark ? "#FFFFFF" : "#1D1B20"),
              height: "100%",
            },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            colors.placeholder ||
            colors.textMuted ||
            (isDark ? "#71717A" : colors.onSurfaceVariant + "80")
          }
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.primary}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={error || helperText || accessibilityHint}
          {...props}
        />

        {rightIcon && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              rightIconAccessibilityLabel ||
              (rightIcon === "visibility"
                ? "Show password"
                : rightIcon === "visibility-off"
                ? "Hide password"
                : `${label || "Field"} action`)
            }
            onPress={handleRightIconPress}
            hitSlop={8}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
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
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "center", marginTop: SPACING.xs || 4, marginLeft: 2 }}
        >
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
              color: colors.onSurfaceVariant,
              marginTop: SPACING.xs || 4,
              marginLeft: 2,
              fontFamily: FONTS.regular,
              fontSize: FONT_SIZES.xs || 12,
              fontStyle: "italic",
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
