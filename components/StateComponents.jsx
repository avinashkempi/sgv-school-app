import React from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useLabel } from "../context/LabelsContext";

const EmptyState = ({
  icon = "inbox",
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const { colors, styles } = useTheme();

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        minHeight: 180,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <MaterialIcons name={icon} size={32} color={colors.onSurfaceVariant} />
      </View>
      <Text
        style={[
          styles.titleMedium,
          {
            color: colors.onSurface,
            marginBottom: 6,
            textAlign: "center",
            fontFamily: FONTS.semiBold,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.bodyMedium,
          {
            color: colors.onSurfaceVariant,
            textAlign: "center",
            marginBottom: 16,
            fontFamily: FONTS.regular,
          },
        ]}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onPrimary,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const LoadingState = ({ message }) => {
  const { colors, styles } = useTheme();
  const { t } = useLabel();
  const displayMessage = message ?? t("states.loadingDefault", "Loading...");

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        minHeight: 180,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={[
          styles.bodyMedium,
          {
            color: colors.onSurfaceVariant,
            marginTop: 14,
            fontFamily: FONTS.regular,
          },
        ]}
      >
        {displayMessage}
      </Text>
    </View>
  );
};

const ErrorState = ({ title, message, onRetry }) => {
  const { colors, styles } = useTheme();
  const { t } = useLabel();
  const displayTitle =
    title ?? t("states.errorDefault", "Something went wrong");

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        minHeight: 180,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.errorContainer,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <MaterialIcons name="error-outline" size={32} color={colors.error} />
      </View>
      <Text
        style={[
          styles.titleMedium,
          {
            color: colors.error,
            marginBottom: 6,
            textAlign: "center",
            fontFamily: FONTS.semiBold,
          },
        ]}
      >
        {displayTitle}
      </Text>
      {message && (
        <Text
          style={[
            styles.bodyMedium,
            {
              color: colors.onSurfaceVariant,
              textAlign: "center",
              marginBottom: 16,
              fontFamily: FONTS.regular,
            },
          ]}
        >
          {message}
        </Text>
      )}
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onPrimary,
            }}
          >
            {t("states.retryButton", "Try Again")}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export { EmptyState, LoadingState, ErrorState };
