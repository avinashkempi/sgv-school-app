import React, { memo } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useTheme, FONTS, FONT_SIZES, SPACING, RADIUS } from "../theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useLabel } from "../context/LabelsContext";
import Button from "./Button";

/**
 * Premium Empty State Component
 *
 * @param {string} icon - MaterialIcons name (default: 'inbox')
 * @param {string} title - Header text
 * @param {string} message - Description / guidance text
 * @param {string} actionLabel - Primary CTA button label
 * @param {Function} onAction - Primary CTA button callback
 * @param {string} [secondaryActionLabel] - Optional secondary action
 * @param {Function} [onSecondaryAction] - Optional secondary action callback
 * @param {Object} [style] - Container style overrides
 */
const EmptyState = memo(({
  icon = "inbox",
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => {
  const { colors } = useTheme();
  const { t } = useLabel();

  const displayTitle = title ?? t("states.emptyTitle", "Nothing here yet");
  const displayMessage =
    message ?? t("states.emptyMessage", "There is no information to display right now.");

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          minHeight: 220,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: RADIUS.full || 34,
          backgroundColor: colors.primaryContainer || colors.surfaceContainerHigh || "#E0ECFF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.md || 16,
          borderWidth: 1,
          borderColor: colors.outlineVariant || "transparent",
        }}
      >
        <MaterialIcons
          name={icon}
          size={32}
          color={colors.primary || "#2F6CD4"}
        />
      </View>

      <Text
        style={{
          fontSize: FONT_SIZES.md || 16,
          color: colors.textPrimary || colors.onSurface,
          marginBottom: 6,
          textAlign: "center",
          fontFamily: FONTS.bold || FONTS.semiBold,
        }}
      >
        {displayTitle}
      </Text>

      {displayMessage ? (
        <Text
          style={{
            fontSize: FONT_SIZES.sm || 13,
            color: colors.textSecondary || colors.onSurfaceVariant,
            textAlign: "center",
            lineHeight: 19,
            maxWidth: 280,
            marginBottom: actionLabel && onAction ? 20 : 0,
            fontFamily: FONTS.regular,
          }}
        >
          {displayMessage}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
        {secondaryActionLabel && onSecondaryAction && (
          <Button
            variant="text"
            size="md"
            onPress={onSecondaryAction}
            title={secondaryActionLabel}
          />
        )}
        {actionLabel && onAction && (
          <Button
            variant="tonalPrimary"
            size="md"
            onPress={onAction}
            title={actionLabel}
          />
        )}
      </View>
    </View>
  );
});

EmptyState.displayName = "EmptyState";

/**
 * Premium Loading State Component
 *
 * @param {string} [message] - Assistive loading text
 * @param {Object} [style] - Container style overrides
 */
const LoadingState = memo(({ message, style }) => {
  const { colors } = useTheme();
  const { t } = useLabel();
  const displayMessage = message ?? t("states.loadingDefault", "Loading...");

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          minHeight: 200,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.surface || "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          shadowColor: colors.shadow || "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary || "#2F6CD4"} />
      </View>

      <Text
        style={{
          fontSize: FONT_SIZES.sm || 13,
          color: colors.textSecondary || colors.onSurfaceVariant,
          fontFamily: FONTS.medium,
          textAlign: "center",
        }}
      >
        {displayMessage}
      </Text>
    </View>
  );
});

LoadingState.displayName = "LoadingState";

/**
 * Premium Error State Component
 *
 * @param {string} [title] - Header text
 * @param {string} [message] - Explanatory error details
 * @param {Function} [onRetry] - Retry callback action
 * @param {string} [retryLabel] - Custom retry button label
 * @param {Object} [style] - Container style overrides
 */
const ErrorState = memo(({ title, message, onRetry, retryLabel, style }) => {
  const { colors } = useTheme();
  const { t } = useLabel();

  const displayTitle =
    title ?? t("states.errorDefault", "Something went wrong");
  const displayRetry = retryLabel ?? t("states.retryButton", "Try Again");

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          minHeight: 220,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: RADIUS.full || 34,
          backgroundColor: colors.errorContainer || "#FEF2F2",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.md || 16,
          borderWidth: 1,
          borderColor: colors.outlineVariant || "transparent",
        }}
      >
        <MaterialIcons
          name="error-outline"
          size={32}
          color={colors.error || "#DC2626"}
        />
      </View>

      <Text
        style={{
          fontSize: FONT_SIZES.md || 16,
          color: colors.textPrimary || colors.onSurface,
          marginBottom: 6,
          textAlign: "center",
          fontFamily: FONTS.bold || FONTS.semiBold,
        }}
      >
        {displayTitle}
      </Text>

      {message ? (
        <Text
          style={{
            fontSize: FONT_SIZES.sm || 13,
            color: colors.textSecondary || colors.onSurfaceVariant,
            textAlign: "center",
            lineHeight: 19,
            maxWidth: 300,
            marginBottom: onRetry ? 20 : 0,
            fontFamily: FONTS.regular,
          }}
        >
          {message}
        </Text>
      ) : null}

      {onRetry && (
        <Button
          variant="filled"
          size="md"
          icon="refresh"
          onPress={onRetry}
          title={displayRetry}
          style={{ minWidth: 130 }}
        />
      )}
    </View>
  );
});

ErrorState.displayName = "ErrorState";

export { EmptyState, LoadingState, ErrorState };
