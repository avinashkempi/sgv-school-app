import React, { useState } from "react";
import { View, TextInput as RNTextInput, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
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
  ...props
}) => {
  const { colors, styles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // Determine Container Styles
  const getContainerStyles = () => {
    const borderColor = error
      ? colors.error
      : isFocused
      ? colors.primary
      : colors.outlineVariant;

    if (variant === "filled") {
      return {
        backgroundColor: colors.surfaceContainerHighest,
        borderBottomWidth: 1.5,
        borderBottomColor: borderColor,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        paddingHorizontal: SPACING.lg,
      };
    }

    // Outlined
    return {
      backgroundColor: "transparent",
      borderWidth: 1, // Thinner minimalist border
      borderColor: borderColor,
      borderRadius: 14,
      paddingHorizontal: SPACING.lg,
    };
  };

  const activeIconColor =
    iconColor ||
    (error
      ? colors.error
      : isFocused
      ? colors.primary
      : colors.onSurfaceVariant);

  return (
    <View style={[{ width: "100%" }, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.labelMedium,
            {
              color: error
                ? colors.error
                : isFocused
                ? colors.primary
                : colors.onSurfaceVariant,
              marginBottom: SPACING.xs || 6,
              fontFamily: FONTS.medium,
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
            size={ICON_SIZES.md || 22}
            color={activeIconColor}
            style={{ marginRight: SPACING.md || 10 }}
          />
        )}

        <RNTextInput
          style={[
            {
              flex: 1,
              fontSize: FONT_SIZES.md,
              fontFamily: FONTS.regular,
              color: colors.onSurface,
              height: "100%",
            },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant + "99"}
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
            onPress={onRightIconPress}
            hitSlop={8}
            style={{ padding: SPACING.xs || 4 }}
          >
            <MaterialIcons
              name={rightIcon}
              size={ICON_SIZES.md || 22}
              color={activeIconColor}
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <Text
          style={[
            styles.caption,
            {
              color: colors.error,
              marginTop: SPACING.xs || 4,
              marginLeft: SPACING.xxs || 2,
            },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.caption,
            {
              color: colors.onSurfaceVariant,
              marginTop: SPACING.xs || 4,
              marginLeft: SPACING.xxs || 2,
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
